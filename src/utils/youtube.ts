import { MusicTrack } from '../types';

/**
 * Tiện ích xử lý trích xuất video & danh sách phát YouTube client-side
 * Hoạt động mượt mà trên cả server Node.js, Vercel (web tĩnh) và thiết bị di động
 */

export interface YouTubeInfo {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
}

export interface CuratedYouTubePlaylist {
  id: string;
  name: string;
  subtitle: string;
  mood: string;
  tracks: MusicTrack[];
}

/**
 * Trích xuất YouTube playlistId từ mọi định dạng link danh sách phát:
 * - https://www.youtube.com/playlist?list=PLxxxxxxxx
 * - https://www.youtube.com/watch?v=xxxx&list=PLxxxxxxxx
 * - https://music.youtube.com/playlist?list=OLAK5uy_xxxxxxxx
 * - PLxxxxxxxx / OLAK5uy_xxxxxxxx (mã playlist trực tiếp)
 */
export function extractYouTubePlaylistId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const str = urlOrId.trim();

  if (/^(PL|OLAK5uy_|UU|LL|FL|RD)[a-zA-Z0-9_-]{8,}$/.test(str)) {
    return str;
  }

  try {
    const fullUrl = str.startsWith('http://') || str.startsWith('https://') ? str : `https://${str}`;
    const parsed = new URL(fullUrl);
    if (!/(^|\.)(youtube\.com|youtu\.be)$/i.test(parsed.hostname)) {
      return null;
    }
    const list = parsed.searchParams.get('list');
    if (list && /^[a-zA-Z0-9_-]{10,}$/.test(list)) {
      return list;
    }
  } catch {
    const match = str.match(/[?&]list=([a-zA-Z0-9_-]{10,})/i);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
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

  // Tránh nhầm lẫn link chỉ có playlist (/playlist?list=...) với videoId
  if (/youtube\.com\/playlist\b/i.test(str)) {
    return null;
  }

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

function makeYtTrack(
  videoId: string,
  title: string,
  artist: string,
  mood: string,
  playlistName: string
): MusicTrack {
  return {
    id: `yt-${videoId}`,
    title,
    artist,
    mood,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    isYouTube: true,
    youtubeId: videoId,
    playlistName
  };
}

/**
 * Các danh sách phát YouTube tuyển chọn sẵn (đã xác thực videoId hoạt động)
 * giúp người dùng chọn nhanh chủ đề nhạc nền khi đọc nhật ký
 */
export const CURATED_YOUTUBE_PLAYLISTS: CuratedYouTubePlaylist[] = [
  {
    id: 'yt-pl-ballad-love',
    name: 'Ballad Việt Ngọt Ngào',
    subtitle: 'Hoàng Dũng, Đức Phúc, Phan Mạnh Quỳnh',
    mood: 'YouTube Ballad',
    tracks: [
      makeYtTrack('Zzn9-ATB9aU', 'Nàng Thơ', 'Hoàng Dũng', 'YouTube Ballad', 'Ballad Việt Ngọt Ngào'),
      makeYtTrack('rIXhXaQ8tiM', 'Ngày Đầu Tiên', 'Đức Phúc', 'YouTube Ballad', 'Ballad Việt Ngọt Ngào'),
      makeYtTrack('ds_U7Ifvsx4', 'Ánh Nắng Của Anh', 'Đức Phúc', 'YouTube Ballad', 'Ballad Việt Ngọt Ngào'),
      makeYtTrack('IOe0tNoUGv8', 'Em Đồng Ý (I Do)', 'Đức Phúc ft. 911', 'YouTube Ballad', 'Ballad Việt Ngọt Ngào'),
      makeYtTrack('0VC6euBtKkk', 'Có Chàng Trai Viết Lên Cây', 'Phan Mạnh Quỳnh', 'YouTube Ballad', 'Ballad Việt Ngọt Ngào')
    ]
  },
  {
    id: 'yt-pl-vpop-romantic',
    name: 'Tình Ca V-Pop Lãng Mạn',
    subtitle: 'Hà Anh Tuấn, Sơn Tùng M-TP, ERIK',
    mood: 'YouTube V-Pop',
    tracks: [
      makeYtTrack('UCXao7aTDQM', 'Tháng Tư Là Lời Nói Dối Của Em', 'Hà Anh Tuấn', 'YouTube V-Pop', 'Tình Ca V-Pop Lãng Mạn'),
      makeYtTrack('__kGJZ-kPno', 'Hơn Cả Yêu', 'Đức Phúc', 'YouTube V-Pop', 'Tình Ca V-Pop Lãng Mạn'),
      makeYtTrack('FN7ALfpGxiI', 'Nơi Này Có Anh', 'Sơn Tùng M-TP', 'YouTube V-Pop', 'Tình Ca V-Pop Lãng Mạn'),
      makeYtTrack('wHF3Jv6Gk2o', 'Sau Tất Cả', 'ERIK', 'YouTube V-Pop', 'Tình Ca V-Pop Lãng Mạn')
    ]
  },
  {
    id: 'yt-pl-reading-chill',
    name: 'Piano & Lofi Đọc Nhật Ký',
    subtitle: 'Nhạc không lời êm dịu cho buổi tối đọc sổ tay',
    mood: 'YouTube Chill',
    tracks: [
      makeYtTrack('lTRiuFIWV54', '1 A.M Study Session (Lofi Chill)', 'Lofi Girl', 'YouTube Chill', 'Piano & Lofi Đọc Nhật Ký'),
      makeYtTrack('77ZozI0rw7w', 'Relaxing Piano & Water Sounds', 'Soothing Relaxation', 'YouTube Chill', 'Piano & Lofi Đọc Nhật Ký'),
      makeYtTrack('1ZYbU82GVz4', 'Flying — Piano Dịu Nhẹ', 'Peder B. Helland', 'YouTube Chill', 'Piano & Lofi Đọc Nhật Ký'),
      makeYtTrack('2OEL4P1Rz04', 'The Hidden Valley — Nhạc Thư Giãn', 'Soothing Relaxation', 'YouTube Chill', 'Piano & Lofi Đọc Nhật Ký')
    ]
  }
];
