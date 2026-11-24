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
  Upload,
  Flame,
  Plus,
  Check,
  Shuffle,
  Repeat,
  Repeat1,
  FileAudio,
  ListPlus,
  Tv2
} from 'lucide-react';
import { MusicTrack, DEFAULT_PLAYLIST, VPOP_FEATURED_TRACKS } from '../types';
import {
  extractYouTubeId,
  extractYouTubePlaylistId,
  getYouTubeVideoInfoClient,
  CURATED_YOUTUBE_PLAYLISTS,
  CuratedYouTubePlaylist
} from '../utils/youtube';
import {
  isLocalAudioUrl,
  saveLocalAudioFile,
  resolveLocalAudioUrl,
  deleteLocalAudioFile,
  readAudioFileDuration
} from '../utils/localAudioStore';
import {
  getStoredPlaylist,
  savePlaylistBoth,
  subscribeToSharedPlaylist,
  mergeVpopTracksIntoPlaylist
} from '../services/storage';
import {
  isCloudMediaUrl,
  getCachedCloudMediaUrl,
  resolveCloudMediaUrl,
  uploadFileToCloudMedia,
  deleteCloudMedia
} from '../services/cloudMedia';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

const formatTrackTime = (seconds?: number): string => {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isPersonalUploadTrack = (track: MusicTrack): boolean => {
  const id = String(track?.id || '');
  return (
    Boolean(track?.isPersonalUpload) ||
    id.startsWith('upload-') ||
    isLocalAudioUrl(track?.url) ||
    isCloudMediaUrl(track?.url)
  );
};

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

const sanitizePlaylistTracks = (tracks: MusicTrack[] | null | undefined): MusicTrack[] => {
  if (!Array.isArray(tracks) || tracks.length === 0) return DEFAULT_PLAYLIST;
  const valid = tracks
    .filter(
      (t): t is MusicTrack =>
        Boolean(t && typeof t === 'object' && (t.url || t.youtubeId || t.youtubePlaylistId))
    )
    .map((t, idx) => {
      const url =
        typeof t.url === 'string'
          ? t.url
          : t.youtubeId
            ? `https://www.youtube.com/watch?v=${t.youtubeId}`
            : t.youtubePlaylistId
              ? `https://www.youtube.com/playlist?list=${t.youtubePlaylistId}`
              : '';
      const inferredYtId = t.youtubeId || (t.isYouTube ? extractYouTubeId(url) || undefined : undefined);
      const inferredYtPlaylistId =
        t.youtubePlaylistId || (t.isYouTube && !inferredYtId ? extractYouTubePlaylistId(url) || undefined : undefined);
      return {
        ...t,
        id: typeof t.id === 'string' && t.id.trim() ? t.id : `track-${idx}-${Date.now()}`,
        title: typeof t.title === 'string' && t.title.trim() ? t.title : 'Giai điệu của hai đứa',
        artist: typeof t.artist === 'string' && t.artist.trim() ? t.artist : 'Góc Nhỏ Bình Yên',
        mood: typeof t.mood === 'string' && t.mood.trim() ? t.mood : 'Lãng mạn',
        url,
        ...(inferredYtId ? { isYouTube: true, youtubeId: inferredYtId } : {}),
        ...(inferredYtPlaylistId ? { isYouTube: true, youtubePlaylistId: inferredYtPlaylistId } : {})
      };
    });
  return valid.length > 0 ? valid : DEFAULT_PLAYLIST;
};

const MusicPlayerInner: React.FC = () => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>(() => sanitizePlaylistTracks(getStoredPlaylist()));
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'all' | 'one'>('all');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [playlistFilter, setPlaylistFilter] = useState<'all' | 'youtube' | 'upload' | 'preset'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [widgetNotice, setWidgetNotice] = useState<string | null>(null);

  // In-app confirmation states
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Tab thêm nhạc: YouTube (Playlist & Video) | Tải MP3 cá nhân | Kho V-Pop | Link MP3 | Zing MP3
  const [activeAddTab, setActiveAddTab] = useState<'youtube' | 'upload' | 'vpop' | 'manual' | 'zing'>('youtube');

  // YouTube Music & Playlist state
  const [youtubeInput, setYoutubeInput] = useState('');
  const [youtubeCustomTitle, setYoutubeCustomTitle] = useState('');
  const [youtubeImportMode, setYoutubeImportMode] = useState<'append' | 'replace'>('append');
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);

  // Upload audio file from device state (hỗ trợ kéo thả & chọn nhiều tệp MP3/M4A/WAV)
  const [isAudioUploading, setIsAudioUploading] = useState(false);
  const [isDragOverUpload, setIsDragOverUpload] = useState(false);
  const [uploadCustomTitle, setUploadCustomTitle] = useState('');
  const [uploadCustomArtist, setUploadCustomArtist] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    percent: number;
    fileName: string;
  } | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // Zing MP3 Downloader state
  const [zingInput, setZingInput] = useState('');
  const [isZingLoading, setIsZingLoading] = useState(false);

  // Custom song input
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const ytHostRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isYtReady, setIsYtReady] = useState(false);
  const [showYtMiniPlayer, setShowYtMiniPlayer] = useState(false);
  const loadedAudioUrlRef = useRef<string>('');
  const loadedYtIdRef = useRef<string>('');
  const pendingYtPlayRef = useRef<{ videoId?: string; playlistId?: string } | null>(null);
  const usedProxyForUrlRef = useRef<string>('');
  const consecutiveErrorsRef = useRef<number>(0);
  const volumeRef = useRef<number>(volume);
  const isMutedRef = useRef<boolean>(isMuted);
  const isPlayingRef = useRef<boolean>(isPlaying);
  const isShuffleRef = useRef<boolean>(isShuffle);
  const repeatModeRef = useRef<'all' | 'one'>(repeatMode);
  const wantsToPlayRef = useRef<boolean>(false);
  const ytWatchdogRef = useRef<number | null>(null);
  const playlistLengthRef = useRef<number>(playlist.length);

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
    isShuffleRef.current = isShuffle;
    repeatModeRef.current = repeatMode;
    playlistLengthRef.current = playlist.length;
  }, [volume, isMuted, isPlaying, isShuffle, repeatMode, playlist.length]);

  const showNotice = useCallback((msg: string, duration = 3800) => {
    setWidgetNotice(msg);
    setToastMessage(msg);
    window.setTimeout(() => {
      setWidgetNotice((prev) => (prev === msg ? null : prev));
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, duration);
  }, []);

  const clearYtWatchdog = useCallback(() => {
    if (ytWatchdogRef.current !== null) {
      window.clearTimeout(ytWatchdogRef.current);
      ytWatchdogRef.current = null;
    }
  }, []);

  // Hàm phát bài hát đồng bộ trực tiếp trong ngữ cảnh tương tác (hỗ trợ 100% iPhone Safari & Chrome)
  const playTrackDirect = useCallback(
    (track: MusicTrack | undefined, shouldPlay: boolean) => {
      if (!track) return;
      wantsToPlayRef.current = shouldPlay;
      clearYtWatchdog();
      const effectiveVolume = isMutedRef.current ? 0 : volumeRef.current;

      if (track.isYouTube && (track.youtubeId || track.youtubePlaylistId)) {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (shouldPlay) {
          // Hiển thị khung YouTube mini ngay lập tức để iOS Safari cho phép phát & người dùng chạm ▶️ được nếu bị chặn autoplay
          setShowYtMiniPlayer(true);
        }

        const ytTargetKey = track.youtubePlaylistId && !track.youtubeId
          ? `pl:${track.youtubePlaylistId}`
          : String(track.youtubeId || '');

        const startYtWatchdog = () => {
          clearYtWatchdog();
          ytWatchdogRef.current = window.setTimeout(() => {
            if (wantsToPlayRef.current && !isPlayingRef.current) {
              setIsBuffering(false);
              showNotice('Hãy chạm nút ▶️ trên khung YouTube nhỏ bên dưới để phát nhạc trên điện thoại nhé!', 5000);
            }
          }, 4200);
        };

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
              if (loadedYtIdRef.current !== ytTargetKey) {
                loadedYtIdRef.current = ytTargetKey;
                setCurrentTime(0);
                setDuration(track.duration || 0);
                if (track.youtubePlaylistId && !track.youtubeId && typeof ytPlayerRef.current.loadPlaylist === 'function') {
                  ytPlayerRef.current.loadPlaylist({ listType: 'playlist', list: track.youtubePlaylistId });
                } else if (track.youtubeId) {
                  ytPlayerRef.current.loadVideoById(track.youtubeId);
                }
              } else {
                ytPlayerRef.current.playVideo();
              }
              startYtWatchdog();
            } else {
              if (loadedYtIdRef.current !== ytTargetKey) {
                loadedYtIdRef.current = ytTargetKey;
                setCurrentTime(0);
                setDuration(track.duration || 0);
                if (track.youtubePlaylistId && !track.youtubeId && typeof ytPlayerRef.current.cuePlaylist === 'function') {
                  ytPlayerRef.current.cuePlaylist({ listType: 'playlist', list: track.youtubePlaylistId });
                } else if (track.youtubeId) {
                  ytPlayerRef.current.cueVideoById(track.youtubeId);
                }
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
          pendingYtPlayRef.current = {
            videoId: track.youtubeId,
            playlistId: !track.youtubeId ? track.youtubePlaylistId : undefined
          };
          setIsBuffering(true);
          startYtWatchdog();
        }
      } else {
        setShowYtMiniPlayer(false);
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
        if (!targetUrl) return;

        const startHtmlAudio = (resolvedUrl: string) => {
          const needsReload =
            loadedAudioUrlRef.current !== resolvedUrl || Boolean(audio.error) || audio.readyState === 0;
          if (needsReload) {
            usedProxyForUrlRef.current = '';
            loadedAudioUrlRef.current = resolvedUrl;
            setCurrentTime(0);
            setDuration(track.duration || 0);
            audio.src = resolvedUrl;
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
                  if (err?.name === 'NotAllowedError') {
                    wantsToPlayRef.current = false;
                    setIsBuffering(false);
                    setIsPlaying(false);
                    showNotice('Hãy chạm nút Phát một lần nữa để mở âm thanh trên điện thoại nhé!');
                  } else if (err?.name !== 'AbortError') {
                    // Nếu là link ngoài chưa thử proxy -> thử ngay qua /api/audio/proxy
                    if (/^https?:\/\//i.test(resolvedUrl) && usedProxyForUrlRef.current !== resolvedUrl) {
                      usedProxyForUrlRef.current = resolvedUrl;
                      const proxied = `/api/audio/proxy?url=${encodeURIComponent(resolvedUrl)}`;
                      loadedAudioUrlRef.current = proxied;
                      audio.src = proxied;
                      audio.load();
                      audio.play().catch(() => {
                        setIsBuffering(false);
                        setIsPlaying(false);
                      });
                    } else {
                      setIsBuffering(false);
                      setIsPlaying(false);
                    }
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
        };

        if (isLocalAudioUrl(targetUrl)) {
          if (shouldPlay) setIsBuffering(true);
          resolveLocalAudioUrl(targetUrl)
            .then((blobUrl) => {
              if (blobUrl) {
                startHtmlAudio(blobUrl);
              } else {
                setIsBuffering(false);
                setIsPlaying(false);
                showNotice('Tệp âm thanh cục bộ này chỉ có trên thiết bị đã tải lên.');
              }
            })
            .catch(() => {
              setIsBuffering(false);
              setIsPlaying(false);
              showNotice('Không thể mở tệp âm thanh cá nhân từ bộ nhớ thiết bị.');
            });
        } else if (isCloudMediaUrl(targetUrl)) {
          const cachedBlobUrl = getCachedCloudMediaUrl(targetUrl);
          if (cachedBlobUrl) {
            startHtmlAudio(cachedBlobUrl);
          } else {
            if (shouldPlay) setIsBuffering(true);
            resolveCloudMediaUrl(targetUrl)
              .then((blobUrl) => {
                if (blobUrl) startHtmlAudio(blobUrl);
              })
              .catch(() => {
                setIsBuffering(false);
                setIsPlaying(false);
                showNotice('Không thể tải file nhạc từ đám mây lúc này.');
              });
          }
        } else {
          startHtmlAudio(targetUrl);
        }
      }
    },
    [showNotice, clearYtWatchdog]
  );

  const handleNext = useCallback(
    (fromAutoEnd = false) => {
      if (playlist.length === 0) return;

      if (fromAutoEnd && repeatModeRef.current === 'one') {
        const sameTrack = playlist[currentTrackIndex];
        if (sameTrack?.isYouTube && ytPlayerRef.current?.seekTo) {
          try {
            ytPlayerRef.current.seekTo(0, true);
            ytPlayerRef.current.playVideo();
            return;
          } catch {}
        }
        if (audioRef.current && !sameTrack?.isYouTube) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
          return;
        }
      }

      let nextIdx = (currentTrackIndex + 1) % playlist.length;
      if (isShuffleRef.current && playlist.length > 1) {
        let candidate = currentTrackIndex;
        for (let tries = 0; tries < 6 && candidate === currentTrackIndex; tries++) {
          candidate = Math.floor(Math.random() * playlist.length);
        }
        nextIdx = candidate;
      }

      setCurrentTrackIndex(nextIdx);
      playTrackDirect(playlist[nextIdx], true);
    },
    [playlist, currentTrackIndex, playTrackDirect]
  );

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

  // 1. TỰ ĐỘNG ĐỒNG BỘ PLAYLIST THỜI GIAN THỰC TỪ CLOUD FIRESTORE + NẠP GÓI 16 BÀI V-POP MỘT LẦN (GIỮ NGUYÊN BÀI TỰ THÊM)
  useEffect(() => {
    const VPOP_PACK_FLAG = 'goc_nho_vpop_pack_v1';
    let hasAttemptedCloudMerge = false;

    const applyVpopPackIfNeeded = (tracks: MusicTrack[]): { next: MusicTrack[]; changed: boolean } => {
      let alreadyApplied = false;
      try {
        alreadyApplied = localStorage.getItem(VPOP_PACK_FLAG) === '1';
      } catch {}

      if (alreadyApplied) {
        return { next: tracks, changed: false };
      }

      const { tracks: merged, addedCount } = mergeVpopTracksIntoPlaylist(tracks);
      try {
        localStorage.setItem(VPOP_PACK_FLAG, '1');
      } catch {}
      return { next: merged, changed: addedCount > 0 };
    };

    // Kiểm tra nạp ngay trên dữ liệu cục bộ ban đầu
    const localInitial = sanitizePlaylistTracks(getStoredPlaylist());
    const localMerged = applyVpopPackIfNeeded(localInitial);
    if (localMerged.changed) {
      setPlaylist(localMerged.next);
      savePlaylistBoth(localMerged.next).catch(() => {});
    }

    const unsubscribe = subscribeToSharedPlaylist((sharedTracks) => {
      if (sharedTracks && sharedTracks.length > 0) {
        const clean = sanitizePlaylistTracks(sharedTracks);
        if (!hasAttemptedCloudMerge) {
          hasAttemptedCloudMerge = true;
          const missingVpopCount = VPOP_FEATURED_TRACKS.filter(
            (v) => !clean.some((t) => t.id === v.id || t.url === v.url)
          ).length;
          let alreadyApplied = false;
          try {
            alreadyApplied = localStorage.getItem(VPOP_PACK_FLAG) === '1';
          } catch {}

          // Nếu Cloud playlist vẫn là bản cũ chưa có gói V-Pop (thiếu >= 12 bài V-Pop gốc), tự động gộp vào giữ nguyên bài tự thêm
          if (!alreadyApplied || missingVpopCount >= 12) {
            const { tracks: merged, addedCount } = mergeVpopTracksIntoPlaylist(clean);
            try {
              localStorage.setItem(VPOP_PACK_FLAG, '1');
            } catch {}
            setPlaylist(merged);
            setCurrentTrackIndex((prev) => (prev >= merged.length ? 0 : prev));
            setIsCloudSynced(true);
            if (addedCount > 0) {
              savePlaylistBoth(merged).catch(() => {});
            }
            return;
          }
        }

        setPlaylist(clean);
        setCurrentTrackIndex((prev) => (prev >= clean.length ? 0 : prev));
        setIsCloudSynced(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. KHỞI TẠO YOUTUBE IFRAME API (Dùng thẻ con tạo động trong ytHostRef để không bao giờ xung đột DOM với React)
  useEffect(() => {
    let isDisposed = false;

    const initYT = () => {
      if (isDisposed) return;
      if (window.YT && window.YT.Player) {
        if (!ytPlayerRef.current && ytHostRef.current) {
          try {
            const mountEl = document.createElement('div');
            ytHostRef.current.innerHTML = '';
            ytHostRef.current.appendChild(mountEl);

            ytPlayerRef.current = new window.YT.Player(mountEl, {
              height: '135',
              width: '240',
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
                  if (isDisposed) return;
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
                    if (pendingYtPlayRef.current) {
                      const pending = pendingYtPlayRef.current;
                      pendingYtPlayRef.current = null;
                      if (pending.playlistId && ytPlayerRef.current?.loadPlaylist) {
                        loadedYtIdRef.current = `pl:${pending.playlistId}`;
                        ytPlayerRef.current.loadPlaylist({ listType: 'playlist', list: pending.playlistId });
                      } else if (pending.videoId && ytPlayerRef.current?.loadVideoById) {
                        loadedYtIdRef.current = pending.videoId;
                        ytPlayerRef.current.loadVideoById(pending.videoId);
                      }
                    }
                  } catch (e) {
                    console.warn('Lỗi cấu hình YouTube Player onReady:', e);
                  }
                },
                onStateChange: (event: any) => {
                  if (isDisposed) return;
                  // 0=ENDED, 1=PLAYING, 2=PAUSED, 3=BUFFERING
                  if (event.data === 0) {
                    clearYtWatchdog();
                    handleNextRef.current(true);
                  } else if (event.data === 1) {
                    clearYtWatchdog();
                    consecutiveErrorsRef.current = 0;
                    wantsToPlayRef.current = true;
                    setIsPlaying(true);
                    setIsBuffering(false);
                  } else if (event.data === 2) {
                    clearYtWatchdog();
                    wantsToPlayRef.current = false;
                    setIsPlaying(false);
                    setIsBuffering(false);
                  } else if (event.data === 3) {
                    setIsBuffering(true);
                  }
                },
                onError: (event: any) => {
                  if (isDisposed) return;
                  console.warn('Lỗi phát video YouTube (mã lỗi):', event?.data);
                  clearYtWatchdog();
                  setIsBuffering(false);
                  consecutiveErrorsRef.current += 1;
                  if (consecutiveErrorsRef.current < Math.max(2, playlistLengthRef.current)) {
                    showNotice('⚠️ Video YouTube này bị chủ kênh chặn phát nhúng, đang chuyển sang bài tiếp theo...');
                    window.setTimeout(() => handleNextRef.current(), 800);
                  } else {
                    wantsToPlayRef.current = false;
                    setIsPlaying(false);
                    showNotice('⚠️ Không phát được bài hát này. Hãy thử gõ TÊN BÀI HÁT hoặc tải MP3 từ máy nhé!');
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

    return () => {
      isDisposed = true;
      clearYtWatchdog();
      if (ytPlayerRef.current && typeof ytPlayerRef.current.destroy === 'function') {
        try {
          ytPlayerRef.current.destroy();
        } catch {}
      }
      ytPlayerRef.current = null;
    };
  }, [showNotice, clearYtWatchdog]);

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

  // Cập nhật thanh tiến độ thời gian cho YouTube Player khi đang phát
  useEffect(() => {
    if (!isPlaying || !currentTrack?.isYouTube) return;
    const poll = window.setInterval(() => {
      try {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
          const t = Number(ytPlayerRef.current.getCurrentTime() || 0);
          const d = Number(ytPlayerRef.current.getDuration() || 0);
          if (Number.isFinite(t)) setCurrentTime(t);
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }
      } catch {}
    }, 500);
    return () => window.clearInterval(poll);
  }, [isPlaying, currentTrack?.isYouTube, currentTrack?.id]);

  // Chuẩn bị nguồn phát khi playlist lần đầu đồng bộ hoặc YouTube Player vừa sẵn sàng
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.isYouTube && (currentTrack.youtubeId || currentTrack.youtubePlaylistId)) {
      const targetKey = currentTrack.youtubePlaylistId && !currentTrack.youtubeId
        ? `pl:${currentTrack.youtubePlaylistId}`
        : String(currentTrack.youtubeId || '');
      if (isYtReady && ytPlayerRef.current && loadedYtIdRef.current !== targetKey) {
        try {
          loadedYtIdRef.current = targetKey;
          if (currentTrack.youtubePlaylistId && !currentTrack.youtubeId) {
            if (isPlayingRef.current && ytPlayerRef.current.loadPlaylist) {
              ytPlayerRef.current.loadPlaylist({ listType: 'playlist', list: currentTrack.youtubePlaylistId });
            } else if (ytPlayerRef.current.cuePlaylist) {
              ytPlayerRef.current.cuePlaylist({ listType: 'playlist', list: currentTrack.youtubePlaylistId });
            }
          } else if (currentTrack.youtubeId) {
            if (isPlayingRef.current) {
              ytPlayerRef.current.loadVideoById(currentTrack.youtubeId);
            } else {
              ytPlayerRef.current.cueVideoById(currentTrack.youtubeId);
            }
          }
        } catch {}
      }
    } else if (
      audioRef.current &&
      currentTrack.url &&
      !isCloudMediaUrl(currentTrack.url) &&
      !isLocalAudioUrl(currentTrack.url) &&
      loadedAudioUrlRef.current !== currentTrack.url
    ) {
      loadedAudioUrlRef.current = currentTrack.url;
      audioRef.current.src = currentTrack.url;
      audioRef.current.preload = 'auto';
    }
  }, [currentTrack?.id, currentTrack?.url, currentTrack?.youtubeId, currentTrack?.youtubePlaylistId, isYtReady]);

  const handleSeek = (nextSec: number) => {
    if (!Number.isFinite(nextSec) || nextSec < 0) return;
    setCurrentTime(nextSec);
    if (currentTrack?.isYouTube) {
      try {
        ytPlayerRef.current?.seekTo?.(nextSec, true);
      } catch {}
    } else if (audioRef.current) {
      try {
        audioRef.current.currentTime = nextSec;
      } catch {}
    }
  };

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
    const activePlayIntent = wantsToPlayRef.current || isPlayingRef.current;

    // Nếu là link https bên ngoài và chưa thử qua proxy -> thử phát qua server proxy để vượt CORS/Referer/Google Drive
    if (
      audio &&
      /^https?:\/\//i.test(originalUrl) &&
      usedProxyForUrlRef.current !== originalUrl &&
      activePlayIntent
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
    if (!activePlayIntent) return;

    consecutiveErrorsRef.current += 1;

    if (consecutiveErrorsRef.current < Math.max(2, playlist.length)) {
      showNotice(`⚠️ Không tải được "${currentTrack.title}", tự động chuyển bài tiếp theo...`);
      window.setTimeout(() => handleNextRef.current(), 700);
    } else {
      wantsToPlayRef.current = false;
      setIsPlaying(false);
      showNotice(`⚠️ Không thể phát "${currentTrack.title}". Hãy bấm "Khôi phục bài gốc" hoặc tải file MP3 từ máy!`);
    }
  };

  // Xử lý tải 1 hoặc nhiều tệp âm thanh (MP3 / M4A / WAV / OGG / FLAC) từ máy tính hoặc điện thoại
  const processAudioFileUploads = async (filesInput: FileList | File[]) => {
    const files = Array.from(filesInput).filter(
      (f) => f && f.size > 0 && (f.type.startsWith('audio/') || /\.(mp3|m4a|wav|aac|ogg|flac)$/i.test(f.name))
    );

    if (files.length === 0) {
      showNotice('Vui lòng chọn tệp âm thanh hợp lệ (.mp3, .m4a, .wav, .ogg).');
      return;
    }

    const oversized = files.filter((f) => f.size > 25 * 1024 * 1024);
    const validFiles = files.filter((f) => f.size <= 25 * 1024 * 1024);
    if (validFiles.length === 0) {
      showNotice('File nhạc vượt quá 25MB. Bạn vui lòng chọn file nhẹ hơn nhé!');
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
      return;
    }

    setIsAudioUploading(true);
    const addedSongs: MusicTrack[] = [];
    const customSingleTitle = validFiles.length === 1 ? uploadCustomTitle.trim() : '';
    const customArtist = uploadCustomArtist.trim();

    try {
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const fallbackTitle =
          file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Bài hát của hai đứa';
        const finalTitle = customSingleTitle || fallbackTitle;
        const finalArtist = customArtist || 'Nhạc cá nhân tải lên';

        setUploadProgress({
          current: i + 1,
          total: validFiles.length,
          percent: 12,
          fileName: file.name
        });
        setToastMessage(
          validFiles.length > 1
            ? `Đang tải lên (${i + 1}/${validFiles.length}): "${finalTitle}"...`
            : `Đang tải lên "${finalTitle}"...`
        );

        const detectedDuration = await readAudioFileDuration(file);
        let uploadedSong: MusicTrack | null = null;

        // 1. Ưu tiên lưu qua máy chủ Express (/api/music/upload) để phát HTTP Range siêu mượt trên iPhone
        try {
          const response = await fetch('/api/music/upload', {
            method: 'POST',
            headers: {
              'Content-Type': file.type || 'audio/mpeg',
              'X-File-Name': encodeURIComponent(file.name),
              ...(finalTitle ? { 'X-Track-Title': encodeURIComponent(finalTitle) } : {}),
              ...(finalArtist ? { 'X-Track-Artist': encodeURIComponent(finalArtist) } : {})
            },
            body: file
          });

          const ct = response.headers.get('content-type') || '';
          if (response.ok && ct.includes('application/json')) {
            const data = await response.json();
            if (data?.success && data?.song) {
              uploadedSong = {
                ...data.song,
                title: finalTitle,
                artist: finalArtist,
                mood: 'MP3 cá nhân',
                isPersonalUpload: true,
                ...(detectedDuration ? { duration: detectedDuration } : {})
              };
              setUploadProgress({
                current: i + 1,
                total: validFiles.length,
                percent: 100,
                fileName: file.name
              });
            }
          }
        } catch {
          // Chuyển sang Cloud Media Firestore bên dưới
        }

        // 2. Fallback: lưu vào Cloud Media Firestore (đồng bộ Laptop <-> iPhone trên hosting tĩnh)
        if (!uploadedSong && file.size <= 24 * 1024 * 1024) {
          try {
            const uploaded = await uploadFileToCloudMedia(file, (pct) => {
              setUploadProgress({
                current: i + 1,
                total: validFiles.length,
                percent: pct,
                fileName: file.name
              });
            });
            uploadedSong = {
              id: `upload-${Date.now()}-${i}`,
              title: finalTitle,
              artist: finalArtist,
              mood: 'MP3 cá nhân',
              url: uploaded.mediaUrl,
              isPersonalUpload: true,
              ...(detectedDuration ? { duration: detectedDuration } : {})
            };
          } catch {
            // Chuyển sang IndexedDB cục bộ bên dưới để đảm bảo không bao giờ mất bài
          }
        }

        // 3. Fallback cuối: lưu trực tiếp vào IndexedDB trên thiết bị (phát offline tức thì)
        if (!uploadedSong) {
          const localUrl = await saveLocalAudioFile(file);
          uploadedSong = {
            id: `upload-local-${Date.now()}-${i}`,
            title: finalTitle,
            artist: finalArtist,
            mood: 'MP3 cá nhân',
            url: localUrl,
            isPersonalUpload: true,
            ...(detectedDuration ? { duration: detectedDuration } : {})
          };
        }

        addedSongs.push(uploadedSong);
      }

      if (addedSongs.length > 0) {
        const updated = [...addedSongs, ...playlist];
        setPlaylist(updated);
        await savePlaylistBoth(updated);

        setUploadCustomTitle('');
        setUploadCustomArtist('');
        setPlaylistFilter('all');
        setCurrentTrackIndex(0);
        playTrackDirect(addedSongs[0], true);

        const skipNote = oversized.length > 0 ? ` (bỏ qua ${oversized.length} file > 25MB)` : '';
        showNotice(
          addedSongs.length === 1
            ? `Đã tải lên "${addedSongs[0].title}" và bắt đầu phát!${skipNote}`
            : `Đã tải lên ${addedSongs.length} tệp âm thanh cá nhân vào danh sách!${skipNote}`
        );
      }
    } catch (err: any) {
      console.warn('Lỗi tải nhạc từ máy:', err);
      showNotice(err?.message || 'Không thể tải file nhạc lên lúc này.');
    } finally {
      setIsAudioUploading(false);
      setUploadProgress(null);
      if (audioFileInputRef.current) audioFileInputRef.current.value = '';
    }
  };

  const handleUploadAudioFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processAudioFileUploads(e.target.files);
    }
  };

  const handleDropAudioFiles = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverUpload(false);
    if (isAudioUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processAudioFileUploads(e.dataTransfer.files);
    }
  };

  // Nút bấm đồng bộ thủ công danh sách bài hát lên Cloud
  const handleForceSyncCloud = async () => {
    setIsCloudSynced(false);
    await savePlaylistBoth(playlist);
    setIsCloudSynced(true);
    showNotice('☁️ Đã đồng bộ bài hát lên Cloud! Điện thoại và máy tính khác đều đã lưu.');
  };

  // Helper chung: phân giải MỌI link nhạc hoặc tên bài hát (YouTube, Zing MP3, MP3, Drive, Dropbox, tên bài)
  const resolveAnyMusicInput = async (rawInput: string, customName?: string): Promise<{ song: MusicTrack; note?: string }> => {
    const query = rawInput.trim();
    const cleanCustomName = customName?.trim() || '';

    // 1. Gọi API universal backend (/api/music/resolve-link)
    try {
      const response = await fetch('/api/music/resolve-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: query, title: cleanCustomName })
      });
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (response.ok && data?.success && data?.song) {
          return { song: data.song, note: data.note };
        }
        if (!response.ok && data?.message) {
          throw new Error(data.message);
        }
      }
    } catch (err: any) {
      // Nếu backend chủ động trả lỗi rõ ràng (ví dụ link HTML / VIP), ném ra luôn để hiển thị cho người dùng
      if (err?.message && !/failed to fetch|networkerror/i.test(err.message)) {
        throw err;
      }
    }

    // 2. Fallback client-side nếu backend không phản hồi
    const extractedVideoId = extractYouTubeId(query);
    if (extractedVideoId) {
      const info = await getYouTubeVideoInfoClient(extractedVideoId, cleanCustomName);
      return {
        song: {
          id: `yt-${extractedVideoId}`,
          title: info.title,
          artist: info.artist,
          mood: 'YouTube Music',
          url: `https://www.youtube.com/watch?v=${extractedVideoId}`,
          thumbnail: info.thumbnail,
          isYouTube: true,
          youtubeId: extractedVideoId
        }
      };
    }

    if (/^https?:\/\//i.test(query)) {
      const guessedTitle =
        cleanCustomName ||
        decodeURIComponent(query.split('?')[0].split('/').pop() || 'Giai điệu của hai đứa')
          .replace(/\.[^.]+$/, '')
          .replace(/[_-]+/g, ' ')
          .trim() ||
        'Giai điệu của hai đứa';
      return {
        song: {
          id: `custom-${Date.now()}`,
          title: guessedTitle,
          artist: 'Tự chọn của hai đứa',
          mood: 'Yêu thích',
          url: query
        }
      };
    }

    throw new Error('Không tìm thấy bài hát. Bạn hãy dán link YouTube / Zing MP3 / file .mp3 hoặc tải nhạc từ máy nhé!');
  };

  // Thêm nhạc từ Link MP3 / Link bất kỳ ở tab Link MP3
  const handleAddCustomTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawUrl = customUrl.trim();
    if (!rawUrl) return;

    setIsYoutubeLoading(true);
    setToastMessage('Đang kiểm tra link nhạc...');
    try {
      const { song: newTrack, note } = await resolveAnyMusicInput(rawUrl, customTitle);
      const existingIdx = playlist.findIndex((t) => t.id === newTrack.id);
      let updated: MusicTrack[];
      let targetIdx: number;
      if (existingIdx !== -1) {
        updated = [...playlist];
        updated[existingIdx] = newTrack;
        targetIdx = existingIdx;
      } else {
        updated = [...playlist, newTrack];
        targetIdx = updated.length - 1;
      }

      setPlaylist(updated);
      await savePlaylistBoth(updated);

      setCustomTitle('');
      setCustomUrl('');
      setCurrentTrackIndex(targetIdx);
      setShowPlaylistModal(false);
      playTrackDirect(newTrack, true);
      showNotice(note ? `🎵 ${note}` : `☁️ Đã thêm "${newTrack.title}" & đồng bộ lên mọi thiết bị!`);
    } catch (err: any) {
      setToastMessage(`⚠️ ${err?.message || 'Link nhạc không hợp lệ hoặc không hỗ trợ phát trực tiếp.'}`);
      setTimeout(() => setToastMessage(null), 5500);
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  /**
   * Thêm bài hát hoặc nguyên Danh sách phát (Playlist) từ YouTube
   * Hỗ trợ: link YouTube Playlist (?list=PL...), link Video YouTube, hoặc gõ tên bài hát
   */
  const detectedYtPlaylistId = extractYouTubePlaylistId(youtubeInput);

  const applyImportedTracks = async (
    incomingTracks: MusicTrack[],
    mode: 'append' | 'replace',
    noticeText: string
  ) => {
    if (incomingTracks.length === 0) return;

    let updatedPlaylist: MusicTrack[];
    let targetIdx: number;

    if (mode === 'replace') {
      updatedPlaylist = incomingTracks;
      targetIdx = 0;
    } else {
      const existingById = new Map(playlist.map((t) => [t.id, t]));
      const freshTracks = incomingTracks.filter((t) => !existingById.has(t.id));
      if (freshTracks.length === 0) {
        const firstExistingIdx = playlist.findIndex((t) => t.id === incomingTracks[0].id);
        updatedPlaylist = playlist;
        targetIdx = firstExistingIdx >= 0 ? firstExistingIdx : 0;
      } else {
        updatedPlaylist = [...freshTracks, ...playlist];
        targetIdx = 0;
      }
    }

    setPlaylist(updatedPlaylist);
    await savePlaylistBoth(updatedPlaylist);
    setPlaylistFilter('all');
    setCurrentTrackIndex(targetIdx);
    setShowPlaylistModal(false);
    playTrackDirect(updatedPlaylist[targetIdx], true);
    showNotice(noticeText);
  };

  const handleLoadCuratedYouTubePlaylist = async (
    preset: CuratedYouTubePlaylist,
    mode: 'append' | 'replace'
  ) => {
    const label =
      mode === 'replace'
        ? `Đang phát danh sách YouTube "${preset.name}" (${preset.tracks.length} bài)!`
        : `Đã thêm ${preset.tracks.length} bài từ danh sách "${preset.name}"!`;
    await applyImportedTracks(preset.tracks, mode, label);
  };

  const handleAddYouTubeTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = youtubeInput.trim();
    if (!query) return;

    setIsYoutubeLoading(true);
    const playlistId = extractYouTubePlaylistId(query);
    setToastMessage(
      playlistId
        ? 'Đang trích xuất danh sách phát từ YouTube...'
        : 'Đang tìm & xử lý nhạc để phát mượt trên mọi máy...'
    );

    try {
      // Nếu người dùng dán link YouTube Playlist (?list=...)
      if (playlistId) {
        let importedTracks: MusicTrack[] = [];
        let importedTitle = youtubeCustomTitle.trim() || 'Danh sách phát YouTube';

        try {
          const response = await fetch('/api/youtube/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: query, limit: 25 })
          });
          const ct = response.headers.get('content-type') || '';
          if (response.ok && ct.includes('application/json')) {
            const data = await response.json();
            if (data?.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
              importedTracks = data.tracks;
              if (!youtubeCustomTitle.trim() && data.playlistTitle) {
                importedTitle = data.playlistTitle;
              }
            }
          }
        } catch {
          // Fallback client-side native YouTube Playlist track
        }

        if (importedTracks.length === 0) {
          const seedVideoId = extractYouTubeId(query);
          importedTracks = [
            {
              id: `ytpl-${playlistId}`,
              title: importedTitle,
              artist: 'Danh sách phát YouTube',
              mood: 'YouTube Playlist',
              url: `https://www.youtube.com/playlist?list=${playlistId}`,
              thumbnail: seedVideoId ? `https://i.ytimg.com/vi/${seedVideoId}/hqdefault.jpg` : undefined,
              isYouTube: true,
              youtubePlaylistId: playlistId,
              playlistName: importedTitle
            }
          ];
        }

        setYoutubeInput('');
        setYoutubeCustomTitle('');
        const notice =
          importedTracks.length > 1
            ? `Đã nạp ${importedTracks.length} bài từ danh sách phát "${importedTitle}"!`
            : `Đã thêm danh sách phát YouTube "${importedTitle}"!`;
        await applyImportedTracks(importedTracks, youtubeImportMode, notice);
        return;
      }

      const { song: newSong, note } = await resolveAnyMusicInput(query, youtubeCustomTitle);

      // Kiểm tra nếu bài hát đã có trong playlist
      const existingIdx = playlist.findIndex((t) => t.id === newSong.id);
      let updatedPlaylist: MusicTrack[];
      let targetIdx: number;

      if (existingIdx !== -1) {
        updatedPlaylist = [...playlist];
        updatedPlaylist[existingIdx] = newSong;
        targetIdx = existingIdx;
      } else {
        updatedPlaylist = [newSong, ...playlist];
        targetIdx = 0;
      }

      setPlaylist(updatedPlaylist);
      await savePlaylistBoth(updatedPlaylist);

      setYoutubeInput('');
      setYoutubeCustomTitle('');
      setCurrentTrackIndex(targetIdx);
      setShowPlaylistModal(false);
      playTrackDirect(newSong, true);

      showNotice(note ? note : `Đã thêm "${newSong.title}" & đồng bộ trên mọi thiết bị!`);
    } catch (err: any) {
      console.warn('Lỗi thêm nhạc:', err);
      setToastMessage(err.message || 'Không thể thêm bài hát. Bạn vui lòng kiểm tra lại link nhé!');
      setTimeout(() => setToastMessage(null), 5500);
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

    const removedTrack = playlist[trackIndex];
    const updated = playlist.filter((t) => t.id !== trackId);
    setPlaylist(updated);
    await savePlaylistBoth(updated);
    if (removedTrack?.url && isCloudMediaUrl(removedTrack.url)) {
      deleteCloudMedia(removedTrack.url).catch(() => {});
    }
    if (removedTrack?.url && isLocalAudioUrl(removedTrack.url)) {
      deleteLocalAudioFile(removedTrack.url).catch(() => {});
    }

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

  // Thêm hoặc phát ngay 1 bài từ kho V-Pop nổi tiếng
  const handleSelectOrAddVpopTrack = async (vpopTrack: MusicTrack) => {
    const existingIdx = playlist.findIndex((t) => t.id === vpopTrack.id || t.url === vpopTrack.url);
    if (existingIdx !== -1) {
      consecutiveErrorsRef.current = 0;
      setCurrentTrackIndex(existingIdx);
      setShowPlaylistModal(false);
      playTrackDirect(playlist[existingIdx], true);
      return;
    }

    const updated = [vpopTrack, ...playlist];
    setPlaylist(updated);
    setCurrentTrackIndex(0);
    setShowPlaylistModal(false);
    playTrackDirect(vpopTrack, true);
    await savePlaylistBoth(updated);
    showNotice(`🔥 Đã thêm "${vpopTrack.title}" vào danh sách & đồng bộ mọi máy!`);
  };

  // Nạp toàn bộ 16 bài V-Pop nổi tiếng vào danh sách phát (không xóa bài tự thêm)
  const handleAddAllVpopTracks = async () => {
    const { tracks: merged, addedCount } = mergeVpopTracksIntoPlaylist(playlist);
    setPlaylist(merged);
    await savePlaylistBoth(merged);
    if (addedCount > 0) {
      showNotice(`🔥 Đã thêm ${addedCount} bài V-Pop nổi tiếng & đồng bộ mọi thiết bị!`, 3500);
    } else {
      showNotice(`✨ Danh sách của hai bạn đã có đủ cả ${VPOP_FEATURED_TRACKS.length} bài V-Pop rồi!`, 3000);
    }
  };

  // Thực hiện khôi phục danh sách bài hát V-Pop & Acoustic mặc định
  const confirmResetPlaylist = async () => {
    setPlaylist(DEFAULT_PLAYLIST);
    await savePlaylistBoth(DEFAULT_PLAYLIST);

    setCurrentTrackIndex(0);
    playTrackDirect(DEFAULT_PLAYLIST[0], isPlayingRef.current);

    setShowResetConfirm(false);
    showNotice(`✨ Đã khôi phục ${DEFAULT_PLAYLIST.length} bài hát V-Pop & Acoustic mặc định!`, 3000);
  };

  const handleAudioEnded = () => {
    handleNext(true);
  };

  // Đếm số bài theo từng nguồn để hiển thị trên thanh lọc danh sách phát
  const youtubeCount = playlist.filter((t) => Boolean(t.isYouTube) || String(t.id || '').startsWith('yt')).length;
  const uploadCount = playlist.filter((t) => isPersonalUploadTrack(t)).length;
  const presetCount = Math.max(0, playlist.length - youtubeCount - uploadCount);

  const filteredPlaylistEntries = playlist
    .map((track, idx) => ({ track, idx }))
    .filter(({ track }) => {
      if (playlistFilter === 'all') return true;
      const isYt = Boolean(track.isYouTube) || String(track.id || '').startsWith('yt');
      const isUp = isPersonalUploadTrack(track);
      if (playlistFilter === 'youtube') return isYt;
      if (playlistFilter === 'upload') return isUp;
      return !isYt && !isUp;
    });

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
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (Number.isFinite(t)) setCurrentTime(t);
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDuration(d);
        }}
        onWaiting={() => setIsBuffering(true)}
        onCanPlay={() => setIsBuffering(false)}
        onEnded={handleAudioEnded}
        onError={handleAudioError}
      />

      {/* Khung YouTube Mini hiển thị tương tác trực tiếp (nổi trên cả Chế Độ Đọc & Sổ Tay Kỷ Niệm) */}
      <div
        className={
          currentTrack?.isYouTube && showYtMiniPlayer
            ? 'fixed bottom-24 left-4 z-[65] w-[240px] rounded-2xl overflow-hidden shadow-2xl border-2 border-[#E8A598]/70 bg-black'
            : 'fixed bottom-0 right-0 w-[2px] h-[2px] opacity-[0.02] pointer-events-none overflow-hidden z-0'
        }
        aria-hidden={!(currentTrack?.isYouTube && showYtMiniPlayer)}
      >
        {currentTrack?.isYouTube && showYtMiniPlayer && (
          <div className="flex items-center justify-between px-2.5 py-1 bg-[#3D2E28] text-[#FFFDF9] text-[10px]">
            <span className="truncate font-medium flex items-center gap-1">
              <Youtube className="w-3 h-3 text-red-400 shrink-0" />
              <span className="truncate">Chạm ▶️ nếu điện thoại chưa tự phát</span>
            </span>
            <button
              type="button"
              onClick={() => setShowYtMiniPlayer(false)}
              className="p-0.5 text-white/70 hover:text-white cursor-pointer shrink-0"
              title="Thu gọn khung YouTube"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        {/* Container cố định không có con React để YouTube API gắn iframe an toàn (tránh lỗi trắng màn hình) */}
        <div ref={ytHostRef} className="w-full h-[135px]" />
      </div>

      {/* Floating Music Widget (Luôn nổi trên cả Chế Độ Đọc & Sổ Tay để nghe khi xem nhật ký) */}
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
        className={`fixed z-[65] select-none touch-none transition-shadow ${
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
                onClick={() => handleNext(false)}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all cursor-pointer"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowPlaylistModal(true)}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all cursor-pointer"
                title="Chọn danh sách YouTube hoặc tải nhạc MP3 cá nhân"
              >
                <ListMusic className="w-3.5 h-3.5 text-[#D98A76]" />
              </button>
            </div>
          </div>

          {/* Mở rộng: Thanh tua tiến độ, âm lượng, trộn bài & lặp lại */}
          {isExpanded && (
            <div className="px-3 pb-2.5 pt-2 border-t border-[#8C6D58]/10 space-y-2">
              {/* Thanh tua thời gian */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#8C6D58] tabular-nums w-8 text-right">
                  {formatTrackTime(currentTime)}
                </span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(1, Math.floor(duration || currentTrack?.duration || 0))}
                  step={1}
                  value={Math.min(
                    Math.floor(currentTime),
                    Math.max(1, Math.floor(duration || currentTrack?.duration || 0))
                  )}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  disabled={!duration && !currentTrack?.duration}
                  aria-label="Tua thời gian bài hát"
                  className="flex-1 accent-[#D98A76] h-1.5 bg-[#F3EAE0] rounded-lg cursor-pointer disabled:opacity-40"
                />
                <span className="text-[10px] text-[#8C6D58] tabular-nums w-8">
                  {formatTrackTime(duration || currentTrack?.duration)}
                </span>
              </div>

              {/* Âm lượng + Trộn bài + Lặp lại + Hiện video YouTube */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-[#8C6D58] hover:text-[#3D2E28] cursor-pointer"
                    title={isMuted ? 'Bật tiếng' : 'Tắt tiếng'}
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
                    aria-label="Chỉnh âm lượng"
                    className="w-20 accent-[#D98A76] h-1.5 bg-[#F3EAE0] rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] text-[#8C6D58] tabular-nums w-7">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsShuffle((prev) => !prev)}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      isShuffle
                        ? 'bg-[#E8A598]/25 text-[#D98A76]'
                        : 'text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0]'
                    }`}
                    title={isShuffle ? 'Đang bật phát ngẫu nhiên' : 'Phát ngẫu nhiên'}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepeatMode((prev) => (prev === 'all' ? 'one' : 'all'))}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${
                      repeatMode === 'one'
                        ? 'bg-[#E8A598]/25 text-[#D98A76]'
                        : 'text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0]'
                    }`}
                    title={repeatMode === 'one' ? 'Đang lặp lại 1 bài' : 'Đang lặp toàn bộ danh sách'}
                  >
                    {repeatMode === 'one' ? (
                      <Repeat1 className="w-3.5 h-3.5" />
                    ) : (
                      <Repeat className="w-3.5 h-3.5" />
                    )}
                  </button>
                  {currentTrack?.isYouTube && (
                    <button
                      type="button"
                      onClick={() => setShowYtMiniPlayer((prev) => !prev)}
                      className={`p-1 rounded-md transition-colors cursor-pointer ${
                        showYtMiniPlayer
                          ? 'bg-red-50 text-red-600'
                          : 'text-[#8C6D58] hover:text-red-600 hover:bg-[#F9F6F0]'
                      }`}
                      title={showYtMiniPlayer ? 'Ẩn khung video YouTube' : 'Hiện khung video YouTube'}
                    >
                      <Tv2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DANH SÁCH BÀI HÁT & TÙY CHỌN YOUTUBE / TẢI MP3 CÁ NHÂN */}
      {showPlaylistModal && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-6 max-w-lg w-full border border-[#8C6D58]/20 shadow-2xl relative my-4 max-h-[90vh] flex flex-col justify-between overflow-hidden">
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

            {/* Thanh lọc nguồn nhạc trong danh sách phát */}
            <div className="flex items-center gap-1 p-1 bg-[#F5EFE6] rounded-xl mb-2 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'Tất cả', count: playlist.length },
                  { id: 'youtube', label: 'YouTube', count: youtubeCount },
                  { id: 'upload', label: 'MP3 cá nhân', count: uploadCount },
                  { id: 'preset', label: 'Có sẵn', count: presetCount }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlaylistFilter(tab.id)}
                  className={`flex-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    playlistFilter === tab.id
                      ? 'bg-white text-[#3D2E28] shadow-xs font-semibold'
                      : 'text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  {tab.label} <span className="tabular-nums opacity-75">({tab.count})</span>
                </button>
              ))}
            </div>

            {/* Danh sách các bài hát có thể chọn */}
            <div className="space-y-1.5 overflow-y-auto max-h-[27vh] pr-1 py-1">
              {filteredPlaylistEntries.length === 0 ? (
                <div className="py-6 px-4 text-center rounded-xl border border-dashed border-[#8C6D58]/25 bg-[#FAF6F0]/60 space-y-2">
                  <p className="text-xs text-[#8C6D58]">
                    {playlistFilter === 'youtube'
                      ? 'Chưa có bài hát hay danh sách phát YouTube nào.'
                      : playlistFilter === 'upload'
                        ? 'Chưa có tệp âm thanh MP3 cá nhân nào được tải lên.'
                        : 'Danh sách mục này đang trống.'}
                  </p>
                  {playlistFilter === 'youtube' && (
                    <button
                      type="button"
                      onClick={() => setActiveAddTab('youtube')}
                      className="text-xs font-semibold text-red-600 hover:underline cursor-pointer"
                    >
                      Chọn danh sách phát YouTube ngay bên dưới
                    </button>
                  )}
                  {playlistFilter === 'upload' && (
                    <button
                      type="button"
                      onClick={() => setActiveAddTab('upload')}
                      className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Tải tệp MP3 từ máy lên ngay bên dưới
                    </button>
                  )}
                </div>
              ) : (
                filteredPlaylistEntries.map(({ track, idx }) => {
                  const isSelected = idx === currentTrackIndex;
                  const trackIdStr = String(track?.id || '');
                  const isYt = Boolean(track?.isYouTube) || trackIdStr.startsWith('yt');
                  const isUpload = isPersonalUploadTrack(track);
                  const isZing = Boolean(track?.isZing) || trackIdStr.startsWith('zing-');
                  const sourceLabel = isYt
                    ? track.youtubePlaylistId && !track.youtubeId
                      ? 'Playlist YouTube'
                      : 'YouTube'
                    : isUpload
                      ? 'MP3 cá nhân'
                      : isZing
                        ? 'V-Pop'
                        : 'Nhạc nền';

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
                              referrerPolicy="no-referrer"
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
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-[#D98A76] text-white'
                                : isUpload
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : isYt
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-[#F9F6F0] text-[#8C6D58]'
                            }`}
                          >
                            {isSelected && isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : isUpload ? (
                              <FileAudio className="w-4 h-4" />
                            ) : isYt ? (
                              <Youtube className="w-4 h-4" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#3D2E28] truncate">
                            {track.title}
                          </div>
                          <div className="text-[11px] text-[#8C6D58] truncate flex items-center gap-1.5">
                            <span className="truncate">{track.artist}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`shrink-0 ${
                                isYt
                                  ? 'text-red-600 font-medium'
                                  : isUpload
                                    ? 'text-emerald-700 font-medium'
                                    : 'text-[#8C6D58]'
                              }`}
                            >
                              {sourceLabel}
                            </span>
                            {track.duration ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums shrink-0">{formatTrackTime(track.duration)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
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
                })
              )}
            </div>

            {/* Thanh điều khiển phụ: Đếm bài hát & Khôi phục danh sách gốc */}
            <div className="flex items-center justify-between text-[11px] text-[#8C6D58] px-1 pt-2 pb-1 border-b border-[#8C6D58]/10">
              <span className="flex items-center gap-1.5">
                <span>
                  Đang có <strong className="text-[#3D2E28] tabular-nums">{playlist.length}</strong> bài hát
                </span>
                {isCloudSynced && (
                  <span title="Đã lưu vào bộ nhớ đám mây">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 text-[#D98A76] hover:text-[#C87D55] font-medium hover:underline transition-all cursor-pointer"
                title={`Khôi phục lại ${DEFAULT_PLAYLIST.length} bài hát V-Pop & Acoustic mặc định`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Khôi phục bài gốc</span>
              </button>
            </div>

            {/* PHẦN THÊM NHẠC: YOUTUBE (PLAYLIST & VIDEO) | TẢI MP3 CÁ NHÂN | KHO V-POP | LINK MP3 | ZING MP3 */}
            <div className="pt-3 border-t border-[#8C6D58]/10 mt-2">
              <div className="flex items-center gap-1 p-1 bg-[#F5EFE6] rounded-xl mb-2.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveAddTab('youtube')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeAddTab === 'youtube'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Youtube className="w-3.5 h-3.5" />
                  <span>YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('upload')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeAddTab === 'upload'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải MP3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('vpop')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeAddTab === 'vpop'
                      ? 'bg-[#D98A76] text-white shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>V-Pop ({VPOP_FEATURED_TRACKS.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('manual')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeAddTab === 'manual'
                      ? 'bg-[#D98A76] text-white shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link MP3</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('zing')}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeAddTab === 'zing'
                      ? 'bg-[#D98A76] text-white shadow-xs'
                      : 'text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Zing MP3</span>
                </button>
              </div>

              {activeAddTab === 'vpop' ? (
                /* TAB KHO NHẠC V-POP NỔI TIẾNG (MP3 CHÍNH CHỦ PHÁT MƯỢT 100% TRÊN IPHONE & WEB) */
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8A598]/40 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Tuyển tập {VPOP_FEATURED_TRACKS.length} bản hit V-Pop lãng mạn:</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleAddAllVpopTracks}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#E8A598] hover:bg-[#D98A76] text-white transition-all cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      + Nạp tất cả
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[156px] overflow-y-auto pr-1">
                    {VPOP_FEATURED_TRACKS.map((track) => {
                      const inPlaylist = playlist.some((t) => t.id === track.id || t.url === track.url);
                      return (
                        <div
                          key={track.id}
                          onClick={() => handleSelectOrAddVpopTrack(track)}
                          className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white hover:bg-[#FFF8F4] border border-[#8C6D58]/10 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {track.thumbnail ? (
                              <img
                                src={track.thumbnail}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-7 h-7 rounded-lg object-cover shrink-0 border border-[#8C6D58]/15"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-[#F9F6F0] flex items-center justify-center shrink-0">
                                <Music className="w-3.5 h-3.5 text-[#D98A76]" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-[#3D2E28] truncate">
                                {track.title}
                              </div>
                              <div className="text-[10px] text-[#8C6D58] truncate">
                                {track.artist}
                              </div>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold flex items-center gap-0.5 shrink-0 ${
                              inPlaylist ? 'text-emerald-700' : 'text-[#D98A76]'
                            }`}
                          >
                            {inPlaylist ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>Phát</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" />
                                <span>Thêm</span>
                              </>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeAddTab === 'upload' ? (
                /* TAB TẢI TỆP ÂM THANH (MP3 / M4A / WAV / OGG) CÁ NHÂN - HỖ TRỢ NHIỀU FILE & KÉO THẢ */
                <div className="bg-[#FAF7F2] p-3.5 rounded-2xl border border-emerald-200/80 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#3D2E28] flex items-center gap-1.5">
                      <FileAudio className="w-4 h-4 text-emerald-600" />
                      <span>Tải tệp âm thanh cá nhân (.MP3, .M4A, .WAV)</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium whitespace-nowrap">
                      Tối đa 25MB/file
                    </span>
                  </div>

                  {/* Tùy chỉnh tên bài & nghệ sĩ (tùy chọn) */}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Tên bài hát (tùy chọn)"
                      value={uploadCustomTitle}
                      onChange={(e) => setUploadCustomTitle(e.target.value)}
                      disabled={isAudioUploading}
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-emerald-500 focus:outline-hidden disabled:opacity-50"
                    />
                    <input
                      type="text"
                      placeholder="Ca sĩ / Ghi chú (tùy chọn)"
                      value={uploadCustomArtist}
                      onChange={(e) => setUploadCustomArtist(e.target.value)}
                      disabled={isAudioUploading}
                      className="px-2.5 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-emerald-500 focus:outline-hidden disabled:opacity-50"
                    />
                  </div>

                  {/* Vùng kéo thả / chọn nhiều file âm thanh */}
                  <label
                    htmlFor="music-file-upload-input"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOverUpload(true);
                    }}
                    onDragLeave={() => setIsDragOverUpload(false)}
                    onDrop={handleDropAudioFiles}
                    className={`flex flex-col items-center justify-center gap-1.5 w-full py-4 px-4 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
                      isAudioUploading
                        ? 'border-emerald-300 bg-emerald-50/70 text-emerald-800 pointer-events-none'
                        : isDragOverUpload
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 scale-[1.01]'
                          : 'border-emerald-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/40 text-[#3D2E28]'
                    }`}
                  >
                    {isAudioUploading && uploadProgress ? (
                      <div className="w-full space-y-1.5">
                        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="truncate max-w-[260px]">
                            Đang tải ({uploadProgress.current}/{uploadProgress.total}): {uploadProgress.fileName}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-emerald-200/70 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-600 transition-all duration-200 rounded-full"
                            style={{ width: `${Math.max(8, uploadProgress.percent)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-emerald-600" />
                        <span className="text-xs font-semibold">
                          Chọn hoặc kéo thả 1 hay nhiều file .MP3 / .M4A / .WAV
                        </span>
                        <span className="text-[11px] text-[#8C6D58]">
                          Tự động lưu & phát nền mượt mà ngay cả khi mở Chế Độ Đọc và Sổ Tay
                        </span>
                      </>
                    )}
                  </label>
                  <input
                    id="music-file-upload-input"
                    ref={audioFileInputRef}
                    type="file"
                    multiple
                    accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac"
                    onChange={handleUploadAudioFile}
                    className="sr-only"
                  />
                </div>
              ) : activeAddTab === 'youtube' ? (
                /* TAB YOUTUBE: NHẬP DANH SÁCH PHÁT (PLAYLIST) HOẶC VIDEO YOUTUBE & CHỌN DANH SÁCH GỢI Ý */
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-red-200/80 space-y-3">
                  <form onSubmit={handleAddYouTubeTrack} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#3D2E28] flex items-center gap-1.5">
                        <Youtube className="w-4 h-4 text-red-600" />
                        <span>Dán link Playlist / Video YouTube hoặc gõ tên bài</span>
                      </span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="youtube.com/playlist?list=... hoặc link video / tên bài hát..."
                        value={youtubeInput}
                        onChange={(e) => setYoutubeInput(e.target.value)}
                        disabled={isYoutubeLoading}
                        className="w-full pl-8 pr-28 py-2 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-red-500 focus:outline-hidden disabled:opacity-50"
                      />
                      <Search className="w-3.5 h-3.5 text-[#8C6D58] absolute left-2.5 top-2.5" />
                      <button
                        type="submit"
                        disabled={isYoutubeLoading || !youtubeInput.trim()}
                        className="absolute right-1 top-1 bottom-1 px-3 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
                      >
                        {isYoutubeLoading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang nạp...</span>
                          </>
                        ) : detectedYtPlaylistId ? (
                          <>
                            <ListPlus className="w-3.5 h-3.5" />
                            <span>Nạp Playlist</span>
                          </>
                        ) : (
                          <>
                            <Music className="w-3.5 h-3.5" />
                            <span>Thêm Nhạc</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Khi nhận diện link YouTube Playlist -> cho chọn Thêm vào hay Thay danh sách */}
                    {detectedYtPlaylistId ? (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-red-50/70 border border-red-200/70 text-[11px]">
                        <span className="text-red-800 font-medium">
                          Đã nhận diện Danh sách phát YouTube
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setYoutubeImportMode('append')}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              youtubeImportMode === 'append'
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-[#8C6D58] hover:text-[#3D2E28]'
                            }`}
                          >
                            Thêm vào list
                          </button>
                          <button
                            type="button"
                            onClick={() => setYoutubeImportMode('replace')}
                            className={`px-2 py-0.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                              youtubeImportMode === 'replace'
                                ? 'bg-red-600 text-white'
                                : 'bg-white text-[#8C6D58] hover:text-[#3D2E28]'
                            }`}
                          >
                            Phát riêng list này
                          </button>
                        </div>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder="Tên hiển thị (tùy chọn, để trống sẽ tự lấy tên bài)"
                        value={youtubeCustomTitle}
                        onChange={(e) => setYoutubeCustomTitle(e.target.value)}
                        disabled={isYoutubeLoading}
                        className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/15 focus:border-red-500 focus:outline-hidden"
                      />
                    )}
                  </form>

                  {/* Danh sách phát YouTube tuyển chọn sẵn cho lúc đọc nhật ký */}
                  <div className="pt-2 border-t border-[#8C6D58]/10 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-[#3D2E28]">
                      <span>Danh sách phát YouTube gợi ý khi xem nhật ký</span>
                      <span className="text-[#8C6D58] font-normal">Chọn nhanh 1 chạm</span>
                    </div>
                    <div className="space-y-1.5 max-h-[126px] overflow-y-auto pr-0.5">
                      {CURATED_YOUTUBE_PLAYLISTS.map((preset) => (
                        <div
                          key={preset.id}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-[#8C6D58]/12"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#3D2E28] truncate">
                              {preset.name}
                            </div>
                            <div className="text-[10px] text-[#8C6D58] truncate">
                              <span className="tabular-nums">{preset.tracks.length}</span> bài · {preset.subtitle}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleLoadCuratedYouTubePlaylist(preset, 'append')}
                              className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-[#FAF6F0] hover:bg-[#F3EAE0] text-[#3D2E28] border border-[#8C6D58]/15 transition-colors cursor-pointer whitespace-nowrap"
                              title={`Thêm ${preset.tracks.length} bài vào danh sách hiện tại`}
                            >
                              + Thêm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLoadCuratedYouTubePlaylist(preset, 'replace')}
                              className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer whitespace-nowrap"
                              title={`Chuyển sang phát danh sách "${preset.name}"`}
                            >
                              Phát list
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Gợi ý tìm nhanh bài lẻ */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                      <span className="text-[#8C6D58]">Tìm nhanh:</span>
                      {YOUTUBE_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            setYoutubeInput(preset.url);
                            setYoutubeCustomTitle('');
                          }}
                          className="text-red-700 hover:underline font-medium cursor-pointer"
                        >
                          {preset.name.split(' - ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : activeAddTab === 'manual' ? (
                /* TAB 2: NHẬP LINK NHẠC TRỰC TIẾP (MP3 / Google Drive / Dropbox / YouTube / Zing) */
                <form onSubmit={handleAddCustomTrack} className="space-y-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#8C6D58]/15">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <Link2 className="w-3.5 h-3.5 text-[#D98A76]" />
                      <span>Dán link MP3 / Google Drive / Dropbox / YouTube:</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded-sm">Tự nhận diện</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Tên bài hát (tùy chọn, để trống sẽ tự lấy tên)"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      required
                      placeholder="Dán link nhạc (.mp3, Google Drive, Dropbox, YouTube, Zing)..."
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      disabled={isYoutubeLoading || !customUrl.trim()}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isYoutubeLoading ? 'Đang thêm...' : 'Thêm'}
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
                      Danh sách sẽ được đặt lại về {DEFAULT_PLAYLIST.length} bài hát V-Pop & Acoustic mặc định trên tất cả các máy.
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

class MusicPlayerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[MusicPlayer] Đã chặn lỗi trình phát nhạc:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed bottom-6 left-4 z-[65]">
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#FFFDF9]/95 border border-[#E8A598]/60 shadow-lg text-xs text-[#3D2E28] cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#D98A76]" />
            <span>Tải lại trình phát nhạc</span>
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const MusicPlayer: React.FC = () => (
  <MusicPlayerErrorBoundary>
    <MusicPlayerInner />
  </MusicPlayerErrorBoundary>
);
