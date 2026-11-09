import React, { useState, useEffect } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Calendar,
  Heart,
  Share2,
  Tag,
  Layers
} from 'lucide-react';
import { Memory } from '../types';

interface LightboxModalProps {
  memory: Memory;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onToggleLike: (id: string) => void;
  onOpenShare: (memory: Memory) => void;
  fontClass?: string;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  memory,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
  onToggleLike,
  onOpenShare,
  fontClass = 'font-handwriting'
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  // Danh sách ảnh trong album của kỷ niệm này
  const albumImages = memory.images && memory.images.length > 0 ? memory.images : [memory.imageUrl];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Khi chuyển sang kỷ niệm khác thì reset lại zoom và ảnh đầu tiên
  useEffect(() => {
    setCurrentImageIndex(0);
    setZoom(1);
    setRotation(0);
  }, [memory.id]);

  const activeImageUrl = albumImages[currentImageIndex] || memory.imageUrl;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.75));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleSubPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : albumImages.length - 1));
  };

  const handleSubNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev < albumImages.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      {/* Top action bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm px-3.5 py-1.5 rounded-full text-xs">
          <Calendar className="w-3.5 h-3.5 text-[#E8A598]" />
          <span>{new Date(memory.date).toLocaleDateString('vi-VN')}</span>
          {memory.location && (
            <>
              <span className="text-white/40">•</span>
              <MapPin className="w-3.5 h-3.5 text-[#E8A598]" />
              <span className="truncate max-w-[150px] sm:max-w-xs">{memory.location}</span>
            </>
          )}
          {albumImages.length > 1 && (
            <>
              <span className="text-white/40">•</span>
              <span className="inline-flex items-center gap-1 text-[#E8A598] font-semibold">
                <Layers className="w-3 h-3" />
                <span>
                  {currentImageIndex + 1}/{albumImages.length}
                </span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom & Rotate controls */}
          <div className="hidden sm:flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full text-white/80">
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleRotate}
              className="p-1.5 hover:text-white hover:bg-white/10 rounded-full cursor-pointer transition-colors"
              title="Xoay ảnh"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onOpenShare({ ...memory, imageUrl: activeImageUrl })}
            className="flex items-center gap-1.5 bg-[#E8A598] hover:bg-[#D98A76] text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-md transition-all cursor-pointer"
            title="Lồng khung Polaroid"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Khung Polaroid</span>
          </button>

          <button
            onClick={onClose}
            className="p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Navigation Arrows for switching between memories */}
      {hasPrev && (
        <button
          onClick={onPrev}
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/40 hover:bg-black/70 text-white rounded-full z-10 transition-all cursor-pointer"
          title="Kỷ niệm trước"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {hasNext && (
        <button
          onClick={onNext}
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-2.5 sm:p-3 bg-black/40 hover:bg-black/70 text-white rounded-full z-10 transition-all cursor-pointer"
          title="Kỷ niệm tiếp theo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Main Image Container */}
      <div className="relative max-w-4xl w-full max-h-[88vh] flex flex-col items-center justify-center z-10">
        <div className="relative overflow-hidden flex items-center justify-center max-h-[60vh] w-full group">
          <img
            src={activeImageUrl}
            alt={memory.caption}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transition: 'transform 0.25s ease'
            }}
            className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-2xl select-none"
          />

          {/* Nút chuyển ảnh trong cùng album nếu có nhiều ảnh */}
          {albumImages.length > 1 && (
            <>
              <button
                onClick={handleSubPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all cursor-pointer"
                title="Ảnh trước trong album"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleSubNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/60 hover:bg-black/85 text-white rounded-full transition-all cursor-pointer"
                title="Ảnh tiếp trong album"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dải thumbnail chuyển ảnh trong album nếu có nhiều ảnh */}
        {albumImages.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2.5 max-w-md overflow-x-auto py-1 px-2 no-scrollbar">
            {albumImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setCurrentImageIndex(i)}
                className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  currentImageIndex === i
                    ? 'border-[#E8A598] scale-105 shadow-md'
                    : 'border-white/30 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt={`Album img ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Bottom Caption Card */}
        <div className="mt-3 bg-[#FFFDF9]/95 text-[#3D2E28] p-4 sm:p-5 rounded-2xl max-w-xl w-full border border-[#8C6D58]/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D98A76] bg-[#E8A598]/15 px-2.5 py-0.5 rounded-full">
                <Tag className="w-3 h-3" />
                {memory.tag || 'Kỷ niệm'}
              </span>

              {albumImages.length > 1 && (
                <span className="text-[11px] text-[#8C6D58] font-medium bg-[#F9F6F0] px-2 py-0.5 rounded-full">
                  Album ({albumImages.length} ảnh)
                </span>
              )}
            </div>

            <button
              onClick={() => onToggleLike(memory.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                memory.isLiked
                  ? 'bg-[#E8A598] text-white shadow-xs'
                  : 'bg-[#F9F6F0] text-[#8C6D58] hover:text-[#3D2E28]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  memory.isLiked ? 'fill-white text-white' : 'text-[#E8A598]'
                }`}
              />
              <span>{memory.likes || 0} yêu thích</span>
            </button>
          </div>

          <p className={`${fontClass} text-xl sm:text-2xl text-[#3D2E28] leading-relaxed`}>
            "{memory.caption}"
          </p>
        </div>
      </div>
    </div>
  );
};
