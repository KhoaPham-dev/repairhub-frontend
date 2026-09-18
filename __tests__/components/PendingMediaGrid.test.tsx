import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// jsdom does not implement these.
const createdUrls = new Map<File, string>();
const revokedUrls = new Set<string>();
let urlCounter = 0;
global.URL.createObjectURL = jest.fn((file: File) => {
  const url = `blob:${file.name}-${urlCounter++}`;
  createdUrls.set(file, url);
  return url;
});
global.URL.revokeObjectURL = jest.fn((url: string) => {
  revokedUrls.add(url);
});

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
  revokedUrls.clear();
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

  describe('object URL lifecycle', () => {
    it('does not recreate URLs when re-rendered with the exact same files array reference', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const files = [fileA];
      const { rerender } = render(<PendingMediaGrid files={files} onRemove={() => {}} />);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

      rerender(<PendingMediaGrid files={files} onRemove={() => {}} />);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('recreates URLs for a new files array reference (even with unchanged files) and revokes the old ones — the accepted simplicity/StrictMode-safety tradeoff', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const { rerender } = render(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      const firstUrl = createdUrls.get(fileA);

      // Same File, but a new array reference (as every real add/remove call
      // site produces) — re-creates rather than reusing across renders.
      rerender(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(firstUrl);
    });

    it('revokes the URL for a removed file and creates one for a newly added file', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
      const { rerender, unmount } = render(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);
      const urlA1 = createdUrls.get(fileA);

      rerender(<PendingMediaGrid files={[fileB]} onRemove={() => {}} />);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlA1);
      const urlB = createdUrls.get(fileB);
      expect(urlB).toBeDefined();

      unmount();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(urlB);
    });

    it('dedupes the same File object appearing twice in one files array into a single URL', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      render(<PendingMediaGrid files={[fileA, fileA]} onRemove={() => {}} />);

      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      const props = lastLightboxProps();
      expect(props.images).toHaveLength(2);
      expect(props.images[0].src).toBe(props.images[1].src);
    });

    it('under React.StrictMode, the URL rendered in the DOM was never revoked', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const { container } = render(
        <React.StrictMode>
          <PendingMediaGrid files={[fileA]} onRemove={() => {}} />
        </React.StrictMode>
      );

      const img = container.querySelector('img') as HTMLImageElement;
      expect(img).toBeInTheDocument();
      expect(img.src).toBeTruthy();
      expect(revokedUrls.has(img.src)).toBe(false);
    });
  });

  describe('lightbox index safety', () => {
    it('closes the lightbox once the open index no longer exists after files shrink', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
      const { rerender } = render(<PendingMediaGrid files={[fileA, fileB]} onRemove={() => {}} />);

      fireEvent.click(screen.getAllByLabelText('Xem ảnh')[1]); // open at index 1 (fileB)
      expect(lastLightboxProps().open).toBe(true);
      expect(lastLightboxProps().index).toBe(1);

      // fileB removed — index 1 no longer exists.
      rerender(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);
      expect(lastLightboxProps().open).toBe(false);
    });

    it('unmounts cleanly (renders nothing) once all files are removed while the viewer was open, with no stale reopen if files are picked again', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const { container, rerender } = render(<PendingMediaGrid files={[fileA]} onRemove={() => {}} />);

      fireEvent.click(screen.getByLabelText('Xem ảnh'));
      expect(lastLightboxProps().open).toBe(true);

      // All files removed — the grid (and its ImageLightbox) unmount.
      rerender(<PendingMediaGrid files={[]} onRemove={() => {}} />);
      expect(container).toBeEmptyDOMElement();

      // Picking a new file afterwards must not resurrect the old open state.
      const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
      rerender(<PendingMediaGrid files={[fileB]} onRemove={() => {}} />);
      expect(lastLightboxProps().open).toBe(false);
    });

    it('keeps the lightbox open when the index is still within range after an unrelated change', () => {
      const fileA = new File(['a'], 'a.jpg', { type: 'image/jpeg' });
      const fileB = new File(['b'], 'b.jpg', { type: 'image/jpeg' });
      const fileC = new File(['c'], 'c.jpg', { type: 'image/jpeg' });
      const { rerender } = render(<PendingMediaGrid files={[fileA, fileB, fileC]} onRemove={() => {}} />);

      fireEvent.click(screen.getAllByLabelText('Xem ảnh')[2]); // index 2
      expect(lastLightboxProps().open).toBe(true);
      expect(lastLightboxProps().index).toBe(2);

      // A file removed elsewhere in the array, but 3 files still remain —
      // index 2 is still in range, so the viewer stays open.
      rerender(<PendingMediaGrid files={[fileA, fileB, fileC]} onRemove={() => {}} />);
      expect(lastLightboxProps().open).toBe(true);
    });
  });

  it('supports a custom grid className, defaulting to the standard 3-column grid', () => {
    const photo = new File(['a'], 'photo.jpg', { type: 'image/jpeg' });
    const { container, rerender } = render(<PendingMediaGrid files={[photo]} onRemove={() => {}} />);
    expect(container.querySelector('.grid.grid-cols-3')).toBeInTheDocument();

    rerender(<PendingMediaGrid files={[photo]} onRemove={() => {}} className="custom-grid" />);
    expect(container.querySelector('.custom-grid')).toBeInTheDocument();
  });
});
