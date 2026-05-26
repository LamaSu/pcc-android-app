/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  // OTA (Phase 1)
  readonly VITE_OTA_MANIFEST_URL?: string;
  readonly VITE_OTA_PUBLIC_KEY?: string;

  // PCC gateway (Phase 2.0+)
  readonly VITE_GATEWAY_URL?: string;
  readonly VITE_PCC_GATEWAY_URL?: string;
  readonly VITE_PCC_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
