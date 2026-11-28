import {
  Memory,
  CoupleInfo,
  BackgroundSettings,
  MusicTrack,
  DiaryEntry,
  CaptionFont,
  DEFAULT_FONT,
  DEFAULT_COUPLE_INFO,
  DEFAULT_BG_SETTINGS,
  INITIAL_MEMORIES,
  DEFAULT_PLAYLIST,
  VPOP_FEATURED_TRACKS,
  INITIAL_DIARY_ENTRIES
} from '../types';
import { db, auth, waitForInitialConnection } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import {
  uploadFileToCloudMedia,
  uploadDataUrlToCloudMedia,
  deleteCloudMedia,
  isCloudMediaUrl,
  MAX_CLOUD_MEDIA_BYTES
} from './cloudMedia';

/**
 * Chờ bắt tay kết nối nhẹ ban đầu (`test/connection`) hoàn tất rồi mới gắn các `onSnapshot`
 * (tránh việc hàng MB ảnh kỷ niệm & ảnh nền nghẽn đầu luồng Watch stream khiến Firestore báo offline sau 10s).
 */
const subscribeAfterHandshake = (
  attach: () => () => void,
  extraDelayMs = 0
): (() => void) => {
  let disposed = false;
  let unsubscribe: (() => void) | null = null;
  let delayTimer: ReturnType<typeof setTimeout> | null = null;

  void waitForInitialConnection().then(() => {
    if (disposed) return;
    if (extraDelayMs > 0) {
      delayTimer = setTimeout(() => {
        delayTimer = null;
        if (disposed) return;
        unsubscribe = attach();
      }, extraDelayMs);
    } else {
      unsubscribe = attach();
    }
  });

  return () => {
    disposed = true;
    if (delayTimer) {
      clearTimeout(delayTimer);
      delayTimer = null;
    }
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
};

const PLAYLIST_KEY = 'goc_nho_playlist';
const MEMORIES_KEY = 'goc_nho_binh_yen_memories_v3';
const MEMORIES_SEEDED_KEY = 'goc_nho_memories_seeded_v3';
const COUPLE_KEY = 'goc_nho_binh_yen_couple_v3';
const BG_SETTINGS_KEY = 'goc_nho_binh_yen_bg_v3';
const DIARY_KEY = 'goc_nho_binh_yen_diary_v1';
const FONT_KEY = 'goc_nho_font_family_v1';

// Bộ nhớ đệm IndexedDB dung lượng lớn (tránh tràn giới hạn ~5MB của localStorage khi có nhiều ảnh kỷ niệm)
const APP_CACHE_DB_NAME = 'goc_nho_app_cache_v1';
const APP_CACHE_DB_VERSION = 1;
const APP_CACHE_STORE = 'kv';
const MAX_LS_MEMORIES_CHARS = 1_400_000; // ~1.4MB bản xem trước trong localStorage để dành chỗ cho các cài đặt khác
const MAX_LS_BG_CHARS = 350_000; // Ảnh nền lớn (>350KB) chỉ lưu trong IndexedDB + Cloud Firestore

let appCacheDbPromise: Promise<IDBDatabase | null> | null = null;

const openAppCacheDb = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  if (!appCacheDbPromise) {
    appCacheDbPromise = new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(APP_CACHE_DB_NAME, APP_CACHE_DB_VERSION);
        request.onupgradeneeded = () => {
          const idb = request.result;
          if (!idb.objectStoreNames.contains(APP_CACHE_STORE)) {
            idb.createObjectStore(APP_CACHE_STORE, { keyPath: 'key' });
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return appCacheDbPromise;
};

const saveCacheToIdb = async (key: string, value: unknown): Promise<void> => {
  const idb = await openAppCacheDb();
  if (!idb) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = idb.transaction(APP_CACHE_STORE, 'readwrite');
      const store = tx.objectStore(APP_CACHE_STORE);
      store.put({ key, value, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
};

const getCacheFromIdb = async <T>(key: string): Promise<T | null> => {
  const idb = await openAppCacheDb();
  if (!idb) return null;
  return new Promise<T | null>((resolve) => {
    try {
      const tx = idb.transaction(APP_CACHE_STORE, 'readonly');
      const store = tx.objectStore(APP_CACHE_STORE);
      const req = store.get(key);
      req.onsuccess = () => {
        const record = req.result as { key: string; value: T } | undefined;
        resolve(record && 'value' in record ? record.value : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const safeLocalStorageRemove = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {}
};

const safeLocalStorageSet = (key: string, value: string, allowEvictLargeCache = true): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    if (!allowEvictLargeCache) return false;
    // Nếu localStorage đang bị đầy bởi bản cache ảnh cũ, giải phóng key lớn (đã có trong IndexedDB & Firestore) rồi thử lại
    try {
      const bgRaw = localStorage.getItem(BG_SETTINGS_KEY);
      if (key !== BG_SETTINGS_KEY && bgRaw && bgRaw.length > MAX_LS_BG_CHARS) {
        localStorage.removeItem(BG_SETTINGS_KEY);
      }
      if (key !== MEMORIES_KEY) {
        localStorage.removeItem(MEMORIES_KEY);
      }
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
};

export const getCachedMemoriesAsync = async (): Promise<Memory[] | null> => {
  const cached = await getCacheFromIdb<Memory[]>(MEMORIES_KEY);
  return Array.isArray(cached) ? cached : null;
};

export const getCachedBackgroundSettingsAsync = async (): Promise<BackgroundSettings | null> => {
  const cached = await getCacheFromIdb<BackgroundSettings>(BG_SETTINGS_KEY);
  return cached && typeof cached === 'object' && 'type' in cached ? cached : null;
};


// Helper enum và xử lý lỗi theo chuẩn Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error:', JSON.stringify(errInfo));
}

/* =========================================================================
   1. QUẢN LÝ DANH SÁCH NHẠC (PLAYLIST) - ĐỒNG BỘ CLOUD FIRESTORE + LOCALSTORAGE
   ========================================================================= */

const BROKEN_AUDIO_REPLACEMENTS: Record<string, { url: string; title?: string; artist?: string }> = {
  'https://actions.google.com/sounds/v1/weather/rain_heavy.ogg': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    title: 'Hoàng Hôn Êm Đềm',
    artist: 'Piano & Guitar'
  },
  'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    title: 'Khúc Ca Bên Biển Chiều',
    artist: 'Soft Melody'
  },
  'https://actions.google.com/sounds/v1/ambiences/forest_birds.ogg': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    title: 'Sáng Sớm Đà Lạt',
    artist: 'Indie Chill'
  },
  'https://actions.google.com/sounds/v1/ambiences/peaceful_outdoor.ogg': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    title: 'Khu Vườn Bình Yên',
    artist: 'Giai Điệu Gió'
  }
};

const BROKEN_YOUTUBE_ID_REPLACEMENTS: Record<string, { youtubeId: string; title?: string }> = {
  'Z2t87K8u3QY': { youtubeId: 'Zzn9-ATB9aU', title: 'Nàng Thơ - Hoàng Dũng' },
  'Gk7F72r_f7I': { youtubeId: 'rIXhXaQ8tiM', title: 'Ngày Đầu Tiên - Đức Phúc' },
  'Q8Z_V7v6vHk': { youtubeId: 'ds_U7Ifvsx4', title: 'Ánh Nắng Của Anh - Đức Phúc' },
  'rL0mY6Vf5Cg': { youtubeId: 'IOe0tNoUGv8', title: 'Em Đồng Ý (I Do) - Đức Phúc' },
  'oQxZ_kI3dHQ': { youtubeId: '0VC6euBtKkk', title: 'Có Chàng Trai Viết Lên Cây - Phan Mạnh Quỳnh' }
};

export const sanitizePlaylistTracks = (tracks: MusicTrack[]): { tracks: MusicTrack[]; repaired: boolean } => {
  let repaired = false;
  const sanitized = tracks.map((track) => {
    if (track.url && BROKEN_AUDIO_REPLACEMENTS[track.url]) {
      repaired = true;
      const rep = BROKEN_AUDIO_REPLACEMENTS[track.url];
      return {
        ...track,
        url: rep.url,
        title: track.title || rep.title || 'Giai Điệu Bình Yên',
        artist: track.artist || rep.artist || 'Acoustic'
      };
    }

    if (track.youtubeId && BROKEN_YOUTUBE_ID_REPLACEMENTS[track.youtubeId]) {
      repaired = true;
      const rep = BROKEN_YOUTUBE_ID_REPLACEMENTS[track.youtubeId];
      return {
        ...track,
        id: `yt-${rep.youtubeId}`,
        youtubeId: rep.youtubeId,
        url: `https://www.youtube.com/watch?v=${rep.youtubeId}`,
        thumbnail: `https://i.ytimg.com/vi/${rep.youtubeId}/hqdefault.jpg`,
        isYouTube: true
      };
    }

    return track;
  });

  return { tracks: sanitized, repaired };
};

export const mergeVpopTracksIntoPlaylist = (
  existing: MusicTrack[]
): { tracks: MusicTrack[]; addedCount: number } => {
  const existingIds = new Set(existing.map((t) => t.id));
  const existingUrls = new Set(existing.map((t) => t.url));
  const missingVpop = VPOP_FEATURED_TRACKS.filter(
    (v) => !existingIds.has(v.id) && !existingUrls.has(v.url)
  );
  if (missingVpop.length === 0) {
    return { tracks: existing, addedCount: 0 };
  }
  // Đưa các bài V-Pop mới vào đầu danh sách để bấm là nghe được ngay, vẫn giữ nguyên mọi bài cũ của người dùng
  return {
    tracks: [...missingVpop, ...existing],
    addedCount: missingVpop.length
  };
};

export const getStoredPlaylist = (): MusicTrack[] => {
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    if (!raw) return DEFAULT_PLAYLIST;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const { tracks, repaired } = sanitizePlaylistTracks(parsed);
      if (repaired) {
        try {
          localStorage.setItem(PLAYLIST_KEY, JSON.stringify(tracks));
        } catch {}
      }
      return tracks;
    }
    return DEFAULT_PLAYLIST;
  } catch (err) {
    console.warn('Lỗi đọc playlist từ localStorage:', err);
    return DEFAULT_PLAYLIST;
  }
};

/**
 * Lưu danh sách phát đồng bộ lên cả Cloud Firestore và LocalStorage
 * Bất kỳ bài hát nào được thêm trên Cốc Cốc laptop sẽ ngay lập tức xuất hiện
 * trên điện thoại, máy tính bảng và mọi trình duyệt khác khi truy cập web!
 */
const stripUndefinedFromObject = <T extends Record<string, any>>(obj: T): Record<string, any> =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, value]) => {
        if (value === undefined) return false;
        if (typeof value === 'number' && !Number.isFinite(value)) return false;
        return true;
      })
      .map(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return [key, stripUndefinedFromObject(value)];
        }
        return [key, value];
      })
  );

export const savePlaylistBoth = async (playlist: MusicTrack[]): Promise<void> => {
  const { tracks: cleanTracks } = sanitizePlaylistTracks(playlist);
  const firestoreSafeTracks = cleanTracks.map((t) => stripUndefinedFromObject(t)) as MusicTrack[];
  // 1. Lưu ngay vào localStorage của thiết bị hiện tại
  safeLocalStorageSet(PLAYLIST_KEY, JSON.stringify(firestoreSafeTracks));

  // 2. Đồng bộ lên Firestore để các thiết bị khác nhận được ngay lập tức
  try {
    const playlistDocRef = doc(db, 'shared_data', 'playlist');
    await setDoc(playlistDocRef, {
      tracks: firestoreSafeTracks,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shared_data/playlist');
  }
};

/**
 * Lắng nghe thay đổi danh sách bài hát từ Cloud Firestore trong thời gian thực
 */
export const subscribeToSharedPlaylist = (
  onUpdate: (playlist: MusicTrack[]) => void
): (() => void) => {
  const playlistDocRef = doc(db, 'shared_data', 'playlist');

  return subscribeAfterHandshake(() =>
    onSnapshot(
      playlistDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
            const { tracks: cleanTracks, repaired } = sanitizePlaylistTracks(data.tracks);
            // Cập nhật localStorage để lưu offline
            safeLocalStorageSet(PLAYLIST_KEY, JSON.stringify(cleanTracks));
            onUpdate(cleanTracks);

            // Nếu có bài bị link hỏng đã được tự sửa -> cập nhật lại Cloud luôn cho tất cả thiết bị
            if (repaired) {
              try {
                await setDoc(playlistDocRef, {
                  tracks: cleanTracks,
                  updatedAt: Date.now()
                });
              } catch {}
            }
            return;
          }
        }

        // Nếu đang offline (dữ liệu từ cache trống), giữ nguyên playlist cục bộ, không ghi đè lên Cloud
        if (snapshot.metadata.fromCache) {
          onUpdate(getStoredPlaylist());
          return;
        }

        // Nếu tài liệu trên Cloud chưa có hoặc rỗng, đồng bộ từ local lên cloud nếu có bài
        try {
          const localPlaylist = getStoredPlaylist();
          if (localPlaylist && localPlaylist.length > 0) {
            await setDoc(playlistDocRef, {
              tracks: localPlaylist,
              updatedAt: Date.now()
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'shared_data/playlist');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'shared_data/playlist');
        // Khi offline hoặc lỗi mạng, dùng dữ liệu từ localStorage
        onUpdate(getStoredPlaylist());
      }
    )
  );
};

/* =========================================================================
   2. QUẢN LÝ KỶ NIỆM (MEMORIES) - ĐỒNG BỘ CLOUD + LOCALSTORAGE
   ========================================================================= */

export const getStoredMemories = (): Memory[] => {
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed; // Trả về mảng (kể cả rỗng [] nếu người dùng đã xóa hết kỷ niệm)
      }
    }
    // Chỉ khởi tạo 12 kỷ niệm mẫu ban đầu nếu máy CHƯA TỪNG được đánh dấu khởi tạo
    const isSeeded = localStorage.getItem(MEMORIES_SEEDED_KEY);
    if (!isSeeded) {
      safeLocalStorageSet(MEMORIES_KEY, JSON.stringify(INITIAL_MEMORIES), false);
      safeLocalStorageSet(MEMORIES_SEEDED_KEY, 'true');
      return INITIAL_MEMORIES;
    }
    return [];
  } catch (error) {
    console.warn('Lỗi khi đọc memories từ localStorage:', error);
    return [];
  }
};

/**
 * Thu gọn bản ghi kỷ niệm cho lớp cache nhanh localStorage (loại bỏ ảnh base64 bị nhân đôi giữa imageUrl & images[0]).
 * Toàn bộ dữ liệu gốc đầy đủ ảnh album luôn được lưu trọn vẹn trong IndexedDB và Cloud Firestore.
 */
const shrinkMemoryForLocalStorage = (memory: Memory): Memory => {
  if (!Array.isArray(memory.images) || memory.images.length === 0) {
    return memory;
  }

  // Trường hợp phổ biến nhất: album 1 ảnh bị nhân đôi y hệt imageUrl -> bỏ mảng images trong localStorage để giảm 50% dung lượng
  if (memory.images.length === 1 && memory.images[0] === memory.imageUrl) {
    const { images: _ignored, ...rest } = memory;
    return rest;
  }

  // Với album nhiều ảnh, chỉ giữ ảnh bìa (nếu khác imageUrl) và các đường dẫn không phải base64 data:
  const lightImages = memory.images.filter((img, idx) => {
    if (!img) return false;
    if (!img.startsWith('data:')) return true;
    return idx === 0 && img !== memory.imageUrl;
  });

  if (lightImages.length === 0) {
    const { images: _ignored, ...rest } = memory;
    return rest;
  }

  return {
    ...memory,
    images: lightImages
  };
};

export const saveMemoriesToStorage = (memories: Memory[]): void => {
  // 1. Luôn lưu toàn bộ danh sách kỷ niệm đầy đủ vào IndexedDB (dung lượng hàng trăm MB, không bao giờ tràn 5MB)
  void saveCacheToIdb(MEMORIES_KEY, memories);

  // 2. Lưu bản xem trước nhẹ vào localStorage trong ngân sách an toàn (~1.4MB) để mở web hiển thị tức thì
  if (memories.length === 0) {
    safeLocalStorageSet(MEMORIES_KEY, '[]', false);
    return;
  }

  const packed: Memory[] = [];
  let usedChars = 2; // "[]"

  for (const mem of memories) {
    const shrunk = shrinkMemoryForLocalStorage(mem);
    let serializedItem = '';
    try {
      serializedItem = JSON.stringify(shrunk);
    } catch {
      continue;
    }
    const nextSize = usedChars + serializedItem.length + (packed.length > 0 ? 1 : 0);
    if (nextSize <= MAX_LS_MEMORIES_CHARS) {
      packed.push(shrunk);
      usedChars = nextSize;
    } else {
      break;
    }
  }

  // Dọn ảnh nền lớn đang chiếm localStorage (nếu có) trước khi ghi bản xem trước kỷ niệm
  try {
    const bgRaw = localStorage.getItem(BG_SETTINGS_KEY);
    if (bgRaw && bgRaw.length > MAX_LS_BG_CHARS) {
      localStorage.removeItem(BG_SETTINGS_KEY);
    }
  } catch {}

  let candidate = packed;
  while (candidate.length > 0) {
    try {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(candidate));
      return;
    } catch {
      // Nếu trình duyệt cấp quota thấp hơn bình thường, tự động giảm dần số lượng bản xem trước trong im lặng
      // (toàn bộ dữ liệu đầy đủ đã được lưu an toàn trong IndexedDB và Cloud Firestore)
      const nextCount = candidate.length > 1 ? Math.floor(candidate.length / 2) : 0;
      candidate = candidate.slice(0, nextCount);
    }
  }

  // Nếu quota localStorage đã quá chật, bỏ qua cache localStorage để dành chỗ cho cài đặt nhẹ (IndexedDB + Cloud vẫn đầy đủ)
  safeLocalStorageRemove(MEMORIES_KEY);
};

/**
 * Lắng nghe toàn bộ kỷ niệm từ Cloud Firestore theo thời gian thực
 * Đảm bảo các điện thoại khác và laptop cùng thấy kỷ niệm mới ngay lập tức.
 * Khi người dùng xóa kỷ niệm mặc định (mem-1 ... mem-12), hệ thống KHÔNG tự sinh lại!
 */
export const subscribeToSharedMemories = (
  onUpdate: (memories: Memory[]) => void
): (() => void) => {
  const memoriesColRef = collection(db, 'memories');
  const metaDocRef = doc(db, 'shared_data', 'meta');

  // Trì hoãn nhẹ 80ms sau khi kết nối Online để các tài liệu nhẹ (tên cặp đôi, font, playlist, nhật ký) đồng bộ trước
  return subscribeAfterHandshake(
    () =>
      onSnapshot(
        memoriesColRef,
        async (snapshot) => {
          if (!snapshot.empty) {
            const loaded: Memory[] = [];
            snapshot.forEach((docSnap) => {
              const item = docSnap.data() as Memory;
              if (item && item.id) {
                loaded.push(item);
              }
            });

            // Sắp xếp kỷ niệm mới nhất lên đầu
            loaded.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

            safeLocalStorageSet(MEMORIES_SEEDED_KEY, 'true');
            saveMemoriesToStorage(loaded);
            onUpdate(loaded);
            return;
          }

          // Nếu đang offline và cache Firestore trống, đọc đầy đủ từ IndexedDB trước rồi mới fallback localStorage
          if (snapshot.metadata.fromCache) {
            const idbCached = await getCachedMemoriesAsync();
            onUpdate(idbCached !== null ? idbCached : getStoredMemories());
            return;
          }

          // Snapshot rỗng (0 documents trên Cloud Firestore)
          // Kiểm tra xem database đã từng được khởi tạo chưa để TRÁNH tự ý sinh lại kỷ niệm mặc định đã bị xóa
          let isAlreadyInitialized = false;
          try {
            isAlreadyInitialized = localStorage.getItem(MEMORIES_SEEDED_KEY) === 'true';
          } catch {}

          if (!isAlreadyInitialized) {
            try {
              const metaSnap = await getDoc(metaDocRef);
              if (metaSnap.exists() && metaSnap.data()?.memoriesSeeded) {
                isAlreadyInitialized = true;
              }
            } catch {
              // Bỏ qua lỗi đọc meta
            }
          }

          if (isAlreadyInitialized) {
            // Người dùng đã chủ động xóa hết các kỷ niệm mặc định! Giữ danh sách rỗng, không tự tạo lại
            saveMemoriesToStorage([]);
            onUpdate([]);
            return;
          }

          // Đây là lần đầu tiên hệ thống chạy trên database mới tinh -> Khởi tạo 12 kỷ niệm mẫu ban đầu
          safeLocalStorageSet(MEMORIES_SEEDED_KEY, 'true');
          const initialBatch = INITIAL_MEMORIES.slice(0, 12);
          saveMemoriesToStorage(initialBatch);
          onUpdate(initialBatch);

          try {
            await setDoc(metaDocRef, { memoriesSeeded: true, createdAt: Date.now() }, { merge: true });
            for (const mem of initialBatch) {
              await setDoc(doc(db, 'memories', mem.id), mem);
            }
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, 'memories');
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'memories');
          void getCachedMemoriesAsync().then((idbCached) => {
            onUpdate(idbCached !== null ? idbCached : getStoredMemories());
          });
        }
      ),
    80
  );
};

/**
 * Chuẩn bị Memory an toàn dưới giới hạn 1MB/tài liệu của Cloud Firestore:
 * Nếu album có nhiều ảnh (5, 10, 20+ ảnh) khiến tổng dung lượng > 620KB,
 * tự động lưu các ảnh phụ sắc nét sang Cloud Media (`cloud-media://`) + IndexedDB
 * để tài liệu chính luôn nhẹ (~200KB) và không bao giờ báo lỗi 1MB của Firestore!
 */
export const prepareMemoryForCloudSave = async (
  memory: Memory,
  onImageOffloadProgress?: (done: number, total: number) => void
): Promise<Memory> => {
  if (!memory.images || memory.images.length <= 1) {
    return memory;
  }

  const inlineBytes =
    (memory.imageUrl?.length || 0) +
    memory.images.reduce((sum, img) => sum + (img?.length || 0), 0);

  // Nếu tổng dung lượng vẫn gọn dưới 620KB (vd: 2-3 ảnh nhẹ) -> lưu trực tiếp trong 1 doc
  if (inlineBytes <= 620_000) {
    return memory;
  }

  // Luôn giữ ảnh bìa đầu tiên inline để bảng tin tải tức thì, offload các ảnh phụ data: sang cloud-media://
  const nextImages = [...memory.images];
  const indicesToOffload: number[] = [];
  let runningBudget = (memory.imageUrl?.length || 0) + (nextImages[0]?.length || 0);

  for (let i = 1; i < nextImages.length; i++) {
    const img = nextImages[i];
    if (img && img.startsWith('data:')) {
      if (runningBudget + img.length <= 580_000) {
        runningBudget += img.length;
      } else {
        indicesToOffload.push(i);
      }
    }
  }

  if (indicesToOffload.length === 0) {
    return memory;
  }

  let completed = 0;
  const concurrency = 3;
  for (let start = 0; start < indicesToOffload.length; start += concurrency) {
    const batch = indicesToOffload.slice(start, start + concurrency);
    await Promise.all(
      batch.map(async (idx) => {
        const cloudUrl = await uploadDataUrlToCloudMedia(
          nextImages[idx],
          `${memory.id}-img-${idx + 1}.jpg`
        );
        nextImages[idx] = cloudUrl;
        completed += 1;
        if (onImageOffloadProgress) {
          onImageOffloadProgress(completed, indicesToOffload.length);
        }
      })
    );
  }

  return {
    ...memory,
    images: nextImages
  };
};

export const saveSharedMemory = async (
  memory: Memory,
  onImageOffloadProgress?: (done: number, total: number) => void
): Promise<Memory> => {
  try {
    const prepared = await prepareMemoryForCloudSave(memory, onImageOffloadProgress);
    // Loại bỏ các trường undefined / NaN trước khi ghi vào Firestore
    const cleanMemory = stripUndefinedFromObject(prepared);
    const memDocRef = doc(db, 'memories', prepared.id);
    await setDoc(memDocRef, cleanMemory);
    return prepared;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `memories/${memory.id}`);
    throw err;
  }
};

/**
 * Cập nhật nhanh các trường nhỏ (như `tag`, `tags`, `likes`, `isLiked`) bằng `updateDoc`
 * thay vì ghi đè toàn bộ tài liệu chứa ảnh base64 dung lượng lớn (~300-750KB).
 * Tự động fallback sang `saveSharedMemory` nếu tài liệu chưa tồn tại trên Cloud.
 */
export const updateSharedMemoryFields = async (
  id: string,
  fields: Partial<Pick<Memory, 'tag' | 'tags' | 'likes' | 'isLiked' | 'caption' | 'location' | 'date'>>,
  fallbackMemory?: Memory
): Promise<void> => {
  const cleanFields = stripUndefinedFromObject(fields);
  const memDocRef = doc(db, 'memories', id);
  try {
    await updateDoc(memDocRef, cleanFields);
  } catch (err: any) {
    const code = String(err?.code || '');
    const msg = String(err?.message || '');
    if (fallbackMemory && (code === 'not-found' || msg.includes('No document to update'))) {
      await saveSharedMemory(fallbackMemory);
      return;
    }
    handleFirestoreError(err, OperationType.UPDATE, `memories/${id}`);
    throw err;
  }
};

export const deleteSharedMemory = async (id: string): Promise<boolean> => {
  try {
    const memDocRef = doc(db, 'memories', id);
    await deleteDoc(memDocRef);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `memories/${id}`);
    return false;
  }
};

export const deleteUploadedVideoFile = async (videoUrl?: string): Promise<void> => {
  if (!videoUrl) return;
  if (isCloudMediaUrl(videoUrl)) {
    await deleteCloudMedia(videoUrl);
    return;
  }
  if (!videoUrl.startsWith('/uploads/videos/')) return;
  const filename = videoUrl.split('/').pop();
  if (!filename) return;
  try {
    await fetch(`/api/uploads/video/${encodeURIComponent(filename)}`, {
      method: 'DELETE'
    });
  } catch {
    // Best-effort cleanup
  }
};

export const deleteMemoryCloudAssets = async (memory?: Memory): Promise<void> => {
  if (!memory) return;
  if (memory.videoUrl) {
    await deleteUploadedVideoFile(memory.videoUrl);
  }
  const cloudImageUrls = new Set<string>();
  if (isCloudMediaUrl(memory.imageUrl)) {
    cloudImageUrls.add(memory.imageUrl);
  }
  if (Array.isArray(memory.images)) {
    for (const img of memory.images) {
      if (isCloudMediaUrl(img)) {
        cloudImageUrls.add(img);
      }
    }
  }
  if (cloudImageUrls.size > 0) {
    await Promise.all(
      Array.from(cloudImageUrls).map((url) => deleteCloudMedia(url).catch(() => {}))
    );
  }
};

/* =========================================================================
   2.1. ĐỒNG BỘ PHONG CÁCH FONT CHỮ (TYPOGRAPHY)
   ========================================================================= */

export const getStoredFont = (): CaptionFont => {
  try {
    const raw = localStorage.getItem(FONT_KEY) as CaptionFont | null;
    if (raw && ['caveat', 'dancing', 'patrick', 'playfair', 'vietnam', 'sans'].includes(raw)) {
      return raw;
    }
    return DEFAULT_FONT;
  } catch {
    return DEFAULT_FONT;
  }
};

export const saveFontBoth = async (font: CaptionFont): Promise<void> => {
  safeLocalStorageSet(FONT_KEY, font);

  try {
    const fontDocRef = doc(db, 'shared_data', 'typography');
    await setDoc(fontDocRef, {
      font,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shared_data/typography');
  }
};

export const subscribeToSharedFont = (
  onUpdate: (font: CaptionFont) => void
): (() => void) => {
  const fontDocRef = doc(db, 'shared_data', 'typography');

  return subscribeAfterHandshake(() =>
    onSnapshot(
      fontDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.font && ['caveat', 'dancing', 'patrick', 'playfair', 'vietnam', 'sans'].includes(data.font)) {
            safeLocalStorageSet(FONT_KEY, data.font);
            onUpdate(data.font);
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'shared_data/typography');
      }
    )
  );
};

/* =========================================================================
   3. QUẢN LÝ THÔNG TIN CẶP ĐÔI (COUPLE INFO)
   ========================================================================= */

export const getStoredCoupleInfo = (): CoupleInfo => {
  try {
    const raw = localStorage.getItem(COUPLE_KEY);
    if (!raw) {
      safeLocalStorageSet(COUPLE_KEY, JSON.stringify(DEFAULT_COUPLE_INFO));
      return DEFAULT_COUPLE_INFO;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Lỗi khi đọc couple info:', error);
    return DEFAULT_COUPLE_INFO;
  }
};

export const saveCoupleInfoBoth = async (info: CoupleInfo): Promise<void> => {
  safeLocalStorageSet(COUPLE_KEY, JSON.stringify(info));

  try {
    const coupleDocRef = doc(db, 'shared_data', 'couple');
    await setDoc(coupleDocRef, {
      ...info,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shared_data/couple');
  }
};

export const subscribeToSharedCoupleInfo = (
  onUpdate: (info: CoupleInfo) => void
): (() => void) => {
  const coupleDocRef = doc(db, 'shared_data', 'couple');

  return subscribeAfterHandshake(() =>
    onSnapshot(
      coupleDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.personOne && data.personTwo) {
            const info: CoupleInfo = {
              personOne: data.personOne,
              personTwo: data.personTwo,
              startDate: data.startDate || DEFAULT_COUPLE_INFO.startDate,
              anniversaryNote: data.anniversaryNote || DEFAULT_COUPLE_INFO.anniversaryNote
            };
            safeLocalStorageSet(COUPLE_KEY, JSON.stringify(info));
            onUpdate(info);
            return;
          }
        }

        if (snapshot.metadata.fromCache) {
          return;
        }

        // Khởi tạo nếu chưa có trên Cloud
        try {
          const local = getStoredCoupleInfo();
          await setDoc(coupleDocRef, {
            ...local,
            updatedAt: Date.now()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'shared_data/couple');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'shared_data/couple');
        onUpdate(getStoredCoupleInfo());
      }
    )
  );
};

/* =========================================================================
   4. QUẢN LÝ HÌNH NỀN WEB (BACKGROUND SETTINGS)
   ========================================================================= */

const cacheBackgroundSettingsLocally = (settings: BackgroundSettings): void => {
  // Luôn lưu đầy đủ (kể cả ảnh nền dung lượng lớn) vào IndexedDB
  void saveCacheToIdb(BG_SETTINGS_KEY, settings);

  // Chỉ ghi localStorage nếu nhỏ gọn dưới 350KB để không chiếm dung lượng của kỷ niệm & cài đặt khác
  try {
    const serialized = JSON.stringify(settings);
    if (serialized.length <= MAX_LS_BG_CHARS) {
      safeLocalStorageSet(BG_SETTINGS_KEY, serialized, false);
    } else {
      safeLocalStorageRemove(BG_SETTINGS_KEY);
    }
  } catch {
    safeLocalStorageRemove(BG_SETTINGS_KEY);
  }
};

export const getStoredBackgroundSettings = (): BackgroundSettings => {
  try {
    const raw = localStorage.getItem(BG_SETTINGS_KEY);
    if (!raw) {
      safeLocalStorageSet(BG_SETTINGS_KEY, JSON.stringify(DEFAULT_BG_SETTINGS), false);
      return DEFAULT_BG_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Lỗi khi đọc background settings:', error);
    return DEFAULT_BG_SETTINGS;
  }
};

export const saveBackgroundSettingsBoth = async (settings: BackgroundSettings): Promise<void> => {
  cacheBackgroundSettingsLocally(settings);

  try {
    const bgDocRef = doc(db, 'shared_data', 'background');
    await setDoc(bgDocRef, {
      ...settings,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shared_data/background');
  }
};

export const subscribeToSharedBgSettings = (
  onUpdate: (bg: BackgroundSettings) => void
): (() => void) => {
  const bgDocRef = doc(db, 'shared_data', 'background');

  return subscribeAfterHandshake(
    () =>
      onSnapshot(
        bgDocRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as BackgroundSettings;
            if (data && data.type) {
              cacheBackgroundSettingsLocally(data);
              onUpdate(data);
            }
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'shared_data/background');
        }
      ),
    60
  );
};

/* =========================================================================
   5. QUẢN LÝ SỔ TAY NHẬT KÝ VIẾT TAY (DIARY ENTRIES) - ĐỒNG BỘ CLOUD + LOCAL
   ========================================================================= */

export const getStoredDiaryEntries = (): DiaryEntry[] => {
  try {
    const raw = localStorage.getItem(DIARY_KEY);
    if (!raw) return INITIAL_DIARY_ENTRIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_DIARY_ENTRIES;
  } catch (err) {
    console.warn('Lỗi đọc sổ tay từ localStorage:', err);
    return INITIAL_DIARY_ENTRIES;
  }
};

export const saveDiaryEntriesBoth = async (entries: DiaryEntry[]): Promise<void> => {
  safeLocalStorageSet(DIARY_KEY, JSON.stringify(entries));

  try {
    const diaryDocRef = doc(db, 'shared_data', 'diary');
    await setDoc(diaryDocRef, {
      entries,
      updatedAt: Date.now()
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'shared_data/diary');
  }
};

export const subscribeToSharedDiary = (
  onUpdate: (entries: DiaryEntry[]) => void
): (() => void) => {
  const diaryDocRef = doc(db, 'shared_data', 'diary');

  return subscribeAfterHandshake(() =>
    onSnapshot(
      diaryDocRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && Array.isArray(data.entries) && data.entries.length > 0) {
            safeLocalStorageSet(DIARY_KEY, JSON.stringify(data.entries));
            onUpdate(data.entries);
            return;
          }
        }

        if (snapshot.metadata.fromCache) {
          onUpdate(getStoredDiaryEntries());
          return;
        }

        // Khởi tạo trên Cloud nếu chưa có
        const local = getStoredDiaryEntries();
        onUpdate(local);
        try {
          await setDoc(diaryDocRef, {
            entries: local,
            updatedAt: Date.now()
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, 'shared_data/diary');
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'shared_data/diary');
        onUpdate(getStoredDiaryEntries());
      }
    )
  );
};

/**
 * Nén ảnh trước khi lưu để tối ưu tải trang cho web và đảm bảo đồng bộ Cloud Firestore mượt mà.
 * Đặc biệt tối ưu cho iPhone (Safari iOS, HEIC/JPEG camera 48MP dung lượng 20MB)
 * Đảm bảo dung lượng base64 luôn < 180KB, không bị vượt quá giới hạn 1MB của tài liệu Firestore
 * và không bị tràn bộ nhớ Safari trên điện thoại!
 */
export const compressImageFile = (file: File, maxWidth = 960, quality = 0.74): Promise<string> => {
  return new Promise((resolve, reject) => {
    let settled = false;
    let objectUrl = '';
    let isObjectUrlUsed = false;

    const timeoutId = window.setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanUp();
        reject(new Error(`Ảnh "${file.name || 'từ máy'}" xử lý quá lâu. Bạn hãy thử chọn lại ảnh này nhé!`));
      }
    }, 18000);

    const finishResolve = (val: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      resolve(val);
    };

    const finishReject = (err: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(err);
    };

    try {
      objectUrl = URL.createObjectURL(file);
      isObjectUrlUsed = true;
    } catch {
      // Nếu createObjectURL không hỗ trợ, fallback sang FileReader
    }

    const cleanUp = () => {
      if (isObjectUrlUsed && objectUrl) {
        try {
          URL.revokeObjectURL(objectUrl);
        } catch {}
        objectUrl = '';
      }
    };

    const processImageElement = (img: HTMLImageElement) => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          cleanUp();
          finishReject(new Error('Kích thước ảnh không hợp lệ'));
          return;
        }

        const maxDim = maxWidth;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          canvas.width = 0;
          canvas.height = 0;
          cleanUp();
          finishReject(new Error('Không thể khởi tạo bộ xử lý ảnh 2D'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        cleanUp();

        let outputUrl = canvas.toDataURL('image/jpeg', quality);

        if (outputUrl.length > 180000) {
          const secondCanvas = document.createElement('canvas');
          const scale = 0.8;
          secondCanvas.width = Math.round(width * scale);
          secondCanvas.height = Math.round(height * scale);
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.imageSmoothingEnabled = true;
            secondCtx.imageSmoothingQuality = 'medium';
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
            outputUrl = secondCanvas.toDataURL('image/jpeg', 0.66);
          }
          // Giải phóng ngay RAM canvas trên iPhone Safari khi nén 10-20 ảnh liên tiếp
          secondCanvas.width = 0;
          secondCanvas.height = 0;
        }

        canvas.width = 0;
        canvas.height = 0;
        finishResolve(outputUrl);
      } catch (err) {
        cleanUp();
        finishReject(err);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      processImageElement(img);
    };

    img.onerror = () => {
      cleanUp();
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => processImageElement(fallbackImg);
          fallbackImg.onerror = () =>
            finishReject(new Error(`Không thể đọc file ảnh "${file.name || ''}" trên thiết bị.`));
          fallbackImg.src = e.target?.result as string;
        };
        reader.onerror = () => finishReject(new Error('Lỗi khi đọc file ảnh từ máy.'));
        reader.readAsDataURL(file);
      } catch {
        finishReject(new Error('Thiết bị không hỗ trợ định dạng ảnh này.'));
      }
    };

    if (isObjectUrlUsed && objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = finishReject;
      reader.readAsDataURL(file);
    }
  });
};

/* =========================================================================
   6. XỬ LÝ & TẢI LÊN VIDEO KỶ NIỆM (HỖ TRỢ IPHONE, ANDROID & DESKTOP)
   ========================================================================= */

export const createFallbackVideoPoster = (label = 'Video Kỷ Niệm'): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#3D2E28"/>
        <stop offset="50%" stop-color="#5E4233"/>
        <stop offset="100%" stop-color="#D98A76"/>
      </linearGradient>
    </defs>
    <rect width="640" height="480" fill="url(#g)"/>
    <circle cx="320" cy="215" r="46" fill="rgba(255,255,255,0.2)" stroke="#FFFDF9" stroke-width="3"/>
    <polygon points="308,195 308,235 344,215" fill="#FFFDF9"/>
    <text x="320" y="305" text-anchor="middle" fill="#FFFDF9" font-family="sans-serif" font-size="22" font-weight="600">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/**
 * Trích xuất ảnh đại diện (poster JPEG nhẹ < 100KB) và thời lượng từ file video
 */
export const extractVideoMetadataAndThumbnail = (
  file: File
): Promise<{ thumbnail: string; duration: number }> => {
  return new Promise((resolve) => {
    const fallback = { thumbnail: createFallbackVideoPoster(), duration: 0 };
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      resolve(fallback);
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let settled = false;
    const finish = (result: { thumbnail: string; duration: number }) => {
      if (settled) return;
      settled = true;
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      resolve(result);
    };

    const timeout = window.setTimeout(() => {
      finish({
        thumbnail: createFallbackVideoPoster(),
        duration: Number.isFinite(video.duration) ? Math.round(video.duration) : 0
      });
    }, 6000);

    const captureFrame = () => {
      window.clearTimeout(timeout);
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 0;
      try {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;
        const maxDim = 640;
        let width = vw;
        let height = vh;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          let thumb = canvas.toDataURL('image/jpeg', 0.65);
          if (thumb.length > 140000) {
            thumb = canvas.toDataURL('image/jpeg', 0.5);
          }
          if (thumb && thumb.length > 500) {
            finish({ thumbnail: thumb, duration });
            return;
          }
        }
      } catch {}
      finish({ thumbnail: createFallbackVideoPoster(), duration });
    };

    video.onloadedmetadata = () => {
      const targetTime = video.duration && video.duration > 1 ? Math.min(1, video.duration / 3) : 0.1;
      try {
        video.currentTime = targetTime;
      } catch {
        captureFrame();
      }
    };

    video.onseeked = captureFrame;
    video.onloadeddata = () => {
      if (video.currentTime === 0) {
        captureFrame();
      }
    };
    video.onerror = () => {
      window.clearTimeout(timeout);
      finish(fallback);
    };
  });
};

/**
 * Chuẩn hóa & nhận diện loại video từ đường dẫn (file video trực tiếp, YouTube, Google Drive, Dropbox)
 */
export const getVideoEmbedInfo = (
  rawUrl?: string
): { kind: 'direct' | 'iframe'; src: string; poster?: string } => {
  if (!rawUrl) return { kind: 'direct', src: '' };
  const trimmed = rawUrl.trim();

  // YouTube video / shorts
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/|watch\?.+&v=))([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const id = ytMatch[1];
    return {
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${id}?playsinline=1&rel=0`,
      poster: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    };
  }

  // Google Drive video share link
  const gdMatch = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdMatch && gdMatch[1]) {
    return {
      kind: 'iframe',
      src: `https://drive.google.com/file/d/${gdMatch[1]}/preview`
    };
  }

  // Dropbox share link
  if (/dropbox\.com/i.test(trimmed)) {
    const direct = trimmed
      .replace(/[?&]dl=[01]/i, '')
      .concat(trimmed.includes('?') ? '&raw=1' : '?raw=1');
    return { kind: 'direct', src: direct };
  }

  return { kind: 'direct', src: trimmed };
};

/**
 * Tải file video lên hệ thống theo 3 lớp tự động (không bao giờ lỗi 404 trên Vercel / PWA tĩnh):
 * - Lớp 1: Tải chia mảnh 2MB qua máy chủ Express (/api/uploads/video/init -> chunk -> complete)
 * - Lớp 2: Thử endpoint tương thích cũ (/api/uploads/video) nếu máy chủ bản cũ chưa có /init
 * - Lớp 3: Tự động lưu chia mảnh 500KB lên Cloud Firestore + bộ nhớ đệm IndexedDB (đồng bộ iPhone <-> Laptop, không cần Node server!)
 */
export const uploadVideoFile = async (
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ videoUrl: string; size: number }> => {
  const maxBytes = 100 * 1024 * 1024; // 100MB
  if (file.size > maxBytes) {
    throw new Error('Video vượt quá giới hạn 100MB. Bạn hãy chọn video ngắn hơn nhé!');
  }

  if (file.size === 0) {
    throw new Error('File video bị trống (0 byte). Bạn vui lòng chọn lại video khác nhé!');
  }

  const fileName = file.name || 'video.mp4';
  const mimeType = file.type || 'video/mp4';

  const fallbackToCloudMedia = async (): Promise<{ videoUrl: string; size: number }> => {
    const uploaded = await uploadFileToCloudMedia(file, onProgress, MAX_CLOUD_MEDIA_BYTES);
    return {
      videoUrl: uploaded.mediaUrl,
      size: uploaded.size
    };
  };

  // Bước 1: Thử khởi tạo phiên tải chia mảnh trên máy chủ Express
  let initRes: Response | null = null;
  try {
    initRes = await fetch('/api/uploads/video/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: fileName,
        mimeType,
        totalSize: file.size
      })
    });
  } catch {
    // Máy chủ Node không phản hồi -> chuyển thẳng sang đồng bộ Cloud Firestore
    return fallbackToCloudMedia();
  }

  const initCt = initRes.headers.get('content-type') || '';
  const serverRouteMissing =
    initRes.status === 404 ||
    initRes.status === 405 ||
    initRes.status === 501 ||
    !initCt.includes('application/json');

  if (serverRouteMissing) {
    // Lớp 2: Thử endpoint tương thích cũ (/api/uploads/video) nếu file <= 25MB
    if (file.size <= 25 * 1024 * 1024) {
      try {
        if (onProgress) onProgress(15);
        const legacyRes = await fetch('/api/uploads/video', {
          method: 'POST',
          headers: {
            'Content-Type': mimeType,
            'X-File-Name': encodeURIComponent(fileName)
          },
          body: file
        });
        const legacyCt = legacyRes.headers.get('content-type') || '';
        if (legacyRes.ok && legacyCt.includes('application/json')) {
          const legacyData = await legacyRes.json();
          if (legacyData?.success && legacyData?.videoUrl) {
            if (onProgress) onProgress(100);
            return {
              videoUrl: legacyData.videoUrl,
              size: legacyData.size || file.size
            };
          }
        }
      } catch {
        // Tiếp tục xuống Lớp 3 (Cloud Firestore)
      }
    }

    // Lớp 3: Lưu trực tiếp lên Cloud Firestore (hoạt động 100% trên Vercel / PWA tĩnh / mọi trình duyệt!)
    return fallbackToCloudMedia();
  }

  if (!initRes.ok) {
    let errText = '';
    try {
      const errJson = await initRes.json();
      errText = errJson?.message || '';
    } catch {}
    // Nếu server báo lỗi 5xx mà file <= 24MB -> dự phòng ngay lên Cloud Firestore
    if (initRes.status >= 500 && file.size <= MAX_CLOUD_MEDIA_BYTES) {
      return fallbackToCloudMedia();
    }
    throw new Error(
      errText ||
        `Không thể tải video lên máy chủ (HTTP ${initRes.status}). Bạn hãy thử video nhẹ hơn hoặc dán link video nhé!`
    );
  }

  const initData = await initRes.json();
  if (!initData?.success || !initData?.uploadId) {
    if (file.size <= MAX_CLOUD_MEDIA_BYTES) {
      return fallbackToCloudMedia();
    }
    throw new Error(initData?.message || 'Không thể khởi tạo phiên tải video lên máy chủ.');
  }

  const uploadId: string = initData.uploadId;
  const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB mỗi mảnh -> luôn nhỏ hơn mọi giới hạn proxy/Cloud Run
  let offset = 0;

  // Bước 2: Gửi từng mảnh 2MB với cơ chế tự thử lại 3 lần khi mạng di động chập chờn
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size);
    const slice = file.slice(offset, end);
    const chunkBuffer = await slice.arrayBuffer();

    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const chunkRes = await fetch(
          `/api/uploads/video/chunk?uploadId=${encodeURIComponent(uploadId)}&offset=${offset}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'X-Upload-Id': uploadId,
              'X-Chunk-Offset': String(offset)
            },
            body: chunkBuffer
          }
        );

        if (!chunkRes.ok) {
          let msg = `Lỗi tải mảnh video (HTTP ${chunkRes.status})`;
          try {
            const j = await chunkRes.json();
            if (j?.message) msg = j.message;
          } catch {}
          throw new Error(msg);
        }

        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
        }
      }
    }

    if (lastErr) {
      // Nếu lỗi phiên giữa chừng trên Cloud Run đa instance và file <= 24MB -> tự chuyển sang Cloud Firestore
      if (file.size <= MAX_CLOUD_MEDIA_BYTES) {
        return fallbackToCloudMedia();
      }
      throw new Error(lastErr.message || 'Mạng bị gián đoạn khi tải video lên. Vui lòng thử lại nhé!');
    }

    offset = end;
    if (onProgress) {
      const pct = Math.min(96, Math.max(5, Math.round((offset / file.size) * 95)));
      onProgress(pct);
    }
  }

  // Bước 3: Hoàn tất ghép file trên máy chủ
  const completeRes = await fetch('/api/uploads/video/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId })
  });

  const completeData = await completeRes.json().catch(() => null);
  if (!completeRes.ok || !completeData?.success || !completeData?.videoUrl) {
    if (file.size <= MAX_CLOUD_MEDIA_BYTES) {
      return fallbackToCloudMedia();
    }
    throw new Error(completeData?.message || 'Không thể hoàn tất lưu video trên máy chủ.');
  }

  if (onProgress) onProgress(100);
  return {
    videoUrl: completeData.videoUrl,
    size: completeData.size || file.size
  };
};

export const formatVideoDuration = (seconds?: number): string => {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return 'Video';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
