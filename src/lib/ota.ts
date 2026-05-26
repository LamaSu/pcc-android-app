/**
 * OTA (over-the-air) update registration via @capgo/capacitor-updater.
 *
 * This module is the client-side hook stub for Phase 1. It registers the
 * updater on app launch and exposes a status callback so the UI can display
 * what bundle is currently running and whether an update is queued.
 *
 * On the web (Vite dev server / preview build), the @capgo/capacitor-updater
 * plugin is a no-op — its native bridge methods reject. We treat that as
 * `idle` and surface a friendly message rather than an error.
 *
 * Phase 2 work:
 *  - Wire the actual manifest fetch + signature verification (see scripts/ota-sign.mjs)
 *  - Add rollback on three consecutive failed launches
 *  - Add download-progress UI
 *  - Wire VITE_OTA_PUBLIC_KEY for client-side signature verification
 *
 * Manifest contract (served from VITE_OTA_MANIFEST_URL, default
 * https://capability.network/android-ota/manifest.json):
 *   {
 *     "version": "0.1.1",
 *     "url": "https://capability.network/android-ota/bundles/0.1.1.zip",
 *     "checksum": "sha256-<base64>",
 *     "signature": "ed25519-<base64>",
 *     "minNativeVersion": "0.1.0"
 *   }
 */

import { Capacitor } from '@capacitor/core';

export type OtaStatus =
  | { state: 'idle' }
  | { state: 'web-noop'; message: string }
  | { state: 'checking' }
  | { state: 'up-to-date'; current: string }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; nextVersion: string }
  | { state: 'error'; message: string };

const DEFAULT_MANIFEST_URL = 'https://capability.network/android-ota/manifest.json';

/**
 * Register the OTA updater. Safe to call on web (no-op) or native.
 *
 * @param onStatus  Callback invoked whenever the OTA state changes.
 */
export async function registerOtaUpdater(onStatus: (status: OtaStatus) => void): Promise<void> {
  const manifestUrl = import.meta.env.VITE_OTA_MANIFEST_URL ?? DEFAULT_MANIFEST_URL;

  if (!Capacitor.isNativePlatform()) {
    onStatus({
      state: 'web-noop',
      message: `OTA is a no-op outside the Android shell. Manifest target: ${manifestUrl}`,
    });
    return;
  }

  // Lazy-import so the web preview never tries to load the native bridge.
  // The @capgo/capacitor-updater plugin reads its config from capacitor.config.ts.
  const { CapacitorUpdater } = await import('@capgo/capacitor-updater');

  onStatus({ state: 'checking' });

  try {
    // Phase 1 stub: just report the currently-installed bundle. Phase 2
    // wires the actual download/apply/rollback loop.
    const current = await CapacitorUpdater.current();
    onStatus({
      state: 'up-to-date',
      current: current?.bundle?.version ?? 'builtin',
    });

    // Phase 2 TODO: subscribe to plugin events
    //   await CapacitorUpdater.addListener('download', (info) => onStatus({ state: 'downloading', percent: info.percent }));
    //   await CapacitorUpdater.addListener('updateAvailable', (info) => onStatus({ state: 'ready', nextVersion: info.bundle.version }));
    //   await CapacitorUpdater.notifyAppReady();
  } catch (err) {
    onStatus({ state: 'error', message: err instanceof Error ? err.message : String(err) });
  }
}
