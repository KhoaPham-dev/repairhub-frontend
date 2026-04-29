import { api } from '@/lib/api';

// Mock lib/auth so no real localStorage dependency
jest.mock('@/lib/auth', () => ({
  getToken: jest.fn(),
}));

import { getToken } from '@/lib/auth';
const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;

const mockFetch = jest.fn();
global.fetch = mockFetch;

// lib/api now appends `/api` itself, so the env var is the bare host.
const API_HOST = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_BASE = `${API_HOST}/api`;

function makeResponse(body: unknown, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe('lib/api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('api.get', () => {
    it('calls fetch with correct URL', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({ data: [] }));

      await api.get('/orders');

      expect(mockFetch).toHaveBeenCalledWith(
        `${API_BASE}/orders`,
        expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'application/json' }) })
      );
    });

    it('includes Authorization header when token is present', async () => {
      mockGetToken.mockReturnValue('my-jwt-token');
      mockFetch.mockReturnValue(makeResponse({ id: 1 }));

      await api.get('/orders/1');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBe('Bearer my-jwt-token');
    });

    it('does not include Authorization header when token is null', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({}));

      await api.get('/customers');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Authorization']).toBeUndefined();
    });

    it('sets Content-Type to application/json', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({}));

      await api.get('/branches');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
    });

    it('returns parsed JSON response', async () => {
      mockGetToken.mockReturnValue(null);
      const payload = { id: 'x', name: 'Test' };
      mockFetch.mockReturnValue(makeResponse(payload));

      const result = await api.get('/resource');
      expect(result).toEqual(payload);
    });

    it('throws Error on non-ok response', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({ error: 'Not found' }, 404));

      await expect(api.get('/missing')).rejects.toThrow('Not found');
    });

    it('throws generic error when response body has no error field', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({}, 500));

      await expect(api.get('/boom')).rejects.toThrow('API error: 500');
    });

    it('throws Unauthorized on 401', async () => {
      mockGetToken.mockReturnValue('expired-token');
      mockFetch.mockReturnValue(makeResponse({}, 401));

      await expect(api.get('/protected')).rejects.toThrow('Unauthorized');
    });
  });

  describe('api.post', () => {
    it('calls fetch with POST method and JSON body', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({ id: 'new' }));

      await api.post('/orders', { item: 'phone' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/orders`);
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify({ item: 'phone' }));
    });

    it('calls fetch with POST and no body when body is omitted', async () => {
      mockGetToken.mockReturnValue(null);
      mockFetch.mockReturnValue(makeResponse({}));

      await api.post('/logout');

      const [, options] = mockFetch.mock.calls[0];
      expect(options.method).toBe('POST');
      expect(options.body).toBeUndefined();
    });
  });

  describe('api.put', () => {
    it('calls fetch with PUT method and JSON body', async () => {
      mockGetToken.mockReturnValue('tok');
      mockFetch.mockReturnValue(makeResponse({ updated: true }));

      await api.put('/orders/1', { status: 'done' });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/orders/1`);
      expect(options.method).toBe('PUT');
      expect(options.body).toBe(JSON.stringify({ status: 'done' }));
    });
  });

  describe('api.delete', () => {
    it('calls fetch with DELETE method', async () => {
      mockGetToken.mockReturnValue('tok');
      mockFetch.mockReturnValue(makeResponse(null));

      await api.delete('/orders/99');

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(`${API_BASE}/orders/99`);
      expect(options.method).toBe('DELETE');
    });
  });
});
