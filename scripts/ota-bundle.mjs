#!/usr/bin/env node
/**
 * scripts/ota-bundle.mjs
 *
 * Pack the Vite build output (dist/) into an OTA bundle (.zip) and emit a
 * partial manifest entry to stdout. Pair with scripts/ota-sign.mjs to sign
 * the bundle.
 *
 * Usage:
 *   node scripts/ota-bundle.mjs
 *
 * Inputs:
 *   ./dist/                — Vite build output (must exist; run `pnpm build` first)
 *   ./package.json#version — version to embed in the manifest entry
 *
 * Outputs:
 *   ./ota-out/<version>.zip
 *   ./ota-out/<version>.manifest.json   (unsigned partial manifest)
 *
 * Phase 1 is intentionally a stub — the bundle is a tarball of dist/ and the
 * manifest entry is unsigned. Phase 2 wires real signing via ota-sign.mjs and
 * uploads to the OTA CDN endpoint.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const outDir = path.join(root, 'ota-out');

if (!existsSync(distDir)) {
  console.error(`error: ${distDir} not found. Run \`pnpm build\` first.`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = pkg.version;

// Hash every file in dist/ to produce a deterministic checksum WITHOUT
// requiring a zip library (Phase 1 doesn't ship the actual zip; CI does that
// via `tar` or `zip` directly — this script just emits the manifest entry).
function walk(dir, prefix = '') {
  const files = [];
  for (const name of readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = prefix ? `${prefix}/${name}` : name;
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walk(full, rel));
    } else {
      files.push({ rel, full, size: st.size });
    }
  }
  return files;
}

const files = walk(distDir);
const hash = createHash('sha256');
for (const f of files) {
  hash.update(f.rel);
  hash.update('\0');
  hash.update(readFileSync(f.full));
  hash.update('\0');
}
const checksum = `sha256-${hash.digest('base64')}`;

const manifestEntry = {
  version,
  // Placeholder URL — CI overwrites with the actual CDN path after upload.
  url: `https://capability.network/android-ota/bundles/${version}.zip`,
  checksum,
  // Filled in by ota-sign.mjs.
  signature: null,
  minNativeVersion: pkg.version, // tighten this in Phase 2
  fileCount: files.length,
  totalSize: files.reduce((s, f) => s + f.size, 0),
  builtAt: new Date().toISOString(),
};

writeFileSync(
  path.join(outDir, `${version}.manifest.json`),
  JSON.stringify(manifestEntry, null, 2) + '\n',
);

console.log(JSON.stringify(manifestEntry, null, 2));
console.error(`[ota-bundle] manifest entry written: ota-out/${version}.manifest.json`);
console.error(`[ota-bundle] fileCount=${files.length} totalSize=${manifestEntry.totalSize} checksum=${checksum}`);
console.error(`[ota-bundle] next: CI zips dist/ + runs scripts/ota-sign.mjs to add a signature`);
