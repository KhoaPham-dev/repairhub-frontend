interface InputProps {
  label: string;
  name?: string;
  type?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Input({ label, name, type = 'text', value, onChange, placeholder, required, disabled }: InputProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 block">
        {label}{required && <span className="text-slate-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full bg-[#f8fafc] border border-transparent focus:border-[#004EAB] focus:bg-white focus:ring-1 focus:ring-[#004EAB] outline-none rounded-xl px-4 py-3 text-sm transition-colors placeholder:text-slate-400 disabled:opacity-60"
      />
    </div>
  );
}
