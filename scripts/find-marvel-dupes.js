#!/usr/bin/env node
/**
 * Détecte des "doublons" potentiels : même nom, alias communs,
 * ou nom de l'un présent dans les alias de l'autre (comparaison normalisée).
 */
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "..", "data", "marvel-cineverse.json");
const OUT_PATH = path.join(__dirname, "marvel-dupes-report.json");

function stripAccents(str) {
  return String(str)
    .replace(/\u00E6/g, "ae")
    .replace(/\u0153/g, "oe")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .normalize("NFC");
}

function norm(s) {
  return stripAccents(String(s)).toLowerCase().trim();
}

function aliasSet(aliases) {
  const s = new Set();
  for (const a of aliases || []) {
    if (typeof a !== "string" || !a.trim()) continue;
    s.add(norm(a));
  }
  return s;
}

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  const chars = data.characters || [];

  const byName = new Map();
  for (const c of chars) {
    const k = norm(c.name);
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k).push(c);
  }

  const sameName = [];
  for (const [k, list] of byName) {
    if (list.length > 1) {
      sameName.push({
        reason: "same_name",
        normalizedName: k,
        characters: list.map((c) => ({ id: c.id, name: c.name })),
      });
    }
  }

  const pairKey = (a, b) => (a < b ? `${a}\t${b}` : `${b}\t${a}`);
  const seenPairs = new Map();

  function addPair(c1, c2, reasons) {
    const k = pairKey(c1.id, c2.id);
    if (!seenPairs.has(k)) {
      seenPairs.set(k, {
        a: { id: c1.id, name: c1.name },
        b: { id: c2.id, name: c2.name },
        reasons: new Set(),
      });
    }
    const entry = seenPairs.get(k);
    for (const r of reasons) entry.reasons.add(r);
  }

  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const c1 = chars[i];
      const c2 = chars[j];
      const n1 = norm(c1.name);
      const n2 = norm(c2.name);
      const a1 = aliasSet(c1.aliases);
      const a2 = aliasSet(c2.aliases);

      const reasons = [];
      if (n1 === n2) reasons.push("same_name");
      for (const x of a1) {
        if (a2.has(x)) {
          reasons.push("shared_alias");
          break;
        }
      }
      if (a2.has(n1) || a1.has(n2)) reasons.push("name_in_other_aliases");

      if (reasons.length) addPair(c1, c2, reasons);
    }
  }

  const pairs = [...seenPairs.values()].map((e) => ({
    a: e.a,
    b: e.b,
    reasons: [...e.reasons],
  }));

  pairs.sort((x, y) => x.a.id.localeCompare(y.a.id) || x.b.id.localeCompare(y.b.id));

  const out = {
    summary: {
      totalCharacters: chars.length,
      sameNameGroups: sameName.length,
      duplicatePairs: pairs.length,
    },
    sameName,
    pairs,
  };

  const text = JSON.stringify(out, null, 2) + "\n";
  fs.writeFileSync(OUT_PATH, text, "utf8");
  console.log(
    JSON.stringify(
      {
        ...out.summary,
        reportFile: path.relative(process.cwd(), OUT_PATH),
      },
      null,
      2
    )
  );
}

main();
