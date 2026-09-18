'use client';

import { useEffect, useRef, useState } from 'react';
import ImageThumb from './ImageThumb';
import ImageLightbox from './ImageLightbox';
import { isVideoFile } from '@/lib/media';

// Grid of not-yet-uploaded local File previews (photos/videos) that can be
// tapped to open in the fullscreen lightbox, with a per-thumbnail remove
// button. Owns the object URLs for the whole grid — memoised per File
// identity so add/remove doesn't churn or leak blob URLs — instead of each
// ImageThumb managing its own.
export default function PendingMediaGrid({
  files,
  onRemove,
  className = 'mt-3 grid grid-cols-3 gap-2',
}: {
  files: File[];
  onRemove: (index: number) => void;
  className?: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [urlMap, setUrlMap] = useState<Map<File, string>>(new Map());
  // Mirrors urlMap synchronously so the unmount-cleanup effect (which must
  // run only once, with an empty dep array) can always see the latest URLs.
  const urlMapRef = useRef(urlMap);

  useEffect(() => {
    const prev = urlMapRef.current;
    const next = new Map<File, string>();
    for (const file of files) {
      next.set(file, prev.get(file) ?? URL.createObjectURL(file));
    }
    // Revoke URLs for files that are no longer present (removed, or
    // replaced by a re-pick of the same name/size).
    prev.forEach((url, file) => {
      if (!next.has(file)) URL.revokeObjectURL(url);
    });
    urlMapRef.current = next;
    setUrlMap(next);
  }, [files]);

  // Revoke every remaining URL on unmount.
  useEffect(() => {
    return () => {
      urlMapRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  if (files.length === 0) return null;

  return (
    <>
      <div className={className}>
        {files.map((file, i) => (
          <ImageThumb
            key={`${file.name}-${file.size}-${i}`}
            file={file}
            url={urlMap.get(file) ?? ''}
            onOpen={() => setLightboxIndex(i)}
            onRemove={() => onRemove(i)}
          />
        ))}
      </div>
      <ImageLightbox
        open={lightboxIndex >= 0}
        index={Math.max(0, lightboxIndex)}
        onClose={() => setLightboxIndex(-1)}
        onIndexChange={(i) => setLightboxIndex(i)}
        showDownload={false}
        images={files.map((file) => ({
          src: urlMap.get(file) ?? '',
          alt: file.name,
          isVideo: isVideoFile(file),
        }))}
      />
    </>
  );
}
