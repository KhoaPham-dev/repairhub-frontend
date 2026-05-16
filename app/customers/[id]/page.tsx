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
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    api.get<ApiResponse<CustomerDetail>>(`/customers/${id}`).then((r) => setCustomer(r.data)).catch(() => null);
  }, [id]);

  function startEditing() {
    if (!customer) return;
    setForm({ name: customer.name, phone: customer.phone, address: customer.address, notes: customer.notes });
    setPhoneError('');
    setEditing(true);
  }

  function cancelEditing() {
    if (!customer) return;
    setForm({ name: customer.name, phone: customer.phone, address: customer.address, notes: customer.notes });
    setPhoneError('');
    setEditing(false);
  }

  async function saveEditing() {
    setPhoneError('');
    setSaving(true);
    try {
      const res = await api.put<ApiResponse<CustomerDetail>>(`/customers/${id}`, {
        name: form.name,
        phone: form.phone,
        address: form.address,
        notes: form.notes,
      });
      setCustomer(res.data);
      setEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('409') || msg.toLowerCase().includes('phone') || msg.toLowerCase().includes('điện thoại')) {
        setPhoneError('Số điện thoại đã tồn tại');
      } else {
        setPhoneError(msg || 'Có lỗi xảy ra');
      }
    } finally {
      setSaving(false);
    }
  }

  if (!customer) return <AuthGuard><div className="p-8 text-center text-gray-400">Đang tải...</div></AuthGuard>;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader title={customer.name} subtitle="Khách hàng" onBack={() => router.back()} />
        <div className="p-4 space-y-4">
          <Card>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800 text-sm">Thông tin khách hàng</h3>
              {customer.type === 'PARTNER' && !editing && (
                <button
                  onClick={startEditing}
                  className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-[#004EAB] font-medium"
                >
                  Chỉnh sửa
                </button>
              )}
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tên khách hàng</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-[#004EAB]"
                    placeholder="Tên khách hàng"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Số điện thoại</label>
                  <input
                    value={form.phone}
                    onChange={(e) => { setForm((p) => ({ ...p, phone: e.target.value })); setPhoneError(''); }}
                    className={`border rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-[#004EAB] ${phoneError ? 'border-red-400' : 'border-slate-200'}`}
                    placeholder="Số điện thoại"
                  />
                  {phoneError && <p className="text-red-500 text-xs mt-1">{phoneError}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Loại</label>
                  <p className="text-sm text-gray-700">Đối tác</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Địa chỉ</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-[#004EAB]"
                    placeholder="Địa chỉ"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ghi chú</label>
                  <input
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:border-[#004EAB]"
                    placeholder="Ghi chú"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={cancelEditing}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={saveEditing}
                    disabled={saving}
                    className="flex-1 py-2.5 rounded-xl bg-[#004EAB] text-white text-sm font-semibold disabled:opacity-60"
                  >
                    {saving ? 'Đang lưu...' : 'Lưu'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <p><span className="text-gray-500">SĐT:</span> {customer.phone}</p>
                <p><span className="text-gray-500">Loại:</span> {customer.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}</p>
                {customer.address && <p><span className="text-gray-500">Địa chỉ:</span> {customer.address}</p>}
                {customer.notes && <p><span className="text-gray-500">Ghi chú:</span> {customer.notes}</p>}
              </div>
            )}
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
