import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import CapabilitiesRoute from './CapabilitiesRoute';

function jsonResponse(body: unknown, init: ResponseInit = { status: 200 }): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/capabilities']}>
      <CapabilitiesRoute />
    </MemoryRouter>,
  );
}

const SAMPLE_CAPS = [
  {
    id: 'cap-fdm-001',
    kernelId: 'kernel-printshop-alpha',
    type: 'fdm',
    name: 'Prusa MK4',
    materials: ['PLA', 'PETG'],
    assuranceTiers: [0, 1, 2],
    pricing: { currency: 'USDC', baseCost: '12.50', minimum: '5.00' },
    location: { lat: 37.77, lng: -122.42 },
    queueDepth: 2,
    available: true,
    kernelName: 'PrintShop Alpha',
    kernelStatus: 'online',
  },
  {
    id: 'cap-cnc-002',
    kernelId: 'kernel-machine-shop',
    type: 'cnc-5axis',
    name: 'Haas VF-2',
    materials: ['aluminum', 'steel'],
    assuranceTiers: [1, 2, 3],
    pricing: { currency: 'USDC', baseCost: '180.00', minimum: '60.00' },
    location: { lat: 40.7, lng: -74.0 },
    queueDepth: 5,
    available: false,
    kernelName: 'East Coast Machine',
    kernelStatus: 'maintenance',
  },
];

describe('CapabilitiesRoute', () => {
  const origFetch = globalThis.fetch;

  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    globalThis.fetch = origFetch;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function mockFetchSequence(handlers: ((url: string) => Response | Promise<Response>)[]) {
    let idx = 0;
    const mockFn = vi.fn(async (input: RequestInfo | URL) => {
      const h = handlers[Math.min(idx, handlers.length - 1)];
      idx++;
      const url = typeof input === 'string' ? input : input.toString();
      return h(url);
    });
    globalThis.fetch = mockFn as unknown as typeof globalThis.fetch;
  }

  it('shows loading skeletons before data arrives', async () => {
    // Resolve fetch slowly — first the /types call, then the /list call.
    let resolveList!: (r: Response) => void;
    const slowList = new Promise<Response>((resolve) => {
      resolveList = resolve;
    });
    let typesIdx = 0;
    const slowMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/capabilities/types')) {
        typesIdx++;
        return jsonResponse({ types: ['fdm'] });
      }
      return slowList;
    });
    globalThis.fetch = slowMock as unknown as typeof globalThis.fetch;

    renderRoute();
    // Advance the 250ms debounce.
    await vi.advanceTimersByTimeAsync(260);

    // While list is pending, we expect at least one skeleton card.
    const skeletons = document.querySelectorAll('.skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(typesIdx).toBeGreaterThan(0);

    // Resolve the list call to clean up.
    resolveList(jsonResponse({ items: [], total: 0, offset: 0, limit: 50 }));
  });

  it('renders capability cards once the API responds', async () => {
    mockFetchSequence([
      () => jsonResponse({ types: ['fdm', 'cnc-5axis'] }),
      () =>
        jsonResponse({
          items: SAMPLE_CAPS,
          total: SAMPLE_CAPS.length,
          offset: 0,
          limit: 50,
        }),
    ]);

    renderRoute();
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText('Prusa MK4')).toBeInTheDocument();
    });
    expect(screen.getByText('Haas VF-2')).toBeInTheDocument();
    // status badge text
    expect(screen.getByText('online')).toBeInTheDocument();
    expect(screen.getByText('maintenance')).toBeInTheDocument();
    // price formatting
    expect(screen.getByText('12.50 USDC')).toBeInTheDocument();
    expect(screen.getByText('180.00 USDC')).toBeInTheDocument();
  });

  it('shows the empty state when the API returns no items', async () => {
    mockFetchSequence([
      () => jsonResponse({ types: [] }),
      () => jsonResponse({ items: [], total: 0, offset: 0, limit: 50 }),
    ]);

    renderRoute();
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText(/No capabilities match/i)).toBeInTheDocument();
    });
  });

  it('shows the error state when the API returns 5xx', async () => {
    mockFetchSequence([
      () => jsonResponse({ types: [] }),
      () => jsonResponse({ error: 'internal', message: 'Database is sleeping' }, { status: 503 }),
    ]);

    renderRoute();
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText(/Could not load capabilities/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Database is sleeping/i)).toBeInTheDocument();
    expect(screen.getByText(/\[503\]/)).toBeInTheDocument();
  });

  it('shows auth-required when API returns 401 and no key is set', async () => {
    mockFetchSequence([
      () => jsonResponse({ types: [] }),
      () => jsonResponse({ error: 'unauthorized', message: 'Missing Bearer token' }, { status: 401 }),
    ]);

    renderRoute();
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText(/API key required/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/Go to Settings/i)).toBeInTheDocument();
  });

  it('renders type chips when the /types endpoint responds', async () => {
    mockFetchSequence([
      () => jsonResponse({ types: ['fdm', 'cnc-5axis', 'laser-cut'] }),
      () => jsonResponse({ items: [], total: 0, offset: 0, limit: 50 }),
    ]);

    renderRoute();
    await vi.advanceTimersByTimeAsync(300);

    await waitFor(() => {
      expect(screen.getByText('fdm')).toBeInTheDocument();
    });
    expect(screen.getByText('cnc-5axis')).toBeInTheDocument();
    expect(screen.getByText('laser-cut')).toBeInTheDocument();
    expect(screen.getByText('All')).toBeInTheDocument();
  });
});
