"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaBook,
  FaClipboardList,
  FaColumns,
  FaImage,
  FaTh,
  FaUserCircle,
} from "react-icons/fa";
import { Button } from "@/components/ui/Button";
import { RulesModal } from "@/components/RulesModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { ColumnsModal } from "@/components/ColumnsModal";
import { PageTransition } from "./PageTransition";
import { stripAccents } from "@/lib/utils";

interface GameLayoutProps {
  children: React.ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const pathname = usePathname();
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/^\/+|\/+$/g, "");
  const prefix = basePath ? `/${basePath}` : "";
  const pathSansBase =
    prefix && pathname.startsWith(prefix) ? pathname.slice(prefix.length) || "/" : pathname;
  const gameUniverseMatch = pathSansBase.match(/^\/game\/([^/]+)/);
  const columnsUniverseId = gameUniverseMatch?.[1] ?? null;
  const onAlternateMode = /^\/game\/[^/]+\/(hard|blur|sheet)$/.test(pathSansBase);

  useEffect(() => {
    if (!columnsUniverseId) setColumnsOpen(false);
  }, [columnsUniverseId]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ocean-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        Aller au contenu
      </a>

      <header className="sticky top-0 z-40 border-b border-gray-700 bg-gray-900/95 backdrop-blur">
        <nav
          className="mx-auto flex max-w-5xl items-center gap-1.5 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3"
          aria-label="Navigation principale"
        >
          <Link
            href="/"
            className="shrink-0 text-base font-bold text-white transition hover:text-ocean-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:text-xl"
          >
            Worlddle
          </Link>

          {columnsUniverseId ? (
            <div
              className="min-w-0 flex-1 overflow-x-auto py-0.5 [scrollbar-width:thin]"
              aria-label={stripAccents("Modes de jeu")}
            >
              <div className="flex w-max flex-nowrap items-center gap-1 sm:gap-2">
                {onAlternateMode ? (
                  <Link
                    href={`/game/${columnsUniverseId}`}
                    title={stripAccents("Grille")}
                    aria-label={stripAccents("Mode grille")}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-600 text-white transition-colors hover:bg-green-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:size-auto sm:min-h-[2.25rem] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-sm"
                  >
                    <FaTh className="h-4 w-4 shrink-0 sm:h-3.5 md:h-4" aria-hidden />
                    <span className="hidden sm:inline">{stripAccents("Grille")}</span>
                  </Link>
                ) : null}
                <Link
                  href={`/game/${columnsUniverseId}/hard`}
                  title={stripAccents("Portrait mystère")}
                  aria-label={stripAccents("Portrait mystère")}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white transition-colors hover:bg-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:size-auto sm:min-h-[2.25rem] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-sm"
                >
                  <FaUserCircle className="h-4 w-4 shrink-0 sm:h-3.5 md:h-4" aria-hidden />
                  <span className="hidden sm:inline">{stripAccents("Portrait")}</span>
                </Link>
                <Link
                  href={`/game/${columnsUniverseId}/blur`}
                  title={stripAccents("Défloutage")}
                  aria-label={stripAccents("Défloutage")}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white transition-colors hover:bg-violet-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:size-auto sm:min-h-[2.25rem] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-sm"
                >
                  <FaImage className="h-4 w-4 shrink-0 sm:h-3.5 md:h-4" aria-hidden />
                  <span className="hidden sm:inline">{stripAccents("Défloutage")}</span>
                </Link>
                <Link
                  href={`/game/${columnsUniverseId}/sheet`}
                  title={stripAccents("Fiche mystère")}
                  aria-label={stripAccents("Fiche mystère")}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white transition-colors hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:size-auto sm:min-h-[2.25rem] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-sm"
                >
                  <FaClipboardList className="h-4 w-4 shrink-0 sm:h-3.5 md:h-4" aria-hidden />
                  <span className="hidden sm:inline">{stripAccents("Fiche")}</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1" aria-hidden />
          )}

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2">
            {columnsUniverseId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setColumnsOpen(true)}
                title={stripAccents("Colonnes")}
                className="inline-flex size-9 shrink-0 items-center justify-center px-0 sm:size-auto sm:gap-1.5 sm:px-3"
                aria-label={stripAccents("Description des colonnes de l'univers")}
              >
                <FaColumns className="h-4 w-4 opacity-90" aria-hidden />
                <span className="hidden sm:inline">{stripAccents("Colonnes")}</span>
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              title={stripAccents("Règles")}
              onClick={() => setRulesOpen(true)}
              className="inline-flex size-9 shrink-0 items-center justify-center px-0 sm:size-auto sm:gap-1.5 sm:px-3"
              aria-label={stripAccents("Comment jouer ?")}
            >
              <FaBook className="h-4 w-4 opacity-90" aria-hidden />
              <span className="hidden sm:inline">{stripAccents("Règles")}</span>
            </Button>
          </div>
        </nav>
      </header>

      <main id="main-content" className="min-h-[calc(100vh-8rem)] min-w-0 max-w-full overflow-x-hidden">
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className="border-t border-gray-700 bg-gray-900/80 py-4">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-gray-500 sm:px-6">
          {stripAccents("Worlddle – Devine le personnage")}
        </div>
      </footer>

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      <ColumnsModal
        universeId={columnsUniverseId}
        isOpen={columnsOpen}
        onClose={() => setColumnsOpen(false)}
      />
      <OnboardingModal />
    </>
  );
}
