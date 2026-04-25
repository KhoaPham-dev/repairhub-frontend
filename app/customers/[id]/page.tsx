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

  if (!customer) return <AuthGuard><div className="p-8 text-center text-slate-400 text-sm">Đang tải...</div></AuthGuard>;

  return (
    <AuthGuard>
      <div className="pb-8 min-h-screen bg-[#F8F9FB]">
        <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center gap-3">
          <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 -ml-2">
            <span className="text-2xl leading-none">‹</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#004EAB] text-white flex items-center justify-center font-bold">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{customer.name}</h1>
              <p className="text-xs text-slate-500">{customer.phone} · {customer.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-900 mb-4">Thông tin</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">SĐT</span><span className="font-medium text-[#004EAB]">{customer.phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Loại</span><span className="text-slate-700">{customer.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}</span></div>
              {customer.address && <div className="flex justify-between"><span className="text-slate-500">Địa chỉ</span><span className="text-slate-700 text-right max-w-[60%]">{customer.address}</span></div>}
              {customer.notes && <div className="flex justify-between"><span className="text-slate-500">Ghi chú</span><span className="text-slate-700">{customer.notes}</span></div>}
            </div>
          </section>

          <h2 className="text-[15px] font-bold text-slate-900 px-1">Lịch sử đơn hàng ({customer.orders.length})</h2>
          {customer.orders.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-4">Chưa có đơn hàng</p>
          )}
          {customer.orders.map((o) => (
            <div
              key={o.id}
              onClick={() => router.push(`/orders/${o.id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex justify-between items-center cursor-pointer active:bg-slate-50"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-0.5">{o.order_code}</h3>
                <p className="text-xs text-slate-500">{new Date(o.created_at).toLocaleDateString('vi-VN')} · {o.device_name}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-medium ${
                o.status === 'DA_GIAO' ? 'bg-[#E0F2E9] text-[#1D7F54]' :
                o.status === 'HUY_TRA_MAY' ? 'bg-red-50 text-red-600' : 'bg-[#EAEFFF] text-[#004EAB]'
              }`}>
                {STATUS_LABELS[o.status] ?? o.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
