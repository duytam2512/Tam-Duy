/**
 * Tiện ích xử lý trích xuất và nạp nhạc YouTube client-side
 * Hoạt động 100% trên cả Vercel (web tĩnh), Localhost, GitHub Pages và mọi môi trường
 */

export interface YouTubeInfo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
}

/**
 * Trích xuất YouTube videoId từ mọi định dạng link:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ?si=...
 * - https://www.youtube.com/shorts/dQw4w9WgXcQ
 * - https://m.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://music.youtube.com/watch?v=dQw4w9WgXcQ
 * - dQw4w9WgXcQ (11 ký tự trực tiếp)
 */
export function extractYouTubeId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();

  // 11 ký tự chữ cái, số, gạch ngang, gạch dưới trực tiếp
  if (/^[a-zA-Z0-9_-]{11}$/.test(str)) {
    return str;
  }

  // Regex nhận diện các dạng link YouTube phổ biến
  const regex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|music\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i;
  const match = str.match(regex);
  if (match && match[1]) {
    return match[1];
  }

  // Trích xuất qua URL API nếu người dùng dán URL có tham số phức tạp
  try {
    const fullUrl = str.startsWith('http://') || str.startsWith('https://') ? str : `https://${str}`;
    const parsed = new URL(fullUrl);
    const v = parsed.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) {
      return v;
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    if (lastPart && /^[a-zA-Z0-9_-]{11}$/.test(lastPart)) {
      return lastPart;
    }
  } catch {
    // Bỏ qua lỗi URL không hợp lệ
  }

  return null;
}

/**
 * Lấy thông tin bài hát YouTube client-side thông qua oEmbed công khai (CORS-friendly)
 * Nếu mạng chặn hoặc oEmbed lỗi, trả về fallback an toàn kèm ảnh thumbnail chính thức của YouTube
 */
export async function getYouTubeVideoInfoClient(videoId: string, customTitle?: string): Promise<YouTubeInfo> {
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let title = customTitle?.trim() || `YouTube Music (${videoId})`;
  let artist = 'YouTube';

  // 1. Thử lấy thông tin qua noembed (hỗ trợ CORS cho mọi trình duyệt)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.title && !data.error) {
        title = customTitle?.trim() || data.title;
        artist = data.author_name || 'YouTube';
        return { videoId, title, artist, thumbnail };
      }
    }
  } catch {
    // Bỏ qua lỗi noembed
  }

  // 2. Thử oEmbed trực tiếp từ YouTube
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        title = customTitle?.trim() || data.title;
        artist = data.author_name || 'YouTube';
        return { videoId, title, artist, thumbnail };
      }
    }
  } catch {
    // Bỏ qua lỗi oembed
  }

  return { videoId, title, artist, thumbnail };
}
