import {
  Memory,
  CoupleInfo,
  BackgroundSettings,
  MusicTrack,
  DEFAULT_COUPLE_INFO,
  DEFAULT_BG_SETTINGS,
  INITIAL_MEMORIES,
  DEFAULT_PLAYLIST
} from '../types';
import { db } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc
} from 'firebase/firestore';

const PLAYLIST_KEY = 'goc_nho_playlist';
const MEMORIES_KEY = 'goc_nho_binh_yen_memories_v3';
const COUPLE_KEY = 'goc_nho_binh_yen_couple_v3';
const BG_SETTINGS_KEY = 'goc_nho_binh_yen_bg_v3';

// Helper enum và xử lý lỗi theo chuẩn Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.warn(`[Firestore ${operationType} on ${path}]:`, error);
}

/* =========================================================================
   1. QUẢN LÝ DANH SÁCH NHẠC (PLAYLIST) - ĐỒNG BỘ CLOUD FIRESTORE + LOCALSTORAGE
   ========================================================================= */

export const getStoredPlaylist = (): MusicTrack[] => {
  try {
    const raw = localStorage.getItem(PLAYLIST_KEY);
    if (!raw) return DEFAULT_PLAYLIST;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PLAYLIST;
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
export const savePlaylistBoth = async (playlist: MusicTrack[]): Promise<void> => {
  // 1. Lưu ngay vào localStorage của thiết bị hiện tại
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlist));
  } catch (err) {
    console.warn('Lỗi lưu playlist vào localStorage:', err);
  }

  // 2. Đồng bộ lên Firestore để các thiết bị khác nhận được ngay lập tức
  try {
    const playlistDocRef = doc(db, 'shared_data', 'playlist');
    await setDoc(playlistDocRef, {
      tracks: playlist,
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

  const unsubscribe = onSnapshot(
    playlistDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
          // Cập nhật localStorage để lưu offline
          try {
            localStorage.setItem(PLAYLIST_KEY, JSON.stringify(data.tracks));
          } catch (e) {
            console.warn('Lỗi cache playlist:', e);
          }
          onUpdate(data.tracks);
          return;
        }
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
  );

  return unsubscribe;
};

/* =========================================================================
   2. QUẢN LÝ KỶ NIỆM (MEMORIES) - ĐỒNG BỘ CLOUD + LOCALSTORAGE
   ========================================================================= */

export const getStoredMemories = (): Memory[] => {
  try {
    const raw = localStorage.getItem(MEMORIES_KEY);
    if (!raw) {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(INITIAL_MEMORIES));
      return INITIAL_MEMORIES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_MEMORIES;
  } catch (error) {
    console.warn('Lỗi khi đọc memories từ localStorage:', error);
    return INITIAL_MEMORIES;
  }
};

export const saveMemoriesToStorage = (memories: Memory[]): void => {
  try {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  } catch (error) {
    console.warn('Lỗi khi lưu memories vào localStorage:', error);
  }
};

/**
 * Lắng nghe toàn bộ kỷ niệm từ Cloud Firestore theo thời gian thực
 */
export const subscribeToSharedMemories = (
  onUpdate: (memories: Memory[]) => void
): (() => void) => {
  const memoriesColRef = collection(db, 'memories');

  const unsubscribe = onSnapshot(
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

        saveMemoriesToStorage(loaded);
        onUpdate(loaded);
        return;
      }

      // Nếu trên Cloud chưa có dữ liệu nào, khởi tạo bằng các kỷ niệm mẫu ban đầu
      const local = getStoredMemories();
      onUpdate(local);

      try {
        const initialBatch = local.slice(0, 12);
        for (const mem of initialBatch) {
          await setDoc(doc(db, 'memories', mem.id), mem);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'memories');
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'memories');
      onUpdate(getStoredMemories());
    }
  );

  return unsubscribe;
};

export const saveSharedMemory = async (memory: Memory): Promise<void> => {
  try {
    const memDocRef = doc(db, 'memories', memory.id);
    await setDoc(memDocRef, memory);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `memories/${memory.id}`);
  }
};

export const deleteSharedMemory = async (id: string): Promise<void> => {
  try {
    const memDocRef = doc(db, 'memories', id);
    await deleteDoc(memDocRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `memories/${id}`);
  }
};

/* =========================================================================
   3. QUẢN LÝ THÔNG TIN CẶP ĐÔI (COUPLE INFO)
   ========================================================================= */

export const getStoredCoupleInfo = (): CoupleInfo => {
  try {
    const raw = localStorage.getItem(COUPLE_KEY);
    if (!raw) {
      localStorage.setItem(COUPLE_KEY, JSON.stringify(DEFAULT_COUPLE_INFO));
      return DEFAULT_COUPLE_INFO;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Lỗi khi đọc couple info:', error);
    return DEFAULT_COUPLE_INFO;
  }
};

export const saveCoupleInfoBoth = async (info: CoupleInfo): Promise<void> => {
  try {
    localStorage.setItem(COUPLE_KEY, JSON.stringify(info));
  } catch (error) {
    console.warn('Lỗi khi lưu couple info:', error);
  }

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

  const unsubscribe = onSnapshot(
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
          localStorage.setItem(COUPLE_KEY, JSON.stringify(info));
          onUpdate(info);
          return;
        }
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
  );

  return unsubscribe;
};

/* =========================================================================
   4. QUẢN LÝ HÌNH NỀN WEB (BACKGROUND SETTINGS)
   ========================================================================= */

export const getStoredBackgroundSettings = (): BackgroundSettings => {
  try {
    const raw = localStorage.getItem(BG_SETTINGS_KEY);
    if (!raw) {
      localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(DEFAULT_BG_SETTINGS));
      return DEFAULT_BG_SETTINGS;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Lỗi khi đọc background settings:', error);
    return DEFAULT_BG_SETTINGS;
  }
};

export const saveBackgroundSettingsBoth = async (settings: BackgroundSettings): Promise<void> => {
  try {
    localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Lỗi khi lưu background settings:', error);
  }

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

  const unsubscribe = onSnapshot(
    bgDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as BackgroundSettings;
        if (data && data.type) {
          localStorage.setItem(BG_SETTINGS_KEY, JSON.stringify(data));
          onUpdate(data);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'shared_data/background');
    }
  );

  return unsubscribe;
};

/**
 * Nén ảnh trước khi lưu để tối ưu tải trang cho web và đảm bảo đồng bộ Cloud Firestore mượt mà
 * Hỗ trợ nén ảnh chụp trực tiếp từ camera điện thoại (iPhone, Android) dung lượng lớn về mức an toàn (< 600KB)
 */
export const compressImageFile = (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Giới hạn chiều rộng tối đa
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Thử nén sang WebP trước (tỷ lệ nén tốt nhất)
        let outputUrl = '';
        try {
          const webpUrl = canvas.toDataURL('image/webp', quality);
          if (webpUrl.startsWith('data:image/webp')) {
            outputUrl = webpUrl;
          }
        } catch {
          // fallback jpeg
        }

        if (!outputUrl) {
          outputUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Nếu chuỗi base64 vẫn lớn hơn 700KB (quá nặng cho 1 Firestore doc 1MB), nén thêm một bước
        if (outputUrl.length > 700000) {
          const secondCanvas = document.createElement('canvas');
          const scale = 0.75;
          secondCanvas.width = Math.round(width * scale);
          secondCanvas.height = Math.round(height * scale);
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
            outputUrl = secondCanvas.toDataURL('image/jpeg', 0.72);
          }
        }

        resolve(outputUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
