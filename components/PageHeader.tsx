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
      <div className="bg-surface-alt px-4 pt-4 pb-3 sticky top-0 z-20 border-b border-border-subtle flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center text-text-muted -ml-2"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-text-base leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-3 bg-surface-alt sticky top-0 z-10 w-full border-b border-border-subtle">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-base tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
        {right && <div>{right}</div>}
      </div>
    </div>
  );
}
