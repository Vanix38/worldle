/** Pack kind: brands catalog or universe-linked logos. */
export type LogoQuizKind = "brands" | "universe";

/** Difficulty level for a logo entry (optional in JSON). */
export type LogoQuizDifficulty =
  | "Très facile"
  | "Facile"
  | "Moyen"
  | "Difficile"
  | "Impossible";

/** One logo entry in a pack JSON. */
export interface LogoEntry {
  id: string;
  name: string;
  aliases?: string[];
  /** Optional difficulty shown on the list and play screens. */
  difficulty?: LogoQuizDifficulty;
  /** Resolved at load time from public/logo-quiz/{packId}/logos/{id}.* */
  imageUrl?: string;
  /**
   * Optional full/branded asset shown once the logo is found.
   * Resolved from public/logo-quiz/{packId}/logos/{id}-full.*
   */
  fullImageUrl?: string;
}

/** Named group of logos inside a pack (e.g. Clans, Villages). */
export interface LogoQuizSection {
  id: string;
  name: string;
  logos: LogoEntry[];
}

/** Raw / loaded logo quiz pack. */
export interface LogoQuizPack {
  id: string;
  name: string;
  description?: string;
  kind: LogoQuizKind;
  /** Optional link to a Worlddle universe id when kind is "universe". */
  relatedUniverseId?: string;
  /** Extra random letters in the bank (default 8). */
  decoyLetterCount?: number;
  /**
   * Optional sections. When present, `logos` is the flattened list
   * (section order preserved) for navigation / progress.
   */
  sections?: LogoQuizSection[];
  /** All logos (flat). Always populated by the loader. */
  logos: LogoEntry[];
  banner?: string;
  logo?: string;
  backgroundImage?: string;
}

/** Home / listing card for a pack. */
export interface LogoQuizPackListItem {
  id: string;
  name: string;
  description?: string;
  kind: LogoQuizKind;
  banner?: string;
  logo?: string;
}

/** Hint shown on a bank tile after a wrong guess. */
export type LogoLetterHint = "present" | "absent";

/** Letter tile in the bank (stable id for drag/click). */
export interface LogoLetterTile {
  id: string;
  letter: string;
  used: boolean;
  /** Set when the tile returned to the bank after validation. */
  hint?: LogoLetterHint;
}

/** Persisted in-progress / finished round. */
export interface LogoQuizGameState {
  packId: string;
  targetId: string;
  /** Tile ids placed in playable letter slots (null = empty). Length = playable letter count. */
  slots: (string | null)[];
  /** Exact matches locked in place after a wrong guess (cannot be cleared). */
  lockedSlots: boolean[];
  bank: LogoLetterTile[];
  won: boolean;
}
