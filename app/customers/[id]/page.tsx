'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface CustomerDetail {
  id: string; phone: string; name: string; address: string; type: string; notes: string;
  orders: { id: string; order_code: string; status: string; device_name: string; created_at: string }[];
}

interface ApiResponse<T> { success: boolean; data: T }

const STATUS_LABELS: Record<string, string> = {
  TIEP_NHAN: 'Tiếp nhận', DANG_KIEM_TRA: 'Đang kiểm tra', BAO_GIA: 'Báo giá',
  CHO_LINH_KIEN: 'Chờ linh kiện', DANG_SUA_CHUA: 'Đang sửa', KIEM_TRA_LAI: 'Kiểm tra lại',
  SUA_XONG: 'Sửa xong', DA_GIAO: 'Đã giao', HUY_TRA_MAY: 'Huỷ/Trả máy',
};

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);

  useEffect(() => {
    api.get<ApiResponse<CustomerDetail>>(`/customers/${id}`).then((r) => setCustomer(r.data)).catch(() => null);
  }, [id]);

  if (!customer) return <AuthGuard><div className="p-8 text-center text-gray-400">Đang tải...</div></AuthGuard>;

  return (
    <AuthGuard>
      <div>
        <div className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-4 sticky top-0 z-40">
          <button onClick={() => router.back()} className="text-white text-xl">←</button>
          <h1 className="text-lg font-semibold">{customer.name}</h1>
        </div>
        <div className="p-4 space-y-4">
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Thông tin khách hàng</h3>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">SĐT:</span> {customer.phone}</p>
              <p><span className="text-gray-500">Loại:</span> {customer.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}</p>
              {customer.address && <p><span className="text-gray-500">Địa chỉ:</span> {customer.address}</p>}
              {customer.notes && <p><span className="text-gray-500">Ghi chú:</span> {customer.notes}</p>}
            </div>
          </Card>
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Lịch sử đơn hàng ({customer.orders.length})</h3>
            <div className="space-y-2">
              {customer.orders.length === 0 && <p className="text-gray-400 text-sm text-center py-4">Chưa có đơn hàng</p>}
              {customer.orders.map((o) => (
                <div key={o.id} onClick={() => router.push(`/orders/${o.id}`)}
                  className="flex justify-between items-center py-2 border-b border-gray-50 cursor-pointer last:border-0">
                  <div>
                    <p className="text-sm font-medium">{o.order_code}</p>
                    <p className="text-xs text-gray-400">{o.device_name}</p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {STATUS_LABELS[o.status] ?? o.status}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
