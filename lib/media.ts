// Shared file-type/size rules for order image + video uploads, kept in sync
// with the backend (POST /orders/:id/images, /orders/bulk-with-images,
// /orders/warranty-claim). Images stay capped at 10 MB; videos (e.g. a short
// clip of a device fault) are accepted up to 100 MB.

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'] as const;
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;
export const ACCEPTED_MEDIA_TYPES: readonly string[] = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

// Value for <input accept="...">.
export const MEDIA_ACCEPT = ACCEPTED_MEDIA_TYPES.join(',');

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm'];

/** True if a stored file path (e.g. order_images.image_path) is a video, by extension (case-insensitive). */
export function isVideoPath(path: string): boolean {
  const lower = path.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/** True if a locally-picked File is a video, by its browser-reported MIME type. */
export function isVideoFile(file: File): boolean {
  return ACCEPTED_VIDEO_TYPES.includes(file.type as (typeof ACCEPTED_VIDEO_TYPES)[number]);
}

/**
 * Validates a locally-picked file against the same type/size rules the
 * backend enforces. Returns an error message to show the user, or null if
 * the file is acceptable.
 */
export function validateMediaFile(file: File): string | null {
  const isVideo = isVideoFile(file);
  const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number]);

  if (!isVideo && !isImage) {
    return 'Định dạng tệp không hợp lệ';
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return 'Ảnh quá lớn (tối đa 10MB mỗi ảnh)';
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return 'Tệp quá lớn (ảnh tối đa 10MB, video tối đa 100MB)';
  }
  return null;
}

/**
 * Splits a batch of locally-picked files into the ones that pass
 * validateMediaFile and the first rejection message (if any) — used by file
 * pickers to keep valid files and surface one clear error for the rest.
 */
export function pickValidMediaFiles(files: File[]): { valid: File[]; error: string | null } {
  const valid: File[] = [];
  let error: string | null = null;
  for (const file of files) {
    const err = validateMediaFile(file);
    if (err) {
      error = error ?? err;
    } else {
      valid.push(file);
    }
  }
  return { valid, error };
}
