'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Customer { id: string; phone: string; name: string; address: string; type: string; notes: string }
interface ApiResponse { success: boolean; data: Customer[] }

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');

  const fetch = useCallback(() => {
    const params = new URLSearchParams({ limit: '50' });
    if (search) params.set('search', search);
    if (type) params.set('type', type);
    api.get<ApiResponse>(`/customers?${params}`).then((r) => setCustomers(r.data)).catch(() => null);
  }, [search, type]);

  useEffect(() => { const t = setTimeout(fetch, 350); return () => clearTimeout(t); }, [fetch]);

  return (
    <AuthGuard>
      <div>
        <PageHeader title="Khách hàng" />
        <div className="p-4">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo SĐT hoặc tên..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm mb-3 outline-none focus:border-[#1565C0]" />
          <div className="flex gap-2 mb-4">
            {[['', 'Tất cả'], ['RETAIL', 'Khách lẻ'], ['PARTNER', 'Đối tác']].map(([v, l]) => (
              <button key={v} onClick={() => setType(v)}
                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${type === v ? 'bg-[#1565C0] text-white' : 'border border-gray-200 bg-white text-gray-600'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {customers.length === 0 && (
              <Card className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">👥</div>
                <div>Chưa có khách hàng nào</div>
              </Card>
            )}
            {customers.map((c) => (
              <Card key={c.id} className="cursor-pointer active:opacity-80" onClick={() => router.push(`/customers/${c.id}`)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-500">{c.phone}</p>
                    {c.address && <p className="text-xs text-gray-400 mt-1">{c.address}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.type === 'PARTNER' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {c.type === 'PARTNER' ? 'Đối tác' : 'Khách lẻ'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
