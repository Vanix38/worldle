import Link from "next/link";
import { getUniverses } from "@/lib/universes-data";

export default function Home() {
  const universes = getUniverses();

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-white">Worlddle</h1>
        <p className="mt-2 text-gray-400">
          Choisis un univers et devine le personnage.
        </p>
      </header>

      <ul className="space-y-2">
        {universes.map((u) => (
          <li key={u.id}>
            <Link
              href={`/game/${u.id}`}
              className="relative flex min-h-[4rem] items-center justify-center overflow-hidden rounded-lg border border-gray-600 px-4 py-3 transition hover:border-gray-500 hover:bg-gray-700/40"
              style={{
                ...(u.banner && {
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${u.banner})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }),
                ...(!u.banner && { backgroundColor: "rgba(17, 24, 39, 0.9)" }),
              }}
            >
              {u.logo ? (
                <span className="relative z-10 flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={u.logo}
                    alt={u.name}
                    className="max-h-12 w-auto max-w-[200px] object-contain"
                  />
                </span>
              ) : (
                <span className="relative z-10 text-lg font-medium text-white">
                  {u.name}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
