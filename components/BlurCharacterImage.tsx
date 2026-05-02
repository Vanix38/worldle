"use client";

import { useState, useEffect } from "react";
import type { Character } from "@/types/game";
import { useUniverseData } from "@/contexts/UniverseDataContext";
import { stripAccents } from "@/lib/utils";

const EXTENSIONS = ["webp", "png", "jpg", "jpeg"] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] ?? "") + (parts[parts.length - 1][0] ?? "");
  }
  return name.slice(0, 2).toUpperCase();
}

interface BlurCharacterImageProps {
  character: Character;
  /** Rayon de flou CSS en px (0 = net). */
  blurPx: number;
  className?: string;
}

export function BlurCharacterImage({ character, blurPx, className = "" }: BlurCharacterImageProps) {
  const { universeId } = useUniverseData();
  const [extensionIndex, setExtensionIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setExtensionIndex(0);
    setFailed(false);
  }, [character.id]);

  const ext = EXTENSIONS[extensionIndex];
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const src = `${basePath}/universes/${universeId}/characters/${character.id}.${ext}`.replace(/^\/+/, "/");

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
        className={`flex aspect-[3/4] w-full max-w-md items-center justify-center rounded-xl bg-gray-700 text-4xl font-bold text-gray-200 ${className}`}
        aria-hidden
      >
        {stripAccents(getInitials(character.name))}
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-[3/4] w-full max-w-md overflow-hidden rounded-xl border border-gray-600 bg-gray-800 shadow-lg ${className}`}
    >
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover object-top transition-[filter] duration-500 ease-out"
        style={{ filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined }}
        loading="eager"
        onError={handleError}
      />
    </div>
  );
}
