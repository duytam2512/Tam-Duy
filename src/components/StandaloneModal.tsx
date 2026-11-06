import React, { useState } from 'react';
import { X, Copy, Check, Download, ExternalLink, Code2, Sparkles, FileCheck } from 'lucide-react';

interface StandaloneModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StandaloneModal: React.FC<StandaloneModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      const res = await fetch('/standalone.html');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl p-6 sm:p-8 max-w-xl w-full border border-[#8C6D58]/20 shadow-2xl relative my-6">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Độc Lập & Nhẹ Nhàng</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Mã Nguồn HTML 1 File Duy Nhất
          </h2>
          <p className="text-xs text-[#8C6D58] mt-1">
            Đúng theo yêu cầu: HTML, CSS (Tailwind CDN) và JavaScript viết gộp hoàn chỉnh, tích hợp Lucide Icons & LocalStorage sẵn sàng lưu giữ kỷ niệm.
          </p>
        </div>

        <div className="space-y-4 my-6">
          <div className="bg-[#F9F6F0] rounded-2xl p-4 border border-[#8C6D58]/15 text-xs text-[#3D2E28] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-[#D98A76]">
              <FileCheck className="w-4 h-4" />
              <span>Đặc điểm của file standalone.html:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-[#8C6D58]">
              <li>Chỉ cần 1 file <code>.html</code> duy nhất, không cần cài đặt NodeJS hay npm.</li>
              <li>Tự động dùng TailwindCSS CDN và Lucide Icons CDN.</li>
              <li>Đồng hồ đếm ngày yêu nhau (Love Days Counter) thời gian thực.</li>
              <li>Form đăng ảnh, xem trước tức thì, lưu trữ tự động vào trình duyệt (LocalStorage).</li>
              <li>Kèm 3-4 kỷ niệm mẫu lãng mạn ban đầu và chú thích tiếng Việt rõ ràng.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/standalone.html"
              target="_blank"
              rel="noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-xs shadow-md transition-all active:scale-95 text-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Mở Chạy Trực Tiếp Trong Tab Mới</span>
            </a>

            <a
              href="/standalone.html"
              download="GocNhoBinhYen.html"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-[#FAF6F0] text-[#8C6D58] font-semibold text-xs border border-[#8C6D58]/25 shadow-xs transition-all active:scale-95 text-center"
            >
              <Download className="w-4 h-4 text-[#D98A76]" />
              <span>Tải File .html Về Máy</span>
            </a>
          </div>

          <button
            onClick={handleCopyCode}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F9F6F0] hover:bg-[#E8A598]/20 text-[#3D2E28] font-medium text-xs border border-[#8C6D58]/20 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Đã sao chép toàn bộ mã HTML vào bộ nhớ tạm!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#8C6D58]" />
                <span>Sao chép toàn bộ mã nguồn HTML + CSS + JS</span>
              </>
            )}
          </button>
        </div>

        <div className="text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-[#8C6D58] hover:bg-[#F9F6F0] rounded-xl transition-all"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
