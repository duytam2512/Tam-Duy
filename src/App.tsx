import React, { useState, useEffect, useMemo } from 'react';
import { HeaderHero } from './components/HeaderHero';
import { QuickUploadForm } from './components/QuickUploadForm';
import { MemoryFeed } from './components/MemoryFeed';
import { LightboxModal } from './components/LightboxModal';
import { PolaroidShareModal } from './components/PolaroidShareModal';
import { StandaloneModal } from './components/StandaloneModal';
import { BackgroundSettingsModal } from './components/BackgroundSettingsModal';
import { MusicPlayer } from './components/MusicPlayer';
import { ReadingModeView } from './components/ReadingModeView';
import { SnowEffect } from './components/SnowEffect';
import { GooglePhotosVideoModal } from './components/GooglePhotosVideoModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AppUpdateBanner } from './components/AppUpdateBanner';
import { PWAInstallButton } from './components/PWAInstallButton';
import { HandwrittenJournalModal } from './components/HandwrittenJournalModal';
import { FontSettingsModal } from './components/FontSettingsModal';
import { forceHardUpdateApp } from './utils/appUpdater';
import { buildTagFilterStats, dedupeTags } from './utils/memoryTags';
import {
  Memory,
  CoupleInfo,
  BackgroundSettings,
  DEFAULT_BG_SETTINGS,
  DiaryEntry,
  CaptionFont,
  FONT_OPTIONS,
  DEFAULT_FONT
} from './types';
import {
  getStoredMemories,
  saveMemoriesToStorage,
  getStoredCoupleInfo,
  saveCoupleInfoBoth,
  getStoredBackgroundSettings,
  saveBackgroundSettingsBoth,
  subscribeToSharedMemories,
  saveSharedMemory,
  updateSharedMemoryFields,
  deleteSharedMemory,
  deleteMemoryCloudAssets,
  subscribeToSharedCoupleInfo,
  subscribeToSharedBgSettings,
  getStoredDiaryEntries,
  saveDiaryEntriesBoth,
  subscribeToSharedDiary,
  getStoredFont,
  saveFontBoth,
  subscribeToSharedFont
} from './services/storage';
import { Heart, Plus, Sparkles, Palette, Book } from 'lucide-react';

export function App() {
  const [memories, setMemories] = useState<Memory[]>(getStoredMemories());
  const [coupleInfo, setCoupleInfo] = useState<CoupleInfo>(getStoredCoupleInfo());
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>(
    getStoredBackgroundSettings()
  );
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(getStoredDiaryEntries());
  const [currentFont, setCurrentFont] = useState<CaptionFont>(getStoredFont());

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isStandaloneOpen, setIsStandaloneOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isReadingModeOpen, setIsReadingModeOpen] = useState(false);
  const [isVideoMakerOpen, setIsVideoMakerOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const [isFontModalOpen, setIsFontModalOpen] = useState(false);
  const [isSnowing, setIsSnowing] = useState(() => {
    try {
      return localStorage.getItem('goc_nho_snow') !== 'false';
    } catch {
      return true;
    }
  });
  const [selectedLightboxId, setSelectedLightboxId] = useState<string | null>(null);
  const [selectedShareMemory, setSelectedShareMemory] = useState<Memory | null>(null);

  const handleToggleSnow = () => {
    setIsSnowing((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('goc_nho_snow', String(next));
      } catch (err) {
        console.warn('Lỗi lưu trạng thái tuyết rơi:', err);
      }
      return next;
    });
  };

  // Đồng bộ thời gian thực từ Cloud Firestore & liên tab (hoạt động trên cả Laptop, Cốc Cốc, Điện thoại, v.v.)
  useEffect(() => {
    const unsubMemories = subscribeToSharedMemories((sharedMemories) => {
      if (Array.isArray(sharedMemories)) {
        setMemories(sharedMemories);
      }
    });

    const unsubCouple = subscribeToSharedCoupleInfo((sharedCouple) => {
      if (sharedCouple) {
        setCoupleInfo(sharedCouple);
      }
    });

    const unsubBg = subscribeToSharedBgSettings((sharedBg) => {
      if (sharedBg) {
        setBackgroundSettings(sharedBg);
      }
    });

    const unsubDiary = subscribeToSharedDiary((sharedEntries) => {
      if (Array.isArray(sharedEntries)) {
        setDiaryEntries(sharedEntries);
      }
    });

    const unsubFont = subscribeToSharedFont((sharedFont) => {
      if (sharedFont) {
        setCurrentFont(sharedFont);
      }
    });

    // Lắng nghe sự kiện đồng bộ tức thì giữa các tab / cửa sổ trình duyệt trên cùng thiết bị
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === 'goc_nho_binh_yen_memories_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setMemories(parsed);
        } catch {}
      }
      if (e.key === 'goc_nho_binh_yen_couple_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.personOne) setCoupleInfo(parsed);
        } catch {}
      }
      if (e.key === 'goc_nho_binh_yen_bg_v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.type) setBackgroundSettings(parsed);
        } catch {}
      }
      if (e.key === 'goc_nho_binh_yen_diary_v1' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) setDiaryEntries(parsed);
        } catch {}
      }
      if (e.key === 'goc_nho_font_family_v1' && e.newValue) {
        if (['caveat', 'dancing', 'patrick', 'playfair', 'vietnam', 'sans'].includes(e.newValue)) {
          setCurrentFont(e.newValue as CaptionFont);
        }
      }
    };

    window.addEventListener('storage', handleStorageEvent);

    return () => {
      unsubMemories();
      unsubCouple();
      unsubBg();
      unsubDiary();
      unsubFont();
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Cập nhật font chữ
  const handleUpdateFont = async (newFont: CaptionFont) => {
    setCurrentFont(newFont);
    await saveFontBoth(newFont);
  };

  const currentFontOption = FONT_OPTIONS.find((f) => f.id === currentFont) || FONT_OPTIONS[0];
  const currentFontClass = currentFontOption.cssClass;

  // Tổng số lượt yêu thích
  const totalLikes = memories.reduce((acc, curr) => acc + (curr.likes || 0), 0);

  // Thêm kỷ niệm mới (hỗ trợ cả 1 kỷ niệm, album nhiều ảnh 10-30 ảnh hoặc nhiều kỷ niệm riêng biệt)
  const handleAddMemory = async (
    newMemData:
      | Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>
      | Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>[],
    onProgress?: (statusText: string) => void
  ) => {
    const items = Array.isArray(newMemData) ? newMemData : [newMemData];
    const baseTime = Date.now();
    const newMemories: Memory[] = items.map((item, idx) => ({
      ...item,
      id: `mem-${baseTime}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      likes: 1,
      isLiked: true,
      createdAt: baseTime + idx
    }));

    const savedMemories: Memory[] = [];

    if (newMemories.length === 1) {
      const mem = newMemories[0];
      const photoCount = mem.images?.length || 1;
      onProgress?.(
        photoCount > 1
          ? `Đang chuẩn bị lưu album ${photoCount} ảnh lên đám mây...`
          : 'Đang lưu kỷ niệm lên đám mây...'
      );
      const prepared = await saveSharedMemory(mem, (done, total) => {
        onProgress?.(`Đang lưu ảnh album lên đám mây (${done}/${total})...`);
      });
      savedMemories.push(prepared);
    } else {
      // Đăng nhiều bài viết riêng biệt theo từng đợt 3 bài để không quá tải mạng/điện thoại
      const BATCH_SIZE = 3;
      let completed = 0;
      const total = newMemories.length;
      onProgress?.(`Đang lưu kỷ niệm (0/${total})...`);

      for (let i = 0; i < total; i += BATCH_SIZE) {
        const batch = newMemories.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (mem) => {
            const prepared = await saveSharedMemory(mem);
            completed += 1;
            onProgress?.(`Đang lưu kỷ niệm (${completed}/${total})...`);
            return prepared;
          })
        );
        savedMemories.push(...batchResults);
      }
    }

    setMemories((prev) => {
      const savedIds = new Set(savedMemories.map((m) => m.id));
      const updated = [...savedMemories, ...prev.filter((m) => !savedIds.has(m.id))];
      saveMemoriesToStorage(updated);
      return updated;
    });
  };

  // Thả tim kỷ niệm (cập nhật nhẹ chỉ 2 trường likes/isLiked, không tải lại toàn bộ ảnh)
  const handleToggleLike = async (id: string) => {
    let targetMem: Memory | null = null;
    const updated = memories.map((m) => {
      if (m.id === id) {
        const isLiked = !m.isLiked;
        const likes = isLiked ? (m.likes || 0) + 1 : Math.max(0, (m.likes || 0) - 1);
        targetMem = { ...m, isLiked, likes };
        return targetMem;
      }
      return m;
    });

    setMemories(updated);
    saveMemoriesToStorage(updated);
    if (targetMem) {
      const memToSync: Memory = targetMem;
      try {
        await updateSharedMemoryFields(
          id,
          { likes: memToSync.likes, isLiked: Boolean(memToSync.isLiked) },
          memToSync
        );
      } catch (err) {
        console.warn('Không thể đồng bộ lượt thích lên Cloud lúc này:', err);
      }
    }
  };

  // Cập nhật danh sách thẻ (tags) cho một kỷ niệm đã đăng (cập nhật nhẹ qua updateDoc + đồng bộ localStorage)
  const handleUpdateMemoryTags = async (id: string, nextTags: string[]) => {
    const cleanedTags = dedupeTags(nextTags);
    const finalTags = cleanedTags.length > 0 ? cleanedTags : ['Kỷ niệm'];
    const primaryTag = finalTags[0];

    let targetMem: Memory | null = null;
    const updated = memories.map((m) => {
      if (m.id === id) {
        targetMem = { ...m, tag: primaryTag, tags: finalTags };
        return targetMem;
      }
      return m;
    });

    setMemories(updated);
    saveMemoriesToStorage(updated);
    if (targetMem) {
      const memToSync: Memory = targetMem;
      await updateSharedMemoryFields(
        id,
        { tag: primaryTag, tags: finalTags },
        memToSync
      );
    }
  };

  const existingCustomTags = useMemo(
    () =>
      buildTagFilterStats(memories)
        .filter((t) => t.isCustom)
        .map((t) => t.name),
    [memories]
  );

  // Xóa kỷ niệm
  const handleDeleteMemory = async (id: string) => {
    const target = memories.find((m) => m.id === id);
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    saveMemoriesToStorage(updated);
    await deleteSharedMemory(id);
    if (target) {
      await deleteMemoryCloudAssets(target);
    }
    if (selectedLightboxId === id) {
      setSelectedLightboxId(null);
    }
  };

  // Cập nhật thông tin cặp đôi
  const handleUpdateCoupleInfo = async (info: CoupleInfo) => {
    setCoupleInfo(info);
    await saveCoupleInfoBoth(info);
  };

  // Cập nhật cài đặt hình nền
  const handleUpdateBackground = async (newSettings: BackgroundSettings) => {
    setBackgroundSettings(newSettings);
    await saveBackgroundSettingsBoth(newSettings);
  };

  // Điều hướng xem ảnh phóng to (theo ID để không bị nhảy ảnh khi danh sách đồng bộ mới)
  const selectedLightboxIndex = useMemo(() => {
    if (!selectedLightboxId) return null;
    const idx = memories.findIndex((m) => m.id === selectedLightboxId);
    return idx !== -1 ? idx : null;
  }, [memories, selectedLightboxId]);

  const activeLightboxMemory =
    selectedLightboxIndex !== null && memories[selectedLightboxIndex]
      ? memories[selectedLightboxIndex]
      : null;

  const handlePrevLightbox = () => {
    if (selectedLightboxIndex !== null && selectedLightboxIndex > 0) {
      setSelectedLightboxId(memories[selectedLightboxIndex - 1].id);
    }
  };

  const handleNextLightbox = () => {
    if (selectedLightboxIndex !== null && selectedLightboxIndex < memories.length - 1) {
      setSelectedLightboxId(memories[selectedLightboxIndex + 1].id);
    }
  };

  // Lưu danh sách trang sổ tay viết tay
  const handleSaveDiaryEntries = async (entries: DiaryEntry[]) => {
    setDiaryEntries(entries);
    await saveDiaryEntriesBoth(entries);
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

      {/* HIỆU ỨNG TUYẾT RƠI NHẸ NHÀNG, LÃNG MẠN PHỦ LÊN TOÀN MÀN HÌNH */}
      <SnowEffect enabled={isSnowing} />

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
          onOpenVideoMaker={() => setIsVideoMakerOpen(true)}
          onOpenHandwrittenJournal={() => setIsJournalOpen(true)}
          onOpenFontModal={() => setIsFontModalOpen(true)}
          isSnowing={isSnowing}
          onToggleSnow={handleToggleSnow}
        />

        {/* Bảng Kỷ Niệm (Masonry Grid & Dòng Thời Gian) */}
        <MemoryFeed
          memories={memories}
          coupleInfo={coupleInfo}
          onToggleLike={handleToggleLike}
          onDeleteMemory={handleDeleteMemory}
          onUpdateMemoryTags={handleUpdateMemoryTags}
          fontClass={currentFontClass}
          onOpenFontModal={() => setIsFontModalOpen(true)}
          onOpenLightbox={(mem) => {
            setSelectedLightboxId(mem.id);
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
          <p className={`${currentFontClass} text-xl sm:text-2xl text-[#8C6D58]`}>
            "Mong cho hai đứa luôn bình yên qua năm tháng."
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setIsFontModalOpen(true)}
              className="text-[11px] text-[#8C6D58] hover:text-[#3D2E28] hover:underline"
            >
              ✍️ Đổi font chữ
            </button>
            <span className="text-[#8C6D58]/40">•</span>
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
            <span className="text-[#8C6D58]/40">•</span>
            <button
              onClick={() => {
                forceHardUpdateApp();
              }}
              className="text-[11px] text-[#8C6D58] hover:text-[#3D2E28] hover:underline cursor-pointer"
            >
              🔄 Cập nhật bản mới
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
        availableCustomTags={existingCustomTags}
        fontClass={currentFontClass}
        currentFont={currentFont}
        onOpenFontModal={() => setIsFontModalOpen(true)}
        onSaveFont={handleUpdateFont}
      />

      {/* Modal Cài Đặt Hình Nền Web Tùy Biến */}
      <BackgroundSettingsModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        currentSettings={backgroundSettings}
        onSaveSettings={handleUpdateBackground}
      />

      {/* Modal Tùy Chỉnh Font Chữ Lãng Mạn */}
      <FontSettingsModal
        isOpen={isFontModalOpen}
        onClose={() => setIsFontModalOpen(false)}
        currentFont={currentFont}
        onSaveFont={handleUpdateFont}
      />

      {/* Modal Sổ Tay Viết Tay Lật Trang */}
      <HandwrittenJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        coupleInfo={coupleInfo}
        entries={diaryEntries}
        onSaveEntries={handleSaveDiaryEntries}
        fontClass={currentFontClass}
        currentFont={currentFont}
        onSaveFont={handleUpdateFont}
        onOpenFontModal={() => setIsFontModalOpen(true)}
      />

      {/* Modal Phóng To Ảnh (Lightbox) */}
      {activeLightboxMemory && (
        <LightboxModal
          memory={activeLightboxMemory}
          onClose={() => setSelectedLightboxId(null)}
          onPrev={handlePrevLightbox}
          onNext={handleNextLightbox}
          hasPrev={selectedLightboxIndex !== null && selectedLightboxIndex > 0}
          hasNext={selectedLightboxIndex !== null && selectedLightboxIndex < memories.length - 1}
          onToggleLike={handleToggleLike}
          fontClass={currentFontClass}
          onOpenShare={(mem) => {
            setSelectedShareMemory(mem);
            setSelectedLightboxId(null);
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
          currentFont={currentFont}
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
        fontClass={currentFontClass}
        currentFont={currentFont}
        onOpenFontModal={() => setIsFontModalOpen(true)}
      />

      {/* Ghép Ảnh Thành Video Kỷ Niệm (Google Photos Style Highlight Video Maker) */}
      <GooglePhotosVideoModal
        isOpen={isVideoMakerOpen}
        onClose={() => setIsVideoMakerOpen(false)}
        memories={memories}
        coupleInfo={coupleInfo}
      />

      {/* Thông Báo Tự Động Khi Có Bản Cập Nhật Mới Trên iPhone / Web */}
      <AppUpdateBanner />

      {/* Chỉ Báo Chế Độ Offline Cho PWA */}
      <OfflineIndicator />

      {/* Nút Cài Đặt App Nổi Nhanh Trên Điện Thoại */}
      <PWAInstallButton variant="floating" />
    </div>
  );
}

export default App;
