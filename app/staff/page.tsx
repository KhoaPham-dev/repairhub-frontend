import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';

export default function StaffPage() {
  return (
    <div>
      <PageHeader title="Nhân viên" />
      <div className="p-4">
        <Card className="text-center py-8">
          <div className="text-4xl mb-2">🔒</div>
          <div className="text-gray-600">
            Chỉ quản trị viên mới có thể truy cập trang này
          </div>
        </Card>
      </div>
    </div>
  );
}
