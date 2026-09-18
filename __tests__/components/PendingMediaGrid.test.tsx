import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// jsdom does not implement these.
const createdUrls = new Map<File, string>();
let urlCounter = 0;
global.URL.createObjectURL = jest.fn((file: File) => {
  const url = `blob:${file.name}-${urlCounter++}`;
  createdUrls.set(file, url);
  return url;
});
global.URL.revokeObjectURL = jest.fn();

// ImageLightbox is mocked so we can assert exactly which props
// PendingMediaGrid passes it (open/index/slides/showDownload), independent
// of the underlying yet-another-react-lightbox library (already mocked
// separately, see __tests__/__mocks__/yet-another-react-lightbox.ts).
interface CapturedLightboxProps {
  open: boolean;
  index: number;
  showDownload: boolean;
  images: { src: string; alt?: string; isVideo?: boolean }[];
}
const mockLightbox = jest.fn((_props: CapturedLightboxProps) => null);
jest.mock('@/components/ImageLightbox', () => ({
  __esModule: true,
  default: (props: CapturedLightboxProps) => {
    mockLightbox(props);
    return null;
  },
}));

import PendingMediaGrid from '@/components/PendingMediaGrid';

function lastLightboxProps(): CapturedLightboxProps {
  const calls = mockLightbox.mock.calls;
  return calls[calls.length - 1][0];
}

beforeEach(() => {
  jest.clearAllMocks();
  createdUrls.clear();
  urlCounter = 0;
});

describe('PendingMediaGrid', () => {
  it('renders nothing when there are no files', () => {
    const { container } = render(<PendingMediaGrid files={[]} onRemove={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('tapping a thumbnail opens the lightbox at the correct index with isVideo per slide and showDownload=false', () => {
    const photo = new File(['a'], 'photo.jpg', { type: 'image/jpeg' });
    const clip = new File(['b'], 'clip.mp4', { type: 'video/mp4' });
    render(<PendingMediaGrid files={[photo, clip]} onRemove={() => {}} />);

    // Closed initially.
    expect(lastLightboxProps().open).toBe(false);

    fireEvent.click(screen.getByLabelText('Xem video')); // clip is the 2nd (index 1) thumbnail

    const props = lastLightboxProps();
    expect(props.open).toBe(true);
    expect(props.index).toBe(1);
    expect(props.showDownload).toBe(false);
    expect(props.images).toEqual([
      { src: createdUrls.get(photo), alt: 'photo.jpg', isVideo: false },
      { src: createdUrls.get(clip), alt: 'clip.mp4', isVideo: true },
    ]);
  });

  it('tapping the remove (X) button removes the file and does not open the viewer', () => {
    const onRemove = jest.fn();
    const photo = new File(['a'], 'photo.jpg', { type: 'image/jpeg' });
    render(<PendingMediaGrid files={[photo]} onRemove={onRemove} />);

    fireEvent.click(screen.getByLabelText('Xoá ảnh'));

    expect(onRemove).toHaveBeenCalledWith(0);
    expect(lastLightboxProps().open).toBe(false);
  });

  it('creates one object URL per file (memoised per File identity, no churn on re-render) and revokes on removal / unmount', () => {
    const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
    const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });

    const { rerender, unmount } = render(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(fileA);

    // Same File, new array reference — must not create a second URL.
    rerender(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    rerender(<PendingMediaGrid files={[fileA, fileB]} onRemove={() => {}} />);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    // fileA removed — its URL must be revoked.
    const urlA = createdUrls.get(fileA);
    rerender(<PendingMediaGrid files={[fileB]} onRemove={() => {}} />);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlA);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);

    const urlB = createdUrls.get(fileB);
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlB);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('supports a custom grid className, defaulting to the standard 3-column grid', () => {
    const photo = new File(['a'], 'photo.jpg', { type: 'image/jpeg' });
    const { container, rerender } = render(<PendingMediaGrid files={[photo]} onRemove={() => {}} />);
    expect(container.querySelector('.grid.grid-cols-3')).toBeInTheDocument();

    rerender(<PendingMediaGrid files={[photo]} onRemove={() => {}} className="custom-grid" />);
    expect(container.querySelector('.custom-grid')).toBeInTheDocument();
  });
});
