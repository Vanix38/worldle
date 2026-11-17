import { stripAccents } from "@/lib/utils";
import type { LogoLetterTile } from "@/types/logo-quiz";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Fixed separators shown in the answer row (not playable). */
export function isLogoSeparator(char: string): boolean {
  return char === " " || char === "-" || char === "–" || char === "—";
}

export type AnswerSlotKind = "letter" | "separator";

export interface AnswerSlotDef {
  kind: AnswerSlotKind;
  /** Display char for separators; empty for letter slots. */
  char: string;
  /** Index into playable slots array when kind is "letter". */
  playableIndex: number | null;
}

/**
 * Builds the answer row pattern from the logo name.
 * Letter positions become empty playable slots; spaces/hyphens stay fixed.
 */
export function buildAnswerPattern(name: string): AnswerSlotDef[] {
  const pattern: AnswerSlotDef[] = [];
  let playableIndex = 0;
  for (const raw of name) {
    if (isLogoSeparator(raw)) {
      pattern.push({ kind: "separator", char: raw === " " ? " " : "-", playableIndex: null });
      continue;
    }
    if (!/\p{L}|\p{N}/u.test(raw)) continue;
    pattern.push({ kind: "letter", char: "", playableIndex });
    playableIndex += 1;
  }
  return pattern;
}

export function getPlayableLetterCount(name: string): number {
  return buildAnswerPattern(name).filter((s) => s.kind === "letter").length;
}

/**
 * Groups answer slots by word (split on spaces only).
 * Hyphens stay inside a word group so "Land-Rover"-style stays one line.
 */
export function groupAnswerPatternByWord(pattern: AnswerSlotDef[]): AnswerSlotDef[][] {
  const groups: AnswerSlotDef[][] = [];
  let current: AnswerSlotDef[] = [];
  for (const slot of pattern) {
    if (slot.kind === "separator" && slot.char === " ") {
      if (current.length) groups.push(current);
      current = [];
      continue;
    }
    current.push(slot);
  }
  if (current.length) groups.push(current);
  return groups;
}

function normalizeLetter(char: string): string {
  return stripAccents(char).toUpperCase();
}

/** Letters that must appear in the bank (from the answer name). */
export function extractAnswerLetters(name: string): string[] {
  const letters: string[] = [];
  for (const raw of name) {
    if (isLogoSeparator(raw)) continue;
    if (!/\p{L}|\p{N}/u.test(raw)) continue;
    letters.push(normalizeLetter(raw));
  }
  return letters;
}

function lettersOnlyNormalized(value: string): string {
  let out = "";
  for (const raw of stripAccents(value).toUpperCase()) {
    if (/\p{L}|\p{N}/u.test(raw)) out += raw;
  }
  return out;
}

/**
 * True when the filled playable letters match the name or an alias
 * (case / accent insensitive; separators ignored in comparison).
 */
export function isCorrectAnswer(
  filledLetters: string[],
  name: string,
  aliases: string[] = []
): boolean {
  const candidate = filledLetters.map(normalizeLetter).join("");
  if (!candidate) return false;
  const targets = [name, ...aliases].map(lettersOnlyNormalized);
  return targets.some((t) => t === candidate);
}

export type LetterPlacementStatus = "exact" | "present" | "absent";

/**
 * Wordle-style placement feedback for a full guess vs the answer letters.
 * Handles duplicate letters with two-pass exact-then-present counting.
 */
export function evaluateLetterPlacements(
  guessLetters: string[],
  answerName: string
): LetterPlacementStatus[] {
  const answer = extractAnswerLetters(answerName);
  const n = guessLetters.length;
  const status: (LetterPlacementStatus | null)[] = Array.from({ length: n }, () => null);
  const remaining = new Map<string, number>();

  for (const letter of answer) {
    remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
  }

  for (let i = 0; i < n; i += 1) {
    const guess = normalizeLetter(guessLetters[i] ?? "");
    const expected = answer[i] ?? "";
    if (guess && guess === expected) {
      status[i] = "exact";
      remaining.set(guess, (remaining.get(guess) ?? 0) - 1);
    }
  }

  for (let i = 0; i < n; i += 1) {
    if (status[i]) continue;
    const guess = normalizeLetter(guessLetters[i] ?? "");
    const left = remaining.get(guess) ?? 0;
    if (guess && left > 0) {
      status[i] = "present";
      remaining.set(guess, left - 1);
    } else {
      status[i] = "absent";
    }
  }

  return status.map((s) => s ?? "absent");
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function pickDecoyLetters(answerLetters: string[], count: number): string[] {
  if (count <= 0) return [];
  const needed = new Map<string, number>();
  for (const l of answerLetters) {
    needed.set(l, (needed.get(l) ?? 0) + 1);
  }
  const decoys: string[] = [];
  let guard = 0;
  while (decoys.length < count && guard < count * 20) {
    guard += 1;
    const letter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!;
    const already = needed.get(letter) ?? 0;
    // Prefer letters not already heavily represented; always allow if alphabet exhausted.
    if (already > 2 && Math.random() > 0.3) continue;
    decoys.push(letter);
    needed.set(letter, already + 1);
  }
  while (decoys.length < count) {
    decoys.push(ALPHABET[Math.floor(Math.random() * ALPHABET.length)]!);
  }
  return decoys;
}

/**
 * Builds a shuffled letter bank: answer letters + decoys.
 */
export function createLetterBank(
  name: string,
  decoyLetterCount = 8
): LogoLetterTile[] {
  const answer = extractAnswerLetters(name);
  const decoys = pickDecoyLetters(answer, decoyLetterCount);
  const letters = shuffleInPlace([...answer, ...decoys]);
  return letters.map((letter, index) => ({
    id: `t${index}-${letter}`,
    letter,
    used: false,
  }));
}

/** Resolve display letters currently in slots (empty string for gaps). */
export function resolveSlotLetters(
  slots: (string | null)[],
  bank: LogoLetterTile[]
): string[] {
  const byId = new Map(bank.map((t) => [t.id, t.letter]));
  // Also look up used tiles that remain in bank array
  return slots.map((id) => (id ? byId.get(id) ?? "" : ""));
}

export function buildDisplayAnswer(
  name: string,
  slots: (string | null)[],
  bank: LogoLetterTile[]
): string {
  const pattern = buildAnswerPattern(name);
  const letters = resolveSlotLetters(slots, bank);
  let out = "";
  for (const slot of pattern) {
    if (slot.kind === "separator") {
      out += slot.char;
      continue;
    }
    const letter = slot.playableIndex !== null ? letters[slot.playableIndex] ?? "" : "";
    out += letter || "_";
  }
  return out;
}
