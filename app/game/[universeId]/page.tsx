import { GamePageClient } from "./GamePageClient";
import { UNIVERSES } from "@/lib/universes";

export function generateStaticParams() {
  return UNIVERSES.map((u) => ({ universeId: u.id }));
}

export default function GamePage() {
  return <GamePageClient />;
}
