import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, getApiKey, request, setApiKey } from './api';

// Loose alias so we can swap globalThis.fetch out for a vi.fn() without
// fighting the Response/Request union type during assertions.
type FetchMock = ReturnType<typeof vi.fn>;

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

describe('lib/api', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    // Clean slate.
    window.localStorage.clear();
    globalThis.fetch = vi.fn() as unknown as typeof globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.restoreAllMocks();
  });

  describe('key storage', () => {
    it('round-trips a key through localStorage', () => {
      expect(getApiKey()).toBeUndefined();
      setApiKey('pcc_test_abc');
      expect(getApiKey()).toBe('pcc_test_abc');
      setApiKey(null);
      expect(getApiKey()).toBeUndefined();
    });

    it('trims whitespace on read', () => {
      window.localStorage.setItem('PCC_API_KEY', '   pcc_pad_xyz   ');
      expect(getApiKey()).toBe('pcc_pad_xyz');
    });
  });

  describe('auth header', () => {
    it('attaches Bearer token when a key is set', async () => {
      setApiKey('pcc_live_key');
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse({ items: [], total: 0, offset: 0, limit: 50 }));

      await api.capabilities.list({ limit: 50 });

      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      const [, init] = call;
      expect(init.headers.Authorization).toBe('Bearer pcc_live_key');
    });

    it('skips Authorization when noAuth=true (used for /types)', async () => {
      setApiKey('pcc_live_should_be_skipped');
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse({ types: ['fdm'] }));

      await api.capabilities.listTypes();

      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      const [, init] = call;
      expect(init.headers.Authorization).toBeUndefined();
    });

    it('omits Authorization entirely when no key is set', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse({ types: [] }));

      await api.capabilities.list();

      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      const [, init] = call;
      expect(init.headers.Authorization).toBeUndefined();
    });
  });

  describe('error shapes', () => {
    it('parses gateway error JSON and surfaces .message', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(
        jsonResponse({ error: 'unauthorized', message: 'Invalid API key' }, { status: 401 }),
      );

      let caught: unknown;
      try {
        await api.capabilities.list();
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ApiError);
      const apiErr = caught as ApiError;
      expect(apiErr.kind).toBe('http');
      expect(apiErr.status).toBe(401);
      expect(apiErr.message).toContain('Invalid API key');
      expect(apiErr.body?.error).toBe('unauthorized');
    });

    it('classifies network errors as kind=network', async () => {
      (globalThis.fetch as unknown as FetchMock).mockRejectedValue(new TypeError('Failed to fetch'));

      let caught: unknown;
      try {
        await api.capabilities.list();
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ApiError);
      expect((caught as ApiError).kind).toBe('network');
    });

    it('classifies invalid JSON as kind=parse', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(
        new Response('not json{', { status: 200, headers: { 'Content-Type': 'application/json' } }),
      );

      let caught: unknown;
      try {
        await request('/api/capabilities');
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(ApiError);
      expect((caught as ApiError).kind).toBe('parse');
    });

    it('returns undefined on 204 No Content', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(new Response(null, { status: 204 }));
      const out = await request('/api/whatever');
      expect(out).toBeUndefined();
    });
  });

  describe('URL construction', () => {
    it('hits the default base URL when no override is set', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse({ types: [] }));
      await api.capabilities.listTypes();
      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      expect(call[0]).toBe('https://capability.network/api/capabilities/types');
    });

    it('encodes the search query', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse([]));
      await api.capabilities.search('cnc 5-axis with probe');
      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      expect(call[0]).toContain('q=cnc%205-axis%20with%20probe');
    });

    it('includes pagination params on list', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(
        jsonResponse({ items: [], total: 0, offset: 10, limit: 25 }),
      );
      await api.capabilities.list({ offset: 10, limit: 25 });
      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('offset=10');
      expect(url).toContain('limit=25');
    });
  });

  describe('endpoint helpers', () => {
    it('jobs.list passes status + kernelId filters', async () => {
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse({ jobs: [] }));
      await api.jobs.list({ kernelId: 'k-abc', status: 'running', limit: 5 });
      const call = (globalThis.fetch as unknown as FetchMock).mock.calls[0];
      const url = call[0] as string;
      expect(url).toContain('kernelId=k-abc');
      expect(url).toContain('status=running');
      expect(url).toContain('limit=5');
    });

    it('kernels.list returns the shape from the gateway', async () => {
      const payload = { kernels: [{ id: 'k1', name: 'Lab A' }] };
      (globalThis.fetch as unknown as FetchMock).mockResolvedValue(jsonResponse(payload));
      const out = await api.kernels.list();
      expect(out).toEqual(payload);
    });
  });
});
