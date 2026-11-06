/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { MediaGallery } from './components/MediaGallery';
import { MediaViewerModal } from './components/MediaViewerModal';
import { ShareModal } from './components/ShareModal';
import { PasswordLockModal } from './components/PasswordLockModal';
import { UnlockModal } from './components/UnlockModal';
import { UploadModal } from './components/UploadModal';
import { GooglePhotosModal } from './components/GooglePhotosModal';
import { VaultSettingsModal } from './components/VaultSettingsModal';
import { DeployHubModal } from './components/DeployHubModal';
import { PublicShareView } from './components/PublicShareView';

import { MediaItem, ConnectedAccount } from './types';
import {
  getStoredMedia,
  saveStoredMedia,
  getMasterVaultPin,
} from './services/storage';
import {
  initAuth,
  googleSignIn,
  logout,
  getConnectedAccounts,
} from './services/firebase';
import {
  markMediaUnlocked,
  setVaultUnlockedState,
  getVaultUnlockedState,
} from './services/crypto';

import {
  Heart,
  Flower2,
  Sparkles,
  MapPin,
  Bell,
  Home,
  Globe,
  ImageIcon,
} from 'lucide-react';

export default function App() {
  // Check for share link in URL (?share=<token>)
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    if (token) {
      setShareToken(token);
    }
  }, []);

  // Main data state
  const [mediaItems, setMediaItems] = useState<MediaItem[]>(() => getStoredMedia());

  // Auth & Multi-account state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>([]);

  // Toast
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // Vault Unlock state
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(getVaultUnlockedState());

  // Modal controls
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const [isVaultSettingsOpen, setIsVaultSettingsOpen] = useState(false);
  const [isDeployHubOpen, setIsDeployHubOpen] = useState(false);

  // Active items for modals
  const [viewerItem, setViewerItem] = useState<MediaItem | null>(null);
  const [shareItem, setShareItem] = useState<MediaItem | null>(null);
  const [lockItem, setLockItem] = useState<MediaItem | null>(null);

  // Unlock modal target (single item or master vault)
  const [unlockTarget, setUnlockTarget] = useState<{
    type: 'item' | 'vault';
    item?: MediaItem;
    expectedHash: string;
    hint?: string;
  } | null>(null);

  // Save media on change
  const updateMediaItems = (items: MediaItem[]) => {
    setMediaItems(items);
    saveStoredMedia(items);
  };

  // Toast notification helper
  const showToast = (title: string, message: string) => {
    setToastNotification({
      id: Math.random().toString(),
      title,
      message,
    });
    setTimeout(() => {
      setToastNotification(null);
    }, 5000);
  };

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setConnectedAccounts(getConnectedAccounts());
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Google Login
  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        setConnectedAccounts(getConnectedAccounts());
        showToast('Chào Mừng Trở Về', `Xin chào, ${result.user.displayName || result.user.email}!`);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      showToast('Đăng Nhập Thất Bại', err.message || 'Không thể đăng nhập Google.');
    }
  };

  // Logout
  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setConnectedAccounts([]);
    showToast('Đã Đăng Xuất', 'Bạn đã đăng xuất an toàn.');
  };

  // Add single media
  const handleAddMedia = (data: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newItem: MediaItem = {
      ...data,
      id: `memory-${now}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: now,
      updatedAt: now,
    };
    updateMediaItems([newItem, ...mediaItems]);
    showToast('Đã Lưu Kỷ Niệm', `"${newItem.title}" đã được lưu vào Nhà Chúng Mình.`);
  };

  // Add batch media
  const handleAddBatchMedia = (items: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const now = Date.now();
    const newItems: MediaItem[] = items.map((data, index) => ({
      ...data,
      id: `memory-${now}-${index}-${Math.random().toString(36).substring(2, 5)}`,
      createdAt: now - index * 50,
      updatedAt: now,
    }));
    updateMediaItems([...newItems, ...mediaItems]);
    showToast('Đã Tải Lên Thành Công', `Đã thêm ${newItems.length} hình ảnh vào Nhà Chúng Mình.`);
  };

  // Import media from Google Photos
  const handleImportGooglePhotos = (
    items: Omit<MediaItem, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => {
    const now = Date.now();
    const newItems: MediaItem[] = items.map((data, index) => ({
      ...data,
      id: `gphoto-${now}-${index}`,
      createdAt: now - index * 100,
      updatedAt: now,
    }));
    updateMediaItems([...newItems, ...mediaItems]);
    showToast(
      'Đã Đồng Bộ Google Photos',
      `Đã chuyển thành công ${items.length} tệp ảnh vào Nhà Chúng Mình.`
    );
  };

  // Toggle favorite
  const handleToggleFavorite = (id: string) => {
    const updated = mediaItems.map(m =>
      m.id === id ? { ...m, isFavorite: !m.isFavorite } : m
    );
    updateMediaItems(updated);
  };

  // Delete media item
  const handleDeleteMedia = (id: string) => {
    const updated = mediaItems.filter(m => m.id !== id);
    updateMediaItems(updated);
    showToast('Đã Xóa Kỷ Niệm', 'Đã xóa tệp khỏi kho lưu trữ.');
  };

  // Password Protection for individual item
  const handleSetItemPassword = (passwordHash: string, hint?: string) => {
    if (!lockItem) return;
    const updated = mediaItems.map(m =>
      m.id === lockItem.id
        ? {
            ...m,
            isProtected: true,
            passwordHash,
            passwordHint: hint,
          }
        : m
    );
    updateMediaItems(updated);
    showToast('Đã Khóa Bảo Mật', `Kỷ niệm "${lockItem.title}" hiện được bảo vệ bằng mật khẩu.`);
    setLockItem(null);
  };

  const handleRemoveItemPassword = () => {
    if (!lockItem) return;
    const updated = mediaItems.map(m =>
      m.id === lockItem.id
        ? {
            ...m,
            isProtected: false,
            passwordHash: undefined,
            passwordHint: undefined,
          }
        : m
    );
    updateMediaItems(updated);
    showToast('Đã Gỡ Khóa', `Đã hủy mật mã bảo vệ cho "${lockItem.title}".`);
    setLockItem(null);
  };

  // Toggle Vault Lock
  const handleToggleVaultLock = () => {
    if (isVaultUnlocked) {
      setVaultUnlockedState(false);
      setIsVaultUnlocked(false);
      showToast('Đã Khóa Kho Riêng Tư', 'Tất cả kỷ niệm bí mật đã được khóa an toàn.');
    } else {
      const pinHash = getMasterVaultPin();
      if (!pinHash) {
        setIsVaultSettingsOpen(true);
      } else {
        setUnlockTarget({
          type: 'vault',
          expectedHash: pinHash,
          hint: 'Mã PIN tổng bạn đã cài đặt cho kho',
        });
      }
    }
  };

  // If visiting public share link
  if (shareToken) {
    return (
      <PublicShareView
        token={shareToken}
        onGoHome={() => {
          setShareToken(null);
          window.history.replaceState({}, '', window.location.pathname);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-green-pink-gradient text-emerald-100 flex flex-col font-sans selection:bg-pink-500 selection:text-white">
      {/* Header */}
      <Header
        currentUser={currentUser}
        connectedAccounts={connectedAccounts}
        memoriesCount={mediaItems.length}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenPhotos={() => setIsPhotosOpen(true)}
        onOpenDeployHub={() => setIsDeployHubOpen(true)}
        onGoogleLogin={handleGoogleLogin}
        onLogout={handleLogout}
        onOpenVaultSettings={() => setIsVaultSettingsOpen(true)}
        isVaultUnlocked={isVaultUnlocked}
        onToggleVaultLock={handleToggleVaultLock}
      />

      {/* Floating Toast Notification */}
      {toastNotification && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-[#0f2821]/95 backdrop-blur-xl border border-pink-400/40 rounded-2xl shadow-2xl p-4 text-xs animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/20 to-rose-500/20 text-rose-300 flex items-center justify-center shrink-0">
              <Flower2 className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white text-xs mb-0.5">{toastNotification.title}</p>
              <p className="text-emerald-200/90 text-[11px] leading-relaxed">{toastNotification.message}</p>
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-emerald-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Hero Welcome Banner: Nhà chúng mình. Nơi bình yên của hai đứa */}
      <section className="relative overflow-hidden border-b border-emerald-800/30 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/15 to-rose-500/15 text-rose-200 text-xs font-bold border border-rose-400/30 shadow-sm">
                <Flower2 className="w-3.5 h-3.5 text-pink-400" />
                Nhà chúng mình. Nơi bình yên của hai đứa
              </span>
              <span className="text-xs text-emerald-400/50">•</span>
              <span className="text-xs text-emerald-300/80">
                {mediaItems.length} khoảnh khắc được lưu giữ
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-100 via-pink-100 to-rose-200 bg-clip-text text-transparent">
              Nhà Chúng Mình • Nơi Bình Yên Của Hai Đứa
            </h2>
            <p className="text-xs sm:text-sm text-emerald-200/80 mt-1.5 max-w-2xl leading-relaxed">
              Những buổi sớm ngắm sương đọng trên cánh đồng lúa chín, đầm sen ngát hương, tiếng ve râm ran và bóng hoàng hôn êm đềm bên lũy tre làng. Tích hợp tính năng tải ảnh đa tệp, bảo mật mật khẩu cá nhân và chia sẻ ấm áp.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsDeployHubOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-200 border border-emerald-700/50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:border-pink-400/40"
              title="Google SEO, Google Console, Vercel & GitHub"
            >
              <Globe className="w-3.5 h-3.5 text-pink-300" />
              <span>SEO & Deploy</span>
            </button>

            <button
              onClick={() => setIsPhotosOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-200 border border-emerald-700/50 text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm hover:border-pink-400/40"
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-300" />
              <span>Google Photos</span>
            </button>

            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-4.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Heart className="w-3.5 h-3.5 fill-white/80" />
              <span>Tải Kỷ Niệm Lên</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Gallery Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MediaGallery
          items={mediaItems}
          onOpenViewer={item => setViewerItem(item)}
          onOpenShare={item => setShareItem(item)}
          onOpenLock={item => setLockItem(item)}
          onToggleFavorite={handleToggleFavorite}
          onUnlockItem={item => {
            setUnlockTarget({
              type: 'item',
              item,
              expectedHash: item.passwordHash || '',
              hint: item.passwordHint,
            });
          }}
          isVaultUnlocked={isVaultUnlocked}
        />
      </main>

      {/* Modals */}
      {/* 1. Media Viewer Modal */}
      <MediaViewerModal
        media={viewerItem}
        onClose={() => setViewerItem(null)}
        onShare={item => {
          setViewerItem(null);
          setShareItem(item);
        }}
        onLock={item => {
          setViewerItem(null);
          setLockItem(item);
        }}
        onToggleFavorite={handleToggleFavorite}
        onDelete={handleDeleteMedia}
      />

      {/* 2. Share with Password Modal */}
      {shareItem && (
        <ShareModal
          isOpen={!!shareItem}
          onClose={() => setShareItem(null)}
          mediaItem={shareItem}
          currentUser={currentUser}
        />
      )}

      {/* 3. Password Lock Settings for Item */}
      {lockItem && (
        <PasswordLockModal
          isOpen={!!lockItem}
          onClose={() => setLockItem(null)}
          targetTitle={lockItem.title}
          isCurrentlyProtected={lockItem.isProtected}
          onConfirm={handleSetItemPassword}
          onRemoveLock={handleRemoveItemPassword}
        />
      )}

      {/* 4. Unlock Modal for Item or Master Vault */}
      {unlockTarget && (
        <UnlockModal
          isOpen={!!unlockTarget}
          onClose={() => setUnlockTarget(null)}
          title={
            unlockTarget.type === 'vault'
              ? 'Mở Khóa Kho Riêng Tư Nhà Chúng Mình'
              : unlockTarget.item?.title
          }
          expectedHash={unlockTarget.expectedHash}
          hint={unlockTarget.hint}
          onSuccess={() => {
            if (unlockTarget.type === 'vault') {
              setVaultUnlockedState(true);
              setIsVaultUnlocked(true);
              showToast('Đã Mở Khóa', 'Kho bí mật hiện đã mở cho phiên này.');
            } else if (unlockTarget.item) {
              markMediaUnlocked(unlockTarget.item.id);
              setViewerItem(unlockTarget.item);
              showToast('Mở Khóa Thành Công', `Đã mở khóa "${unlockTarget.item.title}".`);
            }
          }}
        />
      )}

      {/* 5. Upload / Add Modal with Batch Multi-file Upload */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddMedia={handleAddMedia}
        onAddBatchMedia={handleAddBatchMedia}
        currentUser={currentUser}
      />

      {/* 6. Google Photos Browser Modal */}
      <GooglePhotosModal
        isOpen={isPhotosOpen}
        onClose={() => setIsPhotosOpen(false)}
        currentUser={currentUser}
        onGoogleLogin={handleGoogleLogin}
        onImportItems={handleImportGooglePhotos}
      />

      {/* 7. Vault Settings Modal */}
      <VaultSettingsModal
        isOpen={isVaultSettingsOpen}
        onClose={() => setIsVaultSettingsOpen(false)}
        onMasterPinUpdated={() => {
          showToast('Mã PIN Đã Lưu', 'Bạn có thể dùng mã PIN này để mở khóa toàn bộ kho bí mật.');
        }}
      />

      {/* 8. Deploy Hub Modal (Google SEO, Search Console, Vercel, GitHub) */}
      <DeployHubModal
        isOpen={isDeployHubOpen}
        onClose={() => setIsDeployHubOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-emerald-900/40 bg-[#071712] py-6 px-4 text-center text-xs text-emerald-300/60">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="flex items-center justify-center gap-1.5 font-medium text-emerald-200">
            <span>Nhà chúng mình. Nơi bình yên của hai đứa</span>
          </p>
          <div className="flex items-center gap-4 text-emerald-400/80">
            <span>Mã hóa SHA-256</span>
            <span>•</span>
            <span>Google SEO &amp; Search Console</span>
            <span>•</span>
            <span>Vercel &amp; GitHub Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
