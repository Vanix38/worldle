"use client";

import { useState } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";

const EXTENSIONS = ["webp", "png", "jpg"] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
}

interface CharacterAvatarProps {
  character: Character;
  size?: "sm" | "md";
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

  const ext = EXTENSIONS[extensionIndex];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const src = `${basePath}/universes/${universeId}/characters/${character.id}.${ext}`.replace(/^\/+/, "/");

  const sizeClass = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

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
        src={src}
        alt=""
        className="h-full w-full object-cover object-top scale-125"
        loading="lazy"
        onError={handleError}
      />
    </div>
  );
}
