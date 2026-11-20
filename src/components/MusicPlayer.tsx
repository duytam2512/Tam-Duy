import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListMusic,
  Disc,
  X,
  Trash2,
  RotateCcw,
  Sparkles,
  Download,
  Loader2,
  Link2,
  Search,
  Youtube,
  Info,
  Cloud,
  CheckCircle2,
  RefreshCw,
  GripVertical,
  Move,
  Upload
} from 'lucide-react';
import { MusicTrack, DEFAULT_PLAYLIST } from '../types';
import { extractYouTubeId, getYouTubeVideoInfoClient } from '../utils/youtube';
import {
  getStoredPlaylist,
  savePlaylistBoth,
  subscribeToSharedPlaylist
} from '../services/storage';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

// Các bài hát mẫu YouTube tình yêu có sẵn link thật đã xác thực hoạt động mượt mà
const YOUTUBE_PRESETS = [
  {
    name: 'Nàng Thơ - Hoàng Dũng',
    url: 'https://www.youtube.com/watch?v=Zzn9-ATB9aU'
  },
  {
    name: 'Ngày Đầu Tiên - Đức Phúc',
    url: 'https://www.youtube.com/watch?v=rIXhXaQ8tiM'
  },
  {
    name: 'Ánh Nắng Của Anh - Đức Phúc',
    url: 'https://www.youtube.com/watch?v=ds_U7Ifvsx4'
  },
  {
    name: 'Em Đồng Ý (I Do) - Đức Phúc',
    url: 'https://www.youtube.com/watch?v=IOe0tNoUGv8'
  },
  {
    name: 'Có Chàng Trai Viết Lên Cây',
    url: 'https://www.youtube.com/watch?v=0VC6euBtKkk'
  }
];

export const MusicPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>(() => getStoredPlaylist());
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);

  // In-app confirmation states
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Tab thêm nhạc: YouTube | Tải từ máy | MP3 thủ công | Zing MP3
  const [activeAddTab, setActiveAddTab] = useState<'youtube' | 'upload' | 'manual' | 'zing'>('youtube');

  // YouTube Music state
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeCustomTitle, setYoutubeCustomTitle] = useState('');
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);

  // Upload audio file from device state
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Zing MP3 Downloader state
  const [zingInput, setZingInput] = useState('');
  const [isZingLoading, setIsZingLoading] = useState(false);

  // Custom song input
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isYtReady, setIsYtReady] = useState(false);
  const loadedAudioUrlRef = useRef<string>('');
  const loadedYtIdRef = useRef<string>('');
  const pendingYtPlayRef = useRef<string | null>(null);
  const usedProxyForUrlRef = useRef<string>('');
  const consecutiveErrorsRef = useRef<number>(0);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const isPlayingRef = useRef<boolean>(isPlaying);

  // Vị trí linh hoạt của máy phát nhạc (Draggable Music Player)
  const widgetRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
    pointerId: number | null;
  }>({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    hasMoved: false,
    pointerId: null
  });

  const clampPosition = useCallback((pos: { x: number; y: number }, el?: HTMLElement | null): { x: number; y: number } => {
    if (typeof window === 'undefined') return pos;
    const width = el?.offsetWidth || 280;
    const height = el?.offsetHeight || 64;
    const pad = 12;
    const maxX = Math.max(pad, window.innerWidth - width - pad);
    const maxY = Math.max(pad, window.innerHeight - height - pad);
    return {
      x: Math.min(maxX, Math.max(pad, pos.x)),
      y: Math.min(maxY, Math.max(pad, pos.y))
    };
  }, []);

  // Khởi tạo vị trí linh hoạt (từ localStorage hoặc góc dưới bên trái)
  useEffect(() => {
    const getInitialPos = (): { x: number; y: number } => {
      try {
        const saved = localStorage.getItem('goc_nho_player_position_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
            return clampPosition(parsed);
          }
        }
      } catch {}
      const h = 64;
      const pad = 16;
      return {
        x: pad,
        y: Math.max(pad, window.innerHeight - h - 24)
      };
    };

    setPosition(getInitialPos());

    const handleWindowResize = () => {
      setPosition((prev) => (prev ? clampPosition(prev, widgetRef.current) : prev));
    };

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('orientationchange', handleWindowResize);
    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('orientationchange', handleWindowResize);
    };
  }, [clampPosition]);

  // Tự động căn chỉnh khi mở rộng thanh âm lượng để không bị tràn mép màn hình
  useEffect(() => {
    if (position && widgetRef.current) {
      setPosition((prev) => (prev ? clampPosition(prev, widgetRef.current) : prev));
    }
  }, [isExpanded, clampPosition]);

  // Kéo thả linh hoạt mượt mà trên cả máy tính (chuột) và điện thoại di động (cảm ứng)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Không kéo khi bấm trực tiếp vào các nút bấm hoặc thanh trượt
    if (target.closest('button') || target.closest('input') || target.closest('a')) {
      return;
    }

    const currentPos = position || {
      x: 16,
      y: Math.max(16, window.innerHeight - 84)
    };

    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: currentPos.x,
      initialPosY: currentPos.y,
      hasMoved: false,
      pointerId: e.pointerId
    };

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || dragStateRef.current.pointerId !== e.pointerId) return;

    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;

    if (Math.hypot(dx, dy) > 5) {
      dragStateRef.current.hasMoved = true;
    }

    const rawNext = {
      x: dragStateRef.current.initialPosX + dx,
      y: dragStateRef.current.initialPosY + dy
    };

    const nextPos = clampPosition(rawNext, widgetRef.current);
    setPosition(nextPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const wasMoved = dragStateRef.current.hasMoved;
    setIsDragging(false);
    dragStateRef.current.pointerId = null;

    if (wasMoved && position) {
      try {
        localStorage.setItem('goc_nho_player_position_v2', JSON.stringify(position));
      } catch {}
    }
  };

  // Đặt lại vị trí máy phát nhạc về góc mặc định
  const handleResetPosition = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const defaultPos = {
      x: 16,
      y: Math.max(16, window.innerHeight - (isExpanded ? 110 : 70) - 24)
    };
    setPosition(defaultPos);
    try {
      localStorage.setItem('goc_nho_player_position_v2', JSON.stringify(defaultPos));
    } catch {}
    setToastMessage('📍 Đã đưa máy phát nhạc về vị trí mặc định!');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const currentTrack = playlist[currentTrackIndex] || playlist[0];

  useEffect(() => {
    volumeRef.current = volume;
    isMutedRef.current = isMuted;
    isPlayingRef.current = isPlaying;
  }, [volume, isMuted, isPlaying]);

  const showNotice = useCallback((msg: string, duration = 3800) => {
    setWidgetNotice(msg);
    setToastMessage(msg);
    window.setTimeout(() => {
      setWidgetNotice((prev) => (prev === msg ? null : prev));
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, duration);
  }, []);

  // Hàm phát bài hát đồng bộ trực tiếp trong ngữ cảnh tương tác (hỗ trợ 100% iPhone Safari & Chrome)
  const playTrackDirect = useCallback(
    (track: MusicTrack | undefined, shouldPlay: boolean) => {
      if (!track) return;
      const effectiveVolume = isMutedRef.current ? 0 : volumeRef.current;

      if (track.isYouTube && track.youtubeId) {
        if (audioRef.current) {
          audioRef.current.pause();
        }

        if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
          try {
            if (typeof ytPlayerRef.current.unMute === 'function' && !isMutedRef.current) {
              ytPlayerRef.current.unMute();
            }
            if (typeof ytPlayerRef.current.setVolume === 'function') {
              ytPlayerRef.current.setVolume(Math.round(effectiveVolume * 100));
            }
            if (shouldPlay) {
              setIsBuffering(true);
              if (loadedYtIdRef.current !== track.youtubeId) {
                loadedYtIdRef.current = track.youtubeId;
                ytPlayerRef.current.loadVideoById(track.youtubeId);
              } else {
                ytPlayerRef.current.playVideo();
              }
              setIsPlaying(true);
            } else {
              if (loadedYtIdRef.current !== track.youtubeId) {
                loadedYtIdRef.current = track.youtubeId;
                ytPlayerRef.current.cueVideoById(track.youtubeId);
              } else {
                ytPlayerRef.current.pauseVideo();
              }
              setIsPlaying(false);
              setIsBuffering(false);
            }
          } catch (err) {
            console.warn('Lỗi điều khiển YouTube Player:', err);
            setIsBuffering(false);
          }
        } else if (shouldPlay) {
          // YouTube API đang nạp -> ghi nhớ để phát ngay khi onReady
          pendingYtPlayRef.current = track.youtubeId;
          setIsBuffering(true);
          setIsPlaying(true);
        }
      } else {
        // Dừng YouTube nếu đang chạy
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          try {
            ytPlayerRef.current.pauseVideo();
          } catch {}
        }

        const audio = audioRef.current;
        if (!audio) return;

        audio.volume = effectiveVolume;
        audio.muted = isMutedRef.current;

        const targetUrl = track.url;
        const needsReload = loadedAudioUrlRef.current !== targetUrl;
        if (needsReload) {
          usedProxyForUrlRef.current = '';
          loadedAudioUrlRef.current = targetUrl;
          audio.src = targetUrl;
          audio.load();
        }

        if (shouldPlay) {
          setIsBuffering(true);
          const playPromise = audio.play();
          if (playPromise && typeof playPromise.then === 'function') {
            playPromise
              .then(() => {
                consecutiveErrorsRef.current = 0;
                setIsPlaying(true);
                setIsBuffering(false);
              })
              .catch((err: any) => {
                console.warn('Lỗi phát HTML5 Audio:', err?.name, err?.message);
                setIsBuffering(false);
                if (err?.name === 'NotAllowedError') {
                  setIsPlaying(false);
                  showNotice('🔊 Hãy bấm nút Phát một lần nữa để mở âm thanh trên trình duyệt nhé!');
                } else if (err?.name !== 'AbortError') {
                  setIsPlaying(false);
                }
              });
          } else {
            setIsPlaying(true);
            setIsBuffering(false);
          }
        } else {
          audio.pause();
          setIsPlaying(false);
          setIsBuffering(false);
        }
      }
    },
    [showNotice]
  );

  const handleNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIdx = (currentTrackIndex + 1) % playlist.length;
    setCurrentTrackIndex(nextIdx);
    playTrackDirect(playlist[nextIdx], true);
  }, [playlist, currentTrackIndex, playTrackDirect]);

  const handlePrev = useCallback(() => {
    if (playlist.length === 0) return;
    const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
    setCurrentTrackIndex(prevIdx);
    playTrackDirect(playlist[prevIdx], true);
  }, [playlist, currentTrackIndex, playTrackDirect]);

  const handleNextRef = useRef(handleNext);
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);

  // 1. TỰ ĐỘNG ĐỒNG BỘ PLAYLIST THỜI GIAN THỰC TỪ CLOUD FIRESTORE
  useEffect(() => {
    const unsubscribe = subscribeToSharedPlaylist((sharedTracks) => {
      if (sharedTracks && sharedTracks.length > 0) {
        setPlaylist(sharedTracks);
        setCurrentTrackIndex((prev) => (prev >= sharedTracks.length ? 0 : prev));
        setIsCloudSynced(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. KHỞI TẠO YOUTUBE IFRAME API (Có hỗ trợ origin, unMute và bắt lỗi tự động chuyển bài)
  useEffect(() => {
    const initYT = () => {
      if (window.YT && window.YT.Player) {
        if (!ytPlayerRef.current) {
          try {
            ytPlayerRef.current = new window.YT.Player('yt-player-target', {
              height: '124',
              width: '220',
              playerVars: {
                playsinline: 1,
                controls: 1,
                disablekb: 1,
                modestbranding: 1,
                rel: 0,
                enablejsapi: 1,
                origin: window.location.origin
              },
              events: {
                onReady: () => {
                  setIsYtReady(true);
                  try {
                    if (ytPlayerRef.current?.setVolume) {
                      ytPlayerRef.current.setVolume(
                        isMutedRef.current ? 0 : Math.round(volumeRef.current * 100)
                      );
                    }
                    if (!isMutedRef.current && ytPlayerRef.current?.unMute) {
                      ytPlayerRef.current.unMute();
                    }
                    if (pendingYtPlayRef.current && ytPlayerRef.current?.loadVideoById) {
                      const vid = pendingYtPlayRef.current;
                      pendingYtPlayRef.current = null;
                      loadedYtIdRef.current = vid;
                      ytPlayerRef.current.loadVideoById(vid);
                    }
                  } catch (e) {
                    console.warn('Lỗi cấu hình YouTube Player onReady:', e);
                  }
                },
                onStateChange: (event: any) => {
                  // 0=ENDED, 1=PLAYING, 2=PAUSED, 3=BUFFERING
                  if (event.data === 0) {
                    handleNextRef.current();
                  } else if (event.data === 1) {
                    consecutiveErrorsRef.current = 0;
                    setIsPlaying(true);
                    setIsBuffering(false);
                  } else if (event.data === 2) {
                    setIsPlaying(false);
                    setIsBuffering(false);
                  } else if (event.data === 3) {
                    setIsBuffering(true);
                  }
                },
                onError: (event: any) => {
                  console.warn('Lỗi phát video YouTube (mã lỗi):', event?.data);
                  setIsBuffering(false);
                  consecutiveErrorsRef.current += 1;
                  if (consecutiveErrorsRef.current < Math.max(2, playlist.length)) {
                    showNotice('⚠️ Video YouTube này bị chặn nhúng hoặc lỗi link, đang chuyển sang bài tiếp theo...');
                    window.setTimeout(() => handleNextRef.current(), 800);
                  } else {
                    setIsPlaying(false);
                    showNotice('⚠️ Không phát được bài hát này. Hãy thử chọn bài khác hoặc tải MP3 từ máy!');
                  }
                }
              }
            });
          } catch (e) {
            console.warn('Đang chờ khởi tạo YouTube Player:', e);
          }
        }
      }
    };

    if (!window.YT) {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      window.onYouTubeIframeAPIReady = () => {
        initYT();
      };
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.body.appendChild(tag);
      }
    } else {
      initYT();
    }
  }, [playlist.length, showNotice]);

  // Đồng bộ âm lượng cho cả HTML Audio và YouTube Player
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
      audioRef.current.muted = isMuted;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        if (isMuted && typeof ytPlayerRef.current.mute === 'function') {
          ytPlayerRef.current.mute();
        } else if (!isMuted && typeof ytPlayerRef.current.unMute === 'function') {
          ytPlayerRef.current.unMute();
        }
        ytPlayerRef.current.setVolume(Math.round(effectiveVolume * 100));
      } catch (err) {
        console.warn('Lỗi đặt âm lượng YouTube:', err);
      }
    }
  }, [volume, isMuted]);

  // Chuẩn bị nguồn phát khi playlist lần đầu đồng bộ hoặc YouTube Player vừa sẵn sàng
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.isYouTube && currentTrack.youtubeId) {
      if (isYtReady && ytPlayerRef.current && loadedYtIdRef.current !== currentTrack.youtubeId) {
        try {
          loadedYtIdRef.current = currentTrack.youtubeId;
          if (isPlayingRef.current) {
            ytPlayerRef.current.loadVideoById(currentTrack.youtubeId);
          } else {
            ytPlayerRef.current.cueVideoById(currentTrack.youtubeId);
          }
        } catch {}
      }
    } else if (audioRef.current && loadedAudioUrlRef.current !== currentTrack.url) {
      loadedAudioUrlRef.current = currentTrack.url;
      audioRef.current.src = currentTrack.url;
      audioRef.current.preload = 'auto';
    }
  }, [currentTrack?.id, currentTrack?.url, currentTrack?.youtubeId, isYtReady]);

  const togglePlay = () => {
    if (!currentTrack) return;
    consecutiveErrorsRef.current = 0;
    if (isPlaying) {
      playTrackDirect(currentTrack, false);
    } else {
      playTrackDirect(currentTrack, true);
    }
  };

  const handleSelectTrack = (index: number) => {
    const target = playlist[index];
    if (!target) return;
    consecutiveErrorsRef.current = 0;
    setCurrentTrackIndex(index);
    setShowPlaylistModal(false);
    playTrackDirect(target, true);
  };

  // Xử lý lỗi phát HTML5 Audio: thử proxy /api/audio/proxy 1 lần cho link ngoài, nếu vẫn lỗi thì chuyển bài
  const handleAudioError = () => {
    if (!currentTrack || currentTrack.isYouTube) return;
    const audio = audioRef.current;
    const originalUrl = currentTrack.url;

    // Nếu là link https bên ngoài và chưa thử qua proxy -> thử phát qua server proxy để vượt CORS/Referer
    if (
      audio &&
      /^https?:\/\//i.test(originalUrl) &&
      usedProxyForUrlRef.current !== originalUrl &&
      isPlayingRef.current
    ) {
      usedProxyForUrlRef.current = originalUrl;
      const proxied = `/api/audio/proxy?url=${encodeURIComponent(originalUrl)}`;
      loadedAudioUrlRef.current = proxied;
      audio.src = proxied;
      audio.load();
      audio.play().catch(() => {
        setIsBuffering(false);
      });
      return;
    }

    setIsBuffering(false);
    consecutiveErrorsRef.current += 1;

    if (isPlayingRef.current && consecutiveErrorsRef.current < Math.max(2, playlist.length)) {
      showNotice(`⚠️ Không tải được "${currentTrack.title}", tự động chuyển bài tiếp theo...`);
      window.setTimeout(() => handleNextRef.current(), 700);
    } else {
      setIsPlaying(false);
      showNotice(`⚠️ Không thể phát "${currentTrack.title}". Hãy bấm "Khôi phục bài gốc" hoặc tải file MP3 từ máy!`);
    }
  };

  // Tải file nhạc MP3/M4A/WAV trực tiếp từ máy tính / điện thoại lên máy chủ
  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      showNotice('⚠️ File nhạc vượt quá 25MB. Bạn vui lòng chọn file nhẹ hơn nhé!');
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
      return;
    }

    setIsAudioUploading(true);
    setToastMessage(`Đang tải lên "${file.name}"...`);

    try {
      const response = await fetch('/api/music/upload', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'audio/mpeg',
          'X-File-Name': encodeURIComponent(file.name)
        },
        body: file
      });

      const data = await response.json();
      if (!response.ok || !data?.success || !data?.song) {
        throw new Error(data?.message || 'Không thể tải file nhạc lên máy chủ');
      }

      const newSong: MusicTrack = data.song;
      const updated = [...playlist, newSong];
      setPlaylist(updated);
      await savePlaylistBoth(updated);

      const newIndex = updated.length - 1;
      setCurrentTrackIndex(newIndex);
      playTrackDirect(newSong, true);
      showNotice(`🎵 Đã tải lên "${newSong.title}" & đồng bộ lên mọi thiết bị!`);
    } catch (err: any) {
      console.warn('Lỗi tải nhạc từ máy:', err);
      showNotice(`⚠️ ${err?.message || 'Không thể tải file nhạc lên lúc này'}`);
    } finally {
      setIsAudioUploading(false);
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    }
  };

  // Nút bấm đồng bộ thủ công danh sách bài hát lên Cloud
  const handleForceSyncCloud = async () => {
    setIsCloudSynced(false);
    await savePlaylistBoth(playlist);
    setIsCloudSynced(true);
    showNotice('☁️ Đã đồng bộ bài hát lên Cloud! Điện thoại và máy tính khác đều đã lưu.');
  };

  // Thêm nhạc từ link MP3 thủ công
  const handleAddCustomTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customUrl.trim()) return;

    const newTrack: MusicTrack = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim(),
      artist: 'Tự chọn của hai đứa',
      mood: 'Yêu thích',
      url: customUrl.trim()
    };

    const updated = [...playlist, newTrack];
    setPlaylist(updated);
    await savePlaylistBoth(updated);

    setCustomTitle('');
    setCustomUrl('');
    setCurrentTrackIndex(updated.length - 1);
    playTrackDirect(newTrack, true);
    showNotice(`☁️ Đã thêm "${newTrack.title}" và đồng bộ lên tất cả thiết bị!`);
  };

  /**
   * Thêm nhạc từ YouTube
   * Hoạt động 100% trên cả Vercel tĩnh, Localhost và mọi môi trường
   * Tự động giải mã client-side và đồng bộ lên Cloud Firestore
   */
  const handleAddYouTubeTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = youtubeInput.trim();
    if (!query) return;

    setIsYoutubeLoading(true);
    setToastMessage('Đang xử lý và đồng bộ bài hát lên Cloud...');

    try {
      let resolvedSong: MusicTrack | null = null;
      const extractedVideoId = extractYouTubeId(query);

      // Bước 1: Thử gọi API backend (nếu chạy local hoặc có server)
      try {
        const response = await fetch('/api/youtube/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: query })
        });
        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          if (data && data.success && data.song) {
            resolvedSong = data.song;
          }
        }
      } catch {
        // Backend không phản hồi hoặc môi trường tĩnh Vercel -> tiếp tục giải mã client-side
      }

      // Bước 2: Nếu chưa có bài từ backend, giải mã client-side trực tiếp
      if (!resolvedSong) {
        let videoId = extractedVideoId;

        if (!videoId) {
          const matchedPreset = YOUTUBE_PRESETS.find(
            (p) => p.name.toLowerCase().includes(query.toLowerCase()) || query.toLowerCase().includes(p.name.toLowerCase())
          );
          if (matchedPreset) {
            videoId = extractYouTubeId(matchedPreset.url);
          }
        }

        if (!videoId) {
          throw new Error('Vui lòng dán link video YouTube (ví dụ: https://youtu.be/... hoặc https://youtube.com/watch?v=...)');
        }

        const info = await getYouTubeVideoInfoClient(videoId, youtubeCustomTitle);
        resolvedSong = {
          id: `yt-${videoId}`,
          title: info.title,
          artist: info.artist,
          mood: 'YouTube Music',
          url: `https://www.youtube.com/watch?v=${videoId}`,
          thumbnail: info.thumbnail,
          isYouTube: true,
          youtubeId: videoId
        };
      }

      if (!resolvedSong) {
        throw new Error('Không thể nhận diện video YouTube này. Bạn thử link khác nhé!');
      }

      const newSong = resolvedSong;

      // Kiểm tra nếu bài hát đã có trong playlist
      const existingIdx = playlist.findIndex((t) => t.id === newSong.id);
      let updatedPlaylist: MusicTrack[];
      let targetIdx: number;

      if (existingIdx !== -1) {
        updatedPlaylist = [...playlist];
        updatedPlaylist[existingIdx] = newSong;
        targetIdx = existingIdx;
      } else {
        updatedPlaylist = [...playlist, newSong];
        targetIdx = updatedPlaylist.length - 1;
      }

      setPlaylist(updatedPlaylist);
      // Lưu vào cả LocalStorage và Cloud Firestore để mọi thiết bị đều có
      await savePlaylistBoth(updatedPlaylist);

      setYoutubeInput('');
      setYoutubeCustomTitle('');
      setCurrentTrackIndex(targetIdx);
      playTrackDirect(newSong, true);

      showNotice(`🎉 Đã thêm "${newSong.title}" & đồng bộ trên mọi thiết bị!`);
    } catch (err: any) {
      console.warn('Lỗi thêm nhạc YouTube:', err);
      setToastMessage(`⚠️ ${err.message || 'Không thể thêm bài từ YouTube. Bạn vui lòng kiểm tra lại link nhé!'}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  // Tải nhạc từ Zing MP3
  const handleDownloadFromZing = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = zingInput.trim();
    if (!query) return;

    setIsZingLoading(true);
    setToastMessage('Đang kết nối Zing MP3...');

    try {
      const response = await fetch('/api/zingmp3/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query })
      });

      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        throw new Error('Tính năng Zing MP3 yêu cầu máy chủ Node.js. Trên web Vercel tĩnh, bạn hãy dùng tab "Link YouTube" hoặc "Link MP3" để lưu vĩnh viễn nhé!');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.message || 'Không thể tải bài hát từ Zing MP3');
      }

      const newSong: MusicTrack = data.song;
      const existingIdx = playlist.findIndex((t) => t.id === newSong.id);
      let updatedPlaylist: MusicTrack[];
      let targetIdx: number;

      if (existingIdx !== -1) {
        updatedPlaylist = [...playlist];
        updatedPlaylist[existingIdx] = newSong;
        targetIdx = existingIdx;
      } else {
        updatedPlaylist = [...playlist, newSong];
        targetIdx = updatedPlaylist.length - 1;
      }

      setPlaylist(updatedPlaylist);
      await savePlaylistBoth(updatedPlaylist);

      setZingInput('');
      setCurrentTrackIndex(targetIdx);
      playTrackDirect(newSong, true);

      showNotice(`🎉 Đã tải "${newSong.title}" & đồng bộ trên mọi thiết bị!`);
    } catch (err: any) {
      console.warn('Lỗi tải Zing MP3:', err);
      setToastMessage(`⚠️ ${err.message || 'Không thể tải bài hát từ Zing MP3. Hãy dùng tab Link YouTube nhé!'}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsZingLoading(false);
    }
  };

  // Mở hộp thoại xác nhận xóa bài hát
  const handleDeleteClick = (trackId: string, trackTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (playlist.length <= 1) {
      setToastMessage('⚠️ Danh sách phát cần giữ ít nhất 1 bài hát. Hãy thêm bài mới trước khi xóa nhé!');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setTrackToDelete({ id: trackId, title: trackTitle });
  };

  // Thực hiện xóa bài hát sau khi người dùng bấm xác nhận
  const confirmDeleteTrack = async () => {
    if (!trackToDelete) return;

    const { id: trackId, title: trackTitle } = trackToDelete;
    const trackIndex = playlist.findIndex((t) => t.id === trackId);
    if (trackIndex === -1) {
      setTrackToDelete(null);
      return;
    }

    const updated = playlist.filter((t) => t.id !== trackId);
    setPlaylist(updated);
    await savePlaylistBoth(updated);

    // Nếu bài đang phát bị xóa
    if (trackIndex === currentTrackIndex) {
      const nextIdx = trackIndex >= updated.length ? 0 : trackIndex;
      setCurrentTrackIndex(nextIdx);
      const nextTrack = updated[nextIdx];
      if (nextTrack) {
        playTrackDirect(nextTrack, isPlayingRef.current);
      }
    } else if (trackIndex < currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev - 1);
    }

    setTrackToDelete(null);
    showNotice(`🗑️ Đã xóa "${trackTitle}" và đồng bộ trên mọi thiết bị!`, 3000);
  };

  // Thực hiện khôi phục 6 bài hát gốc ban đầu
  const confirmResetPlaylist = async () => {
    setPlaylist(DEFAULT_PLAYLIST);
    await savePlaylistBoth(DEFAULT_PLAYLIST);

    setCurrentTrackIndex(0);
    playTrackDirect(DEFAULT_PLAYLIST[0], isPlayingRef.current);

    setShowResetConfirm(false);
    showNotice('✨ Đã khôi phục 6 bài hát gốc trên mọi thiết bị!', 3000);
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  return (
    <>
      {/* HTML5 Audio Player cho nhạc MP3 cục bộ & link âm thanh trực tiếp */}
      <audio
        ref={audioRef}
        playsInline
        preload="auto"
        onPlay={() => {
          setIsPlaying(true);
          setIsBuffering(false);
        }}
        onPause={() => {
          if (!currentTrack?.isYouTube) {
            setIsPlaying(false);
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
      />

      {/* YouTube Player giữ trong khung nhìn (tránh bị Chrome/Safari chặn phát ngầm khi ẩn ngoài màn hình) */}
      <div
        className={
          currentTrack?.isYouTube && isExpanded
            ? 'fixed bottom-24 left-4 z-40 w-[220px] h-[124px] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#E8A598]/60 bg-black'
            : 'fixed bottom-0 right-0 w-[2px] h-[2px] opacity-[0.02] pointer-events-none overflow-hidden z-0'
        }
        aria-hidden={!(currentTrack?.isYouTube && isExpanded)}
      >
        <div id="yt-player-target" className="w-full h-full" />
      </div>

      {/* Floating Music Widget (Di chuyển linh hoạt khắp màn hình - Mobile & Desktop) */}
      <div
        ref={widgetRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={
          position
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none'
              }
            : {
                left: '16px',
                bottom: '24px',
                touchAction: 'none'
              }
        }
        className={`fixed z-40 select-none touch-none transition-shadow ${
          isDragging
            ? 'cursor-grabbing scale-[1.02] shadow-2xl ring-2 ring-[#E8A598]/80'
            : 'cursor-default shadow-xl'
        }`}
      >
        <div className="bg-[#FFFDF9]/95 backdrop-blur-md rounded-2xl border border-[#8C6D58]/20 overflow-hidden relative">
          {widgetNotice && !showPlaylistModal && (
            <div className="px-3 py-1.5 bg-[#FFF4EE] border-b border-[#E8A598]/40 text-[10px] text-[#B8634B] font-medium max-w-[270px] leading-snug">
              {widgetNotice}
            </div>
          )}
          {/* Thanh Player Compact */}
          <div className="p-2 sm:p-2.5 flex items-center gap-2">
            {/* Nút kéo di chuyển tiện lợi (Grip Handle) */}
            <div
              className="p-1 -ml-1 text-[#8C6D58]/40 hover:text-[#D98A76] cursor-grab active:cursor-grabbing flex items-center justify-center transition-colors group/drag"
              title="Kéo thả để di chuyển máy phát nhạc khắp màn hình (Chạm đúp để về góc mặc định)"
              onDoubleClick={handleResetPosition}
            >
              <GripVertical className="w-4 h-4 group-hover/drag:scale-110 transition-transform" />
            </div>

            {/* Đĩa than quay khi phát nhạc */}
            <button
              onClick={togglePlay}
              className="relative w-10 h-10 rounded-full bg-[#3D2E28] flex items-center justify-center shrink-0 shadow-md group cursor-pointer overflow-hidden border border-[#C87D55]/30"
              title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}
            >
              {currentTrack?.thumbnail ? (
                <img
                  src={currentTrack.thumbnail}
                  alt=""
                  className={`w-full h-full object-cover rounded-full transition-transform duration-1000 ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Disc
                  className={`w-7 h-7 text-[#E8A598] transition-transform duration-1000 ${
                    isPlaying ? 'animate-spin' : ''
                  }`}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/35 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                {isPlaying ? (
                  <Pause className="w-4 h-4 text-white fill-white" />
                ) : (
                  <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                )}
              </div>
            </button>

            {/* Thông tin bài hát & hiệu ứng sóng nhạc */}
            <div
              onClick={() => {
                if (!dragStateRef.current.hasMoved) {
                  setIsExpanded(!isExpanded);
                }
              }}
              className="cursor-pointer max-w-[120px] sm:max-w-[160px]"
              title="Bấm để mở/thu gọn thanh chỉnh âm lượng"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-serif-romantic font-semibold text-xs text-[#3D2E28] truncate block">
                  {currentTrack?.title}
                </span>
                {isPlaying && (
                  <span className="flex items-end gap-0.5 h-3">
                    <span className="w-0.5 h-2 bg-[#D98A76] rounded-full animate-bounce" />
                    <span className="w-0.5 h-3 bg-[#E8A598] rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-0.5 h-1.5 bg-[#D98A76] rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#8C6D58] truncate block flex items-center gap-1">
                {currentTrack?.isYouTube && (
                  <span className="text-red-600 font-medium">● YouTube:</span>
                )}
                <span>{currentTrack?.artist}</span>
              </span>
            </div>

            {/* Nút thao tác nhanh */}
            <div className="flex items-center gap-1 border-l border-[#8C6D58]/15 pl-2">
              <button
                onClick={handlePrev}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all cursor-pointer"
                title="Bài trước"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlay}
                className="p-1.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isBuffering ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all cursor-pointer"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowPlaylistModal(true)}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all cursor-pointer relative"
                title="Danh sách bài hát"
              >
                <ListMusic className="w-3.5 h-3.5 text-[#D98A76]" />
                {isCloudSynced && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-white" />
                )}
              </button>
            </div>
          </div>

          {/* Mở rộng: Thanh chỉnh âm lượng */}
          {isExpanded && (
            <div className="px-3 pb-2.5 pt-1 border-t border-[#8C6D58]/10 flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-[#8C6D58] hover:text-[#3D2E28] cursor-pointer"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-24 accent-[#D98A76] h-1.5 bg-[#F9F6F0] rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-[#8C6D58] w-7">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DANH SÁCH BÀI HÁT & THAY ĐỔI THEO LỰA CHỌN */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-7 max-w-md w-full border border-[#8C6D58]/20 shadow-2xl relative my-6 max-h-[88vh] flex flex-col justify-between">
            {/* Header Modal */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D98A76] bg-[#E8A598]/15 px-3 py-1 rounded-full">
                  <Music className="w-3.5 h-3.5" />
                  <span>Giai Điệu Tình Yêu</span>
                </div>
                <button
                  onClick={() => setShowPlaylistModal(false)}
                  className="p-1.5 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-serif-romantic text-2xl font-bold text-[#3D2E28]">
                  Giai Điệu Của Hai Đứa
                </h3>
              </div>

              {/* Huy hiệu đồng bộ Cloud thời gian thực */}
              <div className="flex items-center justify-between gap-2 mb-3 pt-0.5">
                <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 bg-emerald-50/90 border border-emerald-200/80 px-2.5 py-1 rounded-full font-medium">
                  <Cloud className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đồng bộ tự động mọi thiết bị (Laptop, Điện thoại)</span>
                </div>
                <button
                  type="button"
                  onClick={handleForceSyncCloud}
                  className="text-[11px] text-[#D98A76] hover:text-[#C87D55] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  title="Nhấn để đẩy bài hát lên Cloud ngay lập tức"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Đồng bộ ngay</span>
                </button>
              </div>

              {/* Mẹo di chuyển máy phát nhạc linh hoạt */}
              <div className="flex items-center justify-between text-[11px] text-[#8C6D58] bg-[#FAF6F0] px-3 py-1.5 rounded-xl mb-3 border border-[#8C6D58]/10">
                <span className="flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-[#D98A76]" />
                  <span>Kéo thả máy phát nhạc để đặt vị trí bất kỳ</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetPosition}
                  className="text-[#D98A76] hover:text-[#C87D55] font-semibold hover:underline cursor-pointer"
                  title="Đưa máy phát nhạc về góc mặc định"
                >
                  Về góc mặc định
                </button>
              </div>

              {/* Thông báo thao tác (Toast) */}
              {toastMessage && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-[#E8A598]/20 border border-[#D98A76]/40 text-xs text-[#D98A76] font-medium flex items-center gap-1.5 animate-fadeIn">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span className="leading-snug">{toastMessage}</span>
                </div>
              )}
            </div>

            {/* Danh sách các bài hát có thể chọn */}
            <div className="space-y-1.5 overflow-y-auto max-h-[30vh] pr-1 py-1">
              {playlist.map((track, idx) => {
                const isSelected = idx === currentTrackIndex;
                const isCustom = track.id.startsWith('custom-');
                const isZing = track.isZing || track.id.startsWith('zing-');
                const isYt = track.isYouTube || track.id.startsWith('yt-');
                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(idx)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all group ${
                      isSelected
                        ? 'bg-[#E8A598]/15 border-[#D98A76] shadow-xs'
                        : 'bg-white hover:bg-[#FAF6F0] border-[#8C6D58]/15'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                      {track.thumbnail ? (
                        <div className="relative w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-[#8C6D58]/15">
                          <img
                            src={track.thumbnail}
                            alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          {isSelected && isPlaying && (
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                              <Pause className="w-3.5 h-3.5 text-white fill-white" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-[#D98A76] text-white'
                              : 'bg-[#F9F6F0] text-[#8C6D58]'
                          }`}
                        >
                          {isSelected && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-current" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#3D2E28] truncate flex items-center gap-1.5">
                          <span>{track.title}</span>
                          {isYt ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-red-100 text-red-600 font-semibold flex items-center gap-0.5">
                              <Youtube className="w-2.5 h-2.5" /> YouTube
                            </span>
                          ) : isZing ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#D98A76]/15 text-[#D98A76] font-medium flex items-center gap-0.5">
                              <Music className="w-2.5 h-2.5" /> Zing MP3
                            </span>
                          ) : isCustom ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-[#8C6D58]/10 text-[#8C6D58] font-normal">
                              Tự thêm
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-[#8C6D58] truncate">
                          {track.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FFFDF9] text-[#D98A76] border border-[#8C6D58]/10 hidden sm:inline">
                        {track.mood}
                      </span>
                      {/* NÚT XÓA BÀI HÁT */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(track.id, track.title, e)}
                        className="p-1.5 rounded-lg text-[#8C6D58]/60 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Xóa bài hát "${track.title}"`}
                        aria-label={`Xóa bài hát ${track.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thanh điều khiển phụ: Đếm bài hát & Khôi phục danh sách gốc */}
            <div className="flex items-center justify-between text-[11px] text-[#8C6D58] px-1 pt-2 pb-1 border-b border-[#8C6D58]/10">
              <span className="flex items-center gap-1">
                <span>Đang có <strong className="text-[#3D2E28]">{playlist.length}</strong> bài hát</span>
                <span title="Đã lưu vào bộ nhớ đám mây"><CheckCircle2 className="w-3 h-3 text-emerald-600" /></span>
              </span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 text-[#D98A76] hover:text-[#C87D55] font-medium hover:underline transition-all cursor-pointer"
                title="Khôi phục lại 6 bài hát gốc ban đầu"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Khôi phục bài gốc</span>
              </button>
            </div>

            {/* PHẦN THÊM BÀI HÁT: YOUTUBE | TẢI TỪ MÁY | MP3 THỦ CÔNG | ZING MP3 */}
            <div className="pt-3 border-t border-[#8C6D58]/10 mt-2">
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <button
                  type="button"
                  onClick={() => setActiveAddTab('youtube')}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    activeAddTab === 'youtube'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-2xs'
                      : 'bg-[#F9F6F0] text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('upload')}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    activeAddTab === 'upload'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xs'
                      : 'bg-[#F9F6F0] text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Tải nhạc từ máy</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('manual')}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 cursor-pointer ${
                    activeAddTab === 'manual'
                      ? 'bg-gradient-to-r from-[#D98A76] to-[#C87D55] text-white shadow-2xs'
                      : 'bg-[#F9F6F0] text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>Link MP3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('zing')}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all flex items-center gap-1 cursor-pointer ${
                    activeAddTab === 'zing'
                      ? 'bg-gradient-to-r from-[#D98A76] to-[#C87D55] text-white shadow-2xs'
                      : 'bg-[#F9F6F0] text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Download className="w-3 h-3" />
                  <span>Zing MP3</span>
                </button>
              </div>

              {activeAddTab === 'upload' ? (
                /* TAB TẢI FILE NHẠC TRỰC TIẾP TỪ MÁY (MP3 / M4A / WAV) */
                <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tải file nhạc từ điện thoại / máy tính:</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-sm">Phát ổn định 100%</span>
                  </div>
                  <label
                    htmlFor="music-file-upload-input"
                    className={`flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-xs font-semibold ${
                      isAudioUploading
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 pointer-events-none'
                        : 'border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/50 text-[#3D2E28]'
                    }`}
                  >
                    {isAudioUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Đang tải bài hát lên...</span>
                      </>
                    ) : (
                      <>
                        <Music className="w-4 h-4 text-emerald-600" />
                        <span>Chọn file .MP3 / .M4A / .WAV (tối đa 25MB)</span>
                      </>
                    )}
                  </label>
                  <input
                    id="music-file-upload-input"
                    ref={audioFileInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                    onChange={handleUploadAudioFile}
                    className="sr-only"
                  />
                </div>
              ) : activeAddTab === 'youtube' ? (
                /* TAB 1: THÊM NHẠC TỪ LINK YOUTUBE (ĐỒNG BỘ 100% TRÊN VERCEL VÀ MỌI NỀN TẢNG) */
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-red-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <Youtube className="w-3.5 h-3.5 text-red-600" />
                      <span>Dán link YouTube bất kỳ:</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-sm">Lưu trên mọi thiết bị</span>
                  </div>

                  <form onSubmit={handleAddYouTubeTrack} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Dán link (https://youtu.be/... hoặc https://youtube.com/watch?v=...)"
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        disabled={isYoutubeLoading}
                        className="w-full pl-8 pr-24 py-2 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-red-500 focus:outline-hidden disabled:opacity-50"
                      />
                      <Search className="w-3.5 h-3.5 text-[#8C6D58] absolute left-2.5 top-2.5" />
                      <button
                        type="submit"
                        disabled={isYoutubeLoading || !youtubeInput.trim()}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isYoutubeLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <>
                            <Youtube className="w-3.5 h-3.5" />
                            <span>Thêm Nhạc</span>
                          </>
                        )}
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Tên bài hát hiển thị (Tùy chọn, để trống sẽ tự lấy tên video)"
                      value={youtubeCustomTitle}
                      onChange={(e) => setYoutubeCustomTitle(e.target.value)}
                      disabled={isYoutubeLoading}
                      className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/15 focus:border-red-500 focus:outline-hidden"
                    />

                    {/* Gợi ý nhanh các bài hát YouTube có sẵn link */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-[#8C6D58]">Chọn nhanh:</span>
                      {YOUTUBE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setYoutubeInput(preset.url);
                            setYoutubeCustomTitle(preset.name);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-all cursor-pointer"
                        >
                          {preset.name.split(' - ')[0]}
                        </button>
                      ))}
                    </div>
                  </form>
                </div>
              ) : activeAddTab === 'manual' ? (
                /* TAB 2: NHẬP LINK MP3 TRỰC TIẾP */
                <form onSubmit={handleAddCustomTrack} className="space-y-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#8C6D58]/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Thêm link file nhạc (.mp3 / .ogg / stream):</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-sm">Lưu trên mọi thiết bị</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Tên bài hát (Ví dụ: Giai điệu riêng của hai đứa)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="url"
                      required
                      placeholder="Dán link file nhạc trực tiếp (.mp3 / .ogg / stream)..."
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs transition-all cursor-pointer"
                    >
                      Thêm
                    </button>
                  </div>
                </form>
              ) : (
                /* TAB 3: TẢI NHẠC TỪ ZING MP3 (CẦN SERVER NODE.JS) */
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#C87D55]/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <span>Dán link Zing MP3:</span>
                    </span>
                    <span className="text-[10px] text-[#8C6D58]">Tự động tải về</span>
                  </div>

                  <form onSubmit={handleDownloadFromZing} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Dán link bài hát (https://zingmp3.vn/bai-hat/...)..."
                        value={zingInput}
                        onChange={(e) => setZingInput(e.target.value)}
                        disabled={isZingLoading}
                        className="w-full pl-8 pr-20 py-2 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#D98A76] focus:outline-hidden disabled:opacity-50"
                      />
                      <Search className="w-3.5 h-3.5 text-[#8C6D58] absolute left-2.5 top-2.5" />
                      <button
                        type="submit"
                        disabled={isZingLoading || !zingInput.trim()}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-[#D98A76] hover:bg-[#C87D55] text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isZingLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang tải...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải Về</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-start gap-1 text-[10px] text-[#8C6D58] bg-[#F9F6F0] p-1.5 rounded-lg border border-[#8C6D58]/10">
                      <Info className="w-3.5 h-3.5 shrink-0 text-[#D98A76] mt-0.5" />
                      <span>Để bài hát tự động đồng bộ sang điện thoại, bạn nên dùng tab <strong>Link YouTube</strong> hoặc <strong>Link MP3 trực tiếp</strong> nhé!</span>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* HỘP THOẠI XÁC NHẬN XÓA BÀI HÁT */}
            {trackToDelete && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 rounded-3xl animate-fadeIn">
                <div className="bg-[#FFFDF9] rounded-2xl p-5 border border-[#8C6D58]/20 shadow-2xl max-w-xs w-full text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif-romantic font-bold text-base text-[#3D2E28]">
                      Xác nhận xóa bài hát?
                    </h4>
                    <p className="text-xs text-[#8C6D58] mt-1 line-clamp-2">
                      Bạn có chắc muốn xóa <strong className="text-[#3D2E28]">"{trackToDelete.title}"</strong> khỏi danh sách bài của hai bạn trên tất cả thiết bị không?
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTrackToDelete(null)}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#F9F6F0] text-[#8C6D58] hover:bg-[#F0ECE1] transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="button"
                      onClick={confirmDeleteTrack}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-all cursor-pointer"
                    >
                      Xóa ngay
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HỘP THOẠI XÁC NHẬN KHÔI PHỤC BÀI HÁT GỐC */}
            {showResetConfirm && (
              <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 rounded-3xl animate-fadeIn">
                <div className="bg-[#FFFDF9] rounded-2xl p-5 border border-[#8C6D58]/20 shadow-2xl max-w-xs w-full text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#E8A598]/25 text-[#D98A76] flex items-center justify-center mx-auto shadow-xs">
                    <RotateCcw className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-serif-romantic font-bold text-base text-[#3D2E28]">
                      Khôi phục bài hát gốc?
                    </h4>
                    <p className="text-xs text-[#8C6D58] mt-1">
                      Danh sách sẽ được đặt lại về 6 giai điệu lãng mạn mặc định ban đầu trên tất cả các máy.
                    </p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#F9F6F0] text-[#8C6D58] hover:bg-[#F0ECE1] transition-all cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={confirmResetPlaylist}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-xl bg-[#D98A76] hover:bg-[#C87D55] text-white shadow-xs transition-all cursor-pointer"
                    >
                      Khôi phục
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
