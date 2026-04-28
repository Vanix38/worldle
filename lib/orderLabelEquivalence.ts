/**
 * Rang d’un libellé dans une liste ordonnée, avec équivalences explicites (synonymes).
 * Utilisé pour firstAppearance (Marvel) : libellés FR du JSON + variantes EN (Wikidata).
 */

export function rankInOrderedList(
  val: unknown,
  order: readonly string[],
  pairs: readonly (readonly [string, string])[] | undefined,
): number {
  const v = String(val ?? "").trim();
  if (!v || !order.length) return -1;
  const parent = new Map<string, string>();

  function find(x: string): string {
    if (!parent.has(x)) parent.set(x, x);
    const p = parent.get(x)!;
    if (p === x) return x;
    parent.set(x, find(p));
    return parent.get(x)!;
  }
  function union(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  for (const ab of pairs || []) {
    if (ab?.[0] && ab?.[1]) union(ab[0].trim(), ab[1].trim());
  }

  const rv = find(v);
  let best = Infinity;
  for (let i = 0; i < order.length; i++) {
    if (find(order[i]) === rv) best = Math.min(best, i);
  }
  return best === Infinity ? -1 : best;
}
