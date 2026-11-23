import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Check,
  Crop,
  SlidersHorizontal,
  RotateCcw,
  RotateCw,
  FlipHorizontal2,
  FlipVertical2,
  Eye,
  RefreshCw,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  PhotoEditState,
  CropRect,
  CropAspectRatioId,
  PHOTO_FILTER_PRESETS,
  CROP_ASPECT_RATIOS,
  DEFAULT_CROP,
  createDefaultPhotoEditState,
  computeEffectiveColorParams,
  buildPreviewCssFilter,
  buildPresetThumbnailCssFilter,
  fitCropToAspectRatio,
  hasAnyPhotoEdits,
  hasColorEdits,
  renderEditedPhotoDataUrl
} from '../utils/photoEditor';

interface PhotoEditorModalProps {
  isOpen: boolean;
  imageSrc: string;
  initialState?: PhotoEditState | null;
  imageLabel?: string;
  totalPhotosCount?: number;
  onClose: () => void;
  onApply: (editedDataUrl: string, state: PhotoEditState) => void;
  onApplyFilterToAll?: (colorState: PhotoEditState) => Promise<void> | void;
}

type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se';

export const PhotoEditorModal: React.FC<PhotoEditorModalProps> = ({
  isOpen,
  imageSrc,
  initialState,
  imageLabel,
  totalPhotosCount = 1,
  onClose,
  onApply,
  onApplyFilterToAll
}) => {
  const [activeTab, setActiveTab] = useState<'filters' | 'crop'>('filters');
  const [editState, setEditState] = useState<PhotoEditState>(() =>
    initialState
      ? { ...initialState, crop: { ...initialState.crop } }
      : createDefaultPhotoEditState()
  );
  const [showFineTune, setShowFineTune] = useState(false);
  const [isComparingOriginal, setIsComparingOriginal] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Kích thước tự nhiên của ảnh và kích thước hiển thị trên stage
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 4, h: 3 });
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageBounds, setStageBounds] = useState<{ w: number; h: number }>({ w: 520, h: 340 });

  // Trạng thái kéo thả vùng cắt
  const dragRef = useRef<{
    handle: DragHandle;
    startX: number;
    startY: number;
    startCrop: CropRect;
    pointerId: number;
  } | null>(null);

  // Khởi tạo hoặc khôi phục trạng thái mỗi khi mở ảnh
  useEffect(() => {
    if (!isOpen) return;
    setEditState(
      initialState
        ? { ...initialState, crop: { ...initialState.crop } }
        : createDefaultPhotoEditState()
    );
    setActiveTab('filters');
    setShowFineTune(false);
    setIsComparingOriginal(false);
    setErrorMsg(null);
  }, [isOpen, imageSrc, initialState]);

  // Đo kích thước khung hiển thị stage để tính chính xác khung ảnh & vùng cắt
  useEffect(() => {
    if (!isOpen) return;
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageBounds({ w: rect.width, h: rect.height });
      }
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  // Kích thước ảnh sau khi xoay 90/270
  const normRotation = ((editState.rotation % 360) + 360) % 360;
  const swapAxes = normRotation === 90 || normRotation === 270;
  const rotatedNaturalW = swapAxes ? naturalSize.h : naturalSize.w;
  const rotatedNaturalH = swapAxes ? naturalSize.w : naturalSize.h;
  const imageAspect = rotatedNaturalW / Math.max(1, rotatedNaturalH);

  // Tính khung ảnh hiển thị vừa khít stage (chừa đệm 16px)
  const availW = Math.max(120, stageBounds.w - 24);
  const availH = Math.max(120, stageBounds.h - 24);
  let displayW = availW;
  let displayH = availW / Math.max(0.1, imageAspect);
  if (displayH > availH) {
    displayH = availH;
    displayW = availH * imageAspect;
  }

  // Tham số màu hiệu lực cho lớp phủ Tint & Vignette
  const effectiveParams = computeEffectiveColorParams(editState);
  const previewCssFilter = isComparingOriginal ? 'none' : buildPreviewCssFilter(editState);

  const selectedRatioObj = CROP_ASPECT_RATIOS.find((r) => r.id === editState.aspectRatio);
  const targetRatio = selectedRatioObj?.ratio ?? null;

  const handleSelectAspectRatio = (ratioId: CropAspectRatioId) => {
    const opt = CROP_ASPECT_RATIOS.find((r) => r.id === ratioId);
    const nextCrop = fitCropToAspectRatio(imageAspect, opt?.ratio ?? null);
    setEditState((prev) => ({
      ...prev,
      aspectRatio: ratioId,
      crop: nextCrop
    }));
  };

  const handleRotate = (delta: number) => {
    setEditState((prev) => {
      const nextRot = ((prev.rotation + delta) % 360 + 360) % 360;
      const nextSwap = nextRot === 90 || nextRot === 270;
      const nextAspect =
        (nextSwap ? naturalSize.h : naturalSize.w) /
        Math.max(1, nextSwap ? naturalSize.w : naturalSize.h);
      const opt = CROP_ASPECT_RATIOS.find((r) => r.id === prev.aspectRatio);
      return {
        ...prev,
        rotation: nextRot,
        crop: fitCropToAspectRatio(nextAspect, opt?.ratio ?? null)
      };
    });
  };

  const handleResetAll = () => {
    setEditState(createDefaultPhotoEditState());
    setErrorMsg(null);
  };

  const handleResetCrop = () => {
    setEditState((prev) => ({
      ...prev,
      aspectRatio: 'free',
      rotation: 0,
      flipX: false,
      flipY: false,
      crop: { ...DEFAULT_CROP }
    }));
  };

  // Xử lý kéo thả khung cắt (hỗ trợ cả chuột & cảm ứng iPhone)
  const startCropDrag = (handle: DragHandle, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...editState.crop },
      pointerId: e.pointerId
    };
  };

  const handleCropPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      e.preventDefault();

      const dx = (e.clientX - drag.startX) / Math.max(1, displayW);
      const dy = (e.clientY - drag.startY) / Math.max(1, displayH);
      const minSize = 0.14;
      const s = drag.startCrop;

      if (drag.handle === 'move') {
        const nx = Math.max(0, Math.min(1 - s.width, s.x + dx));
        const ny = Math.max(0, Math.min(1 - s.height, s.y + dy));
        setEditState((prev) => ({
          ...prev,
          crop: { ...prev.crop, x: nx, y: ny }
        }));
        return;
      }

      // Kéo 4 góc để thay đổi kích thước khung cắt
      let left = s.x;
      let right = s.x + s.width;
      let top = s.y;
      let bottom = s.y + s.height;

      if (drag.handle === 'nw' || drag.handle === 'sw') {
        left = Math.max(0, Math.min(right - minSize, s.x + dx));
      }
      if (drag.handle === 'ne' || drag.handle === 'se') {
        right = Math.min(1, Math.max(left + minSize, s.x + s.width + dx));
      }
      if (drag.handle === 'nw' || drag.handle === 'ne') {
        top = Math.max(0, Math.min(bottom - minSize, s.y + dy));
      }
      if (drag.handle === 'sw' || drag.handle === 'se') {
        bottom = Math.min(1, Math.max(top + minSize, s.y + s.height + dy));
      }

      let width = right - left;
      let height = bottom - top;

      // Giữ đúng tỷ lệ khung hình nếu người dùng đã chọn (1:1, 4:3, 3:4, 16:9, 9:16)
      if (targetRatio) {
        const normRatio = targetRatio / Math.max(0.1, imageAspect);
        // Điều chỉnh theo chiều ngang làm chuẩn, rồi kẹp biên dọc
        let desiredH = width / normRatio;
        let desiredW = width;

        const maxH =
          drag.handle === 'nw' || drag.handle === 'ne' ? bottom : 1 - top;
        if (desiredH > maxH) {
          desiredH = maxH;
          desiredW = desiredH * normRatio;
        }
        const maxW =
          drag.handle === 'nw' || drag.handle === 'sw' ? right : 1 - left;
        if (desiredW > maxW) {
          desiredW = maxW;
          desiredH = desiredW / normRatio;
        }

        if (desiredW < minSize || desiredH < minSize) {
          return;
        }

        width = desiredW;
        height = desiredH;

        if (drag.handle === 'nw') {
          left = right - width;
          top = bottom - height;
        } else if (drag.handle === 'ne') {
          top = bottom - height;
        } else if (drag.handle === 'sw') {
          left = right - width;
        }
      }

      setEditState((prev) => ({
        ...prev,
        crop: {
          x: Math.max(0, Math.min(1 - width, left)),
          y: Math.max(0, Math.min(1 - height, top)),
          width: Math.max(minSize, Math.min(1, width)),
          height: Math.max(minSize, Math.min(1, height))
        }
      }));
    },
    [displayW, displayH, targetRatio, imageAspect]
  );

  const handleCropPointerUp = (e: React.PointerEvent) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragRef.current = null;
    }
  };

  const handleConfirmApply = async () => {
    if (!hasAnyPhotoEdits(editState)) {
      onApply(imageSrc, createDefaultPhotoEditState());
      onClose();
      return;
    }

    setIsRendering(true);
    setErrorMsg(null);
    try {
      const resultDataUrl = await renderEditedPhotoDataUrl(imageSrc, editState, {
        maxDimension: 1080,
        quality: 0.85
      });
      onApply(resultDataUrl, { ...editState, crop: { ...editState.crop } });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể lưu chỉnh sửa ảnh. Bạn vui lòng thử lại nhé!');
    } finally {
      setIsRendering(false);
    }
  };

  const handleBatchApplyColors = async () => {
    if (!onApplyFilterToAll) return;
    setIsBatchApplying(true);
    setErrorMsg(null);
    try {
      await onApplyFilterToAll(editState);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Không thể áp dụng bộ lọc cho toàn bộ album.');
    } finally {
      setIsBatchApplying(false);
    }
  };

  if (!isOpen) return null;

  // CSS transform xoay/lật cho ảnh xem trước
  const innerImgW = swapAxes ? displayH : displayW;
  const innerImgH = swapAxes ? displayW : displayH;
  const transformCss = `rotate(${normRotation}deg) scaleX(${editState.flipX ? -1 : 1}) scaleY(${
    editState.flipY ? -1 : 1
  })`;

  const isCropped =
    editState.crop.x > 0.002 ||
    editState.crop.y > 0.002 ||
    editState.crop.width < 0.998 ||
    editState.crop.height < 0.998;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh sửa ảnh kỷ niệm"
    >
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-2xl max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Thanh tiêu đề studio */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[#8C6D58]/15 bg-[#FFFDF9] shrink-0">
          <div className="min-w-0">
            <h3 className="font-serif-romantic text-lg sm:text-xl font-bold text-[#3D2E28] truncate">
              Chỉnh Sửa Ảnh Nghệ Thuật
            </h3>
            <p className="text-[11px] text-[#8C6D58] truncate">
              {imageLabel ? `${imageLabel} · ` : ''}Bộ lọc màu vintage, cân chỉnh sáng & cắt khung hình
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasAnyPhotoEdits(editState) && (
              <button
                type="button"
                onPointerDown={() => setIsComparingOriginal(true)}
                onPointerUp={() => setIsComparingOriginal(false)}
                onPointerLeave={() => setIsComparingOriginal(false)}
                onPointerCancel={() => setIsComparingOriginal(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-[#F9F6F0] hover:bg-[#EFE8DD] text-[#3D2E28] transition-colors cursor-pointer select-none whitespace-nowrap"
                title="Nhấn giữ để so sánh với ảnh gốc"
              >
                <Eye className="w-3.5 h-3.5 text-[#D98A76]" />
                <span>Giữ xem gốc</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-colors cursor-pointer"
              aria-label="Đóng trình chỉnh sửa ảnh"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Vùng sân khấu ảnh (Darkroom Matte Stage) */}
        <div
          ref={stageRef}
          className="relative flex-1 min-h-[250px] sm:min-h-[310px] max-h-[44vh] bg-[#161311] flex items-center justify-center overflow-hidden select-none"
        >
          {/* Khung ảnh đúng kích thước hiển thị */}
          <div
            className="relative overflow-hidden shadow-2xl"
            style={{ width: `${displayW}px`, height: `${displayH}px` }}
          >
            {/* Ảnh gốc + xoay/lật + bộ lọc live */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={imageSrc}
                alt="Xem trước chỉnh sửa"
                referrerPolicy="no-referrer"
                onLoad={(e) => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }
                }}
                draggable={false}
                style={{
                  width: `${innerImgW}px`,
                  height: `${innerImgH}px`,
                  maxWidth: 'none',
                  transform: transformCss,
                  filter: previewCssFilter,
                  transition: 'filter 120ms ease-out'
                }}
                className="object-fill pointer-events-none select-none"
              />
            </div>

            {/* Lớp phủ màu Vintage Tint */}
            {!isComparingOriginal && effectiveParams.tint && effectiveParams.tint.alpha > 0.005 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundColor: `rgba(${effectiveParams.tint.r}, ${effectiveParams.tint.g}, ${effectiveParams.tint.b}, ${effectiveParams.tint.alpha.toFixed(3)})`,
                  mixBlendMode: 'soft-light'
                }}
              />
            )}

            {/* Lớp phủ Viền tối nghệ thuật (Vignette) */}
            {!isComparingOriginal && effectiveParams.vignette > 0.5 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(circle, rgba(18,12,8,0) 36%, rgba(18,12,8,${(
                    effectiveParams.vignette / 100
                  ).toFixed(3)}) 100%)`
                }}
              />
            )}

            {/* Lớp phủ Hạt phim (Film Grain nhẹ cho preview) */}
            {!isComparingOriginal && effectiveParams.grain > 2 && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  opacity: Math.min(0.26, effectiveParams.grain / 180),
                  backgroundImage:
                    'radial-gradient(rgba(255,255,255,0.45) 0.5px, transparent 0.5px), radial-gradient(rgba(0,0,0,0.5) 0.5px, transparent 0.5px)',
                  backgroundSize: '3px 3px',
                  backgroundPosition: '0 0, 1.5px 1.5px'
                }}
              />
            )}

            {/* Khung cắt tương tác (hiện khi ở tab Cắt, hoặc hiện mờ vùng đã cắt khi ở tab Bộ lọc) */}
            {(activeTab === 'crop' || isCropped) && (
              <div className="absolute inset-0 pointer-events-none">
                {/* 4 vùng tối che phần ngoài khung cắt */}
                <div
                  className="absolute left-0 right-0 top-0 bg-black/60"
                  style={{ height: `${editState.crop.y * 100}%` }}
                />
                <div
                  className="absolute left-0 right-0 bottom-0 bg-black/60"
                  style={{ height: `${(1 - editState.crop.y - editState.crop.height) * 100}%` }}
                />
                <div
                  className="absolute left-0 bg-black/60"
                  style={{
                    top: `${editState.crop.y * 100}%`,
                    height: `${editState.crop.height * 100}%`,
                    width: `${editState.crop.x * 100}%`
                  }}
                />
                <div
                  className="absolute right-0 bg-black/60"
                  style={{
                    top: `${editState.crop.y * 100}%`,
                    height: `${editState.crop.height * 100}%`,
                    width: `${(1 - editState.crop.x - editState.crop.width) * 100}%`
                  }}
                />

                {/* Hộp khung cắt kéo thả */}
                <div
                  onPointerDown={activeTab === 'crop' ? (e) => startCropDrag('move', e) : undefined}
                  onPointerMove={activeTab === 'crop' ? handleCropPointerMove : undefined}
                  onPointerUp={activeTab === 'crop' ? handleCropPointerUp : undefined}
                  onPointerCancel={activeTab === 'crop' ? handleCropPointerUp : undefined}
                  style={{
                    left: `${editState.crop.x * 100}%`,
                    top: `${editState.crop.y * 100}%`,
                    width: `${editState.crop.width * 100}%`,
                    height: `${editState.crop.height * 100}%`,
                    touchAction: 'none'
                  }}
                  className={`absolute border border-white/90 ${
                    activeTab === 'crop'
                      ? 'pointer-events-auto cursor-move'
                      : 'pointer-events-none border-dashed border-white/60'
                  }`}
                >
                  {/* Lưới bố cục 1/3 (Rule of Thirds) */}
                  {activeTab === 'crop' && (
                    <>
                      <div className="absolute inset-y-0 left-1/3 w-px bg-white/30 pointer-events-none" />
                      <div className="absolute inset-y-0 left-2/3 w-px bg-white/30 pointer-events-none" />
                      <div className="absolute inset-x-0 top-1/3 h-px bg-white/30 pointer-events-none" />
                      <div className="absolute inset-x-0 top-2/3 h-px bg-white/30 pointer-events-none" />

                      {/* 4 góc kéo kích thước lớn, dễ chạm trên điện thoại */}
                      {(
                        [
                          { id: 'nw', pos: '-top-2.5 -left-2.5 cursor-nwse-resize', bar: 'border-t-3 border-l-3 top-2 left-2' },
                          { id: 'ne', pos: '-top-2.5 -right-2.5 cursor-nesw-resize', bar: 'border-t-3 border-r-3 top-2 right-2' },
                          { id: 'sw', pos: '-bottom-2.5 -left-2.5 cursor-nesw-resize', bar: 'border-b-3 border-l-3 bottom-2 left-2' },
                          { id: 'se', pos: '-bottom-2.5 -right-2.5 cursor-nwse-resize', bar: 'border-b-3 border-r-3 bottom-2 right-2' }
                        ] as const
                      ).map((corner) => (
                        <div
                          key={corner.id}
                          onPointerDown={(e) => startCropDrag(corner.id, e)}
                          onPointerMove={handleCropPointerMove}
                          onPointerUp={handleCropPointerUp}
                          onPointerCancel={handleCropPointerUp}
                          style={{ touchAction: 'none' }}
                          className={`absolute w-8 h-8 ${corner.pos} flex items-center justify-center`}
                        >
                          <span
                            className={`absolute w-3.5 h-3.5 border-white ${corner.bar} pointer-events-none`}
                          />
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nhãn trạng thái so sánh ảnh gốc */}
          {isComparingOriginal && (
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 text-white text-[11px] font-semibold">
              Ảnh gốc
            </div>
          )}
        </div>

        {/* Khu vực công cụ chỉnh sửa (Bộ lọc màu | Cắt & Xoay) */}
        <div className="bg-[#FFFDF9] border-t border-[#8C6D58]/15 px-4 sm:px-5 pt-3 pb-3 space-y-3 overflow-y-auto max-h-[38vh]">
          {errorMsg && (
            <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Thanh chuyển Tab công cụ */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1 p-1 bg-[#F5EFE6] rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('filters')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'filters'
                    ? 'bg-white text-[#3D2E28] shadow-xs'
                    : 'text-[#8C6D58] hover:text-[#3D2E28]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D98A76]" />
                <span>Bộ lọc màu</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('crop')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'crop'
                    ? 'bg-white text-[#3D2E28] shadow-xs'
                    : 'text-[#8C6D58] hover:text-[#3D2E28]'
                }`}
              >
                <Crop className="w-3.5 h-3.5 text-[#D98A76]" />
                <span>Cắt & Xoay</span>
              </button>
            </div>

            {activeTab === 'filters' ? (
              <button
                type="button"
                onClick={() => setShowFineTune((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  showFineTune
                    ? 'bg-[#E8A598]/20 border-[#D98A76] text-[#3D2E28]'
                    : 'bg-white border-[#8C6D58]/20 text-[#8C6D58] hover:text-[#3D2E28]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#D98A76]" />
                <span>{showFineTune ? 'Ẩn tinh chỉnh' : 'Tinh chỉnh sáng/màu'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetCrop}
                className="text-xs font-medium text-[#8C6D58] hover:text-[#3D2E28] hover:underline cursor-pointer whitespace-nowrap"
              >
                Đặt lại khung cắt
              </button>
            )}
          </div>

          {activeTab === 'filters' ? (
            <div className="space-y-3">
              {/* Dải ảnh mẫu 10 bộ lọc màu vintage / nghệ thuật */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {PHOTO_FILTER_PRESETS.map((preset) => {
                  const isSelected = editState.filterId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setEditState((prev) => ({
                          ...prev,
                          filterId: preset.id,
                          filterIntensity: preset.id === 'original' ? 100 : prev.filterIntensity || 100
                        }))
                      }
                      className="flex flex-col items-center gap-1 shrink-0 group cursor-pointer focus:outline-hidden"
                    >
                      <div
                        className={`relative w-15 h-15 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? 'border-[#D98A76] ring-2 ring-[#E8A598]/40'
                            : 'border-[#8C6D58]/15 group-hover:border-[#E8A598]'
                        }`}
                      >
                        <img
                          src={imageSrc}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          style={{ filter: buildPresetThumbnailCssFilter(preset) }}
                          className="w-full h-full object-cover"
                        />
                        {preset.tint && (
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              backgroundColor: `rgba(${preset.tint.r}, ${preset.tint.g}, ${preset.tint.b}, ${preset.tint.alpha})`,
                              mixBlendMode: 'soft-light'
                            }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-[11px] whitespace-nowrap ${
                          isSelected ? 'font-bold text-[#D98A76]' : 'font-medium text-[#8C6D58]'
                        }`}
                      >
                        {preset.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Thanh trượt cường độ bộ lọc khi đã chọn preset */}
              {editState.filterId !== 'original' && (
                <div className="flex items-center gap-3 px-1">
                  <span className="text-xs font-medium text-[#8C6D58] w-24 shrink-0">
                    Cường độ lọc
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={editState.filterIntensity}
                    onChange={(e) =>
                      setEditState((prev) => ({
                        ...prev,
                        filterIntensity: Number(e.target.value)
                      }))
                    }
                    className="flex-1 accent-[#D98A76] h-1.5 bg-[#EFE8DD] rounded-lg cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-[#3D2E28] tabular-nums w-10 text-right">
                    {editState.filterIntensity}%
                  </span>
                </div>
              )}

              {/* Bảng tinh chỉnh sáng / tương phản / bão hòa / độ ấm / viền tối / hạt phim */}
              {showFineTune && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 pt-2 border-t border-[#8C6D58]/10">
                  {[
                    { key: 'brightness' as const, label: 'Độ sáng', min: -40, max: 40, unit: '' },
                    { key: 'contrast' as const, label: 'Tương phản', min: -40, max: 40, unit: '' },
                    { key: 'saturation' as const, label: 'Bão hòa màu', min: -60, max: 60, unit: '' },
                    { key: 'warmth' as const, label: 'Độ ấm màu', min: -40, max: 40, unit: '' },
                    { key: 'vignette' as const, label: 'Viền tối góc', min: 0, max: 80, unit: '%' },
                    { key: 'grain' as const, label: 'Hạt phim cổ', min: 0, max: 50, unit: '%' }
                  ].map((slider) => {
                    const val = editState[slider.key];
                    return (
                      <div key={slider.key} className="flex items-center gap-2.5">
                        <span className="text-[11px] font-medium text-[#8C6D58] w-22 shrink-0">
                          {slider.label}
                        </span>
                        <input
                          type="range"
                          min={slider.min}
                          max={slider.max}
                          value={val}
                          onChange={(e) =>
                            setEditState((prev) => ({
                              ...prev,
                              [slider.key]: Number(e.target.value)
                            }))
                          }
                          className="flex-1 accent-[#D98A76] h-1.5 bg-[#EFE8DD] rounded-lg cursor-pointer"
                        />
                        <span className="text-[11px] font-semibold text-[#3D2E28] tabular-nums w-9 text-right">
                          {val > 0 && slider.min < 0 ? `+${val}` : val}
                          {slider.unit}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* TAB CẮT & XOAY ẢNH */
            <div className="space-y-3">
              {/* Chọn tỷ lệ khung cắt */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                <span className="text-[11px] font-semibold text-[#8C6D58] mr-1 shrink-0">
                  Tỷ lệ khung:
                </span>
                {CROP_ASPECT_RATIOS.map((opt) => {
                  const isActive = editState.aspectRatio === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectAspectRatio(opt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'bg-[#D98A76] text-white shadow-xs'
                          : 'bg-[#F5EFE6] text-[#8C6D58] hover:text-[#3D2E28]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Nút xoay & lật ảnh */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRotate(-90)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5EFE6] hover:bg-[#ECE2D4] text-[#3D2E28] text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#D98A76]" />
                  <span>Xoay trái 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRotate(90)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5EFE6] hover:bg-[#ECE2D4] text-[#3D2E28] text-xs font-medium transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#D98A76]" />
                  <span>Xoay phải 90°</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditState((prev) => ({ ...prev, flipX: !prev.flipX }))
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    editState.flipX
                      ? 'bg-[#E8A598]/25 text-[#3D2E28] border border-[#D98A76]'
                      : 'bg-[#F5EFE6] hover:bg-[#ECE2D4] text-[#3D2E28]'
                  }`}
                >
                  <FlipHorizontal2 className="w-3.5 h-3.5 text-[#D98A76]" />
                  <span>Lật ngang</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditState((prev) => ({ ...prev, flipY: !prev.flipY }))
                  }
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    editState.flipY
                      ? 'bg-[#E8A598]/25 text-[#3D2E28] border border-[#D98A76]'
                      : 'bg-[#F5EFE6] hover:bg-[#ECE2D4] text-[#3D2E28]'
                  }`}
                >
                  <FlipVertical2 className="w-3.5 h-3.5 text-[#D98A76]" />
                  <span>Lật dọc</span>
                </button>
              </div>
              <p className="text-[11px] text-[#8C6D58]">
                Kéo vào giữa khung để di chuyển hoặc kéo 4 góc trắng để cắt bố cục mong muốn.
              </p>
            </div>
          )}
        </div>

        {/* Thanh hành động chân trang */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-[#8C6D58]/15 bg-[#FAF6F0] shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              disabled={!hasAnyPhotoEdits(editState) || isRendering || isBatchApplying}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] hover:bg-white transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              Về ảnh gốc
            </button>

            {totalPhotosCount > 1 && onApplyFilterToAll && hasColorEdits(editState) && (
              <button
                type="button"
                onClick={handleBatchApplyColors}
                disabled={isRendering || isBatchApplying}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#D98A76]/50 hover:bg-[#FFF8F4] text-[#D98A76] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                title="Áp bộ lọc màu này đồng bộ cho tất cả ảnh trong album"
              >
                {isBatchApplying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang áp màu...</span>
                  </>
                ) : (
                  <>
                    <Layers className="w-3.5 h-3.5" />
                    <span>Áp màu cả {totalPhotosCount} ảnh</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isRendering || isBatchApplying}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] hover:bg-white transition-colors cursor-pointer whitespace-nowrap"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleConfirmApply}
              disabled={isRendering || isBatchApplying}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#D98A76] hover:bg-[#C87D55] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {isRendering ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Áp dụng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
