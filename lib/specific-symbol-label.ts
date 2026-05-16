import { stripAccents } from "@/lib/utils";

/** `futton.svg` → `Futton`, `pays du sable.svg` → `Pays du sable` */
export function labelFromSymbolFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").trim();
  const s = stripAccents(base);
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
