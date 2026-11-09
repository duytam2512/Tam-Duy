import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Chỉ đăng ký Service Worker trong môi trường production khi người dùng truy cập web thực tế
if (import.meta.env.PROD && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    registerSW({
      immediate: false,
      onNeedRefresh() {
        // Không tự động giật màn hình hoặc reload giữa chừng khi người dùng đang nhập liệu hoặc đăng ảnh
        console.log('[PWA] Đã có bản cập nhật mới sẵn sàng cho phiên tiếp theo');
      },
      onOfflineReady() {
        console.log('[PWA] Sẵn sàng hoạt động ngoại tuyến');
      },
    });
  } catch (err) {
    console.warn('[PWA] Bỏ qua đăng ký service worker:', err);
  }
}

createRoot(document.getElementById('root')!).render(<App />);
