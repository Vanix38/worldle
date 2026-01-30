import type { AttributeSchemaEntry } from "@/types/game";

export const ONE_PIECE_SCHEMA: AttributeSchemaEntry[] = [
  { key: "gender", label: "Genre", type: "categorical" },
  { key: "age", label: "Âge", type: "numeric", ordered: true },
  { key: "bounty", label: "Prime", type: "numeric", ordered: true },
  { key: "arc", label: "1er arc d'apparition", type: "categorical" },
  { key: "devilFruitType", label: "Type de fruit du démon", type: "categorical" },
  { key: "affiliation", label: "Affiliation (équipage/Marine/Cypher Pol etc)", type: "categorical" },
  { key: "origin", label: "Origine", type: "categorical" },
  { key: "haki", label: "Haki(s) maîtrisé(s)", type: "multivalue" },
];

export function getSchema(universeId: string): AttributeSchemaEntry[] {
  if (universeId === "one-piece") return ONE_PIECE_SCHEMA;
  return [];
}

/** Attribute key to reveal as first hint after N wrong guesses (Phase 2). */
export function getHintAttribute(universeId: string): string | null {
  if (universeId === "one-piece") return "arc";
  return null;
}
