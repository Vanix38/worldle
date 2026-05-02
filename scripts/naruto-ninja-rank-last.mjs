/**
 * Ne garde que le dernier rang chronologique (dernier bloc « … : rang » sur la fiche wiki FR).
 */
export function ninjaRankLastOnly(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return s;
  s = s.replace(/\u00a0/g, " ");
  const pipe = s.indexOf("|");
  if (pipe !== -1) s = s.slice(0, pipe).trim();

  const labelRe =
    /(Partie\s+[IVX]+\s*:|Nouvelle\s+Ère\s*:|Épilogue\s*:|Gaiden\s*:|Période\s+Creuse\s*:)/gi;
  const hits = [];
  let m;
  while ((m = labelRe.exec(s))) {
    hits.push(m.index);
  }
  if (hits.length === 0) return s;

  const tail = s.slice(hits[hits.length - 1]).trim();
  const stripped = tail
    .replace(
      /^(?:Partie\s+[IVX]+\s*|Nouvelle\s+Ère\s*|Épilogue\s*|Gaiden\s*|Période\s+Creuse\s*):\s*/i,
      "",
    )
    .trim();
  return stripped || s;
}
