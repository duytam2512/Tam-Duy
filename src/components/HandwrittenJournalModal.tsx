import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Book,
  ChevronLeft,
  ChevronRight,
  Plus,
  Edit3,
  Trash2,
  Bookmark,
  Calendar,
  Sparkles,
  Heart,
  Volume2,
  VolumeX,
  Search,
  Check,
  Tag,
  Wand2,
  Paperclip,
  Smile,
  Sun,
  CloudRain,
  Moon,
  Wind,
  Coffee,
  RotateCcw,
  BookOpen,
  Type
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { DiaryEntry, CoupleInfo, INITIAL_DIARY_ENTRIES, CaptionFont, FONT_OPTIONS } from '../types';
import { compressImageFile } from '../services/storage';

interface HandwrittenJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleInfo: CoupleInfo;
  entries: DiaryEntry[];
  onSaveEntries: (entries: DiaryEntry[]) => void;
  fontClass?: string;
  currentFont?: CaptionFont;
  onSaveFont?: (font: CaptionFont) => void;
  onOpenFontModal?: () => void;
}

// Danh sách biểu tượng thời tiết & tâm trạng
const WEATHERS = [
  { label: '☀️ Nắng ấm', icon: '☀️' },
  { label: '🌧️ Mưa rào', icon: '🌧️' },
  { label: '⛅ Mây nhẹ', icon: '⛅' },
  { label: '🌙 Đêm trăng', icon: '🌙' },
  { label: '🍃 Gió thu', icon: '🍃' }
];

const MOODS = [
  { label: '🥰 Hạnh phúc', icon: '🥰' },
  { label: '☕ Bình yên', icon: '☕' },
  { label: '💌 Nhớ nhung', icon: '💌' },
  { label: '🍓 Ngọt ngào', icon: '🍓' },
  { label: '🥺 Xúc động', icon: '🥺' },
  { label: '✨ Say đắm', icon: '✨' }
];

const STICKERS = ['🌸', '💌', '☕', '✨', '🍃', '💖', '💍', '🧸', '🍰', '📸'];

export const HandwrittenJournalModal: React.FC<HandwrittenJournalModalProps> = ({
  isOpen,
  onClose,
  coupleInfo,
  entries = INITIAL_DIARY_ENTRIES,
  onSaveEntries,
  fontClass = 'font-handwriting',
  currentFont = 'caveat',
  onSaveFont,
  onOpenFontModal
}) => {
  const currentFontOption = FONT_OPTIONS.find((f) => f.id === currentFont) || FONT_OPTIONS[0];

  // Trang hiện tại (0 là Bìa/Mục lục, 1..N là các bài viết)
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Trạng thái viết / sửa bài
  const [isWriting, setIsWriting] = useState<boolean>(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  // Form viết nhật ký
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAuthor, setFormAuthor] = useState(coupleInfo.personOne || 'Đức Duy');
  const [formMood, setFormMood] = useState('🥰 Hạnh phúc');
  const [formWeather, setFormWeather] = useState('☀️ Nắng ấm');
  const [formTag, setFormTag] = useState('Nhật ký');
  const [formSticker, setFormSticker] = useState('💌');
  const [formImage, setFormImage] = useState<string>('');
  const [isCompressingImg, setIsCompressingImg] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Trạng thái trợ lý Gemini AI viết thư
  const [showAiHelper, setShowAiHelper] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  // Xóa bài viết
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Lọc danh sách bài viết
  const filteredEntries = entries.filter((item) => {
    if (authorFilter !== 'all' && item.author !== authorFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchContent = item.content.toLowerCase().includes(q);
      const matchDate = item.date.includes(q);
      if (!matchTitle && !matchContent && !matchDate) return false;
    }
    return true;
  });

  // Tạo âm thanh lật trang nhẹ nhàng bằng Web Audio API
  const playPageTurnSound = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Tạo tiếng sột soạt nhẹ như trang giấy mỏng
      const bufferSize = ctx.sampleRate * 0.18; // 180ms
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Bỏ qua nếu trình duyệt không hỗ trợ Web Audio
    }
  };

  // Điều hướng phím mũi tên
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWriting) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentPage, filteredEntries.length, isWriting]);

  const handleNextPage = () => {
    if (currentPage < filteredEntries.length) {
      setFlipDirection('next');
      setIsFlipping(true);
      playPageTurnSound();
      setTimeout(() => {
        setCurrentPage((prev) => prev + 1);
        setIsFlipping(false);
      }, 250);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setFlipDirection('prev');
      setIsFlipping(true);
      playPageTurnSound();
      setTimeout(() => {
        setCurrentPage((prev) => prev - 1);
        setIsFlipping(false);
      }, 250);
    }
  };

  const handleJumpToPage = (index: number) => {
    setFlipDirection(index > currentPage ? 'next' : 'prev');
    setIsFlipping(true);
    playPageTurnSound();
    setTimeout(() => {
      setCurrentPage(index);
      setIsFlipping(false);
    }, 250);
  };

  // Mở form viết bài mới
  const handleOpenWriteNew = () => {
    setEditingEntryId(null);
    setFormTitle('');
    setFormContent('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormAuthor(coupleInfo.personOne || 'Đức Duy');
    setFormMood('🥰 Hạnh phúc');
    setFormWeather('☀️ Nắng ấm');
    setFormTag('Nhật ký');
    setFormSticker('💌');
    setFormImage('');
    setFormError(null);
    setShowAiHelper(false);
    setAiSuggestions([]);
    setIsWriting(true);
  };

  // Mở form chỉnh sửa bài
  const handleOpenEdit = (entry: DiaryEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEntryId(entry.id);
    setFormTitle(entry.title);
    setFormContent(entry.content);
    setFormDate(entry.date);
    setFormAuthor(entry.author);
    setFormMood(entry.mood || '🥰 Hạnh phúc');
    setFormWeather(entry.weather || '☀️ Nắng ấm');
    setFormTag(entry.tag || 'Nhật ký');
    setFormSticker(entry.sticker || '💌');
    setFormImage(entry.imageUrl || '');
    setFormError(null);
    setShowAiHelper(false);
    setAiSuggestions([]);
    setIsWriting(true);
  };

  // Xóa bài viết
  const handleDeleteEntry = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = entries.filter((item) => item.id !== id);
    onSaveEntries(updated);
    setDeletingId(null);
    if (currentPage > updated.length) {
      setCurrentPage(Math.max(0, updated.length));
    }
  };

  // Xử lý nén ảnh đính kèm
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingImg(true);
    try {
      const compressed = await compressImageFile(file, 900, 0.82);
      setFormImage(compressed);
    } catch (err) {
      console.warn('Lỗi nén ảnh kẹp sổ tay:', err);
    } finally {
      setIsCompressingImg(false);
    }
  };

  // Lưu bài viết
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Vui lòng viết tiêu đề cho trang nhật ký nhé!');
      return;
    }
    if (!formContent.trim()) {
      setFormError('Hãy viết vài dòng tâm sự dài để lưu vào cuốn sổ nhé!');
      return;
    }

    if (editingEntryId) {
      // Cập nhật bài cũ
      const updated = entries.map((item) => {
        if (item.id === editingEntryId) {
          return {
            ...item,
            title: formTitle.trim(),
            content: formContent.trim(),
            date: formDate,
            author: formAuthor,
            mood: formMood,
            weather: formWeather,
            tag: formTag,
            sticker: formSticker,
            imageUrl: formImage || undefined,
            updatedAt: Date.now()
          };
        }
        return item;
      });
      onSaveEntries(updated);
    } else {
      // Thêm bài mới
      const newEntry: DiaryEntry = {
        id: `diary-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: formTitle.trim(),
        content: formContent.trim(),
        date: formDate,
        author: formAuthor,
        mood: formMood,
        weather: formWeather,
        tag: formTag,
        sticker: formSticker,
        imageUrl: formImage || undefined,
        createdAt: Date.now()
      };
      const updated = [newEntry, ...entries];
      onSaveEntries(updated);
      setCurrentPage(1); // Chuyển ngay đến bài mới nhất
    }

    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#E8A598', '#F9DCC4', '#D98A76']
    });

    setIsWriting(false);
  };

  // Gọi Gemini AI gợi ý viết thư tình / tâm sự dài
  const handleRequestAiLetter = async () => {
    setIsAiLoading(true);
    try {
      const promptKeyword = aiPrompt.trim() || 'Một bức thư tình ngọt ngào và chân thành gửi người yêu';
      const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'Cuốn sổ tay kỷ niệm',
          tone: 'romantic',
          coupleNames: {
            personOne: coupleInfo.personOne || 'Đức Duy',
            personTwo: coupleInfo.personTwo || 'Thanh Tâm'
          },
          keywords: `Viết thư tình dài: ${promptKeyword}`
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.suggestions && Array.isArray(data.suggestions)) {
          const suggestions = data.suggestions.map((s: any) => (typeof s === 'string' ? s : s.text));
          setAiSuggestions(suggestions);
          return;
        }
      }

      // Fallback nếu server không trả về
      setAiSuggestions([
        `Gửi ${coupleInfo.personTwo || 'em'}, cảm ơn em vì đã luôn kiên nhẫn và dịu dàng đồng hành cùng anh. Từng ngày bên em là từng ngày anh thấy lòng mình bình yên nhất.`,
        `Nhớ những ngày đầu chúng mình còn ngại ngùng, giờ đây mọi thói quen của anh đều có bóng hình em. Dù thời gian có trôi đi, tình yêu này vẫn sẽ vẹn nguyên như phút ban đầu.`,
        `Có những chiều chỉ cần ngồi cạnh em nghe tiếng mưa rơi, uống một tách trà ấm thôi cũng đủ làm anh thấy cuộc đời này dịu dàng đến vô ngần.`
      ]);
    } catch {
      setAiSuggestions([
        `Gửi ${coupleInfo.personTwo || 'em'}, cảm ơn vì đã đến và sưởi ấm thế giới của anh. Mong rằng cuốn sổ này sẽ cùng hai đứa già đi theo năm tháng.`
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyAiText = (text: string) => {
    setFormContent((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  if (!isOpen) return null;

  const currentEntry: DiaryEntry | null =
    currentPage > 0 && filteredEntries[currentPage - 1]
      ? filteredEntries[currentPage - 1]
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* KHUNG SỔ TAY VIẾT TAY HOÀN CHỈNH */}
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl border-4 border-[#5E4233] bg-[#432F24]">
        {/* THANH ĐIỀU HƯỚNG BÌA DA TRÊN CÙNG */}
        <div className="px-4 py-3 bg-[#432F24] border-b border-[#70523E] flex flex-wrap items-center justify-between gap-3 text-[#F5EBE1] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-800 flex items-center justify-center text-amber-100 shadow-inner border border-amber-500/30">
              <Book className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-serif-romantic font-bold text-base sm:text-lg text-amber-100 flex items-center gap-2 leading-tight">
                <span>Sổ Tay Kỷ Niệm • Nhật Ký Viết Tay</span>
                <span className="text-[10px] font-sans font-semibold text-amber-200 bg-amber-950/60 border border-amber-600/40 px-2 py-0.5 rounded-full">
                  {entries.length} trang
                </span>
              </h2>
              <p className="text-[11px] text-[#C9B29B]">
                {coupleInfo.personOne} ♥ {coupleInfo.personTwo} • Nơi gửi gắm những dòng tâm sự dài
              </p>
            </div>
          </div>

          {/* Công cụ & nút hành động */}
          <div className="flex items-center gap-2">
            {/* Lọc theo tác giả */}
            <div className="hidden sm:flex items-center bg-[#332219] p-0.5 rounded-xl border border-[#70523E]">
              <button
                type="button"
                onClick={() => setAuthorFilter('all')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  authorFilter === 'all'
                    ? 'bg-amber-100 text-[#432F24] font-bold shadow-xs'
                    : 'text-[#C9B29B] hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setAuthorFilter(coupleInfo.personOne || 'Đức Duy')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  authorFilter === coupleInfo.personOne
                    ? 'bg-amber-100 text-[#432F24] font-bold shadow-xs'
                    : 'text-[#C9B29B] hover:text-white'
                }`}
              >
                {coupleInfo.personOne || 'Đức Duy'}
              </button>
              <button
                type="button"
                onClick={() => setAuthorFilter(coupleInfo.personTwo || 'Thanh Tâm')}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                  authorFilter === coupleInfo.personTwo
                    ? 'bg-amber-100 text-[#432F24] font-bold shadow-xs'
                    : 'text-[#C9B29B] hover:text-white'
                }`}
              >
                {coupleInfo.personTwo || 'Thanh Tâm'}
              </button>
            </div>

            {/* Đổi font chữ viết tay */}
            {onOpenFontModal && (
              <button
                type="button"
                onClick={onOpenFontModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
                title="Đổi font chữ viết tay cho nhật ký & cảm xúc"
              >
                <Type className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Font:</span>
                <span className="text-white font-bold">{currentFontOption.name.split(' (')[0]}</span>
              </button>
            )}

            {/* Bật / tắt âm thanh lật trang */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title={soundEnabled ? 'Tắt âm thanh lật trang' : 'Bật âm thanh lật trang sột soạt'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
            </button>

            {/* Nút Viết trang mới */}
            <button
              type="button"
              onClick={handleOpenWriteNew}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#D98A76] to-[#C87D55] hover:opacity-95 text-white font-semibold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Viết Trang Mới</span>
            </button>

            {/* Nút Đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#C9B29B] hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
              title="Đóng sổ tay"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* THÂN CUỐN SỔ TAY: GIẤY KẺ NGANG VINTAGE, GÁY SỔ & LẬT TRANG */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#32231B] flex items-center justify-center">
          {/* TOÀN BỘ HAI TRANG SÁCH MỞ RỘNG (TWO-PAGE SPREAD) */}
          <div
            className={`w-full max-w-4xl bg-[#FFFDF6] text-[#2C1D16] rounded-2xl sm:rounded-3xl shadow-2xl border-2 border-[#D4C3AC] overflow-hidden relative flex flex-col transition-all duration-300 ${
              isFlipping
                ? flipDirection === 'next'
                  ? 'translate-x-[-4px] scale-[0.99] opacity-90'
                  : 'translate-x-[4px] scale-[0.99] opacity-90'
                : 'translate-x-0 scale-100 opacity-100'
            }`}
            style={{
              backgroundImage: `repeating-linear-gradient(transparent, transparent 31px, rgba(140, 109, 88, 0.12) 31px, rgba(140, 109, 88, 0.12) 32px)`,
              backgroundAttachment: 'local'
            }}
          >
            {/* Gáy sổ ở giữa tạo bóng 3D chân thực */}
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-black/10 via-black/25 to-transparent pointer-events-none z-20" />
            <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-0.5 bg-[#8C6D58]/30 z-20" />

            {/* Dải ruy băng đánh dấu trang (Bookmark Ribbon) */}
            <div className="absolute top-0 right-14 w-4 h-16 bg-gradient-to-b from-[#D98A76] to-[#B85F49] shadow-md rounded-b-md z-30 pointer-events-none flex items-end justify-center pb-1">
              <Heart className="w-2.5 h-2.5 text-white fill-white" />
            </div>

            {/* NỘI DUNG TRANG HIỆN TẠI */}
            {isWriting ? (
              /* ========================================================
                 A. FORM SOẠN THẢO TRANG MỚI / CHỈNH SỬA BÀI VIẾT DÀI
                 ======================================================== */
              <div className="p-5 sm:p-8 space-y-4">
                <div className="flex items-center justify-between border-b border-[#8C6D58]/20 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-[#D98A76]" />
                    <h3 className="font-serif-romantic font-bold text-lg sm:text-xl text-[#3D2E28]">
                      {editingEntryId ? 'Chỉnh Sửa Trang Nhật Ký' : 'Viết Trang Nhật Ký Mới'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsWriting(false)}
                    className="text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] bg-white border border-[#8C6D58]/20 px-3 py-1 rounded-full cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                </div>

                {formError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-medium animate-fadeIn">
                    ⚠️ {formError}
                  </div>
                )}

                <form onSubmit={handleSaveForm} className="space-y-4">
                  {/* Tiêu đề & Tác giả */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                        Tiêu đề trang sổ tay <span className="text-[#D98A76]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ví dụ: Bức thư gửi em ngày mưa đầu mùa..."
                        className="w-full px-3.5 py-2 text-sm sm:text-base rounded-xl bg-white/90 border border-[#8C6D58]/25 focus:border-[#D98A76] focus:outline-hidden font-serif-romantic font-bold text-[#3D2E28]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                        Người viết
                      </label>
                      <select
                        value={formAuthor}
                        onChange={(e) => setFormAuthor(e.target.value)}
                        className="w-full px-3 py-2 text-xs sm:text-sm rounded-xl bg-white/90 border border-[#8C6D58]/25 focus:border-[#D98A76] focus:outline-hidden font-medium"
                      >
                        <option value={coupleInfo.personOne || 'Đức Duy'}>
                          ✍️ {coupleInfo.personOne || 'Đức Duy'}
                        </option>
                        <option value={coupleInfo.personTwo || 'Thanh Tâm'}>
                          ✍️ {coupleInfo.personTwo || 'Thanh Tâm'}
                        </option>
                        <option value="Cả hai đứa">👫 Cả hai đứa</option>
                      </select>
                    </div>
                  </div>

                  {/* Ngày tháng, Thời tiết, Cảm xúc & Sticker */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="block font-semibold text-[#8C6D58] mb-1">Ngày viết</label>
                      <input
                        type="date"
                        required
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/90 border border-[#8C6D58]/25 focus:border-[#D98A76] focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#8C6D58] mb-1">Thời tiết</label>
                      <select
                        value={formWeather}
                        onChange={(e) => setFormWeather(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/90 border border-[#8C6D58]/25 focus:border-[#D98A76] focus:outline-hidden"
                      >
                        {WEATHERS.map((w) => (
                          <option key={w.label} value={w.label}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#8C6D58] mb-1">Tâm trạng</label>
                      <select
                        value={formMood}
                        onChange={(e) => setFormMood(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white/90 border border-[#8C6D58]/25 focus:border-[#D98A76] focus:outline-hidden"
                      >
                        {MOODS.map((m) => (
                          <option key={m.label} value={m.label}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-[#8C6D58] mb-1">Nhãn dán</label>
                      <div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar">
                        {STICKERS.map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setFormSticker(st)}
                            className={`p-1 text-sm rounded-lg border transition-all cursor-pointer ${
                              formSticker === st
                                ? 'bg-amber-100 border-[#D98A76] scale-110 shadow-xs'
                                : 'bg-white border-[#8C6D58]/20 opacity-70 hover:opacity-100'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Ảnh kẹp vào trang sổ tay (tùy chọn) */}
                  <div className="flex items-center justify-between bg-amber-50/70 p-2.5 rounded-2xl border border-amber-200/60">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-[#D98A76]" />
                      <span className="text-xs font-semibold text-[#3D2E28]">
                        Đính kèm một bức ảnh kỷ niệm vào trang sổ (kẹp bằng washi tape):
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {formImage ? (
                        <div className="flex items-center gap-2">
                          <img
                            src={formImage}
                            alt="Ảnh đính kèm"
                            className="w-10 h-10 object-cover rounded-lg border border-[#8C6D58]/30 shadow-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setFormImage('')}
                            className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-xl text-xs font-semibold text-[#D98A76] transition-all cursor-pointer"
                        >
                          {isCompressingImg ? 'Đang nén ảnh...' : '+ Chọn ảnh'}
                        </button>
                      )}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Hộp trợ lý Gemini AI gợi ý văn thư */}
                  <div className="border border-amber-300/80 bg-gradient-to-r from-amber-50 to-orange-50/60 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#3D2E28]">
                        <Wand2 className="w-3.5 h-3.5 text-[#D98A76]" />
                        <span>Trợ lý Gemini AI Gợi Ý Văn Thơ Tình Cảm</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAiHelper(!showAiHelper)}
                        className="text-[11px] text-[#D98A76] font-semibold hover:underline cursor-pointer"
                      >
                        {showAiHelper ? 'Thu gọn' : 'Mở cảm hứng viết thư'}
                      </button>
                    </div>

                    {showAiHelper && (
                      <div className="space-y-2 pt-1 animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="Gợi ý cảm xúc (cảm ơn vì bữa tối, nhớ lúc đi dạo bờ hồ, lời hứa tương lai...)..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#D98A76] focus:outline-hidden"
                          />
                          <button
                            type="button"
                            disabled={isAiLoading}
                            onClick={handleRequestAiLetter}
                            className="px-3 py-1.5 rounded-xl bg-[#D98A76] hover:bg-[#C87D55] text-white text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isAiLoading ? 'Đang viết...' : 'Sáng tác'}
                          </button>
                        </div>

                        {aiSuggestions.length > 0 && (
                          <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                            {aiSuggestions.map((sug, i) => (
                              <div
                                key={i}
                                onClick={() => handleApplyAiText(sug)}
                                className="p-2 bg-white rounded-xl border border-amber-200/80 hover:border-[#D98A76] text-xs font-handwriting text-base text-[#3D2E28] cursor-pointer hover:bg-amber-50/60 transition-all shadow-2xs group"
                              >
                                "{sug}"
                                <span className="block text-[10px] text-[#D98A76] font-sans font-semibold mt-1">
                                  + Bấm để chèn đoạn này vào bài
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vùng viết nội dung dài kẻ dòng viết tay */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-[#8C6D58]">
                        Nội dung nhật ký / Bức thư tâm sự <span className="text-[#D98A76]">*</span>
                      </label>
                      {onOpenFontModal && (
                        <button
                          type="button"
                          onClick={onOpenFontModal}
                          className="text-[11px] font-semibold text-[#D98A76] hover:text-[#C87D55] bg-white border border-[#8C6D58]/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Đổi kiểu chữ viết tay cho nhật ký"
                        >
                          <Type className="w-3 h-3" />
                          <span>Font: {currentFontOption.name.split(' (')[0]}</span>
                          <span className="text-[10px] underline ml-0.5">Đổi</span>
                        </button>
                      )}
                    </div>
                    <textarea
                      required
                      rows={9}
                      value={formContent}
                      onChange={(e) => setFormContent(e.target.value)}
                      placeholder="Viết những suy nghĩ chân thành, những lời tâm sự dài của bạn vào đây..."
                      className={`w-full p-4 rounded-2xl bg-white/95 border border-[#8C6D58]/25 focus:border-[#D98A76] focus:outline-hidden ${fontClass} text-xl sm:text-2xl text-[#2C1D16] leading-relaxed shadow-inner`}
                      style={{
                        lineHeight: '32px'
                      }}
                    />
                  </div>

                  {/* Nút lưu */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#8C6D58]/20">
                    <button
                      type="button"
                      onClick={() => setIsWriting(false)}
                      className="px-4 py-2 text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] rounded-xl cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#D98A76] to-[#C87D55] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                    >
                      {editingEntryId ? 'Cập nhật trang sổ' : 'Lưu vào sổ tay kỷ niệm'}
                    </button>
                  </div>
                </form>
              </div>
            ) : currentPage === 0 ? (
              /* ========================================================
                 B. TRANG BÌA & MỤC LỤC SỔ TAY (TABLE OF CONTENTS)
                 ======================================================== */
              <div className="grid grid-cols-1 md:grid-cols-2 min-h-[460px] sm:min-h-[520px]">
                {/* Trang Trái: Bìa mở đầu lãng mạn */}
                <div className="p-6 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#8C6D58]/20 bg-[#FAF6EE]">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-[#8C6D58] text-xs font-serif-romantic font-semibold mb-4 border border-amber-300">
                      <Sparkles className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Cuốn Sổ Tay Tình Yêu</span>
                    </div>
                    <h1 className="font-serif-romantic font-bold text-3xl sm:text-4xl text-[#3D2E28] leading-tight">
                      Góc Nhỏ Bình Yên
                    </h1>
                    <p className="font-serif-romantic text-base text-[#D98A76] mt-1 font-semibold">
                      {coupleInfo.personOne} ♥ {coupleInfo.personTwo}
                    </p>

                    <div className="mt-6 p-4 rounded-2xl bg-white/80 border border-[#8C6D58]/15 shadow-xs">
                      <p className={`${fontClass} text-xl sm:text-2xl text-[#4A3525] leading-relaxed`}>
                        "{coupleInfo.anniversaryNote || 'Từng ngày bên nhau đều là ngày bình yên và dịu dàng nhất.'}"
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-[#8C6D58]/15 text-xs text-[#8C6D58] flex items-center justify-between">
                    <span>Bắt đầu từ: {new Date(coupleInfo.startDate).toLocaleDateString('vi-VN')}</span>
                    <button
                      type="button"
                      onClick={handleOpenWriteNew}
                      className="inline-flex items-center gap-1 font-bold text-[#D98A76] hover:underline cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Viết trang mới</span>
                    </button>
                  </div>
                </div>

                {/* Trang Phải: Mục lục các bài viết nhật ký */}
                <div className="p-6 sm:p-10 flex flex-col justify-between bg-[#FFFDF6]">
                  <div>
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#8C6D58]/20">
                      <h3 className="font-serif-romantic font-bold text-lg text-[#3D2E28] flex items-center gap-2">
                        <Bookmark className="w-4 h-4 text-[#D98A76]" />
                        <span>Mục Lục Các Trang Nhật Ký</span>
                      </h3>
                      <span className="text-xs font-semibold text-[#8C6D58]">
                        {filteredEntries.length} bài viết
                      </span>
                    </div>

                    {/* Ô tìm kiếm nhanh trang */}
                    <div className="relative mb-3">
                      <Search className="w-3.5 h-3.5 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tiêu đề, nội dung tâm sự..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white/90 border border-[#8C6D58]/20 focus:border-[#D98A76] focus:outline-hidden"
                      />
                    </div>

                    {/* Danh sách mục lục có thể bấm nhảy đến trang tương ứng */}
                    <div className="space-y-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
                      {filteredEntries.map((item, idx) => (
                        <div
                          key={item.id}
                          onClick={() => handleJumpToPage(idx + 1)}
                          className="flex items-center justify-between p-2 rounded-xl hover:bg-amber-50/80 border border-transparent hover:border-amber-200 cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-xs font-mono font-bold text-[#D98A76] w-6 shrink-0">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-serif-romantic font-semibold text-[#3D2E28] truncate group-hover:text-[#D98A76] transition-colors">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-xs text-[#8C6D58]">
                            <span className="text-[11px] opacity-70">
                              {new Date(item.date).toLocaleDateString('vi-VN', {
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </span>
                            <span className="text-xs">{item.sticker || '💌'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nút bấm lật sang trang đầu tiên */}
                  <div className="pt-4 border-t border-[#8C6D58]/15 flex items-center justify-between">
                    <span className="text-xs text-[#8C6D58]">Trang Mục Lục</span>
                    <button
                      type="button"
                      onClick={handleNextPage}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D98A76] hover:bg-[#C87D55] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <span>Mở Trang 1</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* ========================================================
                 C. NỘI DUNG TRANG NHẬT KÝ CHI TIẾT (PAGE SPREAD)
                 ======================================================== */
              currentEntry && (
                <div className="grid grid-cols-1 md:grid-cols-2 min-h-[460px] sm:min-h-[520px]">
                  {/* Trang Trái: Ảnh đính kèm (nếu có), nhãn dán, thời tiết & thông tin tác giả */}
                  <div className="p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#8C6D58]/20 bg-[#FAF6EE] relative">
                    {/* Băng keo washi dán góc trên */}
                    <div className="absolute top-2 left-6 w-24 h-5 bg-[#E8A598]/50 -rotate-3 backdrop-blur-2xs shadow-xs border-dashed border-y border-white/60 pointer-events-none" />

                    <div>
                      {/* Tiêu đề & Thông tin tác giả */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-1">
                          <span className="font-serif-romantic font-bold uppercase tracking-wider text-[11px] text-[#D98A76]">
                            Trang {currentPage} / {filteredEntries.length}
                          </span>
                          <span className="text-lg">{currentEntry.sticker || '🌸'}</span>
                        </div>

                        <h2 className="font-serif-romantic font-bold text-2xl sm:text-3xl text-[#3D2E28] leading-tight">
                          {currentEntry.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#8C6D58]">
                          <span className="flex items-center gap-1 font-semibold text-[#3D2E28]">
                            <Calendar className="w-3.5 h-3.5 text-[#D98A76]" />
                            {new Date(currentEntry.date).toLocaleDateString('vi-VN', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </span>
                          <span>•</span>
                          <span className="px-2 py-0.5 bg-amber-100/80 rounded-full font-medium text-[#4A3525]">
                            {currentEntry.weather || '☀️ Nắng ấm'}
                          </span>
                          <span className="px-2 py-0.5 bg-rose-100/80 rounded-full font-medium text-[#4A3525]">
                            {currentEntry.mood || '🥰 Hạnh phúc'}
                          </span>
                        </div>
                      </div>

                      {/* Ảnh kẹp vào trang sổ tay (kèm hiệu ứng Polaroid kẹp washi tape) */}
                      {currentEntry.imageUrl ? (
                        <div className="relative mt-4 mx-auto max-w-[280px] bg-white p-2.5 pb-6 rounded-xl shadow-md border border-[#8C6D58]/20 rotate-1 group transition-transform hover:rotate-0">
                          {/* Miếng băng dính washi tape */}
                          <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-amber-200/80 -rotate-1 shadow-xs border-dashed border-y border-white/60" />
                          <div className="aspect-4/3 rounded-lg overflow-hidden bg-amber-50">
                            <img
                              src={currentEntry.imageUrl}
                              alt={currentEntry.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className={`text-center ${fontClass} text-sm text-[#8C6D58] mt-2`}>
                            ♥ Khoảnh khắc gắn liền với trang này
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-5 rounded-2xl bg-white/70 border border-[#8C6D58]/15 text-center shadow-xs">
                          <Heart className="w-6 h-6 mx-auto text-[#E8A598] fill-[#E8A598] mb-1.5" />
                          <p className={`${fontClass} text-xl text-[#8C6D58]`}>
                            "Những dòng viết tay từ trái tim gửi đến người thương."
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dưới đáy trang trái: Tác giả & nút sửa/xóa */}
                    <div className="pt-4 border-t border-[#8C6D58]/15 flex items-center justify-between text-xs text-[#8C6D58]">
                      <div className="flex items-center gap-1.5 font-bold text-[#3D2E28]">
                        <span>Viết bởi:</span>
                        <span className="text-[#D98A76] underline decoration-wavy decoration-[#E8A598]">
                          {currentEntry.author}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(currentEntry, e)}
                          className="p-1 hover:text-[#3D2E28] hover:bg-black/5 rounded-lg transition-colors cursor-pointer"
                          title="Sửa trang này"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => setDeletingId(currentEntry.id)}
                          className="p-1 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa trang này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Trang Phải: Toàn bộ nội dung nhật ký viết tay nét mực bay bổng */}
                  <div className="p-6 sm:p-10 flex flex-col justify-between bg-[#FFFDF6] relative">
                    {/* Băng dính washi tape góc phải */}
                    <div className="absolute top-2 right-6 w-20 h-5 bg-amber-300/40 rotate-2 backdrop-blur-2xs shadow-xs border-dashed border-y border-white/60 pointer-events-none" />

                    <div>
                      {/* Dấu mực con dấu Vintage */}
                      <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#8C6D58]/15">
                        <span className="text-xs uppercase tracking-widest text-[#8C6D58] font-semibold flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-[#D98A76]" />
                          <span>Dòng nhật ký tâm tình</span>
                        </span>
                        <span className={`text-xs ${fontClass} text-base text-[#D98A76]`}>
                          {currentEntry.tag || 'Tâm sự'}
                        </span>
                      </div>

                      {/* Nội dung dòng chữ viết tay với font được chọn lãng mạn */}
                      <div className={`whitespace-pre-line ${fontClass} text-xl sm:text-2xl text-[#2C1D16] leading-relaxed max-h-[340px] overflow-y-auto pr-2`}>
                        {currentEntry.content}
                      </div>
                    </div>

                    {/* Dưới đáy trang phải: Chữ ký thân thương */}
                    <div className="pt-4 border-t border-[#8C6D58]/15 flex items-center justify-between text-xs text-[#8C6D58]">
                      <span className={`${fontClass} text-lg text-[#D98A76]`}>
                        Thương mến, {currentEntry.author} ♥
                      </span>

                      <div className="flex items-center gap-1 text-[11px] opacity-60">
                        <span>Trang {currentPage}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {/* THANH ĐIỀU HƯỚNG LẬT TRANG DƯỚI ĐÁY CUỐN SỔ */}
            {!isWriting && (
              <div className="px-4 py-2.5 bg-[#F4EDE0] border-t border-[#D4C3AC] flex items-center justify-between text-xs text-[#5E4233] shrink-0">
                <button
                  type="button"
                  disabled={currentPage === 0}
                  onClick={handlePrevPage}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none font-bold transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>{currentPage === 1 ? 'Mục Lục' : 'Trang trước'}</span>
                </button>

                {/* Danh sách trang nhanh */}
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-[240px] sm:max-w-xs px-2 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => handleJumpToPage(0)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-serif-romantic font-semibold transition-all cursor-pointer ${
                      currentPage === 0
                        ? 'bg-[#D98A76] text-white shadow-xs'
                        : 'hover:bg-black/5 text-[#5E4233]'
                    }`}
                  >
                    Bìa & Mục Lục
                  </button>
                  {filteredEntries.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleJumpToPage(i + 1)}
                      className={`w-6 h-6 rounded-lg text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${
                        currentPage === i + 1
                          ? 'bg-[#D98A76] text-white shadow-xs'
                          : 'hover:bg-black/5 text-[#5E4233]'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={currentPage >= filteredEntries.length}
                  onClick={handleNextPage}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-black/5 disabled:opacity-30 disabled:pointer-events-none font-bold transition-all cursor-pointer"
                >
                  <span>{currentPage === 0 ? 'Mở Trang 1' : 'Trang sau'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* HỘP THOẠI XÁC NHẬN XÓA TRANG */}
        {deletingId && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-[#FFFDF9] rounded-2xl p-5 max-w-sm w-full border border-[#8C6D58]/20 shadow-xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-serif-romantic font-bold text-base text-[#3D2E28]">
                Xác nhận xé trang nhật ký này?
              </h4>
              <p className="text-xs text-[#8C6D58]">
                Trang nhật ký này sẽ được xóa vĩnh viễn khỏi cuốn sổ của hai đứa.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-[#8C6D58] hover:bg-[#F9F6F0] rounded-xl cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDeleteEntry(deletingId, e)}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
