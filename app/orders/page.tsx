'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, ArrowDownNarrowWide, ArrowUpNarrowWide } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
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
  TIEP_NHAN:     'Tiếp nhận',
  DANG_KIEM_TRA: 'Kiểm tra',
  BAO_GIA:       'Báo giá',
  DANG_SUA_CHUA: 'Đang sửa',
  SUA_XONG:      'Sửa xong',
  DA_GIAO:       'Đã giao',
  TRA_HANG:      'Trả hàng',
  HUY_TRA_MAY:   'Huỷ trả máy',
  DANG_BAO_HANH: 'Đang bảo hành',
};

const PRIORITY_LABELS: Record<string, string> = { LOW: 'Thấp', MEDIUM: 'Trung bình', HIGH: 'Cao' };

const FILTERS = [
  { key: '', label: 'Tất cả' },
  { key: 'TIEP_NHAN', label: 'Tiếp nhận' },
  { key: 'DANG_KIEM_TRA', label: 'Kiểm tra' },
  { key: 'BAO_GIA', label: 'Báo giá' },
  { key: 'DANG_SUA_CHUA', label: 'Đang sửa' },
  { key: 'SUA_XONG', label: 'Sửa xong' },
  { key: 'DA_GIAO', label: 'Đã giao' },
  { key: 'TRA_HANG', label: 'Trả hàng' },
  { key: 'HUY_TRA_MAY', label: 'Huỷ trả máy' },
  { key: 'DANG_BAO_HANH', label: 'Đang bảo hành' },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const LIMIT = 20;

  const fetchOrders = useCallback(async (q: string, st: string, sort: 'desc' | 'asc', off: number, append = false) => {
    // Show the page spinner whenever we replace the list (initial load OR
    // filter/search/sort change). Pagination (`append`) keeps the existing list visible.
    if (!append) setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off), sort });
    if (q) params.set('search', q);
    if (st) {
      params.set('status', st);
    } else {
      // "Tất cả" hides terminal orders so the worklist is the active queue.
      // Operators can still drill into terminal statuses via their tabs.
      params.set('exclude_status', 'DA_GIAO,HUY_TRA_MAY');
    }
    const r = await api.get<ApiResponse>(`/orders?${params}`).catch(() => null);
    if (!append) setLoading(false);
    if (!r) return;
    setOrders((prev) => append ? [...prev, ...r.data] : r.data);
    setHasMore(r.data.length === LIMIT);
  }, []);

  useEffect(() => {
    api.get<CountResponse>('/orders/status-counts').then((r) => setCounts(r.data)).catch(() => null);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { setOffset(0); fetchOrders(search, status, sortDir, 0); }, 400);
    return () => clearTimeout(t);
  }, [search, status, sortDir, fetchOrders]);

  function loadMore() {
    const next = offset + LIMIT;
    setOffset(next);
    fetchOrders(search, status, sortDir, next, true);
  }

  // Relative time: "Vừa xong" < 60s; "X giờ trước" < 24h; "X ngày trước" otherwise.
  function relativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (diffMs < 60_000) return 'Vừa xong';
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 24) return `${Math.max(1, hours)} giờ trước`;
    return `${Math.floor(diffMs / 86_400_000)} ngày trước`;
  }

  return (
    <AuthGuard>
      <div className="pb-24">
        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-[#F8F9FB]">
          <PageHeader title="Đơn hàng" subtitle={`${orders.length} đơn`} />
          <div className="px-4 pb-3 space-y-2">
            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên thiết bị, SĐT, serial..."
                className="block w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm placeholder:text-slate-400 shadow-sm border border-slate-100 outline-none focus:border-[#004EAB] transition-colors"
              />
            </div>

            {/* Status tabs + sort toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 pb-1">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2 shrink-0">Trạng thái</span>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatus(f.key)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      status === f.key
                        ? 'bg-white shadow-sm text-slate-900'
                        : 'text-slate-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
                aria-label={sortDir === 'desc' ? 'Sắp xếp mới nhất trước' : 'Sắp xếp cũ nhất trước'}
                title={sortDir === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'}
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-slate-100 text-slate-600 active:bg-slate-50"
              >
                {sortDir === 'desc'
                  ? <ArrowDownNarrowWide size={18} />
                  : <ArrowUpNarrowWide size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Order list */}
        <div className="px-4 space-y-4">
          {loading && <Spinner />}
          {!loading && orders.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <div>Chưa có đơn hàng nào</div>
            </div>
          )}
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => router.push(`/orders/${order.id}`)}
              className={`bg-white rounded-2xl p-4 shadow-sm active:bg-slate-50 cursor-pointer transition-colors ${
                order.priority === 'HIGH'
                  ? 'border-2 border-red-500'
                  : 'border border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-slate-900">
                  {order.order_code} <span className="font-normal text-slate-500">nhận ngày {new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                </h3>
              </div>
              <p className="text-sm text-slate-700 mb-1">{order.customer_name} · {order.customer_phone}</p>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-slate-700">{order.device_name}</p>
                <ChevronRight size={18} className="text-slate-300" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                  order.status === 'DA_GIAO' ? 'bg-[#E0F2E9] text-[#1D7F54]' :
                  order.status === 'HUY_TRA_MAY' ? 'bg-red-50 text-red-600' :
                  order.status === 'DANG_BAO_HANH' ? 'bg-purple-50 text-purple-600' :
                  'bg-[#EAEFFF] text-[#004EAB]'
                }`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                {order.priority && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                    order.priority === 'HIGH' ? 'bg-orange-50 text-orange-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Ưu tiên {PRIORITY_LABELS[order.priority]}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                  {relativeTime(order.created_at)}
                </span>
              </div>
            </div>
          ))}
          {hasMore && orders.length > 0 && (
            <button onClick={loadMore} className="w-full py-3 text-sm text-[#004EAB] font-medium">
              Tải thêm
            </button>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
