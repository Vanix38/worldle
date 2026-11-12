"use client";

import Link from "next/link";
import { stripAccents } from "@/lib/utils";
import type { LogoQuizPack } from "@/types/logo-quiz";
import { LogoQuizPackList } from "@/components/logo-quiz/LogoQuizPackList";

interface LogoQuizPackPageClientProps {
  pack: LogoQuizPack;
}

export function LogoQuizPackPageClient({ pack }: LogoQuizPackPageClientProps) {
  const hasBackground = Boolean(pack.backgroundImage?.trim());

  return (
    <div className="relative min-h-screen">
      {hasBackground ? (
        <>
          <div
            className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${pack.backgroundImage!.trim()})` }}
          />
          <div className="fixed inset-0 -z-10 bg-gray-950/75" aria-hidden />
          <div
            className="fixed inset-0 -z-10 bg-gradient-to-b from-gray-950/40 via-transparent to-gray-950/80"
            aria-hidden
          />
        </>
      ) : (
        <>
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" />
          <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-transparent to-transparent" />
        </>
      )}

      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-center gap-2 sm:mb-6">
          <div className="flex min-w-0 flex-1 justify-start">
            <Link
              href="/"
              className="rounded-lg px-2 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
            >
              {stripAccents("← Accueil")}
            </Link>
          </div>
          <h1 className="min-w-0 flex-1 truncate text-center text-xl font-bold tracking-tight text-white sm:text-2xl">
            {stripAccents(pack.name)}
          </h1>
          <div className="flex min-w-0 flex-1 justify-end" aria-hidden />
        </header>

        <div className="rounded-2xl border border-white/10 bg-gray-950/70 p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-6">
          {pack.description ? (
            <p className="mb-5 text-center text-sm leading-relaxed text-gray-300 sm:text-base">
              {stripAccents(pack.description)}
            </p>
          ) : null}

          <LogoQuizPackList pack={pack} />
        </div>
      </div>
    </div>
  );
}
