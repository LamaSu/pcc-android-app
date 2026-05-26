import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerOtaUpdater, type OtaStatus } from '../lib/ota';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? 'https://capability.network';

function SplashRoute() {
  const [otaStatus, setOtaStatus] = useState<OtaStatus>({ state: 'idle' });

  useEffect(() => {
    registerOtaUpdater(setOtaStatus).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ota] registration failed:', err);
      setOtaStatus({ state: 'error', message: String(err) });
    });
  }, []);

  return (
    <main className="page">
      <section className="page-header" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, marginBottom: 4 }}>PCC</h1>
        <p style={{ fontSize: 13 }}>Physical Capability Cloud</p>
      </section>

      <section className="card">
        <h2>Phase 2.0 — Dashboard foundations</h2>
        <p>
          This Android shell now hosts the first slice of the PCC dashboard. The
          Browse tab is the proof of concept; Jobs, Evidence, and Settings are
          scaffolded with placeholders for Phase 2.1+ port-overs.
        </p>
        <Link to="/capabilities" className="cta">
          Open capability browser
        </Link>
      </section>

      <section className="card">
        <h2>Live gateway</h2>
        <p style={{ margin: 0 }}>
          <a href={GATEWAY_URL} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-400)' }}>
            {GATEWAY_URL}
          </a>
        </p>
      </section>

      <section className="card">
        <h2>OTA status</h2>
        <pre className="ota-status">{JSON.stringify(otaStatus, null, 2)}</pre>
        <p className="note">
          On native Android, this card reports the bundle the WebView is
          currently running. In browser preview it stays <code>idle</code>.
        </p>
      </section>

      <footer className="footer">
        <small>
          v{__APP_VERSION__} ·{' '}
          <a href="https://github.com/LamaSu/pcc-android-app" target="_blank" rel="noreferrer">
            source
          </a>
        </small>
      </footer>
    </main>
  );
}

export default SplashRoute;
