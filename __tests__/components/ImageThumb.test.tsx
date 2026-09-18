import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageThumb from '@/components/ImageThumb';

describe('ImageThumb', () => {
  it('renders an <img> using the given url for an image file', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const { container } = render(
      <ImageThumb file={file} url="blob:photo" onOpen={() => {}} onRemove={() => {}} />
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:photo');
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('renders a <video> (muted, playsInline, pointer-events: none) with a play icon for a video file', () => {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    const { container } = render(
      <ImageThumb file={file} url="blob:clip" onOpen={() => {}} onRemove={() => {}} />
    );
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    expect(video).toHaveAttribute('src', 'blob:clip');
    // React sets `muted` as a DOM property (not a reflected HTML attribute)
    // to sidestep autoplay-policy quirks, so assert on the property.
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    // iOS Safari can swallow taps directly on a <video> — pointer-events:
    // none forwards them to the wrapping "open viewer" button.
    expect(video.className).toContain('pointer-events-none');
    expect(container.querySelector('img')).not.toBeInTheDocument();
    // Play-icon overlay (lucide Play renders an <svg>)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('does not render media until a url is provided', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const { container } = render(
      <ImageThumb file={file} url="" onOpen={() => {}} onRemove={() => {}} />
    );
    expect(container.querySelector('img')).not.toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('uses "Xem video" / "Xoá video" labels for a video file, "Xem ảnh" / "Xoá ảnh" for an image', () => {
    const video = new File(['x'], 'clip.mov', { type: 'video/quicktime' });
    const { rerender } = render(
      <ImageThumb file={video} url="blob:clip" onOpen={() => {}} onRemove={() => {}} />
    );
    expect(screen.getByLabelText('Xem video')).toBeInTheDocument();
    expect(screen.getByLabelText('Xoá video')).toBeInTheDocument();

    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    rerender(<ImageThumb file={photo} url="blob:photo" onOpen={() => {}} onRemove={() => {}} />);
    expect(screen.getByLabelText('Xem ảnh')).toBeInTheDocument();
    expect(screen.getByLabelText('Xoá ảnh')).toBeInTheDocument();
  });

  it('calls onOpen when the media area is tapped', () => {
    const onOpen = jest.fn();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    render(<ImageThumb file={file} url="blob:photo" onOpen={onOpen} onRemove={() => {}} />);
    fireEvent.click(screen.getByLabelText('Xem ảnh'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('calls onRemove (and not onOpen) when the remove button is clicked', () => {
    const onRemove = jest.fn();
    const onOpen = jest.fn();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    render(<ImageThumb file={file} url="blob:photo" onOpen={onOpen} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Xoá ảnh'));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
  });
});
