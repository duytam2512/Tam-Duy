import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { getVideoEmbedInfo } from '../services/storage';
import { isCloudMediaUrl, resolveCloudMediaUrl } from '../services/cloudMedia';

interface SmartVideoPlayerProps {
  videoUrl: string;
  poster?: string;
  title?: string;
  className?: string;
  iframeClassName?: string;
  autoPlay?: boolean;
}

export const SmartVideoPlayer: React.FC<SmartVideoPlayerProps> = ({
  videoUrl,
  poster,
  title = 'Video kỷ niệm',
  className = 'w-full h-full object-contain bg-black',
  iframeClassName = 'w-full h-full bg-black',
  autoPlay = false
}) => {
  const videoInfo = getVideoEmbedInfo(videoUrl);
  const isCloud = videoInfo.kind === 'direct' && isCloudMediaUrl(videoInfo.src);

  const [resolvedSrc, setResolvedSrc] = useState<string>(() => (isCloud ? '' : videoInfo.src));
  const [loadProgress, setLoadProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setErrorMsg(null);

    if (!isCloud) {
      setResolvedSrc(videoInfo.src);
      return;
    }

    setResolvedSrc('');
    setLoadProgress(5);
    resolveCloudMediaUrl(videoInfo.src, (pct) => {
      if (!cancelled) setLoadProgress(pct);
    })
      .then((blobUrl) => {
        if (!cancelled) {
          setResolvedSrc(blobUrl);
          setLoadProgress(100);
        }
      })
      .catch((err: any) => {
        if (!cancelled) {
          setErrorMsg(err?.message || 'Không thể tải video từ đám mây.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [videoInfo.src, isCloud]);

  if (videoInfo.kind === 'iframe') {
    return (
      <iframe
        src={videoInfo.src}
        title={title}
        className={iframeClassName}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  if (errorMsg) {
    return (
      <div className="w-full h-full min-h-[220px] rounded-xl bg-black/80 text-white flex flex-col items-center justify-center p-4 text-center gap-2">
        <AlertCircle className="w-7 h-7 text-[#E8A598]" />
        <p className="text-xs text-white/85 max-w-xs">{errorMsg}</p>
      </div>
    );
  }

  if (isCloud && !resolvedSrc) {
    return (
      <div className="relative w-full h-full min-h-[220px] rounded-xl overflow-hidden bg-black flex items-center justify-center">
        {poster && (
          <img
            src={poster}
            alt={title}
            className="w-full h-full object-cover opacity-50 blur-[1px]"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 text-white px-4">
          <Loader2 className="w-7 h-7 animate-spin text-[#E8A598]" />
          <span className="text-xs font-medium">
            Đang tải video từ đám mây... {loadProgress > 0 ? `${loadProgress}%` : ''}
          </span>
        </div>
      </div>
    );
  }

  return (
    <video
      src={resolvedSrc}
      poster={poster}
      controls
      autoPlay={autoPlay}
      playsInline
      preload="metadata"
      className={className}
    />
  );
};
