import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Tự động kiểm tra và cập nhật phiên bản mới ngay lập tức khi có thay đổi trên Google Studio
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Kích hoạt ngay service worker mới và tải lại trang
    updateSW(true);
  },
  onOfflineReady() {
    console.log('[PWA] Ứng dụng đã sẵn sàng chạy offline');
  },
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      // Định kỳ kiểm tra bản build mới từ Google Studio
      setInterval(() => {
        registration.update().catch(() => {});
      }, 30000);
    }
  },
});

// Tự động kiểm tra bản cập nhật mới mỗi khi người dùng mở lại hoặc chuyển về tab App
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.ready.then((reg) => {
        reg.update().catch(() => {});
      });
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
