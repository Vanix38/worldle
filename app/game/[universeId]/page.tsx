import { notFound } from "next/navigation";
import { getUniverses, getUniverseData } from "@/lib/universes-data";
import { GamePageClient } from "./GamePageClient";

export function generateStaticParams() {
  return getUniverses().map((u) => ({ universeId: u.id }));
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ universeId: string }>;
}) {
  const { universeId } = await params;
  const universeData = getUniverseData(universeId);
  if (!universeData) notFound();
  return <GamePageClient universeId={universeId} universeData={universeData} />;
}
