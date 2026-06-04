/**
 * generate-icons.mjs
 *
 * Генерирует icon-192.png и icon-512.png из favicon.svg
 *
 * Запуск:  node scripts/generate-icons.mjs
 *
 * Требует:  npm install -D sharp   (только один раз)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const svgPath   = join(publicDir, 'favicon.svg');

if (!existsSync(svgPath)) {
  console.error('❌  public/favicon.svg не найден');
  process.exit(1);
}

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.error('❌  Установите sharp:  npm install -D sharp');
  process.exit(1);
}

const svgBuffer = readFileSync(svgPath);

for (const size of [192, 512]) {
  const outPath = join(publicDir, `icon-${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✅  icon-${size}.png  →  public/`);
}

console.log('\n🎉  Иконки готовы! Теперь PWA-установка будет работать в любом браузере.');
