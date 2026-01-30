"use client";

import { useState, useRef, useEffect } from "react";
import type { Character } from "@/types/game";
import type { UniverseId } from "@/types/game";
import { searchCharacters } from "@/lib/game";
import { CharacterAvatar } from "./CharacterAvatar";

interface CharacterSearchProps {
  universeId: UniverseId;
  onSubmit: (character: Character) => void;
  disabled?: boolean;
  guessedIds: string[];
  className?: string;
}

export function CharacterSearch({
  universeId,
  onSubmit,
  disabled,
  guessedIds,
  className = "",
}: CharacterSearchProps) {
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
    const list = searchCharacters(universeId, query).filter(
      (c) => !guessedIds.includes(c.id)
    );
    setResults(list);
    setSelectedIndex(0);
    setOpen(list.length > 0);
  }, [query, universeId, guessedIds]);

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
        placeholder="Rechercher un personnage..."
        disabled={disabled}
        className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-800 disabled:opacity-50"
        autoComplete="off"
        aria-label="Rechercher un personnage"
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
          className="absolute top-full left-0 right-0 z-10 mt-1 max-h-56 overflow-auto rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-xl"
          aria-label="Suggestions de personnages"
        >
          {results.map((char, i) => (
            <button
              key={char.id}
              id={`character-option-${char.id}`}
              type="button"
              role="option"
              aria-selected={i === selectedIndex}
              onClick={() => handleSelect(char)}
              onMouseEnter={() => setSelectedIndex(i)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-white hover:bg-gray-700 focus:bg-gray-700 focus:outline-none ${
                i === selectedIndex ? "bg-gray-700" : ""
              }`}
            >
              <CharacterAvatar character={char} size="sm" />
              <span>{char.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
