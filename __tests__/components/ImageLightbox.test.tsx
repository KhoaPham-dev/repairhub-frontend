import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
// yet-another-react-lightbox itself is mocked to a no-op in jest (ESM-only
// package, see __tests__/__mocks__/yet-another-react-lightbox.ts), so the
// real <Lightbox> never renders in tests. LightboxMediaSlide is exported
// separately from ImageLightbox precisely so its video/image/fallback
// rendering can be unit-tested directly, independent of the mocked library.
import { LightboxMediaSlide } from '@/components/ImageLightbox';

describe('LightboxMediaSlide', () => {
  it('renders an <img> for a non-video slide', () => {
    const { container } = render(
      <LightboxMediaSlide src="https://x/photo.jpg" alt="photo" />
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://x/photo.jpg');
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('renders <video controls playsInline> for a video slide (e.g. .mp4)', () => {
    const { container } = render(
      <LightboxMediaSlide src="https://x/clip.mp4" isVideo />
    );
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('controls');
    expect(video).toHaveAttribute('playsinline');
    expect(container.querySelector('source')).toHaveAttribute('src', 'https://x/clip.mp4');
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('shows a download fallback link when the video fails to play', () => {
    const { container } = render(
      <LightboxMediaSlide src="https://x/clip.mp4" isVideo downloadFilename="clip.mp4" />
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    fireEvent.error(video);

    expect(container.querySelector('video')).not.toBeInTheDocument();
    const link = screen.getByText('Tải xuống video');
    expect(link).toHaveAttribute('href', 'https://x/clip.mp4');
    expect(link).toHaveAttribute('download', 'clip.mp4');
    expect(screen.getByText('Không thể phát video')).toBeInTheDocument();
  });
});
