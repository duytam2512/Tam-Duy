import express from "express";
import http from "http";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Thư mục lưu nhạc tải về website
const MUSIC_DIR = path.resolve(process.cwd(), "public", "music");
if (!fs.existsSync(MUSIC_DIR)) {
  fs.mkdirSync(MUSIC_DIR, { recursive: true });
}
app.use("/music", express.static(MUSIC_DIR));

// Middleware phân tích JSON với dung lượng đủ lớn cho ảnh base64
app.use(express.json({ limit: "15mb" }));

// Khởi tạo Gemini SDK trên server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

import { generateSmartCaptions, CaptionTone } from "./src/utils/aiCaptionEngine";

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

  // Tạo sẵn 5 gợi ý sáng tạo từ smart engine để đảm bảo luôn luôn có kết quả tuyệt vời
  const smartFallbacks = generateSmartCaptions({
    personOne: coupleNames.personOne || "Đức Duy",
    personTwo: coupleNames.personTwo || "Thanh Tâm",
    location,
    tone: (tone as CaptionTone) || "romantic",
    keywords
  }).map(item => item.text);

  // Nếu có API Key, thử gọi Gemini AI để sáng tác mới
  if (process.env.GEMINI_API_KEY) {
    try {
      const toneDescriptions: Record<string, string> = {
        romantic: "Sâu lắng, ấm áp, đậm chất thơ và tình cảm chân thành",
        cute: "Ngọt ngào, đáng yêu, nhí nhảnh, dễ thương, ngọt xỉu",
        peaceful: "Nhẹ nhàng, bình yên, gợi cảm giác tĩnh lặng và an lòng",
        funny: "Hài hước, dí dỏm, trêu đùa ngọt ngào giữa hai người yêu nhau",
        poem: "Dạng thơ tình 2-4 câu lục bát hoặc thơ tự do có vần điệu êm ái",
        short: "Một câu ngắn gọn, tinh tế, bắt trend mạng xã hội (Instagram, Facebook Story)"
      };

      const selectedToneDesc = toneDescriptions[tone] || toneDescriptions.romantic;

      const promptText = `Bạn là một nhà thơ và người viết nhật ký tình yêu tài hoa cho cặp đôi ${coupleNames.personOne} & ${coupleNames.personTwo}.
Hãy sáng tác 5 gợi ý dòng caption / nhật ký kỷ niệm thật độc đáo, bay bổng, tràn ngập cảm xúc và TUYỆT ĐỐI KHÔNG SỬ DỤNG CÁC CÂU SÁO RỖNG LẶP LẠI.
Ngữ cảnh kỷ niệm:
- Địa điểm: ${location || "Một góc nhỏ bình yên của hai đứa"}
- Cảm xúc chủ đạo: ${selectedToneDesc}
${keywords ? `- Chi tiết hoặc kỷ niệm riêng: ${keywords}` : ""}

Yêu cầu cụ thể:
1. Mỗi câu gợi ý mang một sắc thái riêng (1 câu thơ, 1 câu ngắn gọn đăng Story, 1 dòng nhật ký sâu lắng, 1 câu ngọt ngào, 1 câu gắn liền với địa điểm).
2. Tự nhiên xưng hô hoặc lồng ghép tên ${coupleNames.personOne} và ${coupleNames.personTwo} một cách tinh tế.
3. Chỉ trả về duy nhất định dạng JSON thuần túy (không bọc trong markdown):
{
  "suggestions": [
    "Câu 1...",
    "Câu 2...",
    "Câu 3...",
    "Câu 4...",
    "Câu 5..."
  ]
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
        model: "gemini-3.8-flash",
        contents: parts.length === 1 ? parts[0].text : parts,
        config: {
          responseMimeType: "application/json",
          temperature: 0.95,
        },
      });

      const textOutput = (response.text ?? "").trim();
      if (textOutput) {
        const parsed = JSON.parse(textOutput);
        if (Array.isArray(parsed.suggestions) && parsed.suggestions.length > 0) {
          return res.json({
            success: true,
            suggestions: parsed.suggestions,
          });
        }
      }
    } catch (err) {
      console.warn("Gemini API call failed, using diverse smart engine:", err);
    }
  }

  // Trả về kết quả từ Smart Engine (5 câu mới mẻ, phong phú, không lặp)
  return res.json({
    success: true,
    suggestions: smartFallbacks,
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

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";
  const httpServer = http.createServer(app);

  if (isDev) {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`Server chạy tại: http://localhost:${PORT}`);
  });
}

startServer();
