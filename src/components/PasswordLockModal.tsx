import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { hashPassword } from '../services/crypto';

interface PasswordLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTitle: string;
  isCurrentlyProtected: boolean;
  onConfirm: (passwordHash: string, hint?: string) => void;
  onRemoveLock?: () => void;
}

export const PasswordLockModal: React.FC<PasswordLockModalProps> = ({
  isOpen,
  onClose,
  targetTitle,
  isCurrentlyProtected,
  onConfirm,
  onRemoveLock,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hint, setHint] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Vui lòng nhập mật khẩu bảo vệ.');
      return;
    }

    if (password.length < 4) {
      setError('Mật khẩu nên có tối thiểu 4 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      const hash = await hashPassword(password);
      onConfirm(hash, hint.trim() || undefined);
      setPassword('');
      setConfirmPassword('');
      setHint('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi mã hóa mật khẩu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              {isCurrentlyProtected ? 'Đổi Mật Khẩu Kỷ Niệm' : 'Khóa Bảo Vệ Kỷ Niệm'}
            </h3>
            <p className="text-xs text-emerald-300/70 truncate max-w-[260px]">{targetTitle}</p>
          </div>
        </div>

        <p className="text-xs text-emerald-200/80 mb-4 bg-[#081813]/80 p-3 rounded-xl border border-emerald-800/40 leading-relaxed">
          Kỷ niệm này sẽ được bảo vệ bằng mật khẩu. Chỉ khi nhập đúng mật mã mới có thể xem và tải tệp về.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-200 mb-1">
              Mật khẩu / Mã PIN bảo vệ
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#081813] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-200 mb-1">
              Xác nhận lại mật khẩu
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu..."
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full bg-[#081813] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-200 mb-1">
              Gợi ý mật khẩu (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="VD: Ngày đi chơi đồng quê, số nhà cũ..."
              value={hint}
              onChange={e => setHint(e.target.value)}
              className="w-full bg-[#081813] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {isCurrentlyProtected && onRemoveLock ? (
              <button
                type="button"
                onClick={onRemoveLock}
                className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-colors border border-rose-500/30"
              >
                Gỡ khóa bảo mật
              </button>
            ) : (
              <div></div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold text-xs transition-all shadow-md shadow-rose-500/20 flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu Mật Khẩu'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
