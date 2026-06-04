// Writes VITE_ env vars to .env.production.local so Vite picks them up at build time.
import { writeFileSync } from 'fs';

const lines = Object.entries(process.env)
  .filter(([k]) => k.startsWith('VITE_'))
  .map(([k, v]) => `${k}=${v}`)
  .join('\n');

if (lines) {
  writeFileSync('.env.production.local', lines + '\n');
  console.log('[set-build-env] wrote .env.production.local');
} else {
  console.log('[set-build-env] no VITE_ vars found — skipping');
}
