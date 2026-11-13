"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { stripAccents } from "@/lib/utils";
import { useLogoQuizProgress } from "@/hooks/useLogoQuizProgress";
import {
  difficultyShortLabel,
  LOGO_QUIZ_DIFFICULTY_ORDER,
} from "@/lib/logo-quiz-difficulty";
import { resolveLogoDisplayUrl } from "@/lib/logo-quiz-display";
import type {
  LogoEntry,
  LogoQuizDifficulty,
  LogoQuizPack,
  LogoQuizSection,
} from "@/types/logo-quiz";
import { LogoDifficultyBadge } from "./LogoDifficultyBadge";

/** Kept here so Tailwind always generates filter chip colors. */
const FILTER_CHIP_ACTIVE: Record<LogoQuizDifficulty, string> = {
  "Très facile": "border-emerald-400 bg-emerald-600 text-white",
  Facile: "border-sky-400 bg-sky-600 text-white",
  Moyen: "border-amber-300 bg-amber-500 text-gray-950",
  Difficile: "border-orange-400 bg-orange-600 text-white",
  Impossible: "border-rose-400 bg-rose-600 text-white",
};

const FILTER_CHIP_IDLE =
  "border-gray-600 bg-gray-800/80 text-gray-300 hover:border-gray-500 hover:bg-gray-700 hover:text-white";

interface LogoQuizPackListProps {
  pack: LogoQuizPack;
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-gray-800"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={stripAccents("Progression du pack")}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-ocean-600 to-emerald-500 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function LogoTile({
  packId,
  logo,
  displayIndex,
  done,
}: {
  packId: string;
  logo: LogoEntry;
  displayIndex: number;
  done: boolean;
}) {
  const displayUrl = resolveLogoDisplayUrl(logo, done);

  return (
    <li>
      <Link
        href={`/logo/${packId}/${logo.id}`}
        className={`group relative flex aspect-square flex-col overflow-hidden rounded-xl border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 ${
          done
            ? "border-emerald-500/70 bg-emerald-50 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.35)]"
            : "border-gray-700/80 bg-gray-100 hover:border-ocean-400 hover:shadow-lg hover:shadow-ocean-500/10"
        }`}
        aria-label={
          done
            ? stripAccents(
                `${logo.name}${logo.difficulty ? `, ${logo.difficulty}` : ""}, deja trouve. Rejouer`
              )
            : stripAccents(
                `Logo ${displayIndex}${logo.difficulty ? `, difficulté ${logo.difficulty}` : ""}, jouer`
              )
        }
      >
        <div className="flex items-start justify-between gap-1 p-2">
          {logo.difficulty ? (
            <LogoDifficultyBadge difficulty={logo.difficulty} />
          ) : (
            <span aria-hidden />
          )}
          {done ? (
            <span
              className="inline-flex size-6 items-center justify-center rounded-full bg-emerald-600 text-[0.7rem] font-bold text-white shadow-sm"
              aria-hidden
            >
              ✓
            </span>
          ) : (
            <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums text-gray-500">
              #{displayIndex}
            </span>
          )}
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center px-3 pb-2">
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt=""
              className={`max-h-full max-w-full object-contain transition duration-200 ${
                done ? "opacity-90" : "group-hover:scale-[1.04]"
              }`}
            />
          ) : (
            <span className="text-center text-xs text-gray-500">
              {stripAccents("Image manquante")}
            </span>
          )}
        </div>

        <div
          className={`border-t px-2 py-1.5 text-center ${
            done ? "border-emerald-200 bg-emerald-100/80" : "border-gray-200/80 bg-white/70"
          }`}
        >
          <span
            className={`line-clamp-1 text-xs font-semibold ${
              done ? "text-emerald-800" : "text-gray-500"
            }`}
          >
            {done ? stripAccents(logo.name) : stripAccents("A trouver")}
          </span>
        </div>
      </Link>
    </li>
  );
}

function LogoGrid({
  packId,
  logos,
  hydrated,
  isCompleted,
  indexById,
}: {
  packId: string;
  logos: LogoEntry[];
  hydrated: boolean;
  isCompleted: (logoId: string) => boolean;
  indexById: Map<string, number>;
}) {
  if (logos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-700 bg-gray-900/40 px-4 py-8 text-center text-sm text-gray-400">
        {stripAccents("Aucun logo pour ce filtre.")}
      </p>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 md:grid-cols-4 lg:grid-cols-5">
      {logos.map((logo) => (
        <LogoTile
          key={logo.id}
          packId={packId}
          logo={logo}
          displayIndex={indexById.get(logo.id) ?? 0}
          done={hydrated && isCompleted(logo.id)}
        />
      ))}
    </ul>
  );
}

function SectionBlock({
  packId,
  section,
  logos,
  hydrated,
  isCompleted,
  indexById,
}: {
  packId: string;
  section: LogoQuizSection;
  logos: LogoEntry[];
  hydrated: boolean;
  isCompleted: (logoId: string) => boolean;
  indexById: Map<string, number>;
}) {
  if (logos.length === 0) return null;

  const doneInSection = hydrated
    ? logos.filter((l) => isCompleted(l.id)).length
    : 0;

  return (
    <section aria-labelledby={`section-${section.id}`} className="mb-8 last:mb-0">
      <div className="mb-3 flex items-center gap-3">
        <h2
          id={`section-${section.id}`}
          className="shrink-0 text-base font-semibold text-white sm:text-lg"
        >
          {stripAccents(section.name)}
        </h2>
        <div className="h-px min-w-0 flex-1 bg-gradient-to-r from-white/20 to-transparent" />
        <p className="shrink-0 rounded-full bg-gray-800 px-2.5 py-0.5 text-xs font-medium tabular-nums text-gray-300">
          {hydrated
            ? `${doneInSection}/${logos.length}`
            : `${logos.length}`}
        </p>
      </div>
      <LogoGrid
        packId={packId}
        logos={logos}
        hydrated={hydrated}
        isCompleted={isCompleted}
        indexById={indexById}
      />
    </section>
  );
}

export function LogoQuizPackList({ pack }: LogoQuizPackListProps) {
  const { completedIds, completedCount, hydrated, isCompleted } = useLogoQuizProgress(
    pack.id
  );
  const [activeDifficulties, setActiveDifficulties] = useState<
    Set<LogoQuizDifficulty>
  >(() => new Set());

  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    pack.logos.forEach((logo, i) => map.set(logo.id, i + 1));
    return map;
  }, [pack.logos]);

  const hasAnyDifficulty = pack.logos.some((l) => l.difficulty);

  const matchesFilter = (logo: LogoEntry) => {
    if (activeDifficulties.size === 0) return true;
    if (!logo.difficulty) return false;
    return activeDifficulties.has(logo.difficulty);
  };

  const filteredLogos = pack.logos.filter(matchesFilter);

  const handleToggleDifficulty = (level: LogoQuizDifficulty) => {
    setActiveDifficulties((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const handleClearFilters = () => setActiveDifficulties(new Set());

  if (pack.logos.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-gray-700 bg-gray-900/50 px-4 py-8 text-center text-gray-400">
        {stripAccents("Ce pack ne contient aucun logo pour le moment.")}
      </p>
    );
  }

  const sections = pack.sections;
  const hasSections = Boolean(sections && sections.length > 0);

  return (
    <div className="mx-auto w-full">
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-gray-200">
            {stripAccents("Progression")}
          </span>
          <span className="tabular-nums text-gray-400" aria-live="polite">
            {hydrated
              ? stripAccents(`${completedCount} / ${pack.logos.length} trouves`)
              : stripAccents(`${pack.logos.length} logos`)}
          </span>
        </div>
        <ProgressBar value={hydrated ? completedCount : 0} max={pack.logos.length} />
      </div>

      {hasAnyDifficulty ? (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {stripAccents("Difficulte")}
            </p>
            {activeDifficulties.size > 0 ? (
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-medium text-ocean-400 transition hover:text-ocean-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500"
              >
                {stripAccents("Tout afficher")}
              </button>
            ) : null}
          </div>
          <ul className="flex flex-wrap gap-2">
            {LOGO_QUIZ_DIFFICULTY_ORDER.map((level) => {
              const selected = activeDifficulties.has(level);
              const showColored =
                activeDifficulties.size === 0 || selected;
              return (
                <li key={level}>
                  <button
                    type="button"
                    onClick={() => handleToggleDifficulty(level)}
                    aria-pressed={selected}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ocean-500 ${
                      showColored ? FILTER_CHIP_ACTIVE[level] : FILTER_CHIP_IDLE
                    } ${activeDifficulties.size > 0 && !selected ? "opacity-40" : ""}`}
                  >
                    <span className="tabular-nums">{difficultyShortLabel(level)}</span>
                    <span className="hidden sm:inline">{stripAccents(level)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {hasSections ? (
        sections!.map((section) => (
          <SectionBlock
            key={section.id}
            packId={pack.id}
            section={section}
            logos={section.logos.filter(matchesFilter)}
            hydrated={hydrated}
            isCompleted={isCompleted}
            indexById={indexById}
          />
        ))
      ) : (
        <LogoGrid
          packId={pack.id}
          logos={filteredLogos}
          hydrated={hydrated}
          isCompleted={isCompleted}
          indexById={indexById}
        />
      )}

      {!hydrated ? (
        <span className="sr-only">{stripAccents("Chargement de la progression…")}</span>
      ) : completedIds.length === pack.logos.length ? (
        <p className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">
          {stripAccents("Pack termine !")}
        </p>
      ) : null}
    </div>
  );
}
