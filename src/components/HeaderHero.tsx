import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Heart, Calendar, Sparkles, Edit3, Clock, FileCode, Palette, BookOpen, Snowflake, Film, Book, Type, PartyPopper, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CoupleInfo } from '../types';
import { BrandLogo } from './BrandLogo';
import { PWAInstallButton } from './PWAInstallButton';
import {
  getLoveMilestoneStatus,
  launchMilestoneFireworks,
  LoveMilestone
} from '../utils/loveMilestones';

interface HeaderHeroProps {
  coupleInfo: CoupleInfo;
  onUpdateCoupleInfo: (info: CoupleInfo) => void;
  onOpenQuickUpload: () => void;
  totalMemories: number;
  totalLikes: number;
  onOpenStandaloneModal: () => void;
  onOpenBackgroundModal: () => void;
  onOpenReadingMode: () => void;
  onOpenVideoMaker: () => void;
  onOpenHandwrittenJournal: () => void;
  onOpenFontModal: () => void;
  isSnowing: boolean;
  onToggleSnow: () => void;
}

export const HeaderHero: React.FC<HeaderHeroProps> = ({
  coupleInfo,
  onUpdateCoupleInfo,
  onOpenQuickUpload,
  totalMemories,
  totalLikes,
  onOpenStandaloneModal,
  onOpenBackgroundModal,
  onOpenReadingMode,
  onOpenVideoMaker,
  onOpenHandwrittenJournal,
  onOpenFontModal,
  isSnowing,
  onToggleSnow
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CoupleInfo>(coupleInfo);

  // Phân tích chuỗi ngày YYYY-MM-DD theo múi giờ địa phương (tránh lệch 7 giờ ở Việt Nam UTC+7)
  const parseLocalStartDate = useCallback((dateStr: string): Date | null => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const match = dateStr.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = Number(match[1]);
      const month = Number(match[2]) - 1;
      const day = Number(match[3]);
      const d = new Date(year, month, day, 0, 0, 0, 0);
      return Number.isFinite(d.getTime()) ? d : null;
    }
    const parsed = new Date(dateStr);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }, []);

  // Tính toán thời gian yêu nhau (khởi tạo ngay để nhận diện cột mốc không bị trễ 1 frame)
  const computeTimeTogether = useCallback((startDateStr: string) => {
    const parsed = parseLocalStartDate(startDateStr);
    const start = parsed ? parsed.getTime() : NaN;
    if (!Number.isFinite(start)) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const diff = Math.max(0, Date.now() - start);
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / (1000 * 60)) % 60),
      seconds: Math.floor((diff / 1000) % 60)
    };
  }, [parseLocalStartDate]);

  const [timeTogether, setTimeTogether] = useState(() => computeTimeTogether(coupleInfo.startDate));
  const [celebratingMilestone, setCelebratingMilestone] = useState<LoveMilestone | null>(null);
  const [isFireworksActive, setIsFireworksActive] = useState(false);
  const fireworksCleanupRef = useRef<(() => void) | null>(null);
  const fireworksActiveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setEditForm(coupleInfo);
  }, [coupleInfo]);

  useEffect(() => {
    const calculateTime = () => {
      setTimeTogether(computeTimeTogether(coupleInfo.startDate));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [coupleInfo.startDate, computeTimeTogether]);

  const milestoneStatus = getLoveMilestoneStatus(timeTogether.days, coupleInfo.startDate);

  const playMilestoneCelebration = useCallback((milestone: LoveMilestone) => {
    if (fireworksCleanupRef.current) {
      fireworksCleanupRef.current();
    }
    if (fireworksActiveTimerRef.current !== null) {
      window.clearTimeout(fireworksActiveTimerRef.current);
    }

    setCelebratingMilestone(milestone);
    setIsFireworksActive(true);
    fireworksCleanupRef.current = launchMilestoneFireworks(milestone.tier);
    fireworksActiveTimerRef.current = window.setTimeout(() => {
      setIsFireworksActive(false);
      fireworksActiveTimerRef.current = null;
    }, 3200);
  }, []);

  // Dọn dẹp pháo hoa khi unmount
  useEffect(() => {
    return () => {
      if (fireworksCleanupRef.current) fireworksCleanupRef.current();
      if (fireworksActiveTimerRef.current !== null) {
        window.clearTimeout(fireworksActiveTimerRef.current);
      }
    };
  }, []);

  // Tự động bắn pháo hoa chúc mừng khi đạt cột mốc quan trọng (100 ngày, 200 ngày, 1 năm, 500 ngày, 1000 ngày...)
  useEffect(() => {
    const targetMilestone = milestoneStatus.exactMilestone || milestoneStatus.latestAchieved;
    if (!targetMilestone) return;

    const CELEBRATED_KEY = 'goc_nho_celebrated_milestones_v1';
    const milestoneKey = `${coupleInfo.startDate}:${targetMilestone.days}`;

    let celebratedList: string[] = [];
    try {
      const raw = localStorage.getItem(CELEBRATED_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) celebratedList = parsed;
      }
    } catch {}

    // Nếu hôm nay đúng ngày cột mốc: hiện thiệp chúc mừng; nếu chưa từng bắn pháo hoa cho cột mốc này thì tự động bắn!
    if (milestoneStatus.exactMilestone) {
      setCelebratingMilestone(milestoneStatus.exactMilestone);
    }

    if (!celebratedList.includes(milestoneKey)) {
      try {
        const nextList = [...celebratedList.slice(-24), milestoneKey];
        localStorage.setItem(CELEBRATED_KEY, JSON.stringify(nextList));
      } catch {}

      const startTimer = window.setTimeout(() => {
        playMilestoneCelebration(targetMilestone);
      }, 450);

      return () => window.clearTimeout(startTimer);
    }
  }, [
    coupleInfo.startDate,
    milestoneStatus.exactMilestone?.days,
    milestoneStatus.latestAchieved?.days,
    playMilestoneCelebration
  ]);

  const triggerLoveShower = () => {
    confetti({
      particleCount: 75,
      spread: 85,
      origin: { y: 0.6 },
      colors: ['#E8A598', '#E5989B', '#F9DCC4', '#D98A76', '#8C6D58'],
      shapes: ['circle', 'square']
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCoupleInfo(editForm);
    setIsEditing(false);

    const updatedTime = computeTimeTogether(editForm.startDate);
    const updatedMilestone = getLoveMilestoneStatus(updatedTime.days, editForm.startDate);
    if (updatedMilestone.exactMilestone) {
      playMilestoneCelebration(updatedMilestone.exactMilestone);
    } else {
      triggerLoveShower();
    }
  };

  return (
    <header className="relative pt-6 pb-10 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Top action row / Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Logo trên thanh điều hướng cạnh chữ 'Góc Nhỏ Bình Yên' (32x32px, tone #C87D55) */}
        <div className="flex items-center gap-2.5 bg-[#FFFDF9]/95 backdrop-blur-xs px-3.5 py-1.5 rounded-2xl border border-[#C87D55]/20 shadow-xs">
          <BrandLogo size={32} className="w-8 h-8" />
          <div className="flex flex-col">
            <span className="font-serif-romantic font-bold text-sm sm:text-base text-[#3D2E28] leading-tight">
              Góc Nhỏ Bình Yên
            </span>
            <span className="text-[10px] text-[#8C6D58]">
              Nơi lưu giữ kỷ niệm
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Mở Sổ Tay Viết Tay Lật Trang */}
          <button
            onClick={onOpenHandwrittenJournal}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-amber-700 via-amber-800 to-[#5E4233] hover:opacity-95 px-3.5 py-1.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer border border-amber-500/40"
            title="Mở cuốn sổ tay viết tay có thể lật trang, viết thư tình và ghi chú dài"
          >
            <Book className="w-3.5 h-3.5 text-amber-200" />
            <span>Sổ Tay Kỷ Niệm</span>
          </button>

          {/* Nút Tạo Video Kỷ Niệm Ghép Ảnh Chuẩn Google Photos */}
          <button
            onClick={onOpenVideoMaker}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:opacity-95 px-3.5 py-1.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer"
            title="Ghép ảnh kỷ niệm thành thước phim video lãng mạn kèm nhạc nền như Google Photos"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Tạo Video Kỷ Niệm</span>
          </button>

          {/* Nút Bật Chế Độ Đọc Kỷ Niệm */}
          <button
            onClick={onOpenReadingMode}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#D98A76] to-[#C87D55] hover:opacity-95 px-3.5 py-1.5 rounded-full shadow-xs transition-all active:scale-95 cursor-pointer"
            title="Bật Chế độ đọc: Ẩn các nút chức năng, cùng nhau đọc lại nhật ký lãng mạn"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chế Độ Đọc</span>
          </button>

          {/* Nút Bật/Tắt Tuyết Rơi Lãng Mạn */}
          <button
            onClick={onToggleSnow}
            className={`flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3 py-1.5 rounded-full border shadow-2xs transition-all ${
              isSnowing
                ? 'bg-[#E8A598]/20 text-[#D98A76] border-[#D98A76]/40 font-semibold'
                : 'bg-[#FFFDF9]/95 hover:bg-[#F9F6F0] text-[#8C6D58] border-[#8C6D58]/20'
            }`}
            title={isSnowing ? 'Đang bật tuyết rơi nhẹ nhàng (bấm để tắt)' : 'Bấm để bật tuyết rơi lãng mạn'}
          >
            <Snowflake className={`w-3.5 h-3.5 text-[#D98A76] ${isSnowing ? 'animate-spin [animation-duration:12s]' : ''}`} />
            <span className="hidden sm:inline">{isSnowing ? 'Tuyết: Bật' : 'Tuyết'}</span>
          </button>

          {/* Nút Đổi Font Chữ */}
          <button
            onClick={onOpenFontModal}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8C6D58] hover:text-[#3D2E28] bg-[#FFFDF9]/95 hover:bg-[#F9F6F0] px-3 py-1.5 rounded-full border border-[#8C6D58]/20 shadow-2xs transition-all cursor-pointer"
            title="Đổi kiểu font chữ lãng mạn cho nhật ký và kỷ niệm"
          >
            <Type className="w-3.5 h-3.5 text-[#D98A76]" />
            <span className="hidden sm:inline">Đổi Font</span>
            <span className="sm:hidden">Font</span>
          </button>

          {/* Nút Đổi Hình Nền Web */}
          <button
            onClick={onOpenBackgroundModal}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8C6D58] hover:text-[#3D2E28] bg-[#FFFDF9]/95 hover:bg-[#F9F6F0] px-3 py-1.5 rounded-full border border-[#8C6D58]/20 shadow-2xs transition-all cursor-pointer"
            title="Đổi hình nền trang web và tinh chỉnh độ mờ"
          >
            <Palette className="w-3.5 h-3.5 text-[#D98A76]" />
            <span className="hidden sm:inline">Hình Nền</span>
          </button>

          {/* Nút Mã Nguồn 1 File */}
          <button
            onClick={onOpenStandaloneModal}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8C6D58] hover:text-[#3D2E28] bg-[#FFFDF9]/95 hover:bg-[#F9F6F0] px-3 py-1.5 rounded-full border border-[#8C6D58]/20 shadow-2xs transition-all"
            title="Xem mã nguồn HTML 1 file hoàn chỉnh để chạy độc lập"
          >
            <FileCode className="w-3.5 h-3.5 text-[#D98A76]" />
            <span className="hidden sm:inline">Mã nguồn</span> 1 File
          </button>

          {/* Nút Cài Đặt App Trên Điện Thoại (PWA) */}
          <PWAInstallButton variant="nav" />

          {/* Nút Chỉnh Sửa Thông Tin Cặp Đôi */}
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8C6D58] hover:text-[#3D2E28] bg-[#FFFDF9]/95 hover:bg-[#F9F6F0] px-3 py-1.5 rounded-full border border-[#8C6D58]/20 shadow-2xs transition-all"
            title="Đổi tên và ngày bắt đầu yêu"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Sửa</span>
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="card-warm-pastel rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden">
        {/* Soft Background Accents */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#E8A598]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#F9DCC4]/30 rounded-full blur-3xl pointer-events-none" />

        {/* Couple Names */}
        <div className="inline-flex items-center gap-3 mb-4 bg-[#FFFDF9]/90 px-5 py-1.5 rounded-full border border-[#E8A598]/30 shadow-xs">
          <span className="font-serif-romantic text-lg sm:text-xl font-semibold text-[#3D2E28]">
            {coupleInfo.personOne}
          </span>
          <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598]" />
          <span className="font-serif-romantic text-lg sm:text-xl font-semibold text-[#3D2E28]">
            {coupleInfo.personTwo}
          </span>
        </div>

        {/* Title & Slogan with Logo Icon */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <BrandLogo size={48} className="w-10 h-10 sm:w-12 sm:h-12" showHeartBadge={true} />
          <h1 className="font-serif-romantic text-3xl sm:text-5xl font-bold tracking-tight text-[#3D2E28]">
            Góc Nhỏ Bình Yên
          </h1>
        </div>
        <p className="font-handwriting text-xl sm:text-2xl text-[#8C6D58] max-w-xl mx-auto mb-6">
          "Nơi lưu giữ từng khoảnh khắc và kỷ niệm dịu dàng của hai đứa."
        </p>

        {/* Love Days Counter Display */}
        <div className="my-6">
          <div className="text-xs uppercase tracking-wider text-[#8C6D58] font-semibold mb-3 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#E8A598]" />
            <span>Chúng mình đã bên nhau được</span>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-4 max-w-md mx-auto">
            {/* Days */}
            <div className="bg-[#FFFDF9] rounded-2xl p-2.5 sm:p-4 border border-[#8C6D58]/15 shadow-xs">
              <div className="text-2xl sm:text-4xl font-bold text-[#D98A76] font-serif-romantic">
                {timeTogether.days}
              </div>
              <div className="text-[11px] sm:text-xs text-[#8C6D58] font-medium mt-1">
                Ngày
              </div>
            </div>

            {/* Hours */}
            <div className="bg-[#FFFDF9] rounded-2xl p-2.5 sm:p-4 border border-[#8C6D58]/15 shadow-xs">
              <div className="text-2xl sm:text-4xl font-bold text-[#3D2E28] font-serif-romantic">
                {timeTogether.hours}
              </div>
              <div className="text-[11px] sm:text-xs text-[#8C6D58] font-medium mt-1">
                Giờ
              </div>
            </div>

            {/* Minutes */}
            <div className="bg-[#FFFDF9] rounded-2xl p-2.5 sm:p-4 border border-[#8C6D58]/15 shadow-xs">
              <div className="text-2xl sm:text-4xl font-bold text-[#3D2E28] font-serif-romantic">
                {timeTogether.minutes}
              </div>
              <div className="text-[11px] sm:text-xs text-[#8C6D58] font-medium mt-1">
                Phút
              </div>
            </div>

            {/* Seconds */}
            <div className="bg-[#FFFDF9] rounded-2xl p-2.5 sm:p-4 border border-[#8C6D58]/15 shadow-xs">
              <div className="text-2xl sm:text-4xl font-bold text-[#E8A598] font-serif-romantic">
                {timeTogether.seconds}
              </div>
              <div className="text-[11px] sm:text-xs text-[#8C6D58] font-medium mt-1">
                Giây
              </div>
            </div>
          </div>

          {/* Special date subtitle */}
          <div className="mt-3 text-xs text-[#8C6D58] flex items-center justify-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#E8A598]" />
            <span>
              Kể từ ngày{' '}
              {(parseLocalStartDate(coupleInfo.startDate) || new Date()).toLocaleDateString('vi-VN')}
            </span>
          </div>

          {/* Thiệp Chúc Mừng Cột Mốc Quan Trọng (kèm hiệu ứng pháo hoa) */}
          {celebratingMilestone && (
            <div className="mt-4 max-w-lg mx-auto bg-gradient-to-r from-[#FFF7F2] via-[#FFFDF9] to-[#FFF6EB] border border-[#E8A598]/60 rounded-2xl px-4 py-3 shadow-sm text-left relative animate-fadeIn">
              <button
                type="button"
                onClick={() => setCelebratingMilestone(null)}
                className="absolute top-2.5 right-2.5 p-1 text-[#8C6D58]/70 hover:text-[#3D2E28] rounded-full hover:bg-[#F5EFE6] transition-colors cursor-pointer"
                aria-label="Đóng thông báo cột mốc"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <div className="w-9 h-9 rounded-xl bg-[#E8A598]/20 text-[#D98A76] flex items-center justify-center shrink-0 mt-0.5">
                  <PartyPopper className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold text-[#D98A76]">
                    {milestoneStatus.exactMilestone
                      ? 'Chúc mừng cột mốc hôm nay'
                      : 'Cột mốc yêu thương đã chinh phục'}
                  </div>
                  <h2 className="font-serif-romantic text-base sm:text-lg font-bold text-[#3D2E28] leading-snug">
                    {celebratingMilestone.title}
                  </h2>
                  <p className="text-xs text-[#8C6D58] mt-0.5 leading-relaxed">
                    {celebratingMilestone.subtitle}
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => playMilestoneCelebration(celebratingMilestone)}
                      disabled={isFireworksActive}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D98A76] hover:bg-[#C87D55] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap"
                    >
                      <PartyPopper className="w-3.5 h-3.5" />
                      <span>{isFireworksActive ? 'Đang bắn pháo hoa...' : 'Bắn lại pháo hoa'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Thanh tiến độ cột mốc tiếp theo + nút bắn pháo hoa mừng cột mốc đã đạt */}
          <div className="mt-4 max-w-md mx-auto">
            <div className="flex items-center justify-between gap-2 text-[11px] text-[#8C6D58] mb-1.5">
              <span className="truncate">
                {milestoneStatus.latestAchieved
                  ? `Đã đạt mốc ${milestoneStatus.latestAchieved.days.toLocaleString('vi-VN')} ngày`
                  : 'Đang hướng tới cột mốc đầu tiên'}
                <span className="mx-1.5" aria-hidden="true">·</span>
                <span className="text-[#3D2E28] font-medium">
                  Còn <span className="tabular-nums">{milestoneStatus.daysUntilNext}</span> ngày tới mốc {milestoneStatus.nextMilestone.title}
                </span>
              </span>
              {milestoneStatus.latestAchieved && !celebratingMilestone && (
                <button
                  type="button"
                  onClick={() => playMilestoneCelebration(milestoneStatus.latestAchieved!)}
                  className="inline-flex items-center gap-1 text-[#D98A76] hover:text-[#C87D55] font-semibold hover:underline transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                  title={`Bắn pháo hoa chúc mừng cột mốc ${milestoneStatus.latestAchieved.title}`}
                >
                  <PartyPopper className="w-3.5 h-3.5" />
                  <span>Mừng mốc</span>
                </button>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#8C6D58]/15 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#E8A598] to-[#D98A76] transition-all duration-500"
                style={{ width: `${Math.max(4, milestoneStatus.progressPercent)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats & Call to action */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-5 border-t border-[#8C6D58]/10">
          <button
            onClick={onOpenQuickUpload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white font-medium text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Đăng Kỷ Niệm Mới</span>
          </button>

          <button
            onClick={onOpenHandwrittenJournal}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#5E4233] hover:bg-[#432F24] text-amber-100 font-medium text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95 border border-amber-600/30 cursor-pointer"
            title="Mở cuốn sổ tay viết tay có thể lật trang, viết thư tình và ghi chú dài"
          >
            <Book className="w-4 h-4 text-amber-300" />
            <span>Mở Sổ Tay Kỷ Niệm</span>
          </button>

          <button
            onClick={triggerLoveShower}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#FFFDF9] hover:bg-[#F9F6F0] text-[#8C6D58] font-medium text-sm border border-[#8C6D58]/20 transition-all hover:border-[#E8A598]"
            title="Bắn pháo hoa tình yêu"
          >
            <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598]" />
            <span>Thả Tim ({totalLikes})</span>
          </button>

          <div className="text-xs text-[#8C6D58] font-medium px-3 py-1 bg-[#F9F6F0] rounded-full">
            {totalMemories} khoảnh khắc được lưu giữ
          </div>
        </div>
      </div>

      {/* Modal Chỉnh Sửa Thông Tin Cặp Đôi */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#8C6D58]/20 shadow-2xl relative">
            <h3 className="font-serif-romantic text-2xl font-bold text-[#3D2E28] mb-2">
              Thông Tin Của Hai Đứa
            </h3>
            <p className="text-xs text-[#8C6D58] mb-5">
              Cập nhật tên gọi thân thương và ngày bắt đầu câu chuyện tình yêu
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                    Tên người 1
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.personOne}
                    onChange={(e) => setEditForm({ ...editForm, personOne: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                    placeholder="Anh / Hoàng"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                    Tên người 2
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.personTwo}
                    onChange={(e) => setEditForm({ ...editForm, personTwo: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                    placeholder="Em / Linh"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                  Ngày bắt đầu yêu nhau
                </label>
                <input
                  type="date"
                  required
                  value={editForm.startDate}
                  onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                  Lời nhắn gửi / Thông điệp yêu thương
                </label>
                <textarea
                  rows={2}
                  value={editForm.anniversaryNote}
                  onChange={(e) => setEditForm({ ...editForm, anniversaryNote: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden resize-none"
                  placeholder="Viết một lời nhắn dịu dàng..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-medium text-[#8C6D58] hover:bg-[#F9F6F0] rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#E8A598] hover:bg-[#D98A76] rounded-xl shadow-xs transition-all"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
