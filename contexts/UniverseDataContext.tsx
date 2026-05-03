"use client";

import { createContext, useContext, useMemo } from "react";
import type { AttributeSchemaEntry, Character, HintTierDef, SpecificSymbolEntry, UniverseData } from "@/types/game";
import { getHintTiers, getSchemaFromUniverseData, getSearchFieldKeys } from "@/lib/schemas";

export interface UniverseDataContextValue {
  universeId: string;
  universeName: string;
  characters: Character[];
  schema: AttributeSchemaEntry[];
  /** Field keys with fonction Recherche (searchable but not displayed in table). */
  searchFieldKeys: string[];
  /** Hint tiers (fieldMapping entries with `hint`), in JSON key order. */
  hintTiers: HintTierDef[];
  /** Remplacements pictos (public/universes/{id}/specific-symbols/). */
  specificSymbols: SpecificSymbolEntry[];
}

const UniverseDataContext = createContext<UniverseDataContextValue | null>(null);

export function UniverseDataProvider({
  universeData,
  children,
}: {
  universeData: UniverseData;
  children: React.ReactNode;
}) {
  const value = useMemo<UniverseDataContextValue>(() => {
    const schema = getSchemaFromUniverseData(universeData);
    const searchFieldKeys = getSearchFieldKeys(universeData);
    const hintTiers = getHintTiers(universeData);
    return {
      universeId: universeData.id,
      universeName: universeData.name,
      characters: universeData.characters,
      schema,
      searchFieldKeys,
      hintTiers,
      specificSymbols: universeData.specificSymbols ?? [],
    };
  }, [universeData]);

  return (
    <UniverseDataContext.Provider value={value}>
      {children}
    </UniverseDataContext.Provider>
  );
}

export function useUniverseData(): UniverseDataContextValue {
  const ctx = useContext(UniverseDataContext);
  if (!ctx) throw new Error("useUniverseData must be used within UniverseDataProvider");
  return ctx;
}
