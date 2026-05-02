"use client";

import { useState, useRef, useEffect } from "react";
import type { Character } from "@/types/game";
import type { UniverseId } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { CharacterAvatar } from "./CharacterAvatar";
import { stripAccents } from "@/lib/utils";

function getSearchableStrings(character: Character, searchFieldKeys: string[]): string[] {
  const parts: string[] = [];
  for (const key of searchFieldKeys) {
    const val = character[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => parts.push(String(v).toLowerCase()));
    } else {
      parts.push(String(val).toLowerCase());
    }
  }
  return parts;
}

/** First alias to show under the name (skip if empty or same as name). */
export function getFirstDisplayAlias(char: Character): string | undefined {
  const raw = char.aliases?.[0];
  if (raw === undefined || raw === null) return undefined;
  const a = String(raw).trim();
  if (!a || a.toLowerCase() === char.name.toLowerCase()) return undefined;
  return a;
}

function searchCharacters(
  characters: Character[],
  query: string,
  searchFieldKeys: string[]
): Character[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  return characters
    .filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(normalized);
      const aliasMatch = (c.aliases ?? []).some((a) =>
        String(a).toLowerCase().includes(normalized)
      );
      const searchFieldsMatch =
        searchFieldKeys.length > 0 &&
        getSearchableStrings(c, searchFieldKeys).some((s) => s.includes(normalized));
      return nameMatch || aliasMatch || searchFieldsMatch;
    })
    .slice(0, 8);
}

interface CharacterSearchProps {
  universeId: UniverseId;
  onSubmit: (character: Character) => void;
  disabled?: boolean;
  guessedIds: string[];
  className?: string;
  /** Taille du champ : "sm" par défaut, "lg" pour une barre en haut de page */
  size?: "sm" | "lg";
}

export function CharacterSearch({
  universeId,
  onSubmit,
  disabled,
  guessedIds,
  className = "",
  size = "sm",
}: CharacterSearchProps) {
  const { characters, searchFieldKeys } = useUniverseData();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Character[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }
    const list = searchCharacters(characters, query, searchFieldKeys).filter(
      (c) => !guessedIds.includes(c.id)
    );
    setResults(list);
    setSelectedIndex(0);
    setOpen(list.length > 0);
  }, [query, characters, guessedIds, searchFieldKeys]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleSelect = (character: Character) => {
    onSubmit(character);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => query.trim() && results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={stripAccents("Rechercher un personnage...")}
        disabled={disabled}
        className={
          size === "lg"
            ? "min-h-[44px] w-full rounded-xl border-2 border-gray-600 bg-gray-800/90 px-5 py-4 text-lg text-white placeholder-gray-400 focus:border-ocean-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:opacity-50"
            : "min-h-[44px] w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-3 text-base text-white placeholder-gray-400 focus:border-ocean-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-800 disabled:opacity-50 sm:py-2"
        }
        autoComplete="off"
        aria-label={stripAccents("Rechercher un personnage")}
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={open ? "character-listbox" : undefined}
        aria-activedescendant={open && results[selectedIndex] ? `character-option-${results[selectedIndex].id}` : undefined}
      />
      {open && results.length > 0 && (
        <div
          ref={listRef}
          id="character-listbox"
          role="listbox"
          className={`absolute top-full left-0 right-0 z-10 mt-2 overflow-auto rounded-xl border border-gray-600 bg-gray-800 py-1 shadow-xl ${size === "lg" ? "max-h-72" : "max-h-56"}`}
          aria-label={stripAccents("Suggestions de personnages")}
        >
          {results.map((char, i) => {
            const firstAlias = getFirstDisplayAlias(char);
            return (
              <button
                key={char.id}
                id={`character-option-${char.id}`}
                type="button"
                role="option"
                aria-selected={i === selectedIndex}
                onClick={() => handleSelect(char)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex min-h-[44px] w-full items-center gap-3 text-left text-white hover:bg-gray-700 focus:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-inset ${
                  size === "lg" ? "px-5 py-3 text-base" : "px-4 py-3"
                } ${i === selectedIndex ? "bg-gray-700" : ""}`}
              >
                <CharacterAvatar character={char} size={size === "lg" ? "md" : "sm"} />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate">{stripAccents(char.name)}</span>
                  {firstAlias ? (
                    <span className="truncate text-sm text-gray-400">
                      {stripAccents(firstAlias)}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
