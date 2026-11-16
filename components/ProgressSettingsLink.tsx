"use client";

import Link from "next/link";
import { stripAccents } from "@/lib/utils";
import { useSpoilerProgress } from "@/contexts/SpoilerProgressContext";
import { formatProgressSummary, isProgressConfigured } from "@/lib/spoiler-progress";

interface ProgressSettingsLinkProps {
  universeId: string;
}

/** In-game link back to setup to change seen progress and/or max difficulty. */
export function ProgressSettingsLink({ universeId }: ProgressSettingsLinkProps) {
  const { progressField, difficultyConfig, selection, maxDifficulty, hydrated } =
    useSpoilerProgress();

  if (!hydrated) return null;
  if (!progressField && !difficultyConfig) return null;

  const configured = isProgressConfigured(progressField, selection);
  // Gate sends unconfigured progress to setup; hide link until then.
  if (progressField && !configured) return null;

  const summary =
    progressField && selection
      ? formatProgressSummary(selection, progressField, maxDifficulty)
      : maxDifficulty
        ? maxDifficulty
        : stripAccents("Réglages");

  return (
    <Link
      href={`/game/${universeId}/setup`}
      className="max-w-[11rem] truncate text-right text-xs text-gray-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 sm:max-w-none sm:text-sm"
      title={stripAccents(`Modifier progression / difficulté : ${summary}`)}
      aria-label={stripAccents("Modifier ce que tu as vu et la difficulté")}
    >
      <span className="block truncate">{stripAccents(summary)}</span>
      <span className="block text-[0.65rem] font-medium text-ocean-400 sm:text-xs">
        {stripAccents("Modifier")}
      </span>
    </Link>
  );
}
