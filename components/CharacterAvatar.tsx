"use client";

import { useState } from "react";
import type { Character } from "@/types/game";

interface CharacterAvatarProps {
  character: Character;
  size?: "sm" | "md";
  className?: string;
}

const DICEBEAR_BASE = "https://api.dicebear.com/9.x/initials/svg";

function getAvatarUrl(character: Character, pixelSize: number): string {
  const custom = character.imageUrl && String(character.imageUrl).trim();
  if (custom) return custom;
  const seed = encodeURIComponent(character.name);
  return `${DICEBEAR_BASE}?seed=${seed}&size=${pixelSize}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
}

export function CharacterAvatar({
  character,
  size = "sm",
  className = "",
}: CharacterAvatarProps) {
  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";
  const pixelSize = size === "sm" ? 32 : 40;
  const imageUrl = getAvatarUrl(character, pixelSize);

  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md bg-gray-600 font-semibold text-gray-200 ${className}`}
        aria-hidden
      >
        {getInitials(character.name)}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-md ${className}`}
      aria-hidden
    >
      <img
        src={imageUrl}
        alt=""
        className="h-full w-full object-cover object-top scale-125"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
