import type { Character, FieldMapping, UniverseData } from "@/types/game";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_UNIVERSES_DIR = path.join(process.cwd(), "public", "universes");

const BACKGROUND_EXTENSIONS = ["webp", "png", "jpg"] as const;

const FONT_EXTENSIONS: { ext: string; format: string }[] = [
  { ext: "woff2", format: "woff2" },
  { ext: "woff", format: "woff" },
  { ext: "ttf", format: "truetype" },
  { ext: "otf", format: "opentype" },
];

function detectBackgroundImage(universeId: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId);
    if (!fs.existsSync(dir)) return undefined;
    for (const ext of BACKGROUND_EXTENSIONS) {
      const filePath = path.join(dir, `background.${ext}`);
      if (fs.existsSync(filePath)) return `/universes/${universeId}/background.${ext}`;
    }
  } catch {
    // ignore
  }
  return undefined;
}

function detectFont(universeId: string): UniverseData["font"] | undefined {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId);
    if (!fs.existsSync(dir)) return undefined;
    const files = fs.readdirSync(dir);
    const family = `UniverseFont-${universeId.replace(/\W/g, "-")}`;
    for (const { ext, format } of FONT_EXTENSIONS) {
      const found = files.find((f) => f.toLowerCase().endsWith(`.${ext}`));
      if (found) {
        return {
          url: `/universes/${universeId}/${found}`,
          family,
          format,
        };
      }
    }
  } catch {
    // ignore
  }
  return undefined;
}

function isValidUniverseJson(obj: unknown): obj is { id: string; name: string; characters: unknown[] } {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    Array.isArray(o.characters)
  );
}

/**
 * Returns list of universes from JSON files in data/ that have id, name, and characters.
 * Only call from server (Node) / generateStaticParams / Server Components.
 */
export function getUniverses(): { id: string; name: string }[] {
  if (typeof window !== "undefined") return [];
  const result: { id: string; name: string }[] = [];
  try {
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(DATA_DIR, file);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      try {
        const raw = fs.readFileSync(filePath, "utf-8");
        const data = JSON.parse(raw) as unknown;
        if (isValidUniverseJson(data)) {
          result.push({ id: data.id, name: data.name });
        }
      } catch {
        // skip invalid or non-universe JSON
      }
    }
  } catch {
    // no data dir or read error
  }
  return result;
}

/**
 * Loads full universe data by id. Expects file data/{universeId}.json.
 * Only call from server.
 */
export function getUniverseData(universeId: string): UniverseData | null {
  if (typeof window !== "undefined") return null;
  try {
    const filePath = path.join(DATA_DIR, `${universeId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as unknown;
    if (!isValidUniverseJson(data)) return null;
    const characters = data.characters as Character[];
    const o = data as Record<string, unknown>;
    const backgroundImage = detectBackgroundImage(data.id);
    const font = detectFont(data.id);
    const fieldMapping =
      o.fieldMapping && typeof o.fieldMapping === "object" && !Array.isArray(o.fieldMapping)
        ? (o.fieldMapping as FieldMapping)
        : undefined;
    return {
      id: data.id,
      name: data.name,
      characters,
      ...(fieldMapping && Object.keys(fieldMapping).length > 0 && { fieldMapping }),
      ...(backgroundImage && { backgroundImage }),
      ...(font && { font }),
      schema: Array.isArray(o.schema) ? (o.schema as UniverseData["schema"]) : undefined,
    };
  } catch {
    return null;
  }
}
