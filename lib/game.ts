import type { Character, GameState, UniverseId } from "@/types/game";
import onePieceData from "@/data/one-piece.json";

const universes: Record<UniverseId, { characters: Character[] }> = {
  "one-piece": onePieceData as { characters: Character[] },
};

export function getCharacters(universeId: UniverseId): Character[] {
  return universes[universeId]?.characters ?? [];
}

export function getCharacterById(universeId: UniverseId, id: string): Character | undefined {
  return getCharacters(universeId).find((c) => c.id === id);
}

export function getCharacterByName(universeId: UniverseId, name: string): Character | undefined {
  const normalized = name.trim().toLowerCase();
  return getCharacters(universeId).find(
    (c) => c.name.trim().toLowerCase() === normalized
  );
}

export function searchCharacters(universeId: UniverseId, query: string): Character[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return getCharacters(universeId)
    .filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(normalized);
      const aliasMatch = (c.aliases ?? []).some((a) =>
        String(a).toLowerCase().includes(normalized)
      );
      return nameMatch || aliasMatch;
    })
    .slice(0, 8);
}

/** Pick a random character for a new game (infinite play, not daily). */
export function getRandomCharacter(universeId: UniverseId): Character {
  const list = getCharacters(universeId);
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export function createNewGame(universeId: UniverseId): GameState {
  const chars = getCharacters(universeId);
  const target = chars[Math.floor(Math.random() * chars.length)];
  return {
    universeId,
    targetId: target.id,
    guesses: [],
    won: false,
  };
}
