'use client';

import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import type { SlideImage } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Download from 'yet-another-react-lightbox/plugins/download';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';

export interface LightboxImage {
  src: string;
  alt?: string;
  // Optional download filename — if absent the browser uses the URL's basename.
  downloadFilename?: string;
  // True for a video file (.mp4/.mov/.webm) — rendered as <video controls>
  // instead of an <img>.
  isVideo?: boolean;
}

type LightboxSlide = SlideImage & { isVideo?: boolean; downloadFilename?: string };

// Renders a single lightbox slide's content. Kept free of any
// yet-another-react-lightbox internals (it's just given src/alt/etc.) so it
// can be unit-tested directly — the library itself is ESM-only and mocked
// out entirely in jest tests.
export function LightboxMediaSlide({ src, alt, downloadFilename, isVideo }: LightboxImage) {
  const [videoFailed, setVideoFailed] = useState(false);

  if (isVideo && videoFailed) {
    return (
      <div className="flex flex-col items-center gap-3 text-text-base p-6">
        <p className="text-sm text-text-muted">Không thể phát video</p>
        <a href={src} download={downloadFilename} className="text-accent underline text-sm">
          Tải xuống video
        </a>
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        controls
        playsInline
        aria-label="Video đính kèm"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        onError={() => setVideoFailed(true)}
      >
        <source src={src} onError={() => setVideoFailed(true)} />
      </video>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} style={{ maxWidth: '100%', maxHeight: '100%' }} />;
}

// Reusable fullscreen image/video viewer with pinch-to-zoom (images) +
// native controls (video) + download button.
//
// Open at a specific index by setting `open=true` and `index=<n>`. To close,
// the parent passes onClose to set open=false. onIndexChange tracks swipes.
export default function ImageLightbox({
  images,
  open,
  index,
  onClose,
  onIndexChange,
}: {
  images: LightboxImage[];
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange?: (i: number) => void;
}) {
  const slides: LightboxSlide[] = images.map((img) => ({
    src: img.src,
    alt: img.alt,
    download: img.downloadFilename
      ? { url: img.src, filename: img.downloadFilename }
      : img.src,
    isVideo: img.isVideo,
    downloadFilename: img.downloadFilename,
  }));

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      on={{ view: ({ index: i }) => onIndexChange?.(i) }}
      plugins={[Zoom, Download, Counter]}
      // Tune zoom: comfortable defaults for mobile pinch + desktop scroll.
      zoom={{
        maxZoomPixelRatio: 4,
        zoomInMultiplier: 2,
        doubleTapDelay: 250,
        scrollToZoom: true,
      }}
      // Hide nav arrows when only one image is in the set.
      carousel={{ finite: images.length <= 1 }}
      controller={{ closeOnBackdropClick: true }}
      render={{
        slide: ({ slide }) => {
          const s = slide as LightboxSlide;
          if (!s.isVideo) return undefined; // fall back to the library's default image rendering
          return (
            <LightboxMediaSlide src={s.src} alt={s.alt} downloadFilename={s.downloadFilename} isVideo />
          );
        },
      }}
    />
  );
}
