'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Phone, FileText, ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import SegmentedControl from '@/components/SegmentedControl';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Customer { id: string; phone: string; name: string; address: string; type: string; notes: string }
interface ApiResponse { success: boolean; data: Customer[] }

const TYPE_TABS = [
  { label: 'Tất cả', value: '' },
  { label: 'Khách lẻ', value: 'RETAIL' },
  { label: 'Đối tác', value: 'PARTNER' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const fetchCustomers = useCallback(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    api.get<ApiResponse>(`/customers?${params}`).then((r) => setCustomers(r.data)).catch(() => null);
  }, [search, type]);

  useEffect(() => { const t = setTimeout(fetchCustomers, 350); return () => clearTimeout(t); }, [fetchCustomers]);

  return (
    <AuthGuard>
      <div className="pb-24">
        <div className="px-4 pt-12 pb-4 bg-[#F8F9FB] sticky top-0 z-10 w-full">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Khách hàng</h1>
              <p className="text-sm text-slate-500">{customers.length} khách</p>
            </div>
          </div>

          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo SĐT hoặc tên..."
              className="block w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm placeholder:text-slate-400 shadow-sm border border-slate-100 outline-none focus:border-[#004EAB] transition-colors"
            />
          </div>

          <SegmentedControl tabs={TYPE_TABS} active={type} onChange={setType} />
        </div>

        <div className="px-4 space-y-3">
          {customers.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Chưa có khách hàng nào</div>
          )}
          {customers.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/customers/${c.id}`)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between active:bg-slate-50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#715DF2]/10 flex items-center justify-center text-[#715DF2] font-semibold text-sm">
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-0.5">{c.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.type === 'PARTNER' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>
                      {c.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-8 h-8 flex items-center justify-center text-[#004EAB] bg-[#e6f0fa] rounded-full">
                <ChevronRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </AuthGuard>
  );
}
