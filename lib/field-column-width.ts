import type { FieldColumnWidth } from "@/types/game";

/** Classes Tailwind pour `<th>` / `<td>` en `table-fixed`. Medium = répartition par défaut du navigateur. */
export function fieldColumnWidthClass(width: FieldColumnWidth | undefined): string {
  switch (width) {
    case "small":
      return "w-[5rem] max-w-[6rem]";
    case "large":
      return "min-w-[11rem] max-w-none lg:max-w-[min(40vw,22rem)]";
    case "medium":
    default:
      return "";
  }
}
