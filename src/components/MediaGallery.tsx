import React, { useState, useMemo } from 'react';
import {
  Play,
  Lock,
  Unlock,
  Share2,
  Image as ImageIcon,
  Heart,
  Search,
  Grid,
  List,
  Sparkles,
  MapPin,
  Flower2,
  Calendar,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import { MediaItem } from '../types';
import { isMediaUnlocked } from '../services/crypto';

interface MediaGalleryProps {
  items: MediaItem[];
  onOpenViewer: (item: MediaItem) => void;
  onOpenShare: (item: MediaItem) => void;
  onOpenLock: (item: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onUnlockItem: (item: MediaItem) => void;
  isVaultUnlocked: boolean;
}

export type FilterCategory = 'all' | 'image' | 'video' | 'google_photo' | 'protected' | 'favorites';

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  items,
  onOpenViewer,
  onOpenShare,
  onOpenLock,
  onToggleFavorite,
  onUnlockItem,
  isVaultUnlocked,
}) => {
  const [activeTab, setActiveTab] = useState<FilterCategory>('all');
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  // Collect albums
  const allAlbums = useMemo(() => {
    const albumSet = new Set<string>();
    items.forEach(i => {
      if (i.album) albumSet.add(i.album);
    });
    return Array.from(albumSet);
  }, [items]);

  // Collect tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    items.forEach(i => i.tags?.forEach(t => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [items]);

  // Filtered and sorted
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Tab filter
        if (activeTab === 'image' && item.type !== 'image') return false;
        if (activeTab === 'video' && item.type !== 'video') return false;
        if (activeTab === 'google_photo' && item.source !== 'google_photo') return false;
        if (activeTab === 'protected' && !item.isProtected) return false;
        if (activeTab === 'favorites' && !item.isFavorite) return false;

        // Album filter
        if (selectedAlbum && item.album !== selectedAlbum) return false;

        // Tag filter
        if (selectedTag && (!item.tags || !item.tags.includes(selectedTag))) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchLocation = item.location?.toLowerCase().includes(q);
          const matchAlbum = item.album?.toLowerCase().includes(q);
          const matchTags = item.tags?.some(t => t.toLowerCase().includes(q));
          const matchNotes = item.notes?.toLowerCase().includes(q);
          if (!matchTitle && !matchLocation && !matchAlbum && !matchTags && !matchNotes) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return b.createdAt - a.createdAt;
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        return a.title.localeCompare(b.title);
      });
  }, [items, activeTab, selectedAlbum, selectedTag, searchQuery, sortBy]);

  const handleItemClick = (item: MediaItem) => {
    if (item.isProtected && !isVaultUnlocked && !isMediaUnlocked(item.id)) {
      onUnlockItem(item);
    } else {
      onOpenViewer(item);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search, Filter Tabs & Album Filter */}
      <div className="space-y-4">
        {/* Search Row */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400/80" />
            <input
              type="text"
              placeholder="Tìm kiếm kỷ niệm, cánh đồng lúa, đầm sen, hoàng hôn..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0c1f19]/90 border border-emerald-800/40 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-emerald-100 placeholder-emerald-400/40 focus:outline-none focus:border-pink-400/60 focus:ring-1 focus:ring-pink-400/30 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            {/* Sort */}
            <div className="flex items-center bg-[#0c1f19] border border-emerald-800/40 rounded-xl px-2.5 py-1 text-xs text-emerald-200">
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-rose-300" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="bg-transparent border-0 text-xs text-emerald-200 focus:outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#0c1f19]">Mới nhất</option>
                <option value="oldest" className="bg-[#0c1f19]">Cũ nhất</option>
                <option value="title" className="bg-[#0c1f19]">Theo tên</option>
              </select>
            </div>

            {/* View mode */}
            <div className="flex items-center bg-[#0c1f19] border border-emerald-800/40 rounded-xl p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-r from-emerald-600 to-rose-500 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-white'
                }`}
                title="Dạng lưới ảnh thơ mộng"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-emerald-600 to-rose-500 text-white shadow-sm'
                    : 'text-emerald-400 hover:text-white'
                }`}
                title="Dạng danh sách"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'Tất cả kỷ niệm', count: items.length },
            { id: 'image', label: 'Hình ảnh quê hương', count: items.filter(i => i.type === 'image').length },
            { id: 'video', label: 'Video làng quê', count: items.filter(i => i.type === 'video').length },
            { id: 'google_photo', label: 'Google Photos', count: items.filter(i => i.source === 'google_photo').length },
            { id: 'protected', label: '🔒 Kho Mật Khẩu', count: items.filter(i => i.isProtected).length },
            { id: 'favorites', label: 'Yêu thích ❤️', count: items.filter(i => i.isFavorite).length },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as FilterCategory);
                  setSelectedAlbum(null);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500 text-white shadow-md shadow-emerald-700/20'
                    : 'bg-[#0e241e]/80 hover:bg-[#122e27] text-emerald-200/80 hover:text-white border border-emerald-800/40'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Albums Row */}
        {allAlbums.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider shrink-0 flex items-center gap-1">
              <Flower2 className="w-3.5 h-3.5 text-pink-400" /> Album:
            </span>
            <button
              onClick={() => setSelectedAlbum(null)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                selectedAlbum === null
                  ? 'bg-rose-500/20 text-rose-200 border border-rose-500/40'
                  : 'bg-[#0d221c] text-emerald-300/70 hover:text-white border border-emerald-900/60'
              }`}
            >
              Tất cả album
            </button>
            {allAlbums.map(alb => (
              <button
                key={alb}
                onClick={() => setSelectedAlbum(selectedAlbum === alb ? null : alb)}
                className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedAlbum === alb
                    ? 'bg-gradient-to-r from-emerald-500/20 to-rose-500/20 text-rose-200 border border-rose-400/40'
                    : 'bg-[#0d221c] text-emerald-300/80 hover:text-white border border-emerald-900/60'
                }`}
              >
                {alb}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Media Items Display */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-[#0c1f19]/60 border border-dashed border-emerald-800/40 rounded-3xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 border border-pink-400/30 text-rose-300 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <ImageIcon className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-emerald-100 mb-1">Chưa có kỷ niệm nào trong mục này</h3>
          <p className="text-xs text-emerald-300/70 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `Không tìm thấy hình ảnh nào với từ khóa "${searchQuery}". Hãy thử tìm kiếm khác.`
              : 'Hãy nhấp vào "Thêm Kỷ Niệm" để tải lên những khoảnh khắc đẹp của làng quê và gia đình!'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Mode */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isItemLocked = item.isProtected && !isVaultUnlocked && !isMediaUnlocked(item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group relative bg-[#0e251f]/85 hover:bg-[#133028] rounded-2xl border border-emerald-800/40 hover:border-pink-400/50 overflow-hidden shadow-lg transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-0.5"
              >
                {/* Media Image / Video Thumbnail */}
                <div className="relative aspect-[4/3] bg-[#07130f] overflow-hidden">
                  {isItemLocked ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#091713] to-[#1a1219] text-center">
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center mb-2 shadow-lg shadow-rose-500/10 group-hover:scale-110 transition-transform">
                        <Lock className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-rose-300">Kỷ niệm riêng tư</p>
                      <p className="text-[10px] text-emerald-300/60 mt-1">Khóa bằng mật mã bảo vệ</p>
                    </div>
                  ) : (
                    <>
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      {item.type === 'video' && (
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-r from-emerald-600 to-rose-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                            <Play className="w-5 h-5 ml-0.5 fill-white" />
                          </div>
                          {item.duration && (
                            <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-white font-mono">
                              {item.duration}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
                    {/* Location Badge */}
                    <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full text-[10px] text-emerald-200 border border-emerald-500/30">
                      <MapPin className="w-3 h-3 text-rose-300 shrink-0" />
                      <span className="truncate max-w-[120px]">{item.location || 'Làng quê mình'}</span>
                    </div>

                    {/* Lock Status */}
                    {item.isProtected && (
                      <span
                        className={`p-1 rounded-full ${
                          isItemLocked
                            ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                            : 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                        }`}
                        title={isItemLocked ? 'Đang khóa bằng mật mã' : 'Đã mở khóa phiên này'}
                      >
                        {isItemLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-3.5 flex flex-col justify-between flex-1 space-y-2">
                  <div>
                    {item.album && (
                      <span className="text-[10px] font-semibold text-rose-300/90 block mb-1">
                        🌸 {item.album}
                      </span>
                    )}
                    <h4
                      className="text-xs font-bold text-emerald-100 group-hover:text-rose-200 line-clamp-1 transition-colors"
                      title={item.title}
                    >
                      {item.title}
                    </h4>
                    {item.notes && (
                      <p className="text-[11px] text-emerald-300/70 line-clamp-1 mt-0.5 italic">
                        "{item.notes}"
                      </p>
                    )}
                  </div>

                  {/* Bottom Action Bar */}
                  <div className="flex items-center justify-between pt-1 border-t border-emerald-900/60 text-xs">
                    <span className="text-[10px] text-emerald-400/60">
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                    </span>

                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onToggleFavorite(item.id)}
                        className="p-1 rounded-lg hover:bg-emerald-900/50 text-emerald-400 hover:text-rose-400 transition-colors"
                        title="Yêu thích"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${item.isFavorite ? 'text-rose-400 fill-rose-400' : ''}`}
                        />
                      </button>

                      <button
                        onClick={() => onOpenLock(item)}
                        className="p-1 rounded-lg hover:bg-emerald-900/50 text-emerald-400 hover:text-rose-300 transition-colors"
                        title="Cài đặt khóa mật khẩu"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onOpenShare(item)}
                        className="p-1 rounded-lg hover:bg-emerald-900/50 text-emerald-400 hover:text-pink-300 transition-colors"
                        title="Chia sẻ có mật khẩu"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-2">
          {filteredItems.map(item => {
            const isItemLocked = item.isProtected && !isVaultUnlocked && !isMediaUnlocked(item.id);

            return (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className="group flex items-center justify-between p-3 rounded-2xl bg-[#0e251f]/85 hover:bg-[#133028] border border-emerald-800/40 hover:border-pink-400/40 transition-all cursor-pointer gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-14 h-12 rounded-xl bg-[#07130f] overflow-hidden shrink-0 relative flex items-center justify-center">
                    {isItemLocked ? (
                      <Lock className="w-4 h-4 text-rose-300" />
                    ) : (
                      <>
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                        {item.type === 'video' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white fill-white" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="truncate">
                    <h4 className="text-xs font-bold text-emerald-100 group-hover:text-rose-200 truncate">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-emerald-400/70 mt-0.5">
                      <span>{item.type === 'video' ? 'Video' : 'Ảnh'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{item.location || item.album}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  {item.isProtected && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-semibold flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Mật khẩu
                    </span>
                  )}
                  <button
                    onClick={() => onToggleFavorite(item.id)}
                    className="p-1.5 hover:bg-emerald-900/50 rounded-lg text-emerald-400 hover:text-rose-400"
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'text-rose-400 fill-rose-400' : ''}`} />
                  </button>
                  <button
                    onClick={() => onOpenLock(item)}
                    className="p-1.5 hover:bg-emerald-900/50 rounded-lg text-emerald-400 hover:text-rose-300"
                  >
                    <Lock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onOpenShare(item)}
                    className="p-1.5 hover:bg-emerald-900/50 rounded-lg text-emerald-400 hover:text-pink-300"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
