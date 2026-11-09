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
  INITIAL_DIARY_ENTRIES
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
const MEMORIES_SEEDED_KEY = 'goc_nho_memories_seeded_v3';
const COUPLE_KEY = 'goc_nho_binh_yen_couple_v3';
const BG_SETTINGS_KEY = 'goc_nho_binh_yen_bg_v3';
const DIARY_KEY = 'goc_nho_binh_yen_diary_v1';
const FONT_KEY = 'goc_nho_font_family_v1';

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
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed; // Trả về mảng (kể cả rỗng [] nếu người dùng đã xóa hết kỷ niệm)
      }
    }
    // Chỉ khởi tạo 12 kỷ niệm mẫu ban đầu nếu máy CHƯA TỪNG được đánh dấu khởi tạo
    const isSeeded = localStorage.getItem(MEMORIES_SEEDED_KEY);
    if (!isSeeded) {
      localStorage.setItem(MEMORIES_KEY, JSON.stringify(INITIAL_MEMORIES));
      localStorage.setItem(MEMORIES_SEEDED_KEY, 'true');
      return INITIAL_MEMORIES;
    }
    return [];
  } catch (error) {
    console.warn('Lỗi khi đọc memories từ localStorage:', error);
    return [];
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
 * Đảm bảo các điện thoại khác và laptop cùng thấy kỷ niệm mới ngay lập tức.
 * Khi người dùng xóa kỷ niệm mặc định (mem-1 ... mem-12), hệ thống KHÔNG tự sinh lại!
 */
export const subscribeToSharedMemories = (
  onUpdate: (memories: Memory[]) => void
): (() => void) => {
  const memoriesColRef = collection(db, 'memories');
  const metaDocRef = doc(db, 'shared_data', 'meta');

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

        localStorage.setItem(MEMORIES_SEEDED_KEY, 'true');
        saveMemoriesToStorage(loaded);
        onUpdate(loaded);
        return;
      }

      // Snapshot rỗng (0 documents trên Cloud Firestore)
      // Kiểm tra xem database đã từng được khởi tạo chưa để TRÁNH tự ý sinh lại kỷ niệm mặc định đã bị xóa
      let isAlreadyInitialized = localStorage.getItem(MEMORIES_SEEDED_KEY) === 'true';

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
      localStorage.setItem(MEMORIES_SEEDED_KEY, 'true');
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
      onUpdate(getStoredMemories());
    }
  );

  return unsubscribe;
};

export const saveSharedMemory = async (memory: Memory): Promise<boolean> => {
  try {
    const memDocRef = doc(db, 'memories', memory.id);
    await setDoc(memDocRef, memory);
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `memories/${memory.id}`);
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
  try {
    localStorage.setItem(FONT_KEY, font);
  } catch (err) {
    console.warn('Lỗi lưu font vào localStorage:', err);
  }

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

  const unsubscribe = onSnapshot(
    fontDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.font && ['caveat', 'dancing', 'patrick', 'playfair', 'vietnam', 'sans'].includes(data.font)) {
          try {
            localStorage.setItem(FONT_KEY, data.font);
          } catch {}
          onUpdate(data.font);
        }
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'shared_data/typography');
    }
  );

  return unsubscribe;
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
  try {
    localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
  } catch (err) {
    console.warn('Lỗi lưu sổ tay vào localStorage:', err);
  }

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

  const unsubscribe = onSnapshot(
    diaryDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.entries) && data.entries.length > 0) {
          try {
            localStorage.setItem(DIARY_KEY, JSON.stringify(data.entries));
          } catch {}
          onUpdate(data.entries);
          return;
        }
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
  );

  return unsubscribe;
};

/**
 * Nén ảnh trước khi lưu để tối ưu tải trang cho web và đảm bảo đồng bộ Cloud Firestore mượt mà.
 * Đặc biệt tối ưu cho iPhone (Safari iOS, HEIC/JPEG camera 48MP dung lượng 20MB)
 * Đảm bảo dung lượng base64 luôn < 180KB, không bị vượt quá giới hạn 1MB của tài liệu Firestore
 * và không bị tràn bộ nhớ Safari trên điện thoại!
 */
export const compressImageFile = (file: File, maxWidth = 960, quality = 0.75): Promise<string> => {
  return new Promise((resolve, reject) => {
    // 1. Dùng URL.createObjectURL để tránh tốn hàng chục MB RAM của trình duyệt di động
    let objectUrl = '';
    let isObjectUrlUsed = false;

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
      }
    };

    const processImageElement = (img: HTMLImageElement) => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          cleanUp();
          reject(new Error('Kích thước ảnh không hợp lệ'));
          return;
        }

        // Giới hạn kích thước tối đa 960px để ảnh sắc nét trên màn hình Retina mà dung lượng cực nhẹ
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
          cleanUp();
          reject(new Error('Không thể khởi tạo bộ xử lý ảnh 2D'));
          return;
        }

        // Vẽ ảnh lên canvas với làm mịn chất lượng cao
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        cleanUp();

        // Sử dụng image/jpeg chuẩn - tương thích 100% mọi dòng iPhone, iPad, Android & Web
        let outputUrl = canvas.toDataURL('image/jpeg', quality);

        // Nếu chuỗi base64 vẫn lớn hơn 200KB (~150KB nhị phân), nén thêm một bước nữa
        // để đảm bảo khi đăng Album 3-5 ảnh không bao giờ vượt quá 1MB của Firestore
        if (outputUrl.length > 200000) {
          const secondCanvas = document.createElement('canvas');
          const scale = 0.8;
          secondCanvas.width = Math.round(width * scale);
          secondCanvas.height = Math.round(height * scale);
          const secondCtx = secondCanvas.getContext('2d');
          if (secondCtx) {
            secondCtx.imageSmoothingEnabled = true;
            secondCtx.imageSmoothingQuality = 'medium';
            secondCtx.drawImage(canvas, 0, 0, secondCanvas.width, secondCanvas.height);
            outputUrl = secondCanvas.toDataURL('image/jpeg', 0.68);
          }
        }

        resolve(outputUrl);
      } catch (err) {
        cleanUp();
        reject(err);
      }
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      processImageElement(img);
    };

    img.onerror = () => {
      cleanUp();
      // Thử đọc bằng FileReader nếu ObjectURL bị lỗi
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fallbackImg = new Image();
          fallbackImg.onload = () => processImageElement(fallbackImg);
          fallbackImg.onerror = () => reject(new Error('Không thể đọc file ảnh này trên thiết bị.'));
          fallbackImg.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Lỗi khi đọc file ảnh từ máy.'));
        reader.readAsDataURL(file);
      } catch {
        reject(new Error('Thiết bị không hỗ trợ định dạng ảnh này.'));
      }
    };

    if (isObjectUrlUsed && objectUrl) {
      img.src = objectUrl;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }
  });
};
