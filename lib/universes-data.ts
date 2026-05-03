import type { Character, FieldMapping, SpecificSymbolEntry, UniverseData } from "@/types/game";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLIC_UNIVERSES_DIR = path.join(process.cwd(), "public", "universes");

const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "svg"] as const;

const SPECIFIC_SYMBOL_EXTENSIONS = [".svg", ".webp", ".png", ".gif", ".jpg", ".jpeg"] as const;

function extPriority(ext: string): number {
  const i = SPECIFIC_SYMBOL_EXTENSIONS.indexOf(ext.toLowerCase() as (typeof SPECIFIC_SYMBOL_EXTENSIONS)[number]);
  return i === -1 ? 99 : i;
}

/**
 * Liste les fichiers image dans public/universes/{id}/specific-symbols/
 * (nom du fichier sans extension = mot à remplacer, insensible aux accents / espaces → tirets).
 */
export function readSpecificSymbols(universeId: string): SpecificSymbolEntry[] {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId, "specific-symbols");
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
    const allowedExt = new Set<string>(SPECIFIC_SYMBOL_EXTENSIONS);
    const files = fs.readdirSync(dir).filter((f) => {
      if (f.startsWith(".") || f.toLowerCase() === "manifest.json") return false;
      const ext = path.extname(f).toLowerCase();
      return allowedExt.has(ext);
    });
    const mapped = files.map((filename) => {
      const ext = path.extname(filename).toLowerCase();
      /** Aligné sur `normalizeComparable` dans specific-symbols-display (espaces → tirets). */
      const stem = path
        .basename(filename, ext)
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");
      return { stem, filename, ext };
    });
    mapped.sort((a, b) => {
      if (a.stem !== b.stem) return a.stem.localeCompare(b.stem, "fr");
      return extPriority(a.ext) - extPriority(b.ext);
    });
    const seen = new Set<string>();
    const out: SpecificSymbolEntry[] = [];
    for (const m of mapped) {
      if (!m.stem || seen.has(m.stem)) continue;
      seen.add(m.stem);
      out.push({
        stem: m.stem,
        filename: m.filename,
        url: assetPath(`/universes/${universeId}/specific-symbols/${m.filename}`),
      });
    }
    return out;
  } catch {
    return [];
  }
}

function getBasePath(): string {
  return (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) || "";
}

function assetPath(relative: string): string {
  const base = getBasePath();
  return base ? `${base}${relative.startsWith("/") ? relative : `/${relative}`}` : relative;
}

const FONT_EXTENSIONS: { ext: string; format: string }[] = [
  { ext: "woff2", format: "woff2" },
  { ext: "woff", format: "woff" },
  { ext: "ttf", format: "truetype" },
  { ext: "otf", format: "opentype" },
];

function detectImageInDir(dir: string, baseName: string, universeId: string): string | undefined {
  const extensions = ["webp", "png", "jpg", "svg", "ico"] as const;
  for (const ext of extensions) {
    const filePath = path.join(dir, `${baseName}.${ext}`);
    if (fs.existsSync(filePath)) return assetPath(`/universes/${universeId}/${baseName}.${ext}`);
  }
  return undefined;
}

function detectBackgroundImage(universeId: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId);
    if (!fs.existsSync(dir)) return undefined;
    return detectImageInDir(dir, "background", universeId);
  } catch {
    // ignore
  }
  return undefined;
}

function detectIcon(universeId: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId);
    if (!fs.existsSync(dir)) return undefined;
    return detectImageInDir(dir, "icon", universeId);
  } catch {
    // ignore
  }
  return undefined;
}

function detectBanner(universeId: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId);
    if (!fs.existsSync(dir)) return undefined;
    return detectImageInDir(dir, "banner", universeId);
  } catch {
    // ignore
  }
  return undefined;
}

function detectLogo(universeId: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_UNIVERSES_DIR, universeId);
    if (!fs.existsSync(dir)) return undefined;
    return detectImageInDir(dir, "logo", universeId);
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
          url: assetPath(`/universes/${universeId}/${found}`),
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

export interface UniverseListItem {
  id: string;
  name: string;
  icon?: string;
  banner?: string;
  logo?: string;
  font?: { url: string; family: string; format: string };
}

/**
 * Returns list of universes from JSON files in data/ that have id, name, and characters.
 * Includes icon, banner, and font when present in public/universes/{id}/.
 * Only call from server (Node) / generateStaticParams / Server Components.
 */
export function getUniverses(): UniverseListItem[] {
  if (typeof window !== "undefined") return [];
  const result: UniverseListItem[] = [];
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
          const item: UniverseListItem = {
            id: data.id,
            name: data.name,
          };
          const icon = detectIcon(data.id);
          if (icon) item.icon = icon;
          const banner = detectBanner(data.id);
          if (banner) item.banner = banner;
          const logo = detectLogo(data.id);
          if (logo) item.logo = logo;
          const font = detectFont(data.id);
          if (font) item.font = font;
          result.push(item);
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
    const specificSymbols = readSpecificSymbols(data.id);
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
      ...(specificSymbols.length > 0 && { specificSymbols }),
    };
  } catch {
    return null;
  }
}
