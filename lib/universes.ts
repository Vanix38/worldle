import type { UniverseId } from "@/types/game";

export const UNIVERSES: { id: UniverseId; name: string }[] = [
  { id: "one-piece", name: "One Piece" },
];

export function getUniverseName(universeId: string): string {
  return UNIVERSES.find((u) => u.id === universeId)?.name ?? universeId;
}
