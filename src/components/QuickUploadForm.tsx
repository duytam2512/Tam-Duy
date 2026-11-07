import React, { useState, useRef } from 'react';
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
  Flame,
  Dices
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory, POPULAR_TAGS, SAMPLE_PHOTO_LIBRARY, CoupleInfo } from '../types';
import { compressImageFile } from '../services/storage';
import { generateSmartCaptions, CaptionTone, CaptionSuggestion } from '../utils/aiCaptionEngine';

interface QuickUploadFormProps {
  onAddMemory: (memory: Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>) => void;
  isOpen: boolean;
  onClose: () => void;
  coupleInfo: CoupleInfo;
}

export const QuickUploadForm: React.FC<QuickUploadFormProps> = ({
  onAddMemory,
  isOpen,
  onClose,
  coupleInfo
}) => {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Kỷ niệm');
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
  const [showAiPanel, setShowAiPanel] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, 1280, 0.85);
      setImagePreview(compressed);
    } catch (err) {
      console.error('Lỗi nén ảnh:', err);
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
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const compressed = await compressImageFile(file, 1280, 0.85);
        setImagePreview(compressed);
      } catch (err) {
        console.error('Lỗi khi nén ảnh kéo thả:', err);
      }
    }
  };

  // Chọn ảnh từ Kho ảnh mẫu
  const handleSelectSample = (url: string, suggestedLocation: string) => {
    setImagePreview(url);
    if (!location) {
      setLocation(suggestedLocation);
    }
    setShowPhotoLibrary(false);
  };

  // Gọi Gemini AI & Smart Caption Engine để viết Caption phong phú, không lặp lại
  const handleGenerateAiCaption = async () => {
    setIsAiGenerating(true);

    const fallbackSuggestions = generateSmartCaptions({
      personOne: coupleInfo.personOne || 'Anh',
      personTwo: coupleInfo.personTwo || 'Em',
      location: location.trim(),
      tone: aiTone,
      keywords: aiKeywords.trim()
    });

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
          imageBase64: imagePreview.startsWith('data:image') ? imagePreview : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const badges = ['Gợi ý hay', 'Thơ tình', 'Sâu lắng', 'Ngọt ngào', 'Story ngắn'];
          const mapped: CaptionSuggestion[] = data.suggestions.map((text: string, idx: number) => ({
            text,
            badge: badges[idx % badges.length]
          }));
          setAiSuggestions(mapped);
          return;
        }
      }

      // Nếu API không phản hồi hoặc trên static Vercel, dùng bộ gợi ý đa dạng không lặp
      setAiSuggestions(fallbackSuggestions);
    } catch (error) {
      console.warn('Lỗi gọi /api/generate-caption, chuyển sang kho gợi ý thông minh:', error);
      setAiSuggestions(fallbackSuggestions);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAiSuggestion = (suggestionText: string) => {
    setCaption(suggestionText);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      alert('Vui lòng chọn hoặc tải lên một tấm ảnh kỷ niệm nhé!');
      return;
    }
    if (!caption.trim()) {
      alert('Hãy viết vài dòng cảm xúc hoặc bấm dùng Gemini AI để viết gợi ý nhé!');
      return;
    }

    setIsSubmitting(true);

    onAddMemory({
      imageUrl: imagePreview,
      date: date || new Date().toISOString().split('T')[0],
      location: location.trim() || 'Một nơi bình yên',
      caption: caption.trim(),
      tag: selectedTag || 'Kỷ niệm'
    });

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E8A598', '#F9DCC4', '#D98A76']
    });

    // Reset form
    setImagePreview('');
    setLocation('');
    setCaption('');
    setAiSuggestions([]);
    setShowAiPanel(false);
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-7 max-w-2xl w-full border border-[#8C6D58]/20 shadow-2xl relative my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thêm Khoảnh Khắc Mới</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Đăng Kỷ Niệm Của Hai Đứa
          </h2>
          <p className="text-xs text-[#8C6D58] mt-0.5">
            Chọn ảnh từ máy hoặc kho ảnh mẫu ấm áp, kết nối Gemini AI để viết những dòng cảm xúc ngọt ngào
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ô Chọn / Tải ảnh lên với Live Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-[#8C6D58]">
                Hình ảnh kỷ niệm <span className="text-[#D98A76]">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowPhotoLibrary(!showPhotoLibrary)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] bg-[#F9F6F0] hover:bg-[#E8A598]/20 px-2.5 py-1 rounded-full transition-all"
              >
                <Library className="w-3.5 h-3.5" />
                <span>{showPhotoLibrary ? 'Đóng kho ảnh mẫu' : 'Mở kho ảnh mẫu (+20 ảnh)'}</span>
              </button>
            </div>

            {/* Kho Ảnh Mẫu Mở Rộng */}
            {showPhotoLibrary && (
              <div className="bg-[#FAF6F0] rounded-2xl p-3 border border-[#8C6D58]/20 mb-3 space-y-2">
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                  {SAMPLE_PHOTO_LIBRARY.map((cat) => (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setActiveSampleCategory(cat.category)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium ${
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
                    (item) => (
                      <div
                        key={item.title}
                        onClick={() => handleSelectSample(item.url, item.suggestedLocation)}
                        className="group relative rounded-xl overflow-hidden cursor-pointer aspect-4/3 border border-[#8C6D58]/15 hover:border-[#D98A76] shadow-xs"
                      >
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[10px] text-white font-medium truncate">
                            {item.title}
                          </span>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#E8A598]/40 shadow-xs max-h-60 group bg-[#F9F6F0]">
                <img
                  src={imagePreview}
                  alt="Ảnh kỷ niệm xem trước"
                  className="w-full h-52 sm:h-60 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview('')}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 text-white hover:bg-black/80 rounded-full transition-all shadow-md"
                  title="Đổi ảnh khác"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/55 text-white text-[11px] rounded-lg backdrop-blur-xs flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#E8A598]" />
                  <span>Ảnh đã tối ưu cho web</span>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#D98A76] bg-[#E8A598]/15 scale-[0.99]'
                    : 'border-[#8C6D58]/25 hover:border-[#E8A598] bg-white hover:bg-[#FAF6F0]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#E8A598]/15 flex items-center justify-center text-[#D98A76]">
                  <Camera className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#3D2E28]">
                  Bấm để chọn ảnh từ điện thoại / máy tính hoặc kéo thả vào đây
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-0.5">
                  Tự động tối ưu dung lượng WebP/JPEG hiển thị mượt mà trên mọi thiết bị
                </p>
              </div>
            )}
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
              <MapPin className="w-4 h-4 text-[#D98A76] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Tiệm cà phê nhỏ, Đà Lạt, chuyến đi biển..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
              />
            </div>
          </div>

          {/* KHUNG AI GEMINI VIẾT CAPTION & NHẬT KÝ */}
          <div className="bg-[#FAF6F0] rounded-2xl p-3.5 border border-[#8C6D58]/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D2E28]">
                <Wand2 className="w-4 h-4 text-[#D98A76] animate-pulse" />
                <span>AI Gemini Viết Caption Tình Yêu</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="text-[11px] font-semibold text-[#D98A76] hover:underline"
              >
                {showAiPanel ? 'Thu gọn' : 'Mở bảng tùy chọn AI'}
              </button>
            </div>

            {showAiPanel && (
              <div className="space-y-2.5 pt-1 border-t border-[#8C6D58]/10 text-xs">
                {/* Tone selection */}
                <div>
                  <span className="text-[11px] font-medium text-[#8C6D58] block mb-1">
                    Phong cách cảm xúc:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'romantic', label: '💖 Lãng mạn sâu lắng' },
                      { id: 'cute', label: '🌸 Dễ thương ngọt ngào' },
                      { id: 'peaceful', label: '🍃 Nhẹ nhàng bình yên' },
                      { id: 'poem', label: '📜 Thơ tình ngắn' },
                      { id: 'funny', label: '😄 Trêu đùa dí dỏm' },
                      { id: 'short', label: '⚡ Story ngắn 1 câu' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setAiTone(t.id as any)}
                        className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${
                          aiTone === t.id
                            ? 'bg-[#E8A598] text-white font-semibold shadow-xs'
                            : 'bg-white text-[#8C6D58] hover:text-[#3D2E28] border border-[#8C6D58]/15'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gợi ý chi tiết thêm */}
                <div>
                  <input
                    type="text"
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    placeholder="Gợi ý thêm cho AI (ví dụ: ngày mưa lạnh, em cười xinh, uống trà nóng...)"
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* Nút kích hoạt AI */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isAiGenerating}
                onClick={handleGenerateAiCaption}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#E8A598] to-[#D98A76] hover:opacity-95 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50"
              >
                {isAiGenerating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Gemini đang sáng tác...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Tạo gợi ý cảm xúc với Gemini AI</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-[#8C6D58]">
                {imagePreview ? '✨ AI sẽ nhìn ảnh để viết' : '✨ Dựa theo ngữ cảnh'}
              </span>
            </div>

            {/* Danh sách các câu caption được AI gợi ý */}
            {aiSuggestions.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#8C6D58]/15">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8C6D58]">
                    Gợi ý cảm xúc (Bấm vào câu bạn thích để điền vào nhật ký):
                  </span>
                  <button
                    type="button"
                    onClick={handleGenerateAiCaption}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[#D98A76] hover:text-[#3D2E28] bg-white px-2 py-0.5 rounded-lg border border-[#D98A76]/30 shadow-2xs hover:bg-[#FAF6F0] transition"
                  >
                    <Dices className="w-3.5 h-3.5" />
                    <span>Đổi 5 câu khác</span>
                  </button>
                </div>

                <div className="space-y-1.5">
                  {aiSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplyAiSuggestion(sug.text)}
                      className="p-3 rounded-xl bg-white hover:bg-[#FFFDF9] border border-[#8C6D58]/15 hover:border-[#E8A598] cursor-pointer transition-all flex flex-col gap-1.5 group shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#C87D55] border border-[#E8A598]/20">
                          {sug.badge}
                        </span>
                        <span className="text-[10px] font-semibold text-[#D98A76] group-hover:underline flex items-center gap-0.5">
                          Chọn câu này <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                      <p className="font-handwriting text-lg sm:text-xl text-[#3D2E28] leading-snug whitespace-pre-line">
                        "{sug.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Khung viết cảm xúc / nhật ký chính thức */}
          <div>
            <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
              Dòng nhật ký / Cảm xúc của chúng mình <span className="text-[#D98A76]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Viết cảm xúc của bạn hoặc bấm 'Tạo gợi ý với Gemini AI' ở trên nhé..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden resize-none font-sans"
            />
          </div>

          {/* Nút 'Lưu Kỷ Niệm' */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#8C6D58]/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#8C6D58] hover:bg-[#F9F6F0] rounded-xl transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 disabled:opacity-50"
            >
              <Heart className="w-4 h-4 fill-white" />
              <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Kỷ Niệm'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
