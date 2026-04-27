'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Customer { id: string; phone: string; name: string; address: string; type: string; notes: string }
interface ApiResponse { success: boolean; data: Customer[] }

const TYPE_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'RETAIL', label: 'Khách lẻ' },
  { value: 'PARTNER', label: 'Đối tác' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', address: '', type: 'RETAIL', notes: '' });
  const [error, setError] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    api.get<ApiResponse>(`/customers?${params}`).then((r) => setCustomers(r.data)).catch(() => null);
  }, [search, type]);

  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [load]);

  async function createCustomer() {
    setError('');
    if (!form.phone || !form.name) { setError('Vui lòng nhập SĐT và tên'); return; }
    try {
      await api.post('/customers', form);
      setForm({ phone: '', name: '', address: '', type: 'RETAIL', notes: '' });
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8F9FB] pb-24">
        <div className="sticky top-0 z-10 bg-[#F8F9FB]">
          <PageHeader
            title="Khách hàng"
            right={
              <button
                onClick={() => setShowForm((p) => !p)}
                className="w-8 h-8 flex items-center justify-center bg-[#715DF2] text-white rounded-xl"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            }
          />
          <div className="px-4 pb-3 space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo SĐT hoặc tên..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-[#715DF2]"
              />
            </div>
            <div className="flex gap-2">
              {TYPE_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${type === value ? 'bg-[#715DF2] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 space-y-3">
          {showForm && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
              <h3 className="font-semibold text-slate-900 text-sm">Thêm khách hàng</h3>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Số điện thoại *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#715DF2]" />
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Họ tên *" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#715DF2]" />
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Địa chỉ" className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#715DF2]" />
              <div className="flex gap-2">
                {[['RETAIL', 'Khách lẻ'], ['PARTNER', 'Đối tác']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, type: v }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.type === v ? 'bg-[#715DF2] text-white border-[#715DF2]' : 'bg-white text-slate-600 border-slate-200'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium">Huỷ</button>
                <button onClick={createCustomer}
                  className="flex-1 py-2.5 rounded-xl bg-[#715DF2] text-white text-sm font-semibold">Lưu</button>
              </div>
            </div>
          )}

          {customers.length === 0 && !showForm && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-sm">Chưa có khách hàng nào</div>
            </div>
          )}

          {customers.map((c) => (
            <Card key={c.id} className="cursor-pointer active:opacity-80" onClick={() => router.push(`/customers/${c.id}`)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.phone}</p>
                  {c.address && <p className="text-xs text-slate-400 mt-0.5">{c.address}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.type === 'PARTNER' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                  {c.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
