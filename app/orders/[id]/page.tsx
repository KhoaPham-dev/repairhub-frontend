'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Upload } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import SegmentedControl from '@/components/SegmentedControl';
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
  TIEP_NHAN: 'Tiếp nhận', DANG_BAO_HANH: 'Đang bảo hành',
  DANG_KIEM_TRA: 'Đang kiểm tra', BAO_GIA: 'Báo giá',
  CHO_LINH_KIEN: 'Chờ linh kiện', DANG_SUA_CHUA: 'Đang sửa chữa',
  KIEM_TRA_LAI: 'Kiểm tra lại', SUA_XONG: 'Sửa xong',
  DA_GIAO: 'Đã giao', HUY_TRA_MAY: 'Huỷ/Trả máy',
};

const ALL_STATUSES = Object.keys(STATUS_LABELS);
const TERMINAL = ['DA_GIAO', 'HUY_TRA_MAY'];

const WARRANTY_MONTHS_OPTIONS = [
  { value: '3', label: '3 tháng' },
  { value: '6', label: '6 tháng' },
  { value: '12', label: '12 tháng' },
  { value: 'custom', label: 'Khác' },
];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);

  // Appendable fields
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [newImages, setNewImages] = useState<File[]>([]);
  const [quotation, setQuotation] = useState('');
  const [warrantyOption, setWarrantyOption] = useState('');
  const [customMonths, setCustomMonths] = useState('');

  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    api.get<ApiResponse<OrderDetail>>(`/orders/${id}`).then((r) => {
      setOrder(r.data);
      setQuotation(r.data.quotation > 0 ? String(r.data.quotation) : '');
      const months = r.data.warranty_period_months;
      if ([3, 6, 12].includes(months)) {
        setWarrantyOption(String(months));
      } else if (months > 0) {
        setWarrantyOption('custom');
        setCustomMonths(String(months));
      }
    }).catch(() => null);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate() {
    setUpdating(true); setError(''); setSuccess('');
    try {
      // Update quotation & warranty if changed
      const patchData: Record<string, unknown> = {};
      const newQuotation = Number(quotation) || 0;
      if (order && newQuotation !== order.quotation) patchData.quotation = newQuotation;

      const selectedMonths = warrantyOption === 'custom' ? Number(customMonths) || 0 : Number(warrantyOption) || 0;
      if (order && selectedMonths > 0 && selectedMonths !== order.warranty_period_months) {
        patchData.warranty_period_months = selectedMonths;
      }
      if (notes.trim()) patchData.notes = notes.trim();

      if (Object.keys(patchData).length > 0) {
        await api.patch(`/orders/${id}`, patchData);
      }

      // Update status if selected
      if (newStatus) {
        await api.put(`/orders/${id}/status`, { status: newStatus, notes: notes.trim() || undefined });
      }

      // Upload images
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
      setSuccess('Cập nhật thành công');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setUpdating(false);
    }
  }

  if (!order) return <AuthGuard><div className="p-8 text-center text-gray-400">Đang tải...</div></AuthGuard>;

  const isTerminal = TERMINAL.includes(order.status);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
  const hasChanges = !!(newStatus || notes.trim() || newImages.length > 0 ||
    (Number(quotation) || 0) !== order.quotation ||
    (warrantyOption === 'custom' ? Number(customMonths) || 0 : Number(warrantyOption) || 0) !== order.warranty_period_months);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <PageHeader title={order.order_code} onBack={() => router.back()} />

        <div className="p-4 space-y-4">
          {/* Locked order info */}
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
              {order.warranty_end_date && (
                <p><span className="text-gray-500">Bảo hành đến:</span> {new Date(order.warranty_end_date).toLocaleDateString('vi-VN')}</p>
              )}
            </div>
          </Card>

          {/* Existing images (locked) */}
          {order.images.length > 0 && (
            <Card>
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">Ảnh đã lưu ({order.images.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {order.images.map((img) => (
                  <img key={img.id} src={`${API_BASE}/uploads/${img.image_path}`}
                    alt={img.image_type} className="w-full h-24 object-cover rounded-lg" />
                ))}
              </div>
            </Card>
          )}

          {/* Editable section — only when not terminal */}
          {!isTerminal && (
            <>
              {/* Quotation (appendable) */}
              <Card>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Báo giá</h3>
                <div className="relative">
                  <input type="number" value={quotation} onChange={(e) => setQuotation(e.target.value)}
                    placeholder="Nhập báo giá (VNĐ)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB] pr-12" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">đ</span>
                </div>
              </Card>

              {/* Warranty duration (appendable) */}
              <Card>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Bảo hành</h3>
                <SegmentedControl
                  tabs={WARRANTY_MONTHS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  active={warrantyOption}
                  onChange={setWarrantyOption}
                />
                {warrantyOption === 'custom' && (
                  <div className="mt-3 relative">
                    <input type="number" value={customMonths} onChange={(e) => setCustomMonths(e.target.value)}
                      placeholder="Số tháng"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB] pr-16" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">tháng</span>
                  </div>
                )}
              </Card>

              {/* Status change */}
              <Card>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Cập nhật trạng thái</h3>
                <div className="space-y-3">
                  <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB]">
                    <option value="">Giữ nguyên trạng thái</option>
                    {ALL_STATUSES.filter((s) => s !== order.status).map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
              </Card>

              {/* Notes (appendable) */}
              <Card>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Ghi chú</h3>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Thêm ghi chú..." rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB] resize-none" />
              </Card>

              {/* Image upload (appendable) */}
              <Card>
                <h3 className="font-semibold text-gray-800 mb-3 text-sm">Thêm ảnh</h3>
                <label className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-[#f8fafc] cursor-pointer active:bg-slate-100 transition-colors">
                  <Upload size={20} className="mb-2" />
                  <span className="text-sm font-medium">{newImages.length > 0 ? `Đã chọn ${newImages.length} ảnh` : 'Chọn hình ảnh'}</span>
                  <input type="file" accept="image/*" multiple capture="environment"
                    onChange={(e) => setNewImages(Array.from(e.target.files ?? []))}
                    className="hidden" />
                </label>
              </Card>

              {/* Action */}
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-green-600 text-sm text-center">{success}</p>}
              <button onClick={handleUpdate} disabled={updating || !hasChanges}
                className="w-full bg-[#004EAB] text-white py-4 rounded-full font-semibold text-base disabled:opacity-60 shadow-sm">
                {updating ? 'Đang cập nhật...' : 'Lưu thay đổi'}
              </button>
            </>
          )}

          {/* Status history (locked, always visible) */}
          <Card>
            <h3 className="font-semibold text-gray-800 mb-3 text-sm">Lịch sử trạng thái</h3>
            <div className="space-y-3">
              {order.history.map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-[#004EAB] mt-1.5 flex-shrink-0" />
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
