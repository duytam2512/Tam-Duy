import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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

/**
 * API: /api/generate-caption
 * Tạo caption / nhật ký tình yêu bằng Gemini dựa trên ảnh, địa điểm, tâm trạng và thông tin hai bạn
 */
app.post("/api/generate-caption", async (req, res) => {
  try {
    const {
      location,
      tone = "romantic", // 'romantic' | 'cute' | 'peaceful' | 'funny' | 'poem'
      coupleNames = { personOne: "Anh", personTwo: "Em" },
      keywords,
      imageBase64,
    } = req.body;

    const toneDescriptions: Record<string, string> = {
      romantic: "Sâu lắng, ấm áp, đậm chất thơ và tình cảm chân thành",
      cute: "Ngọt ngào, đáng yêu, nhí nhảnh, dễ thương",
      peaceful: "Nhẹ nhàng, bình yên, gợi cảm giác tĩnh lặng và an lòng",
      funny: "Hài hước, dí dỏm, trêu đùa ngọt ngào giữa hai người yêu nhau",
      poem: "Dạng 2-4 câu thơ tình lục bát hoặc thơ tự do ngắn đầy cảm xúc",
    };

    const selectedToneDesc = toneDescriptions[tone] || toneDescriptions.romantic;

    const promptText = `Bạn là một nhà thơ và người viết nhật ký tình yêu tinh tế cho cặp đôi ${coupleNames.personOne} & ${coupleNames.personTwo}.
Hãy viết 3 gợi ý dòng caption / nhật ký kỷ niệm ngắn (mỗi gợi ý từ 1-3 câu, tối đa 50 từ) thật cảm xúc, tự nhiên và chạm đến trái tim.
Ngữ cảnh:
- Địa điểm: ${location || "Một góc nhỏ bình yên"}
- Phong cách viết: ${selectedToneDesc}
${keywords ? `- Chi tiết thêm: ${keywords}` : ""}

Yêu cầu xuất ra:
Chỉ trả về định dạng JSON thuần túy (không markdown thừa):
{
  "suggestions": [
    "Gợi ý 1...",
    "Gợi ý 2...",
    "Gợi ý 3..."
  ]
}`;

    const parts: any[] = [];

    // Nếu người dùng gửi kèm ảnh (dưới dạng Base64), gửi cho Gemini nhận diện hình ảnh
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
      contents: parts.length === 1 ? parts[0].text : { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    const textOutput = (response.text ?? "").trim();
    let parsedData: { suggestions: string[] } = { suggestions: [] };
    try {
      parsedData = JSON.parse(textOutput);
    } catch {
      // Fallback nếu parse JSON lỗi
      parsedData = {
        suggestions: [
          `Cảm ơn đời vì giữa thế giới rộng lớn này, ${coupleNames.personTwo} đã chọn dừng chân bên ${coupleNames.personOne}.`,
          `Có những khoảnh khắc chỉ cần ngồi bên nhau tĩnh lặng, cũng đủ thấy lòng bình yên đến lạ.`,
          `Thế giới ngoài kia dù có xô bồ, về bên nhau lại hóa thành góc nhỏ dịu dàng nhất.`
        ],
      };
    }

    return res.json({
      success: true,
      suggestions: parsedData.suggestions || [],
    });
  } catch (error: any) {
    console.error("Lỗi Gemini API generate-caption:", error);
    return res.status(500).json({
      success: false,
      message: error?.message || "Không thể tạo caption lúc này. Vui lòng thử lại.",
      fallback: [
        "Chỉ cần bên nhau, nơi đâu cũng hóa chốn bình yên.",
        "Mỗi ngày trôi qua cùng nụ cười em là một ngày đáng nhớ nhất.",
        "Cùng nhau đi qua những ngày nắng nhẹ, gom lại thành một góc trời bình yên."
      ]
    });
  }
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

async function startServer() {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, () => {
    console.log(`Server chạy tại: http://localhost:${PORT}`);
  });
}

startServer();
