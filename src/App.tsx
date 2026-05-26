import { useEffect, useState } from 'react';
import { registerOtaUpdater, type OtaStatus } from './lib/ota';

const GATEWAY_URL = 'https://capability.network';

function App() {
  const [otaStatus, setOtaStatus] = useState<OtaStatus>({ state: 'idle' });

  useEffect(() => {
    // Register the OTA updater on app launch. The updater is a no-op when
    // running in the browser (Vite dev / preview); it only does work inside
    // the Capacitor native shell.
    registerOtaUpdater(setOtaStatus).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn('[ota] registration failed:', err);
      setOtaStatus({ state: 'error', message: String(err) });
    });
  }, []);

  return (
    <main className="app">
      <header className="hero">
        <h1>PCC</h1>
        <p className="tagline">Physical Capability Cloud</p>
      </header>

      <section className="card">
        <h2>Phase 1 scaffold</h2>
        <p>
          This is the Capacitor 7 shell that will host the PCC dashboard. Phase 2 ports the
          dashboard UI in; Phase 3 enables Play Store distribution.
        </p>
        <a className="cta" href={GATEWAY_URL} target="_blank" rel="noreferrer">
          Open capability.network
        </a>
      </section>

      <section className="card">
        <h2>OTA status</h2>
        <pre className="ota-status">{JSON.stringify(otaStatus, null, 2)}</pre>
        <p className="note">
          On native Android, this card reports the bundle the WebView is currently running and any
          update downloaded from the OTA manifest. In the browser preview it stays <code>idle</code>.
        </p>
      </section>

      <footer className="footer">
        <small>
          v{__APP_VERSION__} &middot;{' '}
          <a href="https://github.com/LamaSu/pcc-android-app" target="_blank" rel="noreferrer">
            source
          </a>
        </small>
      </footer>
    </main>
  );
}

export default App;
