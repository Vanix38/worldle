import { notFound } from "next/navigation";
import { getUniverses, getUniverseData } from "@/lib/universes-data";
import { SheetModePageClient } from "./SheetModePageClient";

export function generateStaticParams() {
  return getUniverses().map((u) => ({ universeId: u.id }));
}

export default async function SheetModePage({
  params,
}: {
  params: Promise<{ universeId: string }>;
}) {
  const { universeId } = await params;
  const universeData = getUniverseData(universeId);
  if (!universeData) notFound();
  return <SheetModePageClient universeId={universeId} universeData={universeData} />;
}
