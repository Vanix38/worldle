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
  /** Repris du fieldMapping pour les classes de largeur de colonne. */
  columnWidth?: FieldColumnWidth;
  /** For numeric: treat as ordered and show higher/lower. */
  ordered?: boolean;
  /** For Comparaison: ordered list for before/after arrow. */
  order?: string[];
  /** Optional synonym pairs (e.g. FR/EN labels) for same rank in ordered comparison. */
  orderLabelEquivalence?: [string, string][];
}

/** Largeur visuelle de colonne dans la grille de jeu (`table-fixed`). */
export type FieldColumnWidth = "small" | "medium" | "large";

/** Field behaviour from universe fieldMapping. */
export type FieldMappingFonction =
  | "Classique"
  /** Plusieurs valeurs (ex. natures séparées par des virgules) : orange si au moins une valeur en commun. */
  | "Multivalue"
  | "Recherche"
  | "Comparaison"
  | "ComparaisonDate"
  | "ComparaisonChiffre"
  /** Hint-only field: value on character, not shown in comparison grid. */
  | "Indice";

export interface FieldMappingHintMeta {
  /** Label shown next to the hint icon (e.g. "Acteur/Doubleur"). */
  prompt: string;
  /** react-icons/fa export name (e.g. "FaMicrophoneLines"). */
  icon: string;
  /**
   * Optional sort key among Indice fields (ascending).
   * When omitted, fieldMapping key order is kept.
   */
  order?: number;
  /**
   * Guesses required to unlock this hint.
   * When omitted, uses `(tierIndex + 1) * hintInterval` (default interval 5).
   */
  unlockAfter?: number;
}

/** Flat list or nested groups (e.g. saga → arcs → episodes). */
export type FieldOrder = string[] | FieldOrderMap;
export interface FieldOrderMap {
  [key: string]: FieldOrder;
}

export interface FieldMappingEntry {
  header: string;
  fonction: FieldMappingFonction;
  /** Largeur de colonne dans le tableau (défaut : medium si absent). */
  columnWidth?: FieldColumnWidth;
  /** Texte d’aide affiché dans la modale « Colonnes ». */
  description?: string;
  /** For Comparaison: flat list or grouped map (first → last chronologically). */
  order?: FieldOrder;
  /** Synonym pairs for ordered comparison / hint sorting (same chronological rank). */
  orderLabelEquivalence?: [string, string][];
  /**
   * Required for `fonction: "Indice"`.
   * Any number of Indice fields is supported (hint1, hint2, hintYear, …) —
   * unlock order follows `hint.order` then fieldMapping key order.
   */
  hint?: FieldMappingHintMeta;
  /** Include this field in character autocomplete (e.g. Naruto hint agrège équipes / affiliations). */
  includeInSearch?: boolean;
}

/** One unlockable hint tier derived from fieldMapping (`fonction: "Indice"`). */
export interface HintTierDef {
  fieldKey: string;
  prompt: string;
  icon: string;
  /** Explicit unlock threshold when set on fieldMapping.hint.unlockAfter. */
  unlockAfter?: number;
}

export type FieldMapping = Record<string, FieldMappingEntry>;

/** Ligne renvoyée par GET /api/universe/[id]/columns (modale Colonnes). */
export interface ColumnDocRow {
  key: string;
  header: string;
  description: string | null;
  fonction: FieldMappingFonction;
  hintPrompt?: string;
  columnWidth?: FieldColumnWidth;
}

export type UniverseId = string;

/** Fichier dans public/universes/{id}/specific-symbols/ — le stem remplace le mot correspondant dans les cellules. */
export interface SpecificSymbolEntry {
  stem: string;
  filename: string;
  /** URL absolue avec basePath pour <img src>. */
  url: string;
}

export interface UniverseData {
  id: string;
  name: string;
  characters: Character[];
  /** Mapping: field key -> header + fonction (Classique, Recherche, Comparaison, ComparaisonDate, ComparaisonChiffre, Indice, …). */
  fieldMapping?: FieldMapping;
  /**
   * Guesses between successive hints when `hint.unlockAfter` is omitted.
   * Default: 5 (1st at 5, 2nd at 10, …). Applies to any number of Indice fields.
   */
  hintInterval?: number;
  /** Set by server when public/universes/[id]/background.webp|.png|.jpg exists */
  backgroundImage?: string;
  schema?: AttributeSchemaEntry[];
  /** Set by server: images dans specific-symbols/ par stem de fichier = mot remplacé dans le tableau. */
  specificSymbols?: SpecificSymbolEntry[];
}

export interface GameState {
  universeId: UniverseId;
  targetId: string;
  guesses: string[];
  won: boolean;
}
