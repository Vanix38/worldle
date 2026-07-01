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
  getProgressFieldConfig,
  loadSpoilerProgress,
  selectionFromPersisted,
  type ProgressFieldConfig,
  type SpoilerProgressSelection,
} from "@/lib/spoiler-progress";
import { useUniverseData } from "@/contexts/UniverseDataContext";

export interface SpoilerProgressContextValue {
  progressField: ProgressFieldConfig | null;
  /** null = not hydrated or not configured yet. */
  selection: SpoilerProgressSelection | null;
  playableCharacters: Character[];
  hydrated: boolean;
  setSelection: (selection: SpoilerProgressSelection) => void;
}

const SpoilerProgressContext = createContext<SpoilerProgressContextValue | null>(null);

export function SpoilerProgressProvider({ children }: { children: ReactNode }) {
  const { universeId, characters, fieldMapping } = useUniverseData();
  const progressField = useMemo(
    () => getProgressFieldConfig({ id: universeId, name: "", characters, fieldMapping }),
    [universeId, characters, fieldMapping],
  );
  const [selection, setSelectionState] = useState<SpoilerProgressSelection | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!progressField) {
      setSelectionState({ mode: "all" });
      setHydrated(true);
      return;
    }
    const saved = loadSpoilerProgress(universeId);
    if (!saved) {
      setSelectionState(null);
    } else {
      setSelectionState(selectionFromPersisted(saved, progressField));
    }
    setHydrated(true);
  }, [universeId, progressField]);

  const setSelection = useCallback((next: SpoilerProgressSelection) => {
    setSelectionState(next);
  }, []);

  const playableCharacters = useMemo(() => {
    if (!hydrated) return characters;
    if (!progressField || selection === null) return characters;
    return filterPlayableCharacters(characters, progressField, selection);
  }, [characters, progressField, selection, hydrated]);

  const value = useMemo<SpoilerProgressContextValue>(
    () => ({
      progressField,
      selection,
      playableCharacters,
      hydrated,
      setSelection,
    }),
    [progressField, selection, playableCharacters, hydrated, setSelection],
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