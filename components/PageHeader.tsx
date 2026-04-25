interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  return (
    <div className="bg-[#1565C0] text-white px-4 py-4 sticky top-0 z-40">
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
}
