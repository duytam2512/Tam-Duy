import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import {
  cleanupRefreshQueryParam,
  isUserActivelyEditing,
  notifyUpdateAvailable,
  registerSwUpdater,
} from './utils/appUpdater';

cleanupRefreshQueryParam();

// Đăng ký Service Worker tự động cập nhật (tối ưu cho iPhone / iOS Safari Standalone)
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    let hasReloadedForController = false;
    const GUARD_KEY = 'gocnho_sw_ctrl_reload_ts';

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hasReloadedForController) return;
      const lastReload = Number(sessionStorage.getItem(GUARD_KEY) || '0');
      if (Date.now() - lastReload < 15000) return;

      if (isUserActivelyEditing()) {
        notifyUpdateAvailable('sw');
        return;
      }

      hasReloadedForController = true;
      sessionStorage.setItem(GUARD_KEY, String(Date.now()));
      window.location.reload();
    });

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (!registration) return;

        const checkForSwUpdate = () => {
          registration.update().catch(() => {});
        };

        // Kiểm tra ngay khi mở app và mỗi lần quay lại app từ màn hình chính iPhone
        checkForSwUpdate();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            checkForSwUpdate();
          }
        });
        window.addEventListener('pageshow', checkForSwUpdate);
        window.addEventListener('online', checkForSwUpdate);
        window.setInterval(checkForSwUpdate, 60 * 1000);
      },
      onNeedRefresh() {
        if (!isUserActivelyEditing()) {
          updateSW(true).catch(() => {
            notifyUpdateAvailable('sw');
          });
        } else {
          notifyUpdateAvailable('sw');
        }
      },
      onOfflineReady() {
        // Sẵn sàng hoạt động ngoại tuyến
      },
    });

    registerSwUpdater(updateSW);
  } catch (err) {
    console.warn('[PWA] Bỏ qua đăng ký service worker:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
