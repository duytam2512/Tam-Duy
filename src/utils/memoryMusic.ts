import { MemoryMusic, MusicTrack } from '../types';
import { extractYouTubeId, getYouTubeVideoInfoClient } from './youtube';

export const MEMORY_MUSIC_PLAY_EVENT = 'gocnho:memory-music-play';

export function notifyMemoryMusicPlaying(playerId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(MEMORY_MUSIC_PLAY_EVENT, {
      detail: { playerId }
    })
  );
}

/**
 * Chuẩn hóa đối tượng nhạc kỷ niệm sạch (không chứa trường undefined để lưu Firestore an toàn)
 */
export function sanitizeMemoryMusic(input: Partial<MemoryMusic> & { url: string; title: string }): MemoryMusic {
  const clean: MemoryMusic = {
    title: input.title.trim() || 'Giai điệu kỷ niệm',
    url: input.url.trim()
  };
  if (input.artist && input.artist.trim()) clean.artist = input.artist.trim();
  if (input.isYouTube) clean.isYouTube = true;
  if (input.youtubeId && input.youtubeId.trim()) clean.youtubeId = input.youtubeId.trim();
  if (input.thumbnail && input.thumbnail.trim()) clean.thumbnail = input.thumbnail.trim();
  return clean;
}

export function musicTrackToMemoryMusic(track: MusicTrack): MemoryMusic {
  const ytId = track.youtubeId || (track.isYouTube ? extractYouTubeId(track.url) || undefined : undefined);
  return sanitizeMemoryMusic({
    title: track.title || 'Giai điệu kỷ niệm',
    artist: track.artist,
    url: track.url,
    isYouTube: Boolean(track.isYouTube || ytId),
    youtubeId: ytId,
    thumbnail: track.thumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined)
  });
}

function normalizeDirectAudioLink(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const gdFileMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdFileMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdFileMatch[1]}`;
  }
  const gdOpenMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i);
  if (gdOpenMatch) {
    return `https://drive.google.com/uc?export=download&id=${gdOpenMatch[1]}`;
  }
  if (/dropbox\.com/i.test(trimmed)) {
    return trimmed
      .replace(/[?&]dl=[01]/i, '')
      .concat(trimmed.includes('?') ? '&raw=1' : '?raw=1');
  }
  return trimmed;
}

function inferTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const lastSeg = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '');
    const stripped = lastSeg.replace(/\.(mp3|m4a|wav|aac|ogg|flac)$/i, '').replace(/[_-]+/g, ' ').trim();
    if (stripped) return stripped;
  } catch {
    // ignore
  }
  return 'Nhạc kỷ niệm';
}

/**
 * Phân giải mọi đường dẫn nhạc (YouTube, Zing MP3, file .mp3/.m4a/.wav/.ogg, Google Drive, Dropbox, hoặc tên bài hát)
 * thành đối tượng MemoryMusic có thể phát trực tiếp trên thẻ kỷ niệm.
 */
export async function resolveMemoryMusicLink(
  rawInput: string,
  customTitle?: string
): Promise<MemoryMusic> {
  const query = rawInput.trim();
  const cleanTitle = customTitle?.trim() || '';

  if (!query) {
    throw new Error('Bạn hãy dán link nhạc (YouTube, MP3, Zing MP3, Drive...) hoặc nhập tên bài hát nhé!');
  }

  // 1. Ưu tiên gọi API máy chủ /api/music/resolve-link (hỗ trợ YouTube, Zing MP3, link trực tiếp, tìm tên bài)
  try {
    const response = await fetch('/api/music/resolve-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: query, title: cleanTitle })
    });
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      if (response.ok && data?.success && data?.song) {
        const song = data.song as MusicTrack;
        const ytId = song.youtubeId || (song.isYouTube ? extractYouTubeId(song.url) || undefined : undefined);
        return sanitizeMemoryMusic({
          title: cleanTitle || song.title || 'Giai điệu kỷ niệm',
          artist: song.artist || (ytId ? 'YouTube' : 'Nhạc theo link'),
          url: song.url,
          isYouTube: Boolean(song.isYouTube || ytId),
          youtubeId: ytId,
          thumbnail: song.thumbnail || (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : undefined)
        });
      }
      if (!response.ok && data?.message) {
        throw new Error(data.message);
      }
    }
  } catch (err: any) {
    if (err?.message && !/failed to fetch|networkerror|load failed/i.test(err.message)) {
      throw err;
    }
  }

  // 2. Fallback client-side cho link YouTube
  const ytId = extractYouTubeId(query);
  if (ytId) {
    const info = await getYouTubeVideoInfoClient(ytId, cleanTitle);
    return sanitizeMemoryMusic({
      title: cleanTitle || info.title,
      artist: info.artist || 'YouTube',
      url: `https://www.youtube.com/watch?v=${ytId}`,
      isYouTube: true,
      youtubeId: ytId,
      thumbnail: info.thumbnail
    });
  }

  // 3. Fallback client-side cho link âm thanh trực tiếp / Google Drive / Dropbox / nội bộ /music/
  if (
    /^https?:\/\//i.test(query) ||
    /^(www\.|drive\.google\.com|dropbox\.com)/i.test(query) ||
    query.startsWith('/music/') ||
    query.startsWith('cloud-media://')
  ) {
    const withProto = /^(www\.|drive\.google\.com|dropbox\.com)/i.test(query)
      ? `https://${query}`
      : query;
    const normalizedUrl = /^https?:\/\//i.test(withProto)
      ? normalizeDirectAudioLink(withProto)
      : withProto;
    return sanitizeMemoryMusic({
      title: cleanTitle || inferTitleFromUrl(normalizedUrl),
      artist: 'Nhạc theo link',
      url: normalizedUrl,
      isYouTube: false
    });
  }

  throw new Error(
    'Không nhận diện được đường dẫn nhạc. Hãy dán link YouTube, Zing MP3, file .mp3 hoặc Google Drive nhé!'
  );
}
