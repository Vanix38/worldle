"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getUniverseName } from "@/lib/universes";
import type { UniverseId } from "@/types/game";
import { GameBoard } from "@/components/GameBoard";

export function GamePageClient() {
  const params = useParams();
  const router = useRouter();
  const universeId = (params?.universeId as string) ?? "one-piece";

  if (universeId !== "one-piece") {
    router.replace("/");
    return null;
  }

  const title = getUniverseName(universeId);

  return (
    <div className="relative min-h-screen">
      {/* Fond */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent" />

      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="text-sm font-medium text-gray-400 hover:text-white"
          >
            ← Accueil
          </Link>
          <h1 className="text-lg font-bold text-white sm:text-xl">{title}</h1>
          <div className="w-14" />
        </div>

        <GameBoard universeId={universeId as UniverseId} />
      </div>
    </div>
  );
}
