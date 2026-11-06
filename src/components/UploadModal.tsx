import React, { useState } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Lock,
  Plus,
  AlertCircle,
  FileUp,
  MapPin,
  Flower2,
  Camera,
  X,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { MediaItem } from '../types';
import { hashPassword } from '../services/crypto';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMedia: (media: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onAddBatchMedia?: (items: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  currentUser?: any;
}

interface SelectedFilePreview {
  file: File;
  previewUrl: string;
  name: string;
  size: string;
  type: 'image' | 'video';
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAddMedia,
  onAddBatchMedia,
  currentUser,
}) => {
  const [tab, setTab] = useState<'file' | 'url'>('file');
  const [selectedFiles, setSelectedFiles] = useState<SelectedFilePreview[]>([]);
  const [url, setUrl] = useState('');
  const [singleTitle, setSingleTitle] = useState('');
  const [location, setLocation] = useState('Cánh Đồng Làng Quê');
  const [album, setAlbum] = useState('Góc Nhỏ Của Hai Đứa');
  const [tagsInput, setTagsInput] = useState('làng quê, bình yên, kỷ niệm');
  const [notes, setNotes] = useState('');

  // Password lock
  const [protectWithPassword, setProtectWithPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError('');

    const newPreviews: SelectedFilePreview[] = [];
    Array.from(files).forEach(file => {
      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onload = () => {
        newPreviews.push({
          file,
          previewUrl: reader.result as string,
          name: file.name.replace(/\.[^/.]+$/, ''),
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          type: isVideo ? 'video' : 'image',
        });
        if (newPreviews.length === files.length) {
          setSelectedFiles(prev => [...prev, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'file') {
      if (selectedFiles.length === 0) {
        setError('Vui lòng chọn ít nhất một hình ảnh hoặc video để tải lên.');
        return;
      }
    } else {
      if (!url.trim()) {
        setError('Vui lòng nhập đường link hình ảnh hoặc video.');
        return;
      }
    }

    if (protectWithPassword && (!password || password.length < 3)) {
      setError('Vui lòng nhập mật khẩu tối thiểu 3 ký tự.');
      return;
    }

    setIsSubmitting(true);
    try {
      let passwordHash: string | undefined = undefined;
      if (protectWithPassword) {
        passwordHash = await hashPassword(password);
      }

      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      if (tab === 'file') {
        const itemsToSave: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[] = selectedFiles.map(
          item => ({
            title: item.name,
            type: item.type,
            url: item.previewUrl,
            thumbnailUrl: item.type === 'image' ? item.previewUrl : undefined,
            source: 'upload',
            location: location.trim() || 'Làng quê mình',
            album: album.trim() || 'Ký Ức Bình Dị',
            ownerName: currentUser?.displayName || 'Chúng Mình',
            ownerEmail: currentUser?.email,
            isProtected: protectWithPassword,
            passwordHash,
            passwordHint: passwordHint.trim() || undefined,
            tags: tags.length > 0 ? tags : ['Quê hương', 'Kỷ niệm'],
            notes: notes.trim() || undefined,
            fileSize: item.size,
          })
        );

        if (onAddBatchMedia && itemsToSave.length > 1) {
          onAddBatchMedia(itemsToSave);
        } else {
          itemsToSave.forEach(i => onAddMedia(i));
        }
      } else {
        const isVideo =
          url.includes('youtube.com') ||
          url.includes('youtu.be') ||
          url.endsWith('.mp4') ||
          url.endsWith('.webm');

        onAddMedia({
          title: singleTitle.trim() || 'Kỷ Niệm Thơ Mộng Mới',
          type: isVideo ? 'video' : 'image',
          url: url.trim(),
          thumbnailUrl: !isVideo ? url.trim() : undefined,
          source: 'url',
          location: location.trim() || 'Làng quê mình',
          album: album.trim() || 'Ký Ức Bình Dị',
          ownerName: currentUser?.displayName || 'Chúng Mình',
          ownerEmail: currentUser?.email,
          isProtected: protectWithPassword,
          passwordHash,
          passwordHint: passwordHint.trim() || undefined,
          tags: tags.length > 0 ? tags : ['Kỷ niệm', 'Liên kết'],
          notes: notes.trim() || undefined,
        });
      }

      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu kỷ niệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 border border-pink-400/30 text-rose-300 flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-emerald-100 flex items-center gap-2">
                Tải Kỷ Niệm Lên Nhà Chúng Mình
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  Hỗ trợ nhiều tệp
                </span>
              </h3>
              <p className="text-xs text-emerald-300/70">Kéo thả ảnh từ điện thoại, máy tính hoặc chèn đường dẫn</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 pt-4">
          <button
            onClick={() => setTab('file')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'file'
                ? 'bg-gradient-to-r from-emerald-600 to-rose-500 text-white shadow-md'
                : 'bg-[#081813] text-emerald-300/70 hover:text-white border border-emerald-900/60'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải ảnh & video từ thiết bị</span>
          </button>
          <button
            onClick={() => setTab('url')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              tab === 'url'
                ? 'bg-gradient-to-r from-emerald-600 to-rose-500 text-white shadow-md'
                : 'bg-[#081813] text-emerald-300/70 hover:text-white border border-emerald-900/60'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Chèn liên kết URL</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="overflow-y-auto space-y-4 py-4 flex-1 pr-1">
          {tab === 'file' ? (
            <div className="space-y-3">
              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center transition-all bg-[#081813]/70 ${
                  isDragging
                    ? 'border-pink-400 bg-pink-500/10 scale-[1.01]'
                    : 'border-emerald-700/60 hover:border-pink-400/60'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                </div>

                <p className="text-xs font-bold text-emerald-100">
                  Kéo thả nhiều ảnh/video vào đây hoặc chọn từ máy
                </p>
                <p className="text-[11px] text-emerald-300/60 mt-0.5">
                  Hỗ trợ PNG, JPG, WebP, GIF, MP4, WebM (chọn nhiều tệp cùng lúc)
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <label className="px-3.5 py-1.5 rounded-xl bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-xs font-semibold cursor-pointer border border-emerald-700/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={e => handleFiles(e.target.files)}
                      className="hidden"
                    />
                    <span>Chọn tệp từ máy tính</span>
                  </label>

                  <label className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold cursor-pointer border border-rose-500/40 transition-colors flex items-center gap-1">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={e => handleFiles(e.target.files)}
                      className="hidden"
                    />
                    <Camera className="w-3.5 h-3.5" />
                    <span>Chụp ảnh mới</span>
                  </label>
                </div>
              </div>

              {/* Selected Files Preview Grid */}
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-emerald-200 font-semibold">
                    <span>Đã chọn ({selectedFiles.length} tệp)</span>
                    <button
                      type="button"
                      onClick={() => setSelectedFiles([])}
                      className="text-[11px] text-rose-300 hover:text-white"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-44 overflow-y-auto pr-1">
                    {selectedFiles.map((item, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-[#07130f] border border-emerald-800/80 shadow"
                      >
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-rose-500 text-white flex items-center justify-center transition-colors text-xs"
                          title="Xóa tệp này"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 text-[9px] text-white truncate">
                          {item.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">
                  Đường dẫn liên kết hình ảnh / video
                </label>
                <input
                  type="text"
                  placeholder="https://... dán link ảnh hoặc YouTube / MP4 video..."
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  className="w-full bg-[#081813] border border-emerald-800/60 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-200 mb-1">Tựa đề</label>
                <input
                  type="text"
                  placeholder="VD: Cánh đồng hoa sen buổi sáng..."
                  value={singleTitle}
                  onChange={e => setSingleTitle(e.target.value)}
                  className="w-full bg-[#081813] border border-emerald-800/60 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400"
                />
              </div>
            </div>
          )}

          {/* Location & Album */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-300" /> Địa điểm
              </label>
              <input
                type="text"
                placeholder="VD: Cánh Đồng Mùa Gặt..."
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full bg-[#081813] border border-emerald-800/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1 flex items-center gap-1">
                <Flower2 className="w-3 h-3 text-pink-400" /> Album
              </label>
              <select
                value={album}
                onChange={e => setAlbum(e.target.value)}
                className="w-full bg-[#081813] border border-emerald-800/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-400"
              >
                <option value="Góc Nhỏ Của Hai Đứa">Góc Nhỏ Của Hai Đứa</option>
                <option value="Làng Quê Thanh Bình">Làng Quê Thanh Bình</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-200 mb-1">Cảm nghĩ / Lời nhắn gửi</label>
            <textarea
              rows={2}
              placeholder="Vài dòng lưu bút về khoảnh khắc yên bình này..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#081813] border border-emerald-800/60 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400"
            />
          </div>

          {/* Password Protection */}
          <div className="p-3.5 rounded-2xl bg-[#081813]/80 border border-emerald-800/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-300" />
                <div>
                  <p className="text-xs font-bold text-white">Khóa bảo vệ bằng mật khẩu</p>
                  <p className="text-[10px] text-emerald-300/70">
                    Chỉ người có mật mã mới xem được kỷ niệm này
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={protectWithPassword}
                onChange={e => setProtectWithPassword(e.target.checked)}
                className="w-4 h-4 accent-rose-500 cursor-pointer"
              />
            </div>

            {protectWithPassword && (
              <div className="pt-2 border-t border-emerald-900/60 space-y-2">
                <input
                  type="text"
                  placeholder="Nhập mật khẩu (VD: 123456)..."
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0d241d] border border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-500/50 font-mono"
                />
                <input
                  type="text"
                  placeholder="Gợi ý mật khẩu (Tùy chọn)..."
                  value={passwordHint}
                  onChange={e => setPasswordHint(e.target.value)}
                  className="w-full bg-[#0d241d] border border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-emerald-500/50"
                />
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>
                {isSubmitting
                  ? 'Đang lưu...'
                  : selectedFiles.length > 1
                  ? `Lưu ${selectedFiles.length} Tệp Vào Kho`
                  : 'Lưu Vào Nhà Chúng Mình'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
