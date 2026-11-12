import type {
  LogoEntry,
  LogoQuizKind,
  LogoQuizPack,
  LogoQuizPackListItem,
  LogoQuizSection,
} from "@/types/logo-quiz";
import { normalizeLogoDifficulty } from "@/lib/logo-quiz-difficulty";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "logo-quiz");
const PUBLIC_DIR = path.join(process.cwd(), "public", "logo-quiz");

const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "svg"] as const;

function getBasePath(): string {
  return (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_BASE_PATH) || "";
}

function assetPath(relative: string): string {
  const base = getBasePath();
  return base ? `${base}${relative.startsWith("/") ? relative : `/${relative}`}` : relative;
}

function detectImageInDir(
  dir: string,
  baseName: string,
  packId: string,
  subdir?: string
): string | undefined {
  for (const ext of IMAGE_EXTENSIONS) {
    const filePath = path.join(dir, `${baseName}.${ext}`);
    if (fs.existsSync(filePath)) {
      const rel = subdir
        ? `/logo-quiz/${packId}/${subdir}/${baseName}.${ext}`
        : `/logo-quiz/${packId}/${baseName}.${ext}`;
      return assetPath(rel);
    }
  }
  return undefined;
}

function detectPackAsset(packId: string, baseName: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_DIR, packId);
    if (!fs.existsSync(dir)) return undefined;
    return detectImageInDir(dir, baseName, packId);
  } catch {
    return undefined;
  }
}

function detectLogoImage(packId: string, logoId: string): string | undefined {
  try {
    const dir = path.join(PUBLIC_DIR, packId, "logos");
    if (!fs.existsSync(dir)) return undefined;
    return detectImageInDir(dir, logoId, packId, "logos");
  } catch {
    return undefined;
  }
}

function isLogoQuizKind(value: unknown): value is LogoQuizKind {
  return value === "brands" || value === "universe";
}

function isValidLogoEntry(obj: unknown): obj is LogoEntry {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id.trim()) return false;
  if (typeof o.name !== "string" || !o.name.trim()) return false;
  if (o.aliases !== undefined) {
    if (!Array.isArray(o.aliases)) return false;
    if (!o.aliases.every((a) => typeof a === "string")) return false;
  }
  if (o.difficulty !== undefined && typeof o.difficulty !== "string") return false;
  return true;
}

function parseLogoEntry(
  item: unknown,
  packId: string,
  enrichImages: boolean,
  seenIds: Set<string>
): LogoEntry | null {
  if (!isValidLogoEntry(item)) return null;
  const id = item.id.trim();
  if (seenIds.has(id)) return null;
  seenIds.add(id);
  const raw = item as LogoEntry & { difficulty?: string };
  const difficulty = normalizeLogoDifficulty(raw.difficulty);
  const entry: LogoEntry = {
    id,
    name: item.name.trim(),
    ...(item.aliases && item.aliases.length > 0
      ? { aliases: item.aliases.map((a) => a.trim()).filter(Boolean) }
      : {}),
    ...(difficulty ? { difficulty } : {}),
  };
  if (enrichImages) {
    const imageUrl = detectLogoImage(packId, entry.id);
    if (imageUrl) entry.imageUrl = imageUrl;
  }
  return entry;
}

function parseLogoList(
  items: unknown[],
  packId: string,
  enrichImages: boolean,
  seenIds: Set<string>
): LogoEntry[] {
  const logos: LogoEntry[] = [];
  for (const item of items) {
    const entry = parseLogoEntry(item, packId, enrichImages, seenIds);
    if (entry) logos.push(entry);
  }
  return logos;
}

function isValidPackEnvelope(obj: unknown): obj is {
  id: string;
  name: string;
  logos?: unknown;
  sections?: unknown;
  kind?: unknown;
  description?: unknown;
  relatedUniverseId?: unknown;
  decoyLetterCount?: unknown;
} {
  if (!obj || typeof obj !== "object") return false;
  const o = obj as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id.trim()) return false;
  if (typeof o.name !== "string" || !o.name.trim()) return false;
  const hasLogos = Array.isArray(o.logos);
  const hasSections = Array.isArray(o.sections);
  return hasLogos || hasSections;
}

function parsePack(raw: unknown, enrichImages: boolean): LogoQuizPack | null {
  if (!isValidPackEnvelope(raw)) return null;

  const packId = raw.id.trim();
  const seenIds = new Set<string>();
  let sections: LogoQuizSection[] | undefined;
  let logos: LogoEntry[] = [];

  if (Array.isArray(raw.sections) && raw.sections.length > 0) {
    sections = [];
    for (const sectionRaw of raw.sections) {
      if (!sectionRaw || typeof sectionRaw !== "object") continue;
      const s = sectionRaw as Record<string, unknown>;
      if (typeof s.id !== "string" || !s.id.trim()) continue;
      if (typeof s.name !== "string" || !s.name.trim()) continue;
      if (!Array.isArray(s.logos)) continue;
      const sectionLogos = parseLogoList(s.logos, packId, enrichImages, seenIds);
      if (sectionLogos.length === 0) continue;
      sections.push({
        id: s.id.trim(),
        name: s.name.trim(),
        logos: sectionLogos,
      });
      logos.push(...sectionLogos);
    }
    if (sections.length === 0) sections = undefined;
  } else if (Array.isArray(raw.logos)) {
    logos = parseLogoList(raw.logos, packId, enrichImages, seenIds);
  }

  const kind: LogoQuizKind = isLogoQuizKind(raw.kind) ? raw.kind : "brands";
  const decoyLetterCount =
    typeof raw.decoyLetterCount === "number" &&
    Number.isFinite(raw.decoyLetterCount) &&
    raw.decoyLetterCount >= 0
      ? Math.floor(raw.decoyLetterCount)
      : undefined;

  const pack: LogoQuizPack = {
    id: packId,
    name: raw.name.trim(),
    kind,
    logos,
    ...(sections && sections.length > 0 ? { sections } : {}),
  };

  if (typeof raw.description === "string" && raw.description.trim()) {
    pack.description = raw.description.trim();
  }
  if (typeof raw.relatedUniverseId === "string" && raw.relatedUniverseId.trim()) {
    pack.relatedUniverseId = raw.relatedUniverseId.trim();
  }
  if (decoyLetterCount !== undefined) pack.decoyLetterCount = decoyLetterCount;

  if (enrichImages) {
    const banner = detectPackAsset(pack.id, "banner");
    const logo = detectPackAsset(pack.id, "logo");
    const backgroundImage = detectPackAsset(pack.id, "background");
    if (banner) pack.banner = banner;
    if (logo) pack.logo = logo;
    if (backgroundImage) pack.backgroundImage = backgroundImage;
  }

  return pack;
}

/** Section containing a logo, if the pack uses sections. */
export function findLogoSection(
  pack: LogoQuizPack,
  logoId: string
): LogoQuizSection | undefined {
  return pack.sections?.find((s) => s.logos.some((l) => l.id === logoId));
}

/**
 * Lists logo-quiz packs from data/logo-quiz/*.json.
 * Server-only.
 */
export function getLogoQuizPacks(): LogoQuizPackListItem[] {
  if (typeof window !== "undefined") return [];
  const result: LogoQuizPackListItem[] = [];
  try {
    if (!fs.existsSync(DATA_DIR) || !fs.statSync(DATA_DIR).isDirectory()) return [];
    const files = fs.readdirSync(DATA_DIR);
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const filePath = path.join(DATA_DIR, file);
      if (!fs.statSync(filePath).isFile()) continue;
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
        const pack = parsePack(data, true);
        if (!pack) continue;
        const item: LogoQuizPackListItem = {
          id: pack.id,
          name: pack.name,
          kind: pack.kind,
        };
        if (pack.description) item.description = pack.description;
        if (pack.banner) item.banner = pack.banner;
        if (pack.logo) item.logo = pack.logo;
        result.push(item);
      } catch {
        // skip invalid JSON
      }
    }
  } catch {
    return [];
  }
  result.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  return result;
}

/**
 * Loads a full logo-quiz pack by id. Server-only.
 */
export function getLogoQuizPack(packId: string): LogoQuizPack | null {
  if (typeof window !== "undefined") return null;
  try {
    const filePath = path.join(DATA_DIR, `${packId}.json`);
    if (!fs.existsSync(filePath)) return null;
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    const pack = parsePack(data, true);
    if (!pack || pack.id !== packId) return null;
    return pack;
  } catch {
    return null;
  }
}
