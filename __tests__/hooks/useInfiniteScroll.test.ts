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
});
