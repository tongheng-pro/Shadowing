# Icon sources (Echo the parrot)

Master SVGs for the app icons. The generated files live in `app/` and `public/`.

| Source | Used for |
|---|---|
| `tab-icon.svg` | `app/icon.svg` (browser tab, copied as-is) and `app/favicon.ico` (16/32/48) — head close-up, readable at 16 px |
| `app-icon.svg` | `app/apple-icon.png` (180), `public/icon-192.png`, `public/icon-512.png` — full body |
| `maskable-icon.svg` | `public/icon-maskable-512.png` — full-bleed background, mascot inside the 80 % safe zone (Android) |

Regenerate after editing:

```bash
node scripts/build-icons.mjs
```
