'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import Spinner from '@/components/Spinner';
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
              className="flex-1 px-4 py-3 rounded-xl border border-border-subtle bg-surface text-text-base text-sm outline-none focus:border-accent caret-accent placeholder:text-text-muted" />
            <button onClick={search} disabled={loading}
              className="bg-accent text-[#0B0B0B] px-5 py-3 rounded-xl text-sm font-medium disabled:bg-surface disabled:text-text-muted">
              Tìm
            </button>
          </div>

          {loading && <Spinner />}

          {!loading && searched && results.length === 0 && (
            <Card className="text-center py-8 text-text-muted">
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
                      <p className="font-semibold text-text-base text-sm">{r.order_code}</p>
                      <p className="text-xs text-text-muted">{r.customer_name} · {r.customer_phone}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.warranty_status === 'ACTIVE' ? 'bg-green-900/40 text-green-400' :
                        r.warranty_status === 'EXPIRED' ? 'bg-red-900/40 text-red-400' : 'bg-surface-alt text-text-muted'}`}>
                        {r.warranty_status === 'ACTIVE' ? 'Còn bảo hành' : r.warranty_status === 'EXPIRED' ? 'Hết bảo hành' : 'Chưa xác định'}
                      </span>
                      {r.expiring_soon && (
                        <span className="text-xs bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded-full">Sắp hết hạn BH</span>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mb-3">
                    <p><span className="text-text-muted">Thiết bị:</span> <span className="text-text-base">{r.device_name}</span></p>
                    <p><span className="text-text-muted">Lỗi sửa:</span> <span className="text-text-base">{r.fault_description}</span></p>
                    <p><span className="text-text-muted">Giao ngày:</span> <span className="text-text-base">{new Date(r.updated_at).toLocaleDateString('vi-VN')}</span></p>
                    {r.warranty_end_date && (
                      <p><span className="text-text-muted">Hết bảo hành:</span> <span className="text-text-base">{new Date(r.warranty_end_date).toLocaleDateString('vi-VN')}</span></p>
                    )}
                  </div>
                  {(intakeImgs.length > 0 || completionImgs.length > 0) && (
                    <div className="grid grid-cols-2 gap-2">
                      {intakeImgs[0] && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Trước sửa</p>
                          <img src={`${API_BASE}/uploads/${intakeImgs[0].image_path}`} alt="before"
                            className="w-full h-28 object-cover rounded-lg" />
                        </div>
                      )}
                      {completionImgs[0] && (
                        <div>
                          <p className="text-xs text-text-muted mb-1">Sau sửa</p>
                          <img src={`${API_BASE}/uploads/${completionImgs[0].image_path}`} alt="after"
                            className="w-full h-28 object-cover rounded-lg" />
                        </div>
                      )}
                    </div>
                  )}
                  <button onClick={() => router.push(`/orders/${r.id}`)}
                    className="mt-3 w-full text-center text-xs text-accent font-medium">
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
