interface Tab {
  label: string;
  value: string;
}

interface SegmentedControlProps {
  tabs: Tab[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SegmentedControl({ tabs, active, onChange, className = '' }: SegmentedControlProps) {
  return (
    <div className={`flex bg-[#F1F5F9] rounded-full p-1 w-full ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all ${
            active === tab.value
              ? 'bg-[#004EAB] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
