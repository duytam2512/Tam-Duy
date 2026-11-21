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
    Object.entries(obj).filter(([, value]) => {
      if (value === undefined) return false;
      if (typeof value === 'number' && !Number.isFinite(value)) return false;
      return true;
    })
  );

export const savePlaylistBoth = async (playlist: MusicTrack[]): Promise<void> => {
  const { tracks: cleanTracks } = sanitizePlaylistTracks(playlist);
  const firestoreSafeTracks = cleanTracks.map((t) => stripUndefinedFromObject(t)) as MusicTrack[];
  // 1. Lưu ngay vào localStorage của thiết bị hiện tại
  try {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(firestoreSafeTracks));
  } catch (err) {
    console.warn('Lỗi lưu playlist vào localStorage:', err);
  }

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

  const unsubscribe = onSnapshot(
    playlistDocRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && Array.isArray(data.tracks) && data.tracks.length > 0) {
          const { tracks: cleanTracks, repaired } = sanitizePlaylistTracks(data.tracks);
          // Cập nhật localStorage để lưu offline
          try {
            localStorage.setItem(PLAYLIST_KEY, JSON.stringify(cleanTracks));
          } catch (e) {
            console.warn('Lỗi cache playlist:', e);
          }
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
    // Loại bỏ các trường undefined / NaN trước khi ghi vào Firestore
    const cleanMemory = stripUndefinedFromObject(memory);
    const memDocRef = doc(db, 'memories', memory.id);
    await setDoc(memDocRef, cleanMemory);
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

export const deleteUploadedVideoFile = async (videoUrl?: string): Promise<void> => {
  if (!videoUrl || !videoUrl.startsWith('/uploads/videos/')) return;
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
 * Tải file video lên máy chủ theo từng mảnh nhỏ (2MB/mảnh, tự thử lại 3 lần mỗi mảnh)
 * Vượt qua giới hạn kích thước 32MB của Cloud Run và ổn định trên mạng 4G/5G iPhone!
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

  // Bước 1: Khởi tạo phiên tải chia mảnh
  const initRes = await fetch('/api/uploads/video/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: fileName,
      mimeType,
      totalSize: file.size
    })
  });

  const initCt = initRes.headers.get('content-type') || '';
  if (!initRes.ok || !initCt.includes('application/json')) {
    let errText = '';
    try {
      const errJson = await initRes.json();
      errText = errJson?.message || '';
    } catch {}
    throw new Error(
      errText ||
        `Máy chủ tải video chưa phản hồi (HTTP ${initRes.status}). Bạn hãy thử tải lại trang hoặc dán link video (YouTube / Google Drive / MP4) nhé!`
    );
  }

  const initData = await initRes.json();
  if (!initData?.success || !initData?.uploadId) {
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
