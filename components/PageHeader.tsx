'use client';

import { ChevronLeft } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, onBack, right }: PageHeaderProps) {
  if (onBack) {
    return (
      <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center text-slate-700 -ml-2"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 pb-4 bg-[#F8F9FB] sticky top-0 z-10 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
