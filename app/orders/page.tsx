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

// Module-scoped restore intent. On a back-navigation the orders page does NOT
// mount once — framer-motion's <AnimatePresence mode="wait"> (in the layout's
// PageTransition) remounts it ~200ms later, so there are multiple short-lived
// instances. If each instance read+cleared sessionStorage, the FIRST one would
// consume the snapshot and die, leaving the surviving instance with nothing to
// restore. Promoting the snapshot to module scope lets every instance in the
// remount burst restore from the same intent. sessionStorage is still cleared on
// first read so a later *fresh* visit to the same URL won't wrongly restore.
interface RestoreIntent { key: string; scrollTop: number; pages: number; expiresAt: number }
let restoreIntent: RestoreIntent | null = null;
// Long enough to cover the remount burst plus a slow multi-page refetch on the
// surviving instance, short enough that an unrelated later visit won't collide.
const RESTORE_TTL_MS = 3000;

function takeRestoreIntent(key: string): RestoreIntent | null {
  const now = Date.now();
  // A fresh sessionStorage snapshot (just written on a card tap) always wins over
  // any lingering module intent, so rapid tap→back→tap→back restores the latest.
  if (typeof window !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const snap = JSON.parse(raw) as ScrollSnapshot;
        // One-shot: consume immediately so a fresh (non-back) visit won't restore.
        // Note: the TTL and this consume-once solve *different* problems — the TTL
        // bounds the module-scope fallback across the remount burst; removing the
        // key here is what prevents a later non-back navigation from restoring.
        sessionStorage.removeItem(key);
        // Clamp pages (reject Infinity/NaN/negative; cap at 50) to bound refetches
        // against a tampered value; validate scrollTop.
        const pages = Number.isFinite(snap.pages) && snap.pages > 0 ? Math.min(50, Math.floor(snap.pages)) : 1;
        const scrollTop = Number.isFinite(snap.scrollTop) && snap.scrollTop > 0 ? snap.scrollTop : 0;
        restoreIntent = { key, scrollTop, pages, expiresAt: now + RESTORE_TTL_MS };
        return restoreIntent;
      }
    } catch {
      /* ignore malformed snapshot */
    }
  }
  // sessionStorage already consumed (remount burst) — fall back to module intent.
  if (restoreIntent && restoreIntent.expiresAt <= now) restoreIntent = null; // expired
  if (restoreIntent && restoreIntent.key === key) return restoreIntent;
  return null;
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

  // Sync filter state to URL (throttled via debounced values).
  // Skip the initial run: on mount the filter state is initialised FROM the URL,
  // so re-writing the same URL is redundant AND triggers a router navigation that
  // remounts this page — which would discard the multi-page scroll restore below.
  const didSyncMountRef = useRef(false);
  useEffect(() => {
    if (!didSyncMountRef.current) {
      didSyncMountRef.current = true;
      return;
    }
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (debouncedStatus) params.set('status', debouncedStatus);
    if (debouncedSort !== 'asc') params.set('sort', debouncedSort);
    const qs = params.toString();
    // scroll:false — syncing filter state to the URL must not reset scroll.
    router.replace('/orders' + (qs ? '?' + qs : ''), { scroll: false });
  }, [debouncedSearch, debouncedStatus, debouncedSort, router]);

  // ---------------------------------------------------------------------------
  // Scroll-position restore
  // ---------------------------------------------------------------------------

  // The sessionStorage key is scoped to the current URL query string so that
  // a snapshot from one filter set does not bleed into another.
  const snapshotKey = `orders-scroll:${searchParams.toString()}`;

  // Take the restore intent once per instance (ref-guarded so React Strict Mode's
  // double render doesn't matter). takeRestoreIntent promotes it to module scope
  // and clears sessionStorage on first read, so this survives the remount burst.
  // Freeze the values in refs so later renders (e.g. after the module intent is
  // cleared) can't flip initialPageCount back to 1 and reset the list.
  const intentReadRef = useRef(false);
  const initialPageCountRef = useRef(1);
  const restoreScrollTopRef = useRef(0);
  const shouldRestoreRef = useRef(false);
  const restoreAppliedRef = useRef(false);
  if (!intentReadRef.current) {
    intentReadRef.current = true;
    const it = takeRestoreIntent(snapshotKey);
    if (it) {
      initialPageCountRef.current = it.pages;
      restoreScrollTopRef.current = it.scrollTop;
      shouldRestoreRef.current = true;
    }
  }
  const initialPageCount = initialPageCountRef.current;

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
    initialPageCount,
  });

  // Restore the saved scroll position once the requested pages have loaded.
  // useLayoutEffect fires synchronously after DOM mutations — minimises flash.
  useLayoutEffect(() => {
    if (restoreAppliedRef.current) return;
    if (!shouldRestoreRef.current) return;
    if (loading || orders.length === 0) return;

    restoreAppliedRef.current = true;
    const target = restoreScrollTopRef.current;
    const el = document.querySelector('main');
    if (!el) return;
    el.scrollTop = target;

    if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') return;

    // After a back-navigation Next.js App Router performs its OWN scroll a few
    // frames later (it scrolls the route's top into view, natively resetting
    // <main> to 0), which clobbers the assignment above. Re-assert the target
    // every frame for a short window to win that race. Abort the instant the
    // user scrolls so we never fight a real gesture. The loop is intentionally
    // NOT tied to this effect's cleanup: its deps change during the mount burst,
    // and framer-motion remounts this page ~200ms after back-nav — a cleanup
    // would kill the loop mid-window. It is self-terminating (bounded window).
    let aborted = false;
    let rafId = 0;
    const stop = () => {
      aborted = true;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
      restoreIntent = null; // consumed — no further restores for this intent
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('keydown', stop); // not passive — keydown doesn't affect scroll perf

    const startTs = Date.now();
    const startPath = window.location.pathname;
    const reassert = () => {
      if (aborted) return;
      // Stop if we've navigated away — never scroll a different page.
      if (window.location.pathname !== startPath) { stop(); return; }
      el.scrollTop = target;
      if (Date.now() - startTs < 500) {
        rafId = requestAnimationFrame(reassert);
      } else {
        stop();
      }
    };
    rafId = requestAnimationFrame(reassert);
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
                // Only when settled: mid-load `loadedPages` is optimistic (the page
                // index increments before the fetch resolves), so snapshotting while
                // loading would record one extra page and over-fetch on restore.
                try {
                  if (!loading) {
                    const el = document.querySelector('main');
                    sessionStorage.setItem(
                      snapshotKey,
                      JSON.stringify({ scrollTop: el?.scrollTop ?? 0, pages: loadedPages }),
                    );
                  }
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
