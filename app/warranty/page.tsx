'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
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
      <div>
        <PageHeader title="Bảo hành" />
        <div className="p-4">
          <div className="flex gap-2 mb-4">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="Tìm theo SĐT, serial, tên thiết bị..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1565C0]" />
            <button onClick={search} disabled={loading}
              className="bg-[#1565C0] text-white px-5 py-3 rounded-xl text-sm font-medium disabled:opacity-60">
              Tìm
            </button>
          </div>

          {searched && results.length === 0 && (
            <Card className="text-center py-8 text-gray-400">
              <div className="text-4xl mb-2">🔍</div>
              <div>Không tìm thấy kết quả</div>
            </Card>
          )}

          <div className="space-y-4">
            {results.map((r) => {
              const intakeImgs = r.images?.filter((i) => i.image_type === 'INTAKE') ?? [];
              const completionImgs = r.images?.filter((i) => i.image_type === 'COMPLETION') ?? [];
              return (
                <Card key={r.id}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{r.order_code}</p>
                      <p className="text-xs text-gray-500">{r.customer_name} · {r.customer_phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.warranty_status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                        r.warranty_status === 'EXPIRED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {r.warranty_status === 'ACTIVE' ? 'Còn bảo hành' : r.warranty_status === 'EXPIRED' ? 'Hết bảo hành' : 'Chưa xác định'}
                      </span>
                      {r.expiring_soon && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Sắp hết hạn BH</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mb-3">
                    <p><span className="text-gray-500">Thiết bị:</span> {r.device_name}</p>
                    <p><span className="text-gray-500">Lỗi sửa:</span> {r.fault_description}</p>
                    <p><span className="text-gray-500">Giao ngày:</span> {new Date(r.updated_at).toLocaleDateString('vi-VN')}</p>
                    {r.warranty_end_date && (
                      <p><span className="text-gray-500">Hết bảo hành:</span> {new Date(r.warranty_end_date).toLocaleDateString('vi-VN')}</p>
                    )}
                  </div>
                  {(intakeImgs.length > 0 || completionImgs.length > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      {intakeImgs[0] && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Trước sửa</p>
                          <img src={`${API_BASE}/uploads/${intakeImgs[0].image_path}`} alt="before"
                            className="w-full h-28 object-cover rounded-lg" />
                        </div>
                      )}
                      {completionImgs[0] && (
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Sau sửa</p>
                          <img src={`${API_BASE}/uploads/${completionImgs[0].image_path}`} alt="after"
                            className="w-full h-28 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => router.push(`/orders/${r.id}`)}
                    className="mt-3 w-full text-center text-xs text-[#1565C0] font-medium">
                    Xem đơn hàng →
                  </button>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
