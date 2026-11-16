/* =========================================================
   SPEECH SCORING — LCS word alignment
   Ported 1:1 from the original app.js.
   ========================================================= */
import type { CompareResult, WordStatus } from './types';

/** Normalize a word for comparison ("Don’t," → "don't"). */
export const norm = (w: string): string =>
  w
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']/g, '')
    .replace(/^'+|'+$/g, '');

const same = (a: string, b: string): boolean =>
  a === b ||
  a.replace(/'/g, '') === b.replace(/'/g, '') ||
  (a.length > 4 && b.length > 4 && (a.startsWith(b) || b.startsWith(a)));

/** Compare the target sentence with what the user said → score, per-word status, missed words. */
export function compareWords(target: string, said: string): CompareResult {
  const tokens = target.split(/\s+/).filter(Boolean);
  const tIdx: number[] = [];
  const tWords: string[] = [];
  tokens.forEach((tok, k) => {
    const n = norm(tok);
    if (n) {
      tIdx.push(k);
      tWords.push(n);
    }
  });
  const sp = said.split(/\s+/).map(norm).filter(Boolean);
  const n = tWords.length;
  const m = sp.length;

  const dp: Int16Array[] = Array.from({ length: n + 1 }, () => new Int16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = same(tWords[i], sp[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ok = new Set<number>();
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (same(tWords[i], sp[j])) {
      ok.add(tIdx[i]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }

  const status: Record<number, WordStatus> = {};
  tIdx.forEach((k) => {
    status[k] = ok.has(k) ? 'ok' : 'miss';
  });
  const missed = tIdx.filter((k) => !ok.has(k)).map((k) => tokens[k].replace(/[^\w'’-]/g, ''));
  return { score: n ? Math.round((ok.size / n) * 100) : 0, status, missed };
}
