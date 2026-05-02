"use client";

import { FaHeart, FaMars, FaQuestion, FaSkull, FaVenus } from "react-icons/fa";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import {
  NarutoChakraMixedDisplay,
  shouldUseNarutoChakraDisplay,
} from "@/lib/naruto-chakra-display";
import { resolveGenderDisplay } from "@/lib/gender-display";
import { resolveVitalityDisplay } from "@/lib/vitality-display";
import { stripAccents } from "@/lib/utils";

function formatScalar(raw: unknown): string {
  if (raw === undefined || raw === null) return "—";
  if (Array.isArray(raw)) {
    const parts = raw.filter((x) => x !== undefined && x !== null && String(x).trim() !== "");
    return parts.length > 0 ? parts.map((x) => String(x)).join(", ") : "—";
  }
  const s = String(raw).trim();
  return s ? s : "—";
}

interface MysteryProfileRowProps {
  fieldKey: string;
  label: string;
  character: Character;
}

function MysteryProfileRow({ fieldKey, label, character }: MysteryProfileRowProps) {
  const { universeId } = useUniverseData();
  const raw = character[fieldKey];
  const vitality = typeof raw === "string" || typeof raw === "number" ? resolveVitalityDisplay(raw, fieldKey) : null;
  const gender =
    vitality === null && (typeof raw === "string" || typeof raw === "number")
      ? resolveGenderDisplay(raw, fieldKey)
      : null;

  const chakraStr = typeof raw === "string" ? raw.trim() : "";
  const chakraNode =
    shouldUseNarutoChakraDisplay(universeId, fieldKey) && typeof raw === "string" ? (
      <NarutoChakraMixedDisplay value={chakraStr || "—"} />
    ) : null;

  const valueNode =
    chakraNode !== null ? (
      chakraNode
    ) : vitality === "alive" ? (
      <FaHeart className="inline-block h-4 w-4 shrink-0 text-red-300" aria-hidden />
    ) : vitality === "dead" ? (
      <FaSkull className="inline-block h-4 w-4 shrink-0 text-gray-300" aria-hidden />
    ) : vitality === "unknown" ? (
      <FaQuestion className="inline-block h-4 w-4 shrink-0 text-amber-200" aria-hidden />
    ) : gender === "male" ? (
      <FaMars className="inline-block h-4 w-4 shrink-0 text-sky-300" aria-hidden />
    ) : gender === "female" ? (
      <FaVenus className="inline-block h-4 w-4 shrink-0 text-pink-300" aria-hidden />
    ) : (
      <span className="text-gray-100">{stripAccents(formatScalar(raw))}</span>
    );

  return (
    <div className="flex flex-col gap-0.5 border-b border-gray-700/80 py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500 sm:w-40">
        {stripAccents(label)}
      </dt>
      <dd className="min-w-0 flex-1 text-sm font-medium">{valueNode}</dd>
    </div>
  );
}

interface MysteryProfileTableProps {
  character: Character;
}

export function MysteryProfileTable({ character }: MysteryProfileTableProps) {
  const { schema } = useUniverseData();

  if (schema.length === 0) {
    return (
      <p className="text-sm text-gray-400">{stripAccents("Aucun attribut à afficher pour cet univers.")}</p>
    );
  }

  return (
    <div
      className="rounded-xl border border-gray-600 bg-gray-900/70 px-3 py-2 shadow-lg sm:px-4"
      aria-label={stripAccents("Indice : fiche personnage")}
    >
      {schema.map((entry) => (
        <MysteryProfileRow key={entry.key} fieldKey={entry.key} label={entry.label} character={character} />
      ))}
    </div>
  );
}
