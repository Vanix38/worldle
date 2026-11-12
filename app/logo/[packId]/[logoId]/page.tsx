import { notFound } from "next/navigation";
import { getLogoQuizPack, getLogoQuizPacks } from "@/lib/logo-quiz-data";
import { LogoQuizPlayPageClient } from "./LogoQuizPlayPageClient";

export function generateStaticParams() {
  const packs = getLogoQuizPacks();
  const params: { packId: string; logoId: string }[] = [];
  for (const pack of packs) {
    const full = getLogoQuizPack(pack.id);
    if (!full) continue;
    for (const logo of full.logos) {
      params.push({ packId: pack.id, logoId: logo.id });
    }
  }
  // output: "export" rejects an empty generateStaticParams array
  if (params.length === 0) return [{ packId: "_placeholder", logoId: "_placeholder" }];
  return params;
}

export default async function LogoQuizPlayPage({
  params,
}: {
  params: Promise<{ packId: string; logoId: string }>;
}) {
  const { packId, logoId } = await params;
  const pack = getLogoQuizPack(packId);
  if (!pack) notFound();
  if (!pack.logos.some((l) => l.id === logoId)) notFound();
  return <LogoQuizPlayPageClient pack={pack} logoId={logoId} />;
}
