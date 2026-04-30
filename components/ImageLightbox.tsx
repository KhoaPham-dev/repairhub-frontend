'use client';

import Lightbox from 'yet-another-react-lightbox';
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
}

// Reusable fullscreen image viewer with pinch-to-zoom + download button.
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
  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={images.map((img) => ({
        src: img.src,
        alt: img.alt,
        download: img.downloadFilename
          ? { url: img.src, filename: img.downloadFilename }
          : img.src,
      }))}
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
    />
  );
}
