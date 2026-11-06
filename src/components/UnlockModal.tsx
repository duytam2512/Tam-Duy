import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, Eye, EyeOff, ShieldAlert, Heart } from 'lucide-react';
import { verifyPassword } from '../services/crypto';

interface UnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  expectedHash: string;
  hint?: string;
  onSuccess: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  isOpen,
  onClose,
  title,
  expectedHash,
  hint,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Vui lòng nhập mật khẩu để mở khóa.');
      return;
    }

    setIsVerifying(true);
    try {
      const isValid = await verifyPassword(password, expectedHash);
      if (isValid) {
        setPassword('');
        setError('');
        onSuccess();
        onClose();
      } else {
        setError('Mật khẩu không chính xác! Vui lòng thử lại.');
      }
    } catch {
      setError('Đã có lỗi trong quá trình xác thực.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl p-6 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300 mb-4 shadow-lg shadow-rose-500/10">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          Kỷ Niệm Được Bảo Mật
        </h3>
        <p className="text-xs text-emerald-300/70 mb-4 truncate">
          {title || 'Vui lòng nhập mật mã để mở khóa xem kỷ niệm'}
        </p>

        {hint && (
          <div className="mb-4 p-2.5 rounded-xl bg-[#081813] border border-emerald-800/60 text-[11px] text-rose-300 flex items-center justify-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>Gợi ý: {hint}</span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập mật khẩu / PIN..."
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full bg-[#081813] border border-emerald-700/60 rounded-xl px-4 py-2.5 text-sm text-center text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 pr-10 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setPassword('');
                setError('');
                onClose();
              }}
              className="flex-1 py-2.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isVerifying || !password}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20"
            >
              {isVerifying ? 'Đang mở...' : 'Mở Khóa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
