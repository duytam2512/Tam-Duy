import React, { useState } from 'react';
import { X, Check, Type, Sparkles, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CaptionFont, FONT_OPTIONS } from '../types';

interface FontSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFont: CaptionFont;
  onSaveFont: (font: CaptionFont) => void;
}

export const FontSettingsModal: React.FC<FontSettingsModalProps> = ({
  isOpen,
  onClose,
  currentFont,
  onSaveFont
}) => {
  const [selectedFont, setSelectedFont] = useState<CaptionFont>(currentFont);

  if (!isOpen) return null;

  const currentOption = FONT_OPTIONS.find((f) => f.id === selectedFont) || FONT_OPTIONS[0];

  const handleApply = () => {
    onSaveFont(selectedFont);
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E8A598', '#D98A76', '#8C6D58']
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 relative card-warm-pastel">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-1.5">
            <Type className="w-3.5 h-3.5" />
            <span>Tùy Biến Chữ Viết</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Đổi Font Chữ Kỷ Niệm
          </h2>
          <p className="text-xs text-[#8C6D58] mt-0.5">
            Chọn kiểu font yêu thích cho dòng cảm xúc, nhật ký và các khung ảnh polaroid
          </p>
        </div>

        {/* Khung Xem Trước Trực Quan (Live Preview) */}
        <div className="bg-[#FAF6F0] rounded-2xl p-4 sm:p-5 border border-[#8C6D58]/15 mb-5 relative overflow-hidden shadow-inner">
          <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D98A76]" />
              Xem trước: <strong className="text-[#3D2E28]">{currentOption.name}</strong>
            </span>
            <span className="text-[11px] bg-white px-2 py-0.5 rounded-full border border-[#8C6D58]/10">
              {currentOption.category}
            </span>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 shadow-xs border border-[#8C6D58]/10 text-center">
            <p className={`${currentOption.cssClass} text-2xl sm:text-3xl text-[#3D2E28] leading-relaxed`}>
              "{currentOption.previewText}"
            </p>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-[#8C6D58]">
              <Heart className="w-3 h-3 text-[#E8A598] fill-[#E8A598]" />
              <span>Đức Duy & Thanh Tâm • Góc Nhỏ Bình Yên</span>
            </div>
          </div>
          <p className="text-[11px] text-[#8C6D58] mt-2 text-center italic">
            {currentOption.description}
          </p>
        </div>

        {/* Danh Sách Lựa Chọn Font */}
        <div className="space-y-2 mb-6">
          <span className="text-xs font-semibold text-[#8C6D58] block mb-1">
            Danh sách 6 font chữ lãng mạn được chọn lọc:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {FONT_OPTIONS.map((font) => {
              const isSelected = selectedFont === font.id;
              return (
                <div
                  key={font.id}
                  onClick={() => setSelectedFont(font.id)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-white border-[#D98A76] ring-2 ring-[#E8A598]/40 shadow-xs'
                      : 'bg-white/80 hover:bg-white border-[#8C6D58]/15 hover:border-[#E8A598]'
                  }`}
                >
                  <div className="flex-1 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[#3D2E28]">{font.name}</span>
                    </div>
                    <p className={`${font.cssClass} text-lg text-[#3D2E28] mt-0.5 truncate`}>
                      Anh yêu Em 💖
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#D98A76] text-white shadow-xs'
                        : 'border border-[#8C6D58]/30 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Nút Bấm */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8C6D58]/15">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-6 py-2.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Áp Dụng Cho Cả Hai Đứa</span>
          </button>
        </div>
      </div>
    </div>
  );
};
