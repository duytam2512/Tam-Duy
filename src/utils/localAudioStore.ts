/**
 * Bộ lưu trữ cục bộ IndexedDB dự phòng cho các tệp âm thanh (MP3/M4A/WAV/OGG) cá nhân
 * Đảm bảo tệp âm thanh người dùng tải lên luôn phát được mượt mà ngay cả khi offline hoặc trên hosting tĩnh.
 */

export const LOCAL_AUDIO_PREFIX = 'local-audio://';
const DB_NAME = 'goc_nho_personal_audio_v1';
const STORE_NAME = 'audio_blobs';

const objectUrlCache = new Map<string, string>();

export const isLocalAudioUrl = (url?: string | null): boolean =>
  typeof url === 'string' && url.startsWith(LOCAL_AUDIO_PREFIX);

export const extractLocalAudioId = (url: string): string =>
  url.slice(LOCAL_AUDIO_PREFIX.length).trim();

function openAudioDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveLocalAudioFile(file: File): Promise<string> {
  const id = `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const blob = file.type ? file : new Blob([file], { type: 'audio/mpeg' });
  const db = await openAudioDb();

  if (db) {
    await new Promise<void>((resolve, reject) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(blob, id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('Không thể lưu tệp âm thanh cục bộ'));
      } catch (err) {
        reject(err);
      }
    });
  }

  try {
    const objUrl = URL.createObjectURL(blob);
    objectUrlCache.set(id, objUrl);
  } catch {
    // Ignore object URL failure
  }

  return `${LOCAL_AUDIO_PREFIX}${id}`;
}

export async function resolveLocalAudioUrl(url: string): Promise<string> {
  if (!isLocalAudioUrl(url)) return url;
  const id = extractLocalAudioId(url);
  if (!id) return '';

  const cached = objectUrlCache.get(id);
  if (cached) return cached;

  const db = await openAudioDb();
  if (!db) return '';

  const blob = await new Promise<Blob | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => {
        const val = req.result;
        if (val instanceof Blob) resolve(val);
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  if (!blob || blob.size === 0) return '';
  const objUrl = URL.createObjectURL(blob);
  objectUrlCache.set(id, objUrl);
  return objUrl;
}

export async function deleteLocalAudioFile(url?: string): Promise<void> {
  if (!isLocalAudioUrl(url)) return;
  const id = extractLocalAudioId(url!);
  if (!id) return;

  const cached = objectUrlCache.get(id);
  if (cached) {
    try {
      URL.revokeObjectURL(cached);
    } catch {}
    objectUrlCache.delete(id);
  }

  const db = await openAudioDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Đọc thời lượng (tính bằng giây) của file âm thanh cục bộ trước khi tải lên
 */
export function readAudioFileDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') {
      resolve(undefined);
      return;
    }
    let objUrl = '';
    try {
      objUrl = URL.createObjectURL(file);
    } catch {
      resolve(undefined);
      return;
    }

    const audio = new Audio();
    let settled = false;
    const finish = (dur?: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      audio.src = '';
      try {
        URL.revokeObjectURL(objUrl);
      } catch {}
      resolve(dur);
    };

    const timeoutId = window.setTimeout(() => finish(undefined), 3500);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const d = Number.isFinite(audio.duration) && audio.duration > 0 ? Math.round(audio.duration) : undefined;
      finish(d);
    };
    audio.onerror = () => finish(undefined);
    audio.src = objUrl;
  });
}
