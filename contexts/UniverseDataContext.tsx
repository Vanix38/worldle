"use client";

import { createContext, useContext, useMemo } from "react";
import type { AttributeSchemaEntry, Character, UniverseData } from "@/types/game";
import { getSchemaFromUniverseData, getSearchFieldKeys } from "@/lib/schemas";

export interface UniverseDataContextValue {
  universeId: string;
  universeName: string;
  characters: Character[];
  schema: AttributeSchemaEntry[];
  /** Field keys with fonction Recherche (searchable but not displayed in table). */
  searchFieldKeys: string[];
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
    return {
      universeId: universeData.id,
      universeName: universeData.name,
      characters: universeData.characters,
      schema,
      searchFieldKeys,
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
