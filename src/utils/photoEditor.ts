export type CropAspectRatioId = 'free' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export interface CropAspectRatioOption {
  id: CropAspectRatioId;
  label: string;
  ratio: number | null; // width / height, null = free
}

export const CROP_ASPECT_RATIOS: CropAspectRatioOption[] = [
  { id: 'free', label: 'Tự do', ratio: null },
  { id: '1:1', label: '1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '3:4', label: '3:4', ratio: 3 / 4 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '9:16', label: '9:16', ratio: 9 / 16 }
];

export interface CropRect {
  x: number; // 0..1 relative to rotated image width
  y: number; // 0..1 relative to rotated image height
  width: number; // 0..1
  height: number; // 0..1
}

export interface PhotoFilterPreset {
  id: string;
  name: string;
  brightness: number; // -40..40
  contrast: number; // -40..40
  saturation: number; // -100..60
  sepia: number; // 0..100
  warmth: number; // -40..40
  fade: number; // 0..35 (lifted matte shadows)
  vignette: number; // 0..80
  grain: number; // 0..40
  tint?: { r: number; g: number; b: number; alpha: number };
}

export const PHOTO_FILTER_PRESETS: PhotoFilterPreset[] = [
  {
    id: 'original',
    name: 'Gốc',
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sepia: 0,
    warmth: 0,
    fade: 0,
    vignette: 0,
    grain: 0
  },
  {
    id: 'vintage-1980',
    name: 'Vintage 80s',
    brightness: 4,
    contrast: -8,
    saturation: -22,
    sepia: 38,
    warmth: 18,
    fade: 16,
    vignette: 34,
    grain: 14,
    tint: { r: 235, g: 192, b: 138, alpha: 0.14 }
  },
  {
    id: 'kodak-gold',
    name: 'Phim Kodak',
    brightness: 3,
    contrast: 12,
    saturation: 8,
    sepia: 18,
    warmth: 24,
    fade: 8,
    vignette: 22,
    grain: 12,
    tint: { r: 255, g: 204, b: 128, alpha: 0.11 }
  },
  {
    id: 'dalat-mist',
    name: 'Đà Lạt Sương',
    brightness: 6,
    contrast: -12,
    saturation: -18,
    sepia: 8,
    warmth: -12,
    fade: 22,
    vignette: 16,
    grain: 8,
    tint: { r: 174, g: 204, b: 222, alpha: 0.14 }
  },
  {
    id: 'golden-hour',
    name: 'Hoàng Hôn',
    brightness: 5,
    contrast: 8,
    saturation: 14,
    sepia: 15,
    warmth: 28,
    fade: 6,
    vignette: 24,
    grain: 6,
    tint: { r: 244, g: 148, b: 122, alpha: 0.14 }
  },
  {
    id: 'cafe-sua',
    name: 'Cà Phê Sữa',
    brightness: 2,
    contrast: -6,
    saturation: -32,
    sepia: 48,
    warmth: 12,
    fade: 18,
    vignette: 28,
    grain: 10,
    tint: { r: 198, g: 156, b: 118, alpha: 0.16 }
  },
  {
    id: 'tokyo-airy',
    name: 'Nhật Bản',
    brightness: 10,
    contrast: -6,
    saturation: -8,
    sepia: 0,
    warmth: -6,
    fade: 14,
    vignette: 0,
    grain: 0,
    tint: { r: 215, g: 234, b: 248, alpha: 0.1 }
  },
  {
    id: 'leica-bw',
    name: 'Đen Trắng',
    brightness: 2,
    contrast: 22,
    saturation: -100,
    sepia: 6,
    warmth: 0,
    fade: 8,
    vignette: 32,
    grain: 16
  },
  {
    id: 'cinema',
    name: 'Điện Ảnh',
    brightness: -4,
    contrast: 18,
    saturation: -10,
    sepia: 10,
    warmth: -8,
    fade: 10,
    vignette: 42,
    grain: 10,
    tint: { r: 58, g: 118, b: 128, alpha: 0.14 }
  },
  {
    id: 'rose-blush',
    name: 'Hồng Phấn',
    brightness: 7,
    contrast: -4,
    saturation: 4,
    sepia: 10,
    warmth: 8,
    fade: 12,
    vignette: 14,
    grain: 4,
    tint: { r: 242, g: 174, b: 184, alpha: 0.15 }
  }
];

export interface PhotoEditState {
  filterId: string;
  filterIntensity: number; // 0..100
  brightness: number; // -40..40
  contrast: number; // -40..40
  saturation: number; // -60..60
  warmth: number; // -40..40
  vignette: number; // 0..80
  grain: number; // 0..50
  rotation: number; // 0, 90, 180, 270
  flipX: boolean;
  flipY: boolean;
  aspectRatio: CropAspectRatioId;
  crop: CropRect;
}

export const DEFAULT_CROP: CropRect = { x: 0, y: 0, width: 1, height: 1 };

export const createDefaultPhotoEditState = (): PhotoEditState => ({
  filterId: 'original',
  filterIntensity: 100,
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  vignette: 0,
  grain: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
  aspectRatio: 'free',
  crop: { ...DEFAULT_CROP }
});

export interface EffectiveColorParams {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  warmth: number;
  fade: number;
  vignette: number;
  grain: number;
  tint: { r: number; g: number; b: number; alpha: number } | null;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

export const computeEffectiveColorParams = (state: PhotoEditState): EffectiveColorParams => {
  const preset =
    PHOTO_FILTER_PRESETS.find((p) => p.id === state.filterId) || PHOTO_FILTER_PRESETS[0];
  const k = clamp(state.filterIntensity, 0, 100) / 100;

  return {
    brightness: clamp(preset.brightness * k + state.brightness, -60, 60),
    contrast: clamp(preset.contrast * k + state.contrast, -60, 60),
    saturation: clamp(preset.saturation * k + state.saturation, -100, 80),
    sepia: clamp(preset.sepia * k, 0, 100),
    warmth: clamp(preset.warmth * k + state.warmth, -60, 60),
    fade: clamp(preset.fade * k, 0, 40),
    vignette: clamp(preset.vignette * k + state.vignette, 0, 90),
    grain: clamp(preset.grain * k + state.grain, 0, 60),
    tint: preset.tint
      ? {
          ...preset.tint,
          alpha: preset.tint.alpha * k
        }
      : null
  };
};

export const hasColorEdits = (state: PhotoEditState): boolean => {
  return (
    state.filterId !== 'original' ||
    state.brightness !== 0 ||
    state.contrast !== 0 ||
    state.saturation !== 0 ||
    state.warmth !== 0 ||
    state.vignette !== 0 ||
    state.grain !== 0
  );
};

export const hasTransformOrCropEdits = (state: PhotoEditState): boolean => {
  const { crop } = state;
  const isCropped =
    crop.x > 0.002 || crop.y > 0.002 || crop.width < 0.998 || crop.height < 0.998;
  return state.rotation % 360 !== 0 || state.flipX || state.flipY || isCropped;
};

export const hasAnyPhotoEdits = (state: PhotoEditState): boolean =>
  hasColorEdits(state) || hasTransformOrCropEdits(state);

/**
 * Tạo chuỗi CSS filter tương đương để xem trước 60fps mượt mà trên mọi thiết bị
 */
export const buildPreviewCssFilter = (state: PhotoEditState): string => {
  const p = computeEffectiveColorParams(state);
  const brightnessCss = 1 + p.brightness / 100 + p.fade / 260;
  const contrastCss = 1 + p.contrast / 100 - p.fade / 180;
  const saturateCss = Math.max(0, 1 + p.saturation / 100);
  const sepiaCss = clamp(p.sepia / 100 + (p.warmth > 0 ? p.warmth / 190 : 0), 0, 1);
  const hueRotateCss = p.warmth < 0 ? `${Math.round(p.warmth * 0.35)}deg` : '0deg';

  const parts = [
    `brightness(${brightnessCss.toFixed(3)})`,
    `contrast(${Math.max(0.4, contrastCss).toFixed(3)})`,
    `saturate(${saturateCss.toFixed(3)})`
  ];
  if (sepiaCss > 0.005) parts.push(`sepia(${sepiaCss.toFixed(3)})`);
  if (hueRotateCss !== '0deg') parts.push(`hue-rotate(${hueRotateCss})`);

  return parts.join(' ');
};

export const buildPresetThumbnailCssFilter = (preset: PhotoFilterPreset): string => {
  return buildPreviewCssFilter({
    ...createDefaultPhotoEditState(),
    filterId: preset.id
  });
};

/**
 * Tính khung cắt mặc định vừa khít chính giữa khi chọn tỷ lệ khung hình mới
 */
export const fitCropToAspectRatio = (
  imageAspectRatio: number, // rotatedW / rotatedH
  targetRatio: number | null
): CropRect => {
  if (!targetRatio || !Number.isFinite(imageAspectRatio) || imageAspectRatio <= 0) {
    return { ...DEFAULT_CROP };
  }

  // Trong hệ tọa độ chuẩn hóa (width_norm * imageAspectRatio) / height_norm = targetRatio
  // => width_norm / height_norm = targetRatio / imageAspectRatio
  const normalizedTarget = targetRatio / imageAspectRatio;

  let width = 1;
  let height = 1;
  if (normalizedTarget > 1) {
    width = 1;
    height = 1 / normalizedTarget;
  } else {
    height = 1;
    width = normalizedTarget;
  }

  return {
    x: (1 - width) / 2,
    y: (1 - height) / 2,
    width,
    height
  };
};

const loadImageElement = (src: string, useCrossOrigin: boolean): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (useCrossOrigin) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error('Không thể tải ảnh vào bộ chỉnh sửa. Bạn vui lòng thử lại nhé!'));
    img.src = src;
  });
};

const loadImageForCanvas = async (src: string): Promise<HTMLImageElement> => {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return loadImageElement(src, false);
  }

  // Với URL ảnh từ xa (vd: ảnh mẫu Unsplash), tải qua fetch CORS -> Blob để tránh lỗi bộ nhớ đệm làm taint Canvas
  if (/^https?:\/\//i.test(src)) {
    try {
      const res = await fetch(src, { mode: 'cors' });
      if (res.ok) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        try {
          return await loadImageElement(objectUrl, false);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      }
    } catch {
      // Fallback sang thẻ Image kèm crossOrigin
    }
  }

  return loadImageElement(src, true);
};

/**
 * Xử lý cắt, xoay, lật và áp bộ lọc màu vintage ở mức pixel (chạy chuẩn 100% trên iPhone Safari & mọi trình duyệt)
 */
export const renderEditedPhotoDataUrl = async (
  imageSrc: string,
  state: PhotoEditState,
  options?: { maxDimension?: number; quality?: number }
): Promise<string> => {
  const maxDimension = options?.maxDimension ?? 1080;
  const quality = options?.quality ?? 0.84;

  const img = await loadImageForCanvas(imageSrc);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) {
    throw new Error('Ảnh không có kích thước hợp lệ.');
  }

  const normRotation = ((state.rotation % 360) + 360) % 360;
  const swapAxes = normRotation === 90 || normRotation === 270;
  const rotW = swapAxes ? srcH : srcW;
  const rotH = swapAxes ? srcW : srcH;

  // Bước 1: Vẽ ảnh đã xoay + lật ở độ phân giải hợp lý để tiết kiệm RAM trên điện thoại
  const preScale = Math.min(1, 1600 / Math.max(rotW, rotH));
  const stageW = Math.max(1, Math.round(rotW * preScale));
  const stageH = Math.max(1, Math.round(rotH * preScale));

  const stageCanvas = document.createElement('canvas');
  stageCanvas.width = stageW;
  stageCanvas.height = stageH;
  const stageCtx = stageCanvas.getContext('2d');
  if (!stageCtx) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh Canvas.');
  }

  stageCtx.save();
  stageCtx.translate(stageW / 2, stageH / 2);
  if (normRotation !== 0) {
    stageCtx.rotate((normRotation * Math.PI) / 180);
  }
  stageCtx.scale(state.flipX ? -1 : 1, state.flipY ? -1 : 1);
  const drawW = swapAxes ? stageH : stageW;
  const drawH = swapAxes ? stageW : stageH;
  stageCtx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
  stageCtx.restore();

  // Bước 2: Cắt vùng crop và thu về tối đa maxDimension
  const cropX = clamp(state.crop.x, 0, 0.95) * stageW;
  const cropY = clamp(state.crop.y, 0, 0.95) * stageH;
  const cropW = Math.max(16, clamp(state.crop.width, 0.05, 1 - state.crop.x) * stageW);
  const cropH = Math.max(16, clamp(state.crop.height, 0.05, 1 - state.crop.y) * stageH);

  const outScale = Math.min(1, maxDimension / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * outScale));
  const outH = Math.max(1, Math.round(cropH * outScale));

  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
  if (!outCtx) {
    stageCanvas.width = 0;
    stageCanvas.height = 0;
    throw new Error('Không thể khởi tạo vùng xuất ảnh.');
  }

  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = 'high';
  outCtx.drawImage(stageCanvas, cropX, cropY, cropW, cropH, 0, 0, outW, outH);

  // Giải phóng stageCanvas ngay lập tức cho iOS Safari
  stageCanvas.width = 0;
  stageCanvas.height = 0;

  // Bước 3: Áp bộ lọc màu, nhiệt độ màu, hiệu ứng phim mờ & hạt phim ở mức pixel (không phụ thuộc ctx.filter)
  const params = computeEffectiveColorParams(state);
  const needsPixelGrading =
    Math.abs(params.brightness) > 0.1 ||
    Math.abs(params.contrast) > 0.1 ||
    Math.abs(params.saturation) > 0.1 ||
    params.sepia > 0.1 ||
    Math.abs(params.warmth) > 0.1 ||
    params.fade > 0.1 ||
    params.grain > 0.1 ||
    Boolean(params.tint && params.tint.alpha > 0.005);

  if (needsPixelGrading) {
    try {
      const imageData = outCtx.getImageData(0, 0, outW, outH);
      const data = imageData.data;

      const brightnessMul = 1 + params.brightness / 100;
      const contrastVal = clamp(params.contrast, -95, 95) * 2.55;
      const contrastFactor = (259 * (contrastVal + 255)) / (255 * (259 - contrastVal));
      const satFactor = Math.max(0, 1 + params.saturation / 100);
      const sepiaAmt = clamp(params.sepia / 100, 0, 1);
      const warmthShift = params.warmth * 0.72;
      const fadeFloor = params.fade * 1.15;
      const fadeScale = (255 - fadeFloor) / 255;
      const tint = params.tint && params.tint.alpha > 0.005 ? params.tint : null;
      const grainAmp = params.grain * 0.75;

      // PRNG nhanh & ổn định để hạt phim mịn tự nhiên
      let seed = 1337;

      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // 1. Độ sáng
        r *= brightnessMul;
        g *= brightnessMul;
        b *= brightnessMul;

        // 2. Độ tương phản
        r = contrastFactor * (r - 128) + 128;
        g = contrastFactor * (g - 128) + 128;
        b = contrastFactor * (b - 128) + 128;

        // 3. Độ bão hòa màu (Rec.709 luma)
        if (Math.abs(satFactor - 1) > 0.005) {
          const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = gray + (r - gray) * satFactor;
          g = gray + (g - gray) * satFactor;
          b = gray + (b - gray) * satFactor;
        }

        // 4. Hiệu ứng Vintage Sepia
        if (sepiaAmt > 0.005) {
          const sr = r * 0.393 + g * 0.769 + b * 0.189;
          const sg = r * 0.349 + g * 0.686 + b * 0.168;
          const sb = r * 0.272 + g * 0.534 + b * 0.131;
          r = r * (1 - sepiaAmt) + sr * sepiaAmt;
          g = g * (1 - sepiaAmt) + sg * sepiaAmt;
          b = b * (1 - sepiaAmt) + sb * sepiaAmt;
        }

        // 5. Nhiệt độ màu (Ấm / Lạnh)
        if (Math.abs(warmthShift) > 0.1) {
          r += warmthShift;
          g += warmthShift * 0.18;
          b -= warmthShift * 0.85;
        }

        // 6. Phủ màu nghệ thuật (Tint)
        if (tint) {
          const a = tint.alpha;
          r = r * (1 - a) + tint.r * a;
          g = g * (1 - a) + tint.g * a;
          b = b * (1 - a) + tint.b * a;
        }

        // 7. Hiệu ứng mờ bóng cổ điển (Matte Film Fade)
        if (fadeFloor > 0.1) {
          r = fadeFloor + r * fadeScale;
          g = fadeFloor + g * fadeScale;
          b = fadeFloor + b * fadeScale;
        }

        // 8. Hạt phim nhẹ (Analog Film Grain)
        if (grainAmp > 0.1) {
          seed = (seed * 1664525 + 1013904223) | 0;
          const noise = (((seed >>> 16) & 0xff) / 255 - 0.5) * grainAmp;
          r += noise;
          g += noise;
          b += noise;
        }

        data[i] = r < 0 ? 0 : r > 255 ? 255 : r;
        data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
        data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }

      outCtx.putImageData(imageData, 0, 0);
    } catch (err) {
      console.warn('Không thể áp dụng bộ lọc pixel do hạn chế CORS của ảnh nguồn:', err);
    }
  }

  // Bước 4: Viền tối nghệ thuật (Vignette)
  if (params.vignette > 0.5) {
    const cx = outW / 2;
    const cy = outH / 2;
    const outerRadius = Math.hypot(cx, cy);
    const innerRadius = outerRadius * 0.36;
    const alpha = clamp(params.vignette / 100, 0, 0.85);

    const grad = outCtx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
    grad.addColorStop(0, 'rgba(18, 12, 8, 0)');
    grad.addColorStop(0.62, `rgba(18, 12, 8, ${(alpha * 0.25).toFixed(3)})`);
    grad.addColorStop(1, `rgba(18, 12, 8, ${alpha.toFixed(3)})`);
    outCtx.fillStyle = grad;
    outCtx.fillRect(0, 0, outW, outH);
  }

  try {
    return outCanvas.toDataURL('image/jpeg', quality);
  } catch {
    throw new Error(
      'Trình duyệt chặn xuất ảnh từ nguồn ngoài (CORS). Bạn hãy tải ảnh trực tiếp từ máy để chỉnh sửa nhé!'
    );
  } finally {
    outCanvas.width = 0;
    outCanvas.height = 0;
  }
};
