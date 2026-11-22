import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  isCloudMediaUrl,
  getCachedCloudMediaUrl,
  resolveCloudMediaUrl
} from '../services/cloudMedia';

interface SmartImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  fallbackClassName?: string;
}

/**
 * Component hiển thị ảnh hỗ trợ cả URL thông thường, base64 và `cloud-media://` (lưu mảnh trên Cloud Firestore + IndexedDB)
 * Tự động đọc đồng bộ từ bộ nhớ đệm để không bị nhấp nháy khi lướt album 10+ ảnh.
 */
export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackClassName,
  ...rest
}) => {
  const isCloud = isCloudMediaUrl(src);
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => {
    if (!isCloud) return src;
    return getCachedCloudMediaUrl(src) || '';
  });
  const [loading, setLoading] = useState<boolean>(() => isCloud && !getCachedCloudMediaUrl(src));

  useEffect(() => {
    let cancelled = false;
    if (!isCloud) {
      setResolvedSrc(src);
      setLoading(false);
      return;
    }

    const syncHit = getCachedCloudMediaUrl(src);
    if (syncHit) {
      setResolvedSrc(syncHit);
      setLoading(false);
      return;
    }

    setLoading(true);
    setResolvedSrc('');
    resolveCloudMediaUrl(src)
      .then((blobUrl) => {
        if (!cancelled) {
          setResolvedSrc(blobUrl);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src, isCloud]);

  if (loading || (isCloud && !resolvedSrc)) {
    return (
      <div
        className={
          fallbackClassName ||
          `flex items-center justify-center bg-[#F9F6F0]/80 text-[#D98A76] ${className}`
        }
      >
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return <img src={resolvedSrc} alt={alt} className={className} {...rest} />;
};
