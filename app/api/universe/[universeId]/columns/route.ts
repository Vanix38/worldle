import { NextResponse } from "next/server";
import { getUniverses, getUniverseData } from "@/lib/universes-data";
import type { ColumnDocRow } from "@/types/game";

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
  if (!data?.fieldMapping) {
    return NextResponse.json({ error: "Univers inconnu" }, { status: 404 });
  }

  const columns: ColumnDocRow[] = [];
  for (const [key, entry] of Object.entries(data.fieldMapping)) {
    columns.push({
      key,
      header: entry.header,
      description: entry.description?.trim() || null,
      fonction: entry.fonction,
      ...(entry.hint?.prompt ? { hintPrompt: entry.hint.prompt } : {}),
      ...(entry.columnWidth ? { columnWidth: entry.columnWidth } : {}),
    });
  }

  return NextResponse.json({
    universeId: data.id,
    universeName: data.name,
    columns,
  });
}
