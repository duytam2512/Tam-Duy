import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Sparkles,
  RefreshCw,
  Layers,
  Heart,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'ios' | 'android' | 'features'>(
    isIOS ? 'ios' : 'android'
  );
  const [isInstalling, setIsInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const success = await install();
    setIsInstalling(false);
    if (success) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-lg bg-[#FFFDF9] rounded-3xl shadow-2xl border border-[#E8A598]/30 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#8C6D58] hover:text-[#3D2E28] flex items-center justify-center shadow-sm transition border border-[#E8A598]/20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header với Icon App & Tiêu đề */}
        <div className="bg-gradient-to-br from-[#FFF5F2] via-[#FAF6F0] to-[#F5ECE5] p-6 pb-5 border-b border-[#E8A598]/20 text-center relative">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-white shadow-md p-1.5 border border-[#C87D55]/20 flex items-center justify-center mb-3">
            <img
              src="/pwa-192x192.png"
              alt="Logo Góc Nhỏ Bình Yên"
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <h3 className="text-xl font-serif font-bold text-[#3D2E28] flex items-center justify-center gap-2">
            <span>Cài Đặt App "Góc Nhỏ" Trên Điện Thoại</span>
            <Sparkles className="w-4 h-4 text-[#C87D55]" />
          </h3>
          <p className="text-xs text-[#8C6D58] mt-1 max-w-sm mx-auto">
            Cài đặt làm ứng dụng độc lập trên điện thoại. Dùng mượt mà không thanh địa chỉ, mở bằng 1 chạm và tự động đồng bộ 2 chiều với Web!
          </p>

          {/* Tab chọn hệ điều hành */}
          <div className="flex items-center justify-center gap-2 mt-4 bg-white/60 p-1 rounded-2xl border border-[#E8A598]/20 max-w-xs mx-auto">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'android'
                  ? 'bg-[#C87D55] text-white shadow-sm'
                  : 'text-[#8C6D58] hover:text-[#3D2E28]'
              }`}
            >
              <span>Android / Cốc Cốc</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
                activeTab === 'ios'
                  ? 'bg-[#C87D55] text-white shadow-sm'
                  : 'text-[#8C6D58] hover:text-[#3D2E28]'
              }`}
            >
              <span>iPhone (iOS)</span>
            </button>
            <button
              onClick={() => setActiveTab('features')}
              className={`py-1.5 px-3 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1 ${
                activeTab === 'features'
                  ? 'bg-[#C87D55] text-white shadow-sm'
                  : 'text-[#8C6D58] hover:text-[#3D2E28]'
              }`}
            >
              <span>Đồng bộ 2 chiều</span>
            </button>
          </div>
        </div>

        {/* Nội dung Hướng Dẫn theo Tab */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* TAB 1: ANDROID / CỐC CỐC / CHROME */}
          {activeTab === 'android' && (
            <div className="space-y-4">
              {isInstallable && (
                <div className="bg-gradient-to-r from-[#E8A598]/20 to-[#FAF6F0] p-4 rounded-2xl border border-[#E8A598]/30 text-center">
                  <p className="text-sm font-semibold text-[#3D2E28] mb-2">
                    Trình duyệt của bạn hỗ trợ cài đặt tự động ngay bây giờ!
                  </p>
                  <button
                    onClick={handleInstallClick}
                    disabled={isInstalling || installSuccess}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#C87D55] to-[#E8A598] text-white font-medium shadow-md hover:shadow-lg transition transform active:scale-98 flex items-center justify-center gap-2"
                  >
                    {installSuccess ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-white" />
                        <span>Đã cài đặt thành công!</span>
                      </>
                    ) : isInstalling ? (
                      <span>Đang mở hộp thoại cài đặt...</span>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Cài Đặt App Ngay (1 Chạm)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              <div className="bg-white rounded-2xl p-4 border border-[#E8A598]/20 shadow-xs space-y-3">
                <h4 className="text-sm font-bold text-[#3D2E28] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#FAF6F0] text-[#C87D55] flex items-center justify-center text-xs font-bold border border-[#C87D55]/30">
                    1
                  </span>
                  <span>Cách cài đặt trên Google Chrome & Cốc Cốc Android:</span>
                </h4>

                <div className="space-y-2.5 text-xs text-[#6B5546] pl-7">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#C87D55]">Bước 1:</span>
                    <span>Bấm vào biểu tượng menu <strong>3 dấu chấm (⋮)</strong> ở góc trên bên phải màn hình trình duyệt.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#C87D55]">Bước 2:</span>
                    <span>Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong> (Add to Home screen).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-[#C87D55]">Bước 3:</span>
                    <span>Bấm <strong>"Cài đặt"</strong> xác nhận. Icon trái tim & mái nhà của "Góc Nhỏ" sẽ xuất hiện trên màn hình chính như ứng dụng tải từ CH Play!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IPHONE / IPAD (IOS SAFARI) */}
          {activeTab === 'ios' && (
            <div className="space-y-4">
              <div className="bg-[#FFF8F5] p-3.5 rounded-2xl border border-[#E8A598]/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs flex items-center justify-center shrink-0 border border-[#E8A598]/30 text-[#C87D55]">
                  <Share className="w-5 h-5" />
                </div>
                <div className="text-xs text-[#6B5546]">
                  <strong className="text-[#3D2E28] block">Lưu ý cho iPhone:</strong>
                  Vui lòng mở liên kết bằng trình duyệt <strong>Safari</strong> để có thể thêm thành App vào màn hình chính.
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#E8A598]/20 shadow-xs space-y-3.5 text-xs text-[#6B5546]">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FAF6F0] text-[#C87D55] flex items-center justify-center text-xs font-bold shrink-0 border border-[#C87D55]/30">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-[#3D2E28]">Bấm nút Chia Sẻ (Share):</span>
                    <p className="mt-0.5 text-[#8C6D58]">
                      Nhìn xuống thanh công cụ dưới cùng của Safari và chạm vào biểu tượng ô vuông có mũi tên trỏ lên (⬆️).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FAF6F0] text-[#C87D55] flex items-center justify-center text-xs font-bold shrink-0 border border-[#C87D55]/30">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-[#3D2E28]">Chọn "Thêm vào MH chính":</span>
                    <p className="mt-0.5 text-[#8C6D58]">
                      Cuộn xuống trong danh sách tùy chọn và chọn dòng có biểu tượng dấu cộng <strong>"Thêm vào MH chính"</strong> (Add to Home Screen).
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#FAF6F0] text-[#C87D55] flex items-center justify-center text-xs font-bold shrink-0 border border-[#C87D55]/30">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-[#3D2E28]">Bấm "Thêm" (Add):</span>
                    <p className="mt-0.5 text-[#8C6D58]">
                      Bấm chữ <strong>"Thêm"</strong> ở góc trên bên phải. Ứng dụng "Góc Nhỏ" sẽ xuất hiện trên màn hình iPhone, mở toàn màn hình mượt mà không có viền duyệt web!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GIẢI THÍCH TÍNH NĂNG & ĐỒNG BỘ 2 CHIỀU */}
          {activeTab === 'features' && (
            <div className="space-y-3">
              <div className="bg-white p-4 rounded-2xl border border-[#E8A598]/20 shadow-xs space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#FAF6F0] text-[#C87D55] shrink-0 mt-0.5">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#3D2E28]">Đồng bộ tức thì 2 chiều (Cloud Firestore)</h5>
                    <p className="text-[11px] text-[#8C6D58] mt-0.5 leading-relaxed">
                      Khi bạn đăng kỷ niệm hoặc tải ảnh lên từ App điện thoại, toàn bộ hình ảnh, caption, lượt thả tim sẽ <strong>ngay lập tức xuất hiện trên máy tính / laptop</strong> và ngược lại mà không cần tải lại trang.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-[#E8A598]/10">
                  <div className="p-1.5 rounded-lg bg-[#FAF6F0] text-[#C87D55] shrink-0 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#3D2E28]">Đầy đủ 100% tính năng như trên Web</h5>
                    <p className="text-[11px] text-[#8C6D58] mt-0.5 leading-relaxed">
                      Trên điện thoại, bạn có đầy đủ: Đồng hồ đếm ngày yêu nhau theo từng giây, trình phát nhạc YouTube, trình tạo video kỷ niệm Google Photos, hiệu ứng tuyết rơi lãng mạn và xuất ảnh Polaroid.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 pt-2 border-t border-[#E8A598]/10">
                  <div className="p-1.5 rounded-lg bg-[#FAF6F0] text-[#C87D55] shrink-0 mt-0.5">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[#3D2E28]">Trải nghiệm toàn màn hình (Standalone)</h5>
                    <p className="text-[11px] text-[#8C6D58] mt-0.5 leading-relaxed">
                      Ứng dụng ẩn thanh địa chỉ và các nút của trình duyệt web, hiển thị như một ứng dụng gốc (Native App) mượt mà và nhẹ nhàng, tiết kiệm pin tối đa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Trạng thái hiện tại của thiết bị & Nút Cập nhật */}
          <div className="bg-[#FAF6F0] p-3 rounded-xl border border-[#E8A598]/20 flex items-center justify-between text-xs">
            <span className="text-[#8C6D58]">Trạng thái ứng dụng:</span>
            {isInstalled ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Đang chạy chế độ App
              </span>
            ) : (
              <span className="font-semibold text-[#C87D55]">
                Chế độ duyệt Web (Có thể cài App)
              </span>
            )}
          </div>
        </div>

        {/* Footer với nút Kiểm tra cập nhật & Đóng */}
        <div className="p-4 bg-[#FAF6F0]/60 border-t border-[#E8A598]/20 flex items-center justify-between">
          <button
            onClick={() => {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then((reg) => {
                  reg.update().catch(() => {});
                  window.location.reload();
                });
              } else {
                window.location.reload();
              }
            }}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-white hover:bg-[#FAF6F0] text-[#C87D55] text-xs font-medium border border-[#C87D55]/30 shadow-xs transition"
            title="Tải lại để nhận ngay các thay đổi mới nhất từ Google Studio"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cập nhật bản mới</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-white hover:bg-[#FAF6F0] text-[#8C6D58] hover:text-[#3D2E28] text-xs font-medium border border-[#E8A598]/20 shadow-xs transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
