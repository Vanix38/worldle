import Link from "next/link";
import { getUniverses } from "@/lib/universes-data";
import { stripAccents } from "@/lib/utils";
import { Card } from "@/components/ui/Card";

export default function Home() {
  const universes = getUniverses();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-10 text-center sm:mb-12">
        <h1 className="text-4xl font-bold text-white sm:text-5xl">
          Worlddle
        </h1>
        <p className="mt-3 text-base text-gray-400 sm:text-lg">
          Choisis un univers et devine le personnage.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3">
        {universes.map((u) => (
          <li key={u.id}>
            <Card padding="none" variant="outline" className="overflow-hidden">
              <Link
                href={`/game/${u.id}`}
                className="relative flex min-h-[4.5rem] items-center justify-center overflow-hidden px-4 py-4 transition hover:border-ocean-500/50 hover:bg-gray-800/60 sm:min-h-[5rem] sm:px-5 sm:py-5"
                style={{
                  ...(u.banner && {
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${u.banner})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }),
                  ...(!u.banner && { backgroundColor: "rgba(17, 24, 39, 0.95)" }),
                }}
                aria-label={`Jouer à ${stripAccents(u.name)}`}
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
    </div>
  );
}
