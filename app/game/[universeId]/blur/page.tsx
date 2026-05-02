import { notFound } from "next/navigation";
import { getUniverses, getUniverseData } from "@/lib/universes-data";
import { BlurModePageClient } from "./BlurModePageClient";

export function generateStaticParams() {
  return getUniverses().map((u) => ({ universeId: u.id }));
}

export default async function BlurModePage({
  params,
}: {
  params: Promise<{ universeId: string }>;
}) {
  const { universeId } = await params;
  const universeData = getUniverseData(universeId);
  if (!universeData) notFound();
  return <BlurModePageClient universeId={universeId} universeData={universeData} />;
}
