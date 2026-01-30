"use client";

import { useState, useCallback, useEffect } from "react";
import type { GameState, Character } from "@/types/game";
import type { UniverseId } from "@/types/game";
import { createNewGame, getCharacterById, getCharacterByName } from "@/lib/game";
import { getFeedback } from "@/lib/compare";
import { getSchema } from "@/lib/schemas";
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

export interface GuessRowData {
  character: Character;
  feedback: AttributeFeedback[];
}

export function useGameState(universeId: UniverseId) {
  const [state, setState] = useState<GameState | null>(null);

  useEffect(() => {
    const saved = loadState(universeId);
    if (saved) {
      setState(saved);
    } else {
      setState(createNewGame(universeId));
    }
  }, [universeId]);

  useEffect(() => {
    if (state) saveState(state);
  }, [state]);

  const target = state ? getCharacterById(universeId, state.targetId) : undefined;
  const schema = getSchema(universeId);

  const guessRows: GuessRowData[] = [];
  if (state && target && schema.length) {
    for (const charId of state.guesses) {
      const character = getCharacterById(universeId, charId);
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
    setState(createNewGame(universeId));
  }, [universeId]);

  return {
    state,
    target,
    guessRows,
    schema,
    submitGuess,
    startNewGame,
  };
}
