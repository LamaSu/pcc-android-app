import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError, getApiKey } from '../lib/api';
import { statusColor } from '../design-tokens';
import type { CapabilityDTO } from '../types/pcc-spec';

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'refreshing'; previous: CapabilityDTO[] }
  | { kind: 'ready'; items: CapabilityDTO[] }
  | { kind: 'empty' }
  | { kind: 'auth-required' }
  | { kind: 'error'; message: string; status?: number };

/**
 * Capabilities discovery — the Phase 2.0 proof-of-concept.
 *
 * - Loads /api/capabilities/types (public) and renders type chips
 * - Loads /api/capabilities (paginated) for the body list
 * - On search, hits /api/capabilities/search?q=
 * - Pull-to-refresh: touch-drag from top OR a manual refresh button
 * - Renders a tappable card per capability; tap navigates to a
 *   placeholder detail screen (Phase 2.1+ wires the full view)
 *
 * Empty / loading / auth-required / error states are all handled.
 * Search is debounced 250ms.
 */
function CapabilitiesRoute() {
  const [state, setState] = useState<LoadState>({ kind: 'idle' });
  const [types, setTypes] = useState<string[]>([]);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      // Cancel any in-flight request.
      abortRef.current?.abort();
      const ctl = new AbortController();
      abortRef.current = ctl;

      const previous =
        state.kind === 'ready' || state.kind === 'refreshing'
          ? state.kind === 'ready'
            ? state.items
            : state.previous
          : [];

      setState(
        mode === 'refresh' && previous.length > 0
          ? { kind: 'refreshing', previous }
          : { kind: 'loading' },
      );

      try {
        const trimmed = query.trim();
        let items: CapabilityDTO[];
        if (trimmed) {
          items = await api.capabilities.search(trimmed, ctl.signal);
        } else {
          const page = await api.capabilities.list({ limit: 50 }, ctl.signal);
          items = page.items ?? [];
        }
        if (activeType) {
          items = items.filter((c) => c.type === activeType);
        }
        if (items.length === 0) {
          setState({ kind: 'empty' });
        } else {
          setState({ kind: 'ready', items });
        }
      } catch (err) {
        if (ctl.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) {
          if (!getApiKey()) {
            setState({ kind: 'auth-required' });
            return;
          }
        }
        const message =
          err instanceof ApiError ? `${err.message}` : err instanceof Error ? err.message : String(err);
        const status = err instanceof ApiError ? err.status : undefined;
        setState({ kind: 'error', message, status });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [query, activeType],
  );

  // Load type list once on mount. The /types endpoint is PUBLIC.
  useEffect(() => {
    const ctl = new AbortController();
    api.capabilities
      .listTypes(ctl.signal)
      .then((res) => setTypes(res.types ?? []))
      .catch((err) => {
        if (!ctl.signal.aborted) {
          // eslint-disable-next-line no-console
          console.warn('[capabilities] could not fetch type list:', err);
        }
      });
    return () => ctl.abort();
  }, []);

  // Initial body load + reload when filter/search changes (debounced).
  useEffect(() => {
    const t = setTimeout(() => {
      void load('initial');
    }, 250);
    return () => {
      clearTimeout(t);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeType]);

  return (
    <main className="page">
      <header className="page-header">
        <h1>Capabilities</h1>
        <p>Browse the live PCC capability network.</p>
      </header>

      <input
        className="input"
        type="search"
        placeholder="Search by name, type, or material…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search capabilities"
      />

      {types.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'none',
          }}
        >
          <TypeChip label="All" active={activeType === null} onClick={() => setActiveType(null)} />
          {types.slice(0, 24).map((t) => (
            <TypeChip
              key={t}
              label={t}
              active={activeType === t}
              onClick={() => setActiveType(activeType === t ? null : t)}
            />
          ))}
        </div>
      )}

      <RefreshButton state={state} onRefresh={() => load('refresh')} />

      <CapabilitiesBody state={state} />
    </main>
  );
}

function TypeChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: '0 0 auto',
        padding: '6px 12px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--primary-400)' : 'var(--glass-border)'}`,
        background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
        color: active ? 'var(--primary-300)' : 'var(--fg-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'lowercase',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function RefreshButton({ state, onRefresh }: { state: LoadState; onRefresh: () => void }) {
  const refreshing = state.kind === 'refreshing' || state.kind === 'loading';
  return (
    <button
      type="button"
      className="cta secondary"
      onClick={onRefresh}
      disabled={refreshing}
      style={{ alignSelf: 'flex-start' }}
    >
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}

function CapabilitiesBody({ state }: { state: LoadState }) {
  if (state.kind === 'idle') {
    return null;
  }

  if (state.kind === 'loading') {
    return (
      <div className="cap-list">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton" style={{ height: 88 }} />
        ))}
      </div>
    );
  }

  if (state.kind === 'auth-required') {
    return (
      <section className="card">
        <h2>API key required</h2>
        <p>
          The PCC gateway returned 401 for this listing. Set a key in Settings
          to browse non-public capabilities.
        </p>
        <Link to="/settings" className="cta">
          Go to Settings
        </Link>
      </section>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="error-state">
        <strong>Could not load capabilities.</strong>
        <div style={{ marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {state.status ? `[${state.status}] ` : ''}{state.message}
        </div>
      </div>
    );
  }

  if (state.kind === 'empty') {
    return (
      <div className="empty-state">
        No capabilities match. Try clearing the filter or search.
      </div>
    );
  }

  const items =
    state.kind === 'ready'
      ? state.items
      : state.kind === 'refreshing'
        ? state.previous
        : [];

  return (
    <div className="cap-list" data-testid="cap-list">
      {items.map((cap) => (
        <CapabilityCard key={cap.id} cap={cap} />
      ))}
    </div>
  );
}

function CapabilityCard({ cap }: { cap: CapabilityDTO }) {
  const status = cap.kernelStatus ?? (cap.available ? 'online' : 'offline');
  const badgeColor = statusColor[status] ?? statusColor.unknown;
  const price = formatPrice(cap);

  return (
    <Link
      to={`/capabilities/${encodeURIComponent(cap.id)}`}
      className="card tappable"
      data-testid={`cap-card-${cap.id}`}
      style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
    >
      <div className="cap-card-header">
        <h3 className="cap-card-title">{cap.name}</h3>
        <span className="badge" style={{ color: badgeColor }}>
          {status}
        </span>
      </div>
      <p className="cap-card-kernel">
        {cap.type} · {cap.kernelName ?? cap.kernelId}
      </p>
      <div className="cap-card-meta">
        <span>
          queue <strong>{cap.queueDepth ?? 0}</strong>
        </span>
        {cap.estimatedWaitMinutes !== undefined && (
          <span>
            wait <strong>{cap.estimatedWaitMinutes}m</strong>
          </span>
        )}
        <span>
          <strong>{price}</strong>
        </span>
      </div>
    </Link>
  );
}

function formatPrice(cap: CapabilityDTO): string {
  const p = cap.pricing;
  if (!p) return '—';
  const base = p.baseCost ?? p.minimum ?? '0';
  return `${base} ${p.currency ?? 'USDC'}`;
}

export default CapabilitiesRoute;
