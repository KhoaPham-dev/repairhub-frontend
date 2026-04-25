'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface OrderDetail {
  id: string; order_code: string; status: string; priority: string | null;
  customer_name: string; customer_phone: string; customer_address: string; customer_type: string;
  branch_name: string; product_type: string; device_name: string; serial_imei: string;
  accessories: string; fault_description: string; quotation: number;
  warranty_period_months: number; warranty_end_date: string | null;
  created_by_name: string; created_at: string;
  history: { id: string; old_status: string; new_status: string; changed_by_name: string; changed_at: string; notes: string }[];
  images: { id: string; image_path: string; image_type: string }[];
}

interface ApiResponse<T> { success: boolean; data: T }

const STATUS_LABELS: Record<string, string> = {
  TIEP_NHAN: 'Tiếp nhận', DANG_KIEM_TRA: 'Đang kiểm tra', BAO_GIA: 'Báo giá',
  CHO_LINH_KIEN: 'Chờ linh kiện', DANG_SUA_CHUA: 'Đang sửa chữa',
  KIEM_TRA_LAI: 'Kiểm tra lại', SUA_XONG: 'Sửa xong',
  DA_GIAO: 'Đã giao', HUY_TRA_MAY: 'Huỷ/Trả máy',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);
const TERMINAL = ['DA_GIAO', 'HUY_TRA_MAY'];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.get<ApiResponse<OrderDetail>>(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusUpdate() {
    if (!newStatus) { setError('Vui lòng chọn trạng thái'); return; }
    setUpdating(true); setError('');
    try {
      await api.put(`/orders/${id}/status`, { status: newStatus, notes });

      if (newImages.length > 0) {
        const fd = new FormData();
        newImages.forEach((f) => fd.append('images', f));
        fd.append('image_type', 'COMPLETION');
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/${id}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
      }

      setNewStatus(''); setNotes(''); setNewImages([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setUpdating(false);
    }
  }

  if (!order) return <AuthGuard><div className="p-8 text-center text-slate-400 text-sm">Đang tải...</div></AuthGuard>;

  const isTerminal = TERMINAL.includes(order.status);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
  const safeImagePath = (p: string) => p.replace(/\.\./g, '').replace(/^\/+/, '');

  return (
    <AuthGuard>
      <div className="pb-8 min-h-screen bg-[#F8F9FB]">
        <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-20 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center text-slate-700 -ml-2">
              <span className="text-2xl leading-none">‹</span>
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{order.order_code}</h1>
              <p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
            order.status === 'DA_GIAO' || order.status === 'SUA_XONG' ? 'bg-[#E0F2E9] text-[#1D7F54]' :
            order.status === 'HUY_TRA_MAY' ? 'bg-red-50 text-red-600' : 'bg-[#EAEFFF] text-[#004EAB]'
          }`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
        </div>

        <div className="p-4 space-y-4">
          <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-900 mb-4">Thông tin khách hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Tên KH</span><span className="font-medium text-slate-900">{order.customer_name}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">SĐT</span><span className="font-medium text-[#004EAB]">{order.customer_phone}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Chi nhánh</span><span className="text-slate-700">{order.branch_name}</span></div>
            </div>
          </section>

          <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-900 mb-4">Thiết bị</h2>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-900">{order.device_name}</p>
              {order.serial_imei && <p className="text-xs text-slate-500">Serial: {order.serial_imei}</p>}
              <div className="p-3 bg-[#f8fafc] rounded-xl text-slate-700 border border-slate-100">{order.fault_description}</div>
              <p className="font-semibold text-[#004EAB]">Báo giá: {order.quotation.toLocaleString('vi-VN')}đ</p>
              {order.warranty_end_date && (
                <p className="text-xs text-slate-500">Bảo hành đến: {new Date(order.warranty_end_date).toLocaleDateString('vi-VN')}</p>
              )}
            </div>
          </section>

          {order.images.length > 0 && (
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-[15px] font-bold text-slate-900 mb-3">Ảnh ({order.images.length})</h2>
              <div className="grid grid-cols-3 gap-2">
                {order.images.map((img) => (
                  <img key={img.id} src={`${API_BASE}/uploads/${safeImagePath(img.image_path)}`}
                    alt={img.image_type} className="w-full h-24 object-cover rounded-xl" />
                ))}
              </div>
            </section>
          )}

          {!isTerminal && (
            <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-[15px] font-bold text-slate-900 mb-4">Cập nhật trạng thái</h2>
              <div className="space-y-3">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 focus:border-[#004EAB] rounded-xl px-4 py-3 text-sm outline-none">
                  <option value="">Chọn trạng thái mới</option>
                  {ALL_STATUSES.filter((s) => s !== order.status).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú (tuỳ chọn)" rows={2}
                  className="w-full bg-[#f8fafc] border border-transparent focus:border-[#004EAB] rounded-xl px-4 py-3 text-sm outline-none resize-none" />
                <input type="file" accept="image/*" multiple capture="environment"
                  onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
                  className="text-sm text-slate-600" />
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={handleStatusUpdate} disabled={updating}
                  className="w-full bg-[#004EAB] text-white py-4 rounded-full font-semibold text-sm shadow-sm disabled:opacity-60">
                  {updating ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
                </button>
              </div>
            </section>
          )}

          <section className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="text-[15px] font-bold text-slate-900 mb-4">Tiến độ</h2>
            <div className="space-y-4">
              {order.history.map((h, i) => (
                <div key={h.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-[#1D7F54] border-4 border-[#E0F2E9]" />
                    {i < order.history.length - 1 && <div className="w-0.5 h-8 bg-slate-200 mt-1" />}
                  </div>
                  <div className="pt-0.5">
                    <p className="text-sm font-medium text-slate-900">
                      {h.old_status ? `${STATUS_LABELS[h.old_status]} → ` : ''}{STATUS_LABELS[h.new_status] ?? h.new_status}
                    </p>
                    <p className="text-xs text-slate-500">{h.changed_by_name} · {new Date(h.changed_at).toLocaleString('vi-VN')}</p>
                    {h.notes && <p className="text-xs text-slate-500 mt-0.5 italic">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}
