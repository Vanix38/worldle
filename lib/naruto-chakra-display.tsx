import { stripAccents } from "@/lib/utils";

/**
 * Libellés Naruto (données) → slug = nom du fichier `public/universes/naruto/chakra-symbols/<slug>.svg`.
 * Pictogrammes issus du diagramme « Chakra » Naruto (Commons, Ju gatsu mikka, CC BY-SA 3.0).
 */
export const NARUTO_CHAKRA_SLUG_BY_LABEL: Record<string, string> = {
  Katon: "katon",
  Fûton: "futon",
  Raiton: "raiton",
  Doton: "doton",
  Suiton: "suiton",
  Hyôton: "hyoton",
  Ranton: "ranton",
  Mokuton: "mokuton",
  Yôton: "yoton",
  Futton: "futton",
  Bakuton: "bakuton",
  Enton: "enton",
  Jinton: "jinton",
  Jiton: "jiton",
  Shakuton: "shakuton",
  Inton: "inton",
  Inyôton: "inyoton",
  Kiba: "kiba",
};

function chakraSymbolSrc(slug: string): string {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `${basePath}/universes/naruto/chakra-symbols/${slug}.svg`.replace(/^\/+/, "/");
}

/** Affiche les natures connues en pictos SVG ; le reste (ex. kekkei dans indice2) reste en texte. */
export function NarutoChakraMixedDisplay({
  value,
  iconClassName = "h-7 w-7 shrink-0 rounded-sm object-contain",
}: {
  value: string;
  iconClassName?: string;
}) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "Aucun") {
    return <>{stripAccents(trimmed || "—")}</>;
  }

  const parts = trimmed
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return <>{stripAccents(trimmed)}</>;

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map((p, i) => {
        const slug = NARUTO_CHAKRA_SLUG_BY_LABEL[p];
        if (slug) {
          return (
            <img
              key={`${p}-${i}`}
              src={chakraSymbolSrc(slug)}
              alt={stripAccents(p)}
              title={stripAccents(p)}
              className={iconClassName}
            />
          );
        }
        return (
          <span key={`${p}-${i}`} className="whitespace-pre-wrap break-words">
            {stripAccents(p)}
          </span>
        );
      })}
    </span>
  );
}

export function shouldUseNarutoChakraDisplay(universeId: string, fieldKey: string): boolean {
  return universeId === "naruto" && (fieldKey === "chakraNatures" || fieldKey === "indice2");
}
