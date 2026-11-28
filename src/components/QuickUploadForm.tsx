import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  Calendar,
  Heart,
  Sparkles,
  X,
  Check,
  Tag,
  Wand2,
  RefreshCw,
  Library,
  ChevronRight,
  ChevronLeft,
  Flame,
  Dices,
  Smile,
  Plus,
  Trash2,
  Layers,
  FileCheck,
  Type,
  Video,
  Film,
  Link2,
  SlidersHorizontal,
  Music,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Memory,
  MemoryMusic,
  MusicTrack,
  SAMPLE_PHOTO_LIBRARY,
  CoupleInfo,
  CaptionFont,
  FONT_OPTIONS
} from '../types';
import {
  compressImageFile,
  extractVideoMetadataAndThumbnail,
  uploadVideoFile,
  createFallbackVideoPoster,
  formatVideoDuration,
  getVideoEmbedInfo,
  getStoredPlaylist
} from '../services/storage';
import { generateSmartCaptions, extractContextualEmojis, CaptionTone, CaptionSuggestion } from '../utils/aiCaptionEngine';
import { resolveMemoryMusicLink, musicTrackToMemoryMusic } from '../utils/memoryMusic';
import {
  PRESET_MEMORY_TAGS,
  MAX_TAGS_PER_MEMORY,
  normalizeTagName,
  dedupeTags
} from '../utils/memoryTags';
import { MemoryMusicBar } from './MemoryMusicBar';
import { PhotoEditorModal } from './PhotoEditorModal';
import {
  PhotoEditState,
  DEFAULT_CROP,
  renderEditedPhotoDataUrl
} from '../utils/photoEditor';

interface QuickUploadFormProps {
  onAddMemory: (
    memory:
      | Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>
      | Omit<Memory, 'id' | 'likes' | 'isLiked' | 'createdAt'>[],
    onProgress?: (statusText: string) => void
  ) => Promise<void> | void;
  isOpen: boolean;
  onClose: () => void;
  coupleInfo: CoupleInfo;
  availableCustomTags?: string[];
  currentFont?: CaptionFont;
  fontClass?: string;
  onOpenFontModal?: () => void;
  onSaveFont?: (font: CaptionFont) => void;
}

export const QuickUploadForm: React.FC<QuickUploadFormProps> = ({
  onAddMemory,
  isOpen,
  onClose,
  coupleInfo,
  availableCustomTags = [],
  currentFont = 'caveat',
  fontClass = 'font-handwriting',
  onOpenFontModal,
  onSaveFont
}) => {
  // Chế độ đăng: Ảnh hoặc Video
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');

  // Danh sách ảnh đã chọn (hỗ trợ chọn nhiều ảnh) + lưu ảnh gốc & trạng thái chỉnh sửa không mất chất lượng
  const [images, setImages] = useState<string[]>([]);
  const [originalImages, setOriginalImages] = useState<string[]>([]);
  const [photoEditStates, setPhotoEditStates] = useState<(PhotoEditState | null)[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
  const [uploadMode, setUploadMode] = useState<'album' | 'individual'>('album');

  // Trạng thái Video đã chọn
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>('');
  const [videoPosterUrl, setVideoPosterUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoLinkInput, setVideoLinkInput] = useState<string>('');
  const [videoUploadProgress, setVideoUploadProgress] = useState<number>(0);
  const [isProcessingVideo, setIsProcessingVideo] = useState<boolean>(false);

  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Kỷ niệm']);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState<{ done: number; total: number } | null>(null);
  const [saveStatusText, setSaveStatusText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Trạng thái Kho ảnh mẫu mở rộng
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [activeSampleCategory, setActiveSampleCategory] = useState<string>(
    SAMPLE_PHOTO_LIBRARY[0].category
  );

  // Trạng thái Gemini AI Viết Caption
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiTone, setAiTone] = useState<CaptionTone>('romantic');
  const [aiKeywords, setAiKeywords] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<CaptionSuggestion[]>([]);
  const [suggestedEmojis, setSuggestedEmojis] = useState<string[]>([
    '💖', '✨', '🤍', '🌸', '📸', '🥰', '☕', '🍃'
  ]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Trạng thái Nhạc nền kỷ niệm (chọn theo link YouTube / Zing MP3 / MP3 / Drive hoặc từ playlist)
  const [selectedMusic, setSelectedMusic] = useState<MemoryMusic | null>(null);
  const [musicLinkInput, setMusicLinkInput] = useState<string>('');
  const [musicCustomTitle, setMusicCustomTitle] = useState<string>('');
  const [isResolvingMusic, setIsResolvingMusic] = useState<boolean>(false);
  const [musicError, setMusicError] = useState<string | null>(null);
  const [showMusicPanel, setShowMusicPanel] = useState<boolean>(true);
  const [quickPlaylistSongs, setQuickPlaylistSongs] = useState<MusicTrack[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredPlaylist().filter((t) => Boolean(t?.url || t?.youtubeId));
      setQuickPlaylistSongs(stored.slice(0, 6));
    }
  }, [isOpen]);

  const handleResolveMusicLink = async () => {
    const raw = musicLinkInput.trim();
    if (!raw) {
      setMusicError('Hãy dán link YouTube, Zing MP3, file .mp3 hoặc nhập tên bài hát nhé!');
      return;
    }
    setMusicError(null);
    setIsResolvingMusic(true);
    try {
      const resolved = await resolveMemoryMusicLink(raw, musicCustomTitle);
      setSelectedMusic(resolved);
      setMusicLinkInput('');
      setMusicCustomTitle('');
      setShowMusicPanel(true);
    } catch (err: any) {
      setMusicError(err?.message || 'Không thể nhận diện đường dẫn nhạc này. Bạn thử link khác nhé!');
    } finally {
      setIsResolvingMusic(false);
    }
  };

  const handlePickSavedSong = (track: MusicTrack) => {
    setMusicError(null);
    setSelectedMusic(musicTrackToMemoryMusic(track));
    setShowMusicPanel(true);
  };

  const suggestedUploadTags = dedupeTags([...PRESET_MEMORY_TAGS, ...availableCustomTags]);

  const handleToggleMemoryTag = (tagName: string) => {
    const normalized = normalizeTagName(tagName);
    if (!normalized) return;
    setSelectedTags((prev) => {
      const exists = prev.some((t) => t.toLowerCase() === normalized.toLowerCase());
      if (exists) {
        return prev.length > 1
          ? prev.filter((t) => t.toLowerCase() !== normalized.toLowerCase())
          : prev;
      }
      if (prev.length >= MAX_TAGS_PER_MEMORY) {
        return [...prev.slice(0, MAX_TAGS_PER_MEMORY - 1), normalized];
      }
      return [...prev, normalized];
    });
  };

  const handleAddCustomTag = () => {
    const normalized = normalizeTagName(customTagInput);
    if (!normalized) return;
    setSelectedTags((prev) => {
      if (prev.some((t) => t.toLowerCase() === normalized.toLowerCase())) return prev;
      if (prev.length >= MAX_TAGS_PER_MEMORY) {
        return [...prev.slice(0, MAX_TAGS_PER_MEMORY - 1), normalized];
      }
      return [...prev, normalized];
    });
    setCustomTagInput('');
  };

  // Dọn dẹp Object URL khi đổi hoặc xóa video preview
  useEffect(() => {
    return () => {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(videoPreviewUrl);
        } catch {}
      }
    };
  }, [videoPreviewUrl]);

  // Đảm bảo activeImageIndex luôn hợp lệ
  useEffect(() => {
    if (activeImageIndex >= images.length && images.length > 0) {
      setActiveImageIndex(images.length - 1);
    }
  }, [images.length, activeImageIndex]);

  const activeImage = mediaMode === 'video' ? videoPosterUrl : images[activeImageIndex] || images[0] || '';

  // Nén ảnh theo từng cặp 2 ảnh/lượt để tránh tràn RAM trên iPhone Safari khi chọn 10-30 ảnh cùng lúc
  const compressFilesInBatches = async (files: File[]) => {
    const total = files.length;
    if (total === 0) return;

    setValidationError(null);
    setIsCompressing(true);
    setCompressProgress({ done: 0, total });

    const succeeded: string[] = [];
    let failedCount = 0;
    let doneCount = 0;
    const CONCURRENCY = 2;

    try {
      for (let i = 0; i < total; i += CONCURRENCY) {
        const batch = files.slice(i, i + CONCURRENCY);
        const results = await Promise.all(
          batch.map(async (file) => {
            try {
              // Tối ưu kích thước và chất lượng gọn nhẹ hơn khi đăng nhiều ảnh cùng lúc
              const maxWidth = total >= 8 ? 860 : 960;
              const quality = total >= 8 ? 0.72 : 0.76;
              return await compressImageFile(file, maxWidth, quality);
            } catch (err) {
              console.warn('Bỏ qua ảnh lỗi khi nén:', file.name, err);
              failedCount += 1;
              return null;
            } finally {
              doneCount += 1;
              setCompressProgress({ done: doneCount, total });
            }
          })
        );

        const validBatch = results.filter((item): item is string => Boolean(item));
        if (validBatch.length > 0) {
          succeeded.push(...validBatch);
          setImages((prev) => {
            const next = [...prev, ...validBatch];
            if (prev.length === 0) setActiveImageIndex(0);
            return next;
          });
          setOriginalImages((prev) => [...prev, ...validBatch]);
          setPhotoEditStates((prev) => [...prev, ...validBatch.map(() => null)]);
        }

        // Nhường 1 frame để trình duyệt di động giải phóng bộ nhớ canvas giữa các lượt nén
        await new Promise((resolve) => window.setTimeout(resolve, 25));
      }

      if (succeeded.length === 0) {
        setValidationError(
          'Không thể đọc các ảnh đã chọn từ thiết bị. Bạn hãy thử chọn ảnh định dạng JPG/PNG/HEIC khác nhé!'
        );
      } else if (failedCount > 0) {
        setValidationError(
          `Đã tối ưu thành công ${succeeded.length}/${total} ảnh (${failedCount} ảnh không đọc được đã được bỏ qua).`
        );
      }
    } catch (err: any) {
      console.warn('Lỗi nén ảnh hàng loạt:', err);
      setValidationError(err?.message || 'Không thể xử lý một số ảnh từ thiết bị. Bạn vui lòng thử lại nhé!');
    } finally {
      setIsCompressing(false);
      setCompressProgress(null);
    }
  };

  // Xử lý khi người dùng chọn nhiều file ảnh từ máy / điện thoại (đặc biệt tối ưu hóa iPhone)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    await compressFilesInBatches(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(
      (f) => f.type.startsWith('image/') || f.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)
    );
    if (files.length === 0) return;

    await compressFilesInBatches(files);
  };

  // Chọn ảnh từ Kho ảnh mẫu (cho phép chọn thêm nhiều ảnh)
  const handleSelectSample = (url: string, suggestedLocation: string) => {
    setValidationError(null);
    const existingIdx = originalImages.indexOf(url);
    if (existingIdx !== -1) {
      setImages((prev) => prev.filter((_, idx) => idx !== existingIdx));
      setOriginalImages((prev) => prev.filter((_, idx) => idx !== existingIdx));
      setPhotoEditStates((prev) => prev.filter((_, idx) => idx !== existingIdx));
    } else {
      setImages((prev) => [...prev, url]);
      setOriginalImages((prev) => [...prev, url]);
      setPhotoEditStates((prev) => [...prev, null]);
    }

    if (!location) {
      setLocation(suggestedLocation);
    }
    const matchingEmojis = extractContextualEmojis({
      personOne: coupleInfo.personOne || 'Anh',
      personTwo: coupleInfo.personTwo || 'Em',
      location: suggestedLocation,
      tone: aiTone
    });
    setSuggestedEmojis(matchingEmojis);
  };

  // Xóa một ảnh khỏi danh sách đã chọn
  const handleRemoveImage = (indexToRemove: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setOriginalImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setPhotoEditStates((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Xóa toàn bộ ảnh đã chọn
  const handleClearAllImages = () => {
    setImages([]);
    setOriginalImages([]);
    setPhotoEditStates([]);
    setActiveImageIndex(0);
    setEditingImageIndex(null);
  };

  // Lưu ảnh sau khi áp bộ lọc / cắt ảnh cho 1 ảnh hiện tại
  const handleApplyPhotoEdit = (editedDataUrl: string, state: PhotoEditState) => {
    if (editingImageIndex === null) return;
    const targetIdx = editingImageIndex;
    setImages((prev) => prev.map((img, idx) => (idx === targetIdx ? editedDataUrl : img)));
    setPhotoEditStates((prev) => prev.map((st, idx) => (idx === targetIdx ? state : st)));
  };

  // Áp dụng cùng tông màu vintage cho toàn bộ các ảnh trong album (giữ riêng cắt/xoay của ảnh hiện tại)
  const handleApplyFilterToAllPhotos = async (fullState: PhotoEditState) => {
    if (editingImageIndex === null) return;
    const activeIdx = editingImageIndex;
    const colorOnlyState: PhotoEditState = {
      ...fullState,
      rotation: 0,
      flipX: false,
      flipY: false,
      aspectRatio: 'free',
      crop: { ...DEFAULT_CROP }
    };

    const nextImages = [...images];
    const nextStates: (PhotoEditState | null)[] = [...photoEditStates];
    const CONCURRENCY = 2;
    for (let i = 0; i < images.length; i += CONCURRENCY) {
      const indices = Array.from(
        { length: Math.min(CONCURRENCY, images.length - i) },
        (_, offset) => i + offset
      );
      await Promise.all(
        indices.map(async (idx) => {
          const sourceUrl = originalImages[idx] || images[idx];
          const prevState = photoEditStates[idx];
          const stateForPhoto: PhotoEditState =
            idx === activeIdx
              ? fullState
              : {
                  ...colorOnlyState,
                  rotation: prevState?.rotation ?? 0,
                  flipX: prevState?.flipX ?? false,
                  flipY: prevState?.flipY ?? false,
                  aspectRatio: prevState?.aspectRatio ?? 'free',
                  crop: prevState?.crop ? { ...prevState.crop } : { ...DEFAULT_CROP }
                };
          try {
            nextImages[idx] = await renderEditedPhotoDataUrl(sourceUrl, stateForPhoto, {
              maxDimension: images.length >= 8 ? 900 : 1080,
              quality: images.length >= 8 ? 0.78 : 0.84
            });
            nextStates[idx] = stateForPhoto;
          } catch (err) {
            console.warn('Không thể áp bộ lọc cho ảnh #' + (idx + 1), err);
          }
        })
      );
    }
    setImages(nextImages);
    setPhotoEditStates(nextStates);
  };

  // Xử lý chọn file video từ máy tính / iPhone / Android
  const processSelectedVideoFile = async (file: File) => {
    setValidationError(null);
    if (file.size > 100 * 1024 * 1024) {
      setValidationError('Video vượt quá 100MB. Bạn hãy chọn video ngắn hơn (tối đa 100MB) nhé!');
      return;
    }

    setIsProcessingVideo(true);
    try {
      if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(videoPreviewUrl);
        } catch {}
      }
      const previewUrl = URL.createObjectURL(file);
      setSelectedVideoFile(file);
      setVideoPreviewUrl(previewUrl);
      setVideoLinkInput('');

      const { thumbnail, duration } = await extractVideoMetadataAndThumbnail(file);
      setVideoPosterUrl(thumbnail);
      setVideoDuration(duration);
    } catch (err: any) {
      console.warn('Lỗi đọc video:', err);
      setValidationError(err?.message || 'Không thể đọc file video này trên thiết bị.');
    } finally {
      setIsProcessingVideo(false);
    }
  };

  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedVideoFile(file);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleVideoDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = Array.from(e.dataTransfer.files).find(
      (f) => f.type.startsWith('video/') || f.name.match(/\.(mp4|mov|webm|m4v|3gp)$/i)
    );
    if (file) {
      await processSelectedVideoFile(file);
    }
  };

  const handleClearVideo = () => {
    if (videoPreviewUrl && videoPreviewUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(videoPreviewUrl);
      } catch {}
    }
    setSelectedVideoFile(null);
    setVideoPreviewUrl('');
    setVideoPosterUrl('');
    setVideoDuration(0);
    setVideoLinkInput('');
    setVideoUploadProgress(0);
  };

  // Gọi Gemini AI & Smart Caption Engine để viết Caption phong phú, không lặp lại
  const handleGenerateAiCaption = async () => {
    setIsAiGenerating(true);

    const smartResult = generateSmartCaptions({
      personOne: coupleInfo.personOne || 'Anh',
      personTwo: coupleInfo.personTwo || 'Em',
      location: location.trim(),
      tone: aiTone,
      keywords: aiKeywords.trim()
    });

    if (smartResult.suggestedEmojis?.length > 0) {
      setSuggestedEmojis(smartResult.suggestedEmojis);
    }

    try {
      const response = await fetch('/api/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: location.trim(),
          tone: aiTone,
          coupleNames: {
            personOne: coupleInfo.personOne || 'Anh',
            personTwo: coupleInfo.personTwo || 'Em'
          },
          keywords: aiKeywords.trim(),
          imageBase64: activeImage.startsWith('data:image') ? activeImage : undefined
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
          const defaultBadges = ['Thơ tình', 'Story ngắn', 'Sâu lắng', 'Ngọt ngào', 'Gắn với ảnh'];
          const mapped: CaptionSuggestion[] = data.suggestions.map((item: any, idx: number) => {
            if (typeof item === 'string') {
              return {
                text: item,
                badge: defaultBadges[idx % defaultBadges.length],
                emojis: '✨'
              };
            }
            return {
              text: item.text || String(item),
              badge: item.badge || 'Gợi ý hay',
              emojis: item.emojis || '✨'
            };
          });

          setAiSuggestions(mapped);

          if (Array.isArray(data.suggestedEmojis) && data.suggestedEmojis.length > 0) {
            setSuggestedEmojis(data.suggestedEmojis);
          }
          return;
        }
      }

      setAiSuggestions(smartResult.suggestions);
    } catch (error) {
      console.warn('Lỗi gọi /api/generate-caption, chuyển sang kho gợi ý thông minh:', error);
      setAiSuggestions(smartResult.suggestions);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleApplyAiSuggestion = (suggestionText: string) => {
    setCaption(suggestionText);
  };

  const handleAddEmojiToCaption = (emoji: string) => {
    setCaption((prev) => (prev ? `${prev} ${emoji}` : emoji));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (mediaMode === 'image' && images.length === 0) {
      setValidationError('Vui lòng chọn hoặc tải lên ít nhất một tấm ảnh kỷ niệm nhé!');
      return;
    }

    if (mediaMode === 'video' && !selectedVideoFile && !videoLinkInput.trim()) {
      setValidationError('Vui lòng chọn file video từ máy hoặc dán đường dẫn video nhé!');
      return;
    }

    if (!caption.trim()) {
      setValidationError('Hãy viết vài dòng cảm xúc hoặc bấm dùng Gemini AI để viết gợi ý nhé!');
      return;
    }

    setIsSubmitting(true);

    try {
      const memoryLocation = location.trim() || 'Một nơi bình yên';
      const pendingCustom = normalizeTagName(customTagInput);
      const finalTags = dedupeTags([
        ...selectedTags,
        ...(pendingCustom ? [pendingCustom] : [])
      ]).slice(0, MAX_TAGS_PER_MEMORY);
      const memoryTags = finalTags.length > 0 ? finalTags : ['Kỷ niệm'];
      const memoryTag = memoryTags[0];
      const memoryDate = date || new Date().toISOString().split('T')[0];

      // Nếu người dùng đã dán link nhạc nhưng bấm Lưu ngay mà chưa bấm "Chọn nhạc" -> tự phân giải luôn
      let attachedMusic: MemoryMusic | null = selectedMusic;
      if (!attachedMusic && musicLinkInput.trim()) {
        setSaveStatusText('Đang nhận diện link nhạc kỷ niệm...');
        attachedMusic = await resolveMemoryMusicLink(musicLinkInput, musicCustomTitle);
        setSelectedMusic(attachedMusic);
      }

      if (mediaMode === 'video') {
        let finalVideoUrl = videoLinkInput.trim();
        let finalPoster = videoPosterUrl || createFallbackVideoPoster('Video Kỷ Niệm');

        if (selectedVideoFile) {
          setVideoUploadProgress(5);
          const uploaded = await uploadVideoFile(selectedVideoFile, (pct) => {
            setVideoUploadProgress(pct);
          });
          finalVideoUrl = uploaded.videoUrl;
        } else if (finalVideoUrl) {
          if (!/^https?:\/\//i.test(finalVideoUrl) && !finalVideoUrl.startsWith('/')) {
            finalVideoUrl = `https://${finalVideoUrl}`;
          }
          const embedInfo = getVideoEmbedInfo(finalVideoUrl);
          if (embedInfo.poster && (!videoPosterUrl || videoPosterUrl.startsWith('data:image/svg'))) {
            finalPoster = embedInfo.poster;
          }
        }

        const safeDuration =
          Number.isFinite(videoDuration) && videoDuration > 0 ? Math.round(videoDuration) : undefined;

        await onAddMemory(
          {
            mediaType: 'video',
            videoUrl: finalVideoUrl,
            videoDuration: safeDuration,
            imageUrl: finalPoster,
            ...(attachedMusic ? { music: attachedMusic } : {}),
            date: memoryDate,
            location: memoryLocation,
            caption: caption.trim(),
            tag: memoryTag,
            tags: memoryTags
          },
          (status) => setSaveStatusText(status)
        );
      } else if (uploadMode === 'album' || images.length === 1) {
        // 1 bài viết album có nhiều ảnh (tự động chia mảnh lưu Cloud Media nếu >= 5 ảnh)
        await onAddMemory(
          {
            mediaType: 'image',
            imageUrl: images[0],
            images: images,
            ...(attachedMusic ? { music: attachedMusic } : {}),
            date: memoryDate,
            location: memoryLocation,
            caption: caption.trim(),
            tag: memoryTag,
            tags: memoryTags
          },
          (status) => setSaveStatusText(status)
        );
      } else {
        // Đăng thành nhiều bài viết riêng biệt (mỗi ảnh 1 bài)
        const list = images.map((imgUrl, i) => ({
          mediaType: 'image' as const,
          imageUrl: imgUrl,
          images: [imgUrl],
          ...(attachedMusic ? { music: attachedMusic } : {}),
          date: memoryDate,
          location: memoryLocation,
          caption: images.length > 1 ? `${caption.trim()} (Ảnh #${i + 1})` : caption.trim(),
          tag: memoryTag,
          tags: memoryTags
        }));
        await onAddMemory(list, (status) => setSaveStatusText(status));
      }

      confetti({
        particleCount: 60,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#E8A598', '#F9DCC4', '#D98A76']
      });

      // Reset form
      setImages([]);
      setOriginalImages([]);
      setPhotoEditStates([]);
      setEditingImageIndex(null);
      handleClearVideo();
      setCaption('');
      setLocation('');
      setSelectedTags(['Kỷ niệm']);
      setCustomTagInput('');
      setSelectedMusic(null);
      setMusicLinkInput('');
      setMusicCustomTitle('');
      setMusicError(null);
      setShowMusicPanel(true);
      setAiSuggestions([]);
      setShowAiPanel(false);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi đăng kỷ niệm:', err);
      setValidationError(
        err?.message ||
          'Không thể lưu kỷ niệm lên Cloud Firestore. Bạn vui lòng kiểm tra kết nối mạng và thử lại nhé!'
      );
    } finally {
      setIsSubmitting(false);
      setSaveStatusText('');
      setVideoUploadProgress(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#8C6D58]/20 shadow-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 relative card-warm-pastel">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Modal */}
        <div className="mb-4">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Thêm Khoảnh Khắc Mới</span>
          </div>
          <h2 className="font-serif-romantic text-2xl sm:text-3xl font-bold text-[#3D2E28]">
            Đăng Kỷ Niệm Của Hai Đứa
          </h2>
          <p className="text-xs text-[#8C6D58] mt-0.5">
            Chọn ảnh hoặc video kỷ niệm từ máy, kết nối Gemini AI để viết những dòng cảm xúc ngọt ngào
          </p>
        </div>

        {/* Bộ chuyển đổi loại kỷ niệm: Đăng Ảnh | Đăng Video */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-[#F9F6F0] rounded-2xl border border-[#8C6D58]/15 mb-4">
          <button
            type="button"
            onClick={() => {
              setMediaMode('image');
              setValidationError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mediaMode === 'image'
                ? 'bg-white text-[#3D2E28] shadow-xs border border-[#E8A598]/40'
                : 'text-[#8C6D58] hover:text-[#3D2E28]'
            }`}
          >
            <Camera className="w-4 h-4 text-[#D98A76]" />
            <span>Đăng Ảnh Kỷ Niệm</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMediaMode('video');
              setShowPhotoLibrary(false);
              setValidationError(null);
            }}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mediaMode === 'video'
                ? 'bg-white text-[#3D2E28] shadow-xs border border-[#E8A598]/40'
                : 'text-[#8C6D58] hover:text-[#3D2E28]'
            }`}
          >
            <Video className="w-4 h-4 text-[#D98A76]" />
            <span>Đăng Video Kỷ Niệm</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {validationError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-xl text-xs font-medium animate-fadeIn">
              ⚠️ {validationError}
            </div>
          )}

          {mediaMode === 'video' ? (
            /* CHẾ ĐỘ ĐĂNG VIDEO KỶ NIỆM */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#8C6D58] flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-[#D98A76]" />
                  <span>Video kỷ niệm (MP4 / MOV / WebM - tối đa 100MB)</span>
                  <span className="text-[#D98A76]">*</span>
                </label>
                {selectedVideoFile && (
                  <button
                    type="button"
                    onClick={handleClearVideo}
                    className="text-[11px] text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Đổi video khác
                  </button>
                )}
              </div>

              {videoPreviewUrl || videoLinkInput.trim() ? (
                (() => {
                  const linkPreview = !videoPreviewUrl && videoLinkInput.trim()
                    ? getVideoEmbedInfo(
                        /^https?:\/\//i.test(videoLinkInput.trim())
                          ? videoLinkInput.trim()
                          : `https://${videoLinkInput.trim()}`
                      )
                    : null;
                  return (
                    <div className="relative rounded-2xl overflow-hidden border-2 border-[#E8A598]/40 bg-black shadow-sm">
                      {linkPreview && linkPreview.kind === 'iframe' ? (
                        <iframe
                          src={linkPreview.src}
                          title="Xem trước video"
                          className="w-full h-56 sm:h-64 bg-black"
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      ) : (
                        <video
                          src={videoPreviewUrl || linkPreview?.src || videoLinkInput.trim()}
                          poster={videoPosterUrl || undefined}
                          controls
                          playsInline
                          className="w-full max-h-64 object-contain bg-black"
                        />
                      )}
                      <div className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-black/65 text-white text-[11px] font-semibold rounded-full backdrop-blur-xs flex items-center gap-1.5">
                        <Video className="w-3 h-3 text-[#E8A598]" />
                        <span>
                          {selectedVideoFile
                            ? `${selectedVideoFile.name.slice(0, 24)}${selectedVideoFile.name.length > 24 ? '...' : ''} (${(selectedVideoFile.size / (1024 * 1024)).toFixed(1)} MB)`
                            : 'Video từ đường dẫn'}
                        </span>
                        {videoDuration > 0 && (
                          <span className="text-[#E8A598]">• {formatVideoDuration(videoDuration)}</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleClearVideo}
                        className="absolute top-2.5 right-2.5 p-1.5 bg-rose-600/85 hover:bg-rose-700 text-white rounded-full shadow-md cursor-pointer"
                        title="Xóa video đã chọn"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })()
              ) : (
                <label
                  htmlFor="memory-video-upload-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleVideoDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all block ${
                    isDragging
                      ? 'border-[#D98A76] bg-[#E8A598]/15 scale-[0.99]'
                      : 'border-[#8C6D58]/25 hover:border-[#E8A598] bg-white hover:bg-[#FAF6F0]'
                  }`}
                >
                  <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#E8A598]/15 flex items-center justify-center text-[#D98A76]">
                    <Video className="w-6 h-6" />
                  </div>
                  <p className="text-xs sm:text-sm font-semibold text-[#3D2E28]">
                    Chạm để chọn video từ iPhone / Android / Máy tính
                  </p>
                  <p className="text-[11px] text-[#8C6D58] mt-1">
                    Hỗ trợ MP4, MOV (iPhone), WebM • Tối đa 100MB • Tải chia mảnh ổn định trên 4G/Wi-Fi
                  </p>
                  {isProcessingVideo && (
                    <div className="mt-2 text-xs text-[#D98A76] font-medium flex items-center justify-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang đọc thông tin & tạo ảnh bìa video...</span>
                    </div>
                  )}
                </label>
              )}

              <input
                id="memory-video-upload-input"
                ref={videoInputRef}
                type="file"
                accept="video/*,.mp4,.mov,.webm,.m4v,.3gp"
                onChange={handleVideoFileChange}
                className="sr-only"
              />

              {/* Thanh tiến độ tải video lên máy chủ */}
              {isSubmitting && videoUploadProgress > 0 && (
                <div className="bg-[#FAF7F2] p-3 rounded-xl border border-[#E8A598]/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#3D2E28]">
                    <span>
                      {videoUploadProgress >= 96
                        ? 'Đang hoàn tất lưu video kỷ niệm...'
                        : 'Đang tải video lên máy chủ (chia mảnh ổn định)...'}
                    </span>
                    <span className="text-[#D98A76]">{videoUploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E8A598]/20 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E8A598] to-[#D98A76] transition-all duration-200"
                      style={{ width: `${videoUploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Tùy chọn dán link video (YouTube, Google Drive, Dropbox, .mp4/.webm) */}
              {!selectedVideoFile && (
                <div className="relative">
                  <Link2 className="w-3.5 h-3.5 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={videoLinkInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVideoLinkInput(val);
                      if (val.trim()) {
                        const info = getVideoEmbedInfo(
                          /^https?:\/\//i.test(val.trim()) ? val.trim() : `https://${val.trim()}`
                        );
                        if (info.poster) {
                          setVideoPosterUrl(info.poster);
                        } else if (!videoPosterUrl) {
                          setVideoPosterUrl(createFallbackVideoPoster('Video Kỷ Niệm'));
                        }
                      }
                    }}
                    placeholder="Hoặc dán link video (YouTube, Google Drive, Dropbox, .mp4)..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          ) : (
            /* Ô Chọn / Tải nhiều ảnh lên với Live Preview */
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#8C6D58] flex items-center gap-1.5">
                  <span>Hình ảnh kỷ niệm</span>
                  {images.length > 0 && (
                    <span className="bg-[#E8A598]/20 text-[#D98A76] px-2 py-0.5 rounded-full text-[11px] font-bold">
                      {images.length} ảnh đã chọn
                    </span>
                  )}
                  <span className="text-[#D98A76]">*</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowPhotoLibrary(!showPhotoLibrary)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] bg-[#F9F6F0] hover:bg-[#E8A598]/20 px-2.5 py-1 rounded-full transition-all cursor-pointer"
                >
                  <Library className="w-3.5 h-3.5" />
                  <span>{showPhotoLibrary ? 'Đóng kho ảnh mẫu' : 'Mở kho ảnh mẫu (+20 ảnh)'}</span>
                </button>
              </div>

            {/* Kho Ảnh Mẫu Mở Rộng */}
            {showPhotoLibrary && (
              <div className="bg-[#FAF6F0] rounded-2xl p-3 border border-[#8C6D58]/20 mb-3 space-y-2 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#8C6D58]">
                    Bấm vào từng ảnh để chọn / bỏ chọn nhiều ảnh mẫu:
                  </span>
                  <span className="text-[11px] text-[#D98A76] font-medium">
                    Đã chọn {images.length} ảnh
                  </span>
                </div>

                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs no-scrollbar">
                  {SAMPLE_PHOTO_LIBRARY.map((cat) => (
                    <button
                      key={cat.category}
                      type="button"
                      onClick={() => setActiveSampleCategory(cat.category)}
                      className={`px-3 py-1 rounded-full whitespace-nowrap transition-all font-medium cursor-pointer ${
                        activeSampleCategory === cat.category
                          ? 'bg-[#E8A598] text-white shadow-xs'
                          : 'bg-white text-[#8C6D58] hover:text-[#3D2E28]'
                      }`}
                    >
                      {cat.category}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-h-48 overflow-y-auto">
                  {SAMPLE_PHOTO_LIBRARY.find((c) => c.category === activeSampleCategory)?.items.map(
                    (item) => {
                      const isSelected = originalImages.includes(item.url) || images.includes(item.url);
                      return (
                        <div
                          key={item.title}
                          onClick={() => handleSelectSample(item.url, item.suggestedLocation)}
                          className={`group relative rounded-xl overflow-hidden cursor-pointer aspect-4/3 border-2 transition-all shadow-xs ${
                            isSelected
                              ? 'border-[#D98A76] ring-2 ring-[#E8A598]/50'
                              : 'border-transparent hover:border-[#D98A76]/50'
                          }`}
                        >
                          <img
                            src={item.url}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#D98A76] text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end p-1.5">
                            <span className="text-[10px] text-white font-medium truncate">
                              {item.title}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

            {/* Vùng xem trước ảnh đã chọn */}
            {images.length > 0 ? (
              <div className="space-y-3">
                {/* Ảnh chính xem trước to rõ */}
                <div className="relative rounded-2xl overflow-hidden border-2 border-[#E8A598]/40 shadow-xs max-h-60 group bg-[#F9F6F0]">
                  <img
                    src={activeImage}
                    alt="Ảnh kỷ niệm xem trước"
                    className="w-full h-52 sm:h-60 object-cover"
                  />

                  {/* Nút lướt ảnh kế / trước nếu có nhiều ảnh */}
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                        }
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full transition-all cursor-pointer"
                        title="Ảnh trước"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/75 text-white rounded-full transition-all cursor-pointer"
                        title="Ảnh tiếp theo"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Badges trên ảnh */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/60 text-white text-[11px] font-semibold rounded-lg backdrop-blur-xs flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-[#E8A598]" />
                    <span>
                      Ảnh {activeImageIndex + 1} / {images.length}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingImageIndex(activeImageIndex)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFFDF9]/95 hover:bg-white text-[#3D2E28] rounded-full text-xs font-bold shadow-md transition-all cursor-pointer border border-[#E8A598]/60"
                      title="Chỉnh bộ lọc màu vintage, cân sáng & cắt ảnh"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Chỉnh ảnh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(activeImageIndex)}
                      className="p-1.5 bg-rose-600/85 hover:bg-rose-700 text-white rounded-full transition-all shadow-md cursor-pointer"
                      title="Xóa ảnh này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2 pointer-events-none">
                    <div className="px-2.5 py-1 bg-black/60 text-white text-[11px] rounded-lg backdrop-blur-xs flex items-center gap-1">
                      <Check className="w-3 h-3 text-[#E8A598]" />
                      <span>
                        {originalImages[activeImageIndex] &&
                        originalImages[activeImageIndex] !== images[activeImageIndex]
                          ? 'Đã áp chỉnh sửa nghệ thuật'
                          : 'Đã tối ưu cho cả web & điện thoại'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Danh sách dải thumbnail các ảnh đã chọn */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                  {images.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all group ${
                        activeImageIndex === idx
                          ? 'border-[#D98A76] ring-2 ring-[#E8A598]'
                          : 'border-[#8C6D58]/20 hover:border-[#E8A598]'
                      }`}
                    >
                      <img src={imgUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute top-0 left-0 bg-black/60 text-white text-[9px] px-1 rounded-br font-semibold">
                        #{idx + 1}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleRemoveImage(idx, e)}
                        className="absolute top-1 right-1 p-0.5 bg-black/70 hover:bg-rose-600 text-white rounded-full transition-colors opacity-80 group-hover:opacity-100"
                        title="Xóa ảnh này"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  {/* Nút thêm ảnh vào danh sách */}
                  <label
                    htmlFor="memory-upload-input-field"
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl border-2 border-dashed border-[#D98A76]/50 hover:border-[#D98A76] bg-[#E8A598]/10 hover:bg-[#E8A598]/20 flex flex-col items-center justify-center text-[#D98A76] transition-all shrink-0 cursor-pointer"
                    title="Chọn thêm ảnh từ máy"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-semibold mt-0.5">Thêm ảnh</span>
                  </label>

                  {/* Nút xóa tất cả */}
                  <button
                    type="button"
                    onClick={handleClearAllImages}
                    className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline px-2 shrink-0 cursor-pointer font-medium"
                  >
                    Xóa tất cả
                  </button>
                </div>

                {/* Tiến trình nén ảnh khi chọn thêm nhiều ảnh */}
                {isCompressing && (
                  <div className="bg-[#FAF7F2] px-3 py-2 rounded-xl border border-[#E8A598]/40 text-xs text-[#D98A76] font-medium flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                      <span>
                        {compressProgress
                          ? `Đang tối ưu ảnh ${compressProgress.done}/${compressProgress.total}...`
                          : 'Đang tối ưu dung lượng ảnh...'}
                      </span>
                    </span>
                    {compressProgress && (
                      <span className="font-bold">
                        {Math.round((compressProgress.done / Math.max(1, compressProgress.total)) * 100)}%
                      </span>
                    )}
                  </div>
                )}

                {/* Tùy chọn cách đăng khi chọn từ 2 ảnh trở lên */}
                {images.length > 1 && (
                  <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#8C6D58]/15 space-y-2 animate-fadeIn">
                    <span className="text-xs font-semibold text-[#8C6D58] block">
                      Tùy chọn hiển thị ({images.length} ảnh):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          uploadMode === 'album'
                            ? 'bg-white border-[#D98A76] shadow-xs'
                            : 'border-[#8C6D58]/15 hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uploadMode"
                          checked={uploadMode === 'album'}
                          onChange={() => setUploadMode('album')}
                          className="mt-0.5 text-[#D98A76] focus:ring-[#E8A598]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#3D2E28] flex items-center gap-1">
                            <Layers className="w-3.5 h-3.5 text-[#D98A76]" />
                            <span>1 bài viết Album ({images.length} ảnh)</span>
                          </div>
                          <p className="text-[11px] text-[#8C6D58] mt-0.5">
                            Gộp chung một bài viết kỷ niệm, có thể lướt xem toàn bộ {images.length} ảnh
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          uploadMode === 'individual'
                            ? 'bg-white border-[#D98A76] shadow-xs'
                            : 'border-[#8C6D58]/15 hover:bg-white/60'
                        }`}
                      >
                        <input
                          type="radio"
                          name="uploadMode"
                          checked={uploadMode === 'individual'}
                          onChange={() => setUploadMode('individual')}
                          className="mt-0.5 text-[#D98A76] focus:ring-[#E8A598]"
                        />
                        <div>
                          <div className="text-xs font-bold text-[#3D2E28] flex items-center gap-1">
                            <FileCheck className="w-3.5 h-3.5 text-[#D98A76]" />
                            <span>{images.length} bài viết riêng biệt</span>
                          </div>
                          <p className="text-[11px] text-[#8C6D58] mt-0.5">
                            Đăng từng ảnh thành 1 bài viết riêng biệt trên bảng tin
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <label
                htmlFor="memory-upload-input-field"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all block ${
                  isDragging
                    ? 'border-[#D98A76] bg-[#E8A598]/15 scale-[0.99]'
                    : 'border-[#8C6D58]/25 hover:border-[#E8A598] bg-white hover:bg-[#FAF6F0]'
                }`}
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-[#E8A598]/15 flex items-center justify-center text-[#D98A76]">
                  <Camera className="w-6 h-6" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-[#3D2E28]">
                  Chạm để chọn ảnh từ iPhone / Android / Máy tính (hỗ trợ chọn 10-30 ảnh cùng lúc)
                </p>
                <p className="text-[11px] text-[#8C6D58] mt-1">
                  💡 Bạn có thể chọn <span className="text-[#D98A76] font-semibold">nhiều ảnh cùng lúc</span> từ thư viện hoặc chụp ảnh mới
                </p>
                {isCompressing && (
                  <div className="mt-2 text-xs text-[#D98A76] font-medium flex items-center justify-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>
                      {compressProgress
                        ? `Đang tối ưu ảnh ${compressProgress.done}/${compressProgress.total}...`
                        : 'Đang xử lý và tối ưu dung lượng ảnh...'}
                    </span>
                  </div>
                )}
              </label>
            )}

            {/* Input file hỗ trợ đầy đủ các định dạng di động (HEIC, HEIF, JPG, PNG) */}
              <input
                id="memory-upload-input-field"
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>
          )}

          {/* Ô nhập ngày kỷ niệm & Địa điểm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                Ngày kỷ niệm
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8C6D58] mb-1">
                Địa điểm kỷ niệm
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Đà Lạt, Hồ Tây, Góc Bếp Nhỏ..."
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Hệ thống Gắn Thẻ (Tags) đa lựa chọn & tạo thẻ riêng */}
          <div className="rounded-2xl bg-[#FAF7F2] border border-[#8C6D58]/15 p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D2E28]">
                <Tag className="w-3.5 h-3.5 text-[#D98A76]" />
                <span>Gắn thẻ kỷ niệm</span>
              </div>
              <span className="text-[11px] text-[#8C6D58]">
                Đã chọn {selectedTags.length}/{MAX_TAGS_PER_MEMORY} thẻ
              </span>
            </div>

            {/* Danh sách thẻ gợi ý (Du lịch, Hẹn hò, Ngày lễ, Kỷ niệm, Sinh nhật...) */}
            <div className="flex flex-wrap gap-1.5">
              {suggestedUploadTags.map((tagName) => {
                const isSelected = selectedTags.some(
                  (t) => t.toLowerCase() === tagName.toLowerCase()
                );
                return (
                  <button
                    key={tagName}
                    type="button"
                    onClick={() => handleToggleMemoryTag(tagName)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#E8A598] text-white border-[#E8A598] shadow-2xs'
                        : 'bg-white text-[#8C6D58] hover:text-[#3D2E28] border-[#8C6D58]/15 hover:border-[#E8A598]'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    <span>{tagName}</span>
                  </button>
                );
              })}
            </div>

            {/* Thêm thẻ tùy chỉnh mới */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
                maxLength={24}
                placeholder="Tạo thẻ mới (vd: Đà Lạt, Noel, Valentine, Kỷ niệm 1 năm...)"
                className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden text-[#3D2E28]"
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                disabled={!customTagInput.trim()}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F9F6F0] border border-[#8C6D58]/20 text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-45 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm thẻ</span>
              </button>
            </div>

            {/* Hiển thị các thẻ tùy chỉnh đã chọn không nằm trong danh sách gợi ý */}
            {selectedTags.some(
              (t) => !suggestedUploadTags.some((s) => s.toLowerCase() === t.toLowerCase())
            ) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[11px] text-[#8C6D58]">Thẻ mới tạo:</span>
                {selectedTags
                  .filter(
                    (t) => !suggestedUploadTags.some((s) => s.toLowerCase() === t.toLowerCase())
                  )
                  .map((customTag) => (
                    <button
                      key={customTag}
                      type="button"
                      onClick={() => handleToggleMemoryTag(customTag)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D98A76] text-white text-xs font-medium cursor-pointer"
                      title="Bấm để gỡ thẻ này"
                    >
                      <span>#{customTag}</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Nhạc nền cho kỷ niệm (chọn theo link YouTube, Zing MP3, MP3, Google Drive hoặc từ danh sách phát) */}
          <div className="rounded-2xl bg-[#FAF7F2] border border-[#8C6D58]/15 p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#3D2E28]">
                <Music className="w-3.5 h-3.5 text-[#D98A76]" />
                <span>Nhạc đính kèm kỷ niệm (Theo link)</span>
                {selectedMusic && (
                  <span className="text-[11px] font-medium text-[#D98A76]">· Đã chọn</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMusicPanel((prev) => !prev)}
                className="text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] px-2.5 py-1 rounded-lg hover:bg-white/80 transition-colors cursor-pointer"
              >
                {showMusicPanel ? 'Thu gọn' : selectedMusic ? 'Đổi bài hát' : '+ Thêm nhạc theo link'}
              </button>
            </div>

            {/* Bản xem trước bài nhạc đã chọn (có nút Nghe thử & Gỡ bỏ) */}
            {selectedMusic && (
              <MemoryMusicBar
                music={selectedMusic}
                playerId="quick-upload-preview"
                compact
                onRemove={() => setSelectedMusic(null)}
              />
            )}

            {/* Khung dán link nhạc & chọn nhanh */}
            {showMusicPanel && (
              <div className="space-y-2.5 pt-0.5">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Link2 className="w-3.5 h-3.5 text-[#8C6D58] absolute left-3 top-2.5 pointer-events-none" />
                    <input
                      type="text"
                      value={musicLinkInput}
                      onChange={(e) => {
                        setMusicLinkInput(e.target.value);
                        if (musicError) setMusicError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleResolveMusicLink();
                        }
                      }}
                      placeholder="Dán link YouTube, Zing MP3, file .mp3, Drive hoặc gõ tên bài hát..."
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden text-[#3D2E28]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={isResolvingMusic || !musicLinkInput.trim()}
                    onClick={() => void handleResolveMusicLink()}
                    className="px-4 py-2 rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    {isResolvingMusic ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang nhận diện...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Chọn nhạc</span>
                      </>
                    )}
                  </button>
                </div>

                <input
                  type="text"
                  value={musicCustomTitle}
                  onChange={(e) => setMusicCustomTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (musicLinkInput.trim()) void handleResolveMusicLink();
                    }
                  }}
                  placeholder="Tên bài hát hiển thị (tùy chọn — để trống sẽ tự lấy theo link)"
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/15 focus:border-[#E8A598] focus:outline-hidden text-[#3D2E28]"
                />

                {musicError && (
                  <p className="text-[11px] text-rose-600 font-medium leading-snug">{musicError}</p>
                )}

                {quickPlaylistSongs.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] text-[#8C6D58] font-medium block">
                      Hoặc chọn nhanh từ danh sách nhạc của hai bạn:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {quickPlaylistSongs.map((track) => {
                        const isPicked = selectedMusic?.url === track.url;
                        return (
                          <button
                            key={track.id}
                            type="button"
                            onClick={() => handlePickSavedSong(track)}
                            className={`max-w-[180px] truncate px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                              isPicked
                                ? 'bg-[#E8A598] text-white border-[#E8A598]'
                                : 'bg-white text-[#8C6D58] hover:text-[#3D2E28] border-[#8C6D58]/15 hover:border-[#E8A598]'
                            }`}
                            title={`${track.title}${track.artist ? ` - ${track.artist}` : ''}`}
                          >
                            {track.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ô viết caption / Nhật ký cảm xúc kèm Trợ lý Gemini AI */}
          <div>
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-[#8C6D58]">
                  Dòng nhật ký / Cảm xúc <span className="text-[#D98A76]">*</span>
                </label>
                {onOpenFontModal && (
                  <button
                    type="button"
                    onClick={onOpenFontModal}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C6D58] hover:text-[#3D2E28] bg-amber-100/70 hover:bg-amber-200/80 px-2.5 py-0.5 rounded-full transition-all cursor-pointer border border-amber-200/60 shadow-2xs"
                    title="Đổi kiểu chữ viết tay hoặc thanh lịch cho dòng cảm xúc này"
                  >
                    <Type className="w-3 h-3 text-[#D98A76]" />
                    <span>Font: {FONT_OPTIONS.find((f) => f.id === currentFont)?.name || 'Viết tay'}</span>
                  </button>
                )}
              </div>

              {/* Nút mở bảng trợ lý Gemini AI */}
              <button
                type="button"
                onClick={() => setShowAiPanel(!showAiPanel)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] hover:text-[#3D2E28] bg-[#E8A598]/15 hover:bg-[#E8A598]/25 px-3 py-1 rounded-full transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{showAiPanel ? 'Đóng gợi ý AI' : 'Gemini AI Viết Caption'}</span>
              </button>
            </div>

            {/* BẢNG TRỢ LÝ GEMINI AI & SMART CAPTION */}
            {showAiPanel && (
              <div className="bg-[#FAF7F2] border border-[#E8A598]/30 rounded-2xl p-3.5 sm:p-4 mb-3 space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#3D2E28]">
                    <Wand2 className="w-4 h-4 text-[#D98A76]" />
                    <span>Gemini AI Viết Caption Tình Yêu (Đa dạng, không lặp)</span>
                  </div>
                  <span className="text-[10px] text-[#8C6D58] bg-white px-2 py-0.5 rounded-full border border-[#8C6D58]/10 font-semibold">
                    {images.length > 0 ? `Nhìn ảnh #${activeImageIndex + 1}` : 'Tùy chỉnh'}
                  </span>
                </div>

                {/* Chọn sắc thái cảm xúc */}
                <div>
                  <span className="text-[11px] font-semibold text-[#8C6D58] block mb-1">
                    Chọn phong cách viết:
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[11px]">
                    {[
                      { id: 'romantic', label: 'Lãng mạn', icon: '💖' },
                      { id: 'cute', label: 'Đáng yêu', icon: '🥰' },
                      { id: 'peaceful', label: 'Bình yên', icon: '🍃' },
                      { id: 'poem', label: 'Thơ tình', icon: '📜' },
                      { id: 'short', label: 'Story ngắn', icon: '✨' },
                      { id: 'funny', label: 'Hài hước', icon: '😆' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAiTone(item.id as CaptionTone)}
                        className={`px-2 py-1.5 rounded-xl border text-center transition-all cursor-pointer font-medium ${
                          aiTone === item.id
                            ? 'bg-[#E8A598] text-white border-[#E8A598] font-semibold shadow-xs'
                            : 'bg-white text-[#8C6D58] border-[#8C6D58]/15 hover:border-[#E8A598]'
                        }`}
                      >
                        <span className="block text-xs">{item.icon}</span>
                        <span className="truncate block mt-0.5">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Từ khóa hoặc chi tiết kỷ niệm */}
                <div>
                  <input
                    type="text"
                    value={aiKeywords}
                    onChange={(e) => setAiKeywords(e.target.value)}
                    placeholder="Gợi ý chi tiết thêm (ly cafe, nắm tay, trời mưa, hoàng hôn...)..."
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                </div>

                {/* Nút bấm sáng tác */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isAiGenerating}
                    onClick={handleGenerateAiCaption}
                    className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-[#E8A598] to-[#D98A76] hover:from-[#D98A76] hover:to-[#C87D55] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isAiGenerating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang sáng tác 5 câu mới...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Sáng tác 5 gợi ý cảm xúc</span>
                      </>
                    )}
                  </button>

                  {aiSuggestions.length > 0 && (
                    <button
                      type="button"
                      disabled={isAiGenerating}
                      onClick={handleGenerateAiCaption}
                      className="px-3 py-2 bg-white hover:bg-[#F9F6F0] border border-[#8C6D58]/20 text-[#8C6D58] hover:text-[#3D2E28] rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title="Đổi sang 5 câu khác"
                    >
                      <Dices className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Đổi câu khác</span>
                    </button>
                  )}
                </div>

                {/* Danh sách 5 gợi ý AI */}
                {aiSuggestions.length > 0 && (
                  <div className="space-y-2 pt-1 max-h-56 overflow-y-auto">
                    <span className="text-[11px] font-semibold text-[#8C6D58] block">
                      Bấm vào câu bạn thích để áp dụng vào bài viết:
                    </span>
                    {aiSuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleApplyAiSuggestion(item.text)}
                        className="p-2.5 rounded-xl bg-white border border-[#8C6D58]/15 hover:border-[#D98A76] hover:bg-[#FFFDF9] cursor-pointer transition-all shadow-xs group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-[#D98A76] bg-[#E8A598]/15 px-2 py-0.5 rounded-full">
                            {item.badge}
                          </span>
                          <span className="text-xs opacity-75">{item.emojis}</span>
                        </div>
                        <p className={`${fontClass || 'font-handwriting'} text-base sm:text-lg text-[#3D2E28] leading-snug group-hover:text-[#D98A76] transition-colors`}>
                          "{item.text}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Khay Emoji gợi ý */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 mb-1 text-sm no-scrollbar">
              <span className="text-[11px] font-semibold text-[#8C6D58] flex items-center gap-1 shrink-0">
                <Smile className="w-3 h-3 text-[#E8A598]" />
                Emoji:
              </span>
              {suggestedEmojis.map((em, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddEmojiToCaption(em)}
                  className="px-2 py-0.5 rounded-lg bg-white border border-[#8C6D58]/15 hover:bg-[#FAF6F0] hover:scale-110 transition-all text-xs cursor-pointer shrink-0"
                  title="Thêm emoji này vào caption"
                >
                  {em}
                </button>
              ))}
            </div>

            <textarea
              required
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Viết vài dòng ngọt ngào về khoảnh khắc này... (hoặc bấm nút Gemini AI ở trên để gợi ý tự động)"
              className={`w-full p-3 rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden ${fontClass || 'font-handwriting'} text-xl sm:text-2xl text-[#3D2E28] transition-all`}
            />
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#8C6D58]/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full transition-all cursor-pointer"
            >
              Hủy bỏ
            </button>

            <button
              type="submit"
              disabled={isSubmitting || isCompressing || isProcessingVideo}
              className="px-6 py-2.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white font-semibold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    {mediaMode === 'video' && videoUploadProgress > 0
                      ? `Đang tải video (${videoUploadProgress}%)...`
                      : saveStatusText || 'Đang lưu kỷ niệm...'}
                  </span>
                </>
              ) : (
                <>
                  {mediaMode === 'video' ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>
                    {mediaMode === 'video'
                      ? 'Đăng Video Kỷ Niệm'
                      : images.length > 1
                      ? uploadMode === 'album'
                        ? `Lưu Album (${images.length} ảnh)`
                        : `Lưu ${images.length} kỷ niệm`
                      : 'Lưu Khoảnh Khắc Ngọt Ngào'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal Chỉnh Sửa Ảnh Nghệ Thuật (Bộ lọc vintage, cân chỉnh màu & cắt/xoay ảnh) */}
      {editingImageIndex !== null && images[editingImageIndex] && (
        <PhotoEditorModal
          isOpen={editingImageIndex !== null}
          imageSrc={originalImages[editingImageIndex] || images[editingImageIndex]}
          initialState={photoEditStates[editingImageIndex] || null}
          imageLabel={
            images.length > 1
              ? `Ảnh ${editingImageIndex + 1} / ${images.length}`
              : 'Ảnh kỷ niệm'
          }
          totalPhotosCount={images.length}
          onClose={() => setEditingImageIndex(null)}
          onApply={handleApplyPhotoEdit}
          onApplyFilterToAll={images.length > 1 ? handleApplyFilterToAllPhotos : undefined}
        />
      )}
    </div>
  );
};
