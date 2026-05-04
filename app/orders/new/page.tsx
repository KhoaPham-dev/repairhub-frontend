'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Upload, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import SegmentedControl from '@/components/SegmentedControl';
import ImageThumb from '@/components/ImageThumb';
import { api } from '@/lib/api';

interface Customer { id: string; phone: string; name: string; address: string; type: string; notes: string }
interface Branch { id: string; name: string }
interface WarrantyResult {
  id: string; order_code: string; device_name: string; warranty_end_date: string | null;
  warranty_status: string;
}
interface ApiResponse<T> { success: boolean; data: T }

const PRODUCT_TYPES = [
  { value: 'SPEAKER', label: 'Loa' },
  { value: 'HEADPHONE', label: 'Tai nghe' },
  { value: 'BAO_HANH', label: 'Bảo Hành' },
];


interface ProductRow {
  product_type: string;
  device_name: string;
  serial_imei: string;
  accessories: string;
  fault_description: string;
  images: File[];
}

function emptyProduct(): ProductRow {
  return {
    product_type: 'SPEAKER', device_name: '', serial_imei: '',
    accessories: '', fault_description: '', images: [],
  };
}

export default function NewOrderPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [customerQuery, setCustomerQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ phone: '', name: '', address: '', type: 'RETAIL' });
  const [products, setProducts] = useState<ProductRow[]>([emptyProduct()]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [bhWarranties, setBhWarranties] = useState<WarrantyResult[]>([]);
  const [bhSearching, setBhSearching] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyResult | null>(null);

  // RH-66: when type is PARTNER, the operator picks from a list of existing
  // partner accounts instead of searching by phone / creating on the fly.
  const [partners, setPartners] = useState<Customer[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const isPartnerMode = newCustomer.type === 'PARTNER';

  const isBaoHanhMode = products.length === 1 && products[0].product_type === 'BAO_HANH';

  const hasCustomer = !!(selectedCustomer || (newCustomer.phone.trim() && newCustomer.name.trim()));
  const allProductsFilled = products.every(
    (p) => p.device_name.trim() && p.fault_description.trim() && p.images.length > 0,
  );
  const canSubmit = !loading && !!branchId && hasCustomer && allProductsFilled;

  useEffect(() => {
    api.get<ApiResponse<Branch[]>>('/branches').then((r) => {
      setBranches(r.data);
      if (r.data.length > 0) setBranchId(r.data[0].id);
    }).catch(() => null);
  }, []);

  const [searchLoading, setSearchLoading] = useState(false);
  useEffect(() => {
    // Don't search while a customer is already selected — re-firing would
    // re-open the dropdown immediately after the operator picked someone (RH-59).
    if (selectedCustomer) { setSuggestions([]); setSearchLoading(false); return; }
    if (customerQuery.length < 1) { setSuggestions([]); setSearchLoading(false); return; }
    setSearchLoading(true);
    const t = setTimeout(() => {
      api.get<ApiResponse<Customer[]>>(`/customers/search?q=${encodeURIComponent(customerQuery)}`)
        .then((r) => setSuggestions(r.data))
        .catch(() => null)
        .finally(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery, selectedCustomer]);

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerQuery(c.phone);
    setSuggestions([]);
  }

  // RH-66: refetch the partner list whenever we enter PARTNER mode.
  useEffect(() => {
    if (!isPartnerMode) return;
    setPartnersLoading(true);
    api.get<ApiResponse<Customer[]>>('/customers?type=PARTNER&limit=50')
      .then((r) => setPartners(r.data))
      .catch(() => null)
      .finally(() => setPartnersLoading(false));
  }, [isPartnerMode]);

  // Switching customer type (Khách lẻ ↔ Đối tác) — clear any prior selection
  // so we don't submit a customer of the wrong type.
  function handleCustomerTypeChange(v: string) {
    setNewCustomer((p) => ({ ...p, type: v, name: '', address: '', phone: '' }));
    setSelectedCustomer(null);
    setCustomerQuery('');
  }

  function updateProduct(idx: number, field: keyof ProductRow, value: string | number | File[]) {
    setProducts((prev) => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  }

  function addProduct() {
    setProducts((prev) => [...prev, emptyProduct()]);
  }

  function removeProduct(idx: number) {
    setProducts((prev) => prev.filter((_, i) => i !== idx));
  }

  async function searchBhWarranties(phone: string) {
    if (!phone.trim()) return;
    setBhSearching(true);
    setBhWarranties([]);
    setSelectedWarranty(null);
    try {
      const r = await api.get<ApiResponse<WarrantyResult[]>>(`/warranty/search?q=${encodeURIComponent(phone)}`);
      setBhWarranties(r.data);
    } catch { /* ignore */ } finally {
      setBhSearching(false);
    }
  }

  useEffect(() => {
    if (isBaoHanhMode && customerQuery) searchBhWarranties(customerQuery);
    if (!isBaoHanhMode) { setBhWarranties([]); setSelectedWarranty(null); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBaoHanhMode]);

  async function handleBhSubmit() {
    if (!selectedWarranty) { setError('Vui lòng chọn đơn bảo hành'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post<ApiResponse<{ id: string }>>('/orders/warranty-claim', {
        source_order_id: selectedWarranty.id,
        branch_id: branchId,
      });
      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!branchId) { setError('Vui lòng chọn chi nhánh'); return; }

    setLoading(true);
    try {
      let customerId = selectedCustomer?.id;
      if (!customerId) {
        if (!newCustomer.phone || !newCustomer.name) {
          setError('Vui lòng nhập SĐT và tên khách hàng'); setLoading(false); return;
        }
        const cr = await api.post<ApiResponse<Customer>>('/customers', newCustomer);
        customerId = cr.data.id;
      }

      const productList = products.map((p) => ({
        product_type: p.product_type,
        device_name: p.device_name,
        serial_imei: p.serial_imei || undefined,
        accessories: p.accessories || undefined,
        fault_description: p.fault_description,
      }));

      let firstOrderId: string;

      if (productList.length === 1) {
        const or = await api.post<ApiResponse<{ id: string }>>('/orders', {
          customer_id: customerId,
          branch_id: branchId,
          ...productList[0],
        });
        firstOrderId = or.data.id;
      } else {
        const bulkRes = await api.post<ApiResponse<Array<{ id: string }>>>('/orders/bulk', {
          customer_id: customerId,
          branch_id: branchId,
          products: productList,
        });
        firstOrderId = bulkRes.data[0].id;
      }

      // Upload images for each product
      const allImages = products.flatMap((p) => p.images);
      if (allImages.length > 0) {
        const fd = new FormData();
        allImages.forEach((img) => fd.append('images', img));
        fd.append('image_type', 'INTAKE');
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/orders/${firstOrderId}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
      }

      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="pb-24 min-h-screen bg-[#F8F9FB]">
        <PageHeader title="Tạo đơn mới" subtitle="Tạo đơn sửa chữa" onBack={() => router.back()} />
        <form onSubmit={handleSubmit} className="p-4 space-y-4">

          {/* Branch */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px] mb-3">Nơi nhập hàng</h2>
            <SegmentedControl
              tabs={branches.map((b) => ({ label: b.name, value: b.id }))}
              active={branchId}
              onChange={setBranchId}
            />
          </div>

          {/* Customer type */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px] mb-3">Loại khách hàng</h2>
            <SegmentedControl
              tabs={[{ label: 'Khách lẻ', value: 'RETAIL' }, { label: 'Đối tác', value: 'PARTNER' }]}
              active={newCustomer.type}
              onChange={handleCustomerTypeChange}
            />
          </div>

          {/* Customer info */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <h2 className="font-bold text-slate-900 text-[15px] mb-4">Thông tin khách hàng</h2>

            {/* RH-66: Partner mode — pick from existing PARTNER customers */}
            {isPartnerMode && !selectedCustomer && (
              <>
                {partnersLoading ? (
                  <div className="flex items-center justify-center py-6 text-slate-400">
                    <Loader2 size={20} className="animate-spin mr-2" />
                    <span className="text-sm">Đang tải đối tác...</span>
                  </div>
                ) : partners.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    <p className="mb-2">Chưa có đối tác nào.</p>
                    <a href="/customers" className="text-[#004EAB] font-medium">Tạo đối tác mới</a>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {partners.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectCustomer(p)}
                        className="w-full text-left p-4 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm transition-colors active:bg-slate-100"
                      >
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{p.phone}{p.address ? ` · ${p.address}` : ''}</p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Retail mode — phone search + create-new (existing UI) */}
            {!isPartnerMode && (
              <>
                <div className="relative">
                  <input
                    type="tel"
                    value={customerQuery}
                    onChange={(e) => { setCustomerQuery(e.target.value); setSelectedCustomer(null); setNewCustomer((p) => ({ ...p, phone: e.target.value })); }}
                    placeholder="Số điện thoại *"
                    className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB]"
                    required
                  />
                  {searchLoading && (
                    <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" aria-label="Đang tìm" />
                  )}
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-xl z-10 mt-1 border border-slate-100">
                      {suggestions.map((s) => (
                        <button key={s.id} type="button" onClick={() => selectCustomer(s)}
                          className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0">
                          <span className="font-medium">{s.phone}</span> — {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {!selectedCustomer && (
                  <div className="mt-3 space-y-2">
                    <input value={newCustomer.name} onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Tên khách hàng *"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB]" />
                    <input value={newCustomer.address} onChange={(e) => setNewCustomer((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Địa chỉ"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB]" />
                  </div>
                )}
              </>
            )}

            {/* Selected customer summary — same for both modes */}
            {selectedCustomer && (
              <div className="mt-2 p-3 bg-blue-50 rounded-xl text-sm">
                <p className="font-medium text-[#004EAB]">{selectedCustomer.name}</p>
                <p className="text-slate-600 text-xs">{selectedCustomer.type === 'RETAIL' ? 'Khách lẻ' : 'Đối tác'}</p>
                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}
                  className="text-xs text-red-500 mt-1">Xoá chọn</button>
              </div>
            )}
          </div>

          {/* Products */}
          {products.map((product, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
              <div className="flex justify-between items-center">
                <h2 className="font-bold text-slate-900 text-[15px]">
                  {products.length > 1 ? `Sản phẩm ${idx + 1}` : 'Sản phẩm'}
                </h2>
                {products.length > 1 && (
                  <button type="button" onClick={() => removeProduct(idx)}
                    className="text-xs text-red-500 font-medium">Xoá</button>
                )}
              </div>

              {/* Product type segmented control */}
              <SegmentedControl
                tabs={PRODUCT_TYPES.map((pt) => ({ label: pt.label, value: pt.value }))}
                active={product.product_type}
                onChange={(v) => updateProduct(idx, 'product_type', v)}
              />

              {product.product_type === 'BAO_HANH' ? (
                <div className="space-y-2">
                  {!customerQuery ? (
                    <p className="text-sm text-slate-400 text-center py-4">Vui lòng nhập số điện thoại khách hàng ở trên</p>
                  ) : bhSearching ? (
                    <p className="text-sm text-slate-400 text-center py-4">Đang tìm kiếm...</p>
                  ) : bhWarranties.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Không tìm thấy bảo hành cho số <span className="font-medium text-slate-600">{customerQuery}</span></p>
                  ) : bhWarranties.map((w) => (
                    <button key={w.id} type="button"
                      onClick={() => setSelectedWarranty(selectedWarranty?.id === w.id ? null : w)}
                      className={`w-full text-left p-4 rounded-xl border text-sm transition-colors ${selectedWarranty?.id === w.id ? 'border-[#004EAB] bg-blue-50' : 'border-slate-200 bg-[#f8fafc]'}`}>
                      <p className="font-semibold text-slate-900">{w.order_code}</p>
                      <p className="text-slate-600 text-xs mt-0.5">{w.device_name}</p>
                      {w.warranty_end_date && (
                        <p className="text-xs text-slate-400 mt-0.5">Hết HH: {new Date(w.warranty_end_date).toLocaleDateString('vi-VN')}</p>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <input value={product.device_name} onChange={(e) => updateProduct(idx, 'device_name', e.target.value)}
                    placeholder="Tên thiết bị *" required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB]" />
                  <input value={product.serial_imei} onChange={(e) => updateProduct(idx, 'serial_imei', e.target.value)}
                    placeholder="Serial / IMEI"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB]" />
                  <input value={product.accessories} onChange={(e) => updateProduct(idx, 'accessories', e.target.value)}
                    placeholder="Phụ kiện kèm theo"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB]" />
                  <textarea value={product.fault_description} onChange={(e) => updateProduct(idx, 'fault_description', e.target.value)}
                    placeholder="Mô tả lỗi *" required rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-[#f8fafc] text-sm outline-none focus:border-[#004EAB] focus:ring-1 focus:ring-[#004EAB] resize-none" />

                  {/* Images */}
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Ảnh tiếp nhận</p>
                    <label className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-500 bg-[#f8fafc] cursor-pointer active:bg-slate-100 transition-colors">
                      <Upload size={20} className="mb-2" />
                      <span className="text-sm font-medium">{product.images.length > 0 ? `Đã chọn ${product.images.length} ảnh — chạm để thêm` : 'Chọn hình ảnh'}</span>
                      {/* No `capture` attr — that would force camera-only on mobile.
                          Without it, the OS picker offers Take Photo + Photo Library. */}
                      <input type="file" accept="image/*" multiple
                        onChange={(e) => {
                          const newFiles = Array.from(e.target.files ?? []);
                          updateProduct(idx, 'images', [...product.images, ...newFiles]);
                          // Reset value so the same file can be picked again after removal.
                          e.target.value = '';
                        }}
                        className="hidden" />
                    </label>
                    {product.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {product.images.map((file, imgIdx) => (
                          <ImageThumb
                            key={`${file.name}-${file.size}-${imgIdx}`}
                            file={file}
                            onRemove={() => updateProduct(idx, 'images', product.images.filter((_, i) => i !== imgIdx))}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}

          {!isBaoHanhMode && (
            <button type="button" onClick={addProduct}
              className="w-full py-3 rounded-full border-2 border-dashed border-slate-200 text-slate-500 text-sm font-medium flex items-center justify-center gap-2">
              <Plus size={18} /> Thêm sản phẩm
            </button>
          )}

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          {isBaoHanhMode ? (
            <button type="button" onClick={handleBhSubmit} disabled={loading || !selectedWarranty}
              className="w-full bg-[#004EAB] text-white py-4 rounded-full font-semibold text-base disabled:opacity-60 shadow-sm">
              {loading ? 'Đang tạo...' : 'Tạo đơn bảo hành'}
            </button>
          ) : (
            <button type="submit" disabled={!canSubmit}
              className="w-full bg-[#004EAB] text-white py-4 rounded-full font-semibold text-base disabled:opacity-60 shadow-sm">
              {loading ? 'Đang tạo đơn...' : 'Tạo đơn hàng'}
            </button>
          )}
        </form>
      </div>
    </AuthGuard>
  );
}
