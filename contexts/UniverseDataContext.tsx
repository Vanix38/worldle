"use client";

import { createContext, useContext, useMemo } from "react";
import type { AttributeSchemaEntry, Character, HintTierDef, SpecificSymbolEntry, UniverseData } from "@/types/game";
import { getHintInterval, getHintTiers, getSchemaFromUniverseData, getSearchFieldKeys } from "@/lib/schemas";
import { SpecificSymbolTapProvider } from "@/contexts/SpecificSymbolTapContext";
import { SpoilerProgressProvider } from "@/contexts/SpoilerProgressContext";
import type { FieldMapping } from "@/types/game";

export interface UniverseDataContextValue {
  universeId: string;
  universeName: string;
  characters: Character[];
  schema: AttributeSchemaEntry[];
  /** Field keys with fonction Recherche (searchable but not displayed in table). */
  searchFieldKeys: string[];
  /** Hint tiers (`fonction: "Indice"`), unlimited — order from fieldMapping. */
  hintTiers: HintTierDef[];
  /** Guesses between successive auto-scheduled hints (universe JSON `hintInterval`, default 5). */
  hintInterval: number;
  /** Remplacements pictos (public/universes/{id}/specific-symbols/). */
  specificSymbols: SpecificSymbolEntry[];
  fieldMapping: FieldMapping;
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
    const hintInterval = getHintInterval(universeData);
    return {
      universeId: universeData.id,
      universeName: universeData.name,
      characters: universeData.characters,
      schema,
      searchFieldKeys,
      hintTiers,
      hintInterval,
      specificSymbols: universeData.specificSymbols ?? [],
      fieldMapping: universeData.fieldMapping ?? {},
    };
  }, [universeData]);

  return (
    <UniverseDataContext.Provider value={value}>
      <SpecificSymbolTapProvider>
        <SpoilerProgressProvider>{children}</SpoilerProgressProvider>
      </SpecificSymbolTapProvider>
    </UniverseDataContext.Provider>
  );
}

export function useUniverseData(): UniverseDataContextValue {
  const ctx = useContext(UniverseDataContext);
  if (!ctx) throw new Error("useUniverseData must be used within UniverseDataProvider");
  return ctx;
}
