import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseInfiniteScrollOptions<T> {
  /** Fetch a page of items. Receives `page` (0-based) and must return an array. */
  fetchPage: (page: number) => Promise<T[]>;
  /** How many items constitute a "full" page — used to detect end of list. */
  pageSize: number;
}

export interface UseInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  /** Assign this ref to the sentinel element at the bottom of the list. */
  sentinelRef: React.RefCallback<Element>;
  /** Reset and reload from page 0 (e.g., after a filter change). */
  reset: () => void;
}

export function useInfiniteScroll<T>({ fetchPage, pageSize }: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Tracks whether a fetch is in-flight so the observer doesn't double-fire.
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Keep refs in sync with state so the observer callback captures live values.
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);

  const load = useCallback(
    async (pageNum: number, append: boolean) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const newItems = await fetchPage(pageNum);
        setItems((prev) => append ? [...prev, ...newItems] : newItems);
        const more = newItems.length >= pageSize;
        hasMoreRef.current = more;
        setHasMore(more);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [fetchPage, pageSize],
  );

  // Initial load (and reload on fetchPage reference change, i.e., after reset).
  useEffect(() => {
    setItems([]);
    setPage(0);
    hasMoreRef.current = true;
    setHasMore(true);
    load(0, false);
  }, [fetchPage, load]);

  // IntersectionObserver wired to the sentinel element.
  const observerRef = useRef<IntersectionObserver | null>(null);

  const sentinelRef: React.RefCallback<Element> = useCallback(
    (node) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !loadingRef.current && hasMoreRef.current) {
            setPage((prev) => {
              const next = prev + 1;
              load(next, true);
              return next;
            });
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    [load],
  );

  const reset = useCallback(() => {
    // Changing fetchPage reference (via useCallback with new deps) triggers the
    // useEffect above; this helper exists for cases where the same function ref
    // is reused but a manual reset is desired.
    setItems([]);
    setPage(0);
    hasMoreRef.current = true;
    setHasMore(true);
    load(0, false);
  }, [load]);

  return { items, loading, hasMore, sentinelRef, reset };
}
