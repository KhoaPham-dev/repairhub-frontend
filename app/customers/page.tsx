'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';
import { api } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface Customer { id: string; phone: string; name: string; address: string; type: string; notes: string }
interface ApiResponse { success: boolean; data: Customer[] }

const TYPE_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'RETAIL', label: 'Khách lẻ' },
  { value: 'PARTNER', label: 'Đối tác' },
];

const LIMIT = 20;

export default function CustomersPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: '', name: '', address: '', type: 'RETAIL', notes: '' });
  const [error, setError] = useState('');

  // Debounced values used as fetch deps
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [debouncedType, setDebouncedType] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setDebouncedType(type); }, [type]);

  const fetchPage = useCallback(async (page: number): Promise<Customer[]> => {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(page * LIMIT) });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (debouncedType) params.set('type', debouncedType);
    const r = await api.get<ApiResponse>(`/customers?${params}`).catch(() => null);
    return r?.data ?? [];
  }, [debouncedSearch, debouncedType]);

  const { items: customers, loading, hasMore, sentinelRef, reset } = useInfiniteScroll<Customer>({
    fetchPage,
    pageSize: LIMIT,
  });

  async function createCustomer() {
    setError('');
    if (!form.phone || !form.name) { setError('Vui lòng nhập SĐT và tên'); return; }
    try {
      await api.post('/customers', form);
      setForm({ phone: '', name: '', address: '', type: 'RETAIL', notes: '' });
      setShowForm(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-bg pb-24">
        <div className="sticky top-0 z-10 bg-bg">
          <PageHeader
            title="Khách hàng"
            right={
              <button
                onClick={() => setShowForm((p) => !p)}
                className="w-8 h-8 flex items-center justify-center bg-accent text-[#0B0B0B] rounded-xl"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            }
          />
          <div className="px-4 pb-3 space-y-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo SĐT hoặc tên..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border-subtle bg-surface text-text-base text-sm outline-none focus:border-accent caret-accent placeholder:text-text-muted"
              />
            </div>
            <div className="flex gap-2">
              {TYPE_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${type === value ? 'bg-accent text-[#0B0B0B]' : 'bg-surface border border-border-subtle text-text-muted hover:text-text-base'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 space-y-3">
          {showForm && (
            <div className="bg-surface rounded-2xl p-4 border border-border-subtle space-y-3">
              <h3 className="font-semibold text-text-base text-sm">Thêm khách hàng</h3>
              <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="Số điện thoại *" className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent caret-accent placeholder:text-text-muted" />
              <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Họ tên *" className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent caret-accent placeholder:text-text-muted" />
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Địa chỉ" className="w-full px-4 py-2.5 rounded-xl border border-border-subtle bg-surface-alt text-text-base text-sm outline-none focus:border-accent caret-accent placeholder:text-text-muted" />
              <div className="flex gap-2">
                {[['RETAIL', 'Khách lẻ'], ['PARTNER', 'Đối tác']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, type: v }))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${form.type === v ? 'bg-accent text-[#0B0B0B] border-accent' : 'bg-surface text-text-muted border-border-subtle hover:text-text-base'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {error && <p className="text-red-500 text-xs">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => { setShowForm(false); setError(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-border-subtle text-text-muted text-sm font-medium hover:text-text-base">Huỷ</button>
                <button onClick={createCustomer}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-[#0B0B0B] text-sm font-semibold">Lưu</button>
              </div>
            </div>
          )}

          {loading && customers.length === 0 && <Spinner />}

          {!loading && customers.length === 0 && !showForm && (
            <div className="text-center py-12 text-text-muted">
              <div className="text-4xl mb-2">👥</div>
              <div className="text-sm">Chưa có khách hàng nào</div>
            </div>
          )}

          {customers.map((c) => (
            <Card key={c.id} className="cursor-pointer active:opacity-80" onClick={() => router.push(`/customers/${c.id}`)}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-text-base">{c.name}</p>
                  <p className="text-sm text-text-muted">{c.phone}</p>
                  {c.address && <p className="text-xs text-text-muted mt-0.5">{c.address}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.type === 'PARTNER' ? 'bg-purple-900/40 text-purple-400' : 'bg-surface-alt text-text-muted'}`}>
                  {c.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}
                </span>
              </div>
            </Card>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && customers.length > 0 && (
                <Loader2 size={24} className="animate-spin text-text-muted" />
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
