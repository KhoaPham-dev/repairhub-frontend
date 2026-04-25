interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
