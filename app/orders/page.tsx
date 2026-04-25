'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Card from '@/components/Card';
import AuthGuard from '@/components/AuthGuard';
import { api } from '@/lib/api';

interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  device_name: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  created_at: string;
  branch_name: string;
}

interface ApiResponse { success: boolean; data: Order[] }
interface CountResponse { success: boolean; data: Record<string, number> }

const STATUS_LABELS: Record<string, string> = {
  TIEP_NHAN: 'Tiếp nhận', DANG_KIEM_TRA: 'Đang kiểm tra', BAO_GIA: 'Báo giá',
  CHO_LINH_KIEN: 'Chờ linh kiện', DANG_SUA_CHUA: 'Đang sửa chữa',
  KIEM_TRA_LAI: 'Kiểm tra lại', SUA_XONG: 'Sửa xong',
  DA_GIAO: 'Đã giao', HUY_TRA_MAY: 'Huỷ/Trả máy',
};

const PRIORITY_COLORS = { LOW: 'bg-green-100 text-green-700', MEDIUM: 'bg-yellow-100 text-yellow-700', HIGH: 'bg-red-100 text-red-700' };
const PRIORITY_LABELS = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' };

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'TIEP_NHAN', label: 'Tiếp nhận' },
  { key: 'DANG_KIEM_TRA', label: 'Đang kiểm tra' },
  { key: 'DANG_SUA_CHUA', label: 'Đang sửa' },
  { key: 'SUA_XONG', label: 'Sửa xong' },
  { key: 'DA_GIAO', label: 'Đã giao' },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const LIMIT = 20;

  const fetchOrders = useCallback(async (q: string, st: string, off: number, append = false) => {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (q) params.set('search', q);
    if (st) params.set('status', st);
    const r = await api.get<ApiResponse>(`/orders?${params}`).catch(() => null);
    if (!r) return;
    setOrders((prev) => append ? [...prev, ...r.data] : r.data);
    setHasMore(r.data.length === LIMIT);
  }, []);

  useEffect(() => {
    api.get<CountResponse>('/orders/status-counts').then((r) => setCounts(r.data)).catch(() => null);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); fetchOrders(search, status, 0); }, 400);
    return () => clearTimeout(t);
  }, [search, status, fetchOrders]);

  function loadMore() {
    const next = offset + LIMIT;
    setOffset(next);
    fetchOrders(search, status, next, true);
  }

  return (
    <AuthGuard>
      <div>
        <PageHeader title="Đơn hàng" />
        <div className="p-4">
          <div className="relative mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo SĐT, mã đơn, serial..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm outline-none focus:border-[#1565C0]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  status === f.key
                    ? 'bg-[#1565C0] text-white'
                    : 'border border-gray-200 bg-white text-gray-600'
                }`}
              >
                {f.label}{f.key && counts[f.key] ? ` (${counts[f.key]})` : ''}
              </button>
            ))}
          </div>

          <div className="flex justify-end mb-3">
            <button
              onClick={() => router.push('/orders/new')}
              className="bg-[#1565C0] text-white px-4 py-2 rounded-xl text-sm font-medium"
            >
              + Tạo đơn mới
            </button>
          </div>

          <div className="space-y-3">
            {orders.length === 0 && (
              <Card className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">📋</div>
                <div>Chưa có đơn hàng nào</div>
              </Card>
            )}
            {orders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer active:opacity-80"
                onClick={() => router.push(`/orders/${order.id}`)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm">{order.order_code}</p>
                    <p className="text-sm text-gray-600 truncate">{order.customer_name} · {order.customer_phone}</p>
                    <p className="text-xs text-gray-400 mt-1">{order.device_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                    {order.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLORS[order.priority]}`}>
                        {PRIORITY_LABELS[order.priority]}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
            {hasMore && orders.length > 0 && (
              <button onClick={loadMore} className="w-full py-3 text-sm text-[#1565C0] font-medium">
                Tải thêm
              </button>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
