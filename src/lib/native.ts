/**
 * Native shell helpers — Capacitor plugin glue that no-ops on the web.
 *
 * Phase 2.0 wires:
 *   - StatusBar background color + text style to match the dark theme
 *
 * Phase 2.1+ candidates:
 *   - SplashScreen.hide() once first paint is ready
 *   - Haptics for tab transitions
 *   - PushNotifications opt-in (FCM)
 */

import { Capacitor } from '@capacitor/core';
import { colors } from '../design-tokens';

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  await initStatusBar();
}

async function initStatusBar(): Promise<void> {
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Match the deep-space background — looks like the bar is part of
    // the app rather than a system overlay.
    await StatusBar.setBackgroundColor({ color: colors.bg800 });
    // Light glyphs against dark background.
    await StatusBar.setStyle({ style: Style.Dark });
    // Let the app content paint under the status bar (we have
    // env(safe-area-inset-top) reserved in global.css).
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (err) {
    // Plugin missing or platform doesn't support it — log and continue.
    // eslint-disable-next-line no-console
    console.warn('[native] StatusBar init failed:', err);
  }
}
