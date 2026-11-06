import React, { useState, useEffect } from 'react';
import {
  Lock,
  Download,
  KeyRound,
  ShieldAlert,
  Eye,
  EyeOff,
  Home,
  MapPin,
  Flower2,
  ArrowLeft,
  Clock,
  Sparkles,
} from 'lucide-react';
import { SharedLink } from '../types';
import { getSharedLinkByToken, incrementShareViewCount } from '../services/storage';
import { verifyPassword } from '../services/crypto';

interface PublicShareViewProps {
  token: string;
  onGoHome: () => void;
}

export const PublicShareView: React.FC<PublicShareViewProps> = ({ token, onGoHome }) => {
  const [linkData, setLinkData] = useState<SharedLink | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const data = getSharedLinkByToken(token);
    if (!data) {
      setNotFound(true);
      return;
    }

    if (data.expiresAt && Date.now() > data.expiresAt) {
      setIsExpired(true);
      setLinkData(data);
      return;
    }

    setLinkData(data);
    incrementShareViewCount(token);

    if (!data.requiresPassword) {
      setIsUnlocked(true);
    }
  }, [token]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput || !linkData?.passwordHash) return;

    setIsVerifying(true);
    setErrorMsg('');

    try {
      const valid = await verifyPassword(passwordInput, linkData.passwordHash);
      if (valid) {
        setIsUnlocked(true);
      } else {
        setErrorMsg('Mật khẩu bảo mật không chính xác. Vui lòng thử lại!');
      }
    } catch {
      setErrorMsg('Đã có lỗi trong quá trình xác thực.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#071511] text-emerald-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Không Tìm Thấy Liên Kết Kỷ Niệm</h1>
        <p className="text-sm text-emerald-300/70 max-w-md mb-6">
          Liên kết có thể đã bị xóa hoặc đường dẫn URL không chính xác.
        </p>
        <button
          onClick={onGoHome}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Về Nhà Chúng Mình
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-[#071511] text-emerald-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center mb-4">
          <Clock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Liên Kết Đã Hết Hạn</h1>
        <p className="text-sm text-emerald-300/70 max-w-md mb-6">
          Người gửi đã giới hạn thời gian mở xem và liên kết này hiện đã hết hạn.
        </p>
        <button
          onClick={onGoHome}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" /> Về Trang Chủ
        </button>
      </div>
    );
  }

  const media = linkData?.mediaItem;

  return (
    <div className="min-h-screen bg-green-pink-gradient text-emerald-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-emerald-800/40 bg-emerald-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2 text-xs font-bold text-emerald-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Nhà Chúng Mình</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span className="text-xs text-rose-300/90 font-medium">Kỷ niệm chia sẻ riêng tư</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex items-center justify-center">
        {!isUnlocked ? (
          /* Password Lock Form */
          <div className="w-full max-w-md bg-[#0e241e] border border-emerald-700/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center mb-5 shadow-lg shadow-rose-500/10">
              <Lock className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-white mb-2">Kỷ Niệm Riêng Tư Có Mật Khẩu</h2>
            <p className="text-xs text-emerald-300/70 mb-6 leading-relaxed">
              Người gửi ({linkData?.createdBy}) đã đặt mật khẩu bảo vệ cho bức ảnh/video này. Vui lòng nhập mật mã để mở xem.
            </p>

            {linkData?.passwordHint && (
              <div className="mb-5 p-3 rounded-2xl bg-[#081813] border border-emerald-800/60 text-xs text-rose-300 flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Gợi ý mật mã: {linkData.passwordHint}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-5 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật mã mở khóa..."
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                  autoFocus
                  className="w-full bg-[#081813] border border-emerald-700/60 rounded-2xl px-4 py-3 text-sm text-center text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 pr-12 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={isVerifying || !passwordInput}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500 hover:from-emerald-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-rose-500/20"
              >
                {isVerifying ? 'Đang mở khóa...' : 'Mở Khóa Kỷ Niệm'}
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Media View */
          <div className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-3xl overflow-hidden bg-[#0e241e] border border-emerald-700/50 shadow-2xl">
              {media?.type === 'video' ? (
                <div className="aspect-video bg-black flex items-center justify-center">
                  <video
                    src={media.url}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="p-2 sm:p-4 bg-[#081813]/80 flex items-center justify-center min-h-[300px] max-h-[70vh]">
                  <img
                    src={media?.url}
                    alt={media?.title}
                    className="max-w-full max-h-[65vh] object-contain rounded-2xl shadow-lg"
                  />
                </div>
              )}

              {/* Media Info Footer */}
              <div className="p-6 bg-[#0e241e] border-t border-emerald-800/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                      {media?.type === 'video' ? 'Video Làng Quê' : 'Hình Ảnh Thơ Mộng'}
                    </span>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white mt-1.5">
                      {media?.title}
                    </h1>
                    <p className="text-xs text-emerald-300/70 mt-1 flex items-center gap-2">
                      <span>Gửi bởi: {linkData?.createdBy}</span>
                      <span>•</span>
                      <span>Lượt xem: {linkData?.viewCount}</span>
                    </p>
                  </div>

                  {linkData?.allowDownload && (
                    <a
                      href={media?.url}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-500/20 transition-all shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải Kỷ Niệm Về Máy</span>
                    </a>
                  )}
                </div>

                {media?.notes && (
                  <p className="text-xs text-emerald-200/90 bg-[#081813]/80 p-3.5 rounded-xl border border-emerald-800/40 italic leading-relaxed">
                    "{media.notes}"
                  </p>
                )}

                {media?.location && (
                  <div className="flex items-center gap-2 text-xs text-emerald-300/80 pt-2 border-t border-emerald-900/60">
                    <MapPin className="w-4 h-4 text-rose-300" />
                    <span>Địa điểm: <b>{media.location}</b></span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
