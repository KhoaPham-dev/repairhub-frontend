'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Customer { id: string; phone: string; name: string; address: string; type: string; notes: string }
interface Branch { id: string; name: string }
interface ApiResponse<T> { success: boolean; data: T }

const PRODUCT_TYPES = [
  { value: 'SPEAKER', label: 'Loa' },
  { value: 'HEADPHONE', label: 'Tai nghe' },
  { value: 'OTHER', label: 'Khác' },
];

export default function NewOrderPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({
    branch_id: '', product_type: 'SPEAKER', device_name: '',
    serial_imei: '', accessories: '', fault_description: '', quotation: '',
  });
  const [newCustomer, setNewCustomer] = useState({ phone: '', name: '', address: '', type: 'RETAIL' });
  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get<ApiResponse<Branch[]>>('/branches').then((r) => setBranches(r.data)).catch(() => null);
  }, []);

  useEffect(() => {
    if (customerQuery.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(() => {
      api.get<ApiResponse<Customer[]>>(`/customers/search?q=${encodeURIComponent(customerQuery)}`)
        .then((r) => setSuggestions(r.data))
        .catch(() => null);
    }, 300);
    return () => clearTimeout(t);
  }, [customerQuery]);

  function selectCustomer(c: Customer) {
    setSelectedCustomer(c);
    setCustomerQuery(c.phone);
    setSuggestions([]);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
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

      const or = await api.post<ApiResponse<{ id: string }>>('/orders', {
        customer_id: customerId,
        branch_id: form.branch_id,
        product_type: form.product_type,
        device_name: form.device_name,
        serial_imei: form.serial_imei || undefined,
        accessories: form.accessories || undefined,
        fault_description: form.fault_description,
        quotation: Number(form.quotation) || 0,
      });

      if (images.length > 0) {
        const fd = new FormData();
        images.forEach((img) => fd.append('images', img));
        fd.append('image_type', 'INTAKE');
        const token = localStorage.getItem('token');
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/orders/${or.data.id}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
      }

      router.push(`/orders/${or.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div>
        <PageHeader title="Tạo đơn mới" />
        <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-24">

          {/* Customer */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Thông tin khách hàng</h2>
            <div className="relative">
              <input
                type="tel"
                value={customerQuery}
                onChange={(e) => { setCustomerQuery(e.target.value); setSelectedCustomer(null); setNewCustomer((p) => ({ ...p, phone: e.target.value })); }}
                placeholder="Số điện thoại *"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]"
                required
              />
              {suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white shadow-lg rounded-xl z-10 mt-1 border border-gray-100">
                  {suggestions.map((s) => (
                    <button key={s.id} type="button" onClick={() => selectCustomer(s)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b border-gray-50 last:border-0">
                      <span className="font-medium">{s.phone}</span> — {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!selectedCustomer && (
              <div className="mt-3 space-y-2">
                <input value={newCustomer.name} onChange={(e) => setNewCustomer((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Tên khách hàng *" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
                <input value={newCustomer.address} onChange={(e) => setNewCustomer((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Địa chỉ" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
                <select value={newCustomer.type} onChange={(e) => setNewCustomer((p) => ({ ...p, type: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]">
                  <option value="RETAIL">Khách lẻ</option>
                  <option value="PARTNER">Đối tác</option>
                </select>
              </div>
            )}
            {selectedCustomer && (
              <div className="mt-2 p-3 bg-blue-50 rounded-xl text-sm">
                <p className="font-medium text-[#1565C0]">{selectedCustomer.name}</p>
                <p className="text-gray-600">{selectedCustomer.type === 'RETAIL' ? 'Khách lẻ' : 'Đối tác'}</p>
                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }} className="text-xs text-red-500 mt-1">Xoá chọn</button>
              </div>
            )}
          </div>

          {/* Branch & Product */}
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-gray-800">Chi nhánh & Thiết bị</h2>
            <select value={form.branch_id} onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}
              required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]">
              <option value="">Chọn chi nhánh *</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <select value={form.product_type} onChange={(e) => setForm((p) => ({ ...p, product_type: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]">
              {PRODUCT_TYPES.map((pt) => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
            </select>
            <input value={form.device_name} onChange={(e) => setForm((p) => ({ ...p, device_name: e.target.value }))}
              placeholder="Tên thiết bị *" required className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
            <input value={form.serial_imei} onChange={(e) => setForm((p) => ({ ...p, serial_imei: e.target.value }))}
              placeholder="Serial / IMEI" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
            <input value={form.accessories} onChange={(e) => setForm((p) => ({ ...p, accessories: e.target.value }))}
              placeholder="Phụ kiện kèm theo" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
            <textarea value={form.fault_description} onChange={(e) => setForm((p) => ({ ...p, fault_description: e.target.value }))}
              placeholder="Mô tả lỗi *" required rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0] resize-none" />
            <input type="number" value={form.quotation} onChange={(e) => setForm((p) => ({ ...p, quotation: e.target.value }))}
              placeholder="Báo giá (VNĐ) *" required min="0"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#1565C0]" />
          </div>

          {/* Images */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold text-gray-800 mb-3">Ảnh tiếp nhận</h2>
            <input type="file" accept="image/*" multiple capture="environment"
              onChange={(e) => setImages(Array.from(e.target.files ?? []))}
              className="w-full text-sm text-gray-600" />
            {images.length > 0 && <p className="text-sm text-[#1565C0] mt-2">Đã chọn {images.length} ảnh</p>}
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button type="submit" disabled={loading}
            className="fixed bottom-20 left-4 right-4 bg-[#1565C0] text-white py-4 rounded-xl font-semibold text-base disabled:opacity-60 shadow-lg">
            {loading ? 'Đang tạo đơn...' : 'Tạo đơn hàng'}
          </button>
        </form>
      </div>
    </AuthGuard>
  );
}
