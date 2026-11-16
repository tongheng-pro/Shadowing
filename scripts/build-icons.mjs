// Regenerates PNG/ICO app icons from assets/icons/*.svg (uses sharp, installed with Next.js).
// Usage: node scripts/build-icons.mjs   (favicon.ico also needs ImageMagick `convert`)
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const src = (n) => join('assets/icons', n);
const png = (input, size, out) => sharp(src(input), { density: 384 }).resize(size, size).png().toFile(out);

await png('app-icon.svg', 180, 'app/apple-icon.png');
await png('app-icon.svg', 192, 'public/icon-192.png');
await png('app-icon.svg', 512, 'public/icon-512.png');
await png('maskable-icon.svg', 512, 'public/icon-maskable-512.png');
copyFileSync(src('tab-icon.svg'), 'app/icon.svg');

const tmp = mkdtempSync(join(tmpdir(), 'icons-'));
try {
  const files = [];
  for (const s of [16, 32, 48]) {
    const f = join(tmp, `t${s}.png`);
    await png('tab-icon.svg', s, f);
    files.push(f);
  }
  execFileSync('convert', [...files, 'app/favicon.ico']);
} catch {
  console.warn('favicon.ico skipped (needs ImageMagick `convert`)');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log('icons generated');
