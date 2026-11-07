import React, { useState } from 'react';
import { Smartphone, Download, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  variant?: 'nav' | 'hero' | 'floating';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'nav' }) => {
  const { isInstalled } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Nếu người dùng đã cài đặt và đang mở dưới dạng App standalone, hiển thị trạng thái nhẹ hoặc ẩn
  if (isInstalled && variant === 'floating') {
    return null;
  }

  return (
    <>
      {variant === 'nav' ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/90 hover:bg-[#FAF6F0] text-[#8C6D58] hover:text-[#3D2E28] border border-[#E8A598]/40 shadow-xs hover:shadow transition"
          title="Cài đặt App trên điện thoại hoặc máy tính"
        >
          {isInstalled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline text-emerald-700 font-semibold">Bản App</span>
            </>
          ) : (
            <>
              <Smartphone className="w-3.5 h-3.5 text-[#C87D55]" />
              <span>Cài Đặt App</span>
            </>
          )}
        </button>
      ) : variant === 'hero' ? (
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-semibold bg-gradient-to-r from-[#FAF6F0] to-[#FFF5F2] hover:from-white hover:to-[#FAF6F0] text-[#8C6D58] hover:text-[#3D2E28] border border-[#E8A598]/50 shadow-sm hover:shadow transition transform active:scale-98"
        >
          <Smartphone className="w-4 h-4 text-[#C87D55]" />
          <span>Tải Về Điện Thoại (App)</span>
        </button>
      ) : (
        /* Floating mobile banner */
        <div className="fixed bottom-20 sm:bottom-6 right-4 z-40 animate-bounce-subtle">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-[#C87D55] to-[#E8A598] text-white shadow-lg hover:shadow-xl transition transform active:scale-95 border border-white/30"
          >
            <Smartphone className="w-4 h-4" />
            <span>Cài App Điện Thoại</span>
          </button>
        </div>
      )}

      <PWAInstallModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};
