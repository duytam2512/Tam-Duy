import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Film,
  Play,
  Pause,
  Download,
  X,
  Music,
  Sparkles,
  Check,
  ChevronRight,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Sliders,
  Calendar,
  MapPin,
  Heart,
  Loader2,
  Layers,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Memory, CoupleInfo, MusicTrack } from '../types';
import { getStoredPlaylist } from '../services/storage';

interface GooglePhotosVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: Memory[];
  coupleInfo: CoupleInfo;
}

export type VideoTheme = 'kenburns' | 'fade' | 'polaroid' | 'heartbeat';
export type AspectRatio = '16:9' | '9:16' | '1:1';

interface LoadedImage {
  id: string;
  img: HTMLImageElement;
  memory: Memory;
}

export const GooglePhotosVideoModal: React.FC<GooglePhotosVideoModalProps> = ({
  isOpen,
  onClose,
  memories,
  coupleInfo
}) => {
  // Step 1: Chọn ảnh | Step 2: Xem trước & Tùy chỉnh & Tải về
  const [activeStep, setActiveStep] = useState<'select' | 'preview'>('select');

  // Danh sách ID ảnh được chọn
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>(() => {
    return memories.slice(0, 8).map((m) => m.id);
  });

  // Tùy chỉnh video
  const [theme, setTheme] = useState<VideoTheme>('kenburns');
  const [durationPerPhoto, setDurationPerPhoto] = useState<number>(3.5); // giây mỗi ảnh
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [videoTitle, setVideoTitle] = useState<string>(
    `Những ngày bình yên • ${coupleInfo.personOne} & ${coupleInfo.personTwo}`
  );
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [showIntroOutro, setShowIntroOutro] = useState<boolean>(true);

  // Nhạc nền
  const [playlist, setPlaylist] = useState<MusicTrack[]>([]);
  const [selectedTrackIndex, setSelectedTrackIndex] = useState<number>(0);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  // Trình phát Canvas Preview
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0); // giây
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Trạng thái tải ảnh & xuất video
  const [loadedImages, setLoadedImages] = useState<LoadedImage[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Animation frame ref
  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Lấy playlist nhạc
  useEffect(() => {
    if (isOpen) {
      const pl = getStoredPlaylist();
      setPlaylist(pl);
      // Mặc định chọn tất cả ảnh nếu chưa chọn
      if (selectedPhotoIds.length === 0 && memories.length > 0) {
        setSelectedPhotoIds(memories.slice(0, 10).map((m) => m.id));
      }
    }
  }, [isOpen, memories]);

  // Tính tổng thời lượng video (giây)
  const introDuration = showIntroOutro ? 2.5 : 0;
  const outroDuration = showIntroOutro ? 3.0 : 0;
  const photosDuration = selectedPhotoIds.length * durationPerPhoto;
  const totalDuration = introDuration + photosDuration + outroDuration;

  // Toggle chọn ảnh
  const handleTogglePhoto = (id: string) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) {
          return prev; // Giữ ít nhất 2 ảnh
        }
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedPhotoIds(memories.map((m) => m.id));
  };

  const handleSelectTop = (count: number) => {
    setSelectedPhotoIds(memories.slice(0, count).map((m) => m.id));
  };

  // Tải trước toàn bộ ảnh được chọn vào bộ nhớ HTMLImageElement
  const preloadSelectedImages = useCallback(async () => {
    setIsLoadingImages(true);
    const selectedMems = memories.filter((m) => selectedPhotoIds.includes(m.id));

    // Sắp xếp theo thứ tự đã chọn
    selectedMems.sort(
      (a, b) => selectedPhotoIds.indexOf(a.id) - selectedPhotoIds.indexOf(b.id)
    );

    const promises = selectedMems.map((mem) => {
      return new Promise<LoadedImage | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve({ id: mem.id, img, memory: mem });
        img.onerror = () => {
          console.warn('Lỗi tải ảnh kỷ niệm:', mem.imageUrl);
          resolve(null);
        };
        img.src = mem.imageUrl;
      });
    });

    const results = await Promise.all(promises);
    const valid = results.filter((item): item is LoadedImage => item !== null);
    setLoadedImages(valid);
    setIsLoadingImages(false);
  }, [memories, selectedPhotoIds]);

  // Chuyển sang bước Preview
  const handleProceedToPreview = async () => {
    if (selectedPhotoIds.length < 2) return;
    setActiveStep('preview');
    setCurrentTime(0);
    setIsPlaying(true);
    await preloadSelectedImages();
  };

  // Quản lý âm thanh khi preview
  useEffect(() => {
    const selectedTrack = playlist[selectedTrackIndex] || playlist[0];
    if (activeStep === 'preview' && selectedTrack && !selectedTrack.isYouTube) {
      if (!audioPreviewRef.current) {
        audioPreviewRef.current = new Audio();
        audioPreviewRef.current.loop = true;
      }
      audioPreviewRef.current.src = selectedTrack.url;
      audioPreviewRef.current.muted = isAudioMuted;
      if (isPlaying) {
        audioPreviewRef.current.play().catch(() => {});
      }
    }

    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, [activeStep, selectedTrackIndex, playlist, isAudioMuted]);

  // Đồng bộ Play / Pause âm thanh
  useEffect(() => {
    if (audioPreviewRef.current) {
      if (isPlaying && activeStep === 'preview') {
        audioPreviewRef.current.play().catch(() => {});
      } else {
        audioPreviewRef.current.pause();
      }
    }
  }, [isPlaying, activeStep]);

  // Canvas kích thước chuẩn
  const getCanvasDimensions = () => {
    if (aspectRatio === '9:16') return { width: 720, height: 1280 };
    if (aspectRatio === '1:1') return { width: 1080, height: 1080 };
    return { width: 1280, height: 720 }; // 16:9
  };

  // Vẽ 1 frame hình ảnh lên Canvas dựa trên currentTime
  const renderFrame = useCallback(
    (ctx: CanvasRenderingContext2D, time: number, w: number, h: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#1E1715'; // Nền đen ấm
      ctx.fillRect(0, 0, w, h);

      // 1. INTRO CARD (0 -> introDuration)
      if (showIntroOutro && time < introDuration) {
        const introProgress = time / introDuration;
        const alpha =
          introProgress < 0.2
            ? introProgress / 0.2
            : introProgress > 0.8
            ? (1 - introProgress) / 0.2
            : 1;

        // Gradient nền lãng mạn
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#3D2E28');
        grad.addColorStop(0.5, '#5C4033');
        grad.addColorStop(1, '#2B1E1A');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        // Biểu tượng trái tim vàng ấm
        ctx.fillStyle = '#E8A598';
        ctx.font = `${Math.round(h * 0.06)}px "Playfair Display", serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('❤', w / 2, h / 2 - h * 0.12);

        // Tựa đề video
        ctx.fillStyle = '#FFFDF9';
        ctx.font = `bold ${Math.round(h * 0.052)}px "Playfair Display", serif`;
        ctx.fillText(videoTitle, w / 2, h / 2 - h * 0.02);

        // Subtitle
        ctx.fillStyle = '#D98A76';
        ctx.font = `${Math.round(h * 0.03)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText(
          `${coupleInfo.personOne} & ${coupleInfo.personTwo} • Album Kỷ Niệm Tình Yêu`,
          w / 2,
          h / 2 + h * 0.07
        );
        ctx.restore();
        return;
      }

      // 2. OUTRO CARD (totalDuration - outroDuration -> totalDuration)
      if (showIntroOutro && time >= totalDuration - outroDuration) {
        const outroTime = time - (totalDuration - outroDuration);
        const outroProgress = outroTime / outroDuration;
        const alpha = outroProgress < 0.2 ? outroProgress / 0.2 : 1;

        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#2B1E1A');
        grad.addColorStop(0.5, '#4A342B');
        grad.addColorStop(1, '#1E1715');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));

        ctx.fillStyle = '#FFFDF9';
        ctx.font = `italic ${Math.round(h * 0.045)}px "Caveat", cursive`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          '“Hạnh phúc là từng ngày được cùng nhau bình yên bước tiếp...”',
          w / 2,
          h / 2 - h * 0.05
        );

        ctx.fillStyle = '#E8A598';
        ctx.font = `bold ${Math.round(h * 0.038)}px "Playfair Display", serif`;
        ctx.fillText(
          `${coupleInfo.personOne} ❤ ${coupleInfo.personTwo}`,
          w / 2,
          h / 2 + h * 0.04
        );

        ctx.fillStyle = '#8C6D58';
        ctx.font = `${Math.round(h * 0.025)}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillText('Góc Nhỏ Bình Yên', w / 2, h / 2 + h * 0.11);
        ctx.restore();
        return;
      }

      // 3. PHOTO SLIDESHOW VỚI TRANSITION THEO CHỦ ĐỀ
      if (loadedImages.length === 0) return;

      const photoTime = Math.max(0, time - introDuration);
      const photoIndex = Math.min(
        Math.floor(photoTime / durationPerPhoto),
        loadedImages.length - 1
      );
      const nextIndex = (photoIndex + 1) % loadedImages.length;

      const currentItem = loadedImages[photoIndex];
      const nextItem = loadedImages[nextIndex];

      const slideProgress = (photoTime % durationPerPhoto) / durationPerPhoto; // 0 -> 1

      // Transition window (0.8s cuối của slide)
      const transitionDuration = 0.8;
      const transitionThreshold = (durationPerPhoto - transitionDuration) / durationPerPhoto;
      const isTransitioning = slideProgress > transitionThreshold;
      const transitionProgress = isTransitioning
        ? (slideProgress - transitionThreshold) / (1 - transitionThreshold)
        : 0;

      // Hàm vẽ ảnh với hiệu ứng Ken Burns (Zoom chậm + Pan nhẹ)
      const drawKenBurnsImage = (
        imgItem: LoadedImage,
        p: number,
        globalAlpha = 1,
        zoomDir = 1
      ) => {
        if (!imgItem || !imgItem.img) return;
        const img = imgItem.img;

        ctx.save();
        ctx.globalAlpha = globalAlpha;

        let scale = 1.0;
        let panX = 0;
        let panY = 0;

        if (theme === 'kenburns') {
          // Ken Burns zoom từ 1.05 -> 1.18
          const zoomAmount = 0.13;
          scale = zoomDir > 0 ? 1.05 + p * zoomAmount : 1.18 - p * zoomAmount;
          panX = (p - 0.5) * w * 0.04 * zoomDir;
          panY = (p - 0.5) * h * 0.03;
        } else if (theme === 'heartbeat') {
          const pulse = Math.sin(p * Math.PI * 4) * 0.025;
          scale = 1.08 + pulse;
        } else {
          // Fade thông thường: zoom nhẹ 1.08
          scale = 1.08;
        }

        // Tính toán tỉ lệ ảnh phủ vừa khít khung hình (object-fit: cover)
        const imgAspect = img.width / img.height;
        const canvasAspect = w / h;

        let drawW = w * scale;
        let drawH = h * scale;

        if (imgAspect > canvasAspect) {
          drawW = drawH * imgAspect;
        } else {
          drawH = drawW / imgAspect;
        }

        const drawX = (w - drawW) / 2 + panX;
        const drawY = (h - drawH) / 2 + panY;

        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // Hiệu ứng Polaroid nếu chọn theme polaroid
        if (theme === 'polaroid') {
          ctx.strokeStyle = '#FAF7F2';
          ctx.lineWidth = Math.round(w * 0.02);
          ctx.strokeRect(drawX, drawY, drawW, drawH);
        }

        // Lớp Vignette viền tối dịu dàng phong cách điện ảnh
        const vigGrad = ctx.createRadialGradient(
          w / 2,
          h / 2,
          w * 0.35,
          w / 2,
          h / 2,
          w * 0.75
        );
        vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vigGrad.addColorStop(1, 'rgba(20, 12, 10, 0.45)');
        ctx.fillStyle = vigGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.restore();
      };

      // Vẽ ảnh chính
      const zoomDirection = photoIndex % 2 === 0 ? 1 : -1;
      drawKenBurnsImage(currentItem, slideProgress, 1, zoomDirection);

      // Vẽ chuyển cảnh sang ảnh kế tiếp
      if (isTransitioning && nextItem) {
        const nextZoomDirection = nextIndex % 2 === 0 ? 1 : -1;
        drawKenBurnsImage(
          nextItem,
          transitionProgress * 0.2,
          transitionProgress,
          nextZoomDirection
        );
      }

      // 4. SUBTITLE & CAPTION OVERLAY (Giống Google Photos)
      if (showCaptions && currentItem.memory) {
        const mem = currentItem.memory;
        ctx.save();

        // Lớp gradient mờ ở chân ảnh để chữ luôn nổi bật
        const subGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
        subGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        subGrad.addColorStop(0.6, 'rgba(30, 20, 16, 0.65)');
        subGrad.addColorStop(1, 'rgba(20, 12, 10, 0.88)');
        ctx.fillStyle = subGrad;
        ctx.fillRect(0, h * 0.75, w, h * 0.25);

        // Ngày & Địa điểm
        ctx.fillStyle = '#E8A598';
        ctx.font = `600 ${Math.round(h * 0.026)}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(
          `📅 ${new Date(mem.date).toLocaleDateString('vi-VN')}   📍 ${
            mem.location || 'Một nơi bình yên'
          }`,
          w * 0.06,
          h * 0.86
        );

        // Dòng nhật ký cảm xúc
        if (mem.caption) {
          ctx.fillStyle = '#FFFDF9';
          ctx.font = `italic ${Math.round(h * 0.038)}px "Caveat", cursive`;
          const maxCaptionWidth = w * 0.88;
          let truncated = mem.caption;
          if (ctx.measureText(truncated).width > maxCaptionWidth) {
            while (ctx.measureText(truncated + '...').width > maxCaptionWidth && truncated.length > 5) {
              truncated = truncated.slice(0, -1);
            }
            truncated += '...';
          }
          ctx.fillText(`“${truncated}”`, w * 0.06, h * 0.92);
        }

        ctx.restore();
      }
    },
    [
      loadedImages,
      showIntroOutro,
      introDuration,
      outroDuration,
      totalDuration,
      durationPerPhoto,
      theme,
      showCaptions,
      videoTitle,
      coupleInfo
    ]
  );

  // Vòng lặp Animation Frame cho Preview mượt mà 60fps
  useEffect(() => {
    if (activeStep !== 'preview' || !isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      lastTimestampRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = getCanvasDimensions();
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const step = (timestamp: number) => {
      if (lastTimestampRef.current !== null) {
        const delta = (timestamp - lastTimestampRef.current) / 1000;
        setCurrentTime((prev) => {
          const next = prev + delta;
          if (next >= totalDuration) {
            return 0; // Lặp lại từ đầu
          }
          return next;
        });
      }
      lastTimestampRef.current = timestamp;

      renderFrame(ctx, currentTime, width, height);
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [activeStep, isPlaying, currentTime, totalDuration, renderFrame, aspectRatio]);

  // Tua video bằng thanh trượt
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const { width, height } = getCanvasDimensions();
        renderFrame(ctx, val, width, height);
      }
    }
  };

  // 4. XUẤT VIDEO THÀNH TỆP MP4 / WEBM (DOWNLOAD CHUẨN ĐIỆN ẢNH)
  const handleExportVideo = async () => {
    if (loadedImages.length === 0) return;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    try {
      const { width, height } = getCanvasDimensions();
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = width;
      exportCanvas.height = height;
      const ctx = exportCanvas.getContext('2d')!;

      // Tạo MediaStream từ canvas 30fps
      const canvasStream = exportCanvas.captureStream(30);

      // Trộn âm thanh nếu có
      let combinedStream = canvasStream;
      let audioCtx: AudioContext | null = null;
      let audioSourceNode: MediaElementAudioSourceNode | null = null;
      const selectedTrack = playlist[selectedTrackIndex] || playlist[0];

      if (selectedTrack && !selectedTrack.isYouTube && !isAudioMuted) {
        try {
          audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const dest = audioCtx.createMediaStreamDestination();
          const exportAudio = new Audio();
          exportAudio.crossOrigin = 'anonymous';
          exportAudio.src = selectedTrack.url;
          exportAudio.loop = true;

          audioSourceNode = audioCtx.createMediaElementSource(exportAudio);
          audioSourceNode.connect(dest);
          audioSourceNode.connect(audioCtx.destination);

          exportAudio.play().catch(() => {});

          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) {
            combinedStream = new MediaStream([
              ...canvasStream.getVideoTracks(),
              audioTrack
            ]);
          }
        } catch (audioErr) {
          console.warn('Không thể thêm audio stream, tiếp tục xuất video không tiếng:', audioErr);
        }
      }

      // Chọn mimeType hỗ trợ
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: 4500000 // 4.5 Mbps chuẩn nét cao
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      const recordPromise = new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          resolve(blob);
        };
      });

      recorder.start();

      // Tiến hành dựng từng frame theo thời gian thực (30 fps)
      const fps = 30;
      const totalFrames = Math.ceil(totalDuration * fps);
      const frameInterval = 1 / fps;

      for (let f = 0; f < totalFrames; f++) {
        const renderTime = f * frameInterval;
        renderFrame(ctx, renderTime, width, height);
        setExportProgress(Math.round(((f + 1) / totalFrames) * 100));

        // Nhường luồng CPU cho browser thở
        await new Promise((res) => setTimeout(res, 1000 / fps));
      }

      recorder.stop();
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }

      const videoBlob = await recordPromise;

      // Tạo liên kết tải video về máy
      const downloadUrl = URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const cleanFileName = `Goc-Nho-Binh-Yen-${coupleInfo.personOne}-${coupleInfo.personTwo}-${Date.now()}.webm`;
      a.download = cleanFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      // Pháo hoa ăn mừng khi dựng xong video
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#E8A598', '#D98A76', '#F9DCC4', '#C87D55']
      });
    } catch (err) {
      console.error('Lỗi khi xuất video:', err);
      alert('Không thể tạo file video trên trình duyệt này. Bạn có thể xem trực tiếp mượt mà ngay trên web nhé!');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden relative">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-[#8C6D58]/10 flex items-center justify-between shrink-0 bg-[#FAF7F2]/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <Film className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif-romantic font-bold text-lg text-[#3D2E28] flex items-center gap-2">
                <span>Ghép Ảnh Thành Video Kỷ Niệm</span>
                <span className="text-[10px] font-sans font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                  Chuẩn Google Photos
                </span>
              </h3>
              <p className="text-xs text-[#8C6D58]">
                {activeStep === 'select'
                  ? 'Chọn những khoảnh khắc đẹp nhất để tạo thước phim tình yêu'
                  : 'Xem trước thước phim, chọn nhạc nền và tải video chất lượng cao'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeStep === 'preview' && (
              <button
                type="button"
                onClick={() => {
                  setActiveStep('select');
                  setIsPlaying(false);
                }}
                className="text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] bg-white border border-[#8C6D58]/20 px-3 py-1.5 rounded-full transition-all cursor-pointer"
              >
                ← Chọn lại ảnh
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full cursor-pointer transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {activeStep === 'select' ? (
            /* ========================================================
               BƯỚC 1: CHỌN ẢNH VÀO VIDEO (PHOTO SELECTION)
               ======================================================== */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#8C6D58]/15">
                <div className="text-xs text-[#3D2E28] font-medium">
                  Đã chọn: <strong className="text-rose-600 font-bold text-sm">{selectedPhotoIds.length}</strong> / {memories.length} ảnh
                  <span className="text-[11px] text-[#8C6D58] ml-2">
                    (~{Math.round(selectedPhotoIds.length * durationPerPhoto + (showIntroOutro ? 5.5 : 0))}s video)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs px-2.5 py-1 rounded-full bg-white text-[#8C6D58] hover:text-[#3D2E28] border border-[#8C6D58]/20 transition-all cursor-pointer"
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTop(6)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 font-medium transition-all cursor-pointer"
                  >
                    Top 6 ảnh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTop(12)}
                    className="text-xs px-2.5 py-1 rounded-full bg-white text-rose-600 hover:bg-rose-50 border border-rose-200 font-medium transition-all cursor-pointer"
                  >
                    Top 12 ảnh
                  </button>
                </div>
              </div>

              {/* Lưới chọn ảnh */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[50vh] overflow-y-auto pr-1 py-1">
                {memories.map((mem) => {
                  const isSelected = selectedPhotoIds.includes(mem.id);
                  const orderIndex = selectedPhotoIds.indexOf(mem.id) + 1;
                  return (
                    <div
                      key={mem.id}
                      onClick={() => handleTogglePhoto(mem.id)}
                      className={`relative aspect-4/3 rounded-2xl overflow-hidden cursor-pointer border-2 transition-all group ${
                        isSelected
                          ? 'border-rose-500 shadow-md ring-2 ring-rose-400/30 scale-[0.98]'
                          : 'border-transparent opacity-65 hover:opacity-100 hover:border-[#8C6D58]/30'
                      }`}
                    >
                      <img
                        src={mem.imageUrl}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Check badge */}
                      <div
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-black/40 text-white/80 border border-white/40'
                        }`}
                      >
                        {isSelected ? orderIndex : '+'}
                      </div>
                      {/* Caption tooltip */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 to-transparent text-white text-[10px] truncate">
                        {mem.caption || mem.location}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Nút tiếp tục sang Bước 2 */}
              <div className="pt-3 border-t border-[#8C6D58]/10 flex items-center justify-between">
                <span className="text-xs text-[#8C6D58]">
                  Mẹo: Bạn có thể chọn từ 2 đến 30 ảnh để video sinh động nhất.
                </span>
                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  disabled={selectedPhotoIds.length < 2 || isLoadingImages}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 hover:opacity-95 text-white font-semibold text-xs sm:text-sm shadow-md flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isLoadingImages ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang nạp ảnh...</span>
                    </>
                  ) : (
                    <>
                      <span>Tiếp tục xem trước</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ========================================================
               BƯỚC 2: XEM TRƯỚC LIVE & TÙY CHỈNH & TẢI VIDEO
               ======================================================== */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* CỘT TRÁI: MÀN HÌNH CANVAS PLAYER (7/12) */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <div
                  className={`w-full bg-[#1A120E] rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center border border-[#8C6D58]/20 ${
                    aspectRatio === '9:16'
                      ? 'max-w-[280px] sm:max-w-[320px] aspect-9/16'
                      : aspectRatio === '1:1'
                      ? 'max-w-[360px] sm:max-w-[420px] aspect-square'
                      : 'aspect-16/9 w-full'
                  }`}
                >
                  <canvas ref={canvasRef} className="w-full h-full object-contain" />

                  {/* Nút Play to đè giữa màn hình khi tạm dừng */}
                  {!isPlaying && (
                    <button
                      onClick={() => setIsPlaying(true)}
                      className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-xs shadow-xl transition-all cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    </button>
                  )}
                </div>

                {/* THANH ĐIỀU KHIỂN VIDEO PLAYER */}
                <div className="w-full mt-3 bg-[#FAF7F2] p-2.5 rounded-2xl border border-[#8C6D58]/15 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-1.5 rounded-lg bg-white text-[#3D2E28] hover:bg-[#F9F6F0] shadow-2xs transition-all cursor-pointer"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    {/* Thanh tua thời gian */}
                    <input
                      type="range"
                      min="0"
                      max={totalDuration || 1}
                      step="0.05"
                      value={currentTime}
                      onChange={handleSeek}
                      className="flex-1 accent-rose-500 h-1.5 bg-white rounded-lg cursor-pointer"
                    />

                    {/* Hiển thị thời gian */}
                    <span className="text-[11px] font-mono text-[#8C6D58] shrink-0">
                      {Math.floor(currentTime)}s / {Math.ceil(totalDuration)}s
                    </span>

                    <button
                      onClick={() => setIsAudioMuted(!isAudioMuted)}
                      className="p-1 text-[#8C6D58] hover:text-[#3D2E28] cursor-pointer"
                      title={isAudioMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                    >
                      {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* CỘT PHẢI: BẢNG TÙY BIẾN PHONG CÁCH & XUẤT VIDEO (5/12) */}
              <div className="lg:col-span-5 space-y-3.5">
                {/* 1. Tựa đề mở đầu */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3D2E28]">
                    Tựa đề video mở đầu (Intro Card):
                  </label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                {/* 2. Hiệu ứng chuyển cảnh (Theme) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3D2E28]">
                    Hiệu ứng ảnh (Google Photos Styles):
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'kenburns', name: 'Ken Burns Cinematic', desc: 'Zoom & Lướt êm' },
                      { id: 'fade', name: 'Crossfade Lãng Mạn', desc: 'Mờ dần dịu dàng' },
                      { id: 'polaroid', name: 'Khung Polaroid Cổ Điển', desc: 'Viền ảnh vintage' },
                      { id: 'heartbeat', name: 'Nhịp Đập Yêu Thương', desc: 'Nhịp đập trái tim' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id as VideoTheme)}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                          theme === t.id
                            ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-2xs font-semibold'
                            : 'bg-white border-[#8C6D58]/15 text-[#3D2E28] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <div className="text-xs truncate">{t.name}</div>
                        <div className="text-[9px] text-[#8C6D58]">{t.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Khung hình (Aspect Ratio) & Tốc độ chuyển ảnh */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#3D2E28]">Tỉ lệ khung hình:</label>
                    <select
                      value={aspectRatio}
                      onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-rose-500 focus:outline-hidden"
                    >
                      <option value="16:9">16:9 (Màn hình ngang / TV)</option>
                      <option value="9:16">9:16 (Story / TikTok / Điện thoại)</option>
                      <option value="1:1">1:1 (Vuông Instagram)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[#3D2E28]">Thời gian mỗi ảnh:</label>
                    <select
                      value={durationPerPhoto}
                      onChange={(e) => setDurationPerPhoto(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-rose-500 focus:outline-hidden"
                    >
                      <option value={2.5}>2.5 giây (Nhanh)</option>
                      <option value={3.5}>3.5 giây (Vừa vặn)</option>
                      <option value={5}>5.0 giây (Chậm rãi)</option>
                    </select>
                  </div>
                </div>

                {/* 4. Nhạc nền lãng mạn */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                    <Music className="w-3 h-3 text-[#D98A76]" />
                    <span>Nhạc nền video:</span>
                  </label>
                  <select
                    value={selectedTrackIndex}
                    onChange={(e) => setSelectedTrackIndex(parseInt(e.target.value, 10))}
                    className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-rose-500 focus:outline-hidden"
                  >
                    {playlist.map((track, idx) => (
                      <option key={track.id} value={idx}>
                        {track.title} - {track.artist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Tùy chọn hiển thị phụ đề & thẻ mở đầu */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-[#3D2E28]">
                    <input
                      type="checkbox"
                      checked={showCaptions}
                      onChange={(e) => setShowCaptions(e.target.checked)}
                      className="rounded accent-rose-500"
                    />
                    <span>Hiện ngày & nhật ký kỷ niệm</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-[#3D2E28]">
                    <input
                      type="checkbox"
                      checked={showIntroOutro}
                      onChange={(e) => setShowIntroOutro(e.target.checked)}
                      className="rounded accent-rose-500"
                    />
                    <span>Thẻ Intro & Lời kết</span>
                  </label>
                </div>

                {/* NÚT XUẤT VIDEO TẢI VỀ */}
                <div className="pt-2 border-t border-[#8C6D58]/10">
                  <button
                    type="button"
                    onClick={handleExportVideo}
                    disabled={isExporting}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:opacity-95 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Đang dựng video ({exportProgress}%)...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Tải Video Kỷ Niệm Về Máy</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-[#8C6D58] mt-1.5">
                    Video được dựng chất lượng cao kèm nhạc nền, sẵn sàng lưu vào điện thoại hoặc đăng Story/TikTok!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
