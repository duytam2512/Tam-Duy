import React, { useState } from 'react';
import {
  Heart,
  Home,
  Image as ImageIcon,
  Plus,
  Lock,
  LogOut,
  UserCheck,
  ShieldCheck,
  Globe,
  Flower2,
} from 'lucide-react';
import { ConnectedAccount } from '../types';

interface HeaderProps {
  currentUser: any;
  connectedAccounts: ConnectedAccount[];
  memoriesCount: number;
  onOpenUpload: () => void;
  onOpenPhotos: () => void;
  onOpenDeployHub: () => void;
  onGoogleLogin: () => void;
  onLogout: () => void;
  onOpenVaultSettings: () => void;
  isVaultUnlocked: boolean;
  onToggleVaultLock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  connectedAccounts,
  memoriesCount,
  onOpenUpload,
  onOpenPhotos,
  onOpenDeployHub,
  onGoogleLogin,
  onLogout,
  onOpenVaultSettings,
  isVaultUnlocked,
  onToggleVaultLock,
}) => {
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-emerald-950/80 border-b border-emerald-800/30 transition-all shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-3">
          {/* Logo & Brand: Nhà Chúng Mình */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-rose-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-[#0d221c] rounded-[14px] flex items-center justify-center">
                <Home className="w-5 h-5 text-rose-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-200 via-pink-200 to-rose-300 bg-clip-text text-transparent">
                  Nhà Chúng Mình
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  <Flower2 className="w-3 h-3 text-pink-400" /> Kỷ Niệm Thơ Mộng
                </span>
              </div>
              {/* Slogan mới theo yêu cầu người dùng */}
              <p className="text-xs text-rose-300/90 font-medium hidden sm:block">
                Nhà chúng mình. Nơi bình yên của hai đứa
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Google SEO & Vercel / GitHub Hub */}
            <button
              onClick={onOpenDeployHub}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-200 border border-emerald-700/50 transition-all hover:border-pink-400/40 shadow-sm"
              title="Cấu hình Google SEO, Google Search Console, Vercel & GitHub"
            >
              <Globe className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden lg:inline">SEO & Deploy</span>
            </button>

            {/* Private Vault Lock button */}
            <button
              onClick={onToggleVaultLock}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-sm ${
                isVaultUnlocked
                  ? 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
              title={isVaultUnlocked ? 'Kho bí mật đang mở' : 'Kho bí mật đang khóa an toàn'}
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isVaultUnlocked ? 'Kho Mở' : 'Khóa Mật Khẩu'}
              </span>
            </button>

            {/* Google Photos Browser */}
            <button
              onClick={onOpenPhotos}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-200 border border-emerald-700/50 transition-all hover:border-pink-400/40 shadow-sm"
              title="Đồng bộ ảnh từ Google Photos"
            >
              <ImageIcon className="w-3.5 h-3.5 text-pink-300" />
              <span className="hidden md:inline">Google Photos</span>
            </button>

            {/* Upload / Add media */}
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-rose-500 hover:from-emerald-500 hover:to-rose-400 text-white shadow-md shadow-rose-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Tải Kỷ Niệm</span>
            </button>

            {/* Account Profile / Login */}
            <div className="relative">
              {currentUser ? (
                <div>
                  <button
                    onClick={() => setShowAccountDropdown(!showAccountDropdown)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-emerald-900/50 border border-emerald-700/40 transition-all"
                  >
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt={currentUser.displayName || 'User'}
                        className="w-7 h-7 rounded-lg object-cover ring-2 ring-pink-400/40"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-rose-500 text-white text-xs font-bold flex items-center justify-center">
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="hidden xl:inline text-xs text-emerald-100 font-medium max-w-[120px] truncate">
                      {currentUser.displayName || currentUser.email}
                    </span>
                  </button>

                  {/* Dropdown */}
                  {showAccountDropdown && (
                    <div
                      className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0e241e] border border-emerald-700/50 shadow-2xl p-3 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150"
                      onMouseLeave={() => setShowAccountDropdown(false)}
                    >
                      <div className="pb-3 border-b border-emerald-800/50">
                        <p className="font-semibold text-white truncate">
                          {currentUser.displayName || 'Thành Viên Nhà Mình'}
                        </p>
                        <p className="text-emerald-300/70 truncate">{currentUser.email}</p>
                        <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">
                          <UserCheck className="w-3 h-3" /> Đã kết nối Google Photos
                        </span>
                      </div>

                      <div className="pt-2 space-y-1">
                        <button
                          onClick={() => {
                            setShowAccountDropdown(false);
                            onOpenVaultSettings();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-emerald-200 hover:bg-emerald-900/60 transition-colors"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-rose-300" />
                          <span>Cài đặt mã PIN Kho Riêng Tư</span>
                        </button>
                        <button
                          onClick={() => {
                            setShowAccountDropdown(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-rose-300 hover:bg-rose-500/15 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={onGoogleLogin}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-100 to-pink-100 hover:from-white hover:to-pink-50 text-emerald-950 font-bold text-xs shadow-md shadow-pink-500/10 transition-all active:scale-95"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Google Photos</span>
                  <span className="sm:hidden">Đăng nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
