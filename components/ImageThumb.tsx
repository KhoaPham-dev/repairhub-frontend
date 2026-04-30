'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

// Thumbnail for a not-yet-uploaded local File. Uses URL.createObjectURL and
// revokes on unmount/file-change to avoid leaking blob memory.
export default function ImageThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string>('');

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  return (
    <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Xoá ảnh"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center active:bg-black/80"
      >
        <X size={14} />
      </button>
    </div>
  );
}
