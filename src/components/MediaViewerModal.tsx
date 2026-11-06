import React, { useState } from 'react';
import {
  X,
  Download,
  Share2,
  Lock,
  Unlock,
  Heart,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Calendar,
  HardDrive,
  User,
  MapPin,
  Flower2,
} from 'lucide-react';
import { MediaItem } from '../types';

interface MediaViewerModalProps {
  media: MediaItem | null;
  onClose: () => void;
  onShare: (media: MediaItem) => void;
  onLock: (media: MediaItem) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  media,
  onClose,
  onShare,
  onLock,
  onToggleFavorite,
  onDelete,
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!media) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const isYouTube =
    media.url.includes('youtube.com') || media.url.includes('youtu.be');
  const ytVideoId = isYouTube
    ? media.url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-[#05110d]/95 backdrop-blur-xl animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl h-[92vh] bg-[#0d241e] border border-emerald-700/50 rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden">
        {/* Main Preview Area */}
        <div className="flex-1 flex flex-col bg-black/60 relative overflow-hidden min-h-0">
          {/* Top Control Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 pointer-events-auto bg-[#071712]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-800/40 text-xs text-white">
              <span className="font-semibold truncate max-w-[200px]">{media.title}</span>
              {media.isProtected && (
                <span className="flex items-center gap-1 text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-full text-[10px]">
                  <Lock className="w-3 h-3" /> Đã bảo vệ
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto bg-[#071712]/80 backdrop-blur-md p-1.5 rounded-full border border-emerald-800/40">
              {media.type === 'image' && (
                <>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-emerald-900 rounded-full text-emerald-300 hover:text-white transition-colors"
                    title="Phóng to"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-emerald-900 rounded-full text-emerald-300 hover:text-white transition-colors"
                    title="Thu nhỏ"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-1.5 hover:bg-emerald-900 rounded-full text-emerald-300 hover:text-white transition-colors"
                    title="Xoay 90 độ"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-rose-500/20 hover:text-rose-300 rounded-full text-emerald-400 transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Media Content */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-auto">
            {media.type === 'video' ? (
              isYouTube && ytVideoId ? (
                <div className="w-full h-full max-w-4xl max-h-[75vh] aspect-video rounded-2xl overflow-hidden shadow-2xl">
                  <iframe
                    src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1`}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <video
                  src={media.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[75vh] rounded-2xl object-contain shadow-2xl"
                />
              )
            ) : (
              <img
                src={media.url}
                alt={media.title}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease',
                }}
                className="max-w-full max-h-[75vh] object-contain rounded-xl select-none"
              />
            )}
          </div>
        </div>

        {/* Sidebar Info & Controls */}
        <div className="w-full md:w-80 bg-[#0d241e] border-t md:border-t-0 md:border-l border-emerald-800/40 flex flex-col justify-between p-5 overflow-y-auto">
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                {media.type === 'video' ? 'Video Quê Hương' : 'Hình Ảnh Thơ Mộng'}
              </span>
              <h2 className="text-base font-extrabold text-white mt-1.5 break-words">
                {media.title}
              </h2>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onShare(media)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ bảo mật</span>
              </button>

              <button
                onClick={() => onLock(media)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  media.isProtected
                    ? 'bg-rose-500/15 text-rose-300 border-rose-500/40 hover:bg-rose-500/25'
                    : 'bg-emerald-900/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-800/50'
                }`}
              >
                {media.isProtected ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{media.isProtected ? 'Đổi mật mã' : 'Đặt mật mã'}</span>
              </button>
            </div>

            {/* Location & Album Card */}
            {(media.location || media.album) && (
              <div className="p-3.5 rounded-2xl bg-[#091a15]/80 border border-emerald-800/40 space-y-1.5 text-xs">
                {media.location && (
                  <div className="flex items-center gap-1.5 text-emerald-200">
                    <MapPin className="w-3.5 h-3.5 text-rose-300" />
                    <span className="font-semibold">{media.location}</span>
                  </div>
                )}
                {media.album && (
                  <div className="flex items-center gap-1.5 text-pink-300 text-[11px]">
                    <Flower2 className="w-3.5 h-3.5" />
                    <span>Album: {media.album}</span>
                  </div>
                )}
              </div>
            )}

            {/* Notes / Thoughts */}
            {media.notes && (
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-800/30 text-xs text-emerald-200/90 italic leading-relaxed">
                "{media.notes}"
              </div>
            )}

            {/* Metadata Info List */}
            <div className="space-y-2.5 text-xs text-emerald-300/80 border-t border-emerald-800/40 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400/60 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Người lưu:
                </span>
                <span className="font-semibold text-white truncate max-w-[140px]">
                  {media.ownerName || 'Chúng Mình'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-emerald-400/60 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Thời gian:
                </span>
                <span>{new Date(media.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>

              {media.fileSize && (
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400/60 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5" /> Dung lượng:
                  </span>
                  <span className="font-mono">{media.fileSize}</span>
                </div>
              )}

              {media.duration && (
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400/60">Thời lượng:</span>
                  <span className="font-mono">{media.duration}</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-emerald-800/40 pt-4 mt-4 space-y-2">
            <a
              href={media.url}
              target="_blank"
              rel="noreferrer"
              download
              className="w-full py-2.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-emerald-700/40"
            >
              <Download className="w-4 h-4" />
              <span>Tải Xuống Thiết Bị</span>
            </a>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onToggleFavorite(media.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-colors ${
                  media.isFavorite
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:text-white'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${media.isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span>{media.isFavorite ? 'Đã yêu thích' : 'Yêu thích'}</span>
              </button>

              <button
                onClick={() => {
                  if (window.confirm('Bạn có chắc muốn xóa kỷ niệm này?')) {
                    onDelete(media.id);
                    onClose();
                  }
                }}
                className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors"
                title="Xóa kỷ niệm"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
