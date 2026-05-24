interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div className={`bg-surface rounded-xl border border-border-subtle p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
