import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, MapPin, Calendar, Heart, Sparkles, X, Check, Upload, Tag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory, POPULAR_TAGS } from '../types';
import { compressImageFile } from '../services/storage';

interface QuickUploadFormProps {
  onAddMemory: (memory: Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>) => void;
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_ROMANTIC_PHOTOS = [
  {
    name: "Quán Cà Phê Ấm",
    url: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80"
  },
  {
    name: "Hoàng Hôn Êm Đềm",
    url: "https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1000&q=80"
  },
  {
    name: "Hoa & Bầu Trời",
    url: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=1000&q=80"
  },
  {
    name: "Bàn Trà Chiều",
    url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1000&q=80"
  }
];

const SUGGESTED_LOCATIONS = [
  "Đà Lạt thơ mộng",
  "Tiệm cà phê góc phố",
  "Bờ Hồ Tây lộng gió",
  "Góc ban công nhỏ",
  "Phố cổ Hội An",
  "Chuyến đi biển",
  "Căn bếp ấm cúng"
];

export const QuickUploadForm: React.FC<QuickUploadFormProps> = ({
  onAddMemory,
  isOpen,
  onClose
}) => {
  const [imagePreview, setImagePreview] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('Kỷ niệm');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImageFile(file);
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
        const compressed = await compressImageFile(file);
        setImagePreview(compressed);
      } catch (err) {
        console.error('Lỗi khi nén ảnh kéo thả:', err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePreview) {
      alert('Vui lòng chọn hoặc tải lên một tấm ảnh kỷ niệm nhé!');
      return;
    }
    if (!caption.trim()) {
      alert('Hãy viết vài dòng cảm xúc hoặc ghi chú kỷ niệm nhé!');
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
    setIsSubmitting(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-8 max-w-xl w-full border border-[#8C6D58]/20 shadow-2xl relative my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thêm Khoảnh Khắc Mới</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Đăng Kỷ Niệm Của Hai Đứa
          </h2>
          <p className="text-xs text-[#8C6D58] mt-1">
            Lưu giữ từng ánh nhìn, nụ cười và hành trình bình yên bên nhau
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ô Chọn / Tải ảnh lên với Live Preview */}
          <div>
            <label className="block text-xs font-semibold text-[#8C6D58] mb-1.5">
              Hình ảnh kỷ niệm <span className="text-[#D98A76]">*</span>
            </label>

            {imagePreview ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-[#E8A598]/40 shadow-xs max-h-64 group bg-[#F9F6F0]">
                <img
                  src={imagePreview}
                  alt="Ảnh kỷ niệm xem trước"
                  className="w-full h-56 sm:h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setImagePreview('')}
                  className="absolute top-3 right-3 p-1.5 bg-black/60 text-white hover:bg-black/80 rounded-full transition-all shadow-md"
                  title="Đổi ảnh khác"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 px-2.5 py-1 bg-black/50 text-white text-[11px] rounded-lg backdrop-blur-xs flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#E8A598]" />
                  <span>Đã chọn ảnh</span>
                </div>
              </div>
            ) : (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
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
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#E8A598]/15 flex items-center justify-center text-[#D98A76]">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-[#3D2E28]">
                  Bấm để chọn ảnh từ máy hoặc kéo thả vào đây
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  Hỗ trợ định dạng JPG, PNG, WEBP từ điện thoại và máy tính
                </p>
              </div>
            )}

            {/* Quick sample photos */}
            {!imagePreview && (
              <div className="mt-2.5">
                <span className="text-[11px] text-[#8C6D58] block mb-1">Hoặc chọn nhanh ảnh mẫu:</span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_ROMANTIC_PHOTOS.map((sample) => (
                    <button
                      key={sample.name}
                      type="button"
                      onClick={() => setImagePreview(sample.url)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-[#F9F6F0] hover:bg-[#E8A598]/20 text-[#8C6D58] border border-[#8C6D58]/15 transition-all"
                    >
                      {sample.name}
                    </button>
                  ))}
                </div>
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
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
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
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden appearance-none"
                >
                  {POPULAR_TAGS.filter(t => t !== "Tất cả").map((t) => (
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
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
              />
            </div>
            {/* Quick location chips */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {SUGGESTED_LOCATIONS.slice(0, 4).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(loc)}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#F9F6F0] hover:bg-[#E8A598]/20 text-[#8C6D58] transition-all"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Khung viết cảm xúc / nhật ký */}
          <div>
            <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
              Dòng nhật ký / Cảm xúc của chúng mình <span className="text-[#D98A76]">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Hôm ấy trời thật đẹp, và em cười thật xinh..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden resize-none font-sans"
            />
          </div>

          {/* Nút 'Lưu Kỷ Niệm' hiệu ứng mượt mà */}
          <div className="flex items-center justify-end gap-3 pt-2">
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
