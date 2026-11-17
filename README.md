# Shadowing Studio (Next.js)

Practice English speaking by shadowing: listen → repeat → record → get a score.

This is the Next.js version of the original `index.html` / `style.css` / `app.js` / `transcript.php` app.
Every feature and the iOS design are kept; only the structure changed.

## Stack

| Part | Version / choice |
|---|---|
| Next.js | 16.4.6 (App Router, Turbopack, `cacheComponents` on) |
| React | 19.3 |
| Language | TypeScript (strict, no `any`) |
| Styling | Plain CSS in `app/globals.css` (the original iOS stylesheet). No Tailwind. |
| Font | Poppins via `next/font/google` |
| Data | Browser `localStorage` only. No database. |
| Node.js | **20.9 or newer** (Next 16 requirement). Node 22 LTS recommended. |

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Open it in **Chrome or Edge**. Speech scoring (SpeechRecognition) only exists there.
The microphone and YouTube player need `localhost` or `https`.

Other scripts:

```bash
npm run lint         # ESLint (incl. React Compiler rules)
npx tsc --noEmit     # type check
npm run build        # production build
npm run start        # serve the production build (port 3000)
```

## Quick start inside the app

1. Paste a YouTube link in the top bar → the transcript loads → press Play.
2. Or open `http://localhost:3000/?v=VIDEO_ID` (also `?url=<youtube link>`).
3. Or drag the **"Shadow this video"** bookmarklet (Lessons tab) to your bookmarks bar and click it on any YouTube video.
   **Use this on Vercel / any cloud host** — see "YouTube blocks cloud servers" below.

If a video has no captions, the manual "New lesson" sheet opens with the link filled in.

## Echo, the mascot

Echo is a parrot wearing headphones: parrots repeat what they hear (= shadowing), and the headphones stand for listening.
Echo is drawn as inline SVG in `components/Mascot.tsx` with moods: `idle`, `listen`, `speak`, `cheer`, `good`, `try`, `sleep`, `think`.

Echo can be switched off in **Settings → Display → Show Echo (mascot)** (`mascot` in `sh_settings`, default on).
When off, places that need a symbol show a plain icon instead (e.g. a "speaking" icon in the your-turn bar,
a green check on the lesson-complete sheet).
The icon in the "your turn" bar has its own switch: **Settings → Playback → Icon in your-turn bar**
(`turnIcon`, default on). Off = text only.

| Where | Mood |
|---|---|
| Loading screen | think (bobbing) |
| First-run welcome card | idle |
| "Your turn" bar | speak |
| While you record | listen |
| Score result | cheer ≥ 85 %, good ≥ 60 %, try < 60 % |
| Lesson complete sheet | cheer |
| Empty states (Words, filters), no dictionary result | sleep / think / good |

### App icons

| File | What |
|---|---|
| `app/icon.svg`, `app/favicon.ico` | Browser tab — Echo's head close-up (readable at 16 px) |
| `app/apple-icon.png` | iPhone/iPad home screen (180 px) |
| `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` | Install / Android (via `app/manifest.ts`) |

Sources are in `assets/icons/*.svg`. After editing them run `node scripts/build-icons.mjs`
(uses `sharp`, already installed with Next.js; `favicon.ico` also needs ImageMagick).

## UX features added in the Next.js version

- **Welcome card** on first run (Echo explains Play → your turn → Record). Dismissal is remembered.
- **iOS-style alert dialogs** for delete / reset / rename instead of the browser's `confirm()` / `prompt()`.
  Destructive dialogs focus *Cancel*, so Enter never deletes by accident.
- **Lesson complete sheet** with lines done, average score, weak lines, and
  "Practice weak lines" / "Start again" / "Choose another lesson".
- **Swipe down** on a sheet's grabber or header to close it.
- **Undo** toast after removing a saved word. Tap any toast to dismiss it.
- **Helpful empty states** per filter (Starred / To do / Weak) and for Words.
- **Accessibility**: labels on icon-only buttons, `aria-pressed` toggles, `aria-current` tab, keyboard focus rings,
  closed sheets are `inert`, and all animation is disabled for "Reduce motion".
- **Shortcuts**: `?` opens the shortcuts sheet.
- **Haptics**: a light tap on record / star / done / score on phones that support vibration (Android).
- **SVG icons instead of emoji** everywhere in the UI (`components/Icons.tsx`). Emoji render differently per OS
  (on Linux without a colour-emoji font they show as flat glyphs); SVG icons look the same everywhere and follow
  light/dark colours. Toast messages are plain text.
- **Installable** (PWA manifest): "Install app" / "Add to Home Screen" with the Echo icon.

## Your old data

The app uses the same `localStorage` keys as before:
`sh_lessons`, `sh_current`, `sh_words`, `sh_stats`, `sh_settings`.
One new key, `sh_welcome`, remembers that the welcome card was dismissed.

`localStorage` is stored **per origin** (protocol + host + port). Data saved at
`http://localhost:8000` (the old `php -S` server) is not visible at `http://localhost:3000`.
To move it, run this in the browser console on the **old** origin:

```js
copy(JSON.stringify(Object.fromEntries(['sh_lessons','sh_current','sh_words','sh_stats','sh_settings'].map(k => [k, localStorage.getItem(k)]))))
```

Then on the **new** origin, paste it into this (replace `PASTE`):

```js
Object.entries(PASTE).forEach(([k, v]) => v != null && localStorage.setItem(k, v)); location.reload();
```

## Project structure

```
app/
  layout.tsx              Poppins font, metadata, viewport/theme-color, no-flash theme script
  manifest.ts             PWA manifest (install with the Echo icon)
  icon.svg, favicon.ico, apple-icon.png   app icons (generated, see below)
  page.tsx                renders <ShadowingApp />
  globals.css             original iOS CSS (light/dark variables)
  api/transcript/route.ts GET /api/transcript?v=ID  (replaces transcript.php)
components/
  ShadowingApp.tsx        main state, tab switching, all actions
  QuickStartBar.tsx       paste link → auto start
  PracticeView.tsx        practice tab layout
  CurrentCard.tsx         sentence, word tap, score ring, action buttons
  LineList.tsx            memoized line list + filters
  PlayerBar.tsx           speed / repeat / prev / play / next / gap / mode
  YouTubePlayer.tsx       IFrame API (script loaded once), player created once
  LessonsView.tsx         stats, bookmarklet, lesson list
  WordsView.tsx           saved words
  Mascot.tsx              Echo the parrot (inline SVG, moods)
  WelcomeCard.tsx         first-run introduction
  Dialog.tsx              iOS-style alert (confirm / text input)
  TabBar.tsx, Toast.tsx, Words.tsx, Icons.tsx
  sheets/                 Sheet (swipe to close), Settings, NewLesson, Word, Shortcuts, Complete
hooks/
  useLocalStorage.ts      JSON value in localStorage (read in useEffect only)
  usePlaybackEngine.ts    play line → "your turn" → repeat / next (token-cancelled)
  useRecorder.ts          MediaRecorder + SpeechRecognition, 1.8 s silence auto-stop
  useSpeech.ts            speechSynthesis + English voice list
  useKeyboardShortcuts.ts Space, ←/→, L R M C V H S D, -/=, P, Esc
  useLatest.ts            "latest value" ref for async callbacks
lib/
  parser.ts               parseTranscript, mergeSentences, finishTimes, ytId, cleanText
  scoring.ts              LCS word compare → score / per-word status / missed words
  types.ts                Lesson, Segment, Progress, Settings, SavedWord, Stats, …
  constants.ts            storage keys, defaults, option lists, sample lesson
  utils.ts                uid, dayKey, fmt, streak, haptic, …
assets/icons/             master SVGs for the app icons
scripts/build-icons.mjs   regenerates PNG / ICO icons from the SVGs
```

## How the main parts connect

- **Transcript API** — `route.ts` does the same steps as `transcript.php`: watch page → `INNERTUBE_API_KEY`
  → `youtubei/v1/player` with the ANDROID client (`20.10.38`) → fallback `ytInitialPlayerResponse`
  → pick manual English, then auto English, then translate (`&tlang=en`) → parse `<text start dur>` or `<p t d>`.
  Results are cached per video id with `'use cache'` + `cacheLife('days')` (revalidated daily).
  Failures use `cacheLife('seconds')`, so a temporary YouTube problem is retried almost immediately.
  The cache is in memory, per server process: it resets on restart and is not shared between PM2 cluster instances.
- **Playback engine** — every run gets a token; `stopAll()` bumps it, so old timers / polls / speech callbacks quit.
  With a video + timestamps, each line seeks the YouTube player and a 50 ms poll pauses it at the line end.
  Without timestamps, `speechSynthesis` reads the line.
- **State** — persisted stores expose `.value` (render) and `.ref` (newest value for timers / async code).

## Deploy on a VPS (PM2 + Nginx)

Assumes Ubuntu, a domain pointing to the server, and Node ≥ 20.9.

### 1. Install Node and PM2

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22
npm install -g pm2
```

### 2. Get the code and build

```bash
cd /var/www
git clone <your-repo-url> shadowing
cd shadowing
npm ci
npm run build
```

### 3. Run with PM2

```bash
pm2 start npm --name shadowing -- start -- -p 3000
pm2 save
pm2 startup        # prints a command; run it once so PM2 starts on boot
```

Useful: `pm2 logs shadowing`, `pm2 restart shadowing`, `pm2 status`.

Use a single instance (fork mode, as above). The transcript cache is in memory per process, so cluster mode would keep a separate cache in each instance.

### 4. Nginx reverse proxy

`/etc/nginx/sites-available/shadowing`:

```nginx
server {
    listen 80;
    server_name example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 60s;   # transcript requests can take a few seconds
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shadowing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 5. HTTPS (required for the microphone)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d example.com
```

### Update later

```bash
cd /var/www/shadowing
git pull
npm ci
npm run build
pm2 restart shadowing
```

## YouTube blocks cloud servers (Vercel)

`/api/transcript` asks YouTube for captions **from the server**. Vercel functions run on AWS (`x-vercel-id: …::iad1`),
and YouTube refuses most requests from cloud IP ranges, so on Vercel pasting a link usually fails with
"YouTube blocked the server". Measured on the deployed app: 4 of 5 videos that work locally returned 422 on Vercel.

**Fix: the "Shadow this video" bookmarklet** (`lib/bookmarklet.ts`). It runs on youtube.com in your own browser
(home IP), fetches the captions there, and opens the app with them in the URL hash:

```
<app>/?v=VIDEO_ID#cap=<base64url(deflate-raw(JSON {t,l,k,x: caption XML}))>
```

- The hash is never sent to the server; the app decodes it (`decodeCaptionPayload`) and parses it with the same
  `lib/captions.ts` parser the server uses → identical lessons. No `/api/transcript` call is made.
- If the payload is missing or broken, the app falls back to `/api/transcript` (works locally / on non-blocked hosts).
- A 14-minute TED talk is about 11 K characters of hash; Chrome allows URLs up to 2 MB.
- After updating the app, **delete the old bookmark and drag the new one** — the bookmark stores the code.
- Bookmarklets are a desktop feature; on phones use the manual paste sheet or the app on a host that YouTube allows.

## Known limitations

- Speech scoring needs Chrome or Edge (Web Speech API). Recording works in other browsers.
- YouTube blocks most caption requests from cloud servers (see below). Pasting a link then fails on Vercel;
  use the bookmarklet or paste the transcript.
- Some videos do not allow embedding; the player shows a "Video error" toast.
# Shadowing
