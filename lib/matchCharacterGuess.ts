import type { Character } from "@/types/game";
import { stripAccents } from "@/lib/utils";

/** Normalize for comparison: lowercase, accents stripped, whitespace collapsed. */
export function normalizeGuessString(s: string): string {
  return stripAccents(s.trim().toLowerCase()).replace(/\s+/g, " ");
}

/** Levenshtein distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function maxDistanceForLength(len: number): number {
  if (len <= 3) return 1;
  return 2;
}

function candidateStrings(character: Character): string[] {
  const out: string[] = [character.name];
  const aliases = character.aliases;
  if (Array.isArray(aliases)) {
    for (const a of aliases) {
      if (a !== undefined && a !== null && String(a).trim()) {
        out.push(String(a));
      }
    }
  }
  return out;
}

/**
 * True if the user's guess matches the character's name or an alias
 * (exact normalized match, or Levenshtein within tolerance).
 */
export function isGuessCorrectForCharacter(rawInput: string, character: Character): boolean {
  const input = normalizeGuessString(rawInput);
  if (!input) return false;

  for (const raw of candidateStrings(character)) {
    const cand = normalizeGuessString(raw);
    if (!cand) continue;
    if (input === cand) return true;
    const maxLen = Math.max(input.length, cand.length);
    const maxDist = maxDistanceForLength(maxLen);
    if (levenshtein(input, cand) <= maxDist) return true;
  }
  return false;
}
