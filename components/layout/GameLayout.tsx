"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { RulesModal } from "@/components/RulesModal";
import { OnboardingModal } from "@/components/OnboardingModal";
import { PageTransition } from "./PageTransition";
import { stripAccents } from "@/lib/utils";

interface GameLayoutProps {
  children: React.ReactNode;
}

export function GameLayout({ children }: GameLayoutProps) {
  const [rulesOpen, setRulesOpen] = useState(false);

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
          className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6"
          aria-label="Navigation principale"
        >
          <Link
            href="/"
            className="text-xl font-bold text-white transition hover:text-ocean-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          >
            Worlddle
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRulesOpen(true)}
            aria-label={stripAccents("Comment jouer ?")}
          >
            {stripAccents("Règles")}
          </Button>
        </nav>
      </header>

      <main id="main-content" className="min-h-[calc(100vh-8rem)]">
        <PageTransition>{children}</PageTransition>
      </main>

      <footer className="border-t border-gray-700 bg-gray-900/80 py-4">
        <div className="mx-auto max-w-5xl px-4 text-center text-sm text-gray-500 sm:px-6">
          {stripAccents("Worlddle – Devine le personnage")}
        </div>
      </footer>

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
      <OnboardingModal />
    </>
  );
}
