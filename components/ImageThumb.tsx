'use client';

import { X, Play } from 'lucide-react';
import { isVideoFile } from '@/lib/media';

// Thumbnail for a not-yet-uploaded local File (image or video). Purely
// presentational — the object URL is created/owned by the caller (see
// PendingMediaGrid), which lets it memoise one URL per File identity across
// a whole grid instead of every thumbnail managing (and possibly churning)
// its own.
export default function ImageThumb({
  file,
  url,
  onRemove,
  onOpen,
}: {
  file: File;
  url: string;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const isVideo = isVideoFile(file);

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-surface">
      <button
        type="button"
        onClick={onOpen}
        aria-label={isVideo ? 'Xem video' : 'Xem ảnh'}
        className="absolute inset-0 w-full h-full"
      >
        {url && (
          isVideo ? (
            <video
              src={url}
              muted
              playsInline
              preload="metadata"
              // iOS Safari can swallow taps on a <video> element itself
              // (routing them to native controls) instead of letting them
              // bubble to the wrapping button — this keeps the whole
              // thumbnail tappable.
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={file.name} className="w-full h-full object-cover" />
          )
        )}
        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <Play size={22} className="text-white" fill="white" />
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={(e) => {
          // The remove button sits inside the same relative container as
          // the "open viewer" button above — stop the click from also
          // triggering onOpen.
          e.stopPropagation();
          onRemove();
        }}
        aria-label={isVideo ? 'Xoá video' : 'Xoá ảnh'}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-overlay text-text-base flex items-center justify-center active:bg-black/80"
      >
        <X size={14} />
      </button>
    </div>
  );
}
