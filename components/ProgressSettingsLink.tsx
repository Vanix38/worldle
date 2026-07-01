"use client";

import Link from "next/link";
import { stripAccents } from "@/lib/utils";
import { useSpoilerProgress } from "@/contexts/SpoilerProgressContext";
import { formatProgressSummary } from "@/lib/spoiler-progress";

interface ProgressSettingsLinkProps {
  universeId: string;
}

export function ProgressSettingsLink({ universeId }: ProgressSettingsLinkProps) {
  const { progressField, selection } = useSpoilerProgress();

  if (!progressField || !selection) return null;

  const label = formatProgressSummary(selection, progressField);

  return (
    <Link
      href={`/game/${universeId}/setup`}
      className="max-w-[9rem] truncate text-right text-xs text-gray-400 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 sm:max-w-none sm:text-sm"
      title={stripAccents(`Progression : ${label}`)}
    >
      {stripAccents(label)}
    </Link>
  );
}
