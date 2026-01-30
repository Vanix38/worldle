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
export type AttributeType = "categorical" | "numeric" | "multivalue";

export interface AttributeSchemaEntry {
  key: string;
  label: string;
  type: AttributeType;
  /** For numeric: treat as ordered and show higher/lower. */
  ordered?: boolean;
}

export type UniverseId = "one-piece";

export interface GameState {
  universeId: UniverseId;
  targetId: string;
  guesses: string[];
  won: boolean;
}
