#!/usr/bin/env node
/**
 * scripts/ota-sign.mjs
 *
 * Sign an OTA manifest entry produced by scripts/ota-bundle.mjs.
 *
 * Usage:
 *   OTA_PRIVATE_KEY_PEM="$(cat secrets/private-signing-key.pem)" \
 *     node scripts/ota-sign.mjs ota-out/<version>.manifest.json
 *
 * Key generation (one-time, run on a trusted machine):
 *   # Ed25519 (recommended — smaller signatures, modern curve)
 *   mkdir -p secrets
 *   openssl genpkey -algorithm Ed25519 -out secrets/private-signing-key.pem
 *   openssl pkey -in secrets/private-signing-key.pem -pubout -out secrets/public-signing-key.pem
 *
 *   # OR RSA 2048 (compat fallback if your OTA verifier doesn't support Ed25519)
 *   openssl genrsa -out secrets/private-signing-key.pem 2048
 *   openssl rsa -in secrets/private-signing-key.pem -pubout -out secrets/public-signing-key.pem
 *
 * The PRIVATE key:
 *   - Lives in ./secrets/ (gitignored)
 *   - In CI, comes from GitHub Secrets: OTA_PRIVATE_KEY_PEM
 *   - NEVER commit, NEVER print, NEVER log
 *
 * The PUBLIC key:
 *   - Ships baked into the Android app shell (via VITE_OTA_PUBLIC_KEY at build time
 *     OR via capacitor.config.ts plugin config)
 *   - The shell verifies every downloaded bundle's signature against this key
 *     before applying it
 *
 * Signature scheme: detached signature over the entry's `checksum` string.
 * The verifier reconstructs the checksum from the downloaded bundle and
 * verifies the signature matches.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { sign, createPrivateKey } from 'node:crypto';
import path from 'node:path';

const [, , manifestPath] = process.argv;
if (!manifestPath) {
  console.error('usage: ota-sign.mjs <manifest-entry.json>');
  process.exit(2);
}

const pem = process.env.OTA_PRIVATE_KEY_PEM;
if (!pem) {
  console.error('error: OTA_PRIVATE_KEY_PEM env var is required');
  console.error('       (in CI, wire this from GitHub Secrets;');
  console.error('        locally, export from secrets/private-signing-key.pem)');
  process.exit(2);
}

const entry = JSON.parse(readFileSync(manifestPath, 'utf-8'));
if (!entry.checksum) {
  console.error('error: manifest entry has no `checksum` field — did you run ota-bundle.mjs?');
  process.exit(2);
}

const key = createPrivateKey(pem);
// Ed25519 doesn't use a hash algorithm; passing `null` selects raw signing.
// For RSA, this would be 'sha256'. node:crypto handles both via the key type.
const sigAlgo = key.asymmetricKeyType === 'ed25519' ? null : 'sha256';
const signature = sign(sigAlgo, Buffer.from(entry.checksum, 'utf-8'), key);

entry.signature = `${key.asymmetricKeyType}-${signature.toString('base64')}`;
entry.signedAt = new Date().toISOString();

writeFileSync(manifestPath, JSON.stringify(entry, null, 2) + '\n');

console.error(`[ota-sign] signed ${path.basename(manifestPath)} with ${key.asymmetricKeyType}`);
console.error(`[ota-sign] signature length: ${signature.length} bytes`);
console.log(entry.signature);
