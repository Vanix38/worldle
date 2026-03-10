"use client";

import Link from "next/link";
import type { UniverseData } from "@/types/game";
import { UniverseDataProvider } from "@/contexts/UniverseDataContext";
import { GameBoard } from "@/components/GameBoard";

interface GamePageClientProps {
  universeId: string;
  universeData: UniverseData;
}

export function GamePageClient({ universeId, universeData }: GamePageClientProps) {
  const hasBackground = Boolean(universeData.backgroundImage?.trim());
  const font = universeData.font;

  return (
    <UniverseDataProvider universeData={universeData}>
      {font && (
        <style
          dangerouslySetInnerHTML={{
            __html: `@font-face{font-family:"${font.family}";src:url("${font.url}") format("${font.format}");font-display:swap;}`,
          }}
        />
      )}
      <div
        className="relative min-h-screen"
        style={font ? { fontFamily: `"${font.family}", sans-serif` } : undefined}
      >
        {/* Fond */}
        {hasBackground ? (
          <>
            <div
              className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${universeData.backgroundImage!.trim()})` }}
            />
            <div className="fixed inset-0 -z-10 bg-black/50" aria-hidden />
          </>
        ) : (
          <>
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" />
            <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent" />
          </>
        )}

        <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 sm:py-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <Link
              href="/"
              className="text-sm font-medium text-gray-400 hover:text-white"
            >
              ← Accueil
            </Link>
            <h1 className="text-lg font-bold text-white sm:text-xl">
              {universeData.name}
            </h1>
            <div className="w-14" />
          </div>

          <GameBoard universeId={universeId} />
        </div>
      </div>
    </UniverseDataProvider>
  );
}
