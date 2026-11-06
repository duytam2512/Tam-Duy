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
  Youtube
} from 'lucide-react';
import { MusicTrack, DEFAULT_PLAYLIST } from '../types';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export const MusicPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<MusicTrack[]>(() => {
    try {
      const stored = localStorage.getItem('goc_nho_playlist');
      return stored ? JSON.parse(stored) : DEFAULT_PLAYLIST;
    } catch {
      return DEFAULT_PLAYLIST;
    }
  });

  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.65);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // In-app confirmation states (tránh window.confirm / window.alert bị block trong iframe)
  const [trackToDelete, setTrackToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Tab thêm nhạc: Zing MP3 | YouTube | Thủ công
  const [activeAddTab, setActiveAddTab] = useState<'zing' | 'youtube' | 'manual'>('youtube');

  // Zing MP3 Downloader state
  const [zingInput, setZingInput] = useState('');
  const [isZingLoading, setIsZingLoading] = useState(false);

  // YouTube Music state
  const [youtubeInput, setYoutubeInput] = useState('');
  const [isYoutubeLoading, setIsYoutubeLoading] = useState(false);

  // Custom song input
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [isYtReady, setIsYtReady] = useState(false);

  const currentTrack = playlist[currentTrackIndex] || playlist[0];

  // Khởi tạo YouTube IFrame API
  useEffect(() => {
    const initYT = () => {
      if (window.YT && window.YT.Player) {
        if (!ytPlayerRef.current) {
          try {
            ytPlayerRef.current = new window.YT.Player('yt-player-target', {
              height: '200',
              width: '200',
              playerVars: {
                playsinline: 1,
                controls: 0,
                disablekb: 1,
                modestbranding: 1,
                rel: 0
              },
              events: {
                onReady: () => {
                  setIsYtReady(true);
                  if (ytPlayerRef.current?.setVolume) {
                    ytPlayerRef.current.setVolume(isMuted ? 0 : Math.round(volume * 100));
                  }
                },
                onStateChange: (event: any) => {
                  // YT.PlayerState.ENDED = 0
                  if (event.data === 0) {
                    handleNext();
                  } else if (event.data === 1) {
                    setIsPlaying(true);
                  } else if (event.data === 2) {
                    setIsPlaying(false);
                  }
                }
              }
            });
          } catch (e) {
            console.error('Lỗi tạo YouTube Player:', e);
          }
        }
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      window.onYouTubeIframeAPIReady = () => {
        initYT();
      };
      document.body.appendChild(tag);
    } else {
      initYT();
    }

    return () => {
      // Dọn dẹp nếu cần
    };
  }, []);

  // Đồng bộ âm lượng cho cả HTML Audio và YouTube Player
  useEffect(() => {
    const effectiveVolume = isMuted ? 0 : volume;
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(Math.round(effectiveVolume * 100));
      } catch (err) {
        console.warn('Lỗi đặt âm lượng YouTube:', err);
      }
    }
  }, [volume, isMuted]);

  // Đổi bài hát
  useEffect(() => {
    if (!currentTrack) return;

    if (currentTrack.isYouTube && currentTrack.youtubeId) {
      // Dừng audio thường nếu đang phát
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Phát trên YouTube Player
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
        try {
          if (isPlaying) {
            ytPlayerRef.current.loadVideoById(currentTrack.youtubeId);
          } else {
            ytPlayerRef.current.cueVideoById(currentTrack.youtubeId);
          }
        } catch (err) {
          console.warn('Lỗi nạp video YouTube:', err);
        }
      }
    } else {
      // Dừng YouTube nếu đang phát
      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        try {
          ytPlayerRef.current.pauseVideo();
        } catch (err) {
          console.warn('Lỗi dừng YouTube:', err);
        }
      }

      // Phát trên HTML5 Audio
      if (audioRef.current) {
        audioRef.current.src = currentTrack.url;
        if (isPlaying) {
          audioRef.current.play().catch((err) => {
            console.log('Autoplay chờ tương tác người dùng:', err);
            setIsPlaying(false);
          });
        }
      }
    }
  }, [currentTrackIndex, isYtReady]);

  const togglePlay = () => {
    if (currentTrack?.isYouTube && currentTrack.youtubeId) {
      if (!ytPlayerRef.current || typeof ytPlayerRef.current.playVideo !== 'function') return;

      if (isPlaying) {
        ytPlayerRef.current.pauseVideo();
        setIsPlaying(false);
      } else {
        if (audioRef.current) audioRef.current.pause();
        ytPlayerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else {
      if (!audioRef.current) return;

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
          ytPlayerRef.current.pauseVideo();
        }
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.error('Không thể phát nhạc:', err);
        });
      }
    }
  };

  const handleNext = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const handlePrev = useCallback(() => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  }, [playlist.length]);

  const handleSelectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setShowPlaylistModal(false);
  };

  // Thêm nhạc từ link MP3 thủ công
  const handleAddCustomTrack = (e: React.FormEvent) => {
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
    try {
      localStorage.setItem('goc_nho_playlist', JSON.stringify(updated));
    } catch (err) {
      console.error('Lỗi lưu playlist:', err);
    }

    setCustomTitle('');
    setCustomUrl('');
    setCurrentTrackIndex(updated.length - 1);
    setIsPlaying(true);
    setToastMessage(`Đã thêm bài hát "${newTrack.title}" vào danh sách phát!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Thêm nhạc từ link hoặc tìm kiếm YouTube
  const handleAddYouTubeTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = youtubeInput.trim();
    if (!query) return;

    setIsYoutubeLoading(true);
    setToastMessage('Đang kết nối YouTube và phân tích thông tin bài hát...');

    try {
      const response = await fetch('/api/youtube/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không tìm thấy video YouTube phù hợp');
      }

      const newSong: MusicTrack = data.song;

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
      try {
        localStorage.setItem('goc_nho_playlist', JSON.stringify(updatedPlaylist));
      } catch (err) {
        console.error('Lỗi lưu playlist sau khi thêm bài từ YouTube:', err);
      }

      setYoutubeInput('');
      setCurrentTrackIndex(targetIdx);
      setIsPlaying(true);

      // Nếu YouTube Player đã sẵn sàng, load và phát luôn
      if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function' && newSong.youtubeId) {
        if (audioRef.current) audioRef.current.pause();
        ytPlayerRef.current.loadVideoById(newSong.youtubeId);
      }

      setToastMessage(`🎉 Đã thêm bài hát YouTube "${newSong.title}" thành công!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Lỗi thêm nhạc YouTube:', err);
      setToastMessage(`⚠️ ${err.message || 'Không thể lấy bài hát từ YouTube. Vui lòng kiểm tra lại link!'}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsYoutubeLoading(false);
    }
  };

  // Tự động tải nhạc từ link Zing MP3 về website thành bài của tôi
  const handleDownloadFromZing = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = zingInput.trim();
    if (!query) return;

    setIsZingLoading(true);
    setToastMessage('Đang kết nối Zing MP3 và tự động tải bài hát về website...');

    try {
      const response = await fetch('/api/zingmp3/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: query })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Không thể tải bài hát từ Zing MP3');
      }

      const newSong: MusicTrack = data.song;

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
      try {
        localStorage.setItem('goc_nho_playlist', JSON.stringify(updatedPlaylist));
      } catch (err) {
        console.error('Lỗi lưu playlist sau khi tải Zing MP3:', err);
      }

      setZingInput('');
      setCurrentTrackIndex(targetIdx);
      setIsPlaying(true);

      if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
        ytPlayerRef.current.pauseVideo();
      }

      if (audioRef.current) {
        audioRef.current.src = newSong.url;
        audioRef.current.play().catch(() => setIsPlaying(false));
      }

      setToastMessage(`🎉 Đã tải thành công "${newSong.title}" - ${newSong.artist} về bài của tôi!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Lỗi tải Zing MP3:', err);
      setToastMessage(`⚠️ ${err.message || 'Không thể tải bài hát từ Zing MP3. Vui lòng kiểm tra lại link hoặc thử bài khác!'}`);
      setTimeout(() => setToastMessage(null), 5000);
    } finally {
      setIsZingLoading(false);
    }
  };

  // Mở hộp thoại xác nhận xóa bài hát (In-app popup, không dùng window.confirm)
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
  const confirmDeleteTrack = () => {
    if (!trackToDelete) return;

    const { id: trackId, title: trackTitle } = trackToDelete;
    const trackIndex = playlist.findIndex((t) => t.id === trackId);
    if (trackIndex === -1) {
      setTrackToDelete(null);
      return;
    }

    const updated = playlist.filter((t) => t.id !== trackId);
    setPlaylist(updated);

    try {
      localStorage.setItem('goc_nho_playlist', JSON.stringify(updated));
    } catch (err) {
      console.error('Lỗi lưu playlist sau khi xóa:', err);
    }

    // Nếu bài đang phát bị xóa
    if (trackIndex === currentTrackIndex) {
      const nextIdx = trackIndex >= updated.length ? 0 : trackIndex;
      setCurrentTrackIndex(nextIdx);

      const nextTrack = updated[nextIdx];
      if (nextTrack) {
        if (nextTrack.isYouTube && nextTrack.youtubeId) {
          if (audioRef.current) audioRef.current.pause();
          if (ytPlayerRef.current && typeof ytPlayerRef.current.loadVideoById === 'function') {
            if (isPlaying) ytPlayerRef.current.loadVideoById(nextTrack.youtubeId);
            else ytPlayerRef.current.cueVideoById(nextTrack.youtubeId);
          }
        } else {
          if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
            ytPlayerRef.current.pauseVideo();
          }
          if (audioRef.current) {
            audioRef.current.src = nextTrack.url;
            if (isPlaying) {
              audioRef.current.play().catch(() => setIsPlaying(false));
            }
          }
        }
      }
    } else if (trackIndex < currentTrackIndex) {
      setCurrentTrackIndex((prev) => prev - 1);
    }

    setTrackToDelete(null);
    setToastMessage(`🗑️ Đã xóa bài hát "${trackTitle}" thành công!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Thực hiện khôi phục 6 bài hát gốc ban đầu
  const confirmResetPlaylist = () => {
    setPlaylist(DEFAULT_PLAYLIST);
    try {
      localStorage.setItem('goc_nho_playlist', JSON.stringify(DEFAULT_PLAYLIST));
    } catch (err) {
      console.error('Lỗi khôi phục playlist:', err);
    }

    if (ytPlayerRef.current && typeof ytPlayerRef.current.pauseVideo === 'function') {
      ytPlayerRef.current.pauseVideo();
    }

    setCurrentTrackIndex(0);
    if (audioRef.current) {
      audioRef.current.src = DEFAULT_PLAYLIST[0].url;
      if (isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }

    setShowResetConfirm(false);
    setToastMessage('✨ Đã khôi phục 6 bài hát gốc mặc định!');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  return (
    <>
      {/* HTML5 Audio Player cho nhạc MP3 cục bộ & Zing MP3 */}
      <audio
        ref={audioRef}
        src={currentTrack?.isYouTube ? undefined : currentTrack?.url}
        onEnded={handleAudioEnded}
        onError={() => {
          console.warn('Lỗi tải bài hát, tự động chuyển bài tiếp theo');
        }}
      />

      {/* Hidden YouTube Player Target */}
      <div
        className="fixed -left-[9999px] -top-[9999px] w-[200px] h-[200px] pointer-events-none opacity-0 overflow-hidden"
        aria-hidden="true"
      >
        <div id="yt-player-target" />
      </div>

      {/* Floating Music Widget (Góc dưới bên trái màn hình) */}
      <div className="fixed bottom-6 left-6 z-40 select-none">
        <div className="bg-[#FFFDF9]/95 backdrop-blur-md rounded-2xl border border-[#8C6D58]/20 shadow-xl transition-all duration-300 overflow-hidden">
          {/* Thanh Player Compact */}
          <div className="p-2 sm:p-2.5 flex items-center gap-2.5">
            {/* Đĩa than quay khi phát nhạc (hiển thị ảnh bìa nếu có) */}
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
              onClick={() => setIsExpanded(!isExpanded)}
              className="cursor-pointer max-w-[130px] sm:max-w-[170px]"
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
                  <span className="text-[#FF0000] font-medium">● YouTube:</span>
                )}
                <span>{currentTrack?.artist}</span>
              </span>
            </div>

            {/* Nút thao tác nhanh */}
            <div className="flex items-center gap-1 border-l border-[#8C6D58]/15 pl-2">
              <button
                onClick={handlePrev}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all"
                title="Bài trước"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={togglePlay}
                className="p-1.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                title={isPlaying ? 'Tạm dừng' : 'Phát'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                )}
              </button>

              <button
                onClick={handleNext}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all"
                title="Bài tiếp theo"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowPlaylistModal(true)}
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all cursor-pointer"
                title="Danh sách bài hát"
              >
                <ListMusic className="w-3.5 h-3.5 text-[#D98A76]" />
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
          <div className="bg-[#FFFDF9] rounded-3xl p-5 sm:p-7 max-w-md w-full border border-[#8C6D58]/20 shadow-2xl relative my-6 max-h-[85vh] flex flex-col justify-between">
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

              <h3 className="font-serif-romantic text-2xl font-bold text-[#3D2E28]">
                Chọn Nhạc Nền Góc Nhỏ
              </h3>
              <p className="text-xs text-[#8C6D58] mb-3">
                Thay đổi giai điệu, thêm nhạc từ YouTube, Zing MP3 hoặc file riêng của hai bạn
              </p>

              {/* Thông báo thao tác (Toast) */}
              {toastMessage && (
                <div className="mb-3 px-3 py-1.5 rounded-xl bg-[#E8A598]/20 border border-[#D98A76]/40 text-xs text-[#D98A76] font-medium flex items-center gap-1.5 animate-fadeIn">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{toastMessage}</span>
                </div>
              )}
            </div>

            {/* Danh sách các bài hát có thể chọn */}
            <div className="space-y-1.5 overflow-y-auto max-h-[36vh] pr-1 py-1">
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
              <span>Đang có <strong className="text-[#3D2E28]">{playlist.length}</strong> bài hát</span>
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

            {/* PHẦN THÊM BÀI HÁT: YOUTUBE | ZING MP3 | LINK THỦ CÔNG */}
            <div className="pt-3 border-t border-[#8C6D58]/10 mt-2">
              <div className="flex flex-wrap items-center gap-1.5 mb-2">
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
                  <span>Link YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveAddTab('zing')}
                  className={`text-xs px-2.5 py-1 rounded-full font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    activeAddTab === 'zing'
                      ? 'bg-gradient-to-r from-[#D98A76] to-[#C87D55] text-white shadow-2xs'
                      : 'bg-[#F9F6F0] text-[#8C6D58] hover:text-[#3D2E28]'
                  }`}
                >
                  <Download className="w-3 h-3" />
                  <span>Zing MP3</span>
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
                  <span>MP3 thủ công</span>
                </button>
              </div>

              {activeAddTab === 'youtube' ? (
                /* TAB 1: THÊM NHẠC TỪ LINK YOUTUBE */
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-red-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <Youtube className="w-3.5 h-3.5 text-red-600" />
                      <span>Dán link YouTube hoặc tên bài hát:</span>
                    </span>
                    <span className="text-[10px] text-red-600 font-medium">Hỗ trợ mọi video</span>
                  </div>

                  <form onSubmit={handleAddYouTubeTrack} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Dán link (https://youtube.com/watch?v=... hoặc youtu.be/...) hoặc tên bài..."
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
                            <span>Đang tìm...</span>
                          </>
                        ) : (
                          <>
                            <Youtube className="w-3.5 h-3.5" />
                            <span>Thêm Nhạc</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Gợi ý nhanh các bài hát YouTube lãng mạn */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-[#8C6D58]">Gợi ý:</span>
                      {[
                        'Nàng Thơ - Hoàng Dũng',
                        'Ngày Đầu Tiên - Đức Phúc',
                        'Ánh Nắng Của Anh',
                        'Hẹn Một Mai',
                        'Cơn Mưa Tình Yêu'
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setYoutubeInput(s)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white hover:bg-red-50 text-red-600 border border-red-200 transition-all cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </form>
                </div>
              ) : activeAddTab === 'zing' ? (
                /* TAB 2: TẢI NHẠC TỰ ĐỘNG TỪ ZING MP3 */
                <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#C87D55]/20">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-semibold text-[#3D2E28] flex items-center gap-1">
                      <span>Dán link Zing MP3 hoặc tên bài hát:</span>
                    </span>
                    <span className="text-[10px] text-[#8C6D58]">Tự động tải về website</span>
                  </div>

                  <form onSubmit={handleDownloadFromZing} className="space-y-2">
                    <div className="relative">
                      <input
                        type="text"
                        required
                        placeholder="Dán link bài hát (https://zingmp3.vn/bai-hat/...) hoặc tên bài hát..."
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

                    {/* Gợi ý nhanh các bài hát Zing MP3 lãng mạn */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-[#8C6D58]">Thử nhanh:</span>
                      {[
                        'Nàng Thơ - Hoàng Dũng',
                        'Chỉ Là Không Cùng Nhau',
                        'Ngày Đầu Tiên - Đức Phúc',
                        'Có Em Chờ'
                      ].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setZingInput(s)}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white hover:bg-[#F9F6F0] text-[#D98A76] border border-[#D98A76]/25 transition-all cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </form>
                </div>
              ) : (
                /* TAB 3: NHẬP LINK MP3 THỦ CÔNG */
                <form onSubmit={handleAddCustomTrack} className="space-y-2 bg-[#FAF7F2] p-3 rounded-2xl border border-[#8C6D58]/15">
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
              )}
            </div>

            {/* HỘP THOẠI XÁC NHẬN XÓA BÀI HÁT (IN-APP DIALOG - KHÔNG BỊ TRÌNH DUYỆT / IFRAME CHẶN) */}
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
                      Bạn có chắc muốn xóa <strong className="text-[#3D2E28]">"{trackToDelete.title}"</strong> khỏi danh sách bài của hai bạn không?
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
                      Danh sách sẽ được đặt lại về 6 giai điệu lãng mạn mặc định ban đầu của Góc Nhỏ Bình Yên.
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
