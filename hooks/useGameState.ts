"use client";

import { useState, useCallback, useEffect } from "react";
import type { GameState, Character } from "@/types/game";
import type { UniverseId } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { useSpoilerProgress } from "@/contexts/SpoilerProgressContext";
import { getFeedback } from "@/lib/compare";
import type { AttributeFeedback } from "@/types/game";

const STORAGE_KEY = "worlddle-game";

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

export interface GuessRowData {
  character: Character;
  feedback: AttributeFeedback[];
}

export function useGameState(universeId: UniverseId) {
  const { characters, schema } = useUniverseData();
  const { playableCharacters, hydrated: spoilerHydrated } = useSpoilerProgress();
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    if (!spoilerHydrated || playableCharacters.length === 0) return;
    const saved = loadState(universeId);
    if (saved && playableCharacters.some((c) => c.id === saved.targetId)) {
      setState(saved);
    } else {
      setState(createNewGame(universeId, playableCharacters));
    }
  }, [universeId, spoilerHydrated, playableCharacters]);

  useEffect(() => {
    if (!state || !spoilerHydrated || playableCharacters.length === 0) return;
    if (!playableCharacters.some((c) => c.id === state.targetId)) {
      setState(createNewGame(universeId, playableCharacters));
    }
  }, [state, spoilerHydrated, playableCharacters, universeId]);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const target = state ? getCharacterById(characters, state.targetId) : undefined;

  const guessRows: GuessRowData[] = [];
  if (state && target && schema.length) {
    for (const charId of state.guesses) {
      const character = getCharacterById(characters, charId);
      if (character) {
        guessRows.push({
          character,
          feedback: getFeedback(character, target, schema),
        });
      }
    }
  }

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
    [state, target]
  );

  const startNewGame = useCallback(() => {
    if (playableCharacters.length === 0) return;
    setState(createNewGame(universeId, playableCharacters));
  }, [universeId, playableCharacters]);

  return {
    state,
    target,
    guessRows,
    schema,
    submitGuess,
    startNewGame,
  };
}
