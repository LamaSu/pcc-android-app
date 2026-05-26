import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getApiKey, setApiKey } from '../lib/api';

/**
 * Settings is mostly a placeholder for Phase 2.1+, but the API-key
 * input is wired now so users can actually authenticate against the
 * gateway before more screens land. Persists to localStorage; survives
 * app restarts.
 */
function SettingsRoute() {
  const [key, setKey] = useState<string>('');
  const [persisted, setPersisted] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const current = getApiKey();
    setPersisted(current);
    if (current) setKey(current);
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (key.trim()) {
      setApiKey(key.trim());
      setPersisted(key.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    }
  }

  function handleClear() {
    setApiKey(null);
    setKey('');
    setPersisted(undefined);
  }

  return (
    <main className="page">
      <header className="page-header">
        <h1>Settings</h1>
        <p>API key, theme, and operator preferences.</p>
      </header>

      <section className="card">
        <h2>PCC API key</h2>
        <p>
          Provision a key via{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: 4 }}>
            POST /api/auth/provision
          </code>{' '}
          on the gateway, then paste it here. Stored in browser localStorage —
          cleared by &quot;Clear&quot; or by uninstalling the app.
        </p>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="input"
            type="password"
            inputMode="text"
            autoComplete="off"
            placeholder="pcc_live_..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            aria-label="PCC API key"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="cta" disabled={!key.trim()}>
              {saved ? 'Saved' : 'Save'}
            </button>
            {persisted && (
              <button type="button" className="cta secondary" onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </form>
        {persisted && (
          <p className="note" style={{ marginTop: 12 }}>
            Current key: <code>{persisted.slice(0, 10)}…{persisted.slice(-4)}</code>
          </p>
        )}
      </section>

      <section className="card glass">
        <h2>Operator surface (Phase 2.1+)</h2>
        <p>Coming next: kernel registration, theme selection, push-notification opt-in, offline-evidence cache size.</p>
        <Link to="/kernels" className="cta secondary">
          Kernels (placeholder)
        </Link>
      </section>
    </main>
  );
}

export default SettingsRoute;
