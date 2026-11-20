import React, { useEffect, useState } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';
import {
  PWA_UPDATE_EVENT,
  checkServerVersionMismatch,
  forceHardUpdateApp,
} from '../utils/appUpdater';

export const AppUpdateBanner: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;

    const runVersionCheck = async () => {
      const mismatch = await checkServerVersionMismatch();
      if (mounted && mismatch) {
        setHasUpdate(true);
      }
    };

    const handleSwEvent = () => {
      if (mounted) setHasUpdate(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        runVersionCheck();
      }
    };

    runVersionCheck();
    window.addEventListener(PWA_UPDATE_EVENT, handleSwEvent);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', runVersionCheck);
    window.addEventListener('online', runVersionCheck);

    const timer = window.setInterval(runVersionCheck, 60 * 1000);

    return () => {
      mounted = false;
      window.removeEventListener(PWA_UPDATE_EVENT, handleSwEvent);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', runVersionCheck);
      window.removeEventListener('online', runVersionCheck);
      window.clearInterval(timer);
    };
  }, []);

  if (!hasUpdate) return null;

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    await forceHardUpdateApp();
  };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[70] w-[calc(100%-1.5rem)] max-w-md animate-fade-in">
      <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-[#3D2E28]/95 text-[#FFFDF9] px-3.5 py-2.5 shadow-2xl border border-[#E8A598]/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#E8A598]/20 text-[#F9DCC4] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold leading-tight">Đã có bản cập nhật mới</p>
            <p className="text-[11px] text-[#F9DCC4]/85 truncate">
              Bấm cập nhật để dùng tính năng mới nhất nhé
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleUpdateNow}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#C87D55] to-[#E8A598] text-white text-xs font-semibold shadow-sm hover:opacity-95 active:scale-95 transition disabled:opacity-70 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? 'Đang tải...' : 'Cập nhật'}</span>
          </button>
          <button
            type="button"
            onClick={() => setHasUpdate(false)}
            aria-label="Đóng thông báo cập nhật"
            className="p-1 rounded-lg text-[#F9DCC4]/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
