# pcc-android-app

PCC (Physical Capability Cloud) as an Android app — a Capacitor 7 shell that
wraps a Vite + React 19 web app and auto-updates over-the-air on every push to
`main`.

- **Live gateway**: https://capability.network
- **Parent project**: https://github.com/LamaSu/physical-capability-cloud
- **Package id**: `network.capability.pcc`
- **License**: Apache-2.0

## What's in Phase 1 (scaffold)

- Vite + React 19 + TypeScript scaffold
- Capacitor 7 native shell for Android (`network.capability.pcc`)
- OTA hook stub via `@capgo/capacitor-updater` that registers on app launch
  and reports status to the UI
- OTA bundle + sign scripts (Ed25519 or RSA-2048, see `scripts/ota-sign.mjs`)
- GitHub Actions workflow that builds + signs + uploads OTA artifacts on every
  push to `main`
- Placeholder splash screen that links to the production dashboard

## What's in Phase 2.0 (this wave)

- **Design tokens** ported from `@pcc/ui` ("Space-Age Control Room" palette) into
  `src/design-tokens.ts` and mirrored as CSS custom properties in
  `src/styles/global.css`
- **API client** (`src/lib/api.ts`) — typed fetch wrapper for
  `https://capability.network` with `localStorage.PCC_API_KEY` auth, abortable
  requests, and a typed `ApiError` carrying network / http / parse classification
- **PCC spec types vendored** (`src/types/pcc-spec.ts`) — `CapabilityDTO`,
  `JobDTO`, `KernelDTO`, `EscrowSummaryDTO`, etc, mirroring CLAUDE.md §5
- **react-router-dom v7** with 7 routes and a fixed bottom tab bar
  (Browse / Jobs / Evidence / Settings)
- **Capability discovery screen (`/capabilities`)** — the Phase 2.0 proof of
  concept. Live API hit, type-chip filter, debounced search, skeleton +
  empty + error + auth-required states, tappable cards
- **Settings screen (`/settings`)** — interactive API-key input wired to
  `localStorage.PCC_API_KEY` (also reads `VITE_PCC_API_KEY` for dev)
- **Capacitor `@capacitor/status-bar`** wired in `src/lib/native.ts`; status
  bar color matches design-token primary, safe-area insets honored
- **Vitest 4 + Testing Library** — 20 tests covering the API client + the
  capabilities screen
- **CI** runs `pnpm typecheck` + `pnpm test` on every push (any branch);
  OTA build only fires on `push` to `main`

## What's deferred to Phase 2.1+

Phase 2.1+ ports the remaining ~51 routes from
`apps/dashboard/src/pages/` incrementally. The dashboard is huge — pick screens
in priority order based on operator workflows.

**Tracking list** (route → dashboard source → priority):

| Mobile route | Dashboard source page | Priority |
|---|---|---|
| `/jobs` | `JobsPage` (live SSE feed) | high |
| `/jobs/:id` | (synthesizes from `JobDetailDTO` + timeline) | high |
| `/evidence` | `EvidenceExplorerPage` | medium |
| `/kernels` | (synthesizes from `KernelHealthSnapshot`) | medium |
| `/settings` (expanded) | preferences + push opt-in | medium |
| `/capabilities/:id` | `CapabilityDetailPage` | medium |
| `/builder` | `BuilderPage` (contract builder) | low |
| `/escrow` | `EscrowPage` | low |
| `/onboarding` | `MachineOnboardingWizardPage` | low |
| `/discover` | `DiscoverPage` (mDNS network scan) | low |
| `/depin` | `DePINDashboardPage` | low |
| `/ip` | `IPDashboardPage` + `IPDetailPage` + `IPRevenuePage` | low |
| `/swf` | `SWFGovernancePage` + `SWFParticipantPage` | low |
| `/agent-link` | `AgentLinkPage` | low |
| `/agent-chat` | `AgentChatPage` (LLM proxy) | low |
| (and ~36 more) | (see `apps/dashboard/src/pages/`) | low |

Additionally:

- Wiring a real OTA CDN endpoint (Cloudflare R2 / Storacha / S3 — pick during
  Phase 2.1 kickoff). The CI workflow has commented stubs for each option.
- Real pull-to-refresh via a Capacitor handler plugin (Phase 2.0 ships a manual
  refresh button — works in WebView + desktop preview alike)
- Bigger icon-font swap (Phase 2.0 uses Unicode glyphs in the tab bar)
- Push notifications (FCM/APNs)
- Offline evidence capture (photos/videos buffered before upload)
- Production Android emulator + Play Store publish
- Real Play Console signing + Fastlane upload to internal track
- iOS (use `apps/mobile` in the PCC monorepo for that)

## What's deferred to Phase 3

- Play Store production rollout
- F-Droid reproducible-builds metadata
- iOS

---

## Develop

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- (Phase 2 emulator only) Android Studio Ladybug or newer with Android SDK 35

### Install + run

```pwsh
cd C:\Users\globa\projects\pcc-android-app
pnpm install
pnpm dev               # Vite dev server at http://localhost:5173
pnpm build             # produces dist/
pnpm preview           # serve the production build
pnpm test              # run all vitest suites once
pnpm test:watch        # vitest watch mode
pnpm typecheck         # tsc --noEmit
```

### Connecting to the live PCC gateway

1. Provision a PCC API key:
   ```pwsh
   curl -X POST https://capability.network/api/auth/provision `
     -H "Content-Type: application/json" `
     -d '{"email":"you@example.com","name":"Your shop"}'
   ```
2. Open the running app, go to **Settings**, paste the `api_key` from the
   response, hit **Save**. Browse the **Browse** tab to see live capabilities.

For dev convenience, you can pre-set the key by adding it to `.env.local`:

```
VITE_PCC_API_KEY=pcc_live_...
```

Never commit `.env.local`. Never ship a key in a release build — leave it
blank and require users to set it via the Settings screen.

### Capacitor

```pwsh
pnpm cap:sync          # copy dist/ into android/ + update plugin metadata
pnpm cap:doctor        # health check
pnpm cap:open:android  # open the Android project in Android Studio
pnpm cap:run:android   # run on a connected device or emulator (needs SDK)
```

### OTA bundle (manual)

```pwsh
pnpm build
pnpm ota:bundle                                       # writes ota-out/<version>.manifest.json
$env:OTA_PRIVATE_KEY_PEM = Get-Content secrets/private-signing-key.pem -Raw
pnpm ota:sign ota-out/<version>.manifest.json         # adds signature
```

## OTA architecture

```
push to main
   |
   v
GitHub Actions (.github/workflows/android-ota.yml)
   |
   |-- pnpm typecheck + test       -> CI gate
   |-- pnpm build                  -> dist/
   |-- pnpm ota:bundle             -> ota-out/<version>.manifest.json (unsigned)
   |-- zip dist/                   -> ota-out/<version>.zip
   |-- pnpm ota:sign               -> manifest.json gets a signature field
   |-- upload to CDN (Phase 2.1)   -> https://capability.network/android-ota/...
   |
   v
Android shell, on next launch
   |
   |-- @capgo/capacitor-updater fetches manifest.json
   |-- verifies signature with VITE_OTA_PUBLIC_KEY (baked into the shell)
   |-- if newer + valid, downloads <version>.zip
   |-- swaps WebView root to the new bundle
   |-- restarts the WebView
```

Web bundles can change everything Vite ships. Native shell only needs a Play
Store update when:

- Capacitor itself updates
- A plugin's native code changes
- AndroidManifest.xml permissions change
- App icon / splash / package id changes

## Signing keys

Generate **once**, on a trusted machine, store **off** the repo:

```bash
mkdir -p secrets
# Ed25519 (recommended — small, modern)
openssl genpkey -algorithm Ed25519 -out secrets/private-signing-key.pem
openssl pkey -in secrets/private-signing-key.pem -pubout -out secrets/public-signing-key.pem

# OR RSA-2048 (broader compat)
openssl genrsa -out secrets/private-signing-key.pem 2048
openssl rsa -in secrets/private-signing-key.pem -pubout -out secrets/public-signing-key.pem
```

Then:

- **Private key**: paste into GitHub Secrets as `OTA_PRIVATE_KEY_PEM`. Never
  commit, never print, never log.
- **Public key**: paste into `.env.local` as `VITE_OTA_PUBLIC_KEY` for local
  dev, and into the GitHub Actions Variables (`VITE_OTA_PUBLIC_KEY`) for CI
  builds. The shell verifies every downloaded bundle against this key.

`secrets/` is gitignored.

## Repo layout

```
.
├── .github/workflows/
│   └── android-ota.yml         # CI: typecheck + test on every push;
│                               #     OTA build only on push to main
├── android/                    # generated by `cap add android`, committed
├── scripts/
│   ├── ota-bundle.mjs          # pack dist/ -> manifest entry
│   └── ota-sign.mjs            # sign manifest entry with private key
├── src/
│   ├── App.tsx                 # BrowserRouter mount
│   ├── design-tokens.ts        # typed token export (Space-Age palette)
│   ├── main.tsx                # React root + initNative()
│   ├── lib/
│   │   ├── api.ts              # PCC gateway fetch wrapper
│   │   ├── native.ts           # Capacitor status-bar wiring
│   │   ├── ota.ts              # @capgo/capacitor-updater registration
│   │   └── api.test.ts         # API client unit tests
│   ├── routes/
│   │   ├── index.tsx           # AppRoutes (route map)
│   │   ├── Layout.tsx          # tab-bar layout
│   │   ├── SplashRoute.tsx     # /
│   │   ├── CapabilitiesRoute.tsx       # /capabilities (POC)
│   │   ├── CapabilityDetailRoute.tsx   # /capabilities/:id (placeholder)
│   │   ├── JobsRoute.tsx               # /jobs (placeholder)
│   │   ├── JobDetailRoute.tsx          # /jobs/:id (placeholder)
│   │   ├── EvidenceRoute.tsx           # /evidence (placeholder)
│   │   ├── KernelsRoute.tsx            # /kernels (placeholder)
│   │   ├── SettingsRoute.tsx           # /settings (api-key wired)
│   │   ├── PlaceholderRoute.tsx        # shared placeholder shell
│   │   └── CapabilitiesRoute.test.tsx  # POC screen tests
│   ├── types/
│   │   └── pcc-spec.ts         # vendored @pcc/spec subset
│   ├── styles/
│   │   └── global.css          # mirrored design tokens + utility classes
│   ├── __tests__/
│   │   └── setup.ts            # vitest jest-dom + cleanup
│   └── vite-env.d.ts
├── secrets/                    # gitignored, your local signing key
├── capacitor.config.ts         # native shell config
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Open questions for Phase 2.1+

- CDN target: Cloudflare R2 (cheap, matches PCC stack), Storacha (matches PCC
  evidence pipeline), Vercel Blob, or S3?
- App authentication shape: operator-mode (provision an API key on first
  launch) vs requester-mode (consume PCC via OAuth/passkey)?
- Do we ship FCM/APNs day one or wait for v0.2.0?
- ALCOA+ caching: how much do we buffer locally to handle offline operators?
- Should `/agent-chat` connect to PCC's LLM proxy or AI Studio Stream Realtime?

See `BRIEFING.md` §7 for the full open-question list.
