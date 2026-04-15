/** Feedback status for a single attribute. */
export type FeedbackStatus = "exact" | "partial" | "none" | "higher" | "lower";

export interface AttributeFeedback {
  key: string;
  label: string;
  value: string | number;
  status: FeedbackStatus;
}

/** Character base: id, name, optional image, optional aliases, and arbitrary attributes. */
export interface Character {
  id: string;
  name: string;
  imageUrl?: string;
  aliases?: string[];
  [key: string]: string | number | string[] | undefined;
}

/** Schema entry for one attribute: type and label. */
export type AttributeType = "categorical" | "numeric" | "multivalue" | "date";

export interface AttributeSchemaEntry {
  key: string;
  label: string;
  type: AttributeType;
  /** For numeric: treat as ordered and show higher/lower. */
  ordered?: boolean;
  /** For Comparaison: ordered list for before/after arrow. */
  order?: string[];
}

/** Field behaviour from universe fieldMapping. */
export type FieldMappingFonction =
  | "Classique"
  | "Recherche"
  | "Comparaison"
  | "ComparaisonDate"
  | "ComparaisonChiffre"
  /** Hint-only field: value on character, not shown in comparison grid. */
  | "Indice";

export interface FieldMappingHintMeta {
  /** Label shown next to the hint icon (e.g. "Acteur/Doubleur"). */
  prompt: string;
  /** react-icons export name (e.g. "FaMicrophoneLines"). */
  icon: string;
}

export interface FieldMappingEntry {
  header: string;
  fonction: FieldMappingFonction;
  /** For Comparaison: ordered list (first = avant, last = après). */
  order?: string[];
  /** If set, this field is a hint tier (order = key order in fieldMapping). */
  hint?: FieldMappingHintMeta;
}

/** One unlockable hint tier derived from fieldMapping. */
export interface HintTierDef {
  fieldKey: string;
  prompt: string;
  icon: string;
}

export type FieldMapping = Record<string, FieldMappingEntry>;

export type UniverseId = string;

export interface UniverseData {
  id: string;
  name: string;
  characters: Character[];
  /** Mapping: field key -> header + fonction (Classique, Recherche, Comparaison, ComparaisonDate, ComparaisonChiffre). */
  fieldMapping?: FieldMapping;
  /** Set by server when public/universes/[id]/background.webp|.png|.jpg exists */
  backgroundImage?: string;
  /** Set by server when font file(s) exist in public/universes/[id]/ */
  font?: { url: string; family: string; format: string };
  schema?: AttributeSchemaEntry[];
}

export interface GameState {
  universeId: UniverseId;
  targetId: string;
  guesses: string[];
  won: boolean;
}
