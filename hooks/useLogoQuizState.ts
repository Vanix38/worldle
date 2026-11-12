"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createLetterBank,
  evaluateLetterPlacements,
  getPlayableLetterCount,
  isCorrectAnswer,
  resolveSlotLetters,
} from "@/lib/logo-quiz-letters";
import { markLogoCompleted } from "@/lib/logo-quiz-progress";
import type {
  LogoEntry,
  LogoLetterTile,
  LogoQuizGameState,
  LogoQuizPack,
} from "@/types/logo-quiz";

const STORAGE_KEY = "worlddle-logo-quiz";
const DEFAULT_DECOY_COUNT = 8;

function loadState(packId: string, logoId: string): LogoQuizGameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LogoQuizGameState;
    if (parsed.packId !== packId || parsed.targetId !== logoId) return null;
    if (!Array.isArray(parsed.slots) || !Array.isArray(parsed.bank)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: LogoQuizGameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

function createGameForLogo(
  pack: LogoQuizPack,
  logo: LogoEntry
): LogoQuizGameState {
  const decoyCount = pack.decoyLetterCount ?? DEFAULT_DECOY_COUNT;
  const bank = createLetterBank(logo.name, decoyCount);
  const slotCount = getPlayableLetterCount(logo.name);
  return {
    packId: pack.id,
    targetId: logo.id,
    slots: Array.from({ length: slotCount }, () => null),
    lockedSlots: Array.from({ length: slotCount }, () => false),
    bank,
    won: false,
  };
}

function normalizeLoadedState(
  state: LogoQuizGameState,
  logo: LogoEntry
): LogoQuizGameState | null {
  const expectedSlots = getPlayableLetterCount(logo.name);
  if (state.slots.length !== expectedSlots) return null;
  if (!Array.isArray(state.bank) || state.bank.length === 0) return null;
  const lockedSlots =
    Array.isArray(state.lockedSlots) && state.lockedSlots.length === expectedSlots
      ? state.lockedSlots
      : Array.from({ length: expectedSlots }, () => false);
  return { ...state, lockedSlots };
}

function applyWrongGuessFeedback(
  prev: LogoQuizGameState,
  answerName: string
): LogoQuizGameState {
  const filled = resolveSlotLetters(prev.slots, prev.bank);
  const placements = evaluateLetterPlacements(filled, answerName);
  const byId = new Map(prev.bank.map((t) => [t.id, t]));

  const slots = [...prev.slots];
  const lockedSlots = [...prev.lockedSlots];
  const bankUpdates = new Map<string, LogoLetterTile>();

  for (let i = 0; i < placements.length; i += 1) {
    const tileId = prev.slots[i];
    if (!tileId) continue;
    const tile = byId.get(tileId);
    if (!tile) continue;
    const status = placements[i]!;

    if (status === "exact") {
      lockedSlots[i] = true;
      continue;
    }

    slots[i] = null;
    lockedSlots[i] = false;
    bankUpdates.set(tileId, {
      ...tile,
      used: false,
      hint: status === "present" ? "present" : "absent",
    });
  }

  const bank = prev.bank.map((t) => bankUpdates.get(t.id) ?? t);
  return { ...prev, slots, lockedSlots, bank, won: false };
}

export function useLogoQuizState(pack: LogoQuizPack, logoId: string) {
  const logo = useMemo(
    () => pack.logos.find((l) => l.id === logoId),
    [pack.logos, logoId]
  );

  const [state, setState] = useState<LogoQuizGameState | null>(null);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(false);
    setWrongFlash(false);
    if (!logo) {
      setState(null);
      setHydrated(true);
      return;
    }
    const saved = loadState(pack.id, logo.id);
    const normalized = saved ? normalizeLoadedState(saved, logo) : null;
    setState(normalized ?? createGameForLogo(pack, logo));
    setHydrated(true);
  }, [pack, logo]);

  useEffect(() => {
    if (!hydrated || !state) return;
    saveState(state);
  }, [state, hydrated]);

  const checkAnswer = useCallback(
    (next: LogoQuizGameState, targetLogo: LogoEntry) => {
      if (next.slots.some((s) => s === null)) return next;
      const filled = resolveSlotLetters(next.slots, next.bank);
      if (isCorrectAnswer(filled, targetLogo.name, targetLogo.aliases ?? [])) {
        markLogoCompleted(pack.id, targetLogo.id);
        return {
          ...next,
          lockedSlots: next.slots.map(() => true),
          won: true,
        };
      }
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 450);
      return applyWrongGuessFeedback(next, targetLogo.name);
    },
    [pack.id]
  );

  const selectFromBank = useCallback(
    (tileId: string) => {
      if (!state || state.won || !logo) return;
      const tile = state.bank.find((t) => t.id === tileId);
      if (!tile || tile.used || tile.hint === "absent") return;
      const emptyIndex = state.slots.findIndex((s) => s === null);
      if (emptyIndex === -1) return;

      const slots = [...state.slots];
      slots[emptyIndex] = tileId;
      const bank = state.bank.map((t) => (t.id === tileId ? { ...t, used: true } : t));
      let next: LogoQuizGameState = { ...state, slots, bank };
      next = checkAnswer(next, logo);
      setState(next);
    },
    [state, logo, checkAnswer]
  );

  const removeFromSlot = useCallback(
    (playableIndex: number) => {
      if (!state || state.won) return;
      if (state.lockedSlots[playableIndex]) return;
      const tileId = state.slots[playableIndex];
      if (!tileId) return;
      const slots = [...state.slots];
      slots[playableIndex] = null;
      const bank = state.bank.map((t) => (t.id === tileId ? { ...t, used: false } : t));
      setState({ ...state, slots, bank });
    },
    [state]
  );

  const resetGame = useCallback(() => {
    if (!logo) return;
    setWrongFlash(false);
    setState(createGameForLogo(pack, logo));
  }, [pack, logo]);

  const availableBank = useMemo(
    () => (state ? state.bank.filter((t) => !t.used && t.hint !== "absent") : []),
    [state]
  );

  return {
    state,
    target: logo,
    hydrated,
    wrongFlash,
    availableBank,
    selectFromBank,
    removeFromSlot,
    resetGame,
    isMissingLogo: !logo,
  };
}

export function getNextLogoId(pack: LogoQuizPack, currentLogoId: string): string | null {
  const index = pack.logos.findIndex((l) => l.id === currentLogoId);
  if (index === -1 || pack.logos.length === 0) return null;
  if (index >= pack.logos.length - 1) return null;
  return pack.logos[index + 1]!.id;
}
