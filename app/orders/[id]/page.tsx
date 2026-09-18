'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Upload, ChevronDown, Play } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import SegmentedControl from '@/components/SegmentedControl';
import ConfirmModal from '@/components/ConfirmModal';
import PendingMediaGrid from '@/components/PendingMediaGrid';
import ImageLightbox from '@/components/ImageLightbox';
import Spinner from '@/components/Spinner';
import { api } from '@/lib/api';
import { MEDIA_ACCEPT, MAX_FILES_ORDER_IMAGES, isVideoPath, pickValidMediaFiles } from '@/lib/media';

interface SourceOrderHistoryEntry {
  id: string;
  changed_by: string;
  changed_by_name: string;
  old_status: string | null;
  new_status: string;
  notes: string | null;
  changed_at: string;
}

interface OrderDetail {
  id: string; order_code: string; status: string; priority: string | null;
  customer_name: string; customer_phone: string; customer_address: string; customer_type: string;
  branch_name: string; product_type: string; device_name: string; serial_imei: string;
  accessories: string; fault_description: string; quotation: number;
  warranty_period_months: number; warranty_end_date: string | null;
  created_by_name: string; created_at: string;
  history: { id: string; old_status: string | null; new_status: string; changed_by_name: string; changed_at: string; notes: string }[];
  images: { id: string; image_path: string; image_type: string; uploaded_at: string }[];
  source_order_history: SourceOrderHistoryEntry[] | null;
  source_order_id: string | null;
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

// Statuses that require both a non-blank note and at least one fresh
// COMPLETION image before the status change is accepted (mirrors the BE
// checks in PUT /orders/:id/status). TRA_HANG no longer requires evidence.
const EVIDENCE_REQUIRED_STATUSES = ['DA_GIAO', 'HUY_TRA_MAY'];

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

// True when the order already has a COMPLETION photo or video uploaded after
// its most recent status change — i.e. a retry after an upload succeeded but
// the status PUT failed would not need another file re-selected. A video
// counts the same as a photo here; only image_type/uploaded_at matter.
//
// Only rows that are a real status transition (old_status !== new_status,
// with a null old_status counting as a transition — the order's creation
// row) count toward "latest change". Rows where old_status === new_status
// (e.g. warranty-duration edits or notes-only updates recorded via the same
// history table) must not mark an otherwise-fresh image as stale. This
// mirrors the BE freshness rule in PUT /orders/:id/status.
function hasFreshCompletionImage(order: OrderDetail): boolean {
  const latestChangeAt = order.history.reduce((max, h) => {
    if (h.old_status === h.new_status) return max;
    const t = new Date(h.changed_at).getTime();
    return Number.isFinite(t) && t > max ? t : max;
  }, 0);
  return order.images.some((img) => {
    if (img.image_type !== 'COMPLETION') return false;
    const uploadedAt = new Date(img.uploaded_at).getTime();
    return Number.isFinite(uploadedAt) && uploadedAt > latestChangeAt;
  });
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
  // Wraps the Notes + image-upload cards so the TRA_HANG cancel shortcut can
  // scroll evidence fields into view instead of jumping straight to the
  // confirm modal (which would now always fail without notes/photo).
  const evidenceSectionRef = useRef<HTMLDivElement>(null);

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
      // RH: DA_GIAO / HUY_TRA_MAY require a non-blank note and at least one
      // fresh COMPLETION image — mirrors the BE checks in
      // PUT /orders/:id/status. Guard here (in addition to disabling the
      // Save button) so retries via other paths (e.g. the HUY_TRA_MAY
      // confirm modal reusing doUpdate) still fail fast with a clear message
      // instead of round-tripping to the API.
      if (newStatus && EVIDENCE_REQUIRED_STATUSES.includes(newStatus)) {
        if (!notes.trim()) {
          throw new Error('Vui lòng nhập ghi chú khi chuyển sang trạng thái Đã giao / Huỷ trả máy');
        }
        if (newImages.length === 0 && !(order && hasFreshCompletionImage(order))) {
          throw new Error('Vui lòng tải ảnh hoặc video khi chuyển sang trạng thái Đã giao / Huỷ trả máy');
        }
      }

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

      // Upload images before the status change — the BE requires a fresh
      // COMPLETION image to already exist when it validates DA_GIAO/HUY_TRA_MAY.
      if (newImages.length > 0) {
        const fd = new FormData();
        newImages.forEach((f) => fd.append('images', f));
        fd.append('image_type', 'COMPLETION');
        const token = localStorage.getItem('token');
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6061'}/api/orders/${id}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          throw new Error((b as { error?: string })?.error || 'Tải ảnh thất bại');
        }
        // Clear immediately on success so a failure in the status call below
        // doesn't re-upload the same images as duplicates on retry.
        setNewImages([]);
      }

      // Update status if selected
      if (newStatus) {
        await api.put(`/orders/${id}/status`, { status: newStatus, notes: notes.trim() || undefined });
      }

      setNewStatus(''); setNotes('');
      setSuccess('Cập nhật thành công');
      load();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
      // Reload so hasFreshCompletionImage reflects any image that was
      // uploaded successfully before a later step in this request failed.
      load();
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

  // DA_GIAO / HUY_TRA_MAY require a non-blank note and a fresh COMPLETION
  // image — mirrors the BE validation in PUT /orders/:id/status.
  const evidenceRequired = newStatus !== '' && EVIDENCE_REQUIRED_STATUSES.includes(newStatus);
  const orderHasFreshImage = hasFreshCompletionImage(order);
  const notesRequirementUnmet = evidenceRequired && notes.trim() === '';
  const imageRequirementUnmet = evidenceRequired && newImages.length === 0 && !orderHasFreshImage;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg pb-24">
        <PageHeader title={order.order_code} onBack={() => router.back()} />

        <div className="p-4 space-y-4">
          {/* Locked order info */}
          <Card>
            <div className="flex justify-between items-start mb-3">
              <span data-testid="order-status-badge" className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">
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
                {order.images.map((img, i) => {
                  const isVideo = isVideoPath(img.image_path);
                  return (
                    <button
                      key={img.id}
                      type="button"
                      onClick={() => setLightboxIndex(i)}
                      className="relative block w-full h-24 rounded-lg overflow-hidden bg-surface-alt active:opacity-80"
                      aria-label={isVideo ? 'Mở video đầy đủ' : 'Mở ảnh đầy đủ'}
                    >
                      {isVideo ? (
                        <>
                          <video
                            src={`${API_BASE}/uploads/${img.image_path}`}
                            muted
                            preload="metadata"
                            // iOS Safari can swallow taps on a <video> element
                            // itself instead of letting them reach the
                            // wrapping button — same fix as ImageThumb.
                            className="w-full h-full object-cover pointer-events-none"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <Play size={20} className="text-white" fill="white" />
                          </span>
                        </>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`${API_BASE}/uploads/${img.image_path}`}
                          alt={img.image_type}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </button>
                  );
                })}
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
              isVideo: isVideoPath(img.image_path),
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
                  {evidenceRequired && (
                    <p className="text-xs text-red-400">
                      Bắt buộc tải lên ít nhất 1 ảnh hoặc video và nhập ghi chú khi chuyển sang trạng thái này
                      {orderHasFreshImage && ' (đã có ảnh mới)'}
                    </p>
                  )}
                </div>
              </Card>

              {/* TRA_HANG cancel shortcut — selects HUY_TRA_MAY and scrolls to
                  the notes/photo evidence fields it now requires, instead of
                  jumping straight to the confirm modal (which would always
                  fail without them). Save still opens the confirm modal. */}
              {order.status === 'TRA_HANG' && (
                <button
                  onClick={() => {
                    setNewStatus('HUY_TRA_MAY');
                    evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="w-full border-2 border-red-500 text-red-400 py-4 rounded-full font-semibold text-base bg-transparent"
                >
                  Huỷ trả máy
                </button>
              )}

              <div ref={evidenceSectionRef} className="space-y-4">
                {/* Notes (appendable) */}
                <Card className={notesRequirementUnmet ? 'border-red-500' : ''}>
                  <h3 id="ghi-chu-heading" className="font-semibold text-text-base mb-3 text-sm">
                    Ghi chú{evidenceRequired && (
                      <span className="text-red-400" aria-hidden="true"> *</span>
                    )}
                    {evidenceRequired && <span className="sr-only"> (bắt buộc)</span>}
                  </h3>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Thêm ghi chú..." rows={3}
                    aria-required={evidenceRequired}
                    aria-labelledby="ghi-chu-heading"
                    className="w-full px-4 py-3 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent caret-accent placeholder:text-text-muted resize-none" />
                </Card>

                {/* Image upload (appendable) */}
                <Card className={imageRequirementUnmet ? 'border-red-500' : ''}>
                  <h3 id="them-anh-heading" className="font-semibold text-text-base mb-3 text-sm">
                    Thêm ảnh / video{evidenceRequired && (
                      <span className="text-red-400" aria-hidden="true"> *</span>
                    )}
                    {evidenceRequired && <span className="sr-only"> (bắt buộc)</span>}
                  </h3>
                  <label className="w-full py-4 border-2 border-dashed border-border-subtle rounded-2xl flex flex-col items-center justify-center text-text-muted bg-surface-alt cursor-pointer active:bg-surface transition-colors">
                    <Upload size={20} className="mb-2" />
                    <span className="text-sm font-medium">{newImages.length > 0 ? `Đã chọn ${newImages.length} ảnh — chạm để thêm` : 'Chọn hình ảnh'}</span>
                    {/* No `capture` attr — that would force camera-only on mobile.
                        Without it, the OS picker offers Take Photo + Photo Library. */}
                    <input type="file" accept={MEDIA_ACCEPT} multiple
                      aria-required={evidenceRequired}
                      aria-labelledby="them-anh-heading"
                      onChange={(e) => {
                        // RH-64: capture files synchronously BEFORE the value
                        // reset — otherwise React's lazy state-updater reads
                        // an empty FileList (because e.target.value='' clears
                        // e.target.files) and the state never changes.
                        const picked = Array.from(e.target.files ?? []);
                        e.target.value = '';
                        const { valid, error: pickError } = pickValidMediaFiles(picked, {
                          maxCount: MAX_FILES_ORDER_IMAGES,
                          currentCount: newImages.length,
                        });
                        if (pickError) setError(pickError);
                        if (valid.length > 0) setNewImages((prev) => [...prev, ...valid]);
                      }}
                      className="hidden" />
                  </label>
                  <PendingMediaGrid
                    files={newImages}
                    onRemove={(i) => setNewImages((prev) => prev.filter((_, j) => j !== i))}
                  />
                </Card>
              </div>

              {/* Action */}
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {success && <p className="text-green-400 text-sm text-center">{success}</p>}
              <button onClick={handleUpdate} disabled={updating || !hasChanges || notesRequirementUnmet || imageRequirementUnmet}
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

          {/* Source order history — only for warranty orders (-BH) with linked source */}
          {order.source_order_history !== null && order.source_order_history.length > 0 && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-text-base text-sm">Lịch sử đơn gốc</h3>
                  <span className="text-xs bg-surface-alt text-text-muted px-2 py-0.5 rounded-full border border-border-subtle">đơn gốc</span>
                </div>
                {order.source_order_id && (
                  <a
                    href={`/orders/${order.source_order_id}`}
                    className="text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Xem đơn gốc →
                  </a>
                )}
              </div>
              <div className="space-y-3">
                {order.source_order_history.map((h) => (
                  <div key={h.id} className="flex gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-text-base">
                        {h.old_status ? `${STATUS_LABELS[h.old_status] ?? h.old_status} → ` : ''}{STATUS_LABELS[h.new_status] ?? h.new_status}
                      </p>
                      <p className="text-xs text-text-muted">{h.changed_by_name} · {new Date(h.changed_at).toLocaleString('vi-VN')}</p>
                      {h.notes && <p className="text-xs text-text-muted mt-0.5 italic">{h.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
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
