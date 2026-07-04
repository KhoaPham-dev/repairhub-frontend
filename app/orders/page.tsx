'use client';

import { useEffect, useLayoutEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ChevronRight, ArrowDownNarrowWide, ArrowUpNarrowWide, Loader2 } from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import PageHeader from '@/components/PageHeader';
import Spinner from '@/components/Spinner';
import { api } from '@/lib/api';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

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

const PRIORITY_LABELS: Record<string, string> = { MEDIUM: 'Trung bình', HIGH: 'Cao' };

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

const LIMIT = 20;

interface ScrollSnapshot {
  scrollTop: number;
  pages: number;
}

function OrdersPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const rawSort = searchParams.get('sort');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>(rawSort === 'desc' ? 'desc' : 'asc');

  // Debounced values used as fetch deps
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [debouncedStatus, setDebouncedStatus] = useState(status);
  const [debouncedSort, setDebouncedSort] = useState<'desc' | 'asc'>(sortDir);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setDebouncedStatus(status); }, [status]);
  useEffect(() => { setDebouncedSort(sortDir); }, [sortDir]);

  // Sync filter state to URL (throttled via debounced values)
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (debouncedStatus) params.set('status', debouncedStatus);
    if (debouncedSort !== 'asc') params.set('sort', debouncedSort);
    const qs = params.toString();
    router.replace('/orders' + (qs ? '?' + qs : ''));
  }, [debouncedSearch, debouncedStatus, debouncedSort, router]);

  // ---------------------------------------------------------------------------
  // Scroll-position restore
  // ---------------------------------------------------------------------------

  // The sessionStorage key is scoped to the current URL query string so that
  // a snapshot from one filter set does not bleed into another.
  const snapshotKey = `orders-scroll:${searchParams.toString()}`;

  // Read the snapshot from sessionStorage once at mount.
  // Using a ref guard (didReadRef) instead of a useState lazy initialiser avoids
  // the impure-initialiser problem: lazy initialisers are double-invoked under
  // React Strict Mode, which would mutate pendingRestoreRef twice.
  // The didReadRef guard makes the read one-shot on the client.
  const didReadRef = useRef(false);
  const pendingRestoreRef = useRef<ScrollSnapshot | null>(null);
  const initialPageCountRef = useRef(1);
  const restoreAppliedRef = useRef(false);

  if (!didReadRef.current) {
    didReadRef.current = true;
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(snapshotKey);
        if (raw) {
          const snap = JSON.parse(raw) as ScrollSnapshot;
          // Clamp pages: reject Infinity/NaN/negative; cap at 50 to prevent
          // unbounded sequential fetches from a tampered sessionStorage value.
          const rawPages = snap.pages;
          initialPageCountRef.current =
            Number.isFinite(rawPages) && rawPages > 0
              ? Math.min(50, Math.floor(rawPages))
              : 1;
          // Validate scrollTop; default to 0 for non-finite values.
          pendingRestoreRef.current = {
            pages: initialPageCountRef.current,
            scrollTop: Number.isFinite(snap.scrollTop) ? snap.scrollTop : 0,
          };
        }
      } catch {
        /* ignore malformed snapshot */
      }
    }
  }

  const fetchPage = useCallback(async (page: number): Promise<Order[]> => {
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(page * LIMIT),
      sort: debouncedSort,
    });
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (debouncedStatus) {
      params.set('status', debouncedStatus);
    } else {
      params.set('exclude_status', 'DA_GIAO,HUY_TRA_MAY');
    }
    const r = await api.get<ApiResponse>(`/orders?${params}`).catch(() => null);
    return r?.data ?? [];
  }, [debouncedSearch, debouncedStatus, debouncedSort]);

  const { items: orders, loading, hasMore, sentinelRef, loadedPages } = useInfiniteScroll<Order>({
    fetchPage,
    pageSize: LIMIT,
    initialPageCount: initialPageCountRef.current,
  });

  // Restore scrollTop once all requested pages have loaded and loading is done.
  // useLayoutEffect fires synchronously after DOM mutations — minimises flash.
  useLayoutEffect(() => {
    if (restoreAppliedRef.current) return;
    if (loading) return;
    if (!pendingRestoreRef.current) return;
    if (orders.length === 0) return;

    const el = document.querySelector('main');
    if (el) {
      el.scrollTop = pendingRestoreRef.current.scrollTop;
    }
    restoreAppliedRef.current = true;
    pendingRestoreRef.current = null;
    try {
      sessionStorage.removeItem(snapshotKey);
    } catch {
      // sessionStorage may be unavailable (private browsing, quota, etc.)
    }
  }, [loading, orders.length, snapshotKey]);

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
        <div className="sticky top-0 z-10 bg-bg">
          <PageHeader title="Đơn hàng" subtitle={`${orders.length} đơn`} />
          <div className="px-4 pb-3 space-y-2">
            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={18} className="text-text-muted" />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên thiết bị, SĐT, serial..."
                className="block w-full pl-11 pr-4 py-3 bg-surface rounded-2xl text-sm placeholder:text-text-muted border border-border-subtle outline-none focus:border-accent transition-colors text-text-base"
              />
            </div>

            {/* Status tabs + sort toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0 pb-1">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider mr-2 shrink-0">Trạng thái</span>
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatus(f.key)}
                    className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      status === f.key
                        ? 'bg-accent text-[#0B0B0B] shadow-sm'
                        : 'text-text-muted hover:text-text-base'
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
                className="shrink-0 w-10 h-10 flex items-center justify-center bg-surface rounded-full border border-border-subtle text-text-muted active:bg-surface-alt"
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
          {loading && orders.length === 0 && <Spinner />}
          {!loading && orders.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-2">📋</div>
              <div>Chưa có đơn hàng nào</div>
            </div>
          )}
          {orders.map((order) => (
            <div
              key={order.id}
              onClick={() => {
                // Snapshot scroll position and loaded page count before navigating.
                try {
                  const el = document.querySelector('main');
                  sessionStorage.setItem(
                    snapshotKey,
                    JSON.stringify({ scrollTop: el?.scrollTop ?? 0, pages: loadedPages }),
                  );
                } catch {
                  // sessionStorage may be unavailable (private browsing, quota, etc.)
                }
                router.push(`/orders/${order.id}`);
              }}
              className={`bg-surface rounded-2xl p-4 active:bg-surface-alt cursor-pointer transition-colors ${
                order.priority === 'HIGH'
                  ? 'border-2 border-red-500'
                  : order.priority === 'MEDIUM'
                    ? 'border-2 border-yellow-400'
                    : 'border border-border-subtle'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-semibold text-text-base">
                  {order.order_code} <span className="font-normal text-text-muted">nhận ngày {new Date(order.created_at).toLocaleDateString('vi-VN')}</span>
                </h3>
              </div>
              <p className="text-sm text-text-base mb-1">{order.customer_name} · {order.customer_phone}</p>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-text-base">{order.device_name}</p>
                <ChevronRight size={18} className="text-text-muted" />
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                  order.status === 'DA_GIAO' ? 'bg-green-900/40 text-green-400' :
                  order.status === 'HUY_TRA_MAY' ? 'bg-red-900/40 text-red-400' :
                  order.status === 'DANG_BAO_HANH' ? 'bg-purple-900/40 text-purple-400' :
                  'bg-accent/10 text-accent'
                }`}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </span>
                {order.priority && (
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                    order.priority === 'HIGH'
                      ? 'bg-red-900/40 text-red-400'
                      : order.priority === 'MEDIUM'
                        ? 'bg-yellow-900/40 text-yellow-400'
                        : 'bg-surface-alt text-text-muted'
                  }`}>
                    Ưu tiên {PRIORITY_LABELS[order.priority]}
                  </span>
                )}
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-surface-alt text-text-muted">
                  {relativeTime(order.created_at)}
                </span>
              </div>
            </div>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loading && orders.length > 0 && (
                <Loader2 size={24} className="animate-spin text-text-muted" />
              )}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}

export default function OrdersPage() {
  return (
    <Suspense>
      <OrdersPageInner />
    </Suspense>
  );
}
