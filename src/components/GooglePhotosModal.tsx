import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Check,
  RefreshCw,
  Plus,
  AlertCircle,
  Video,
  Download,
  Search,
  Flower2,
} from 'lucide-react';
import { DriveMediaFile, fetchDrivePhotosAndVideos } from '../services/googleDrivePhotos';
import { MediaItem } from '../types';

interface GooglePhotosModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  onGoogleLogin: () => void;
  onImportItems: (items: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

export const GooglePhotosModal: React.FC<GooglePhotosModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onGoogleLogin,
  onImportItems,
}) => {
  const [files, setFiles] = useState<DriveMediaFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen && currentUser) {
      loadMedia();
    }
  }, [isOpen, currentUser]);

  const loadMedia = async () => {
    setIsLoading(true);
    setError('');
    try {
      const items = await fetchDrivePhotosAndVideos(currentUser?.email);
      setFiles(items);
    } catch (err: any) {
      setError(err.message || 'Không thể tải ảnh/video từ Google Photos.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredFiles.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredFiles.map(f => f.id)));
    }
  };

  const handleImport = () => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    if (selectedFiles.length === 0) return;

    const itemsToImport: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[] = selectedFiles.map(f => ({
      title: f.name.replace(/\.[^/.]+$/, ''),
      type: f.isVideo ? 'video' : 'image',
      url: f.webViewLink || f.webContentLink || f.thumbnailLink || '',
      thumbnailUrl: f.thumbnailLink || f.webContentLink,
      source: 'google_photo',
      location: 'Google Photos Làng Quê',
      album: 'Kỷ Niệm Đồng Bộ',
      ownerName: currentUser?.displayName || 'Google Photos',
      ownerEmail: currentUser?.email,
      isProtected: false,
      tags: ['Google Photos', f.isVideo ? 'Video' : 'Ảnh quê hương'],
      fileSize: f.size,
    }));

    onImportItems(itemsToImport);
    onClose();
  };

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-emerald-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Duyệt Google Photos
              </h2>
              <p className="text-xs text-emerald-300/70">
                Nhập nhanh các hình ảnh, video kỷ niệm từ tài khoản Google vào Nhà Chúng Mình
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {!currentUser ? (
            <div className="text-center py-12 space-y-3">
              <ImageIcon className="w-12 h-12 text-emerald-700 mx-auto" />
              <h3 className="text-base font-bold text-white">Yêu Cầu Kết Nối Google Photos</h3>
              <p className="text-xs text-emerald-300/70 max-w-sm mx-auto">
                Vui lòng đăng nhập tài khoản Google để chọn và đồng bộ ảnh từ thư viện Google Photos của bạn.
              </p>
              <button
                onClick={onGoogleLogin}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-100 to-pink-100 hover:from-white hover:to-pink-50 text-emerald-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
              >
                <span>Đăng Nhập Google Ngay</span>
              </button>
            </div>
          ) : (
            <>
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400/60" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên tệp..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-[#081813] border border-emerald-800/60 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={selectAll}
                    disabled={filteredFiles.length === 0}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold transition-colors"
                  >
                    {selectedIds.size === filteredFiles.length && filteredFiles.length > 0
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                  <button
                    onClick={loadMedia}
                    disabled={isLoading}
                    className="p-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 transition-colors"
                    title="Tải lại danh sách"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {isLoading ? (
                <div className="text-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-rose-300 animate-spin mx-auto" />
                  <p className="text-xs text-emerald-300/70">Đang tìm hình ảnh kỷ niệm từ Google Photos...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-emerald-800/40 rounded-2xl">
                  <p className="text-xs text-emerald-300/70">Không tìm thấy ảnh hoặc video nào trong tài khoản.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredFiles.map(file => {
                    const isSelected = selectedIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => toggleSelect(file.id)}
                        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-pink-400 ring-2 ring-pink-400/30 shadow-lg shadow-pink-400/20'
                            : 'border-emerald-800/50 hover:border-emerald-700'
                        }`}
                      >
                        <img
                          src={file.thumbnailLink || file.webContentLink}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />

                        <div
                          className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-rose-500 text-white shadow-md font-bold'
                              : 'bg-black/50 text-white/50 border border-white/30'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>

                        {file.isVideo && (
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[9px] text-white flex items-center gap-1 font-mono">
                            <Video className="w-3 h-3 text-pink-300" /> Video
                          </div>
                        )}

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-left">
                          <p className="text-[11px] font-semibold text-white truncate" title={file.name}>
                            {file.name}
                          </p>
                          {file.size && (
                            <p className="text-[9px] text-emerald-300/70 font-mono">{file.size}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {currentUser && (
          <div className="p-4 border-t border-emerald-800/50 bg-[#0a1a15]/90 flex items-center justify-between text-xs">
            <span className="text-emerald-300/80">
              Đã chọn <strong className="text-rose-300">{selectedIds.size}</strong> tệp
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleImport}
                disabled={selectedIds.size === 0}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 disabled:opacity-40 text-white font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Thêm Vào Nhà Chúng Mình ({selectedIds.size})</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
