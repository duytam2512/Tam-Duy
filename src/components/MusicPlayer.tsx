import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  ListMusic,
  ChevronUp,
  ChevronDown,
  Disc,
  Plus,
  Sparkles,
  X
} from 'lucide-react';
import { MusicTrack, DEFAULT_PLAYLIST } from '../types';

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

  // Custom song input
  const [customTitle, setCustomTitle] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);
  const currentTrack = playlist[currentTrackIndex] || playlist[0];

  // Đồng bộ âm lượng
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Đổi bài hát
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.src = currentTrack.url;
      if (isPlaying) {
        audioRef.current.play().catch((err) => {
          console.log('Autoplay chờ tương tác người dùng:', err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentTrackIndex]);

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Không thể phát nhạc:', err);
      });
    }
  };

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
  };

  const handleSelectTrack = (index: number) => {
    setCurrentTrackIndex(index);
    setIsPlaying(true);
    setShowPlaylistModal(false);
  };

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
  };

  const handleAudioEnded = () => {
    handleNext();
  };

  return (
    <>
      <audio
        ref={audioRef}
        src={currentTrack?.url}
        onEnded={handleAudioEnded}
        onError={() => {
          console.warn('Lỗi tải bài hát, tự động chuyển bài tiếp theo');
        }}
      />

      {/* Floating Music Widget (Góc dưới bên trái màn hình) */}
      <div className="fixed bottom-6 left-6 z-40 select-none">
        <div className="bg-[#FFFDF9]/95 backdrop-blur-md rounded-2xl border border-[#8C6D58]/20 shadow-xl transition-all duration-300 overflow-hidden">
          {/* Thanh Player Compact */}
          <div className="p-2 sm:p-2.5 flex items-center gap-2.5">
            {/* Đĩa than quay khi phát nhạc */}
            <button
              onClick={togglePlay}
              className="relative w-10 h-10 rounded-full bg-[#3D2E28] flex items-center justify-center shrink-0 shadow-md group cursor-pointer"
              title={isPlaying ? 'Tạm dừng nhạc' : 'Phát nhạc nền'}
            >
              <Disc
                className={`w-7 h-7 text-[#E8A598] transition-transform duration-1000 ${
                  isPlaying ? 'animate-spin' : ''
                }`}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
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
              <span className="text-[10px] text-[#8C6D58] truncate block">
                {currentTrack?.artist} • {currentTrack?.mood}
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
                className="p-1.5 rounded-full bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs transition-all active:scale-95"
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
                className="p-1 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-lg transition-all"
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
                className="text-[#8C6D58] hover:text-[#3D2E28]"
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
                  className="p-1.5 text-[#8C6D58] hover:text-[#3D2E28] hover:bg-[#F9F6F0] rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-serif-romantic text-2xl font-bold text-[#3D2E28]">
                Chọn Nhạc Nền Góc Nhỏ
              </h3>
              <p className="text-xs text-[#8C6D58] mb-4">
                Thay đổi giai điệu theo sở thích và tâm trạng của hai bạn
              </p>
            </div>

            {/* Danh sách các bài hát có thể chọn */}
            <div className="space-y-1.5 overflow-y-auto max-h-[38vh] pr-1 py-1">
              {playlist.map((track, idx) => {
                const isSelected = idx === currentTrackIndex;
                return (
                  <div
                    key={track.id}
                    onClick={() => handleSelectTrack(idx)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#E8A598]/15 border-[#D98A76] shadow-xs'
                        : 'bg-white hover:bg-[#FAF6F0] border-[#8C6D58]/15'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center ${
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
                      <div>
                        <div className="text-xs font-semibold text-[#3D2E28]">
                          {track.title}
                        </div>
                        <div className="text-[10px] text-[#8C6D58]">
                          {track.artist}
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FFFDF9] text-[#D98A76] border border-[#8C6D58]/10">
                      {track.mood}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Thêm bài hát riêng của hai bạn */}
            <div className="pt-3 border-t border-[#8C6D58]/10 mt-3">
              <span className="text-xs font-semibold text-[#8C6D58] block mb-1.5">
                + Thêm bài hát riêng của hai bạn (Link MP3/Audio)
              </span>
              <form onSubmit={handleAddCustomTrack} className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Tên bài hát (Ví dụ: Bài hát kỷ niệm của chúng mình)"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                />
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    required
                    placeholder="Dán link file nhạc .mp3 / .ogg..."
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white border border-[#8C6D58]/20 focus:border-[#E8A598] focus:outline-hidden"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#E8A598] hover:bg-[#D98A76] text-white shadow-xs"
                  >
                    Thêm
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
