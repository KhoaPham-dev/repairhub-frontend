'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
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

  if (!order) return <AuthGuard><div className="p-8 text-center text-gray-400">Đang tải...</div></AuthGuard>;

  const isTerminal = TERMINAL.includes(order.status);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader title={order.order_code} onBack={() => router.back()} />

        <div className="p-4 space-y-4">
          <Card>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-gray-500">Khách:</span> <span className="font-medium">{order.customer_name}</span></p>
              <p><span className="text-gray-500">SĐT:</span> {order.customer_phone}</p>
              <p><span className="text-gray-500">Chi nhánh:</span> {order.branch_name}</p>
              <p><span className="text-gray-500">Thiết bị:</span> {order.device_name}</p>
              {order.serial_imei && <p><span className="text-gray-500">Serial:</span> {order.serial_imei}</p>}
              <p><span className="text-gray-500">Lỗi:</span> {order.fault_description}</p>
              <p><span className="text-gray-500">Báo giá:</span> <span className="font-semibold text-[#1565C0]">{order.quotation.toLocaleString('vi-VN')}đ</span></p>
              {order.warranty_end_date && (
                <p><span className="text-gray-500">Bảo hành đến:</span> {new Date(order.warranty_end_date).toLocaleDateString('vi-VN')}</p>
              )}
            </div>
          </Card>

          {order.images.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Ảnh ({order.images.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {order.images.map((img) => (
                  <img key={img.id} src={`${API_BASE}/uploads/${img.image_path}`}
                    alt={img.image_type} className="w-full h-24 object-cover rounded-lg" />
                ))}
              </div>
            </Card>
          )}

          {!isTerminal && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Cập nhật trạng thái</h3>
              <div className="space-y-3">
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]">
                  <option value="">Chọn trạng thái mới</option>
                  {ALL_STATUSES.filter((s) => s !== order.status).map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú (tuỳ chọn)" rows={2}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0] resize-none" />
                <label className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-[#f8fafc] cursor-pointer active:bg-slate-100 transition-colors">
                  <Upload size={20} className="mb-2" />
                  <span className="text-sm font-medium">{newImages.length > 0 ? `Đã chọn ${newImages.length} ảnh` : 'Chọn hình ảnh'}</span>
                  <input type="file" accept="image/*" multiple capture="environment"
                    onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
                    className="hidden" />
                </label>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button onClick={handleStatusUpdate} disabled={updating}
                  className="w-full bg-[#1565C0] text-white py-3 rounded-xl font-semibold text-sm disabled:opacity-60">
                  {updating ? 'Đang cập nhật...' : 'Cập nhật'}
                </button>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Lịch sử trạng thái</h3>
            <div className="space-y-3">
              {order.history.map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#1565C0] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-700">
                      {h.old_status ? `${STATUS_LABELS[h.old_status]} → ` : ''}{STATUS_LABELS[h.new_status] ?? h.new_status}
                    </p>
                    <p className="text-xs text-gray-400">{h.changed_by_name} · {new Date(h.changed_at).toLocaleString('vi-VN')}</p>
                    {h.notes && <p className="text-xs text-gray-500 mt-0.5 italic">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
