import { notFound } from "next/navigation";
import { getLogoQuizPack, getLogoQuizPacks } from "@/lib/logo-quiz-data";
import { LogoQuizPackPageClient } from "./LogoQuizPackPageClient";

export function generateStaticParams() {
  const packs = getLogoQuizPacks().map((p) => ({ packId: p.id }));
  // output: "export" rejects an empty generateStaticParams array
  if (packs.length === 0) return [{ packId: "_placeholder" }];
  return packs;
}

export default async function LogoQuizPackPage({
  params,
}: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await params;
  const pack = getLogoQuizPack(packId);
  if (!pack) notFound();
  return <LogoQuizPackPageClient pack={pack} />;
}
