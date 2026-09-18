import {
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MEDIA_ACCEPT,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_FILES_ORDER_IMAGES,
  MAX_FILES_BULK_ORDER,
  MAX_FILES_WARRANTY_CLAIM,
  isVideoPath,
  isVideoFile,
  validateMediaFile,
  pickValidMediaFiles,
  fileCountCapMessage,
} from '@/lib/media';

function makeFile(name: string, type: string, size: number): File {
  const file = new File([new Uint8Array(1)], name, { type });
  // jsdom's File doesn't let the constructor set an arbitrary `size` from a
  // 1-byte blob — override the getter directly for oversize test fixtures.
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
}

describe('lib/media', () => {
  describe('MEDIA_ACCEPT', () => {
    it('lists every accepted image and video MIME type', () => {
      expect(MEDIA_ACCEPT).toBe(
        'image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm'
      );
      ACCEPTED_IMAGE_TYPES.forEach((t) => expect(MEDIA_ACCEPT).toContain(t));
      ACCEPTED_VIDEO_TYPES.forEach((t) => expect(MEDIA_ACCEPT).toContain(t));
    });
  });

  describe('isVideoPath', () => {
    it('recognizes .mp4, .mov and .webm (case-insensitive)', () => {
      expect(isVideoPath('orders/abc/completion.mp4')).toBe(true);
      expect(isVideoPath('orders/abc/COMPLETION.MOV')).toBe(true);
      expect(isVideoPath('orders/abc/clip.webm')).toBe(true);
    });

    it('returns false for image paths', () => {
      expect(isVideoPath('orders/abc/photo.jpg')).toBe(false);
      expect(isVideoPath('orders/abc/photo.PNG')).toBe(false);
      expect(isVideoPath('orders/abc/photo.heic')).toBe(false);
    });
  });

  describe('isVideoFile', () => {
    it('returns true for accepted video MIME types', () => {
      expect(isVideoFile(makeFile('a.mp4', 'video/mp4', 1024))).toBe(true);
      expect(isVideoFile(makeFile('a.mov', 'video/quicktime', 1024))).toBe(true);
      expect(isVideoFile(makeFile('a.webm', 'video/webm', 1024))).toBe(true);
    });

    it('returns false for image MIME types', () => {
      expect(isVideoFile(makeFile('a.jpg', 'image/jpeg', 1024))).toBe(false);
    });
  });

  describe('validateMediaFile', () => {
    it('accepts an image under 10MB', () => {
      expect(validateMediaFile(makeFile('a.jpg', 'image/jpeg', 5 * 1024 * 1024))).toBeNull();
    });

    it('accepts a video under 100MB', () => {
      expect(validateMediaFile(makeFile('a.mp4', 'video/mp4', 50 * 1024 * 1024))).toBeNull();
    });

    it('rejects an unsupported MIME type', () => {
      expect(validateMediaFile(makeFile('a.pdf', 'application/pdf', 1024)))
        .toBe('Định dạng tệp không hợp lệ');
    });

    it('rejects an image over 10MB', () => {
      expect(validateMediaFile(makeFile('a.jpg', 'image/jpeg', MAX_IMAGE_BYTES + 1)))
        .toBe('Ảnh quá lớn (tối đa 10MB mỗi ảnh)');
    });

    it('accepts an image at exactly the 10MB limit', () => {
      expect(validateMediaFile(makeFile('a.jpg', 'image/jpeg', MAX_IMAGE_BYTES))).toBeNull();
    });

    it('rejects a video over 100MB', () => {
      expect(validateMediaFile(makeFile('a.mp4', 'video/mp4', MAX_VIDEO_BYTES + 1)))
        .toBe('Tệp quá lớn (ảnh tối đa 10MB, video tối đa 100MB)');
    });

    it('accepts a video at exactly the 100MB limit', () => {
      expect(validateMediaFile(makeFile('a.mp4', 'video/mp4', MAX_VIDEO_BYTES))).toBeNull();
    });
  });

  describe('pickValidMediaFiles', () => {
    it('keeps valid files and reports the first rejection message', () => {
      const good1 = makeFile('a.jpg', 'image/jpeg', 1024);
      const bad = makeFile('b.pdf', 'application/pdf', 1024);
      const good2 = makeFile('c.mp4', 'video/mp4', 1024);
      const { valid, error } = pickValidMediaFiles([good1, bad, good2]);
      expect(valid).toEqual([good1, good2]);
      expect(error).toBe('Định dạng tệp không hợp lệ');
    });

    it('returns no error when all files are valid', () => {
      const { valid, error } = pickValidMediaFiles([makeFile('a.jpg', 'image/jpeg', 1024)]);
      expect(valid).toHaveLength(1);
      expect(error).toBeNull();
    });

    describe('file-count cap', () => {
      it('accepts files up to the cap with no error', () => {
        const files = [makeFile('a.jpg', 'image/jpeg', 1), makeFile('b.jpg', 'image/jpeg', 1)];
        const { valid, error } = pickValidMediaFiles(files, { maxCount: 2, currentCount: 0 });
        expect(valid).toHaveLength(2);
        expect(error).toBeNull();
      });

      it('trims files beyond the cap and reports the cap message', () => {
        const files = [
          makeFile('a.jpg', 'image/jpeg', 1),
          makeFile('b.jpg', 'image/jpeg', 1),
          makeFile('c.jpg', 'image/jpeg', 1),
        ];
        const { valid, error } = pickValidMediaFiles(files, { maxCount: 2, currentCount: 0 });
        expect(valid).toEqual([files[0], files[1]]);
        expect(error).toBe(fileCountCapMessage(2));
      });

      it('accounts for files already selected via currentCount', () => {
        const files = [makeFile('a.jpg', 'image/jpeg', 1), makeFile('b.jpg', 'image/jpeg', 1)];
        const { valid, error } = pickValidMediaFiles(files, { maxCount: 3, currentCount: 2 });
        expect(valid).toEqual([files[0]]);
        expect(error).toBe('Quá nhiều tệp trong một lần tải lên (tối đa 3)');
      });

      it('rejects everything when already at the cap', () => {
        const files = [makeFile('a.jpg', 'image/jpeg', 1)];
        const { valid, error } = pickValidMediaFiles(files, { maxCount: 5, currentCount: 5 });
        expect(valid).toEqual([]);
        expect(error).toBe(fileCountCapMessage(5));
      });

      it('a type/size rejection message takes priority over the cap message', () => {
        const files = [makeFile('bad.pdf', 'application/pdf', 1), makeFile('a.jpg', 'image/jpeg', 1)];
        const { valid, error } = pickValidMediaFiles(files, { maxCount: 0, currentCount: 0 });
        expect(valid).toEqual([]);
        expect(error).toBe('Định dạng tệp không hợp lệ');
      });

      it('ignores the cap entirely when maxCount is not given', () => {
        const files = Array.from({ length: 5 }, (_, i) => makeFile(`f${i}.jpg`, 'image/jpeg', 1));
        const { valid, error } = pickValidMediaFiles(files);
        expect(valid).toHaveLength(5);
        expect(error).toBeNull();
      });
    });
  });

  describe('per-request file-count cap constants', () => {
    it('matches the backend multer limits', () => {
      expect(MAX_FILES_ORDER_IMAGES).toBe(20);
      expect(MAX_FILES_BULK_ORDER).toBe(50);
      expect(MAX_FILES_WARRANTY_CLAIM).toBe(10);
    });
  });

  describe('fileCountCapMessage', () => {
    it('includes the given max in the message', () => {
      expect(fileCountCapMessage(20)).toBe('Quá nhiều tệp trong một lần tải lên (tối đa 20)');
    });
  });
});
