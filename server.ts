import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import path from "path";
import fs from "fs";
import os from "os";
import crypto from "crypto";
import dotenv from "dotenv";
import { generateSmartCaptions, type CaptionTone } from "./src/utils/aiCaptionEngine.ts";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Phiên bản chạy hiện tại của server/bản build để iPhone/Android PWA tự nhận biết có bản cập nhật mới
function resolveAppVersion(): string {
  try {
    const distIndex = path.resolve(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distIndex)) {
      const content = fs.readFileSync(distIndex, "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex").slice(0, 12);
      return `prod-${hash}`;
    }
  } catch {
    // ignore
  }
  return `dev-${Date.now()}`;
}

const APP_VERSION = resolveAppVersion();

app.get("/api/app-version", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ version: APP_VERSION });
});

// Đảm bảo thư mục lưu file luôn ghi được kể cả trên container chỉ đọc (fallback sang /tmp)
function resolveWritableDir(primaryDir: string, fallbackFolderName: string): {
  primaryDir: string;
  writableDir: string;
} {
  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
    const probe = path.join(primaryDir, `.probe-${process.pid}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
    return { primaryDir, writableDir: primaryDir };
  } catch {
    const tmpDir = path.join(os.tmpdir(), "goc-nho-media", fallbackFolderName);
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    return { primaryDir, writableDir: tmpDir };
  }
}

// Thư mục lưu nhạc tải về website (hỗ trợ HTTP Range cho iPhone/Safari)
const musicDirs = resolveWritableDir(path.resolve(process.cwd(), "public", "music"), "music");
const MUSIC_DIR = musicDirs.writableDir;
const musicStaticOpts = {
  acceptRanges: true,
  setHeaders: (res: express.Response) => {
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=86400");
  },
};
app.use("/music", express.static(MUSIC_DIR, musicStaticOpts));
if (musicDirs.primaryDir !== MUSIC_DIR && fs.existsSync(musicDirs.primaryDir)) {
  app.use("/music", express.static(musicDirs.primaryDir, musicStaticOpts));
}

// Thư mục lưu video kỷ niệm tải lên (hỗ trợ HTTP Range streaming cho iPhone/Safari/Desktop)
const videoDirs = resolveWritableDir(path.resolve(process.cwd(), "public", "uploads", "videos"), "videos");
const VIDEO_DIR = videoDirs.writableDir;
const VIDEO_TMP_DIR = path.join(os.tmpdir(), "goc-nho-video-chunks");
if (!fs.existsSync(VIDEO_TMP_DIR)) {
  fs.mkdirSync(VIDEO_TMP_DIR, { recursive: true });
}

const videoStaticOpts = {
  acceptRanges: true,
  setHeaders: (res: express.Response) => {
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=31536000");
  },
};
app.use("/uploads/videos", express.static(VIDEO_DIR, videoStaticOpts));
if (videoDirs.primaryDir !== VIDEO_DIR && fs.existsSync(videoDirs.primaryDir)) {
  app.use("/uploads/videos", express.static(videoDirs.primaryDir, videoStaticOpts));
}

function detectVideoExt(rawName: string, contentType: string): string {
  const extMatch = rawName.toLowerCase().match(/\.(mp4|mov|webm|m4v|ogg|3gp)$/);
  if (extMatch) return extMatch[1];
  const ct = contentType.toLowerCase();
  if (ct.includes("webm")) return "webm";
  if (ct.includes("quicktime")) return "mov";
  if (ct.includes("x-m4v")) return "m4v";
  return "mp4";
}

// Lưu trạng thái các phiên upload video chia mảnh (chunked upload vượt giới hạn 32MB Cloud Run)
const pendingVideoUploads = new Map<
  string,
  { tempPath: string; filename: string; mimeType: string; totalSize: number; createdAt: number }
>();

/**
 * API: POST /api/uploads/video/init
 * Khởi tạo phiên tải video theo từng mảnh nhỏ (2MB/mảnh) giúp iPhone/4G/Cloud Run không bị lỗi 413 hay rớt mạng
 */
app.post("/api/uploads/video/init", express.json({ limit: "1mb" }), (req, res) => {
  try {
    const rawName = String(req.body?.filename || "video.mp4");
    const mimeType = String(req.body?.mimeType || "video/mp4");
    const totalSize = Number(req.body?.totalSize || 0);

    if (totalSize > 100 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "Video vượt quá giới hạn 100MB. Bạn hãy chọn video ngắn hơn nhé!",
      });
    }

    const ext = detectVideoExt(rawName, mimeType);
    const uploadId = `up-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;
    const filename = `vid-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    const tempPath = path.join(VIDEO_TMP_DIR, `${uploadId}.part`);
    fs.writeFileSync(tempPath, Buffer.alloc(0));

    pendingVideoUploads.set(uploadId, {
      tempPath,
      filename,
      mimeType,
      totalSize,
      createdAt: Date.now(),
    });

    // Dọn dẹp các phiên upload bỏ dở quá 30 phút
    const cutoff = Date.now() - 30 * 60 * 1000;
    for (const [id, meta] of pendingVideoUploads.entries()) {
      if (meta.createdAt < cutoff) {
        try {
          if (fs.existsSync(meta.tempPath)) fs.unlinkSync(meta.tempPath);
        } catch {}
        pendingVideoUploads.delete(id);
      }
    }

    return res.json({ success: true, uploadId, filename });
  } catch (err: any) {
    console.error("Lỗi init upload video:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Không thể khởi tạo phiên tải video",
    });
  }
});

/**
 * API: POST /api/uploads/video/chunk
 * Nhận từng mảnh video nhị phân (tối đa 4MB/mảnh) với ghi theo offset an toàn khi thử lại
 */
app.post(
  "/api/uploads/video/chunk",
  express.raw({ type: () => true, limit: "4mb" }),
  (req, res) => {
    try {
      const uploadId = String(req.query.uploadId || req.headers["x-upload-id"] || "");
      const offset = Number(req.query.offset ?? req.headers["x-chunk-offset"] ?? -1);
      const session = pendingVideoUploads.get(uploadId);

      if (!session || !fs.existsSync(session.tempPath)) {
        return res.status(404).json({
          success: false,
          message: "Phiên tải video đã hết hạn, vui lòng thử tải lại nhé!",
        });
      }

      const chunk = req.body as Buffer;
      if (!chunk || !Buffer.isBuffer(chunk) || chunk.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Mảnh dữ liệu video trống",
        });
      }

      if (Number.isFinite(offset) && offset >= 0) {
        const fd = fs.openSync(session.tempPath, "r+");
        try {
          fs.writeSync(fd, chunk, 0, chunk.length, offset);
        } finally {
          fs.closeSync(fd);
        }
      } else {
        fs.appendFileSync(session.tempPath, chunk);
      }

      return res.json({ success: true, received: chunk.length });
    } catch (err: any) {
      console.error("Lỗi ghi chunk video:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Không thể lưu mảnh dữ liệu video",
      });
    }
  }
);

/**
 * API: POST /api/uploads/video/complete
 * Hoàn tất ghép file video và trả về đường dẫn phát /uploads/videos/...
 */
app.post("/api/uploads/video/complete", express.json({ limit: "1mb" }), (req, res) => {
  try {
    const uploadId = String(req.body?.uploadId || "");
    const session = pendingVideoUploads.get(uploadId);

    if (!session || !fs.existsSync(session.tempPath)) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy phiên tải video để hoàn tất",
      });
    }

    const finalPath = path.join(VIDEO_DIR, session.filename);
    try {
      fs.renameSync(session.tempPath, finalPath);
    } catch {
      // Cross-device rename fallback (/tmp -> app dir)
      fs.copyFileSync(session.tempPath, finalPath);
      try {
        fs.unlinkSync(session.tempPath);
      } catch {}
    }

    const stat = fs.statSync(finalPath);
    pendingVideoUploads.delete(uploadId);

    if (stat.size === 0) {
      try {
        fs.unlinkSync(finalPath);
      } catch {}
      return res.status(400).json({
        success: false,
        message: "File video tải lên bị rỗng. Vui lòng chọn lại video nhé!",
      });
    }

    return res.json({
      success: true,
      videoUrl: `/uploads/videos/${session.filename}`,
      filename: session.filename,
      size: stat.size,
      mimeType: session.mimeType,
    });
  } catch (err: any) {
    console.error("Lỗi complete upload video:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Không thể hoàn tất lưu video",
    });
  }
});

/**
 * API: POST /api/uploads/video
 * Tải trực tiếp file video nhỏ (< 28MB) - giữ tương thích ngược & chấp nhận mọi MIME từ iPhone/Android
 */
app.post(
  "/api/uploads/video",
  express.raw({ type: () => true, limit: "30mb" }),
  (req, res) => {
    try {
      const buffer = req.body as Buffer;
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Không nhận được dữ liệu video. Vui lòng chọn lại file video nhé!",
        });
      }

      const contentType = String(req.headers["content-type"] || "video/mp4").toLowerCase();
      let rawName = "video.mp4";
      try {
        rawName = decodeURIComponent(String(req.headers["x-file-name"] || "video.mp4"));
      } catch {
        rawName = String(req.headers["x-file-name"] || "video.mp4");
      }
      const ext = detectVideoExt(rawName, contentType);

      const uniqueName = `vid-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const filePath = path.join(VIDEO_DIR, uniqueName);
      fs.writeFileSync(filePath, buffer);

      return res.json({
        success: true,
        videoUrl: `/uploads/videos/${uniqueName}`,
        filename: uniqueName,
        size: buffer.length,
        mimeType: contentType,
      });
    } catch (err: any) {
      console.error("Lỗi lưu video tải lên:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Không thể lưu video lên máy chủ lúc này",
      });
    }
  }
);

/**
 * API: DELETE /api/uploads/video/:filename
 * Xóa file video khi người dùng xóa kỷ niệm video
 */
app.delete("/api/uploads/video/:filename", (req, res) => {
  try {
    const filename = path.basename(req.params.filename || "");
    if (!filename || !/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return res.status(400).json({ success: false, message: "Tên file không hợp lệ" });
    }
    const candidates = [
      path.join(VIDEO_DIR, filename),
      path.join(videoDirs.primaryDir, filename),
    ];
    for (const filePath of candidates) {
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch {}
      }
    }
    return res.json({ success: true });
  } catch (err) {
    console.warn("Lỗi xóa file video:", err);
    return res.status(500).json({ success: false });
  }
});

/**
 * API: POST /api/music/upload
 * Cho phép người dùng tải file nhạc trực tiếp từ máy (MP3/M4A/WAV/AAC, tối đa 25MB)
 */
app.post(
  "/api/music/upload",
  express.raw({ type: () => true, limit: "25mb" }),
  (req, res) => {
    try {
      const buffer = req.body as Buffer;
      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Không nhận được dữ liệu âm thanh.",
        });
      }

      const contentType = String(req.headers["content-type"] || "audio/mpeg").toLowerCase();
      let rawName = "song.mp3";
      try {
        rawName = decodeURIComponent(String(req.headers["x-file-name"] || "song.mp3"));
      } catch {
        rawName = String(req.headers["x-file-name"] || "song.mp3");
      }
      const extMatch = rawName.toLowerCase().match(/\.(mp3|m4a|wav|aac|ogg|flac)$/);
      let ext = extMatch ? extMatch[1] : "mp3";
      if (!extMatch) {
        if (contentType.includes("mp4") || contentType.includes("m4a") || contentType.includes("aac")) ext = "m4a";
        else if (contentType.includes("wav")) ext = "wav";
        else if (contentType.includes("ogg")) ext = "ogg";
      }

      const uniqueName = `song-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const filePath = path.join(MUSIC_DIR, uniqueName);
      fs.writeFileSync(filePath, buffer);

      const cleanTitle = rawName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Bài hát của hai đứa";

      return res.json({
        success: true,
        song: {
          id: `upload-${Date.now()}`,
          title: cleanTitle,
          artist: "Nhạc tải lên từ máy",
          mood: "Yêu thích",
          url: `/music/${uniqueName}`,
        },
      });
    } catch (err: any) {
      console.error("Lỗi tải file nhạc lên:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Không thể lưu bài hát lúc này",
      });
    }
  }
);

function normalizeExternalAudioUrl(inputUrl: string): string {
  const trimmed = inputUrl.trim();
  // Google Drive: https://drive.google.com/file/d/<ID>/view -> direct download
  const gdFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdFileMatch[1]}`;
  }
  const gdOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (gdOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdOpenMatch[1]}`;
  }
  // Dropbox: ?dl=0 -> ?raw=1
  if (/dropbox\.com/i.test(trimmed)) {
    return trimmed.replace(/[?&]dl=[01]/i, "").concat(trimmed.includes("?") ? "&raw=1" : "?raw=1");
  }
  return trimmed;
}

/**
 * API: GET /api/audio/proxy
 * Proxy luồng âm thanh hỗ trợ HTTP Range giúp phát ổn định link nhạc ngoài bị chặn CORS/Referer/Google Drive/Dropbox
 */
app.get("/api/audio/proxy", async (req, res) => {
  try {
    const rawTarget = String(req.query.url || "").trim();
    if (!rawTarget || !/^https?:\/\//i.test(rawTarget)) {
      return res.status(400).send("URL âm thanh không hợp lệ");
    }

    const targetUrl = normalizeExternalAudioUrl(rawTarget);
    const range = req.headers.range;
    const upstream = await fetch(targetUrl, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        ...(range ? { Range: range } : {}),
      },
    });

    if (!upstream.ok && upstream.status !== 206) {
      return res.status(upstream.status).send("Không thể tải nguồn âm thanh");
    }

    const ct = (upstream.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html")) {
      return res.status(415).send("Đường dẫn này là trang web HTML chứ không phải file nhạc trực tiếp");
    }

    res.status(upstream.status);
    for (const [key, val] of upstream.headers.entries()) {
      if (["content-type", "content-length", "content-range", "accept-ranges"].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    }
    if (!ct || ct === "application/octet-stream") {
      res.setHeader("Content-Type", "audio/mpeg");
    }
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (upstream.body) {
      const reader = upstream.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch {
          res.end();
        }
      };
      pump();
    } else {
      res.end();
    }
  } catch (err) {
    console.warn("Lỗi audio proxy:", err);
    res.status(500).send("Lỗi proxy âm thanh");
  }
});

// Middleware phân tích JSON với dung lượng đủ lớn cho ảnh base64
app.use(express.json({ limit: "15mb" }));

// Khởi tạo Gemini SDK trên server-side (kèm timeout 15s tránh treo giao diện)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    timeout: 15000,
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * API: /api/generate-caption
 * Tạo 5 caption / nhật ký tình yêu phong phú, đa dạng, không trùng lặp
 * Tích hợp Gemini AI kết hợp thư viện thơ & danh ngôn tình yêu
 */
app.post("/api/generate-caption", async (req, res) => {
  const {
    location,
    tone = "romantic",
    coupleNames = { personOne: "Đức Duy", personTwo: "Thanh Tâm" },
    keywords,
    imageBase64,
  } = req.body;

  // Tạo sẵn kết quả thông minh giàu cảm xúc và emoji từ smart engine
  const smartResult = generateSmartCaptions({
    personOne: coupleNames.personOne || "Đức Duy",
    personTwo: coupleNames.personTwo || "Thanh Tâm",
    location,
    tone: (tone as CaptionTone) || "romantic",
    keywords
  });

  // Nếu có API Key, gọi Gemini AI với prompt chi tiết sâu sắc về tình yêu & thị giác ảnh
  if (process.env.GEMINI_API_KEY) {
    try {
      const toneDescriptions: Record<string, string> = {
        romantic: "Sâu lắng, ấm áp, thấu cảm, đậm chất thơ và tình cảm chân thành",
        cute: "Ngọt ngào, đáng yêu, nhí nhảnh, dễ thương, nụ cười rạng rỡ",
        peaceful: "Nhẹ nhàng, bình yên, gợi cảm giác tĩnh lặng, chữa lành và an lòng",
        funny: "Hài hước, dí dỏm, trêu đùa ngọt ngào của hai bạn trẻ đang yêu",
        poem: "Thơ tình 2-4 câu (lục bát hoặc tự do) có vần điệu êm ái, giàu nhạc tính",
        short: "Một câu ngắn gọn, súc tích, tinh tế chuẩn vibe Instagram/Facebook Story"
      };

      const selectedToneDesc = toneDescriptions[tone] || toneDescriptions.romantic;

      const promptText = `Bạn là một nhà thơ và người viết nhật ký tình yêu tinh tế cho cặp đôi ${coupleNames.personOne} và ${coupleNames.personTwo}.
Nhiệm vụ: Sáng tác 5 gợi ý dòng caption / nhật ký kỷ niệm thật độc đáo, bay bổng, tràn ngập cảm xúc tình yêu và gắn liền với bức ảnh.

NGỮ CẢNH TÌNH YÊU & KỶ NIỆM:
- Cặp đôi: ${coupleNames.personOne} & ${coupleNames.personTwo}
- Địa điểm: ${location || "Một góc nhỏ bình yên của hai đứa"}
- Cảm xúc chủ đạo: ${selectedToneDesc}
${keywords ? `- Chi tiết hoặc từ khóa kỷ niệm: ${keywords}` : ""}

QUY TẮC BẮT BUỘC ĐỂ TRÁNH LẶP LẠI & RẬP KHUÔN:
1. TUYỆT ĐỐI KHÔNG dùng các câu sáo rỗng quen thuộc trên mạng (như "Thế giới 8 tỷ người...", "Cảm ơn đời...", "Bình yên là...").
2. Nếu có hình ảnh đính kèm: Hãy quan sát kỹ ánh sáng, màu sắc, cử chỉ (nắm tay, tựa vai, nụ cười, ánh mắt), trang phục, đồ vật (ly cà phê, đóa hoa, bờ biển, con đường...) để viết những câu có 'hồn' và gắn chặt với chi tiết thị giác của bức ảnh.
3. 5 câu gợi ý PHẢI CÓ CẤU TRÚC NGỮ PHÁP VÀ SẮC THÁI KHÁC BIỆT:
   - Gợi ý 1: Câu thơ tình ngắn 2-4 câu có vần điệu êm ái.
   - Gợi ý 2: Câu ngắn gọn 1 câu cực chất để đăng Story mạng xã hội.
   - Gợi ý 3: Dòng nhật ký tự sự sâu lắng, chân thành như lời tâm tình riêng tư.
   - Gợi ý 4: Câu trêu đùa dí dỏm hoặc ngọt ngào nhí nhảnh của cặp đôi.
   - Gợi ý 5: Câu gắn liền với địa điểm cụ thể và chi tiết trong ảnh.
4. GỢI Ý BIỂU TƯỢNG CẢM XÚC (EMOJI):
   - Trong mỗi câu gợi ý, đính kèm 2-3 emoji tinh tế, phù hợp chính xác với bức ảnh (ví dụ: biển 🌊🌅🤍, cafe ☕🍰🍂, hoàng hôn 🌇✨🧡, hoa 🌸💐🌿, mưa 🌧️☔🧣, ôm/nắm tay 🫂🤍👫...).
   - Cung cấp thêm mảng "suggestedEmojis" gồm 6-8 emoji tiêu biểu nhất của bức ảnh để người dùng bấm chọn nhanh.

ĐỊNH DẠNG TRẢ VỀ:
Chỉ trả về duy nhất chuỗi JSON hợp lệ (không markdown thừa):
{
  "suggestions": [
    { "text": "Nội dung câu 1...", "badge": "Thơ tình", "emojis": "🍃🤍✨" },
    { "text": "Nội dung câu 2...", "badge": "Story ngắn", "emojis": "✨📸📍" },
    { "text": "Nội dung câu 3...", "badge": "Sâu lắng", "emojis": "☕🤍🌿" },
    { "text": "Nội dung câu 4...", "badge": "Ngọt ngào", "emojis": "🥰🍓💖" },
    { "text": "Nội dung câu 5...", "badge": "Gắn với ảnh", "emojis": "🌅🤍✨" }
  ],
  "suggestedEmojis": ["🌸", "✨", "🤍", "📸", "☕", "👫", "🍃", "🥰"]
}`;

      const parts: any[] = [];
      if (imageBase64 && typeof imageBase64 === "string" && imageBase64.includes(",")) {
        const [meta, data] = imageBase64.split(",");
        const mimeMatch = meta.match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        parts.push({
          inlineData: {
            mimeType,
            data,
          },
        });
      }

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: parts.length === 1 ? parts[0].text : { parts },
        config: {
          responseMimeType: "application/json",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const rawOutput = (response.text ?? "").trim();
      const textOutput = rawOutput
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "")
        .trim();
      if (textOutput) {
        const parsed = JSON.parse(textOutput);
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          // Chuẩn hóa suggestions về dạng chuẩn { text, badge, emojis }
          const normalized = parsed.suggestions.map((item: any, idx: number) => {
            if (typeof item === "string") {
              const defaultBadges = ["Thơ tình", "Story ngắn", "Sâu lắng", "Ngọt ngào", "Gắn với ảnh"];
              return {
                text: item,
                badge: defaultBadges[idx % defaultBadges.length],
                emojis: "💖✨"
              };
            }
            return {
              text: item.text || String(item),
              badge: item.badge || "Gợi ý hay",
              emojis: item.emojis || "✨"
            };
          });

          return res.json({
            success: true,
            suggestions: normalized,
            suggestedEmojis: Array.isArray(parsed.suggestedEmojis) && parsed.suggestedEmojis.length > 0
              ? parsed.suggestedEmojis
              : smartResult.suggestedEmojis
          });
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, using diverse smart engine:", err);
    }
  }

  // Trả về kết quả từ Smart Engine (5 câu mới mẻ, phong phú, không lặp kèm gợi ý Emoji)
  return res.json({
    success: true,
    suggestions: smartResult.suggestions,
    suggestedEmojis: smartResult.suggestedEmojis
  });
});

/**
 * API: /api/generate-music
 * Tạo bản nhạc nền tình yêu ngắn (Lyria Clip 30s) bằng lyria-3-clip-preview
 */
app.post("/api/generate-music", async (req, res) => {
  try {
    const { prompt = "A gentle acoustic love ballad with warm guitar, soft piano, and a peaceful romantic melody for lovers" } = req.body;

    const response = await ai.models.generateContentStream({
      model: "lyria-3-clip-preview",
      contents: prompt,
    });

    const audioChunks: Buffer[] = [];
    let lyrics = "";
    let mimeType = "audio/mpeg";

    for await (const chunk of response) {
      const parts = chunk.candidates?.[0]?.content?.parts;
      if (!parts) continue;
      for (const part of parts) {
        if (part.inlineData?.data) {
          if (audioChunks.length === 0 && part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
          audioChunks.push(Buffer.from(part.inlineData.data, "base64"));
        }
        if (part.text) {
          lyrics += part.text;
        }
      }
    }

    if (audioChunks.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Không nhận được dữ liệu âm thanh từ Lyria",
      });
    }

    const audioBase64 = Buffer.concat(audioChunks).toString("base64");
    const audioDataUrl = `data:${mimeType};base64,${audioBase64}`;

    return res.json({
      success: true,
      audioUrl: audioDataUrl,
      lyrics,
    });
  } catch (error: any) {
    console.error("Lỗi Lyria Music API:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Không thể tạo bản nhạc vào lúc này",
    });
  }
});

/* =========================================================================
   ZING MP3 INTEGRATION - TỰ ĐỘNG TẢI NHẠC VỀ WEBSITE THÀNH BÀI CỦA TÔI
   ========================================================================= */
const ZING_VERSION = "1.6.34";
const ZING_URL = "https://zingmp3.vn";
const ZING_SECRET_KEY = "2aa2d1c561e809b267f3638c4a307aab";
const ZING_API_KEY = "88265e23d4284f25963e6eedac8fbfa3";

function getZingHash256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function getZingHmac512(str: string, key: string): string {
  return crypto.createHmac("sha512", key).update(Buffer.from(str, "utf8")).digest("hex");
}

async function getZingCookie(): Promise<string> {
  try {
    const res = await fetch(ZING_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });
    const rawCookies = (res.headers as any).getSetCookie ? (res.headers as any).getSetCookie() : [res.headers.get("set-cookie")];
    return (rawCookies || []).filter(Boolean).map((c: string) => c.split(";")[0]).join("; ");
  } catch {
    return "";
  }
}

async function getZingSongDetails(songId: string) {
  const ctime = String(Math.floor(Date.now() / 1000));
  const cookieStr = await getZingCookie();

  const sigInfo = getZingHmac512("/api/v2/song/get/info" + getZingHash256(`ctime=${ctime}id=${songId}version=${ZING_VERSION}`), ZING_SECRET_KEY);
  const infoRes = await fetch(`${ZING_URL}/api/v2/song/get/info?` + new URLSearchParams({ id: songId, ctime, version: ZING_VERSION, apiKey: ZING_API_KEY, sig: sigInfo }), {
    headers: {
      Cookie: cookieStr,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://zingmp3.vn/",
      "Origin": "https://zingmp3.vn",
      "X-Forwarded-For": "118.69.182.10",
      "X-Real-IP": "118.69.182.10"
    }
  });
  const infoData = await infoRes.json();

  const sigStream = getZingHmac512("/api/v2/song/get/streaming" + getZingHash256(`ctime=${ctime}id=${songId}version=${ZING_VERSION}`), ZING_SECRET_KEY);
  const streamRes = await fetch(`${ZING_URL}/api/v2/song/get/streaming?` + new URLSearchParams({ id: songId, ctime, version: ZING_VERSION, apiKey: ZING_API_KEY, sig: sigStream }), {
    headers: {
      Cookie: cookieStr,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://zingmp3.vn/",
      "Origin": "https://zingmp3.vn",
      "X-Forwarded-For": "118.69.182.10",
      "X-Real-IP": "118.69.182.10"
    }
  });
  const streamData = await streamRes.json();

  return {
    info: infoData.data,
    stream: streamData.data
  };
}

async function searchZingSong(query: string) {
  const ctime = String(Math.floor(Date.now() / 1000));
  const cookieStr = await getZingCookie();
  const sigSearch = getZingHmac512("/api/v2/search/multi" + getZingHash256(`ctime=${ctime}version=${ZING_VERSION}`), ZING_SECRET_KEY);
  const searchRes = await fetch(`${ZING_URL}/api/v2/search/multi?` + new URLSearchParams({ q: query, ctime, version: ZING_VERSION, apiKey: ZING_API_KEY, sig: sigSearch }), {
    headers: {
      Cookie: cookieStr,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Referer": "https://zingmp3.vn/",
      "Origin": "https://zingmp3.vn",
      "X-Forwarded-For": "118.69.182.10"
    }
  });
  const searchData = await searchRes.json();
  return searchData.data?.songs || [];
}

/**
 * API: /api/zingmp3/resolve
 * Nhận link Zing MP3 hoặc tên bài hát, trích xuất thông tin và tải nhạc về website thành bài của tôi
 */
app.post("/api/zingmp3/resolve", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "Vui lòng nhập link hoặc tên bài hát Zing MP3" });
    }

    const trimmed = url.trim();
    let songId: string | null = null;

    if (/^[A-Za-z0-9]{8,14}$/.test(trimmed)) {
      songId = trimmed;
    } else {
      const match = trimmed.match(/\/([A-Za-z0-9]{8,14})(?:\.html|\/|$|\?)/) || trimmed.match(/([A-Za-z0-9]{8,14})\.html/);
      if (match) {
        songId = match[1];
      }
    }

    // Nếu không trích xuất được ID trực tiếp từ link, coi như người dùng gõ tên bài hát để tìm kiếm
    if (!songId) {
      const songs = await searchZingSong(trimmed);
      if (!songs || songs.length === 0) {
        return res.status(404).json({ success: false, message: "Không tìm thấy bài hát phù hợp trên Zing MP3" });
      }
      songId = songs[0].encodeId;
    }

    if (!songId) {
      return res.status(404).json({ success: false, message: "Không xác định được bài hát trên Zing MP3" });
    }

    const details = await getZingSongDetails(songId);
    const audioCdnUrl = details.stream?.["128"];

    if (!audioCdnUrl || audioCdnUrl === "VIP") {
      return res.status(403).json({
        success: false,
        message: "Bài hát này thuộc bản quyền VIP hoặc không hỗ trợ phát miễn phí từ Zing MP3. Bạn thử bài khác nhé!"
      });
    }

    const title = details.info?.title || "Bài hát từ Zing MP3";
    const artist = details.info?.artistsNames || "Zing MP3";
    const thumbnail = details.info?.thumbnailM || details.info?.thumbnail || "";
    const duration = details.info?.duration || 0;

    // Tự động tải file mp3 về máy chủ để website có sẵn file bài của tôi
    const localFileName = `${songId}.mp3`;
    const localFilePath = path.join(MUSIC_DIR, localFileName);
    let finalAudioUrl = `/api/zingmp3/stream?id=${songId}`;

    try {
      if (!fs.existsSync(localFilePath)) {
        const audioFetch = await fetch(audioCdnUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://zingmp3.vn/"
          }
        });
        if (audioFetch.ok) {
          const buffer = Buffer.from(await audioFetch.arrayBuffer());
          fs.writeFileSync(localFilePath, buffer);
          finalAudioUrl = `/music/${localFileName}`;
        }
      } else {
        finalAudioUrl = `/music/${localFileName}`;
      }
    } catch (saveErr) {
      console.warn("Không thể lưu cache cục bộ, fallback sang stream URL:", saveErr);
      finalAudioUrl = `/api/zingmp3/stream?id=${songId}`;
    }

    return res.json({
      success: true,
      song: {
        id: `zing-${songId}`,
        title,
        artist,
        mood: "Bài của tôi (Zing MP3)",
        url: finalAudioUrl,
        thumbnail,
        duration,
        isZing: true
      }
    });
  } catch (error: any) {
    console.error("Lỗi resolve Zing MP3:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Không thể tải bài hát từ Zing MP3 lúc này"
    });
  }
});

/**
 * API: /api/zingmp3/stream
 * Phát trực tuyến bài hát với hỗ trợ HTTP Range (tua bài mượt mà)
 */
app.get("/api/zingmp3/stream", async (req, res) => {
  const songId = (req.query.id as string)?.trim();
  if (!songId) return res.status(400).send("Thiếu ID bài hát");

  // Kiểm tra nếu đã có file tải về trong thư mục public/music
  const localFilePath = path.join(MUSIC_DIR, `${songId}.mp3`);
  if (fs.existsSync(localFilePath)) {
    return res.sendFile(localFilePath);
  }

  try {
    const details = await getZingSongDetails(songId);
    const audioUrl = details.stream?.["128"];
    if (!audioUrl || audioUrl === "VIP") {
      return res.status(403).send("Bài hát thuộc bản quyền VIP hoặc không thể phát");
    }

    const range = req.headers.range;
    const audioRes = await fetch(audioUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Referer": "https://zingmp3.vn/",
        ...(range ? { Range: range } : {})
      }
    });

    res.status(audioRes.status);
    for (const [key, val] of audioRes.headers.entries()) {
      if (["content-type", "content-length", "content-range", "accept-ranges"].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    }
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Type", "audio/mpeg");

    if (audioRes.body) {
      const reader = audioRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
          res.end();
        } catch {
          res.end();
        }
      };
      pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    console.error("Lỗi streaming proxy:", err);
    res.status(500).send("Lỗi phát trực tiếp bài hát");
  }
});

/* =========================================================================
   YOUTUBE MUSIC INTEGRATION - THÊM NHẠC TỪ LINK YOUTUBE
   ========================================================================= */

function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : null;
}

async function searchYouTubeVideo(query: string): Promise<string | null> {
  try {
    const res = await fetch("https://www.youtube.com/results?search_query=" + encodeURIComponent(query), {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "vi,en;q=0.9"
      }
    });
    const html = await res.text();
    const match = html.match(/\/watch\?v=([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  } catch (err) {
    console.error("Lỗi tìm kiếm YouTube:", err);
    return null;
  }
}

/**
 * API: /api/youtube/resolve
 * Phân tích link hoặc tìm kiếm nhạc từ YouTube, trả về thông tin bài hát và videoId
 */
app.post("/api/youtube/resolve", async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== "string") {
      return res.status(400).json({ success: false, message: "Vui lòng nhập link hoặc tên bài hát YouTube" });
    }

    const trimmed = url.trim();
    let videoId = extractYouTubeVideoId(trimmed);

    if (!videoId) {
      videoId = await searchYouTubeVideo(trimmed);
    }

    if (!videoId) {
      return res.status(404).json({ success: false, message: "Không tìm thấy video YouTube phù hợp" });
    }

    // Lấy thông tin metadata qua oEmbed API chính thức của YouTube
    let title = "Giai điệu từ YouTube";
    let artist = "YouTube";
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        title = oembedData.title || title;
        artist = oembedData.author_name || artist;
        thumbnail = oembedData.thumbnail_url || thumbnail;
      }
    } catch (oembedErr) {
      console.warn("Lỗi fetch oEmbed YouTube:", oembedErr);
    }

    return res.json({
      success: true,
      song: {
        id: `yt-${videoId}`,
        title,
        artist,
        mood: "YouTube Music",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnail,
        isYouTube: true,
        youtubeId: videoId
      }
    });
  } catch (error: any) {
    console.error("Lỗi phân tích link YouTube:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Không thể phân tích link YouTube lúc này"
    });
  }
});

/**
 * Helper tải 1 bài Zing MP3 theo ID hoặc tên bài hát -> lưu MP3 cục bộ tại /music/<id>.mp3
 * Giúp phát 100% mượt mà trên iPhone Safari & Android không lo bị YouTube chặn!
 */
async function tryResolveZingToLocalMp3(input: string) {
  const trimmed = input.trim();
  let songId: string | null = null;

  if (/^[A-Za-z0-9]{8,14}$/.test(trimmed)) {
    songId = trimmed;
  } else if (/zingmp3\.vn/i.test(trimmed)) {
    const match = trimmed.match(/\/([A-Za-z0-9]{8,14})(?:\.html|\/|$|\?)/) || trimmed.match(/([A-Za-z0-9]{8,14})\.html/);
    if (match) songId = match[1];
  }

  let fallbackTitleFromSearch = "";
  if (!songId) {
    const songs = await searchZingSong(trimmed);
    if (!songs || songs.length === 0) return null;
    // Ưu tiên chọn bài không phải VIP (streamingStatus === 1)
    const freeSong = songs.find((s: any) => s.streamingStatus === 1) || songs[0];
    songId = freeSong.encodeId;
    fallbackTitleFromSearch = `${freeSong.title || ""} ${freeSong.artistsNames || ""}`.trim();
  }

  if (!songId) return null;

  const details = await getZingSongDetails(songId);
  const title = details.info?.title || fallbackTitleFromSearch || "Bài hát của hai đứa";
  const artist = details.info?.artistsNames || "Zing MP3";
  const thumbnail = details.info?.thumbnailM || details.info?.thumbnail || "";
  const duration = details.info?.duration || 0;
  const audioCdnUrl = details.stream?.["128"];

  if (!audioCdnUrl || audioCdnUrl === "VIP") {
    return { isVip: true, title, artist, thumbnail };
  }

  const localFileName = `${songId}.mp3`;
  const localFilePath = path.join(MUSIC_DIR, localFileName);
  const primaryFilePath = path.join(musicDirs.primaryDir, localFileName);
  let finalAudioUrl = `/api/zingmp3/stream?id=${songId}`;

  if (fs.existsSync(localFilePath) || fs.existsSync(primaryFilePath)) {
    finalAudioUrl = `/music/${localFileName}`;
  } else {
    try {
      const audioFetch = await fetch(audioCdnUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://zingmp3.vn/",
        },
      });
      if (audioFetch.ok) {
        const buffer = Buffer.from(await audioFetch.arrayBuffer());
        if (buffer.length > 10000) {
          fs.writeFileSync(localFilePath, buffer);
          finalAudioUrl = `/music/${localFileName}`;
        }
      }
    } catch {
      finalAudioUrl = `/api/zingmp3/stream?id=${songId}`;
    }
  }

  return {
    isVip: false,
    song: {
      id: `zing-${songId}`,
      title,
      artist,
      mood: "Nhạc MP3",
      url: finalAudioUrl,
      thumbnail,
      duration,
      isZing: true,
    },
  };
}

/**
 * API: POST /api/music/resolve-link
 * Nhận MỌI loại link nhạc hoặc tên bài hát (YouTube, Zing MP3, link MP3/M4A/WAV, Google Drive, Dropbox, hoặc tên bài)
 * Tự động chuẩn hóa để phát được trên cả iPhone Safari, Android và máy tính!
 */
app.post("/api/music/resolve-link", async (req, res) => {
  try {
    const rawInput = String(req.body?.input || req.body?.url || "").trim();
    const customTitle = String(req.body?.title || "").trim();

    if (!rawInput) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập link nhạc hoặc tên bài hát nhé!" });
    }

    // 1. Link Zing MP3
    if (/zingmp3\.vn/i.test(rawInput)) {
      const zingRes = await tryResolveZingToLocalMp3(rawInput);
      if (zingRes && !zingRes.isVip && zingRes.song) {
        if (customTitle) zingRes.song.title = customTitle;
        return res.json({ success: true, song: zingRes.song });
      }
      // Nếu bài Zing MP3 bị VIP -> tự động tìm tên bài đó trên YouTube
      const ytSearchQuery = zingRes?.title ? `${zingRes.title} ${zingRes.artist || ""}`.trim() : rawInput;
      const ytId = await searchYouTubeVideo(ytSearchQuery);
      if (ytId) {
        return res.json({
          success: true,
          note: "Bài hát trên Zing MP3 là bản VIP nên đã tự chuyển sang bản YouTube tương ứng.",
          song: {
            id: `yt-${ytId}`,
            title: customTitle || zingRes?.title || "Giai điệu từ YouTube",
            artist: zingRes?.artist || "YouTube",
            mood: "YouTube Music",
            url: `https://www.youtube.com/watch?v=${ytId}`,
            thumbnail: zingRes?.thumbnail || `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
            isYouTube: true,
            youtubeId: ytId,
          },
        });
      }
      return res.status(403).json({
        success: false,
        message: "Bài hát này trên Zing MP3 thuộc bản quyền VIP. Bạn hãy thử gõ tên bài hoặc tải file MP3 từ máy nhé!",
      });
    }

    // 2. Link YouTube (youtube.com / youtu.be / music.youtube / shorts)
    const ytIdFromLink = extractYouTubeVideoId(rawInput);
    if (ytIdFromLink && (/youtu\.?be/i.test(rawInput) || /^[a-zA-Z0-9_-]{11}$/.test(rawInput))) {
      let title = customTitle || "Giai điệu từ YouTube";
      let artist = "YouTube";
      let thumbnail = `https://i.ytimg.com/vi/${ytIdFromLink}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytIdFromLink}&format=json`
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (!customTitle && data.title) title = data.title;
          if (data.author_name) artist = data.author_name;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {}

      // Thử tìm nhanh bản MP3 miễn phí cùng tên trên Zing MP3 nếu là nhạc Việt (chỉ lấy khi tên khớp) để phát mượt trên iPhone?
      // Trả trực tiếp YouTube đúng video người dùng chọn để không sai bài!
      return res.json({
        success: true,
        song: {
          id: `yt-${ytIdFromLink}`,
          title,
          artist,
          mood: "YouTube Music",
          url: `https://www.youtube.com/watch?v=${ytIdFromLink}`,
          thumbnail,
          isYouTube: true,
          youtubeId: ytIdFromLink,
        },
      });
    }

    // 3. Link HTTP/HTTPS khác (MP3/M4A/WAV trực tiếp, Google Drive, Dropbox...)
    if (/^https?:\/\//i.test(rawInput) || /^(www\.|drive\.google\.com|dropbox\.com)/i.test(rawInput)) {
      const withProto = /^https?:\/\//i.test(rawInput) ? rawInput : `https://${rawInput}`;
      const normalized = normalizeExternalAudioUrl(withProto);

      // Kiểm tra xem đường dẫn có phải file âm thanh thật không (tránh lưu trang HTML như Spotify/SoundCloud/TikTok không phát được trong <audio>)
      try {
        const probe = await fetch(normalized, {
          method: "GET",
          redirect: "follow",
          headers: {
            Range: "bytes=0-512",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
          },
        });
        const ct = (probe.headers.get("content-type") || "").toLowerCase();
        if (!probe.ok && probe.status !== 206) {
          return res.status(400).json({
            success: false,
            message: `Không mở được đường dẫn nhạc này (mã lỗi ${probe.status}). Bạn hãy thử link YouTube, Zing MP3 hoặc tải file nhạc từ máy nhé!`,
          });
        }
        if (ct.includes("text/html")) {
          return res.status(415).json({
            success: false,
            message:
              "Đường dẫn này là trang web (không phải file .mp3/.m4a trực tiếp). Bạn hãy dán link YouTube, link Zing MP3 hoặc gõ thẳng TÊN BÀI HÁT để app tự tìm nhạc nhé!",
          });
        }
      } catch {
        // Nếu server probe lỗi tạm thời, vẫn cho phép đi qua audio proxy
      }

      const fileNameGuess = decodeURIComponent(
        withProto.split("?")[0].split("/").pop() || "Giai điệu của hai đứa"
      )
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .trim();

      const needsProxy = /drive\.google\.com|dropbox\.com/i.test(withProto);

      return res.json({
        success: true,
        song: {
          id: `custom-${Date.now()}`,
          title: customTitle || fileNameGuess || "Giai điệu của hai đứa",
          artist: "Link nhạc trực tiếp",
          mood: "Yêu thích",
          url: needsProxy ? `/api/audio/proxy?url=${encodeURIComponent(normalized)}` : normalized,
        },
      });
    }

    // 4. Người dùng gõ TÊN BÀI HÁT -> Ưu tiên tìm & tải MP3 cục bộ từ Zing MP3 (phát 100% mượt trên iPhone!), fallback sang YouTube
    try {
      const zingRes = await tryResolveZingToLocalMp3(rawInput);
      if (zingRes && !zingRes.isVip && zingRes.song) {
        if (customTitle) zingRes.song.title = customTitle;
        return res.json({ success: true, song: zingRes.song });
      }
    } catch {}

    const ytFoundId = await searchYouTubeVideo(rawInput);
    if (ytFoundId) {
      let title = customTitle || rawInput;
      let artist = "YouTube";
      let thumbnail = `https://i.ytimg.com/vi/${ytFoundId}/hqdefault.jpg`;
      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytFoundId}&format=json`
        );
        if (oembedRes.ok) {
          const data = await oembedRes.json();
          if (!customTitle && data.title) title = data.title;
          if (data.author_name) artist = data.author_name;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {}

      return res.json({
        success: true,
        song: {
          id: `yt-${ytFoundId}`,
          title,
          artist,
          mood: "YouTube Music",
          url: `https://www.youtube.com/watch?v=${ytFoundId}`,
          thumbnail,
          isYouTube: true,
          youtubeId: ytFoundId,
        },
      });
    }

    return res.status(404).json({
      success: false,
      message: "Không tìm thấy bài hát phù hợp. Bạn thử nhập tên bài khác hoặc tải file MP3 từ máy nhé!",
    });
  } catch (err: any) {
    console.error("Lỗi resolve-link:", err);
    return res.status(500).json({
      success: false,
      message: err?.message || "Không thể xử lý link nhạc lúc này",
    });
  }
});

function patchViteClientForHmr() {
  try {
    const viteClientPath = path.resolve(process.cwd(), "node_modules", "vite", "dist", "client", "client.mjs");
    if (fs.existsSync(viteClientPath)) {
      let content = fs.readFileSync(viteClientPath, "utf-8");
      let modified = false;

      if (content.includes('reject(/* @__PURE__ */ new Error("WebSocket closed without opened."));')) {
        content = content.replace(
          'reject(/* @__PURE__ */ new Error("WebSocket closed without opened."));',
          'resolve();'
        );
        modified = true;
      }

      if (content.includes('new WebSocket(`${socketProtocol}://${socketHost}?token=${wsToken}`, "vite-hmr")')) {
        content = content.replace(
          'new WebSocket(`${socketProtocol}://${socketHost}?token=${wsToken}`, "vite-hmr")',
          '({ readyState: 1, OPEN: 1, addEventListener(type, fn) { if (type === "open") setTimeout(fn, 0); }, removeEventListener() {}, send() {}, close() {} })'
        );
        modified = true;
      }

      if (content.includes('new WebSocket(`${socketProtocol}://${directSocketHost}?token=${wsToken}`, "vite-hmr")')) {
        content = content.replace(
          'new WebSocket(`${socketProtocol}://${directSocketHost}?token=${wsToken}`, "vite-hmr")',
          '({ readyState: 1, OPEN: 1, addEventListener(type, fn) { if (type === "open") setTimeout(fn, 0); }, removeEventListener() {}, send() {}, close() {} })'
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(viteClientPath, content, "utf-8");
      }
    }
  } catch (err) {
    console.warn("Bỏ qua vá Vite client:", err);
  }
}

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  const httpServer = http.createServer(app);

  if (isDev) {
    patchViteClientForHmr();
    // Ngăn Safari trên iPhone cache trang HTML gốc khi mở bản dev
    app.use((req, res, next) => {
      if (req.path === "/" || req.path.endsWith(".html") || req.path === "/sw.js" || req.path === "/manifest.webmanifest") {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
        res.setHeader("Pragma", "no-cache");
      }
      next();
    });
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          const baseName = path.basename(filePath);
          // Không cache sw.js, registerSW.js, manifest và index.html để iPhone/Safari nhận bản cập nhật tức thì
          if (
            baseName === "index.html" ||
            baseName === "sw.js" ||
            baseName === "registerSW.js" ||
            baseName === "manifest.webmanifest" ||
            baseName.startsWith("workbox-")
          ) {
            res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
            res.setHeader("Pragma", "no-cache");
            res.setHeader("Expires", "0");
          } else if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      })
    );
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`Server chạy tại: http://localhost:${PORT}`);
  });
}

startServer();
