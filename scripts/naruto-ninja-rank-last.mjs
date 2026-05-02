/**
 * Ne garde que le dernier rang chronologique (dernier bloc « … : rang » sur la fiche wiki FR).
 */
export function ninjaRankLastOnly(raw) {
  let s = String(raw ?? "").trim();
  if (!s) return s;
  s = s.replace(/\u00a0/g, " ").replace(/&nbsp;/gi, " ");
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

/**
 * Normalise les libellés wiki vers les entrées de data/naruto-ninja-ranks-order.json.
 */
export function canonicalNinjaRank(raw) {
  let s = String(raw ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  if (!s) return "";
  s = s.replace(/^Parite\s+/i, "Partie ");
  s = s.replace(/^Part\s+([IVX]+)\s*:/i, "Partie $1 :");
  s = s.replace(/^Partie\s+[IVX]+\s*:\s*/i, "").trim();
  s = s.replace(/^Période\s+Creuse\s*:\s*/i, "").trim();
  s = s.replace(/^Nouvelle\s+Ère\s*:\s*/i, "").trim();

  const n = s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

  if (/etudiant/.test(n) && /academ/.test(n)) return "Étudiant à l'Académie";
  if (n === "genin") return "Genin";
  if (n === "chunin" || n === "chuunin") return "Chûnin";
  if (/tokubetsu/.test(n) && /jonin|jounin/.test(n)) return "Tokubetsu Jônin";
  if (n === "jonin" || n === "jounin") return "Jônin";
  if (n === "nukenin") return "Nukenin";
  if (n === "anbu") return "Anbu";
  if (n === "chubu") return "Chûbu";
  if (/chef\s+ninja/.test(n)) return "Chef Ninja";
  if (/ancien\s+de\s+suna/.test(n)) return "Ancien de Suna";
  if (/(hokage|kazekage|mizukage|raikage|tsuchikage)$/.test(n) || /^kage$/.test(n)) return "Kage";

  return s.trim();
}
