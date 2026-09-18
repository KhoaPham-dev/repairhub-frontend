import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageThumb from '@/components/ImageThumb';

// jsdom does not implement URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

describe('ImageThumb', () => {
  it('renders an <img> for an image file', () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const { container } = render(<ImageThumb file={file} onRemove={() => {}} />);
    expect(container.querySelector('img')).toBeInTheDocument();
    expect(container.querySelector('video')).not.toBeInTheDocument();
  });

  it('renders a <video> (muted, playsInline) with a play icon for a video file', () => {
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    const { container } = render(<ImageThumb file={file} onRemove={() => {}} />);
    const video = container.querySelector('video') as HTMLVideoElement;
    expect(video).toBeInTheDocument();
    // React sets `muted` as a DOM property (not a reflected HTML attribute)
    // to sidestep autoplay-policy quirks, so assert on the property.
    expect(video.muted).toBe(true);
    expect(video).toHaveAttribute('playsinline');
    expect(container.querySelector('img')).not.toBeInTheDocument();
    // Play-icon overlay (lucide Play renders an <svg>)
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('uses a video-specific remove label for a video file', () => {
    const file = new File(['x'], 'clip.mov', { type: 'video/quicktime' });
    render(<ImageThumb file={file} onRemove={() => {}} />);
    expect(screen.getByLabelText('Xoá video')).toBeInTheDocument();
  });

  it('calls onRemove when the remove button is clicked', () => {
    const onRemove = jest.fn();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    render(<ImageThumb file={file} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Xoá ảnh'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
