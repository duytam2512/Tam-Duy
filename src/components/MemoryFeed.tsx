import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LayoutGrid,
  GitCommit,
  Search,
  MapPin,
  Calendar,
  Heart,
  Share2,
  Trash2,
  Edit2,
  Tag,
  Filter,
  Sparkles,
  ChevronDown,
  Layers,
  Type,
  Video,
  Play,
  Maximize2,
  RotateCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory, ViewMode, POPULAR_TAGS, CoupleInfo } from '../types';
import { formatVideoDuration } from '../services/storage';
import { SmartImage } from './SmartImage';

const FIRST_LIKE_FIREWORKS_KEY = 'goc_nho_first_like_fireworks_v1';

const loadCelebratedLikeIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(FIRST_LIKE_FIREWORKS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((id): id is string => typeof id === 'string'));
      }
    }
  } catch {}
  return new Set();
};

const persistCelebratedLikeIds = (ids: Set<string>): void => {
  try {
    const list = Array.from(ids).slice(-500);
    localStorage.setItem(FIRST_LIKE_FIREWORKS_KEY, JSON.stringify(list));
  } catch {}
};

const formatSafeDate = (dateStr?: string, options?: Intl.DateTimeFormatOptions): string => {
  if (!dateStr) return 'Không rõ ngày';
  const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateStr);
  if (!Number.isFinite(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('vi-VN', options);
};

const getSafeYear = (dateStr?: string): string => {
  if (!dateStr) return '';
  const match = dateStr.trim().match(/^(\d{4})/);
  if (match) return match[1];
  const parsed = new Date(dateStr);
  return Number.isFinite(parsed.getTime()) ? String(parsed.getFullYear()) : '';
};

interface MemoryFeedProps {
  memories: Memory[];
  coupleInfo: CoupleInfo;
  onToggleLike: (id: string) => void;
  onDeleteMemory: (id: string) => void;
  onOpenLightbox: (memory: Memory) => void;
  onOpenShare: (memory: Memory) => void;
  onOpenQuickUpload: () => void;
  fontClass?: string;
  onOpenFontModal?: () => void;
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({
  memories,
  coupleInfo,
  onToggleLike,
  onDeleteMemory,
  onOpenLightbox,
  onOpenShare,
  onOpenQuickUpload,
  fontClass = 'font-handwriting',
  onOpenFontModal
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('Tất cả');
  const [selectedYear, setSelectedYear] = useState('all');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video'>('all');
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [flippedMemoryId, setFlippedMemoryId] = useState<string | null>(null);
  const lastPointerTypeRef = useRef<string>('mouse');
  const [heartAnimMap, setHeartAnimMap] = useState<Record<string, { seq: number; liked: boolean }>>({});
  const heartTimersRef = useRef<Record<string, number>>({});
  const fireworksTimersRef = useRef<number[]>([]);
  const celebratedLikesRef = useRef<Set<string> | null>(null);

  if (celebratedLikesRef.current === null) {
    celebratedLikesRef.current = loadCelebratedLikeIds();
  }

  useEffect(() => {
    return () => {
      Object.values(heartTimersRef.current).forEach((timerId) => window.clearTimeout(timerId));
      fireworksTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      fireworksTimersRef.current = [];
    };
  }, []);

  const launchFirstLikeFireworks = (originX: number, originY: number) => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const x = Math.max(0.1, Math.min(0.9, originX));
    const y = Math.max(0.18, Math.min(0.88, originY));
    const upperY = Math.max(0.14, y - 0.22);
    const colors = ['#E8A598', '#F43F5E', '#FBBF24', '#F9DCC4', '#D98A76', '#FFFDF9'];

    const scheduleBurst = (delayMs: number, options: confetti.Options) => {
      const id = window.setTimeout(() => {
        try {
          confetti({
            colors,
            disableForReducedMotion: true,
            zIndex: 80,
            ...options
          });
        } catch {}
      }, delayMs);
      fireworksTimersRef.current.push(id);
    };

    // Đợt 1: Pháo hoa bắn vọt lên từ chính nút thả tim
    scheduleBurst(0, {
      particleCount: 42,
      spread: 75,
      startVelocity: 36,
      ticks: 85,
      gravity: 0.9,
      scalar: 0.95,
      origin: { x, y }
    });

    // Đợt 2: Bông pháo hoa bung tròn nở rộ phía trên tấm kỷ niệm
    scheduleBurst(190, {
      particleCount: 58,
      spread: 360,
      startVelocity: 26,
      ticks: 90,
      gravity: 0.8,
      scalar: 1.05,
      origin: { x, y: upperY }
    });

    // Đợt 3: Hai tia pháo lấp lánh hai bên hoàn thiện màn ăn mừng
    scheduleBurst(370, {
      particleCount: 28,
      spread: 360,
      startVelocity: 20,
      ticks: 75,
      gravity: 0.82,
      scalar: 0.85,
      origin: { x: Math.max(0.12, x - 0.14), y: Math.max(0.16, upperY + 0.05) }
    });
    scheduleBurst(430, {
      particleCount: 28,
      spread: 360,
      startVelocity: 20,
      ticks: 75,
      gravity: 0.82,
      scalar: 0.85,
      origin: { x: Math.min(0.88, x + 0.14), y: Math.max(0.16, upperY + 0.05) }
    });
  };

  const handleLikeWithPulse = (item: Memory, e: React.MouseEvent<HTMLButtonElement>) => {
    const nextLiked = !item.isLiked;
    if (nextLiked && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(14);
      } catch {}
    }

    // Bắn pháo hoa ăn mừng lần đầu tiên người dùng thả tim cho kỷ niệm này
    if (nextLiked && celebratedLikesRef.current && !celebratedLikesRef.current.has(item.id)) {
      celebratedLikesRef.current.add(item.id);
      persistCelebratedLikeIds(celebratedLikesRef.current);

      const rect = e.currentTarget.getBoundingClientRect();
      const originX = (rect.left + rect.width / 2) / Math.max(1, window.innerWidth);
      const originY = (rect.top + rect.height / 2) / Math.max(1, window.innerHeight);
      launchFirstLikeFireworks(originX, originY);
    }

    setHeartAnimMap((prev) => ({
      ...prev,
      [item.id]: { seq: (prev[item.id]?.seq || 0) + 1, liked: nextLiked }
    }));

    if (heartTimersRef.current[item.id]) {
      window.clearTimeout(heartTimersRef.current[item.id]);
    }
    heartTimersRef.current[item.id] = window.setTimeout(() => {
      setHeartAnimMap((prev) => {
        if (!prev[item.id]) return prev;
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      delete heartTimersRef.current[item.id];
    }, 640);

    onToggleLike(item.id);
  };

  const handlePhotoPointerDown = (e: React.PointerEvent) => {
    lastPointerTypeRef.current = e.pointerType || 'mouse';
  };

  const handlePhotoClick = (item: Memory) => {
    // Trên điện thoại/máy tính bảng: chạm lần 1 lật mặt sau nhẹ nhàng, chạm lần 2 mở phóng to
    if (lastPointerTypeRef.current === 'touch') {
      if (flippedMemoryId !== item.id) {
        setFlippedMemoryId(item.id);
        return;
      }
      setFlippedMemoryId(null);
      onOpenLightbox(item);
      return;
    }
    // Trên máy tính: di chuột đã tự động lật, bấm vào là mở phóng to ngay
    onOpenLightbox(item);
  };

  const videoCount = useMemo(
    () => memories.filter((m) => m.mediaType === 'video' && Boolean(m.videoUrl)).length,
    [memories]
  );

  // Lấy danh sách các năm có kỷ niệm
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    memories.forEach((m) => {
      const yr = getSafeYear(m.date);
      if (yr) {
        years.add(yr);
      }
    });
    return Array.from(years).sort().reverse();
  }, [memories]);

  // Bộ lọc tìm kiếm
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      // 0. Video filter
      if (mediaFilter === 'video' && !(m.mediaType === 'video' && m.videoUrl)) {
        return false;
      }
      // 1. Tag
      if (selectedTag !== 'Tất cả' && m.tag !== selectedTag) {
        return false;
      }
      // 2. Year
      if (selectedYear !== 'all' && !(m.date || '').startsWith(selectedYear)) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inCaption = (m.caption || '').toLowerCase().includes(query);
        const inLocation = (m.location || '').toLowerCase().includes(query);
        const inDate = (m.date || '').includes(query);
        if (!inCaption && !inLocation && !inDate) {
          return false;
        }
      }
      return true;
    });
  }, [memories, mediaFilter, selectedTag, selectedYear, searchQuery]);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Thanh Điều Khiển & Bộ Lọc */}
      <div className="card-warm-pastel rounded-2xl p-4 sm:p-5 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C6D58] absolute left-3.5 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo cảm xúc, địa điểm (Đà Lạt, Hồ Tây...)..."
              className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden text-[#3D2E28]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-[#8C6D58] hover:text-[#3D2E28]"
              >
                Xóa
              </button>
            )}
          </div>

          {/* View Mode Toggle & Year Filter */}
          <div className="flex items-center gap-2.5">
            {/* Year Selector */}
            {availableYears.length > 0 && (
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-medium rounded-xl bg-white border border-[#8C6D58]/20 text-[#3D2E28] focus:border-[#E8A598] focus:outline-hidden appearance-none cursor-pointer"
                >
                  <option value="all">Tất cả các năm</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Năm {yr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#8C6D58] absolute right-2.5 top-3 pointer-events-none" />
              </div>
            )}

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#F9F6F0] p-1 rounded-xl border border-[#8C6D58]/15">
              <button
                onClick={() => setViewMode('masonry')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'masonry'
                    ? 'bg-white text-[#3D2E28] shadow-xs'
                    : 'text-[#8C6D58] hover:text-[#3D2E28]'
                }`}
                title="Dạng lưới Pinterest"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lưới Ảnh</span>
              </button>

              <button
                onClick={() => setViewMode('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white text-[#3D2E28] shadow-xs'
                    : 'text-[#8C6D58] hover:text-[#3D2E28]'
                }`}
                title="Dạng dòng thời gian"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dòng Thời Gian</span>
              </button>
            </div>

            {/* Quick Font Switcher */}
            {onOpenFontModal && (
              <button
                type="button"
                onClick={onOpenFontModal}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F9F6F0] border border-[#8C6D58]/20 text-[#8C6D58] hover:text-[#3D2E28] text-xs font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
                title="Đổi kiểu chữ viết tay / nhật ký cho toàn bộ kỷ niệm"
              >
                <Type className="w-3.5 h-3.5 text-[#D98A76]" />
                <span className="hidden md:inline">Đổi Phông Chữ</span>
              </button>
            )}
          </div>
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3.5 mt-3.5 border-t border-[#8C6D58]/10 no-scrollbar">
          <span className="text-xs font-semibold text-[#8C6D58] flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3 h-3 text-[#E8A598]" />
            Chủ đề:
          </span>
          {POPULAR_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all cursor-pointer ${
                selectedTag === tag
                  ? 'bg-[#E8A598] text-white font-semibold shadow-xs'
                  : 'bg-white hover:bg-[#F9F6F0] text-[#8C6D58] border border-[#8C6D58]/15'
              }`}
            >
              {tag}
            </button>
          ))}
          {videoCount > 0 && (
            <button
              type="button"
              onClick={() => setMediaFilter((prev) => (prev === 'video' ? 'all' : 'video'))}
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer ml-1 ${
                mediaFilter === 'video'
                  ? 'bg-[#3D2E28] text-white font-semibold shadow-xs'
                  : 'bg-white hover:bg-[#F9F6F0] text-[#D98A76] border border-[#D98A76]/40 font-semibold'
              }`}
            >
              <Video className="w-3 h-3" />
              <span>Video ({videoCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Danh Sách Kỷ Niệm */}
      {filteredMemories.length === 0 ? (
        <div className="card-warm-pastel rounded-3xl p-12 text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#E8A598]/15 flex items-center justify-center text-[#D98A76]">
            <Heart className="w-8 h-8" />
          </div>
          <h3 className="font-serif-romantic text-xl font-bold text-[#3D2E28] mb-1">
            Chưa có kỷ niệm nào phù hợp
          </h3>
          <p className="text-xs text-[#8C6D58] mb-5">
            Hãy thử tìm bằng từ khóa khác hoặc bấm lưu giữ một khoảnh khắc mới của hai bạn nhé!
          </p>
          <button
            onClick={onOpenQuickUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-xs shadow-md transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Thêm Kỷ Niệm Ngay</span>
          </button>
        </div>
      ) : viewMode === 'masonry' ? (
        /* Dạng Lưới Pinterest / Polaroid Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {filteredMemories.map((item) => (
            <article
              key={item.id}
              className="polaroid-frame rounded-2xl flex flex-col justify-between group transition-all"
            >
              <div>
                {/* Photo with gentle 3D page-flip on desktop hover / mobile tap */}
                <div
                  onPointerDown={handlePhotoPointerDown}
                  onClick={() => handlePhotoClick(item)}
                  className={`memory-flip-scene relative cursor-pointer aspect-4/3 select-none ${
                    flippedMemoryId === item.id ? 'is-flipped' : ''
                  }`}
                >
                  <div className="memory-flip-card">
                    {/* MẶT TRƯỚC: Ảnh kỷ niệm */}
                    <div className="memory-flip-face memory-flip-front bg-[#F9F6F0]">
                      <SmartImage
                        src={item.imageUrl}
                        alt={item.caption || 'Ảnh kỷ niệm'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Tag badge */}
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs text-[#D98A76] text-[11px] font-semibold rounded-full shadow-xs flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" />
                        <span>{item.tag || 'Kỷ niệm'}</span>
                      </div>

                      {/* Video badge OR Multi-photo badge */}
                      {item.mediaType === 'video' && item.videoUrl ? (
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-xs flex items-center gap-1">
                          <Video className="w-3 h-3 text-[#E8A598]" />
                          <span>{formatVideoDuration(item.videoDuration)}</span>
                        </div>
                      ) : item.images && item.images.length > 1 ? (
                        <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-xs flex items-center gap-1">
                          <Layers className="w-3 h-3 text-[#E8A598]" />
                          <span>{item.images.length} ảnh</span>
                        </div>
                      ) : null}

                      {/* Centered Play Button for Videos */}
                      {item.mediaType === 'video' && item.videoUrl && (
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <div className="w-13 h-13 rounded-full bg-white/90 text-[#D98A76] flex items-center justify-center shadow-xl">
                            <Play className="w-6 h-6 fill-[#D98A76] ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* MẶT SAU: Bưu thiếp kỷ niệm dịu dàng */}
                    <div className="memory-flip-face memory-flip-back bg-gradient-to-br from-[#FFFDF9] via-[#FAF4EC] to-[#F5E9DF] border border-[#E8A598]/40 p-4 flex flex-col justify-between text-left shadow-inner">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#8C6D58]/15">
                        <span className="text-[11px] font-semibold text-[#D98A76] flex items-center gap-1 truncate">
                          <Calendar className="w-3 h-3 shrink-0" />
                          <span>{formatSafeDate(item.date)}</span>
                        </span>
                        <span className="text-[10px] font-serif-romantic italic text-[#8C6D58] shrink-0">
                          ♥ {coupleInfo.personOne} & {coupleInfo.personTwo}
                        </span>
                      </div>

                      <div className="my-auto py-2 text-center px-1">
                        {item.location && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-[#8C6D58] font-medium mb-1.5 max-w-full">
                            <MapPin className="w-3 h-3 text-[#D98A76] shrink-0" />
                            <span className="truncate">{item.location}</span>
                          </div>
                        )}
                        <p className={`${fontClass} text-lg sm:text-xl text-[#3D2E28] leading-snug line-clamp-3`}>
                          “{item.caption || 'Khoảnh khắc bình yên của hai đứa'}”
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#8C6D58]/10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedMemoryId(null);
                            onOpenLightbox(item);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D98A76] hover:bg-[#C87D55] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer whitespace-nowrap"
                        >
                          {item.mediaType === 'video' && item.videoUrl ? (
                            <>
                              <Play className="w-3 h-3 fill-white" />
                              <span>Phát video</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-3 h-3" />
                              <span>Xem ảnh lớn</span>
                            </>
                          )}
                        </button>

                        {flippedMemoryId === item.id && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFlippedMemoryId(null);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#8C6D58] hover:text-[#3D2E28] hover:bg-white/70 transition-colors cursor-pointer"
                            title="Lật về mặt ảnh"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Lật lại</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="pt-4 px-1">
                  {/* Date & Location */}
                  <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E8A598]" />
                      {formatSafeDate(item.date)}
                    </span>

                    {item.location && (
                      <span className="flex items-center gap-1 max-w-[150px] truncate" title={item.location}>
                        <MapPin className="w-3.5 h-3.5 text-[#D98A76] shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Caption / Diary */}
                  <p className={`${fontClass} text-xl sm:text-2xl text-[#3D2E28] leading-snug line-clamp-3`}>
                    "{item.caption}"
                  </p>
                </div>
              </div>

              {/* Action Footer: Like, Share, Delete */}
              <div className="pt-4 px-1 mt-3 border-t border-[#8C6D58]/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={(e) => handleLikeWithPulse(item, e)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                    item.isLiked
                      ? 'bg-[#E8A598] text-white shadow-xs'
                      : 'bg-[#F9F6F0] hover:bg-[#E8A598]/20 text-[#8C6D58]'
                  }`}
                  title="Thả tim kỷ niệm"
                >
                  <span className="relative inline-flex items-center justify-center">
                    {heartAnimMap[item.id]?.liked && (
                      <>
                        <span
                          key={`ring-${heartAnimMap[item.id].seq}`}
                          aria-hidden="true"
                          className="animate-heart-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-white/90"
                        />
                        <Heart
                          key={`spark-${heartAnimMap[item.id].seq}`}
                          aria-hidden="true"
                          className="animate-heart-spark pointer-events-none absolute -top-2 left-1/2 w-3 h-3 text-[#E8A598] fill-[#E8A598]"
                        />
                      </>
                    )}
                    <Heart
                      key={heartAnimMap[item.id] ? `heart-${heartAnimMap[item.id].seq}` : 'heart-idle'}
                      className={`w-3.5 h-3.5 transition-colors ${
                        item.isLiked ? 'fill-white text-white' : 'text-[#E8A598]'
                      } ${
                        heartAnimMap[item.id]
                          ? heartAnimMap[item.id].liked
                            ? 'animate-heart-vibrate-pulse'
                            : 'animate-heart-gentle-tap'
                          : ''
                      }`}
                    />
                  </span>
                  <span className="tabular-nums">{item.likes || 0}</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onOpenShare(item)}
                    className="p-1.5 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all"
                    title="Tạo khung ảnh Polaroid chia sẻ"
                  >
                    <Share2 className="w-4 h-4 text-[#D98A76]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMemoryToDelete(item)}
                    className="p-1.5 text-[#8C6D58]/60 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    title="Xóa kỷ niệm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        /* Dạng Dòng Thời Gian / Romantic Timeline */
        <div className="relative border-l-2 border-[#E8A598]/40 ml-4 sm:ml-32 space-y-8 sm:space-y-12">
          {filteredMemories.map((item, idx) => (
            <div key={item.id} className="relative pl-6 sm:pl-8 group">
              {/* Heart Node on Timeline */}
              <div className="absolute -left-[17px] top-4 w-8 h-8 rounded-full bg-[#FFFDF9] border-2 border-[#E8A598] flex items-center justify-center shadow-xs">
                <Heart
                  key={heartAnimMap[item.id]?.liked ? `node-${heartAnimMap[item.id].seq}` : 'node-idle'}
                  className={`w-4 h-4 text-[#E8A598] fill-[#E8A598] ${
                    heartAnimMap[item.id]?.liked ? 'animate-heart-vibrate-pulse' : ''
                  }`}
                />
              </div>

              {/* Date in desktop left gutter */}
              <div className="hidden sm:block absolute -left-36 top-5 text-right w-28">
                <div className="font-serif-romantic font-bold text-sm text-[#3D2E28]">
                  {formatSafeDate(item.date, {
                    day: 'numeric',
                    month: 'short'
                  })}
                </div>
                <div className="text-xs text-[#8C6D58]">
                  {getSafeYear(item.date)}
                </div>
              </div>

              {/* Timeline Card */}
              <div className="card-warm-pastel rounded-2xl p-4 sm:p-6 transition-all hover:shadow-lg">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Photo with gentle 3D page-flip */}
                  <div
                    onPointerDown={handlePhotoPointerDown}
                    onClick={() => handlePhotoClick(item)}
                    className={`memory-flip-scene sm:w-48 h-48 cursor-pointer shrink-0 relative select-none ${
                      flippedMemoryId === item.id ? 'is-flipped' : ''
                    }`}
                  >
                    <div className="memory-flip-card">
                      {/* Mặt trước */}
                      <div className="memory-flip-face memory-flip-front bg-[#F9F6F0]">
                        <SmartImage
                          src={item.imageUrl}
                          alt={item.caption || 'Ảnh kỷ niệm'}
                          className="w-full h-full object-cover"
                        />
                        {item.mediaType === 'video' && item.videoUrl ? (
                          <>
                            <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-full shadow-xs flex items-center gap-1">
                              <Video className="w-2.5 h-2.5 text-[#E8A598]" />
                              <span>{formatVideoDuration(item.videoDuration)}</span>
                            </div>
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                              <div className="w-10 h-10 rounded-full bg-white/90 text-[#D98A76] flex items-center justify-center shadow-lg">
                                <Play className="w-5 h-5 fill-[#D98A76] ml-0.5" />
                              </div>
                            </div>
                          </>
                        ) : item.images && item.images.length > 1 ? (
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold rounded-full shadow-xs flex items-center gap-1">
                            <Layers className="w-2.5 h-2.5 text-[#E8A598]" />
                            <span>{item.images.length} ảnh</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Mặt sau */}
                      <div className="memory-flip-face memory-flip-back bg-gradient-to-br from-[#FFFDF9] via-[#FAF4EC] to-[#F5E9DF] border border-[#E8A598]/40 p-3 flex flex-col items-center justify-center text-center gap-2">
                        <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598]" />
                        <div className="text-[11px] font-semibold text-[#D98A76]">
                          {formatSafeDate(item.date)}
                        </div>
                        {item.location && (
                          <div className="text-[10px] text-[#8C6D58] line-clamp-1 px-1">
                            {item.location}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFlippedMemoryId(null);
                            onOpenLightbox(item);
                          }}
                          className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D98A76] hover:bg-[#C87D55] text-white text-[11px] font-semibold shadow-xs transition-colors cursor-pointer"
                        >
                          {item.mediaType === 'video' && item.videoUrl ? (
                            <>
                              <Play className="w-3 h-3 fill-white" />
                              <span>Phát video</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 className="w-3 h-3" />
                              <span>Phóng to</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-[#8C6D58]">
                        <span className="sm:hidden font-semibold text-[#D98A76]">
                          {formatSafeDate(item.date)}
                        </span>
                        {item.location && (
                          <span className="flex items-center gap-1 font-medium bg-[#F9F6F0] px-2.5 py-0.5 rounded-full">
                            <MapPin className="w-3 h-3 text-[#D98A76]" />
                            {item.location}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-[#E8A598]/15 text-[#D98A76] rounded-full text-[11px] font-semibold">
                          {item.tag || 'Kỷ niệm'}
                        </span>
                      </div>

                      <p className={`${fontClass} text-2xl text-[#3D2E28] leading-relaxed my-2`}>
                        "{item.caption}"
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#8C6D58]/10 mt-3">
                      <button
                        type="button"
                        onClick={(e) => handleLikeWithPulse(item, e)}
                        className={`relative flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                          item.isLiked
                            ? 'bg-[#E8A598] text-white shadow-xs'
                            : 'bg-[#F9F6F0] hover:bg-[#E8A598]/20 text-[#8C6D58]'
                        }`}
                        title="Thả tim kỷ niệm"
                      >
                        <span className="relative inline-flex items-center justify-center">
                          {heartAnimMap[item.id]?.liked && (
                            <>
                              <span
                                key={`t-ring-${heartAnimMap[item.id].seq}`}
                                aria-hidden="true"
                                className="animate-heart-ripple pointer-events-none absolute inset-0 rounded-full border-2 border-white/90"
                              />
                              <Heart
                                key={`t-spark-${heartAnimMap[item.id].seq}`}
                                aria-hidden="true"
                                className="animate-heart-spark pointer-events-none absolute -top-2 left-1/2 w-3 h-3 text-[#E8A598] fill-[#E8A598]"
                              />
                            </>
                          )}
                          <Heart
                            key={heartAnimMap[item.id] ? `t-heart-${heartAnimMap[item.id].seq}` : 't-heart-idle'}
                            className={`w-3.5 h-3.5 transition-colors ${
                              item.isLiked ? 'fill-white text-white' : 'text-[#E8A598]'
                            } ${
                              heartAnimMap[item.id]
                                ? heartAnimMap[item.id].liked
                                  ? 'animate-heart-vibrate-pulse'
                                  : 'animate-heart-gentle-tap'
                                : ''
                            }`}
                          />
                        </span>
                        <span className="tabular-nums">{item.likes || 0} yêu thích</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenShare(item)}
                          className="flex items-center gap-1 text-xs text-[#8C6D58] hover:text-[#3D2E28] bg-white px-2.5 py-1 rounded-lg border border-[#8C6D58]/15"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#D98A76]" />
                          <span>Khung ảnh</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemoryToDelete(item)}
                          className="p-1 text-[#8C6D58]/50 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Xóa kỷ niệm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA KỶ NIỆM (Đảm bảo xóa thành công cả kỷ niệm mặc định lẫn tự đăng) */}
      {memoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-2xl max-w-sm w-full p-6 text-center card-warm-pastel">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-200">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-serif-romantic text-xl font-bold text-[#3D2E28] mb-1.5">
              Xác nhận xóa kỷ niệm?
            </h3>
            <p className="text-xs text-[#8C6D58] mb-4 leading-relaxed">
              Kỷ niệm này sẽ được xóa vĩnh viễn khỏi hệ thống trên tất cả các điện thoại và máy tính của hai bạn.
            </p>
            {memoryToDelete.caption && (
              <div className="p-3 bg-[#FAF6F0] rounded-xl border border-[#8C6D58]/15 mb-5 text-left">
                <p className={`${fontClass} text-sm text-[#3D2E28] line-clamp-2`}>
                  "{memoryToDelete.caption}"
                </p>
              </div>
            )}
            <div className="flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => setMemoryToDelete(null)}
                className="flex-1 py-2 px-3 text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] bg-[#F9F6F0] rounded-xl transition-all cursor-pointer"
              >
                Giữ lại
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = memoryToDelete.id;
                  setMemoryToDelete(null);
                  onDeleteMemory(id);
                }}
                className="flex-1 py-2 px-3 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
