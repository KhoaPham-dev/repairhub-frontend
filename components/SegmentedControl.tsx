'use client';

interface Tab { label: string; value: string }

interface Props {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SegmentedControl({ tabs, active, onChange, className = '' }: Props) {
  return (
    <div className={`flex bg-surface rounded-full p-1 w-full ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
            active === tab.value
              ? 'bg-accent text-[#0B0B0B] shadow-sm'
              : 'text-text-muted hover:text-text-base'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
