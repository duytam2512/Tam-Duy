import React, { useState } from 'react';
import { ShieldCheck, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { hashPassword } from '../services/crypto';
import { setMasterVaultPin, getMasterVaultPin } from '../services/storage';

interface VaultSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMasterPinUpdated: () => void;
}

export const VaultSettingsModal: React.FC<VaultSettingsModalProps> = ({
  isOpen,
  onClose,
  onMasterPinUpdated,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const currentPinHash = getMasterVaultPin();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!pin || pin.length < 4) {
      setError('Mã PIN nên có tối thiểu 4 số/ký tự.');
      return;
    }

    if (pin !== confirmPin) {
      setError('Xác nhận mã PIN không trùng khớp.');
      return;
    }

    try {
      const hash = await hashPassword(pin);
      setMasterVaultPin(hash);
      setSuccess('Đã cập nhật mã PIN Kho Riêng Tư thành công!');
      onMasterPinUpdated();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setError('Đã xảy ra lỗi khi lưu mã PIN.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06120e]/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0e241e] border border-emerald-700/50 rounded-3xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Mã PIN Tổng Kho Riêng Tư</h3>
            <p className="text-xs text-emerald-300/70">
              {currentPinHash ? 'Đổi mã PIN mở khóa kho' : 'Tạo mã PIN quản trị mở khóa'}
            </p>
          </div>
        </div>

        <p className="text-xs text-emerald-200/80 mb-4 bg-[#081813]/80 p-3 rounded-xl border border-emerald-800/40 leading-relaxed">
          Mã PIN này cho phép bạn mở khóa đồng thời tất cả các hình ảnh và video bí mật trong Nhà Chúng Mình mà không cần nhập mật khẩu cho từng tệp.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-emerald-200 mb-1">
              Mã PIN Mới (Tối thiểu 4 số/ký tự)
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                placeholder="Nhập mã PIN..."
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="w-full bg-[#081813] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400 hover:text-white"
              >
                {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-emerald-200 mb-1">
              Xác nhận mã PIN
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              placeholder="Nhập lại mã PIN..."
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value)}
              className="w-full bg-[#081813] border border-emerald-700/60 rounded-xl px-3.5 py-2 text-xs text-white placeholder-emerald-500/50 focus:outline-none focus:border-pink-400 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-emerald-950 hover:bg-emerald-900 text-emerald-300 text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 transition-all"
            >
              Lưu Mã PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
