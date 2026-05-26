# PCC Android App — Session Briefing

> **For**: a fresh Claude Code session (or a developer working with Google AI Studio's Build mode)
> **Goal**: turn the entire PCC into an Android app that auto-updates on every push to `lamasu/master`
> **Origin**: spun off from a /go session on 2026-05-25 (see `C:\Users\globa\physical-capability-cloud\ai\memory\WORKING_MEMORY.md`)

---

## 1. What PCC is (so you can decide what the Android app contains)

- **Repo**: `C:\Users\globa\physical-capability-cloud` (active remote: `lamasu`, github.com/LamaSu/physical-capability-cloud)
- **Live gateway**: `https://capability.network`
- **Full API integration guide**: `C:\Users\globa\physical-capability-cloud\CLAUDE.md` (the whole file is the agent integration spec — read it before designing the app)
- **Agent package** (218+ tool catalog the app can surface): `https://capability.network/agent-package.json`
- **OpenAPI spec** (just-shipped on branch `feat/openapi-spec`): `https://capability.network/openapi.json` once merged, OR fetch the dev server
- **Existing web dashboard** to consider reusing: `C:\Users\globa\physical-capability-cloud\apps\dashboard` (Vite + React 19, 52+ routes, design system in `packages/ui`)
- **Existing mobile app** (Capacitor 7, agentic-commerce approval flows): `C:\Users\globa\physical-capability-cloud\apps\mobile` — covers passkey + ApprovalSheet + ReceiptDetail + SSE listener + iOS-prep. This is the most relevant prior art.

## 2. The architectural decision (three viable shapes)

### Option A — Capacitor wrap of the dashboard (fastest, ~1 week)
- Wrap `apps/dashboard` (the existing Vite + React 19 build) via Capacitor 7 (same stack the existing `apps/mobile` already uses)
- Auto-update via **@capgo/capacitor-updater** (OSS, OTA bundles signed + delivered from your own CDN) or **Ionic Live Updates** (managed SaaS)
- Native shell only needs Play Store update when you change permissions/plugins (rare)
- GH Action on `master` push: `pnpm build` → bundle web assets → sign → upload to live-updates endpoint → Android app pulls + applies on next launch
- Reuses 100% of dashboard UI, all 52 routes, all React Query / state

### Option B — Extend `apps/mobile` to become the everything-app
- Already has the hardest part (passkey auth + SSE + payment flows + iOS-prep)
- Add tabs/screens for: capability discovery, kernel monitoring, job management, evidence browsing, demand-intel admin, aggregator search
- More work than Option A but produces a thoughtfully-designed mobile UX (not a phone-sized desktop)
- Same Capacitor OTA story

### Option C — Fresh native (React Native + Expo + EAS Build + EAS Update)
- EAS Update is the closest analog to "auto-update on push" in the React Native ecosystem
- Push to master → GH Action runs `eas update --branch production` → app pulls new JS bundle on next launch
- Native binary only rebuilds for plugin/config changes via `eas build --auto-submit`
- Highest control + best perf but throws away existing Capacitor+Vite investment

**Recommendation**: **Option A** for the first ship. Lowest risk, fastest demo, max code reuse. Migrate to Option B once you know which screens get used.

## 3. Where Google AI Studio fits

Three concrete uses, pick one or stack:

1. **AI Studio Build mode** (https://aistudio.google.com/) — paste the OpenAPI spec from §1, ask for "Generate a React app that consumes this API, with screens for capability discovery, job submission, and live SSE evidence streaming." Use the generated React app as the starting point (faster than scaffolding from scratch). Download as a Vite project, then wrap with Capacitor per Option A.
2. **Gemini Code Assist** in the new session — drop the Gemini CLI / use it via the Anthropic SDK's openai-compat layer / use the @google/genai npm package. Use Gemini for repetitive scaffolding (route components, form schemas from OpenAPI) and Claude for orchestration + integration.
3. **AI Studio Stream Realtime** for in-app conversational UX — the agent-package.json has 218+ tools; expose them via a chat surface that calls Gemini's realtime API with the agent-package as the tool catalog. The Android app effectively becomes a Gemini-powered PCC client.

## 4. Auto-update mechanism (the "automatically updates when we push things" requirement)

Three layers; pick one or combine:

### 4a. Web-asset OTA (essential)
```
master push → GH Action:
  1. pnpm build:web (produces dist/)
  2. zip + sign bundle (Ed25519, key in GH Secrets)
  3. upload to live-updates endpoint (your CDN, e.g., R2 / Cloudflare Workers)
  4. notify Android shell of new version (manifest.json on CDN)
Android shell on next launch:
  1. fetches manifest.json
  2. if newer version, downloads + verifies sig
  3. applies bundle, restarts WebView
```

Libraries: `@capgo/capacitor-updater` (recommended — OSS, signed bundles, rollback support) or **Ionic Live Updates** (SaaS, ~$50/mo).

### 4b. Native binary update (Play Store auto-promote)
```
master push → GH Action:
  1. eas build / capacitor android build → .aab
  2. fastlane supply --track internal (upload to Play Console internal track)
  3. cron: promote internal → closed → production after smoke
```

### 4c. F-Droid / sideload (no Play Store gate)
- Set up F-Droid Reproducible Builds metadata
- Master push triggers F-Droid fdroidserver build
- App receives update via F-Droid Client
- Useful if you want a permissionless distribution path alongside Play Store

## 5. CI/CD shape (concrete)

`.github/workflows/android-ota.yml` on the new repo:

```yaml
name: android-ota
on:
  push:
    branches: [master]
  workflow_dispatch:
jobs:
  build-and-publish-bundle:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-node 20
      - pnpm install
      - pnpm build:web
      - sign bundle with Ed25519 key from secrets
      - aws s3 cp ... / wrangler r2 object put ... / upload to live-updates endpoint
      - update manifest.json with new version + hash
      - post to Slack/Discord on success
  build-native-on-bump:
    runs-on: macos-latest  # iOS uses macOS, Android can use ubuntu-latest
    if: contains(github.event.head_commit.message, 'BREAKING') || contains(github.event.head_commit.message, 'native:')
    steps:
      - capacitor android build --release
      - fastlane supply --track internal
```

## 6. Starting prompt for the new session

```
You're starting a fresh PCC Android app project. Read C:\Users\globa\projects\pcc-android-app\BRIEFING.md
in full first. Then:

1. Decide between Options A / B / C from §2 (recommendation: A for first ship)
2. Initialize a new repo at C:\Users\globa\projects\pcc-android-app\ (pnpm + Vite + Capacitor 7)
3. Either:
   a) Use Google AI Studio Build mode (https://aistudio.google.com) — paste the OpenAPI spec
      from https://capability.network/openapi.json and ask it to scaffold a React app, then wrap
      with Capacitor, OR
   b) Copy apps/dashboard's structure from PCC and slim it for mobile
4. Wire @capgo/capacitor-updater for OTA web bundles
5. Set up the GH Action per §5
6. Create a LamaSu/pcc-android repo and push

Constraints:
- Use Conventional Commits + release-please (same pattern as PCC)
- Don't touch the main PCC repo at C:\Users\globa\physical-capability-cloud unless necessary
- If you do need to reach into PCC for types: import @pcc/spec via pnpm workspace OR
  copy the OpenAPI spec verbatim (the spec is the contract — types are downstream)
- Spark may or may not be reachable; check with `spark-check`. If not, use local
  --workspace-concurrency=1 for builds
- Worktree isolation if spawning >1 parallel implementer

PCC context already loaded in your memory if you read CLAUDE.md and WORKING_MEMORY.md.
```

## 7. Open questions to resolve in the new session

- Distribution path: Play Store, F-Droid, sideload, or all three?
- Signing keys: where do they live (1Password, GH Secrets, hardware key)?
- Live-updates CDN: R2 (cheap, included with Cloudflare), Vercel (already in PCC stack), Storacha (PCC already uses for evidence), or self-hosted?
- Should the Android app be authenticated as an operator (provision its own API key) or as a requester (consume via OAuth/passkey)?
- Push notifications: APNs (iOS via existing apps/mobile prep) — Android adds FCM. Worth setting up day one?
- ALCOA+ evidence preservation in the app: do we cache photos/videos locally before upload to handle offline cases?

## 8. References

- PCC integration guide: `C:\Users\globa\physical-capability-cloud\CLAUDE.md`
- Existing mobile app: `C:\Users\globa\physical-capability-cloud\apps\mobile`
- Existing dashboard: `C:\Users\globa\physical-capability-cloud\apps\dashboard`
- Agent network landscape synthesis: `C:\Users\globa\physical-capability-cloud\ai\research\agent-network-landscape-synthesis-2026-05-23.md`
- Phase 2 scoping docs: `C:\Users\globa\physical-capability-cloud\ai\scoping\*.md`
- Worktree isolation lesson: `C:\Users\globa\.claude\projects\C--Users-globa\memory\feedback_worktree_isolation_for_parallel_implementers.md`
- @capgo/capacitor-updater: https://github.com/Cap-go/capacitor-updater
- AI Studio Build mode: https://aistudio.google.com/
- EAS Update (if going Option C): https://docs.expo.dev/eas-update/introduction/
