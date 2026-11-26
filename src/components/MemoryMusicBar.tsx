import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Loader2, ExternalLink, X, Youtube, Volume2 } from 'lucide-react';
import { MemoryMusic } from '../types';
import { MEMORY_MUSIC_PLAY_EVENT, notifyMemoryMusicPlaying } from '../utils/memoryMusic';
import { isCloudMediaUrl, getCachedCloudMediaUrl, resolveCloudMediaUrl } from '../services/cloudMedia';
import { isLocalAudioUrl, resolveLocalAudioUrl } from '../utils/localAudioStore';

interface MemoryMusicBarProps {
  music: MemoryMusic;
  playerId: string;
  compact?: boolean;
  onRemove?: () => void;
}

const formatSec = (sec: number): string => {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export const MemoryMusicBar: React.FC<MemoryMusicBarProps> = ({
  music,
  playerId,
  compact = false,
  onRemove
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const usedProxyRef = useRef(false);
  const activeUrlRef = useRef('');

  const isYouTube = Boolean(music.isYouTube && music.youtubeId);

  // Dừng phát nếu kỷ niệm khác hoặc nguồn nhạc khác bắt đầu phát
  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const custom = e as CustomEvent<{ playerId?: string }>;
      if (custom.detail?.playerId && custom.detail.playerId !== playerId) {
        if (audioRef.current && !audioRef.current.paused) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
        setIsLoading(false);
      }
    };

    window.addEventListener(MEMORY_MUSIC_PLAY_EVENT, handleOtherPlay);
    return () => {
      window.removeEventListener(MEMORY_MUSIC_PLAY_EVENT, handleOtherPlay);
    };
  }, [playerId]);

  // Reset khi đổi bài nhạc
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    activeUrlRef.current = '';
    usedProxyRef.current = false;
    setIsPlaying(false);
    setIsLoading(false);
    setErrorMsg(null);
    setCurrentTime(0);
    setDuration(0);
  }, [music.url, music.youtubeId]);

  // Dọn dẹp audio khi unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const stopEvent = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const handleTogglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setErrorMsg(null);

    if (isPlaying) {
      if (!isYouTube && audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setIsLoading(false);
      return;
    }

    notifyMemoryMusicPlaying(playerId);

    // YouTube: mở trình phát nhúng gọn có autoplay
    if (isYouTube && music.youtubeId) {
      setIsPlaying(true);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    setIsLoading(true);
    try {
      let playableUrl = activeUrlRef.current;

      if (!playableUrl) {
        if (isLocalAudioUrl(music.url)) {
          const resolved = await resolveLocalAudioUrl(music.url);
          if (!resolved) {
            throw new Error('File âm thanh cục bộ chỉ có trên thiết bị đã tải lên.');
          }
          playableUrl = resolved;
        } else if (isCloudMediaUrl(music.url)) {
          const cached = getCachedCloudMediaUrl(music.url);
          playableUrl = cached || (await resolveCloudMediaUrl(music.url));
        } else {
          playableUrl = music.url;
        }
        activeUrlRef.current = playableUrl;
        audio.src = playableUrl;
        audio.load();
      }

      await audio.play();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err: any) {
      // Nếu link ngoài bị chặn CORS -> tự động thử qua /api/audio/proxy
      if (
        !usedProxyRef.current &&
        /^https?:\/\//i.test(music.url) &&
        err?.name !== 'NotAllowedError'
      ) {
        usedProxyRef.current = true;
        const proxied = `/api/audio/proxy?url=${encodeURIComponent(music.url)}`;
        activeUrlRef.current = proxied;
        audio.src = proxied;
        audio.load();
        try {
          await audio.play();
          setIsPlaying(true);
          setIsLoading(false);
          return;
        } catch {
          // rơi xuống báo lỗi thân thiện bên dưới
        }
      }

      setIsPlaying(false);
      setIsLoading(false);
      setErrorMsg(
        err?.name === 'NotAllowedError'
          ? 'Chạm nút phát một lần nữa để nghe nhạc nhé!'
          : 'Không phát trực tiếp được link nhạc này.'
      );
    }
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      onClick={stopEvent}
      onPointerDown={stopEvent}
      className={`rounded-xl border transition-all ${
        isPlaying
          ? 'bg-[#FFF9F5] border-[#E8A598]/60 shadow-xs'
          : 'bg-[#FAF6F0]/90 border-[#8C6D58]/15 hover:border-[#E8A598]/45'
      } ${compact ? 'p-2.5' : 'p-3'}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Nút Phát / Tạm dừng */}
        <button
          type="button"
          onClick={handleTogglePlay}
          className={`shrink-0 rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
            compact ? 'w-8 h-8' : 'w-9 h-9'
          } ${
            isPlaying
              ? 'bg-[#D98A76] text-white shadow-sm'
              : 'bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs'
          }`}
          title={isPlaying ? 'Tạm dừng nhạc kỷ niệm' : 'Phát nhạc kỷ niệm'}
          aria-label={isPlaying ? 'Tạm dừng nhạc kỷ niệm' : 'Phát nhạc kỷ niệm'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-white" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
          )}
        </button>

        {/* Ảnh đại diện hoặc biểu tượng nốt nhạc */}
        {music.thumbnail && (
          <img
            src={music.thumbnail}
            alt={music.title}
            className="w-8 h-8 rounded-lg object-cover shrink-0 border border-[#8C6D58]/15"
            loading="lazy"
          />
        )}

        {/* Thông tin bài hát */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isYouTube ? (
              <Youtube className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            ) : (
              <Music className="w-3.5 h-3.5 text-[#D98A76] shrink-0" />
            )}
            <p className="text-xs font-semibold text-[#3D2E28] truncate leading-tight">
              {music.title}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#8C6D58] truncate mt-0.5">
            <span className="truncate">{music.artist || (isYouTube ? 'YouTube' : 'Nhạc theo link')}</span>
            {!isYouTube && duration > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums shrink-0">
                  {formatSec(currentTime)} / {formatSec(duration)}
                </span>
              </>
            )}
            {isPlaying && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-0.5 text-[#D98A76] font-medium shrink-0">
                  <Volume2 className="w-3 h-3" />
                  Đang phát
                </span>
              </>
            )}
          </div>
        </div>

        {/* Mở link gốc hoặc nút gỡ bỏ (trong form đăng kỷ niệm) */}
        <div className="flex items-center gap-1 shrink-0">
          {/^https?:\/\//i.test(music.url) && (
            <a
              href={music.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={stopEvent}
              className="p-1.5 text-[#8C6D58]/70 hover:text-[#3D2E28] hover:bg-white/80 rounded-lg transition-colors"
              title="Mở link bài hát gốc"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (audioRef.current) audioRef.current.pause();
                setIsPlaying(false);
                onRemove();
              }}
              className="p-1.5 text-[#8C6D58] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Gỡ nhạc khỏi kỷ niệm"
              aria-label="Gỡ nhạc khỏi kỷ niệm"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Thanh tiến độ cho file âm thanh trực tiếp */}
      {!isYouTube && (isPlaying || currentTime > 0) && duration > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration}
            step={0.5}
            value={Math.min(currentTime, duration)}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) {
                audioRef.current.currentTime = val;
              }
            }}
            className="w-full h-1 accent-[#D98A76] cursor-pointer"
            aria-label="Tua nhạc kỷ niệm"
          />
          <span className="sr-only">{Math.round(progressPercent)}%</span>
        </div>
      )}

      {/* Trình phát YouTube nhúng gọn khi bấm Phát */}
      {isYouTube && isPlaying && music.youtubeId && (
        <div className="mt-2.5 rounded-lg overflow-hidden border border-[#E8A598]/30 bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${music.youtubeId}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            title={music.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={`w-full border-0 ${compact ? 'h-36' : 'aspect-video max-h-48'}`}
          />
        </div>
      )}

      {/* Thông báo lỗi nếu link không phát được */}
      {errorMsg && (
        <p className="mt-1.5 text-[11px] text-rose-600 leading-snug">{errorMsg}</p>
      )}

      {/* Thẻ audio ẩn cho link MP3 / Zing MP3 / Drive / Cloud Media */}
      {!isYouTube && (
        <audio
          ref={audioRef}
          preload="none"
          playsInline
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime || 0);
          }}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onPause={() => {
            setIsPlaying(false);
          }}
          onPlay={() => {
            setIsPlaying(true);
            setIsLoading(false);
          }}
        />
      )}
    </div>
  );
};
