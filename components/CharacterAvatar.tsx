"use client";

import { useState } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { stripAccents } from "@/lib/utils";
import { CHARACTER_IMAGE_EXTENSIONS as EXTENSIONS, characterImageSrc } from "@/lib/character-image";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
}

interface CharacterAvatarProps {
  character: Character;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CharacterAvatar({
  character,
  size = "sm",
  className = "",
}: CharacterAvatarProps) {
  const { universeId } = useUniverseData();
  const [extensionIndex, setExtensionIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const src = characterImageSrc(universeId, character.id, extensionIndex);

  const sizeClass =
    size === "sm"
      ? "h-10 min-h-10 min-w-10 w-10 text-xs"
      : size === "lg"
        ? "h-36 min-h-36 min-w-36 w-36 text-lg sm:h-44 sm:min-h-44 sm:min-w-44 sm:w-44"
        : "h-11 min-h-11 min-w-11 w-11 text-sm";

  const handleError = () => {
    if (extensionIndex < EXTENSIONS.length - 1) {
      setExtensionIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div
        className={`${sizeClass} flex shrink-0 items-center justify-center rounded-md bg-gray-600 font-semibold text-gray-200 ${className}`}
        aria-hidden
      >
        {stripAccents(getInitials(character.name))}
      </div>
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 overflow-hidden rounded-md ${className}`}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-top scale-125"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}
