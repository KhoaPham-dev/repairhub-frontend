import { renderHook, act, waitFor } from '@testing-library/react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// IntersectionObserver is not available in jsdom — provide a mock.
class MockIntersectionObserver {
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) { this.callback = cb; }
  observe() {}
  unobserve() {}
  disconnect() {}

  // Test helper: trigger intersection
  triggerIntersection(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

let observerInstance: MockIntersectionObserver | null = null;

beforeAll(() => {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: jest.fn().mockImplementation((cb: IntersectionObserverCallback) => {
      observerInstance = new MockIntersectionObserver(cb);
      return observerInstance;
    }),
  });
});

afterEach(() => {
  jest.clearAllMocks();
  observerInstance = null;
});

describe('useInfiniteScroll', () => {
  it('loads the first page on mount', async () => {
    const fetchPage = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]);
    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPage).toHaveBeenCalledWith(0);
    expect(result.current.items).toHaveLength(2);
  });

  it('sets hasMore false when returned items < pageSize', async () => {
    const fetchPage = jest.fn().mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);
  });

  it('sets hasMore true when returned items === pageSize', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const fetchPage = jest.fn().mockResolvedValue(items);
    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(true);
  });

  it('loads next page when sentinel intersects', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const page1 = Array.from({ length: 5 }, (_, i) => ({ id: 20 + i }));
    const fetchPage = jest.fn()
      .mockResolvedValueOnce(page0)
      .mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    // Attach sentinel ref to a fake element
    const sentinel = document.createElement('div');
    act(() => { result.current.sentinelRef(sentinel); });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(20);

    // Trigger intersection
    act(() => { observerInstance?.triggerIntersection(true); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenCalledWith(1);
    expect(result.current.items).toHaveLength(25);
    expect(result.current.hasMore).toBe(false);
  });

  it('does not fetch next page when hasMore is false', async () => {
    const fetchPage = jest.fn().mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    const sentinel = document.createElement('div');
    act(() => { result.current.sentinelRef(sentinel); });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(false);

    // Trigger intersection — should not fetch again
    act(() => { observerInstance?.triggerIntersection(true); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('resets and reloads when fetchPage reference changes', async () => {
    const items1 = [{ id: 1 }];
    const items2 = [{ id: 2 }];
    let fetchFn = jest.fn().mockResolvedValue(items1);

    const { result, rerender } = renderHook(
      ({ fn }: { fn: (page: number) => Promise<{ id: number }[]> }) =>
        useInfiniteScroll({ fetchPage: fn, pageSize: 20 }),
      { initialProps: { fn: fetchFn } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(items1);

    fetchFn = jest.fn().mockResolvedValue(items2);
    rerender({ fn: fetchFn });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual(items2);
  });

  it('calls the new fetchPage (not stale) when fetchPage reference changes', async () => {
    const fetchPage1 = jest.fn().mockResolvedValue([{ id: 1 }]);
    const fetchPage2 = jest.fn().mockResolvedValue([{ id: 2 }]);

    const { result, rerender } = renderHook(
      ({ fn }: { fn: (page: number) => Promise<{ id: number }[]> }) =>
        useInfiniteScroll({ fetchPage: fn, pageSize: 20 }),
      { initialProps: { fn: fetchPage1 } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPage1).toHaveBeenCalledWith(0);
    expect(fetchPage2).not.toHaveBeenCalled();

    // Swap to a new fetchPage reference (simulates debouncedSort changing)
    rerender({ fn: fetchPage2 });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // The reset fetch must use fetchPage2, not the stale fetchPage1
    expect(fetchPage2).toHaveBeenCalledWith(0);
    expect(result.current.items).toEqual([{ id: 2 }]);

    // fetchPage1 must not have been called again during the reset
    expect(fetchPage1).toHaveBeenCalledTimes(1);
  });

  it('does not double-fetch while already loading', async () => {
    let resolve: (v: { id: number }[]) => void;
    const deferred = new Promise<{ id: number }[]>((r) => { resolve = r; });
    const fetchPage = jest.fn().mockReturnValueOnce(deferred);

    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));
    expect(result.current.loading).toBe(true);

    const sentinel = document.createElement('div');
    act(() => { result.current.sentinelRef(sentinel); });

    // Trigger intersection while still loading
    act(() => { observerInstance?.triggerIntersection(true); });

    // Resolve the initial promise
    act(() => { resolve!([]); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // fetchPage should only have been called once (the double-fire was suppressed)
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('returns loadedPages = 1 after initial single-page load', async () => {
    const fetchPage = jest.fn().mockResolvedValue([{ id: 1 }]);
    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadedPages).toBe(1);
  });

  it('returns loadedPages incremented after sentinel loads the next page', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const page1 = Array.from({ length: 20 }, (_, i) => ({ id: 20 + i }));
    const fetchPage = jest.fn()
      .mockResolvedValueOnce(page0)
      .mockResolvedValueOnce(page1);

    const { result } = renderHook(() => useInfiniteScroll({ fetchPage, pageSize: 20 }));

    const sentinel = document.createElement('div');
    act(() => { result.current.sentinelRef(sentinel); });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.loadedPages).toBe(1);

    act(() => { observerInstance?.triggerIntersection(true); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loadedPages).toBe(2);
  });

  // -------------------------------------------------------------------------
  // initialPageCount tests
  // -------------------------------------------------------------------------

  it('fetches all initialPageCount pages on mount and accumulates items', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const page1 = Array.from({ length: 20 }, (_, i) => ({ id: 20 + i }));
    const page2 = Array.from({ length: 20 }, (_, i) => ({ id: 40 + i }));
    const fetchPage = jest.fn()
      .mockResolvedValueOnce(page0)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const { result } = renderHook(() =>
      useInfiniteScroll({ fetchPage, pageSize: 20, initialPageCount: 3 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 2);
    expect(result.current.items).toHaveLength(60);
    expect(result.current.loadedPages).toBe(3);
    expect(result.current.hasMore).toBe(true);
  });

  it('sentinel loads the page after a multi-page restore (page index = initialPageCount)', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const page1 = Array.from({ length: 20 }, (_, i) => ({ id: 20 + i }));
    const page2 = Array.from({ length: 20 }, (_, i) => ({ id: 40 + i }));
    const page3 = Array.from({ length: 5 }, (_, i) => ({ id: 60 + i }));
    const fetchPage = jest.fn()
      .mockResolvedValueOnce(page0)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2)
      .mockResolvedValueOnce(page3);

    const { result } = renderHook(() =>
      useInfiniteScroll({ fetchPage, pageSize: 20, initialPageCount: 3 }),
    );

    const sentinel = document.createElement('div');
    act(() => { result.current.sentinelRef(sentinel); });

    // Wait for all 3 restore pages to load
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(60);
    expect(result.current.loadedPages).toBe(3);

    // Sentinel fires — should request page index 3 (the 4th page)
    act(() => { observerInstance?.triggerIntersection(true); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(fetchPage).toHaveBeenCalledTimes(4);
    expect(fetchPage).toHaveBeenNthCalledWith(4, 3);
    expect(result.current.items).toHaveLength(65);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadedPages).toBe(4);
  });

  it('stops early and sets hasMore=false when a page in the restore batch is short', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    // page1 is short — end of list reached before filling 3 pages
    const page1 = Array.from({ length: 7 }, (_, i) => ({ id: 20 + i }));
    const fetchPage = jest.fn()
      .mockResolvedValueOnce(page0)
      .mockResolvedValueOnce(page1);

    const { result } = renderHook(() =>
      useInfiniteScroll({ fetchPage, pageSize: 20, initialPageCount: 3 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only fetched up to the short page; page 2 was never requested
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(result.current.items).toHaveLength(27);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.loadedPages).toBe(2);
  });

  // -------------------------------------------------------------------------
  // MUST FIX 1 — initialPageCount must be first-run-only
  // -------------------------------------------------------------------------

  it('after a multi-page restore, swapping fetchPage (filter change) triggers only ONE fetch', async () => {
    // First mount: restore 3 pages.
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));
    const page1 = Array.from({ length: 20 }, (_, i) => ({ id: 20 + i }));
    const page2 = Array.from({ length: 20 }, (_, i) => ({ id: 40 + i }));
    const fetchPage1 = jest.fn()
      .mockResolvedValueOnce(page0)
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);

    const filtered = [{ id: 100 }];
    const fetchPage2 = jest.fn().mockResolvedValue(filtered);

    const { result, rerender } = renderHook(
      ({ fn }: { fn: (page: number) => Promise<{ id: number }[]> }) =>
        useInfiniteScroll({ fetchPage: fn, pageSize: 20, initialPageCount: 3 }),
      { initialProps: { fn: fetchPage1 } },
    );

    // Wait for the full 3-page restore to complete.
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchPage1).toHaveBeenCalledTimes(3);
    expect(result.current.items).toHaveLength(60);

    // Simulate a filter change: swap to a new fetchPage reference.
    rerender({ fn: fetchPage2 });

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Must fetch only 1 page (page 0), NOT 3 pages, on the filter-change reload.
    expect(fetchPage2).toHaveBeenCalledTimes(1);
    expect(fetchPage2).toHaveBeenCalledWith(0);
    expect(result.current.items).toEqual(filtered);
  });

  // -------------------------------------------------------------------------
  // MUST FIX 4 — cancellation on unmount
  // -------------------------------------------------------------------------

  it('resolving a deferred fetchPage after unmount does not update items (cancelled guard)', async () => {
    const page0 = Array.from({ length: 20 }, (_, i) => ({ id: i }));

    // Page 1 is deferred so we can control when it resolves.
    let resolvePage1!: (v: { id: number }[]) => void;
    const deferredPage1 = new Promise<{ id: number }[]>((resolve) => {
      resolvePage1 = resolve;
    });

    const fetchPage = jest.fn()
      .mockResolvedValueOnce(page0)   // page 0: resolves immediately
      .mockReturnValueOnce(deferredPage1) // page 1: deferred
      .mockResolvedValue([]);          // page 2+: never reached

    const { unmount } = renderHook(() =>
      useInfiniteScroll({ fetchPage, pageSize: 20, initialPageCount: 3 }),
    );

    // Wait until page 0 has resolved and page 1 is in-flight.
    await waitFor(() => expect(fetchPage).toHaveBeenCalledTimes(2));

    // Unmount while page 1 is still pending.
    unmount();

    // Resolve page 1 after the component is gone.
    act(() => { resolvePage1([{ id: 100 }, { id: 101 }]); });

    // Allow all microtasks to settle.
    await act(async () => {});

    // The cancelled flag must have prevented page 2 from being requested
    // (the loop returns early after the `if (cancelled) return` check).
    // fetchPage should have been called exactly twice: page 0 and page 1.
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });
});
