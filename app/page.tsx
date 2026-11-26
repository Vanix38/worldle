import Link from "next/link";
import { getUniverses } from "@/lib/universes-data";
import { getLogoQuizPacks } from "@/lib/logo-quiz-data";
import { stripAccents } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export default function Home() {
  const universes = getUniverses();
  const logoPacks = getLogoQuizPacks();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 text-center sm:mb-12">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Worlddle
        </h1>
        <p className="mt-3 text-base text-gray-400 sm:text-lg">
          {stripAccents("Choisis un univers ou un quiz logo.")}
        </p>
      </header>

      <section aria-labelledby="universes-heading" className="mb-12 sm:mb-14">
        <h2
          id="universes-heading"
          className="mb-4 text-center text-xl font-semibold text-white sm:mb-5 sm:text-2xl"
        >
          {stripAccents("Univers")}
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
          {universes.map((u) => (
            <li key={u.id}>
              <Card padding="none" variant="outline" className="overflow-hidden">
                <Link
                  href={`/game/${u.id}/setup`}
                  className="relative flex min-h-[4.5rem] items-center justify-center overflow-hidden px-4 py-4 transition hover:border-ocean-500/50 hover:bg-gray-800/60 sm:min-h-[5rem] sm:px-5 sm:py-5"
                  style={{
                    ...(u.banner && {
                      backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${u.banner})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }),
                    ...(!u.banner && { backgroundColor: "rgba(17, 24, 39, 0.95)" }),
                  }}
                  aria-label={stripAccents(`Jouer à ${u.name}`)}
                >
                  {u.logo ? (
                    <span className="relative z-10 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={u.logo}
                        alt=""
                        className="max-h-12 w-auto max-w-full object-contain sm:max-h-14"
                      />
                    </span>
                  ) : (
                    <span className="relative z-10 text-center text-lg font-medium text-white sm:text-xl">
                      {stripAccents(u.name)}
                    </span>
                  )}
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="logo-quiz-heading">
        <h2
          id="logo-quiz-heading"
          className="mb-2 text-center text-xl font-semibold text-white sm:text-2xl"
        >
          {stripAccents("Logo Quiz")}
        </h2>
        <p className="mb-4 text-center text-sm text-gray-400 sm:mb-5">
          {stripAccents("Devine le nom à partir du logo, lettre par lettre.")}
        </p>
        {logoPacks.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-700 bg-gray-800/40 px-4 py-8 text-center text-gray-400">
            {stripAccents("Aucun pack pour le moment. Les packs arriveront bientôt.")}
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
            {logoPacks.map((pack) => (
              <li key={pack.id}>
                <Card padding="none" variant="outline" className="overflow-hidden">
                  <Link
                    href={`/logo/${pack.id}`}
                    className="relative flex h-[5rem] flex-col items-center justify-center gap-0.5 overflow-hidden px-4 py-3 transition hover:border-ocean-500/50 hover:bg-gray-800/60 sm:h-[6rem] sm:px-5 sm:py-4"
                    style={{
                      ...(pack.banner && {
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${pack.banner})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }),
                      ...(!pack.banner && { backgroundColor: "rgba(17, 24, 39, 0.95)" }),
                    }}
                    aria-label={stripAccents(`Jouer au Logo Quiz ${pack.name}`)}
                  >
                    {pack.logo ? (
                      <span className="relative z-10 flex min-h-0 max-h-10 items-center justify-center sm:max-h-12">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={pack.logo}
                          alt=""
                          className="max-h-full w-auto max-w-full object-contain"
                        />
                      </span>
                    ) : (
                      <span className="relative z-10 text-center text-lg font-medium text-white sm:text-xl">
                        {stripAccents(pack.name)}
                      </span>
                    )}
                    {pack.description ? (
                      <span className="relative z-10 line-clamp-1 max-w-full px-1 text-center text-xs text-gray-300">
                        {stripAccents(pack.description)}
                      </span>
                    ) : null}
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
