import React, { useState, useEffect } from 'react';
import { Heart, Calendar, Sparkles, Edit3, Clock, Share2, Download, FileCode } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CoupleInfo } from '../types';

interface HeaderHeroProps {
  coupleInfo: CoupleInfo;
  onUpdateCoupleInfo: (info: CoupleInfo) => void;
  onOpenQuickUpload: () => void;
  totalMemories: number;
  totalLikes: number;
  onOpenStandaloneModal: () => void;
}

export const HeaderHero: React.FC<HeaderHeroProps> = ({
  coupleInfo,
  onUpdateCoupleInfo,
  onOpenQuickUpload,
  totalMemories,
  totalLikes,
  onOpenStandaloneModal
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<CoupleInfo>(coupleInfo);

  // Tính toán thời gian yêu nhau
  const [timeTogether, setTimeTogether] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    setEditForm(coupleInfo);
  }, [coupleInfo]);

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(coupleInfo.startDate).getTime();
      const now = new Date().getTime();
      const diff = Math.max(0, now - start);

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeTogether({ days, hours, minutes, seconds });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [coupleInfo.startDate]);

  const triggerLoveShower = () => {
    confetti({
      particleCount: 70,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#E8A598', '#E5989B', '#F9DCC4', '#D98A76', '#8C6D58'],
      shapes: ['circle', 'square']
    });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCoupleInfo(editForm);
    setIsEditing(false);
    triggerLoveShower();
  };

  return (
    <header className="relative pt-6 pb-10 px-4 sm:px-6 max-w-5xl mx-auto">
      {/* Top action row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-[#8C6D58] bg-[#F9F6F0] px-3.5 py-1.5 rounded-full border border-[#8C6D58]/15">
          <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598] animate-pulse" />
          <span>Kho Kỷ Niệm Dành Riêng Cho Hai Đứa</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenStandaloneModal}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8C6D58] hover:text-[#3D2E28] bg-white hover:bg-[#F9F6F0] px-3 py-1.5 rounded-full border border-[#8C6D58]/20 shadow-xs transition-all"
            title="Xem mã nguồn HTML 1 file hoàn chỉnh để chạy độc lập"
          >
            <FileCode className="w-4 h-4 text-[#D98A76]" />
            <span className="hidden sm:inline">Mã nguồn</span> HTML 1 File
          </button>

          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#8C6D58] hover:text-[#3D2E28] bg-white hover:bg-[#F9F6F0] px-3 py-1.5 rounded-full border border-[#8C6D58]/20 shadow-xs transition-all"
            title="Đổi tên và ngày bắt đầu yêu"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Chỉnh sửa</span>
          </button>
        </div>
      </div>

      {/* Main Hero Card */}
      <div className="card-warm-pastel rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden">
        {/* Soft Background Accents */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-[#E8A598]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-[#F9DCC4]/30 rounded-full blur-3xl pointer-events-none" />

        {/* Couple Names */}
        <div className="inline-flex items-center gap-3 mb-3 bg-[#FFFDF9]/90 px-5 py-1.5 rounded-full border border-[#E8A598]/30 shadow-xs">
          <span className="font-serif-romantic text-lg sm:text-xl font-semibold text-[#3D2E28]">
            {coupleInfo.personOne}
          </span>
          <Heart className="w-4 h-4 text-[#E8A598] fill-[#E8A598]" />
          <span className="font-serif-romantic text-lg sm:text-xl font-semibold text-[#3D2E28]">
            {coupleInfo.personTwo}
          </span>
        </div>

        {/* Title & Slogan */}
        <h1 className="font-serif-romantic text-3xl sm:text-5xl font-bold tracking-tight text-[#3D2E28] mb-3">
          Góc Nhỏ Bình Yên
        </h1>
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
            <span>Kể từ ngày {new Date(coupleInfo.startDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        {/* Quick Stats & Call to action */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-5 border-t border-[#8C6D58]/10">
          <button
            onClick={onOpenQuickUpload}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white font-medium text-sm shadow-md hover:shadow-lg transition-all transform active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>+ Đăng Kỷ Niệm Mới</span>
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
