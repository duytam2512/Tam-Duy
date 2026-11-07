import React, { useRef, useEffect, useState } from 'react';
import { Download, Share2, Copy, Check, X, Sparkles, Heart } from 'lucide-react';
import { Memory, CoupleInfo } from '../types';

interface PolaroidShareModalProps {
  memory: Memory;
  coupleInfo: CoupleInfo;
  isOpen: boolean;
  onClose: () => void;
}

export const PolaroidShareModal: React.FC<PolaroidShareModalProps> = ({
  memory,
  coupleInfo,
  isOpen,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    if (!isOpen || !memory) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Thiết kế kích thước khung ảnh Polaroid chất lượng cao
      const canvasWidth = 800;
      const photoWidth = 720;
      const photoHeight = Math.round(photoWidth * 0.78);
      const canvasHeight = photoHeight + 360;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // 1. Nền giấy Polaroid kem sữa ấm áp
      ctx.fillStyle = '#FFFDF9';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Viền mềm ấm cúng
      ctx.strokeStyle = '#E8A598';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

      // 2. Vẽ ảnh chính giữa
      const photoX = 40;
      const photoY = 40;
      ctx.drawImage(img, photoX, photoY, photoWidth, photoHeight);

      // Viền nhẹ cho ảnh
      ctx.strokeStyle = 'rgba(140, 109, 88, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(photoX, photoY, photoWidth, photoHeight);

      // 3. Thông tin ngày tháng & địa điểm
      const infoY = photoY + photoHeight + 50;
      ctx.fillStyle = '#D98A76';
      ctx.font = '600 22px "Plus Jakarta Sans", sans-serif';
      const formattedDate = new Date(memory.date).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const locationText = `📍 ${memory.location || 'Một nơi bình yên'}  •  📅 ${formattedDate}`;
      ctx.fillText(locationText, 45, infoY);

      // 4. Dòng cảm xúc / Nhật ký (tự động ngắt dòng)
      ctx.fillStyle = '#3D2E28';
      ctx.font = '500 24px "Caveat", "Playfair Display", serif';

      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let currentY = y;

        for (let n = 0; n < words.length; n++) {
          const testLine = line + words[n] + ' ';
          const metrics = ctx.measureText(testLine);
          const testWidth = metrics.width;
          if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
            if (currentY > canvasHeight - 80) break; // giới hạn
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, x, currentY);
      };

      wrapText(`"${memory.caption}"`, 45, infoY + 50, photoWidth, 38);

      // 5. Watermark chân trang dịu dàng
      const footerY = canvasHeight - 40;
      ctx.fillStyle = '#8C6D58';
      ctx.font = 'italic 18px "Playfair Display", serif';
      const coupleWatermark = `♥ Góc Nhỏ Bình Yên • ${coupleInfo.personOne} & ${coupleInfo.personTwo}`;
      ctx.fillText(coupleWatermark, 45, footerY);

      // Chuyển sang Data URL để tải
      const url = canvas.toDataURL('image/png');
      setDownloadUrl(url);
      setIsGenerating(false);
    };

    img.onerror = () => {
      console.warn('Không thể tải ảnh cho canvas');
      setIsGenerating(false);
    };

    img.src = memory.imageUrl;
  }, [isOpen, memory, coupleInfo]);

  const handleCopyLink = async () => {
    try {
      const shareUrl = window.location.href.split('?')[0];
      await navigator.clipboard.writeText(
        `"${memory.caption}" - Kỷ niệm tại ${memory.location} của ${coupleInfo.personOne} & ${coupleInfo.personTwo} tại Góc Nhỏ Bình Yên: ${shareUrl}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-7 max-w-lg w-full border border-[#8C6D58]/20 shadow-2xl relative my-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Khung Ảnh Kỷ Niệm Polaroid</span>
          </div>
          <h3 className="font-serif-romantic text-2xl font-bold text-[#3D2E28]">
            Chia Sẻ Khung Ảnh Xinh Xắn
          </h3>
          <p className="text-xs text-[#8C6D58]">
            Ảnh kỷ niệm được lồng vào khung vintage kèm ngày, địa điểm và lời nhắn
          </p>
        </div>

        {/* Khung ảnh Polaroid Canvas Preview */}
        <div className="bg-[#F9F6F0] rounded-2xl p-3 border border-[#8C6D58]/15 flex flex-col items-center justify-center overflow-hidden">
          {isGenerating && (
            <div className="py-12 text-center text-xs text-[#8C6D58] flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[#E8A598] border-t-transparent rounded-full animate-spin" />
              <span>Đang tạo khung hình kỷ niệm xinh xắn...</span>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`w-full max-h-[380px] object-contain rounded-xl shadow-md ${
              isGenerating ? 'hidden' : 'block'
            }`}
          />
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-2.5">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={downloadUrl}
              download={`GocNhoBinhYen-${memory.date || 'ky-niem'}.png`}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-sm shadow-md transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Tải Khung Ảnh Về Máy</span>
            </a>

            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-[#F9F6F0] text-[#8C6D58] font-medium text-sm border border-[#8C6D58]/25 transition-all"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700">Đã sao chép!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Sao Chép Lời Nhắn</span>
                </>
              )}
            </button>
          </div>

          <p className="text-[11px] text-center text-[#8C6D58]">
            Bạn có thể gửi ảnh này cho người thương hoặc chia sẻ lên Story/Instagram ấm áp.
          </p>
        </div>
      </div>
    </div>
  );
};
