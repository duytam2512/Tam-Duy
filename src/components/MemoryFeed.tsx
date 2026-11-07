import React, { useState, useMemo } from 'react';
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
  Layers
} from 'lucide-react';
import { Memory, ViewMode, POPULAR_TAGS, CoupleInfo } from '../types';

interface MemoryFeedProps {
  memories: Memory[];
  coupleInfo: CoupleInfo;
  onToggleLike: (id: string) => void;
  onDeleteMemory: (id: string) => void;
  onOpenLightbox: (memory: Memory) => void;
  onOpenShare: (memory: Memory) => void;
  onOpenQuickUpload: () => void;
}

export const MemoryFeed: React.FC<MemoryFeedProps> = ({
  memories,
  coupleInfo,
  onToggleLike,
  onDeleteMemory,
  onOpenLightbox,
  onOpenShare,
  onOpenQuickUpload
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('masonry');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('Tất cả');
  const [selectedYear, setSelectedYear] = useState('all');

  // Lấy danh sách các năm có kỷ niệm
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    memories.forEach((m) => {
      if (m.date) {
        years.add(m.date.split('-')[0]);
      }
    });
    return Array.from(years).sort().reverse();
  }, [memories]);

  // Bộ lọc tìm kiếm
  const filteredMemories = useMemo(() => {
    return memories.filter((m) => {
      // 1. Tag
      if (selectedTag !== 'Tất cả' && m.tag !== selectedTag) {
        return false;
      }
      // 2. Year
      if (selectedYear !== 'all' && !m.date.startsWith(selectedYear)) {
        return false;
      }
      // 3. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const inCaption = m.caption.toLowerCase().includes(query);
        const inLocation = m.location?.toLowerCase().includes(query);
        const inDate = m.date.includes(query);
        if (!inCaption && !inLocation && !inDate) {
          return false;
        }
      }
      return true;
    });
  }, [memories, selectedTag, selectedYear, searchQuery]);

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
              className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-[#E8A598] text-white font-semibold shadow-xs'
                  : 'bg-white hover:bg-[#F9F6F0] text-[#8C6D58] border border-[#8C6D58]/15'
              }`}
            >
              {tag}
            </button>
          ))}
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
                {/* Photo with click to open Lightbox */}
                <div
                  onClick={() => onOpenLightbox(item)}
                  className="relative rounded-xl overflow-hidden cursor-pointer bg-[#F9F6F0] aspect-4/3 group-hover:opacity-95"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.caption}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Tag badge */}
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs text-[#D98A76] text-[11px] font-semibold rounded-full shadow-xs flex items-center gap-1">
                    <Tag className="w-2.5 h-2.5" />
                    <span>{item.tag || 'Kỷ niệm'}</span>
                  </div>

                  {/* Multi-photo badge */}
                  {item.images && item.images.length > 1 && (
                    <div className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold rounded-full shadow-xs flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#E8A598]" />
                      <span>{item.images.length} ảnh</span>
                    </div>
                  )}

                  {/* Hover hint */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                    Bấm để phóng to ảnh
                  </div>
                </div>

                {/* Details */}
                <div className="pt-4 px-1">
                  {/* Date & Location */}
                  <div className="flex items-center justify-between text-xs text-[#8C6D58] mb-2 font-medium">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#E8A598]" />
                      {new Date(item.date).toLocaleDateString('vi-VN')}
                    </span>

                    {item.location && (
                      <span className="flex items-center gap-1 max-w-[150px] truncate" title={item.location}>
                        <MapPin className="w-3.5 h-3.5 text-[#D98A76] shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                    )}
                  </div>

                  {/* Caption / Diary */}
                  <p className="font-handwriting text-xl sm:text-2xl text-[#3D2E28] leading-snug line-clamp-3">
                    "{item.caption}"
                  </p>
                </div>
              </div>

              {/* Action Footer: Like, Share, Delete */}
              <div className="pt-4 px-1 mt-3 border-t border-[#8C6D58]/10 flex items-center justify-between">
                <button
                  onClick={() => onToggleLike(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    item.isLiked
                      ? 'bg-[#E8A598] text-white shadow-xs'
                      : 'bg-[#F9F6F0] hover:bg-[#E8A598]/20 text-[#8C6D58]'
                  }`}
                  title="Thả tim kỷ niệm"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      item.isLiked ? 'fill-white text-white' : 'text-[#E8A598]'
                    }`}
                  />
                  <span>{item.likes || 0}</span>
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
                    onClick={() => {
                      if (confirm('Bạn có chắc muốn xóa kỷ niệm này không?')) {
                        onDeleteMemory(item.id);
                      }
                    }}
                    className="p-1.5 text-[#8C6D58]/60 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
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
                <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598]" />
              </div>

              {/* Date in desktop left gutter */}
              <div className="hidden sm:block absolute -left-36 top-5 text-right w-28">
                <div className="font-serif-romantic font-bold text-sm text-[#3D2E28]">
                  {new Date(item.date).toLocaleDateString('vi-VN', {
                    day: 'numeric',
                    month: 'short'
                  })}
                </div>
                <div className="text-xs text-[#8C6D58]">
                  {new Date(item.date).getFullYear()}
                </div>
              </div>

              {/* Timeline Card */}
              <div className="card-warm-pastel rounded-2xl p-4 sm:p-6 transition-all hover:shadow-lg">
                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Photo */}
                  <div
                    onClick={() => onOpenLightbox(item)}
                    className="sm:w-48 h-48 rounded-xl overflow-hidden cursor-pointer bg-[#F9F6F0] shrink-0 relative group"
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.images && item.images.length > 1 && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/65 backdrop-blur-xs text-white text-[10px] font-bold rounded-full shadow-xs flex items-center gap-1">
                        <Layers className="w-2.5 h-2.5 text-[#E8A598]" />
                        <span>{item.images.length} ảnh</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2 text-xs text-[#8C6D58]">
                        <span className="sm:hidden font-semibold text-[#D98A76]">
                          {new Date(item.date).toLocaleDateString('vi-VN')}
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

                      <p className="font-handwriting text-2xl text-[#3D2E28] leading-relaxed my-2">
                        "{item.caption}"
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#8C6D58]/10 mt-3">
                      <button
                        onClick={() => onToggleLike(item.id)}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          item.isLiked
                            ? 'bg-[#E8A598] text-white shadow-xs'
                            : 'bg-[#F9F6F0] text-[#8C6D58]'
                        }`}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            item.isLiked ? 'fill-white text-white' : 'text-[#E8A598]'
                          }`}
                        />
                        <span>{item.likes || 0} yêu thích</span>
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
                          onClick={() => {
                            if (confirm('Xóa kỷ niệm này?')) onDeleteMemory(item.id);
                          }}
                          className="p-1 text-[#8C6D58]/50 hover:text-rose-600 rounded-lg"
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
    </section>
  );
};
