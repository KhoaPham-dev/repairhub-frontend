'use client';

import { useEffect, useState } from 'react';
import { X, Play } from 'lucide-react';
import { isVideoFile } from '@/lib/media';

// Thumbnail for a not-yet-uploaded local File (image or video). Uses
// URL.createObjectURL and revokes on unmount/file-change to avoid leaking
// blob memory.
export default function ImageThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>('');
  const isVideo = isVideoFile(file);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-surface">
      {url && (
        isVideo ? (
          <>
            <video src={url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
              <Play size={22} className="text-white" fill="white" />
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="w-full h-full object-cover" />
        )
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label={isVideo ? 'Xoá video' : 'Xoá ảnh'}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-overlay text-text-base flex items-center justify-center active:bg-black/80"
      >
        <X size={14} />
      </button>
    </div>
  );
}
