import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseInfiniteScrollOptions<T> {
  /** Fetch a page of items. Receives `page` (0-based) and must return an array. */
  fetchPage: (page: number) => Promise<T[]>;
  /** How many items constitute a "full" page — used to detect end of list. */
  pageSize: number;
  /**
   * How many pages to load on the initial mount.
   * Defaults to 1 (normal behaviour). Pass a value > 1 to refetch multiple pages
   * on mount (e.g. when restoring a previous scroll position).
   */
  initialPageCount?: number;
}

export interface UseInfiniteScrollResult<T> {
  items: T[];
  loading: boolean;
  hasMore: boolean;
  /** Assign this ref to the sentinel element at the bottom of the list. */
  sentinelRef: React.RefCallback<Element>;
  /** Reset and reload from page 0 (e.g., after a filter change). */
  reset: () => void;
  /** Current highest loaded page index + 1 (i.e. the total number of loaded pages). */
  loadedPages: number;
}

export function useInfiniteScroll<T>({
  fetchPage,
  pageSize,
  initialPageCount = 1,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Tracks whether a fetch is in-flight so the observer doesn't double-fire.
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  // Ensures initialPageCount is only honoured on the very first effect run.
  // Subsequent runs (filter/sort changes that produce a new fetchPage reference)
  // always do a normal single-page load, not a multi-page restore.
  const initialRestoreDoneRef = useRef(false);

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
    // First-run-only semantics: use initialPageCount on the very first mount to
    // restore N pages; all subsequent runs (filter/sort changes) use count = 1.
    const count = initialRestoreDoneRef.current ? 1 : initialPageCount;
    initialRestoreDoneRef.current = true;

    setItems([]);
    setPage(0);
    hasMoreRef.current = true;
    setHasMore(true);

    if (count <= 1) {
      // Standard single-page initial load — unchanged behaviour.
      load(0, false);
      return;
    }

    // Multi-page restore fetch.
    // Bypass the guarded `load` helper so sequential pages don't trip each other's
    // in-flight guard; manage loadingRef manually instead.
    let cancelled = false;

    (async () => {
      loadingRef.current = true;
      setLoading(true);
      try {
        let allItems: T[] = [];
        let lastPage = 0;
        let more = true;

        for (let p = 0; p < count; p++) {
          if (cancelled) return;
          const pageItems = await fetchPage(p);
          allItems = [...allItems, ...pageItems];
          lastPage = p;

          if (pageItems.length < pageSize) {
            // End of list reached before filling all requested pages.
            more = false;
            break;
          }
        }

        if (!cancelled) {
          setItems(allItems);
          setPage(lastPage);
          hasMoreRef.current = more;
          setHasMore(more);
        }
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchPage, load, initialPageCount]);

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

  return { items, loading, hasMore, sentinelRef, reset, loadedPages: page + 1 };
}
