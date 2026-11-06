import React, { useState, useEffect } from 'react';
import { HeaderHero } from './components/HeaderHero';
import { QuickUploadForm } from './components/QuickUploadForm';
import { MemoryFeed } from './components/MemoryFeed';
import { LightboxModal } from './components/LightboxModal';
import { PolaroidShareModal } from './components/PolaroidShareModal';
import { StandaloneModal } from './components/StandaloneModal';
import { BackgroundSettingsModal } from './components/BackgroundSettingsModal';
import { MusicPlayer } from './components/MusicPlayer';
import { ReadingModeView } from './components/ReadingModeView';
import { Memory, CoupleInfo, BackgroundSettings, DEFAULT_BG_SETTINGS } from './types';
import {
  getStoredMemories,
  saveMemoriesToStorage,
  getStoredCoupleInfo,
  saveCoupleInfoToStorage,
  getStoredBackgroundSettings,
  saveBackgroundSettingsToStorage
} from './services/storage';
import { Heart, Plus, Sparkles, Palette } from 'lucide-react';

export function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo>(getStoredCoupleInfo());
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>(
    getStoredBackgroundSettings()
  );

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isStandaloneOpen, setIsStandaloneOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isReadingModeOpen, setIsReadingModeOpen] = useState(false);
  const [selectedLightboxIndex, setSelectedLightboxIndex] = useState<number | null>(null);
  const [selectedShareMemory, setSelectedShareMemory] = useState<Memory | null>(null);

  // Khởi tạo memories từ LocalStorage
  useEffect(() => {
    const loaded = getStoredMemories();
    setMemories(loaded);
  }, []);

  // Tổng số lượt yêu thích
  const totalLikes = memories.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  // Thêm kỷ niệm mới
  const handleAddMemory = (newMemData: Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>) => {
    const newMemory: Memory = {
      ...newMemData,
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      likes: 1,
      isLiked: true,
      createdAt: Date.now()
    };

    const updated = [newMemory, ...memories];
    setMemories(updated);
    saveMemoriesToStorage(updated);
  };

  // Thả tim kỷ niệm
  const handleToggleLike = (id: string) => {
    const updated = memories.map((m) => {
      if (m.id === id) {
        const isLiked = !m.isLiked;
        const likes = isLiked ? (m.likes || 0) + 1 : Math.max(0, (m.likes || 0) - 1);
        return { ...m, isLiked, likes };
      }
      return m;
    });
    setMemories(updated);
    saveMemoriesToStorage(updated);
  };

  // Xóa kỷ niệm
  const handleDeleteMemory = (id: string) => {
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    saveMemoriesToStorage(updated);
    if (selectedLightboxIndex !== null) {
      setSelectedLightboxIndex(null);
    }
  };

  // Cập nhật thông tin cặp đôi
  const handleUpdateCoupleInfo = (info: CoupleInfo) => {
    setCoupleInfo(info);
    saveCoupleInfoToStorage(info);
  };

  // Cập nhật cài đặt hình nền
  const handleUpdateBackground = (newSettings: BackgroundSettings) => {
    setBackgroundSettings(newSettings);
    saveBackgroundSettingsToStorage(newSettings);
  };

  // Điều hướng xem ảnh phóng to
  const activeLightboxMemory =
    selectedLightboxIndex !== null && memories[selectedLightboxIndex]
      ? memories[selectedLightboxIndex]
      : null;

  const handlePrevLightbox = () => {
    if (selectedLightboxIndex !== null && selectedLightboxIndex > 0) {
      setSelectedLightboxIndex(selectedLightboxIndex - 1);
    }
  };

  const handleNextLightbox = () => {
    if (selectedLightboxIndex !== null && selectedLightboxIndex < memories.length - 1) {
      setSelectedLightboxIndex(selectedLightboxIndex + 1);
    }
  };

  return (
    <div className="relative min-h-screen text-[#3D2E28] flex flex-col justify-between overflow-x-hidden">
      {/* 1. LỚP HÌNH NỀN TÙY BIẾN CHO GIAO DIỆN WEB */}
      {backgroundSettings.type === 'image' && backgroundSettings.imageUrl ? (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          {/* Ảnh nền với độ mờ được tối ưu */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700"
            style={{
              backgroundImage: `url(${backgroundSettings.imageUrl})`,
              filter: `blur(${backgroundSettings.blur}px)`,
              transform: 'scale(1.05)', // chống viền trắng khi blur
            }}
          />
          {/* Lớp phủ màu kem sữa kiểm soát độ trong suốt để text luôn đọc rõ */}
          <div
            className="absolute inset-0 bg-[#FFFDF9]"
            style={{
              opacity: 1 - backgroundSettings.opacity,
            }}
          />
        </div>
      ) : (
        /* Nền pastel mặc định */
        <div className="fixed inset-0 z-0 pointer-events-none bg-pastel-warm" />
      )}

      {/* 2. NỘI DUNG CHÍNH (Z-INDEX NỔI TRÊN NỀN) */}
      <div className="relative z-10">
        {/* Phần Header / Hero & Đồng Hồ Đếm Ngày Yêu Nhau */}
        <HeaderHero
          coupleInfo={coupleInfo}
          onUpdateCoupleInfo={handleUpdateCoupleInfo}
          onOpenQuickUpload={() => setIsUploadOpen(true)}
          totalMemories={memories.length}
          totalLikes={totalLikes}
          onOpenStandaloneModal={() => setIsStandaloneOpen(true)}
          onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
          onOpenReadingMode={() => setIsReadingModeOpen(true)}
        />

        {/* Bảng Kỷ Niệm (Masonry Grid & Dòng Thời Gian) */}
        <MemoryFeed
          memories={memories}
          coupleInfo={coupleInfo}
          onToggleLike={handleToggleLike}
          onDeleteMemory={handleDeleteMemory}
          onOpenLightbox={(mem) => {
            const idx = memories.findIndex((m) => m.id === mem.id);
            if (idx !== -1) setSelectedLightboxIndex(idx);
          }}
          onOpenShare={(mem) => setSelectedShareMemory(mem)}
          onOpenQuickUpload={() => setIsUploadOpen(true)}
        />
      </div>

      {/* Nút Floating Action Button trên điện thoại để đăng nhanh & đổi nền */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden flex flex-col items-center gap-2.5">
        <button
          onClick={() => setIsBackgroundModalOpen(true)}
          className="w-11 h-11 rounded-full bg-white/95 text-[#D98A76] flex items-center justify-center shadow-lg border border-[#8C6D58]/15 active:scale-95 transition-all"
          title="Đổi hình nền web"
        >
          <Palette className="w-5 h-5" />
        </button>

        <button
          onClick={() => setIsUploadOpen(true)}
          className="w-14 h-14 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          title="Đăng kỷ niệm mới"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Footer Dịu Dàng */}
      <footer className="relative z-10 py-8 px-4 text-center border-t border-[#8C6D58]/10 bg-[#FFFDF9]/80 backdrop-blur-md mt-12">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#8C6D58]">
            <Heart className="w-3.5 h-3.5 text-[#E8A598] fill-[#E8A598]" />
            <span>Góc Nhỏ Bình Yên • Dành riêng cho hai bạn</span>
            <Heart className="w-3.5 h-3.5 text-[#E8A598] fill-[#E8A598]" />
          </div>
          <p className="font-handwriting text-xl text-[#8C6D58]">
            "Mong cho hai đứa luôn bình yên qua năm tháng."
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsBackgroundModalOpen(true)}
              className="text-[11px] text-[#8C6D58] hover:text-[#3D2E28] hover:underline"
            >
              🎨 Tùy chỉnh hình nền web
            </button>
            <span className="text-[#8C6D58]/40">•</span>
            <button
              onClick={() => setIsStandaloneOpen(true)}
              className="text-[11px] text-[#D98A76] hover:underline font-medium"
            >
              📥 Tải file HTML 1 file độc lập
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Đăng Kỷ Niệm Mới (Tích hợp Gemini AI & Kho 20+ Ảnh Mẫu) */}
      <QuickUploadForm
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddMemory={handleAddMemory}
        coupleInfo={coupleInfo}
      />

      {/* Modal Cài Đặt Hình Nền Web Tùy Biến */}
      <BackgroundSettingsModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        currentSettings={backgroundSettings}
        onSaveSettings={handleUpdateBackground}
      />

      {/* Modal Phóng To Ảnh (Lightbox) */}
      {activeLightboxMemory && (
        <LightboxModal
          memory={activeLightboxMemory}
          onClose={() => setSelectedLightboxIndex(null)}
          onPrev={handlePrevLightbox}
          onNext={handleNextLightbox}
          hasPrev={selectedLightboxIndex !== null && selectedLightboxIndex > 0}
          hasNext={selectedLightboxIndex !== null && selectedLightboxIndex < memories.length - 1}
          onToggleLike={handleToggleLike}
          onOpenShare={(mem) => {
            setSelectedShareMemory(mem);
            setSelectedLightboxIndex(null);
          }}
        />
      )}

      {/* Modal Chia Sẻ Khung Ảnh Polaroid */}
      {selectedShareMemory && (
        <PolaroidShareModal
          memory={selectedShareMemory}
          coupleInfo={coupleInfo}
          isOpen={!!selectedShareMemory}
          onClose={() => setSelectedShareMemory(null)}
        />
      )}

      {/* Modal Xem & Tải Mã Nguồn Standalone HTML */}
      <StandaloneModal
        isOpen={isStandaloneOpen}
        onClose={() => setIsStandaloneOpen(false)}
      />

      {/* Trình Phát Nhạc Nền Góc Nhỏ (Music Player) */}
      <MusicPlayer />

      {/* Chế Độ Đọc Nhật Ký Lãng Mạn (Reading Mode) */}
      <ReadingModeView
        isOpen={isReadingModeOpen}
        onClose={() => setIsReadingModeOpen(false)}
        memories={memories}
        coupleInfo={coupleInfo}
      />
    </div>
  );
}

export default App;
