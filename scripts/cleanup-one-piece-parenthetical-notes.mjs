import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

function parseLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function compact(value) {
  return String(value ?? "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ", ")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function cleanupSimpleNotes(value) {
  return compact(
    String(value ?? "")
      .replace(/\s*\((?:temporairement|allié|anime|résigné|manga|satellite)\)/giu, "")
      .replace(/\(allié\)/giu, "")
      .replace(/\(temporairement\)/giu, "")
      .replace(/\(anime\)/giu, "")
      .replace(/\(résigné\)/giu, "")
      .replace(/\(manga\)/giu, "")
      .replace(/\(satellite\)/giu, ""),
  );
}

function cleanupArlongPark(value) {
  return compact(String(value ?? "").replace(/Village de Kokoyashi\s*\(Arlong Park\)/giu, "Arlong Park"));
}

function cleanupNamedParentheticalPlaces(value) {
  return compact(
    String(value ?? "")
      .replace(/\s*\(Chocolate Town\)/giu, ", Chocolate Town")
      .replace(/\s*\(Fluffy Town\)/giu, ", Fluffy Town")
      .replace(/\s*\(Gare de Shift\)/giu, ", Gare de Shift")
      .replace(/\s*\(dans un port inconnu\)/giu, ", dans un port inconnu")
      .replace(/\s*\(Archipel des Gekko\)/giu, ", Archipel des Gekko")
      .replace(/\s*\(Baldimore\)/giu, ", Baldimore")
      .replace(/\s*\(Bas-fonds de Water Seven\)/giu, ", Bas-fonds de Water Seven")
      .replace(/\s*\(Baterilla\)/giu, ", Baterilla")
      .replace(/\s*\(Bean Town\)/giu, ", Bean Town"),
  );
}

function cleanupPirateParen(value) {
  return compact(String(value ?? "").replace(/\s*\(Pirate\)/giu, " Pirate"));
}

function cleanupOrdinalParen(value) {
  return compact(
    String(value ?? "")
      .replace(/\s*\(12ème\)/giu, " 12ème")
      .replace(/\s*\(30 ans auparavant\)/giu, ", 30 ans auparavant")
      .replace(/\s*\(Armée Est\)/giu, " Armée Est")
      .replace(/\s*\(Armée G\)/giu, " Armée G"),
  );
}

function cleanupAffiliationDetails(value) {
  return compact(
    String(value ?? "")
      .replace(/\s*\(actuellement séparée de Gecko Moria à cause de Bartholomew Kuma\)/giu, "")
      .replace(/\s*\(assumé\)/giu, " assumé"),
  );
}

function cleanupFormerActing(value) {
  return compact(String(value ?? "").replace(/\s*\(acting, former\)/giu, ""));
}

function cleanupCurrentAge(value) {
  const matches = [...String(value ?? "").matchAll(/(\d+)(?:\s*ans)?\s*\((passé|actuellement)\)/giu)];
  if (!matches.length) return compact(String(value ?? ""));
  const current = matches.find((m) => /actuellement/i.test(m[2]));
  return current ? `${parseInt(current[1], 10)} ans` : compact(String(value ?? ""));
}

function cleanupSharedBounty(value) {
  return compact(
    String(value ?? "")
      .replace(/\s*\(avec Buchi\)/giu, ", avec Buchi")
      .replace(/\s*\(avec Sham\)/giu, ", avec Sham"),
  );
}

function cleanupArtificial(value) {
  return compact(
    String(value ?? "")
      .replace(/\s*\(Artificial\)/giu, "")
      .replace(/\s*\(Fruit Artificiel\)/giu, ""),
  );
}

function parseAgeEntries(value) {
  const out = [];
  const re = /(\d+\s*ans)(?:\s*\(([^)]*)\))?/giu;
  for (const m of String(value ?? "").matchAll(re)) {
    out.push({ age: m[1].replace(/\s+/g, " ").trim(), note: (m[2] ?? "").trim() });
  }
  return out;
}

function normalizeNote(note) {
  return String(note ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function chooseLatestAge(value) {
  const entries = parseAgeEntries(value);
  if (!entries.length) return compact(String(value ?? ""));

  const keepers = entries.filter(({ note }) => !/debut|chapitre 1|biologiquement/.test(normalizeNote(note)));
  const pool = keepers.length ? keepers : entries;

  const real = pool.find(({ note }) => /age reel/.test(normalizeNote(note)));
  if (real) return real.age;

  const chrono = pool.find(({ note }) => /chronologiquement/.test(normalizeNote(note)));
  if (chrono) return chrono.age;

  const now = pool.find(({ note }) => /(maintenant|aujourd'hui|apres l'ellipse|post wano)/.test(normalizeNote(note)));
  if (now) return now.age;

  return pool[pool.length - 1].age;
}

function chooseLatestHeight(value) {
  const matches = [...String(value ?? "").matchAll(/(\d+)\s*cm/giu)].map((m) => `${parseInt(m[1], 10)} cm`);
  if (matches.length) return matches[matches.length - 1];
  return compact(
    String(value ?? "")
      .replace(/\s*\((?:au début|avant l'ellipse|après l'ellipse|enfant|adulte|avant\/après ellipse)\)/giu, ""),
  );
}

function cleanupMarineBounty(id, affiliation, value) {
  const isMarine = /marine/iu.test(String(affiliation ?? "")) || ["koby", "sakazuki", "sentomaru"].includes(String(id ?? ""));
  if (!isMarine) return compact(String(value ?? ""));
  const matches = String(value ?? "").match(/\d[\d.,]*/g);
  if (!matches?.length) return compact(String(value ?? ""));
  return matches[matches.length - 1];
}

const KEPT_PARENS = new Set([
  "e",
  "hito hito no mi, model: nika",
  "ile de drum",
  "kedetrav",
  "loguetown",
  "mythical zoan",
  "non-canon",
  "non canon",
  "ohara",
]);

function normalizeInner(inner) {
  return String(inner ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripMostParentheses(value) {
  return compact(
    String(value ?? "").replace(/\(([^)]*)\)/g, (full, inner, offset, src) => {
      const normalized = normalizeInner(inner);
      if (KEPT_PARENS.has(normalized)) return full;
      const prev = src.slice(0, offset).trimEnd().slice(-1);
      const prefix = prev && ![",", ";", "(", "/", "-"].includes(prev) ? ", " : " ";
      return `${prefix}${String(inner).trim()}`;
    }),
  );
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));

const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

let changed = 0;
const outLines = [headers.join(";")];

for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  while (row.length < headers.length) row.push("");

  const before = row.join("\u0001");

  if (idx.fr_wiki_affiliation >= 0) row[idx.fr_wiki_affiliation] = cleanupSimpleNotes(row[idx.fr_wiki_affiliation]);
  if (idx.fr_wiki_affiliation >= 0) row[idx.fr_wiki_affiliation] = cleanupAffiliationDetails(row[idx.fr_wiki_affiliation]);
  if (idx.fr_wiki_occupation >= 0) row[idx.fr_wiki_occupation] = cleanupSimpleNotes(row[idx.fr_wiki_occupation]);
  if (idx.fr_wiki_occupation >= 0) row[idx.fr_wiki_occupation] = cleanupFormerActing(row[idx.fr_wiki_occupation]);
  if (idx.fr_wiki_dfnom >= 0) row[idx.fr_wiki_dfnom] = cleanupSimpleNotes(row[idx.fr_wiki_dfnom]);
  if (idx.en_wiki_autres_occupations >= 0) {
    row[idx.en_wiki_autres_occupations] = cleanupFormerActing(row[idx.en_wiki_autres_occupations]);
    row[idx.en_wiki_autres_occupations] = cleanupNamedParentheticalPlaces(row[idx.en_wiki_autres_occupations]);
  }

  if (idx.fr_wiki_lieuvie >= 0) row[idx.fr_wiki_lieuvie] = cleanupNamedParentheticalPlaces(row[idx.fr_wiki_lieuvie]);
  if (idx.fr_wiki_origine >= 0) row[idx.fr_wiki_origine] = cleanupNamedParentheticalPlaces(row[idx.fr_wiki_origine]);
  if (idx.fr_wiki_occupation >= 0) row[idx.fr_wiki_occupation] = cleanupPirateParen(row[idx.fr_wiki_occupation]);
  if (idx.fr_wiki_occupation >= 0) row[idx.fr_wiki_occupation] = cleanupOrdinalParen(row[idx.fr_wiki_occupation]);
  if (idx.fr_wiki_prime >= 0) row[idx.fr_wiki_prime] = cleanupOrdinalParen(row[idx.fr_wiki_prime]);
  if (idx.fr_wiki_prime >= 0) row[idx.fr_wiki_prime] = cleanupSharedBounty(row[idx.fr_wiki_prime]);

  if (idx.fr_wiki_lieuvie >= 0) row[idx.fr_wiki_lieuvie] = cleanupArlongPark(row[idx.fr_wiki_lieuvie]);

  if (idx.en_wiki_dfname >= 0) row[idx.en_wiki_dfname] = cleanupArtificial(row[idx.en_wiki_dfname]);
  if (idx.en_wiki_dftype >= 0) row[idx.en_wiki_dftype] = cleanupArtificial(row[idx.en_wiki_dftype]);
  if (idx.fr_wiki_dfnom >= 0) row[idx.fr_wiki_dfnom] = cleanupArtificial(row[idx.fr_wiki_dfnom]);
  if (idx.en_wiki_first >= 0) row[idx.en_wiki_first] = cleanupSimpleNotes(row[idx.en_wiki_first]);
  if (idx.fr_wiki_première >= 0) row[idx.fr_wiki_première] = cleanupSimpleNotes(row[idx.fr_wiki_première]);

  if (idx.fr_wiki_âge >= 0) row[idx.fr_wiki_âge] = chooseLatestAge(row[idx.fr_wiki_âge]);
  if (idx.fr_wiki_âge >= 0) row[idx.fr_wiki_âge] = cleanupCurrentAge(row[idx.fr_wiki_âge]);
  if (idx.fr_wiki_taille >= 0) row[idx.fr_wiki_taille] = chooseLatestHeight(row[idx.fr_wiki_taille]);
  if (idx.fr_wiki_prime >= 0) {
    row[idx.fr_wiki_prime] = cleanupMarineBounty(row[idx.id], row[idx.fr_wiki_affiliation], row[idx.fr_wiki_prime]);
  }

  for (let j = 0; j < row.length; j++) {
    row[j] = stripMostParentheses(row[j]);
  }

  const after = row.join("\u0001");
  if (after !== before) changed++;

  outLines.push(row.map(csvEscapeField).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Nettoyé:", CSV);
console.log("Lignes modifiées:", changed);
