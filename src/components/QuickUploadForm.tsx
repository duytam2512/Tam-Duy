import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Heart,
  Sparkles,
  X,
  Check,
  Tag,
  Wand2,
  RefreshCw,
  Library,
  ChevronRight,
  ChevronLeft,
  Flame,
  Dices,
  Smile,
  Plus,
  Trash2,
  Layers,
  FileCheck,
  Type
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory, POPULAR_TAGS, SAMPLE_PHOTO_LIBRARY, CoupleInfo, CaptionFont, FONT_OPTIONS } from '../types';
import { compressImageFile } from '../services/storage';
import { generateSmartCaptions, extractContextualEmojis, CaptionTone, CaptionSuggestion } from '../utils/aiCaptionEngine';

interface QuickUploadFormProps {
  onAddMemory: (
    memory:
      | Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>
      | Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>[]
  ) => Promise<void> | void;
  isOpen: boolean;
  onClose: () => void;
  coupleInfo: CoupleInfo;
  currentFont?: CaptionFont;
  fontClass?: string;
  onOpenFontModal?: () => void;
  onSaveFont?: (font: CaptionFont) => void;
}

export const QuickUploadForm: React.FC<QuickUploadFormProps> = ({
  onAddMemory,
  isOpen,
  onClose,
  coupleInfo,
  currentFont = 'caveat',
  fontClass = 'font-handwriting',
  onOpenFontModal,
  onSaveFont
}) => {
  // Danh sách ảnh đã chọn (hỗ trợ chọn nhiều ảnh)
  const [images, setImages] = useState<string[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [uploadMode, setUploadMode] = useState<'album' | 'individual'>('album');

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Kỷ niệm');
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Trạng thái Kho ảnh mẫu mở rộng
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [activeSampleCategory, setActiveSampleCategory] = useState<string>(
    SAMPLE_PHOTO_LIBRARY[0].category
  );

  // Trạng thái Gemini AI Viết Caption
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTone, setAiTone] = useState<CaptionTone>('romantic');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<CaptionSuggestion[]>([]);
  const [suggestedEmojis, setSuggestedEmojis] = useState<string[]>([
    '💖', '✨', '🤍', '🌸', '📸', '🥰', '☕', '🍃'
  ]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Đảm bảo activeImageIndex luôn hợp lệ
  useEffect(() => {
    if (activeImageIndex >= images.length && images.length > 0) {
      setActiveImageIndex(images.length - 1);
    }
  }, [images.length, activeImageIndex]);

  const activeImage = images[activeImageIndex] || images[0] || '';

  // Xử lý khi người dùng chọn nhiều file ảnh từ máy / điện thoại (đặc biệt tối ưu hóa iPhone)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setValidationError(null);
    setIsCompressing(true);

    try {
      const compressedList = await Promise.all(
        files.map((file) => compressImageFile(file, 960, 0.75))
      );
      setImages((prev) => {
        const next = [...prev, ...compressedList];
        if (prev.length === 0) setActiveImageIndex(0);
        return next;
      });
    } catch (err: any) {
      console.warn('Lỗi nén ảnh:', err);
      setValidationError(err?.message || 'Không thể xử lý một số ảnh từ thiết bị. Bạn vui lòng thử lại nhé!');
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setValidationError(null);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)
    );
    if (files.length === 0) return;

    setIsCompressing(true);
    try {
      const compressedList = await Promise.all(
        files.map((file) => compressImageFile(file, 960, 0.75))
      );
      setImages((prev) => {
        const next = [...prev, ...compressedList];
        if (prev.length === 0) setActiveImageIndex(0);
        return next;
      });
    } catch (err: any) {
      console.warn('Lỗi khi nén ảnh kéo thả:', err);
      setValidationError(err?.message || 'Không thể xử lý ảnh kéo thả.');
    } finally {
      setIsCompressing(false);
    }
  };

  // Chọn ảnh từ Kho ảnh mẫu (cho phép chọn thêm nhiều ảnh)
  const handleSelectSample = (url: string, suggestedLocation: string) => {
    setValidationError(null);
    setImages((prev) => {
      if (prev.includes(url)) {
        // Nếu đã có thì bỏ chọn
        return prev.filter((item) => item !== url);
      }
      return [...prev, url];
    });

    if (!location) {
      setLocation(suggestedLocation);
    }
    const matchingEmojis = extractContextualEmojis({
      personOne: coupleInfo.personOne || 'Anh',
      personTwo: coupleInfo.personTwo || 'Em',
      location: suggestedLocation,
      tone: aiTone
    });
    setSuggestedEmojis(matchingEmojis);
  };

  // Xóa một ảnh khỏi danh sách đã chọn
  const handleRemoveImage = (indexToRemove: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Xóa toàn bộ ảnh đã chọn
  const handleClearAllImages = () => {
    setImages([]);
    setActiveImageIndex(0);
  };

  // Gọi Gemini AI & Smart Caption Engine để viết Caption phong phú, không lặp lại
  const handleGenerateAiCaption = async () => {
    setIsAiGenerating(true);

    const smartResult = generateSmartCaptions({
      personOne: coupleInfo.personOne || 'Anh',
      personTwo: coupleInfo.personTwo || 'Em',
      location: location.trim(),
      tone: aiTone,
      keywords: aiKeywords.trim()
    });

    if (smartResult.suggestedEmojis?.length > 0) {
      setSuggestedEmojis(smartResult.suggestedEmojis);
    }

    try {
      const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          tone: aiTone,
          coupleNames: {
            personOne: coupleInfo.personOne || 'Anh',
            personTwo: coupleInfo.personTwo || 'Em'
          },
          keywords: aiKeywords.trim(),
          imageBase64: activeImage.startsWith('data:image') ? activeImage : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const defaultBadges = ['Thơ tình', 'Story ngắn', 'Sâu lắng', 'Ngọt ngào', 'Gắn với ảnh'];
          const mapped: CaptionSuggestion[] = data.suggestions.map((item: any, idx: number) => {
            if (typeof item === 'string') {
              return {
                text: item,
                badge: defaultBadges[idx % defaultBadges.length],
                emojis: '✨'
              };
            }
            return {
              text: item.text || String(item),
              badge: item.badge || 'Gợi ý hay',
              emojis: item.emojis || '✨'
            };
          });

          setAiSuggestions(mapped);

          if (Array.isArray(data.suggestedEmojis) && data.suggestedEmojis.length > 0) {
            setSuggestedEmojis(data.suggestedEmojis);
          }
          return;
        }
      }

      setAiSuggestions(smartResult.suggestions);
    } catch (error) {
      console.warn('Lỗi gọi /api/generate-caption, chuyển sang kho gợi ý thông minh:', error);
      setAiSuggestions(smartResult.suggestions);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAiSuggestion = (suggestionText: string) => {
    setCaption(suggestionText);
  };

  const handleAddEmojiToCaption = (emoji: string) => {
    setCaption((prev) => (prev ? `${prev} ${emoji}` : emoji));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (images.length === 0) {
      setValidationError('Vui lòng chọn hoặc tải lên ít nhất một tấm ảnh kỷ niệm nhé!');
      return;
    }
    if (!caption.trim()) {
      setValidationError('Hãy viết vài dòng cảm xúc hoặc bấm dùng Gemini AI để viết gợi ý nhé!');
      return;
    }

    setIsSubmitting(true);

    try {
      const memoryLocation = location.trim() || 'Một nơi bình yên';
      const memoryTag = selectedTag || 'Kỷ niệm';
      const memoryDate = date || new Date().toISOString().split('T')[0];

      if (uploadMode === 'album' || images.length === 1) {
        // 1 bài viết album có nhiều ảnh
        await onAddMemory({
          imageUrl: images[0],
          images: images,
          date: memoryDate,
          location: memoryLocation,
          caption: caption.trim(),
          tag: memoryTag
        });
      } else {
        // Đăng thành nhiều bài viết riêng biệt (mỗi ảnh 1 bài)
        const list = images.map((imgUrl, i) => ({
          imageUrl: imgUrl,
          images: [imgUrl],
          date: memoryDate,
          location: memoryLocation,
          caption: images.length > 1 ? `${caption.trim()} (Ảnh #${i + 1})` : caption.trim(),
          tag: memoryTag
        }));
        await onAddMemory(list);
      }

      confetti({
        particleCount: 60,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#E8A598', '#F9DCC4', '#D98A76']
      });

      // Reset form
      setImages([]);
      setCaption('');
      setLocation('');
      setAiSuggestions([]);
      setShowAiPanel(false);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi đăng kỷ niệm:', err);
      setValidationError(
        err?.message ||
          'Không thể lưu kỷ niệm lên Cloud Firestore. Bạn vui lòng kiểm tra kết nối mạng và thử lại nhé!'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 relative card-warm-pastel">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thêm Khoảnh Khắc Mới</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Đăng Kỷ Niệm Của Hai Đứa
          </h2>
          <p className="text-xs text-[#8C6D58] mt-0.5">
            Chọn một hoặc nhiều ảnh cùng lúc, kết nối Gemini AI để viết những dòng cảm xúc ngọt ngào
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-medium animate-fadeIn">
              ⚠️ {validationError}
            </div>
          )}

          {/* Ô Chọn / Tải nhiều ảnh lên với Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#8C6D58] flex items-center gap-1.5">
                <span>Hình ảnh kỷ niệm</span>
                {images.length > 0 && (
                  <span className="bg-[#E8A598]/20 text-[#D98A76] px-2 py-0.5 rounded-full text-[11px] font-bold">
                    {images.length} ảnh đã chọn
                  </span>
                )}
                <span className="text-[#D98A76]">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowPhotoLibrary(!showPhotoLibrary)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] bg-[#F9F6F0] hover:bg-[#E8A598]/20 px-2.5 py-1 rounded-full transition-all cursor-pointer"
              >
                <Library className="w-3.5 h-3.5" />
                <span>{showPhotoLibrary ? 'Đóng kho ảnh mẫu' : 'Mở kho ảnh mẫu (+20 ảnh)'}</span>
              </button>
            </div>

            {/* Kho Ảnh Mẫu Mở Rộng */}
            {showPhotoLibrary && (
              <div className="bg-[#FAF6F0] rounded-2xl p-3 border border-[#8C6D58]/20 mb-3 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8C6D58]">
                    Bấm vào từng ảnh để chọn / bỏ chọn nhiều ảnh mẫu:
                  </span>
                  <span className="text-[11px] text-[#D98A76] font-medium">
                    Đã chọn {images.length} ảnh
                  </span>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {SAMPLE_PHOTO_LIBRARY.map((cat) => (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setActiveSampleCategory(cat.category)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium cursor-pointer ${
                        activeSampleCategory === cat.category
                          ? 'bg-[#E8A598] text-white shadow-xs'
                          : 'bg-white text-[#8C6D58] hover:text-[#3D2E28]'
                      }`}
                    >
                      {cat.category}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto">
                  {SAMPLE_PHOTO_LIBRARY.find((c) => c.category === activeSampleCategory)?.items.map(
                    (item) => {
                      const isSelected = images.includes(item.url);
                      return (
                        <div
                          key={item.title}
                          onClick={() => handleSelectSample(item.url, item.suggestedLocation)}
                          className={`group relative rounded-xl overflow-hidden cursor-pointer aspect-4/3 border-2 transition-all shadow-xs ${
                            isSelected
                              ? 'border-[#D98A76] ring-2 ring-[#E8A598]/50'
                              : 'border-transparent hover:border-[#D98A76]/50'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#D98A76] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-[10px] text-white font-medium truncate">
                              {item.title}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Vùng xem trước ảnh đã chọn */}
            {images.length > 0 ? (
              <div className="space-y-3">
                {/* Ảnh chính xem trước to rõ */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#E8A598]/40 shadow-xs max-h-60 group bg-[#F9F6F0]">
                  <img
                    src={activeImage}
                    alt="Ảnh kỷ niệm xem trước"
                    className="w-full h-52 sm:h-60 object-cover"
                  />

                  {/* Nút lướt ảnh kế / trước nếu có nhiều ảnh */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                        }
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full transition-all cursor-pointer"
                        title="Ảnh trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full transition-all cursor-pointer"
                        title="Ảnh tiếp theo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Badges trên ảnh */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white text-[11px] font-semibold rounded-lg backdrop-blur-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-[#E8A598]" />
                    <span>
                      Ảnh {activeImageIndex + 1} / {images.length}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(activeImageIndex)}
                      className="p-1.5 bg-rose-600/80 hover:bg-rose-700 text-white rounded-full transition-all shadow-md cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/55 text-white text-[11px] rounded-lg backdrop-blur-xs flex items-center gap-1">
                    <Check className="w-3 h-3 text-[#E8A598]" />
                    <span>Đã tối ưu cho cả web & điện thoại</span>
                  </div>
                </div>

                {/* Danh sách dải thumbnail các ảnh đã chọn */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all group ${
                        activeImageIndex === idx
                          ? 'border-[#D98A76] ring-2 ring-[#E8A598]'
                          : 'border-[#8C6D58]/20 hover:border-[#E8A598]'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] px-1 rounded-br font-semibold">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveImage(idx, e)}
                        className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors opacity-80 group-hover:opacity-100"
                        title="Xóa ảnh này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Nút thêm ảnh vào danh sách */}
                  <label
                    htmlFor="memory-upload-input-field"
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border-2 border-dashed border-[#D98A76]/50 hover:border-[#D98A76] bg-[#E8A598]/10 hover:bg-[#E8A598]/20 flex flex-col items-center justify-center text-[#D98A76] transition-all shrink-0 cursor-pointer"
                    title="Chọn thêm ảnh từ máy"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-semibold mt-0.5">Thêm ảnh</span>
                  </label>

                  {/* Nút xóa tất cả */}
                  <button
                    type="button"
                    onClick={handleClearAllImages}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline px-2 shrink-0 cursor-pointer font-medium"
                  >
                    Xóa tất cả
                  </button>
                </div>

                {/* Tùy chọn cách đăng khi chọn từ 2 ảnh trở lên */}
                {images.length > 1 && (
                  <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#8C6D58]/15 space-y-2 animate-fadeIn">
                    <span className="text-xs font-semibold text-[#8C6D58] block">
                      Tùy chọn hiển thị ({images.length} ảnh):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          uploadMode === 'album'
                            ? 'bg-white border-[#D98A76] shadow-xs'
                            : 'border-[#8C6D58]/15 hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uploadMode"
                          checked={uploadMode === 'album'}
                          onChange={() => setUploadMode('album')}
                          className="mt-0.5 text-[#D98A76] focus:ring-[#E8A598]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#3D2E28] flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-[#D98A76]" />
                            <span>1 bài viết Album ({images.length} ảnh)</span>
                          </div>
                          <p className="text-[11px] text-[#8C6D58] mt-0.5">
                            Gộp chung một bài viết kỷ niệm, có thể lướt xem toàn bộ {images.length} ảnh
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          uploadMode === 'individual'
                            ? 'bg-white border-[#D98A76] shadow-xs'
                            : 'border-[#8C6D58]/15 hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uploadMode"
                          checked={uploadMode === 'individual'}
                          onChange={() => setUploadMode('individual')}
                          className="mt-0.5 text-[#D98A76] focus:ring-[#E8A598]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#3D2E28] flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5 text-[#D98A76]" />
                            <span>{images.length} bài viết riêng biệt</span>
                          </div>
                          <p className="text-[11px] text-[#8C6D58] mt-0.5">
                            Đăng từng ảnh thành 1 bài viết riêng biệt trên bảng tin
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label
                htmlFor="memory-upload-input-field"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all block ${
                  isDragging
                    ? 'border-[#D98A76] bg-[#E8A598]/15 scale-[0.99]'
                    : 'border-[#8C6D58]/25 hover:border-[#E8A598] bg-white hover:bg-[#FAF6F0]'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#E8A598]/15 flex items-center justify-center text-[#D98A76]">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#3D2E28]">
                  Chạm để chọn ảnh từ iPhone / Android / Máy tính (hỗ trợ chọn nhiều ảnh)
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  💡 Bạn có thể chọn <span className="text-[#D98A76] font-semibold">nhiều ảnh cùng lúc</span> từ thư viện hoặc chụp ảnh mới
                </p>
                {isCompressing && (
                  <div className="mt-2 text-xs text-[#D98A76] font-medium flex items-center justify-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý và tối ưu dung lượng ảnh...</span>
                  </div>
                )}
              </label>
            )}

            {/* Input file hỗ trợ đầy đủ các định dạng di động (HEIC, HEIF, JPG, PNG) */}
            <input
              id="memory-upload-input-field"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              className="sr-only"
            />
          </div>

          {/* Ô nhập ngày kỷ niệm & Thể loại */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                Ngày kỷ niệm
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                Chủ đề / Thể loại
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden appearance-none"
                >
                  {POPULAR_TAGS.filter((t) => t !== 'Tất cả').map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ô nhập địa điểm */}
          <div>
            <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
              Địa điểm kỷ niệm
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Bờ Hồ Tây, Tiệm Cà Phê Mộc Đà Lạt, Góc Bếp Nhỏ..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
              />
            </div>
          </div>

          {/* Ô viết caption / Nhật ký cảm xúc kèm Trợ lý Gemini AI */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#8C6D58]">
                  Dòng nhật ký / Cảm xúc <span className="text-[#D98A76]">*</span>
                </label>
                {onOpenFontModal && (
                  <button
                    type="button"
                    onClick={onOpenFontModal}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C6D58] hover:text-[#3D2E28] bg-amber-100/70 hover:bg-amber-200/80 px-2.5 py-0.5 rounded-full transition-all cursor-pointer border border-amber-200/60 shadow-2xs"
                    title="Đổi kiểu chữ viết tay hoặc thanh lịch cho dòng cảm xúc này"
                  >
                    <Type className="w-3 h-3 text-[#D98A76]" />
                    <span>Font: {FONT_OPTIONS.find((f) => f.id === currentFont)?.name || 'Viết tay'}</span>
                  </button>
                )}
              </div>

              {/* Nút mở bảng trợ lý Gemini AI */}
              <button
                type="button"
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] bg-[#E8A598]/15 hover:bg-[#E8A598]/25 px-3 py-1 rounded-full transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showAiPanel ? 'Đóng gợi ý AI' : 'Gemini AI Viết Caption'}</span>
              </button>
            </div>

            {/* BẢNG TRỢ LÝ GEMINI AI & SMART CAPTION */}
            {showAiPanel && (
              <div className="bg-[#FAF7F2] border border-[#E8A598]/30 rounded-2xl p-3.5 sm:p-4 mb-3 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3D2E28]">
                    <Wand2 className="w-4 h-4 text-[#D98A76]" />
                    <span>Gemini AI Viết Caption Tình Yêu (Đa dạng, không lặp)</span>
                  </div>
                  <span className="text-[10px] text-[#8C6D58] bg-white px-2 py-0.5 rounded-full border border-[#8C6D58]/10 font-semibold">
                    {images.length > 0 ? `Nhìn ảnh #${activeImageIndex + 1}` : 'Tùy chỉnh'}
                  </span>
                </div>

                {/* Chọn sắc thái cảm xúc */}
                <div>
                  <span className="text-[11px] font-semibold text-[#8C6D58] block mb-1">
                    Chọn phong cách viết:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[11px]">
                    {[
                      { id: 'romantic', label: 'Lãng mạn', icon: '💖' },
                      { id: 'cute', label: 'Đáng yêu', icon: '🥰' },
                      { id: 'peaceful', label: 'Bình yên', icon: '🍃' },
                      { id: 'poem', label: 'Thơ tình', icon: '📜' },
                      { id: 'short', label: 'Story ngắn', icon: '✨' },
                      { id: 'funny', label: 'Hài hước', icon: '😆' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAiTone(item.id as CaptionTone)}
                        className={`px-2 py-1.5 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                          aiTone === item.id
                            ? 'bg-[#E8A598] text-white border-[#E8A598] font-semibold shadow-xs'
                            : 'bg-white text-[#8C6D58] border-[#8C6D58]/15 hover:border-[#E8A598]'
                        }`}
                      >
                        <span className="block text-xs">{item.icon}</span>
                        <span className="truncate block mt-0.5">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Từ khóa hoặc chi tiết kỷ niệm */}
                <div>
                  <input
                    type="text"
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    placeholder="Gợi ý chi tiết thêm (ly cafe, nắm tay, trời mưa, hoàng hôn...)..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                </div>

                {/* Nút bấm sáng tác */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={handleGenerateAiCaption}
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-[#E8A598] to-[#D98A76] hover:from-[#D98A76] hover:to-[#C87D55] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang sáng tác 5 câu mới...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sáng tác 5 gợi ý cảm xúc</span>
                      </>
                    )}
                  </button>

                  {aiSuggestions.length > 0 && (
                    <button
                      type="button"
                      disabled={isAiGenerating}
                      onClick={handleGenerateAiCaption}
                      className="px-3 py-2 bg-white hover:bg-[#F9F6F0] border border-[#8C6D58]/20 text-[#8C6D58] hover:text-[#3D2E28] rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Đổi sang 5 câu khác"
                    >
                      <Dices className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Đổi câu khác</span>
                    </button>
                  )}
                </div>

                {/* Danh sách 5 gợi ý AI */}
                {aiSuggestions.length > 0 && (
                  <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                    <span className="text-[11px] font-semibold text-[#8C6D58] block">
                      Bấm vào câu bạn thích để áp dụng vào bài viết:
                    </span>
                    {aiSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleApplyAiSuggestion(item.text)}
                        className="p-2.5 rounded-xl bg-white border border-[#8C6D58]/15 hover:border-[#D98A76] hover:bg-[#FFFDF9] cursor-pointer transition-all shadow-xs group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#D98A76] bg-[#E8A598]/15 px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                          <span className="text-xs opacity-75">{item.emojis}</span>
                        </div>
                        <p className={`${fontClass || 'font-handwriting'} text-base sm:text-lg text-[#3D2E28] leading-snug group-hover:text-[#D98A76] transition-colors`}>
                          "{item.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Khay Emoji gợi ý */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-1 text-sm no-scrollbar">
              <span className="text-[11px] font-semibold text-[#8C6D58] flex items-center gap-1 shrink-0">
                <Smile className="w-3 h-3 text-[#E8A598]" />
                Emoji:
              </span>
              {suggestedEmojis.map((em, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddEmojiToCaption(em)}
                  className="px-2 py-0.5 rounded-lg bg-white border border-[#8C6D58]/15 hover:bg-[#FAF6F0] hover:scale-110 transition-all text-xs cursor-pointer shrink-0"
                  title="Thêm emoji này vào caption"
                >
                  {em}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Viết vài dòng ngọt ngào về khoảnh khắc này... (hoặc bấm nút Gemini AI ở trên để gợi ý tự động)"
              className={`w-full p-3 rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden ${fontClass || 'font-handwriting'} text-xl sm:text-2xl text-[#3D2E28] transition-all`}
            />
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8C6D58]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-6 py-2.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu kỷ niệm...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {images.length > 1
                      ? uploadMode === 'album'
                        ? `Lưu Album (${images.length} ảnh)`
                        : `Lưu ${images.length} kỷ niệm`
                      : 'Lưu Khoảnh Khắc Ngọt Ngào'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
