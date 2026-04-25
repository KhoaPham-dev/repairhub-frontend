'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface WarrantyResult {
  id: string; order_code: string; device_name: string; fault_description: string;
  customer_name: string; customer_phone: string; branch_name: string;
  warranty_period_months: number; warranty_end_date: string | null;
  warranty_status: 'ACTIVE' | 'EXPIRED' | 'UNKNOWN';
  expiring_soon: boolean;
  updated_at: string;
  images: { id: string; image_path: string; image_type: string }[] | null;
}

interface ApiResponse { success: boolean; data: WarrantyResult[] }

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

const WARRANTY_BADGE: Record<string, string> = {
  ACTIVE: 'bg-[#E0F2E9] text-[#1D7F54]',
  EXPIRED: 'bg-red-50 text-red-600',
  UNKNOWN: 'bg-slate-100 text-slate-600',
};

const WARRANTY_LABEL: Record<string, string> = {
  ACTIVE: 'Còn bảo hành', EXPIRED: 'Hết bảo hành', UNKNOWN: 'Chưa xác định',
};

export default function WarrantyPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WarrantyResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function search() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const r = await api.get<ApiResponse>(`/warranty/search?q=${encodeURIComponent(query)}`);
      setResults(r.data);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard>
      <div className="pb-24">
        <PageHeader title="Bảo hành" subtitle="Tra cứu thiết bị" />

        <div className="px-4 mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Tìm theo SĐT, serial, tên thiết bị..."
              className="block w-full pl-11 pr-24 py-3 bg-white rounded-2xl text-sm placeholder:text-slate-400 shadow-sm border border-slate-100 outline-none focus:border-[#004EAB] transition-colors"
            />
            <button
              onClick={search}
              disabled={loading}
              className="absolute right-2 top-1.5 bg-[#004EAB] text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60"
            >
              Tìm
            </button>
          </div>
        </div>

        <div className="px-4 space-y-4">
          {searched && results.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Không tìm thấy kết quả</div>
          )}
          {results.map((r) => {
            const intakeImgs = r.images?.filter((i) => i.image_type === 'INTAKE') ?? [];
            const completionImgs = r.images?.filter((i) => i.image_type === 'COMPLETION') ?? [];
            return (
              <div key={r.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-slate-900">{r.order_code}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.customer_name} · {r.customer_phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${WARRANTY_BADGE[r.warranty_status]}`}>
                      {WARRANTY_LABEL[r.warranty_status]}
                    </span>
                    {r.expiring_soon && (
                      <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-md font-medium">Sắp hết hạn</span>
                    )}
                  </div>
                </div>
                <div className="text-sm space-y-1.5 mb-4 text-slate-700">
                  <p><span className="text-slate-400">Thiết bị:</span> {r.device_name}</p>
                  <p><span className="text-slate-400">Lỗi sửa:</span> {r.fault_description}</p>
                  <p><span className="text-slate-400">Giao ngày:</span> {new Date(r.updated_at).toLocaleDateString('vi-VN')}</p>
                  {r.warranty_end_date && (
                    <p><span className="text-slate-400">Hết bảo hành:</span> {new Date(r.warranty_end_date).toLocaleDateString('vi-VN')}</p>
                  )}
                </div>
                {(intakeImgs.length > 0 || completionImgs.length > 0) && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {intakeImgs[0] && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Trước sửa</p>
                        <img src={`${API_BASE}/uploads/${intakeImgs[0].image_path}`} alt="before" className="w-full h-28 object-cover rounded-xl" />
                      </div>
                    )}
                    {completionImgs[0] && (
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Sau sửa</p>
                        <img src={`${API_BASE}/uploads/${completionImgs[0].image_path}`} alt="after" className="w-full h-28 object-cover rounded-xl" />
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={() => router.push(`/orders/${r.id}`)}
                  className="w-full py-3 rounded-full bg-[#004EAB] text-white font-semibold text-sm"
                >
                  Xem đơn hàng
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </AuthGuard>
  );
}
