import React, { useState, useEffect } from 'react';
import { HeaderHero } from './components/HeaderHero';
import { QuickUploadForm } from './components/QuickUploadForm';
import { MemoryFeed } from './components/MemoryFeed';
import { LightboxModal } from './components/LightboxModal';
import { PolaroidShareModal } from './components/PolaroidShareModal';
import { StandaloneModal } from './components/StandaloneModal';
import { Memory, CoupleInfo } from './types';
import {
  getStoredMemories,
  saveMemoriesToStorage,
  getStoredCoupleInfo,
  saveCoupleInfoToStorage
} from './services/storage';
import { Heart, Plus, Sparkles } from 'lucide-react';

export function App() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo>(getStoredCoupleInfo());
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isStandaloneOpen, setIsStandaloneOpen] = useState(false);
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
    <div className="min-h-screen bg-pastel-warm text-[#3D2E28] flex flex-col justify-between">
      <div>
        {/* Phần Header / Hero & Đồng Hồ Đếm Ngày Yêu Nhau */}
        <HeaderHero
          coupleInfo={coupleInfo}
          onUpdateCoupleInfo={handleUpdateCoupleInfo}
          onOpenQuickUpload={() => setIsUploadOpen(true)}
          totalMemories={memories.length}
          totalLikes={totalLikes}
          onOpenStandaloneModal={() => setIsStandaloneOpen(true)}
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

      {/* Floating Action Button trên điện thoại để đăng nhanh */}
      <div className="fixed bottom-6 right-6 z-40 sm:hidden">
        <button
          onClick={() => setIsUploadOpen(true)}
          className="w-14 h-14 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
          title="Đăng kỷ niệm mới"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>

      {/* Footer Dịu Dàng */}
      <footer className="py-8 px-4 text-center border-t border-[#8C6D58]/10 bg-[#FFFDF9]/70 backdrop-blur-xs">
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#8C6D58]">
            <Heart className="w-3.5 h-3.5 text-[#E8A598] fill-[#E8A598]" />
            <span>Góc Nhỏ Bình Yên • Dành riêng cho hai bạn</span>
            <Heart className="w-3.5 h-3.5 text-[#E8A598] fill-[#E8A598]" />
          </div>
          <p className="font-handwriting text-lg text-[#8C6D58]">
            "Mong cho hai đứa luôn bình yên qua năm tháng."
          </p>
          <div className="pt-2">
            <button
              onClick={() => setIsStandaloneOpen(true)}
              className="text-[11px] text-[#D98A76] hover:underline"
            >
              Tải file mã nguồn HTML 1 file độc lập để lưu trữ cá nhân
            </button>
          </div>
        </div>
      </footer>

      {/* Modal Đăng Kỷ Niệm Mới */}
      <QuickUploadForm
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onAddMemory={handleAddMemory}
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
    </div>
  );
}

export default App;
