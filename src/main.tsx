import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Chỉ đăng ký Service Worker trong môi trường production (tránh lỗi 404 sw.js khi dev trong iframe)
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        // Tải lại khi có phiên bản mới
        updateSW(true);
      },
      onOfflineReady() {
        console.log('[PWA] Sẵn sàng hoạt động ngoại tuyến');
      },
      onRegisteredSW(swUrl, registration) {
        if (registration) {
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60000);
        }
      },
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        navigator.serviceWorker.ready
          .then((reg) => {
            reg.update().catch(() => {});
          })
          .catch(() => {});
      }
    });
  } catch (err) {
    console.warn('[PWA] Bỏ qua đăng ký service worker:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
