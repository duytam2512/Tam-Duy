import React, { useState } from 'react';
import {
  Share2,
  Lock,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Download,
  Shield,
  Flower2,
  AlertCircle,
} from 'lucide-react';
import { MediaItem, SharedLink } from '../types';
import { hashPassword } from '../services/crypto';
import { addSharedLink } from '../services/storage';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItem: MediaItem;
  currentUser?: any;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  mediaItem,
  currentUser,
}) => {
  const [requiresPassword, setRequiresPassword] = useState(true);
  const [password, setPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [allowDownload, setAllowDownload] = useState(true);
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [createdLink, setCreatedLink] = useState<SharedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleGenerateLink = async () => {
    setError('');
    if (requiresPassword && (!password || password.length < 3)) {
      setError('Vui lòng nhập mật khẩu tối thiểu 3 ký tự cho liên kết bảo mật.');
      return;
    }

    setIsGenerating(true);
    try {
      const token = `love_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
      const passwordHash = requiresPassword ? await hashPassword(password) : undefined;
      const expiresAt = expiresInHours > 0 ? Date.now() + expiresInHours * 60 * 60 * 1000 : null;

      const newLink: SharedLink = {
        id: `link-${Date.now()}`,
        token,
        targetType: 'single',
        mediaItem,
        title: mediaItem.title,
        requiresPassword,
        passwordHash,
        passwordHint: passwordHint.trim() || undefined,
        allowDownload,
        expiresAt,
        createdAt: Date.now(),
        viewCount: 0,
        createdBy: currentUser?.displayName || 'Nhà Chúng Mình',
      };

      addSharedLink(newLink);
      setCreatedLink(newLink);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo liên kết chia sẻ.');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareUrl = createdLink
    ? `${window.location.origin}${window.location.pathname}?share=${createdLink.token}`
    : '';

  const copyToClipboard = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 border border-pink-400/30 text-rose-300 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Chia Sẻ Kỷ Niệm Cá Nhân</h3>
              <p className="text-xs text-emerald-300/70 truncate max-w-[260px]">{mediaItem.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-emerald-950 hover:bg-emerald-900 text-emerald-400 hover:text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!createdLink ? (
          <div className="py-4 space-y-4">
            {/* Password toggle */}
            <div className="p-3.5 rounded-2xl bg-[#081813]/80 border border-emerald-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-300" />
                  <div>
                    <p className="text-xs font-bold text-white">Khóa bảo vệ bằng mật khẩu</p>
                    <p className="text-[11px] text-emerald-300/70">
                      Người nhận phải nhập đúng mật mã mới mở được kỷ niệm
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresPassword}
                    onChange={e => setRequiresPassword(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-emerald-950 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-rose-500"></div>
                </label>
              </div>

              {requiresPassword && (
                <div className="pt-2 border-t border-emerald-900/60 space-y-2.5 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-[11px] text-emerald-200 font-semibold mb-1">
                      Mật khẩu cho người nhận
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 123456, yeuthuong2026..."
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full bg-[#0d241d] border border-emerald-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-emerald-200 font-semibold mb-1">
                      Gợi ý mật khẩu (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Ngày kỷ niệm của chúng mình, tên bài hát quê hương..."
                      value={passwordHint}
                      onChange={e => setPasswordHint(e.target.value)}
                      className="w-full bg-[#0d241d] border border-emerald-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expiration and Permissions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-[#081813]/80 border border-emerald-800/50 space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-pink-300" /> Thời hạn liên kết
                </label>
                <select
                  value={expiresInHours}
                  onChange={e => setExpiresInHours(Number(e.target.value))}
                  className="w-full bg-[#0d241d] border border-emerald-700/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-pink-400"
                >
                  <option value={1}>1 giờ</option>
                  <option value={24}>24 giờ (1 ngày)</option>
                  <option value={168}>7 ngày</option>
                  <option value={720}>30 ngày</option>
                  <option value={0}>Không hết hạn (Vĩnh viễn)</option>
                </select>
              </div>

              <div className="p-3 rounded-2xl bg-[#081813]/80 border border-emerald-800/50 space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
                  <Download className="w-3.5 h-3.5 text-emerald-300" /> Cho phép tải về
                </label>
                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-1.5 text-xs text-emerald-200 cursor-pointer">
                    <input
                      type="radio"
                      name="allowDownload"
                      checked={allowDownload}
                      onChange={() => setAllowDownload(true)}
                      className="accent-rose-500"
                    />
                    <span>Có</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-emerald-200 cursor-pointer">
                    <input
                      type="radio"
                      name="allowDownload"
                      checked={!allowDownload}
                      onChange={() => setAllowDownload(false)}
                      className="accent-rose-500"
                    />
                    <span>Chỉ xem</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateLink}
              disabled={isGenerating}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500 hover:from-emerald-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20 flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" />
              <span>{isGenerating ? 'Đang tạo liên kết an toàn...' : 'Tạo Liên Kết Chia Sẻ'}</span>
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-4 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs text-center space-y-1">
              <p className="font-bold text-sm text-white">🌸 Liên Kết Đã Sẵn Sàng Để Gửi Đi!</p>
              <p className="text-emerald-300/80">
                {createdLink.requiresPassword
                  ? 'Liên kết đã được mã hóa bảo mật với mật khẩu.'
                  : 'Liên kết công khai sẵn sàng để người thân xem.'}
              </p>
            </div>

            {/* URL Copy box */}
            <div>
              <label className="block text-xs font-semibold text-emerald-200 mb-1">
                Đường dẫn chia sẻ trực tiếp:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-[#081813] border border-emerald-700/60 rounded-xl px-3 py-2 text-xs text-rose-300 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={copyToClipboard}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white'
                  }`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Đã sao chép!' : 'Sao chép'}</span>
                </button>
              </div>
            </div>

            {createdLink.requiresPassword && (
              <div className="p-3 rounded-xl bg-[#081813] border border-emerald-800/60 text-xs space-y-1">
                <p className="text-emerald-300/80">
                  Mật khẩu người nhận:{' '}
                  <span className="font-mono font-bold text-rose-300">{password}</span>
                </p>
                {passwordHint && (
                  <p className="text-emerald-400/60 text-[11px]">Gợi ý: {passwordHint}</p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1 underline underline-offset-4"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Xem thử giao diện người nhận</span>
              </a>

              <button
                onClick={() => setCreatedLink(null)}
                className="text-xs text-emerald-400 hover:text-white"
              >
                Tạo link khác
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
