"use client";

import { useState, useCallback, useEffect } from "react";
import type { Character } from "@/types/game";
import type { UniverseId } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { isGuessCorrectForCharacter } from "@/lib/matchCharacterGuess";

const STORAGE_KEY = "worlddle-hardmode";

export interface HardModePersisted {
  universeId: UniverseId;
  foundIds: string[];
  currentId: string | null;
  challengeOpen: boolean;
}

function loadPersisted(universeId: UniverseId): HardModePersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HardModePersisted;
    if (parsed.universeId !== universeId) return null;
    if (!Array.isArray(parsed.foundIds)) return null;
    return {
      universeId: parsed.universeId,
      foundIds: parsed.foundIds,
      currentId: parsed.currentId ?? null,
      challengeOpen: Boolean(parsed.challengeOpen),
    };
  } catch {
    return null;
  }
}

function savePersisted(state: HardModePersisted): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function pickRandomId(
  characters: Character[],
  foundIds: string[],
  excludeId: string | null | undefined
): string | null {
  const foundSet = new Set(foundIds);
  const pool = characters.filter((c) => {
    if (foundSet.has(c.id)) return false;
    if (excludeId != null && c.id === excludeId) return false;
    return true;
  });
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

function sanitizeFoundIds(characters: Character[], foundIds: string[]): string[] {
  const ids = new Set(characters.map((c) => c.id));
  return foundIds.filter((id) => ids.has(id));
}

export function useHardModeState(universeId: UniverseId) {
  const { characters } = useUniverseData();
  const [foundIds, setFoundIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [challengeOpen, setChallengeOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (characters.length === 0) return;
    const saved = loadPersisted(universeId);
    if (saved) {
      const cleanFound = sanitizeFoundIds(characters, saved.foundIds);
      setFoundIds(cleanFound);
      const cur =
        saved.currentId && characters.some((c) => c.id === saved.currentId)
          ? saved.currentId
          : null;
      setCurrentId(cur);
      setChallengeOpen(saved.challengeOpen);
    } else {
      setFoundIds([]);
      setCurrentId(null);
      setChallengeOpen(true);
    }
    setHydrated(true);
  }, [universeId, characters]);

  useEffect(() => {
    if (!hydrated || characters.length === 0) return;
    savePersisted({
      universeId,
      foundIds,
      currentId,
      challengeOpen,
    });
  }, [hydrated, universeId, characters.length, foundIds, currentId, challengeOpen]);

  const remainingCount = characters.filter((c) => !foundIds.includes(c.id)).length;
  const allFound =
    characters.length > 0 &&
    foundIds.length === characters.length &&
    currentId === null;

  const startSession = useCallback(() => {
    if (characters.length === 0) return;
    const cleanFound = sanitizeFoundIds(characters, foundIds);
    setFoundIds(cleanFound);
    const id = pickRandomId(characters, cleanFound, null);
    setCurrentId(id);
    setChallengeOpen(id !== null);
  }, [characters, foundIds]);

  const submitGuess = useCallback(
    (text: string): boolean => {
      if (!currentId) return false;
      const char = characters.find((c) => c.id === currentId);
      if (!char) return false;
      if (!isGuessCorrectForCharacter(text, char)) return false;

      const nextFound = [...foundIds, currentId];
      setFoundIds(nextFound);
      const nextId = pickRandomId(characters, nextFound, null);
      setCurrentId(nextId);
      setChallengeOpen(nextId !== null);
      return true;
    },
    [characters, currentId, foundIds]
  );

  const skip = useCallback(() => {
    if (!currentId) return;
    const nextId = pickRandomId(characters, foundIds, currentId);
    if (nextId) setCurrentId(nextId);
  }, [characters, foundIds, currentId]);

  const closeChallenge = useCallback(() => setChallengeOpen(false), []);
  const openChallenge = useCallback(() => setChallengeOpen(true), []);

  const resetSession = useCallback(() => {
    setFoundIds([]);
    setCurrentId(null);
    setChallengeOpen(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }
  }, []);

  /** Clear progress and draw a new random character (full reset + start). */
  const resetAndStartNewSeries = useCallback(() => {
    if (characters.length === 0) return;
    const id = pickRandomId(characters, [], null);
    setFoundIds([]);
    setCurrentId(id);
    setChallengeOpen(true);
  }, [characters]);

  const hasSavedProgress = foundIds.length > 0 || currentId !== null;

  return {
    hydrated,
    foundIds,
    currentId,
    challengeOpen,
    remainingCount,
    allFound,
    hasSavedProgress,
    startSession,
    submitGuess,
    skip,
    closeChallenge,
    openChallenge,
    resetSession,
    resetAndStartNewSeries,
  };
}

export type HardModeApi = ReturnType<typeof useHardModeState>;
