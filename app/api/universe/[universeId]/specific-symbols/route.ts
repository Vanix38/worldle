import { NextResponse } from "next/server";
import { getUniverses, getUniverseData, readSpecificSymbols } from "@/lib/universes-data";

/** Pré-rendu pour `output: export` : une réponse JSON par univers. */
export const dynamic = "force-static";

export function generateStaticParams() {
  return getUniverses().map((u) => ({ universeId: u.id }));
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ universeId: string }> },
) {
  const { universeId } = await context.params;
  const data = getUniverseData(universeId);
  if (!data) {
    return NextResponse.json({ error: "Univers inconnu" }, { status: 404 });
  }

  const symbols = readSpecificSymbols(universeId);

  return NextResponse.json({
    universeId: data.id,
    universeName: data.name,
    symbols,
  });
}
