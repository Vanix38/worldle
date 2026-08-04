"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Character } from "@/types/game";
import {
  filterPlayableCharacters,
  getDifficultyConfig,
  getProgressFieldConfig,
  loadSpoilerProgress,
  resolveMaxDifficulty,
  selectionFromPersisted,
  type DifficultyConfig,
  type ProgressFieldConfig,
  type SpoilerProgressSelection,
} from "@/lib/spoiler-progress";
import { useUniverseData } from "@/contexts/UniverseDataContext";

export interface SpoilerProgressContextValue {
  progressField: ProgressFieldConfig | null;
  difficultyConfig: DifficultyConfig | null;
  /** null = not hydrated or not configured yet. */
  selection: SpoilerProgressSelection | null;
  /** Max difficulty label (inclusive); null if universe has no difficulty field. */
  maxDifficulty: string | null;
  playableCharacters: Character[];
  hydrated: boolean;
  setSelection: (selection: SpoilerProgressSelection) => void;
  setMaxDifficulty: (label: string) => void;
}

const SpoilerProgressContext = createContext<SpoilerProgressContextValue | null>(null);

export function SpoilerProgressProvider({ children }: { children: ReactNode }) {
  const { universeId, characters, fieldMapping } = useUniverseData();
  const universeStub = useMemo(
    () => ({ id: universeId, name: "", characters, fieldMapping }),
    [universeId, characters, fieldMapping],
  );
  const progressField = useMemo(
    () => getProgressFieldConfig(universeStub),
    [universeStub],
  );
  const difficultyConfig = useMemo(
    () => getDifficultyConfig(universeStub),
    [universeStub],
  );
  const [selection, setSelectionState] = useState<SpoilerProgressSelection | null>(null);
  const [maxDifficulty, setMaxDifficultyState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadSpoilerProgress(universeId);

    if (!progressField) {
      setSelectionState({ mode: "all" });
    } else if (!saved) {
      setSelectionState(null);
    } else {
      setSelectionState(selectionFromPersisted(saved, progressField));
    }

    setMaxDifficultyState(resolveMaxDifficulty(saved, difficultyConfig));
    setHydrated(true);
  }, [universeId, progressField, difficultyConfig]);

  const setSelection = useCallback((next: SpoilerProgressSelection) => {
    setSelectionState(next);
  }, []);

  const setMaxDifficulty = useCallback((label: string) => {
    setMaxDifficultyState(label);
  }, []);

  const playableCharacters = useMemo(() => {
    if (!hydrated) return characters;
    if (progressField && selection === null) return characters;
    return filterPlayableCharacters(
      characters,
      progressField,
      selection ?? { mode: "all" },
      difficultyConfig,
      maxDifficulty,
    );
  }, [
    characters,
    progressField,
    selection,
    difficultyConfig,
    maxDifficulty,
    hydrated,
  ]);

  const value = useMemo<SpoilerProgressContextValue>(
    () => ({
      progressField,
      difficultyConfig,
      selection,
      maxDifficulty,
      playableCharacters,
      hydrated,
      setSelection,
      setMaxDifficulty,
    }),
    [
      progressField,
      difficultyConfig,
      selection,
      maxDifficulty,
      playableCharacters,
      hydrated,
      setSelection,
      setMaxDifficulty,
    ],
  );

  return (
    <SpoilerProgressContext.Provider value={value}>{children}</SpoilerProgressContext.Provider>
  );
}

export function useSpoilerProgress(): SpoilerProgressContextValue {
  const ctx = useContext(SpoilerProgressContext);
  if (!ctx) {
    throw new Error("useSpoilerProgress must be used within SpoilerProgressProvider");
  }
  return ctx;
}
