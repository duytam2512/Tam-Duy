import React from 'react';
import { WifiOff, Cloud } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-24 sm:bottom-6 left-4 z-50 flex items-center gap-2.5 rounded-full bg-[#8C6D58] text-white px-4 py-2 text-xs font-medium shadow-xl border border-white/20 animate-fade-in backdrop-blur-md">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#E8A598] opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E8A598]"></span>
      </span>
      <WifiOff className="w-4 h-4 text-[#FDEEE9]" />
      <span>Đang xem offline. Dữ liệu sẽ tự đồng bộ ngay khi có mạng trở lại.</span>
    </div>
  );
};
