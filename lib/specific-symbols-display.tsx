"use client";

import { Fragment, type ReactNode } from "react";
import { stripAccents } from "@/lib/utils";
import type { SpecificSymbolEntry } from "@/types/game";

/**
 * Fichier `public/universes/{universeId}/specific-symbols/{stem}.(svg|png|…)` :
 * toute occurrence du mot (insensible aux accents, espaces → tirets) est remplacée par l’icône.
 * Entre virgules, on tente d’abord l’expression entière, puis des n-grammes consécutifs du plus long
 * au plus court (ex. « Mangekyô Sharingan Éternel » → icône mangekyo-sharingan + texte « Éternel »).
 * Partout dans le tableau de l’univers, tous champs string/number affichables.
 */
function normalizeComparable(s: string): string {
  let t = stripAccents(s.trim());
  if (!t) return "";
  t = t.replace(/\([^)]{1,3}\)$/u, "").trim();
  return t.toLowerCase().replace(/\s+/g, "-");
}

function findSymbol(stemsSorted: SpecificSymbolEntry[], token: string): SpecificSymbolEntry | null {
  const n = normalizeComparable(token);
  if (!n) return null;
  for (const sym of stemsSorted) {
    if (n === sym.stem) return sym;
  }
  return null;
}

function PartOrWords({
  part,
  stemsSorted,
  iconClassName,
}: {
  part: string;
  stemsSorted: SpecificSymbolEntry[];
  iconClassName: string;
}) {
  const direct = findSymbol(stemsSorted, part);
  if (direct) {
    return (
      <img
        src={direct.url}
        alt={stripAccents(part)}
        title={stripAccents(part)}
        className={iconClassName}
      />
    );
  }

  const words = part.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return null;
  }

  const chunks: ReactNode[] = [];
  let i = 0;
  while (i < words.length) {
    let found: { sym: SpecificSymbolEntry; len: number } | null = null;
    for (let len = words.length - i; len >= 1; len--) {
      const phrase = words.slice(i, i + len).join(" ");
      const sym = findSymbol(stemsSorted, phrase);
      if (sym) {
        found = { sym, len };
        break;
      }
    }
    if (found) {
      const phrase = words.slice(i, i + found.len).join(" ");
      chunks.push(
        <img
          key={`sym-${i}-${found.sym.stem}`}
          src={found.sym.url}
          alt={stripAccents(phrase)}
          title={stripAccents(phrase)}
          className={iconClassName}
        />,
      );
      i += found.len;
    } else {
      chunks.push(
        <span key={`txt-${i}`} className="whitespace-pre-wrap break-words text-center">
          {stripAccents(words[i])}
        </span>,
      );
      i += 1;
    }
  }

  return (
    <span className="flex min-w-0 w-full flex-wrap items-center justify-center gap-1 text-center">
      {chunks}
    </span>
  );
}

export function SpecificSymbolsMixedDisplay({
  value,
  specificSymbols,
  iconClassName = "h-7 w-7 shrink-0 rounded-sm object-contain",
}: {
  value: string;
  specificSymbols: SpecificSymbolEntry[];
  iconClassName?: string;
}) {
  const trimmed = value.trim();
  if (!trimmed || specificSymbols.length === 0) {
    return <>{stripAccents(trimmed)}</>;
  }

  if (trimmed === "—") {
    return <>{stripAccents(trimmed)}</>;
  }

  const stemsSorted = [...specificSymbols].sort((a, b) => b.stem.length - a.stem.length);
  const hasComma = trimmed.includes(",");
  const parts = hasComma
    ? trimmed
        .split(/\s*,\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [trimmed];

  return (
    <span className="flex min-w-0 w-full flex-wrap items-center justify-center gap-1">
      {parts.map((part, pi) => (
        <Fragment key={pi}>
          {pi > 0 ? <span className="text-gray-300">,</span> : null}
          <PartOrWords part={part} stemsSorted={stemsSorted} iconClassName={iconClassName} />
        </Fragment>
      ))}
    </span>
  );
}
