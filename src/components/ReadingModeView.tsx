import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Heart,
  Calendar,
  MapPin,
  Play,
  Pause,
  Type,
  Sun,
  Moon,
  Sparkles,
  Scroll,
  Layers
} from 'lucide-react';
import { Memory, CoupleInfo, CaptionFont } from '../types';
import { BrandLogo } from './BrandLogo';

interface ReadingModeViewProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  coupleInfo: CoupleInfo;
  fontClass?: string;
  currentFont?: CaptionFont;
  onOpenFontModal?: () => void;
}

export const ReadingModeView: React.FC<ReadingModeViewProps> = ({
  isOpen,
  onClose,
  memories,
  coupleInfo,
  fontClass = 'font-handwriting',
  currentFont = 'caveat',
  onOpenFontModal
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [readingTheme, setReadingTheme] = useState<'cream' | 'sepia' | 'night'>('cream');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'huge'>('large');
  const [displayMode, setDisplayMode] = useState<'book' | 'scroll'>('book');
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  // Keyboard navigation (Arrow keys, Esc)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        if (displayMode === 'book') {
          setCurrentPage((prev) => (prev < memories.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowLeft') {
        if (displayMode === 'book') {
          setCurrentPage((prev) => (prev > 0 ? prev - 1 : memories.length - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, memories.length, displayMode, onClose]);

  // Auto-play page turn (chuyển trang tự động nhẹ nhàng khi đọc cùng nhau)
  useEffect(() => {
    if (!isOpen || !isAutoPlay || displayMode !== 'book') return;

    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev < memories.length - 1 ? prev + 1 : 0));
    }, 7000);

    return () => clearInterval(timer);
  }, [isOpen, isAutoPlay, displayMode, memories.length]);

  if (!isOpen || memories.length === 0) return null;

  const currentMemory = memories[currentPage] || memories[0];

  // Theme styles
  const themeStyles = {
    cream: {
      bg: 'bg-[#FFFDF9] text-[#3D2E28]',
      card: 'bg-white/85 border-[#8C6D58]/15 shadow-xl',
      accent: 'text-[#D98A76]',
      subtext: 'text-[#8C6D58]',
      headerBg: 'bg-[#FFFDF9]/90 border-[#8C6D58]/10'
    },
    sepia: {
      bg: 'bg-[#F4ECE1] text-[#3A2D23]',
      card: 'bg-[#FAF4EB]/90 border-[#7A5B45]/20 shadow-xl',
      accent: 'text-[#B86844]',
      subtext: 'text-[#7A5B45]',
      headerBg: 'bg-[#F4ECE1]/90 border-[#7A5B45]/15'
    },
    night: {
      bg: 'bg-[#181419] text-[#F3EBEA]',
      card: 'bg-[#241E26]/90 border-[#E8A598]/20 shadow-2xl',
      accent: 'text-[#E8A598]',
      subtext: 'text-[#C4A9A6]',
      headerBg: 'bg-[#181419]/90 border-white/10'
    }
  }[readingTheme];

  // Font size styles
  const fontStyles = {
    normal: 'text-xl sm:text-2xl',
    large: 'text-2xl sm:text-3xl sm:leading-relaxed',
    huge: 'text-3xl sm:text-4xl sm:leading-loose'
  }[fontSize];

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto transition-colors duration-500 ${themeStyles.bg}`}>
      {/* 1. TOP ROMANTIC READING CONTROL BAR */}
      <header className={`sticky top-0 z-20 backdrop-blur-md border-b px-4 py-3 transition-colors ${themeStyles.headerBg}`}>
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Couple Title */}
          <div className="flex items-center gap-2.5">
            <BrandLogo size={28} className="w-7 h-7" />
            <div>
              <div className="flex items-center gap-1.5 font-serif-romantic font-bold text-sm sm:text-base">
                <span>{coupleInfo.personOne}</span>
                <Heart className="w-3.5 h-3.5 fill-[#E8A598] text-[#E8A598]" />
                <span>{coupleInfo.personTwo}</span>
              </div>
              <div className={`text-[10px] ${themeStyles.subtext}`}>
                Chế độ đọc nhật ký kỷ niệm
              </div>
            </div>
          </div>

          {/* Reading Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* View Mode: Book vs Scroll */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-xl">
              <button
                onClick={() => setDisplayMode('book')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  displayMode === 'book'
                    ? 'bg-white dark:bg-black/40 shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="Lật từng trang như cuốn sách"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDisplayMode('scroll')}
                className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                  displayMode === 'scroll'
                    ? 'bg-white dark:bg-black/40 shadow-xs'
                    : 'opacity-60 hover:opacity-100'
                }`}
                title="Đọc dạng cuộn nhật ký liên tục"
              >
                <Scroll className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Size Toggle */}
            <button
              onClick={() => {
                if (fontSize === 'normal') setFontSize('large');
                else if (fontSize === 'large') setFontSize('huge');
                else setFontSize('normal');
              }}
              className="p-1.5 rounded-xl border border-current/15 text-xs flex items-center gap-1 hover:bg-black/5"
              title="Đổi kích thước chữ"
            >
              <Type className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-semibold">{fontSize}</span>
            </button>

            {/* Font Style Switcher */}
            {onOpenFontModal && (
              <button
                onClick={onOpenFontModal}
                className="p-1.5 px-2.5 rounded-xl border border-current/15 text-xs flex items-center gap-1 hover:bg-black/5"
                title="Đổi kiểu phông chữ cảm xúc / viết tay"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#D98A76]" />
                <span className="text-[10px] uppercase font-semibold hidden sm:inline">Phông chữ</span>
              </button>
            )}

            {/* Atmosphere Theme Toggle */}
            <div className="flex items-center bg-black/5 dark:bg-white/5 p-0.5 rounded-xl">
              <button
                onClick={() => setReadingTheme('cream')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  readingTheme === 'cream' ? 'bg-white shadow-xs text-[#3D2E28]' : 'opacity-60'
                }`}
              >
                Kem Sữa
              </button>
              <button
                onClick={() => setReadingTheme('sepia')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  readingTheme === 'sepia' ? 'bg-[#FAF4EB] shadow-xs text-[#3A2D23]' : 'opacity-60'
                }`}
              >
                Giấy Cũ
              </button>
              <button
                onClick={() => setReadingTheme('night')}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
                  readingTheme === 'night' ? 'bg-[#2A222C] shadow-xs text-white' : 'opacity-60'
                }`}
              >
                Đêm Trăng
              </button>
            </div>

            {/* Auto-play slideshow */}
            {displayMode === 'book' && (
              <button
                onClick={() => setIsAutoPlay(!isAutoPlay)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  isAutoPlay
                    ? 'bg-[#E8A598] text-white border-transparent shadow-xs'
                    : 'border-current/15 hover:bg-black/5'
                }`}
                title={isAutoPlay ? 'Tạm dừng tự động lật trang' : 'Tự động lật trang nhẹ nhàng'}
              >
                {isAutoPlay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span className="hidden sm:inline text-[11px]">Tự chuyển</span>
              </button>
            )}

            {/* Nút Thoát Chế Độ Đọc */}
            <button
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white text-xs font-semibold shadow-xs transition-all active:scale-95 ml-1"
              title="Thoát chế độ đọc (Phím Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Thoát</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CHẾ ĐỘ 1: CUỐN SÁCH TÌNH YÊU (BOOK MODE - TỪNG TRANG) */}
      {displayMode === 'book' ? (
        <main className="min-h-[88vh] flex flex-col justify-center items-center px-4 py-8 max-w-4xl mx-auto">
          {/* Main Memory Story Paper */}
          <article className={`w-full rounded-3xl p-6 sm:p-12 border transition-all duration-500 relative ${themeStyles.card}`}>
            {/* Header thông tin ngày tháng & địa điểm */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-current/10">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                <span className={`flex items-center gap-1 font-semibold ${themeStyles.accent}`}>
                  <Calendar className="w-4 h-4" />
                  {new Date(currentMemory.date).toLocaleDateString('vi-VN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
                {currentMemory.location && (
                  <>
                    <span className="opacity-30">•</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>{currentMemory.location}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Số trang */}
              <div className="text-xs font-serif-romantic tracking-widest opacity-60">
                Trang {currentPage + 1} / {memories.length}
              </div>
            </div>

            {/* Layout nội dung: Ảnh kỷ niệm & Dòng nhật ký lớn */}
            <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-10">
              {/* Ảnh kỷ niệm phong cách polaroid phóng khoáng */}
              <div className="w-full md:w-1/2 aspect-4/3 rounded-2xl overflow-hidden bg-black/5 shadow-md shrink-0">
                <img
                  src={currentMemory.imageUrl}
                  alt={currentMemory.caption}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
              </div>

              {/* Dòng nhật ký cảm xúc */}
              <div className="w-full md:w-1/2 flex flex-col justify-between py-2">
                <div>
                  <span className="font-serif-romantic text-xs uppercase tracking-widest opacity-50 block mb-2">
                    Khoảnh khắc dịu dàng
                  </span>
                  <p className={`${fontClass || 'font-handwriting'} ${fontStyles} leading-relaxed`}>
                    "{currentMemory.caption}"
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-current/10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs opacity-75">
                    <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598]" />
                    <span>{currentMemory.likes || 1} yêu thích</span>
                  </div>

                  <span className="font-serif-romantic text-xs italic opacity-50">
                    ♥ {coupleInfo.personOne} & {coupleInfo.personTwo}
                  </span>
                </div>
              </div>
            </div>
          </article>

          {/* Navigation Controls Dưới Đáy */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setCurrentPage((prev) => (prev > 0 ? prev - 1 : memories.length - 1))}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-current/15 hover:bg-black/5 text-xs font-medium transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Trang trước</span>
            </button>

            {/* Page Dots Indicator */}
            <div className="flex items-center gap-1.5 max-w-[200px] overflow-x-auto py-1 px-2">
              {memories.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentPage ? 'w-6 bg-[#D98A76]' : 'w-2 bg-current/20 hover:bg-current/40'
                  }`}
                  title={`Trang ${idx + 1}`}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => (prev < memories.length - 1 ? prev + 1 : 0))}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-current/15 hover:bg-black/5 text-xs font-medium transition-all"
            >
              <span>Trang sau</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] opacity-40 text-center mt-3">
            Mẹo: Dùng phím mũi tên [← / →] hoặc phím Cách để lật trang
          </p>
        </main>
      ) : (
        /* 3. CHẾ ĐỘ 2: DÒNG CHẢY KỶ NIỆM (CONTINUOUS SCROLL MODE) */
        <main className="max-w-3xl mx-auto px-4 py-10 space-y-12">
          {memories.map((mem, index) => (
            <article
              key={mem.id}
              className={`rounded-3xl p-6 sm:p-10 border transition-all ${themeStyles.card}`}
            >
              <div className="flex items-center justify-between text-xs mb-4 pb-3 border-b border-current/10 opacity-70">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-[#D98A76]" />
                  {new Date(mem.date).toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
                {mem.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#D98A76]" />
                    {mem.location}
                  </span>
                )}
              </div>

              {/* Large Image */}
              <div className="aspect-16/10 rounded-2xl overflow-hidden mb-6 shadow-md bg-black/5">
                <img
                  src={mem.imageUrl}
                  alt={mem.caption}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Heartfelt Note */}
              <p className={`${fontClass || 'font-handwriting'} ${fontStyles} text-center px-2 py-3`}>
                "{mem.caption}"
              </p>

              <div className="mt-4 pt-4 border-t border-current/10 flex items-center justify-between text-xs opacity-60">
                <span>Khoảnh khắc #{index + 1}</span>
                <span>♥ {coupleInfo.personOne} & {coupleInfo.personTwo}</span>
              </div>
            </article>
          ))}

          {/* End of Diary Quote */}
          <div className="text-center py-10 opacity-60 font-serif-romantic space-y-1">
            <Heart className="w-5 h-5 mx-auto text-[#E8A598] fill-[#E8A598] mb-2 animate-pulse" />
            <p className="text-sm">"Hành trình của chúng mình vẫn đang tiếp tục viết tiếp..."</p>
            <p className="text-xs">Góc Nhỏ Bình Yên</p>
          </div>
        </main>
      )}
    </div>
  );
};
