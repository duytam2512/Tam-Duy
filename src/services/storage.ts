import { Memory, CoupleInfo, DEFAULT_COUPLE_INFO, INITIAL_MEMORIES } from '../types';

const MEMORIES_KEY = 'goc_nho_binh_yen_memories_v2';
const COUPLE_KEY = 'goc_nho_binh_yen_couple_v2';

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
    console.error('Lỗi khi đọc memories từ localStorage:', error);
    return INITIAL_MEMORIES;
  }
};

export const saveMemoriesToStorage = (memories: Memory[]): void => {
  try {
    localStorage.setItem(MEMORIES_KEY, JSON.stringify(memories));
  } catch (error) {
    console.error('Lỗi khi lưu memories vào localStorage:', error);
  }
};

export const getStoredCoupleInfo = (): CoupleInfo => {
  try {
    const raw = localStorage.getItem(COUPLE_KEY);
    if (!raw) {
      localStorage.setItem(COUPLE_KEY, JSON.stringify(DEFAULT_COUPLE_INFO));
      return DEFAULT_COUPLE_INFO;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Lỗi khi đọc couple info:', error);
    return DEFAULT_COUPLE_INFO;
  }
};

export const saveCoupleInfoToStorage = (info: CoupleInfo): void => {
  try {
    localStorage.setItem(COUPLE_KEY, JSON.stringify(info));
  } catch (error) {
    console.error('Lỗi khi lưu couple info:', error);
  }
};

/**
 * Nén ảnh trước khi lưu vào localStorage để tránh vượt quá hạn mức 5MB của trình duyệt
 */
export const compressImageFile = (file: File, maxWidth = 1200, quality = 0.85): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

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
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};
