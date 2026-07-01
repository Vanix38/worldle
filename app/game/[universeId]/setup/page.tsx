import { notFound, redirect } from "next/navigation";
import { getUniverses, getUniverseData } from "@/lib/universes-data";
import { universeHasSpoilerProgress } from "@/lib/spoiler-progress";
import { SetupPageClient } from "./SetupPageClient";

export function generateStaticParams() {
  return getUniverses().map((u) => ({ universeId: u.id }));
}

export default async function SetupPage({
  params,
}: {
  params: Promise<{ universeId: string }>;
}) {
  const { universeId } = await params;
  const universeData = getUniverseData(universeId);
  if (!universeData) notFound();
  if (!universeHasSpoilerProgress(universeData)) {
    redirect(`/game/${universeId}`);
  }
  return <SetupPageClient universeId={universeId} universeData={universeData} />;
}
