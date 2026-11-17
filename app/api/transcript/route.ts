/* =========================================================
   GET /api/transcript?v=VIDEO_ID
   Replaces transcript.php. Same steps, same JSON:
   { videoId, title, lang, kind, segments: [{start, end, text}] }
   or { error } with an HTTP error status.

   Caching (Next.js 16 + cacheComponents):
   - successful results are cached per video id with
     cacheLife('days')  → revalidated once a day;
   - failures use cacheLife('seconds') so a temporary
     YouTube problem is retried almost immediately.
   ========================================================= */
import { cacheLife } from 'next/cache';
import type { NextRequest } from 'next/server';
import { decodeEntities, parseCaptions } from '@/lib/captions';
import type { TranscriptData, TranscriptResponse } from '@/lib/types';

const VIDEO_ID = /^[\w-]{11}$/;

const BASE_HEADERS: Record<string, string> = {
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',
  Cookie: 'CONSENT=YES+cb; SOCS=CAI',
};

type TranscriptResult =
  | { ok: true; data: TranscriptData }
  | { ok: false; status: number; error: string };

/* ---------- minimal shapes of the YouTube responses we read ---------- */
interface CaptionTrack {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
}

interface PlayerResponse {
  captions?: {
    playerCaptionsTracklistRenderer?: {
      captionTracks?: unknown;
    };
  };
  videoDetails?: {
    title?: unknown;
  };
}

/* ---------- route ---------- */
export async function GET(request: NextRequest): Promise<Response> {
  const v = request.nextUrl.searchParams.get('v') ?? '';
  if (!VIDEO_ID.test(v)) return json({ error: 'Invalid YouTube video ID' }, 400);

  const result = await getTranscript(v);
  if (!result.ok) return json({ error: result.error }, result.status);
  return json(result.data, 200);
}

function json(body: TranscriptResponse, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/** Cached per video id (the argument is part of the cache key). */
async function getTranscript(videoId: string): Promise<TranscriptResult> {
  'use cache';
  const result = await fetchTranscript(videoId);
  if (result.ok) {
    cacheLife('days'); // revalidate once per day
  } else {
    cacheLife('seconds'); // don't keep failures around
  }
  return result;
}

/* ---------- small HTTP helper ---------- */
async function http(
  url: string,
  post?: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, {
      method: post === undefined ? 'GET' : 'POST',
      headers: { ...BASE_HEADERS, ...headers },
      body: post,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    });
    return { status: res.status, body: await res.text() };
  } catch {
    return { status: 0, body: '' };
  }
}

/* ---------- the actual work (same steps as transcript.php) ---------- */
async function fetchTranscript(v: string): Promise<TranscriptResult> {
  const fail = (error: string, status = 422): TranscriptResult => ({ ok: false, status, error });

  /* 1. watch page: title + API key */
  const { body: html } = await http(`https://www.youtube.com/watch?v=${v}&hl=en`);
  if (!html) return fail('Could not reach YouTube. Check your internet.', 502);

  let title = 'YouTube lesson';
  const titleMatch = html.match(/<meta name="title" content="([^"]*)"/);
  if (titleMatch) title = decodeEntities(titleMatch[1]);

  let tracks: CaptionTrack[] = [];

  /* 2. innertube player API (ANDROID client = caption URLs work) */
  const keyMatch = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/);
  if (keyMatch) {
    const payload = JSON.stringify({
      context: { client: { clientName: 'ANDROID', clientVersion: '20.10.38', hl: 'en' } },
      videoId: v,
    });
    const { body } = await http(`https://www.youtube.com/youtubei/v1/player?key=${keyMatch[1]}`, payload, {
      'Content-Type': 'application/json',
    });
    const j = parseJson(body);
    if (j) {
      tracks = readTracks(j);
      const t = j.videoDetails?.title;
      if (typeof t === 'string' && t) title = t;
    }
  }

  /* 3. fallback: player response inside the watch page */
  if (!tracks.length) {
    const m = html.match(/ytInitialPlayerResponse\s*=\s*(\{[\s\S]+?\})\s*;\s*(?:var\s|<\/script>)/);
    const j = m ? parseJson(m[1]) : null;
    if (j) tracks = readTracks(j);
  }

  if (!tracks.length) {
    return fail(
      'This video has no captions, or YouTube blocked the server. Use the “Shadow this video” bookmark on YouTube, or paste the transcript manually.',
    );
  }

  /* 4. choose the best English track: manual English → auto English → translate */
  let pick: CaptionTrack | null = null;
  let translate = false;
  for (const wantAsr of [false, true]) {
    pick =
      tracks.find(
        (t) => (t.kind === 'asr') === wantAsr && (t.languageCode ?? '').toLowerCase().startsWith('en'),
      ) ?? null;
    if (pick) break;
  }
  if (!pick) {
    pick = tracks[0]; // other language → ask YouTube to translate to English
    translate = true;
  }

  let url = pick.baseUrl.replace(/&fmt=[^&]*/g, '');
  if (translate) url += '&tlang=en';

  const { body: xml } = await http(url);
  if (!xml) return fail('YouTube returned empty captions. Try again in a minute, or paste the transcript manually.');

  /* 5. parse captions (old <text> format or srv3 <p> format) */
  const segments = parseCaptions(xml);
  if (!segments.length) return fail('Could not read the captions of this video.');

  return {
    ok: true,
    data: {
      videoId: v,
      title,
      lang: pick.languageCode ?? 'en',
      kind: pick.kind === 'asr' ? 'auto' : 'manual',
      segments,
    },
  };
}

/* ---------- helpers ---------- */
function parseJson(s: string): PlayerResponse | null {
  try {
    const v: unknown = JSON.parse(s);
    return v && typeof v === 'object' ? (v as PlayerResponse) : null;
  } catch {
    return null;
  }
}

function readTracks(j: PlayerResponse): CaptionTrack[] {
  const list = j.captions?.playerCaptionsTracklistRenderer?.captionTracks;
  if (!Array.isArray(list)) return [];
  const out: CaptionTrack[] = [];
  for (const item of list as unknown[]) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;
    if (typeof t.baseUrl !== 'string') continue;
    out.push({
      baseUrl: t.baseUrl,
      languageCode: typeof t.languageCode === 'string' ? t.languageCode : undefined,
      kind: typeof t.kind === 'string' ? t.kind : undefined,
    });
  }
  return out;
}
