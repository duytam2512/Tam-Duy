import { db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export const CLOUD_MEDIA_PREFIX = 'cloud-media://';
const CLOUD_CHUNK_BYTES = 500 * 1024; // 500KB binary -> ~667KB base64 (< 900KB rule limit & 1MB Firestore doc limit)
export const MAX_CLOUD_MEDIA_BYTES = 24 * 1024 * 1024; // 24MB (max 49 chunks < 60 chunk limit)

const IDB_NAME = 'goc_nho_media_cache_v1';
const IDB_STORE = 'blobs';

const memoryUrlCache = new Map<string, string>();
const inflightDownloads = new Map<string, Promise<string>>();

export const isCloudMediaUrl = (url?: string | null): boolean =>
  typeof url === 'string' && url.startsWith(CLOUD_MEDIA_PREFIX);

export const extractCloudMediaId = (url: string): string =>
  url.slice(CLOUD_MEDIA_PREFIX.length).trim();

export const getCachedCloudMediaUrl = (url: string): string | null => {
  if (!isCloudMediaUrl(url)) return url;
  return memoryUrlCache.get(extractCloudMediaId(url)) || null;
};

function openMediaDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains(IDB_STORE)) {
          database.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function getBlobFromIdb(mediaId: string): Promise<Blob | null> {
  const database = await openMediaDb();
  if (!database) return null;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(mediaId);
      req.onsuccess = () => {
        const val = req.result;
        if (val instanceof Blob) resolve(val);
        else if (val?.blob instanceof Blob) resolve(val.blob);
        else resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveBlobToIdb(mediaId: string, blob: Blob): Promise<void> {
  const database = await openMediaDb();
  if (!database) return;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(blob, mediaId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function removeBlobFromIdb(mediaId: string): Promise<void> {
  const database = await openMediaDb();
  if (!database) return;
  return new Promise((resolve) => {
    try {
      const tx = database.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(mediaId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const blockSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += blockSize) {
    const slice = bytes.subarray(i, Math.min(i + blockSize, bytes.length));
    parts.push(String.fromCharCode(...slice));
  }
  return btoa(parts.join(''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function inferSafeMimeType(file: File): string {
  const raw = (file.type || '').trim();
  if (raw && raw.length <= 100) return raw;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.mov')) return 'video/quicktime';
  if (name.endsWith('.webm')) return 'video/webm';
  if (name.endsWith('.m4v') || name.endsWith('.mp4')) return 'video/mp4';
  if (name.endsWith('.mp3')) return 'audio/mpeg';
  if (name.endsWith('.m4a') || name.endsWith('.aac')) return 'audio/mp4';
  if (name.endsWith('.wav')) return 'audio/wav';
  if (name.endsWith('.ogg')) return 'audio/ogg';
  return 'video/mp4';
}

/**
 * Tải tệp video hoặc âm thanh trực tiếp lên Cloud Firestore theo từng mảnh 500KB
 * Hoạt động 100% kể cả trên hosting tĩnh (Vercel / PWA) không cần máy chủ Node.js,
 * đồng bộ vĩnh viễn giữa iPhone & máy tính và cache cục bộ bằng IndexedDB!
 */
export async function uploadFileToCloudMedia(
  file: File,
  onProgress?: (percent: number) => void,
  maxBytes = MAX_CLOUD_MEDIA_BYTES
): Promise<{ mediaUrl: string; size: number }> {
  if (file.size === 0) {
    throw new Error('File bị trống (0 byte). Bạn vui lòng chọn lại file khác nhé!');
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(
      `File dung lượng ${(file.size / (1024 * 1024)).toFixed(1)}MB vượt quá giới hạn đồng bộ đám mây (${maxMb}MB). Bạn hãy chọn video ngắn hơn (≤ ${maxMb}MB) hoặc dán link Google Drive / YouTube nhé!`
    );
  }

  const totalChunks = Math.ceil(file.size / CLOUD_CHUNK_BYTES);
  const rand = Math.random().toString(36).slice(2, 8);
  const mediaId = `med-${Date.now()}-${rand}`;
  const mimeType = inferSafeMimeType(file);
  const filename = (file.name || 'media.mp4').slice(0, 255);

  if (onProgress) onProgress(5);

  // 1. Tạo tài liệu metadata trước (đáp ứng Master Gate trong firestore.rules)
  await setDoc(doc(db, 'media_files', mediaId), {
    id: mediaId,
    mimeType,
    filename,
    totalSize: file.size,
    totalChunks,
    createdAt: Date.now()
  });

  // 2. Tải song song từng nhóm 3 mảnh (có tự thử lại 2 lần nếu mạng di động chập chờn)
  let uploadedChunks = 0;
  const concurrency = 3;

  const uploadSingleChunk = async (index: number) => {
    const start = index * CLOUD_CHUNK_BYTES;
    const end = Math.min(start + CLOUD_CHUNK_BYTES, file.size);
    const buffer = await file.slice(start, end).arrayBuffer();
    const base64 = uint8ArrayToBase64(new Uint8Array(buffer));

    let lastErr: unknown = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await setDoc(doc(db, 'media_files', mediaId, 'chunks', `c${index}`), {
          index,
          data: base64
        });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
    }
    if (lastErr) {
      throw lastErr;
    }

    uploadedChunks += 1;
    if (onProgress) {
      const pct = Math.min(96, Math.max(8, Math.round((uploadedChunks / totalChunks) * 92) + 4));
      onProgress(pct);
    }
  };

  try {
    for (let i = 0; i < totalChunks; i += concurrency) {
      const batch: Promise<void>[] = [];
      for (let j = i; j < Math.min(i + concurrency, totalChunks); j++) {
        batch.push(uploadSingleChunk(j));
      }
      await Promise.all(batch);
    }
  } catch (err: any) {
    // Dọn dẹp metadata nếu tải thất bại giữa chừng
    deleteDoc(doc(db, 'media_files', mediaId)).catch(() => {});
    throw new Error(
      err?.message?.includes('Quota')
        ? 'Hạn mức lưu trữ đám mây hôm nay đã đạt tối đa. Bạn hãy thử dán link Google Drive / YouTube nhé!'
        : `Không thể đồng bộ video lên đám mây (${err?.message || 'Lỗi mạng'}). Vui lòng thử lại nhé!`
    );
  }

  // 3. Lưu ngay vào IndexedDB & RAM cache để phát tức thì 0ms trên chính thiết bị vừa đăng
  const typedBlob = file.type ? file : new Blob([file], { type: mimeType });
  await saveBlobToIdb(mediaId, typedBlob);
  try {
    const objUrl = URL.createObjectURL(typedBlob);
    memoryUrlCache.set(mediaId, objUrl);
  } catch {}

  if (onProgress) onProgress(100);
  return {
    mediaUrl: `${CLOUD_MEDIA_PREFIX}${mediaId}`,
    size: file.size
  };
}

/**
 * Chuyển đường dẫn `cloud-media://<id>` thành blob URL phát được ngay trong <video> / <audio>
 * Tự động đọc từ bộ nhớ đệm IndexedDB trước, nếu là thiết bị mới thì tải 1 lần từ Firestore rồi lưu đệm.
 */
export async function resolveCloudMediaUrl(
  url: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (!isCloudMediaUrl(url)) return url;

  const mediaId = extractCloudMediaId(url);
  if (!mediaId) return '';

  const cached = memoryUrlCache.get(mediaId);
  if (cached) {
    if (onProgress) onProgress(100);
    return cached;
  }

  const existingPromise = inflightDownloads.get(mediaId);
  if (existingPromise) return existingPromise;

  const downloadTask = (async (): Promise<string> => {
    // 1. Thử đọc từ IndexedDB cục bộ (0 lượt đọc Firestore!)
    const idbBlob = await getBlobFromIdb(mediaId);
    if (idbBlob && idbBlob.size > 0) {
      const objUrl = URL.createObjectURL(idbBlob);
      memoryUrlCache.set(mediaId, objUrl);
      if (onProgress) onProgress(100);
      return objUrl;
    }

    // 2. Tải từ Cloud Firestore về thiết bị này
    const metaSnap = await getDoc(doc(db, 'media_files', mediaId));
    if (!metaSnap.exists()) {
      throw new Error('Không tìm thấy dữ liệu media trên đám mây.');
    }

    const meta = metaSnap.data() as {
      mimeType?: string;
      totalChunks?: number;
    };
    const totalChunks = Number(meta.totalChunks || 0);
    const mimeType = meta.mimeType || 'video/mp4';

    if (totalChunks <= 0) {
      throw new Error('Dữ liệu media không hợp lệ.');
    }

    const parts: BlobPart[] = new Array(totalChunks);
    let loaded = 0;
    const batchSize = 4;

    for (let i = 0; i < totalChunks; i += batchSize) {
      const batch: Promise<void>[] = [];
      for (let j = i; j < Math.min(i + batchSize, totalChunks); j++) {
        batch.push(
          (async (idx: number) => {
            const chunkSnap = await getDoc(doc(db, 'media_files', mediaId, 'chunks', `c${idx}`));
            if (!chunkSnap.exists()) {
              throw new Error(`Thiếu mảnh dữ liệu #${idx + 1}`);
            }
            const chunkData = chunkSnap.data() as { data?: string };
            if (!chunkData?.data) {
              throw new Error(`Mảnh dữ liệu #${idx + 1} trống`);
            }
            const bytes = base64ToUint8Array(chunkData.data);
            parts[idx] = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
            loaded += 1;
            if (onProgress) {
              onProgress(Math.round((loaded / totalChunks) * 100));
            }
          })(j)
        );
      }
      await Promise.all(batch);
    }

    const blob = new Blob(parts, { type: mimeType });
    await saveBlobToIdb(mediaId, blob);
    const objUrl = URL.createObjectURL(blob);
    memoryUrlCache.set(mediaId, objUrl);
    return objUrl;
  })();

  inflightDownloads.set(mediaId, downloadTask);
  try {
    return await downloadTask;
  } finally {
    inflightDownloads.delete(mediaId);
  }
}

/**
 * Xóa dữ liệu media khỏi Cloud Firestore và bộ nhớ đệm thiết bị khi người dùng xóa kỷ niệm
 */
export async function deleteCloudMedia(url?: string): Promise<void> {
  if (!isCloudMediaUrl(url)) return;
  const mediaId = extractCloudMediaId(url!);
  if (!mediaId) return;

  const cachedUrl = memoryUrlCache.get(mediaId);
  if (cachedUrl) {
    try {
      URL.revokeObjectURL(cachedUrl);
    } catch {}
    memoryUrlCache.delete(mediaId);
  }
  await removeBlobFromIdb(mediaId);

  try {
    const metaRef = doc(db, 'media_files', mediaId);
    const metaSnap = await getDoc(metaRef);
    const totalChunks = Number(metaSnap.data()?.totalChunks || 0);
    if (totalChunks > 0) {
      for (let i = 0; i < totalChunks; i += 5) {
        const deletes: Promise<void>[] = [];
        for (let j = i; j < Math.min(i + 5, totalChunks); j++) {
          deletes.push(deleteDoc(doc(db, 'media_files', mediaId, 'chunks', `c${j}`)).catch(() => {}));
        }
        await Promise.all(deletes);
      }
    }
    await deleteDoc(metaRef).catch(() => {});
  } catch {
    // Best-effort cleanup
  }
}
