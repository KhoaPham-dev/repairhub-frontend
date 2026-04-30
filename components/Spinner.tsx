'use client';

import { Loader2 } from 'lucide-react';

// Centred page-level loading indicator. Uses Tailwind's animate-spin
// (a transform-based @keyframes), so it doesn't interact with the global
// `*` transition rule and won't cause the route flicker fixed in RH-56.
export default function Spinner({ label = 'Đang tải...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Loader2 size={28} className="animate-spin mb-2" />
      <span className="text-sm">{label}</span>
    </div>
  );
}
