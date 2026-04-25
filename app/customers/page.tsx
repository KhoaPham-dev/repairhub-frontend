import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

export default function CustomersPage() {
  return (
    <div>
      <PageHeader title="Khách hàng" />
      <div className="p-4">
        <input
          type="text"
          placeholder="Tìm theo SĐT hoặc tên..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm mb-4 outline-none focus:border-[#1565C0]"
        />
        <Card className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">👥</div>
          <div>Chưa có khách hàng nào</div>
        </Card>
      </div>
    </div>
  );
}
