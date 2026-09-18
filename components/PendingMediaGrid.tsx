'use client';

import { useEffect, useState } from 'react';
import ImageThumb from './ImageThumb';
import ImageLightbox from './ImageLightbox';
import { isVideoFile } from '@/lib/media';

// Grid of not-yet-uploaded local File previews (photos/videos) that can be
// tapped to open in the fullscreen lightbox, with a per-thumbnail remove
// button. Owns the object URLs for the whole grid — instead of each
// ImageThumb managing its own — so they can be revoked correctly.
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

  // Builds one object URL per file (deduped so the same File object picked
  // twice doesn't leak a second URL) and revokes exactly the URLs this
  // invocation created, in its cleanup.
  //
  // Deliberately re-creates every URL whenever `files` changes, rather than
  // reusing URLs across renders for files that were already present. A
  // reuse-across-renders design needs a ref holding the "current" map so a
  // later effect invocation can read what an earlier one created — but
  // under React 18 StrictMode's dev-only setup -> cleanup -> setup replay,
  // the cleanup from the *first* setup revokes URLs that the ref still
  // points to, so the replayed setup reuses (and hands out) already-revoked
  // URLs. Keeping URL creation and its matching revocation inside the same
  // effect invocation with no shared mutable state sidesteps that entirely.
  // The tradeoff — every add/remove revokes and recreates blob URLs for
  // files that were already shown, not just the changed one — is cheap
  // here: these arrays are at most a few dozen local Files.
  useEffect(() => {
    const map = new Map<File, string>();
    for (const file of files) {
      map.set(file, map.get(file) ?? URL.createObjectURL(file));
    }
    setUrlMap(map);
    return () => {
      map.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  // If the file the lightbox is showing no longer exists (removed, or the
  // whole list was cleared), close it rather than silently reindexing onto
  // a different file or leaving stale state that could reopen unexpectedly
  // if files are picked again later.
  useEffect(() => {
    if (lightboxIndex >= files.length) {
      setLightboxIndex(-1);
    }
  }, [files.length, lightboxIndex]);

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
        open={lightboxIndex >= 0 && lightboxIndex < files.length}
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
