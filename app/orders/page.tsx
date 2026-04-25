import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

const statusFilters = [
  'Tất cả',
  'Tiếp nhận',
  'Đang kiểm tra',
  'Đang sửa chữa',
  'Sửa xong',
  'Đã giao',
];

export default function OrdersPage() {
  return (
    <div>
      <PageHeader title="Đơn hàng" />
      <div className="p-4">
        <input
          type="text"
          placeholder="Tìm theo SĐT, mã đơn, serial..."
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm mb-4 outline-none focus:border-[#1565C0]"
        />
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm border border-gray-200 bg-white text-gray-600 whitespace-nowrap"
            >
              {filter}
            </button>
          ))}
        </div>
        <Card className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📋</div>
          <div>Chưa có đơn hàng nào</div>
        </Card>
      </div>
    </div>
  );
}
