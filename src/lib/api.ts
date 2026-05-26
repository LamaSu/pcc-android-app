/**
 * Tiny fetch wrapper for the PCC gateway.
 *
 * Base URL defaults to https://capability.network — override via
 * VITE_PCC_GATEWAY_URL for staging or local dev.
 *
 * Auth: reads PCC_API_KEY from one of three places (first hit wins):
 *   1. window.localStorage.PCC_API_KEY  — set this from the Settings screen
 *   2. import.meta.env.VITE_PCC_API_KEY — for dev only (.env.local)
 *   3. (none) — requests proceed without Authorization; gateway returns 401
 *      for endpoints that require auth and the caller surfaces it.
 *
 * Error model: every helper returns Promise<T> on 2xx, or throws an
 * ApiError carrying the kind (network | http | parse), HTTP status, and
 * the parsed gateway-error body when available. Callers do
 *
 *   try { ... } catch (e) {
 *     if (e instanceof ApiError && e.kind === 'http' && e.status === 401) ...
 *   }
 */

import type {
  CapabilityDTO,
  JobDTO,
  JobDetailDTO,
  KernelDTO,
  KernelHealthSnapshot,
  PaginatedResult,
  GatewayError,
} from '../types/pcc-spec';

// --------------------------------------------------------------------------
// Configuration
// --------------------------------------------------------------------------

const DEFAULT_GATEWAY = 'https://capability.network';

function getGatewayBase(): string {
  const fromEnv = (import.meta.env.VITE_PCC_GATEWAY_URL as string | undefined) ?? '';
  return fromEnv.replace(/\/$/, '') || DEFAULT_GATEWAY;
}

/**
 * Resolve the PCC API key, preferring user-set localStorage over the
 * env-baked dev key. Returns undefined if neither source has a value.
 */
export function getApiKey(): string | undefined {
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem('PCC_API_KEY');
    if (stored && stored.trim()) return stored.trim();
  }
  const envKey = (import.meta.env.VITE_PCC_API_KEY as string | undefined) ?? '';
  return envKey.trim() || undefined;
}

export function setApiKey(key: string | null): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  if (key === null || key === '') {
    window.localStorage.removeItem('PCC_API_KEY');
  } else {
    window.localStorage.setItem('PCC_API_KEY', key);
  }
}

// --------------------------------------------------------------------------
// Errors
// --------------------------------------------------------------------------

export type ApiErrorKind = 'network' | 'http' | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly body?: GatewayError;
  constructor(message: string, opts: { kind: ApiErrorKind; status?: number; body?: GatewayError }) {
    super(message);
    this.name = 'ApiError';
    this.kind = opts.kind;
    this.status = opts.status;
    this.body = opts.body;
  }
}

// --------------------------------------------------------------------------
// Core fetch
// --------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** When true, do NOT attach the Authorization header even if a key is set. */
  noAuth?: boolean;
  /** Per-request override; default 15s. */
  timeoutMs?: number;
  /** Override base URL for special cases (testing). */
  baseUrlOverride?: string;
  /** AbortSignal from caller — combined with timeout. */
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 15_000;

function makeUrl(path: string, baseUrlOverride?: string): string {
  const base = baseUrlOverride ?? getGatewayBase();
  return path.startsWith('http://') || path.startsWith('https://')
    ? path
    : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = makeUrl(path, opts.baseUrlOverride);
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (!opts.noAuth) {
    const key = getApiKey();
    if (key) headers.Authorization = `Bearer ${key}`;
  }

  const timeoutCtl = new AbortController();
  const timeoutId = setTimeout(() => timeoutCtl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  // If the caller passed a signal, abort when either fires.
  if (opts.signal) {
    if (opts.signal.aborted) timeoutCtl.abort();
    else opts.signal.addEventListener('abort', () => timeoutCtl.abort(), { once: true });
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: timeoutCtl.signal,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new ApiError(`Network error: ${message}`, { kind: 'network' });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    let parsedBody: GatewayError | undefined;
    try {
      const txt = await res.text();
      if (txt) parsedBody = JSON.parse(txt) as GatewayError;
    } catch {
      // ignore — fall through with no parsed body
    }
    const msg = parsedBody?.message ?? parsedBody?.error ?? res.statusText ?? `HTTP ${res.status}`;
    throw new ApiError(`HTTP ${res.status}: ${msg}`, {
      kind: 'http',
      status: res.status,
      body: parsedBody,
    });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (err) {
    throw new ApiError(`Failed to parse JSON response: ${(err as Error).message}`, {
      kind: 'parse',
      status: res.status,
    });
  }
}

// --------------------------------------------------------------------------
// Typed endpoint helpers (subset for Phase 2.0; extend in 2.1+)
// --------------------------------------------------------------------------

/** Capability discovery — these endpoints are PUBLIC per CLAUDE.md §3 */
export const capabilities = {
  listTypes: (signal?: AbortSignal): Promise<{ types: string[] }> =>
    request('/api/capabilities/types', { noAuth: true, signal }),

  search: (query: string, signal?: AbortSignal): Promise<CapabilityDTO[]> => {
    const q = encodeURIComponent(query);
    // search endpoint requires auth in CLAUDE.md §3 — we attach if available
    // and fall back to /capabilities listing if the user has no key set yet.
    return request(`/api/capabilities/search?q=${q}`, { signal });
  },

  list: (
    params?: { offset?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<PaginatedResult<CapabilityDTO>> => {
    const qs = new URLSearchParams();
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const suffix = qs.toString();
    return request(`/api/capabilities${suffix ? `?${suffix}` : ''}`, { signal });
  },

  getById: (capId: string, signal?: AbortSignal): Promise<CapabilityDTO> =>
    request(`/api/capabilities/${encodeURIComponent(capId)}`, { signal }),

  byKernel: (kernelId: string, signal?: AbortSignal): Promise<{ capabilities: CapabilityDTO[] }> =>
    request(`/api/capabilities/by-kernel/${encodeURIComponent(kernelId)}`, { signal }),
};

export const jobs = {
  list: (
    params?: { kernelId?: string; status?: string; offset?: number; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ jobs: JobDTO[] }> => {
    const qs = new URLSearchParams();
    if (params?.kernelId) qs.set('kernelId', params.kernelId);
    if (params?.status) qs.set('status', params.status);
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    const suffix = qs.toString();
    return request(`/api/jobs${suffix ? `?${suffix}` : ''}`, { signal });
  },

  getById: (jobId: string, signal?: AbortSignal): Promise<{ job: JobDetailDTO }> =>
    request(`/api/jobs/${encodeURIComponent(jobId)}`, { signal }),
};

export const kernels = {
  list: (signal?: AbortSignal): Promise<{ kernels: KernelDTO[] }> =>
    request('/api/kernels', { signal }),

  getById: (kernelId: string, signal?: AbortSignal): Promise<{ kernel: KernelHealthSnapshot }> =>
    request(`/api/kernels/${encodeURIComponent(kernelId)}`, { signal }),
};

export const auth = {
  validate: (signal?: AbortSignal): Promise<{ valid: boolean; operatorId?: string }> =>
    request('/api/auth/validate', { signal }),
};

// --------------------------------------------------------------------------
// Public surface
// --------------------------------------------------------------------------

export const api = {
  capabilities,
  jobs,
  kernels,
  auth,
};

// Re-export so tests / screens can construct typed requests without going
// through the namespace if they want to.
export { request };
export const __testing = {
  makeUrl,
  getGatewayBase,
};
