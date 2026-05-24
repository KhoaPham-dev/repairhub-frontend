'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Upload, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import SegmentedControl from '@/components/SegmentedControl';
import ConfirmModal from '@/components/ConfirmModal';
import ImageThumb from '@/components/ImageThumb';
import ImageLightbox from '@/components/ImageLightbox';
import Spinner from '@/components/Spinner';
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
  TIEP_NHAN:     'Tiếp nhận',
  DANG_KIEM_TRA: 'Kiểm tra',
  BAO_GIA:       'Báo giá',
  DANG_SUA_CHUA: 'Đang sửa',
  SUA_XONG:      'Sửa xong',
  DA_GIAO:       'Đã giao',
  TRA_HANG:      'Trả hàng',
  HUY_TRA_MAY:   'Huỷ trả máy',
  DANG_BAO_HANH: 'Đang bảo hành',
};

const UPDATABLE_STATUSES = Object.keys(STATUS_LABELS).filter((s) => s !== 'DANG_BAO_HANH');
const TERMINAL = ['DA_GIAO', 'HUY_TRA_MAY'];

const WARRANTY_MONTHS_OPTIONS = [
  { value: '3', label: '3 tháng' },
  { value: '6', label: '6 tháng' },
  { value: '12', label: '12 tháng' },
  { value: 'custom', label: 'Khác' },
];

function formatMoney(n: number): string {
  return Math.round(n).toLocaleString('vi-VN');
}

function parseMoney(s: string): number {
  return parseInt(s.replace(/\D/g, ''), 10) || 0;
}

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

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  // -1 means lightbox closed; otherwise the index of the saved image to show.
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(() => {
    api.get<ApiResponse<OrderDetail>>(`/orders/${id}`).then((r) => {
      setOrder(r.data);
      setQuotation(r.data.quotation > 0 ? String(Math.round(Number(r.data.quotation) / 1000)) : '');
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

  function handleUpdate() {
    if (newStatus === 'HUY_TRA_MAY') {
      setConfirmOpen(true);
      return;
    }
    doUpdate();
  }

  async function doUpdate() {
    setUpdating(true); setError(''); setSuccess('');
    try {
      // Update quotation & warranty if changed
      const patchData: Record<string, unknown> = {};
      const newQuotation = parseMoney(quotation) * 1000;
      if (order && newQuotation !== Math.round(Number(order.quotation))) patchData.quotation = newQuotation;

      const selectedMonths = warrantyOption === 'custom' ? Number(customMonths) || 0 : Number(warrantyOption) || 0;
      if (order && selectedMonths > 0 && selectedMonths !== order.warranty_period_months) {
        patchData.warranty_period_months = selectedMonths;
      }
      // RH-63: only attach notes to PATCH when there's NO status change.
      // When status changes, notes go with PUT /:id/status (which records
      // the same history row). Sending notes via PATCH alongside a status
      // change used to cause a notes-only PATCH that the BE rejected with
      // "Không có dữ liệu cập nhật", short-circuiting the rest of the flow.
      if (notes.trim() && !newStatus) patchData.notes = notes.trim();

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
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6061'}/api/orders/${id}/images`, {
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

  if (!order) return <AuthGuard><Spinner /></AuthGuard>;

  const isTerminal = TERMINAL.includes(order.status);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6061';
  const hasChanges = !!(newStatus || notes.trim() || newImages.length > 0 ||
    parseMoney(quotation) * 1000 !== Math.round(Number(order.quotation)) ||
    (warrantyOption === 'custom' ? Number(customMonths) || 0 : Number(warrantyOption) || 0) !== Number(order.warranty_period_months));

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg pb-24">
        <PageHeader title={order.order_code} onBack={() => router.back()} />

        <div className="p-4 space-y-4">
          {/* Locked order info */}
          <Card>
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
              <span className="text-xs text-text-muted">{new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
            </div>
            <div className="space-y-1 text-sm">
              <p><span className="text-text-muted">Khách:</span> <span className="font-medium text-text-base">{order.customer_name}</span></p>
              <p><span className="text-text-muted">SĐT:</span> {/^[0-9+() \-]+$/.test(order.customer_phone) ? <a href={`tel:${order.customer_phone}`} className="text-accent underline">{order.customer_phone}</a> : <span className="text-text-base">{order.customer_phone}</span>}</p>
              <p><span className="text-text-muted">Chi nhánh:</span> <span className="text-text-base">{order.branch_name}</span></p>
              <p><span className="text-text-muted">Thiết bị:</span> <span className="text-text-base">{order.device_name}</span></p>
              {order.serial_imei && <p><span className="text-text-muted">Serial:</span> <span className="text-text-base">{order.serial_imei}</span></p>}
              <p><span className="text-text-muted">Lỗi:</span> <span className="text-text-base">{order.fault_description}</span></p>
              {order.warranty_end_date && (
                <p><span className="text-text-muted">Bảo hành đến:</span> <span className="text-text-base">{new Date(order.warranty_end_date).toLocaleDateString('vi-VN')}</span></p>
              )}
              {isTerminal && (
                <p><span className="text-text-muted">Báo giá:</span> <span className="text-text-base">{Number(order.quotation) > 0 ? `${Math.round(Number(order.quotation)).toLocaleString('vi-VN')} đ` : 'Chưa có'}</span></p>
              )}
            </div>
          </Card>

          {/* Existing images (locked, click to view fullscreen) */}
          {order.images.length > 0 && (
            <Card>
              <h3 className="font-semibold text-text-base mb-3 text-sm">Ảnh đã lưu ({order.images.length})</h3>
              <div className="grid grid-cols-3 gap-2">
                {order.images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className="block w-full h-24 rounded-lg overflow-hidden bg-surface-alt active:opacity-80"
                    aria-label="Mở ảnh đầy đủ"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${API_BASE}/uploads/${img.image_path}`}
                      alt={img.image_type}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </Card>
          )}

          <ImageLightbox
            open={lightboxIndex >= 0}
            index={Math.max(0, lightboxIndex)}
            onClose={() => setLightboxIndex(-1)}
            onIndexChange={(i) => setLightboxIndex(i)}
            images={order.images.map((img) => ({
              src: `${API_BASE}/uploads/${img.image_path}`,
              alt: img.image_type,
              downloadFilename: img.image_path.split('/').pop(),
            }))}
          />

          {/* Editable section — only when not terminal */}
          {!isTerminal && (
            <>
              {/* Quotation (appendable) */}
              <Card>
                <h3 className="font-semibold text-text-base mb-3 text-sm">Báo giá</h3>
                <div className="relative">
                  <input type="text" inputMode="numeric" value={quotation ? formatMoney(Number(quotation)) : ''}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 12);
                      setQuotation(digits);
                    }}
                    placeholder="Nhập báo giá (VNĐ)"
                    className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent caret-accent placeholder:text-text-muted pr-20" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">.000 đ</span>
                </div>
              </Card>

              {/* Warranty duration (appendable) */}
              <Card>
                <h3 className="font-semibold text-text-base mb-3 text-sm">Bảo hành</h3>
                <SegmentedControl
                  tabs={WARRANTY_MONTHS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                  active={warrantyOption}
                  onChange={setWarrantyOption}
                />
                {warrantyOption === 'custom' && (
                  <div className="mt-3 relative">
                    <input type="number" value={customMonths} onChange={(e) => setCustomMonths(e.target.value)}
                      placeholder="Số tháng"
                      className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent caret-accent placeholder:text-text-muted pr-16" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-text-muted">tháng</span>
                  </div>
                )}
              </Card>

              {/* Status change */}
              <Card>
                <h3 className="font-semibold text-text-base mb-3 text-sm">Cập nhật trạng thái</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent appearance-none pr-10">
                      <option value="">Giữ nguyên trạng thái</option>
                      {UPDATABLE_STATUSES.filter((s) => s !== order.status).map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
                  </div>
                </div>
              </Card>

              {/* TRA_HANG cancel shortcut */}
              {order.status === 'TRA_HANG' && (
                <button
                  onClick={() => { setNewStatus('HUY_TRA_MAY'); setConfirmOpen(true); }}
                  className="w-full border-2 border-red-500 text-red-400 py-4 rounded-full font-semibold text-base bg-transparent"
                >
                  Huỷ trả máy
                </button>
              )}

              {/* Notes (appendable) */}
              <Card>
                <h3 className="font-semibold text-text-base mb-3 text-sm">Ghi chú</h3>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Thêm ghi chú..." rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent caret-accent placeholder:text-text-muted resize-none" />
              </Card>

              {/* Image upload (appendable) */}
              <Card>
                <h3 className="font-semibold text-text-base mb-3 text-sm">Thêm ảnh</h3>
                <label className="w-full py-4 border-2 border-dashed border-border-subtle rounded-2xl flex flex-col items-center justify-center text-text-muted bg-surface-alt cursor-pointer active:bg-surface transition-colors">
                  <Upload size={20} className="mb-2" />
                  <span className="text-sm font-medium">{newImages.length > 0 ? `Đã chọn ${newImages.length} ảnh — chạm để thêm` : 'Chọn hình ảnh'}</span>
                  {/* No `capture` attr — that would force camera-only on mobile.
                      Without it, the OS picker offers Take Photo + Photo Library. */}
                  <input type="file" accept="image/*" multiple
                    onChange={(e) => {
                      // RH-64: capture files synchronously BEFORE the value
                      // reset — otherwise React's lazy state-updater reads
                      // an empty FileList (because e.target.value='' clears
                      // e.target.files) and the state never changes.
                      const newFiles = Array.from(e.target.files ?? []);
                      setNewImages((prev) => [...prev, ...newFiles]);
                      e.target.value = '';
                    }}
                    className="hidden" />
                </label>
                {newImages.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {newImages.map((file, i) => (
                      <ImageThumb
                        key={`${file.name}-${file.size}-${i}`}
                        file={file}
                        onRemove={() => setNewImages((prev) => prev.filter((_, j) => j !== i))}
                      />
                    ))}
                  </div>
                )}
              </Card>

              {/* Action */}
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-green-400 text-sm text-center">{success}</p>}
              <button onClick={handleUpdate} disabled={updating || !hasChanges}
                className="w-full bg-accent text-[#0B0B0B] py-4 rounded-full font-semibold text-base disabled:bg-surface disabled:text-text-muted">
                {updating ? 'Đang cập nhật...' : 'Lưu thay đổi'}
              </button>
            </>
          )}

          {/* Status history (locked, always visible) */}
          <Card>
            <h3 className="font-semibold text-text-base mb-3 text-sm">Lịch sử trạng thái</h3>
            <div className="space-y-3">
              {order.history.map((h) => (
                <div key={h.id} className="flex gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-base">
                      {h.old_status ? `${STATUS_LABELS[h.old_status]} → ` : ''}{STATUS_LABELS[h.new_status] ?? h.new_status}
                    </p>
                    <p className="text-xs text-text-muted">{h.changed_by_name} · {new Date(h.changed_at).toLocaleString('vi-VN')}</p>
                    {h.notes && <p className="text-xs text-text-muted mt-0.5 italic">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Huỷ trả máy"
        message="Xác nhận huỷ đơn này? Hành động này không thể hoàn tác."
        onConfirm={() => { setConfirmOpen(false); doUpdate(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </AuthGuard>
  );
}
