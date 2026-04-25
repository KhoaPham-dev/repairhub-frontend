import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

const stats = [
  { label: 'Đơn hàng hôm nay', value: '0' },
  { label: 'Đang sửa chữa', value: '0' },
  { label: 'Chờ linh kiện', value: '0' },
  { label: 'Đã giao hôm nay', value: '0' },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader title="Tổng quan" />
      <div className="p-4 grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="text-3xl font-bold text-[#1565C0]">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
