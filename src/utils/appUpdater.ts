// Tiện ích kiểm tra và ép cập nhật bản mới cho PWA (đặc biệt tối ưu cho iPhone / iOS Safari Standalone)

const VERSION_STORAGE_KEY = 'gocnho_seen_app_version_v1';
const AUTO_RELOAD_GUARD_KEY = 'gocnho_last_auto_reload_ts';
export const PWA_UPDATE_EVENT = 'gocnho:pwa-update-available';

let initialLoadedVersion: string | null = null;
let swUpdateFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function registerSwUpdater(fn: (reloadPage?: boolean) => Promise<void>) {
  swUpdateFn = fn;
}

export function notifyUpdateAvailable(source: 'sw' | 'version' = 'sw') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PWA_UPDATE_EVENT, { detail: { source } }));
}

/**
 * Dọn tham số ?_refresh=... sau khi tải lại để thanh địa chỉ gọn gàng
 */
export function cleanupRefreshQueryParam() {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('_refresh')) {
      url.searchParams.delete('_refresh');
      window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    }
  } catch {
    // ignore
  }
}

/**
 * Kiểm tra xem người dùng có đang gõ nội dung trong ô nhập liệu không để tránh reload làm mất chữ
 */
export function isUserActivelyEditing(): boolean {
  if (typeof document === 'undefined') return false;
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || (active as HTMLElement).isContentEditable;
}

/**
 * Kiểm tra xem phiên bản trên máy chủ có thay đổi so với lúc mở app hay không
 */
export async function checkServerVersionMismatch(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch(`/api/app-version?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const serverVersion = typeof data?.version === 'string' ? data.version : null;
    if (!serverVersion) return false;

    if (!initialLoadedVersion) {
      initialLoadedVersion = serverVersion;
      const previousSeen = localStorage.getItem(VERSION_STORAGE_KEY);
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);
      // Nếu bản đã thấy trước đó khác hoàn toàn bản server hiện tại (chỉ tính bản prod) và chưa vừa reload
      if (previousSeen && previousSeen !== serverVersion && serverVersion.startsWith('prod-')) {
        const lastReload = Number(sessionStorage.getItem(AUTO_RELOAD_GUARD_KEY) || '0');
        if (Date.now() - lastReload > 15000) {
          return true;
        }
      }
      return false;
    }

    if (serverVersion !== initialLoadedVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, serverVersion);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Ép xóa toàn bộ Cache Storage & Service Worker cũ, sau đó tải lại phiên bản mới nhất.
 * KHÔNG xóa localStorage hay dữ liệu Firestore của hai bạn.
 */
export async function forceHardUpdateApp(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    sessionStorage.setItem(AUTO_RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // ignore
  }

  try {
    // 1. Kích hoạt SW đang chờ (nếu có)
    if (swUpdateFn) {
      try {
        await Promise.race([
          swUpdateFn(false),
          new Promise((resolve) => setTimeout(resolve, 1200)),
        ]);
      } catch {
        // ignore
      }
    }

    // 2. Xóa toàn bộ Cache Storage (HTML/JS/CSS cũ bị kẹt trên iOS Safari)
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }

    // 3. Hủy đăng ký Service Worker cũ để trình duyệt tải sạch bản mới nhất từ server
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(async (reg) => {
          try {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            await reg.unregister();
          } catch {
            // ignore
          }
        })
      );
    }
  } catch {
    // ignore and still reload
  }

  // 4. Tải lại với tham số phá cache HTTP của iOS Safari Standalone
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_refresh', String(Date.now()));
    window.location.replace(url.toString());
  } catch {
    window.location.reload();
  }
}
