import { notFound } from "next/navigation";
import { getUniverses, getUniverseData } from "@/lib/universes-data";
import { HardModePageClient } from "./HardModePageClient";

export function generateStaticParams() {
  return getUniverses().map((u) => ({ universeId: u.id }));
}

export default async function HardModePage({
  params,
}: {
  params: Promise<{ universeId: string }>;
}) {
  const { universeId } = await params;
  const universeData = getUniverseData(universeId);
  if (!universeData) notFound();
  return <HardModePageClient universeId={universeId} universeData={universeData} />;
}
