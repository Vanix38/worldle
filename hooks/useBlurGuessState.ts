"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Character, GameState, UniverseId } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";

const STORAGE_KEY = "worlddle-blur";

/** Paliers de flou (px) : diminue à chaque mauvaise réponse. */
const BLUR_STEPS_PX = [24, 16, 8, 4, 0] as const;

export function getBlurPixels(won: boolean, wrongGuessCount: number): number {
  if (won) return 0;
  const idx = Math.min(wrongGuessCount, BLUR_STEPS_PX.length - 1);
  return BLUR_STEPS_PX[idx];
}

function loadState(universeId: UniverseId): GameState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (parsed.universeId !== universeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveState(state: GameState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function getCharacterById(characters: Character[], id: string): Character | undefined {
  return characters.find((c) => c.id === id);
}

function createNewGame(universeId: UniverseId, characters: Character[]): GameState {
  const target = characters[Math.floor(Math.random() * characters.length)];
  return {
    universeId,
    targetId: target.id,
    guesses: [],
    won: false,
  };
}

export function useBlurGuessState(universeId: UniverseId) {
  const { characters } = useUniverseData();
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    if (characters.length === 0) return;
    const saved = loadState(universeId);
    if (saved) {
      setState(saved);
    } else {
      setState(createNewGame(universeId, characters));
    }
  }, [universeId, characters.length]); // eslint-disable-line react-hooks/exhaustive-deps -- characters list stable per universe

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const target = state ? getCharacterById(characters, state.targetId) : undefined;

  useEffect(() => {
    if (!state || characters.length === 0) return;
    if (!characters.some((c) => c.id === state.targetId)) {
      setState(createNewGame(universeId, characters));
    }
  }, [state, characters, universeId]);

  const blurPx = useMemo(() => {
    if (!state) return BLUR_STEPS_PX[0];
    const wrong = state.won ? Math.max(0, state.guesses.length - 1) : state.guesses.length;
    return getBlurPixels(state.won, wrong);
  }, [state]);

  const submitGuess = useCallback(
    (character: Character) => {
      if (!state || state.won || !target) return;
      if (state.guesses.includes(character.id)) return;
      const newGuesses = [...state.guesses, character.id];
      setState({
        ...state,
        guesses: newGuesses,
        won: character.id === state.targetId,
      });
    },
    [state, target],
  );

  const startNewGame = useCallback(() => {
    if (characters.length === 0) return;
    setState(createNewGame(universeId, characters));
  }, [universeId, characters]);

  return {
    state,
    target,
    blurPx,
    submitGuess,
    startNewGame,
  };
}
