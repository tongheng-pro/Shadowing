/* =========================================================
   Caption XML parsing — shared by the server route
   (app/api/transcript/route.ts) and the browser
   (bookmarklet import), so both give identical lessons.
   Handles the old <text start dur> and the srv3 <p t d> formats.
   ========================================================= */
import type { TranscriptSegment } from './types';

/** Parse YouTube caption XML into segments (seconds). */
export function parseCaptions(xml: string): TranscriptSegment[] {
  const segments: TranscriptSegment[] = [];

  const textTags = [...xml.matchAll(/<text start="([\d.]+)"(?:\s+dur="([\d.]+)")?[^>]*>([\s\S]*?)<\/text>/g)];
  if (textTags.length) {
    for (const m of textTags) {
      const text = clean(m[3]);
      if (!text) continue;
      const start = parseFloat(m[1]);
      segments.push({ start, end: start + (m[2] ? parseFloat(m[2]) || 2 : 2), text });
    }
    return segments;
  }

  for (const m of xml.matchAll(/<p t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = clean(m[3]);
    if (!text) continue;
    const start = parseInt(m[1], 10) / 1000;
    segments.push({ start, end: start + (m[2] ? parseInt(m[2], 10) || 2000 : 2000) / 1000, text });
  }
  return segments;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  laquo: '«',
  raquo: '»',
  copy: '©',
  reg: '®',
  trade: '™',
};

/** Like PHP html_entity_decode: named + decimal + hex entities. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const hex = code[1] === 'x' || code[1] === 'X';
      const n = parseInt(code.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return NAMED_ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** Decode → strip tags → decode again → collapse spaces (same as transcript.php clean()). */
function clean(s: string): string {
  const once = decodeEntities(s);
  const twice = decodeEntities(once.replace(/<[^>]*>/g, ''));
  return twice.replace(/\s+/g, ' ').trim();
}
