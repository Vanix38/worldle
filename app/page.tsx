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
              className="block rounded-lg border border-gray-600 bg-gray-800/80 px-4 py-3 text-lg font-medium text-white transition hover:border-gray-500 hover:bg-gray-700/80"
            >
              {u.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
