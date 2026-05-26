import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor 7 shell config.
 *
 * Phase 1: minimal config + @capgo/capacitor-updater plugin pointed at the
 * production OTA manifest URL. The public key is left blank — set it via the
 * GH Actions variable VITE_OTA_PUBLIC_KEY OR by hand-editing this file once
 * `secrets/public-signing-key.pem` is generated. The plugin verifies every
 * downloaded bundle against this key before swapping the WebView root.
 */
const config: CapacitorConfig = {
  appId: 'network.capability.pcc',
  appName: 'PCC',
  webDir: 'dist',
  android: {
    // Allow plain HTTP only on localhost (dev). Production OTA / API are HTTPS.
    allowMixedContent: false,
  },
  server: {
    // Cleartext is OFF in production. For local dev against a running Vite
    // server on a physical device, override via `cap copy --target=... --server`.
    androidScheme: 'https',
  },
  plugins: {
    CapacitorUpdater: {
      // Set via env at build time OR overridden here. The shell reads at runtime.
      autoUpdate: true,
      // Production manifest endpoint — wire your CDN here once Phase 2 lands.
      // The shell polls this on each launch and on Capacitor's appStateChange
      // resume event.
      updateUrl: 'https://capability.network/android-ota/manifest.json',
      // Number of failed launches before automatic rollback to the prior bundle.
      // Default is 3; we keep it explicit.
      autoDeleteFailed: true,
      // Phase 2 TODO: paste the PEM body of secrets/public-signing-key.pem here.
      // The plugin verifies bundle signatures against this key before applying.
      // publicKey: '',
    },
  },
};

export default config;
