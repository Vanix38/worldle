import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");
const OUT_PATH = path.join(__dirname, "..", "data", "one-piece-final-qa-report.txt");

const FINAL_COLUMNS = [
  "final_mainaffiliation",
  "final_subaffiliations",
  "final_aliases",
  "final_occupation_actuelle",
  "final_autres_occupations",
  "final_age",
  "final_height",
  "final_status",
  "final_premiere",
  "final_origin",
  "final_dftype",
  "final_dfname",
  "final_bounty",
];

const SOURCE_BY_FINAL = {
  final_mainaffiliation: ["en_wiki_mainaffiliation", "fr_wiki_mainaffiliation"],
  final_subaffiliations: ["en_wiki_subaffiliations", "fr_wiki_subaffiliations"],
  final_aliases: ["en_wiki_aliases", "fr_wiki_aliases"],
  final_occupation_actuelle: ["en_wiki_occupation_actuelle", "fr_wiki_occupation_actuelle"],
  final_autres_occupations: ["en_wiki_autres_occupations", "fr_wiki_autres_occupations"],
  final_age: [],
  final_height: [],
  final_status: [],
  final_premiere: [],
  final_origin: ["en_wiki_origin", "fr_wiki_origine", "fr_wiki_lieuvie"],
  final_dftype: ["en_wiki_dftype", "fr_wiki_dftype"],
  final_dfname: [],
  final_bounty: ["en_wiki_bounty", "fr_wiki_prime"],
};

/** Tokens clairement anglais à signaler dans listes / métiers fusionnés. */
const ENGLISH_TOKENS = new Set([
  "admiral",
  "adventurer",
  "all-star",
  "apprentice",
  "archaeologist",
  "bartender",
  "captain",
  "chief",
  "commander",
  "commodore",
  "cover",
  "doctor",
  "dyer",
  "emperor",
  "explorer",
  "farmer",
  "former",
  "governor-general",
  "governor",
  "head",
  "hunter",
  "instructor",
  "leader",
  "lieutenant",
  "mercenary",
  "mercenaries",
  "musician",
  "navigator",
  "officer",
  "pet",
  "pirates",
  "priest",
  "prisoner",
  "ruler",
  "scientist",
  "secretary",
  "shipwright",
  "shinuchi",
  "slave",
  "sniper",
  "soldier",
  "spy",
  "stationmaster",
  "thief",
  "titanic",
  "vice",
  "waitress",
  "warden",
  "warlord",
  "warrior",
  "division",
  "ship",
  "fleet",
  "kingdom",
  "island",
  "edited",
  "dub",
  "literally",
  "meaning",
  "versions",
  "subs",
  "funimation",
  "english",
  "ward",
  "elite",
  "executive",
  "combatant",
  "gladiator",
  "broker",
  "owner",
  "proprietor",
  "mechanic",
  "engineer",
  "foreman",
  "mayor",
  "president",
  "inspector",
  "revolutionary",
  "retainer",
  "performers",
  "theatre",
  "reporter",
  "gifters",
  "underworld",
  "branch",
  "patrol",
  "centaur",
  "warlords",
  "helmsman",
  "advisor",
  "adviser",
  "boxer",
  "wrestler",
  "teinturier",
  "mountain",
  "wind",
  "silent",
  "delivery",
  "boy",
  "employee",
  "patissier",
  "waitress",
  "justices",
  "warden",
  "member",
  "instructor",
  "teacher",
  "rear",
  "governor-general",
  "environmental",
  "minister",
  "design",
  "sweet",
  "flour",
  "evangelist",
  "magistrate",
  "special",
  "zombies",
  "surprise",
  "wild",
  "stealth",
  "black",
  "force",
  "sword",
  "apprentice",
  "warlord",
  "empress",
  "underworld",
  "pleasure",
  "district",
  "research",
  "assistant",
  "fish-man",
  "karate",
  "martial",
  "artist",
  "jujutsu",
  "steed",
  "stealth",
]);

const ENGLISH_COLUMNS = new Set([
  "final_subaffiliations",
  "final_autres_occupations",
  "final_aliases",
  "final_mainaffiliation",
  "final_occupation_actuelle",
]);

const SKIP_SEMICOLON_COLUMNS = new Set(["final_premiere"]);

/** Tokens à ignorer pour la détection anglais (noms propres / acronymes). */
const ENGLISH_ALLOWLIST = new Set([
  "cp0",
  "cp9",
  "cp7",
  "cp-aigis0",
  "neo",
  "mads",
  "ssg",
  "sword",
  "smile",
  "davy",
  "back",
  "fight",
  "cross",
  "guild",
  "newkama",
  "land",
  "tom's",
  "workers",
  "galley-la",
  "company",
  "water",
  "seven",
  "big",
  "mom",
  "one",
  "piece",
  "devil",
  "fruit",
  "no",
  "mi",
  "model",
  "jack",
  "king",
  "queen",
  "ace",
  "luffy",
  "zoro",
  "nami",
  "sanji",
  "chopper",
  "robin",
  "franky",
  "brook",
  "jinbe",
  "ussop",
  "usopp",
  "vegapunk",
  "doflamingo",
  "kaido",
  "shanks",
  "mihawk",
  "garp",
  "dragon",
  "sabo",
  "ace",
  "teach",
  "barbe",
  "noire",
  "blanche",
  "roux",
  "happou",
  "happo",
  "dressrosa",
  "skypiea",
  "skypiéa",
  "wano",
  "wa",
  "egg",
  "head",
  "punk",
  "hazard",
  "impel",
  "down",
  "thriller",
  "bark",
  "enies",
  "lobby",
  "baratie",
  "baroque",
  "works",
  "spiders",
  "café",
  "cafe",
  "mermaid",
  "takoyaki",
  "weatheria",
  "johnny",
  "yosaku",
  "zou",
  "mokomo",
  "totto",
  "whole",
  "cake",
  "germa",
  "vinsmoke",
  "kozuki",
  "kurozumi",
  "charlotte",
  "neptune",
  "ryugu",
  "fish-man",
  "fishman",
  "sun",
  "heart",
  "fire",
  "tank",
  "rolling",
  "rumbar",
  "kid",
  "hawkins",
  "apoo",
  "bege",
  "law",
  "bonney",
  "urouge",
  "capone",
  "x.",
  "barrels",
  "on-air",
  "on",
  "air",
  "beautiful",
  "magnifiques",
  "fallen",
  "monk",
  "flying",
  "volants",
  "giant",
  "géants",
  "geants",
  "ide",
  "ideo",
  "alvida",
  "buggy",
  "baggy",
  "clown",
  "foxy",
  "krieg",
  "arlong",
  "caribou",
  "chat",
  "noir",
  "bliking",
  "bluejam",
  "bonney",
  "don",
  "quijote",
  "quichotte",
  "doflamingo",
  "bellamy",
  "hawkins",
  "supernovae",
  "supernova",
  "tobiroppo",
  "calamité",
  "calamite",
  "shinuchi",
  "gifters",
  "beasts",
  "cent",
  "bêtes",
  "betes",
  "rocks",
  "empereurs",
  "corsaires",
  "revolutionary",
  "révolutionnaire",
  "revolutionnaires",
  "kamabakka",
  "newcomer",
  "sorbet",
  "mary",
  "geoise",
  "god",
  "valley",
  "birka",
  "birka",
  "elbaph",
  "erbaf",
  "loguetown",
  "shade",
  "port",
  "fuchsia",
  "cocoyashi",
  "drum",
  "cerisiers",
  "sakura",
  "alabasta",
  "arabasta",
  "amazon",
  "lily",
  "observation",
  "armement",
  "conquérant",
  "haki",
  "stella",
  "sutera",
  "begapanku",
  "vegapunk",
  "shimotsuki",
  "dadan",
  "mont",
  "corvo",
  "baltigo",
  "kamabakka",
  "notice",
  "mock",
  "town",
  "orange",
  "goat",
  "kalai",
  "bali",
  "baldimore",
  "karakuri",
  "hachinosu",
  "ruche",
  "sphinx",
  "baterilla",
  "vespa",
  "satsuruzo",
  "oykot",
  "foolshout",
  "kedétrav",
  "kedetrav",
  "ringo",
  "onigashima",
  "flower",
  "capital",
  "wa",
  "pays",
  "des",
  "principauté",
  "principaute",
  "archipel",
  "île",
  "ile",
  "royaume",
  "grand",
  "line",
  "east",
  "blue",
  "north",
  "south",
  "west",
  "red",
  "mary",
  "geoise",
  "world",
  "economy",
  "news",
  "paper",
  "impel",
  "down",
  "thriller",
  "bark",
  "enies",
  "lobby",
  "tom's",
  "workers",
  "galley-la",
  "franky",
  "family",
  "spiders",
  "bar",
  "arnaque",
  "mermaid",
  "café",
  "potiron",
  "takoyaki",
  "weatheria",
  "newkama",
  "land",
  "baroque",
  "works",
  "cross",
  "guild",
  "alliance",
  "ninjas",
  "pirates",
  "minks",
  "samouraïs",
  "samourais",
  "fourreaux",
  "rouges",
  "flotte",
  "chapeau",
  "paille",
  "grande",
  "yonta",
  "maria",
  "happou",
  "armada",
  "krieg",
  "don",
  "krieg",
  "o-niwaban",
  "oniwaban",
  "shandia",
  "shandias",
  "ohara",
  "mads",
  "neo",
  "ssg",
  "underworld",
  "pègre",
  "pegre",
  "quartier",
  "plaisirs",
  "district",
  "hommes-poissons",
  "hommes",
  "poissons",
  "fish",
  "district",
  "districts",
  "sun",
  "pirates",
  "soleil",
  "spade",
  "roger",
  "rogers",
  "rumbar",
  "rolling",
  "fire",
  "tank",
  "heart",
  "on-air",
  "magnifiques",
  "beautiful",
  "fallen",
  "monk",
  "dépravés",
  "depraves",
  "volants",
  "flying",
  "géants",
  "giants",
  "warrior",
  "maelstrom",
  "spider",
  "happo",
  "navy",
  "saruyama",
  "duck",
  "troops",
  "spot-billed",
  "super",
  "walrus",
  "school",
  "ukkari",
  "hot-spring",
  "spring",
  "clan",
  "d.",
  "d",
  "asl",
  "lucy",
  "entei",
  "rushi",
  "px-0",
  "pacifista",
  "pacifist",
  "tyrant",
  "hero",
  "hiro",
  "kumachi",
  "kuma-chi",
  "bokun",
  "heiwashugi-sha",
  "super-héros",
  "super-heros",
  "invincible",
  "esclave",
  "pasteur",
  "souverain",
  "pacifista",
]);

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

function cleanText(value) {
  return String(value ?? "")
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmpty(value) {
  return !cleanText(value);
}

function splitList(value) {
  return cleanText(value)
    .split(",")
    .map((part) => cleanText(part))
    .filter(Boolean);
}

function normKey(value) {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findEnglishTokens(value, finalCol) {
  const text = cleanText(value);
  if (!text || !ENGLISH_COLUMNS.has(finalCol)) return [];

  const hits = new Set();

  for (const token of splitList(text)) {
    const lower = token.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);

    for (const word of words) {
      if (ENGLISH_TOKENS.has(word)) hits.add(word);
    }

    if (/\b(of|in|at|for|with|from)\s+the\b/i.test(token)) hits.add("(of/in the)");
    if (/\bthe\b/i.test(token) && !/thé|theatre|thermo/i.test(token)) hits.add("(the)");
    if (/[a-z][A-Z]/.test(token)) hits.add("(camelCase)");
  }

  return [...hits].filter((w) => !ENGLISH_ALLOWLIST.has(w.replace(/[()]/g, "").toLowerCase()));
}

function findNearDuplicates(items) {
  const groups = [];
  const used = new Set();

  for (let i = 0; i < items.length; i++) {
    if (used.has(i)) continue;
    const group = [items[i]];
    const keyA = normKey(items[i]);

    for (let j = i + 1; j < items.length; j++) {
      if (used.has(j)) continue;
      const keyB = normKey(items[j]);
      if (!keyA || !keyB) continue;

      const same = keyA === keyB;
      const contains = keyA.includes(keyB) || keyB.includes(keyA);
      const prefix =
        keyA.length >= 4 &&
        keyB.length >= 4 &&
        (keyA.startsWith(keyB.slice(0, 4)) || keyB.startsWith(keyA.slice(0, 4)));

      if (same || (contains && Math.min(keyA.length, keyB.length) >= 5) || prefix) {
        group.push(items[j]);
        used.add(j);
      }
    }

    if (group.length > 1) {
      used.add(i);
      groups.push(group);
    }
  }

  return groups;
}

function findGluedIssues(value) {
  const issues = [];
  const text = cleanText(value);
  if (!text) return issues;

  if (/[a-zàâäéèêëïîôùûüç][A-ZÉÀÂÄÈÊËÏÎÔÙÛÜÇ]/.test(text)) {
    issues.push("majuscule collée (ex. PirateCapitaine)");
  }
  if (/[a-z]{3,}[A-Z][a-z]+/.test(text)) {
    issues.push("camelCase");
  }
  if (/[a-zàâäéèêëïîôùûüç]{2,}(Pirate|Marine|Captain|Commander|Admiral|Prince|Princess|Kingdom|Island)/.test(text)) {
    issues.push("mot EN collé après FR");
  }
  if (/Glénat:|Glenat:|literally meaning|in the edited dub|Funimation|English versions/i.test(text)) {
    issues.push("bruit wiki / traduction");
  }
  if (/""/.test(text) || /^"+|"+$/.test(text)) {
    issues.push("guillemets cassés");
  }
  if (text.length > 120) {
    issues.push(`très long (${text.length} car.)`);
  }

  return issues;
}

function sourceHasData(row, header, sourceCols) {
  return sourceCols.some((col) => {
    const idx = header.indexOf(col);
    if (idx === -1) return false;
    const v = cleanText(row[idx]);
    if (!v) return false;
    if (/^aucune$/i.test(v)) return false;
    return true;
  });
}

function formatSources(row, header, sourceCols) {
  return sourceCols
    .map((col) => {
      const idx = header.indexOf(col);
      const v = idx === -1 ? "" : cleanText(row[idx]);
      return `${col}=${v || "∅"}`;
    })
    .join(" | ");
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];
const data = rows.slice(1);

const idIdx = header.indexOf("id");
const nameIdx = header.indexOf("local_name");

const issuesByType = {
  english: [],
  duplicates: [],
  glued: [],
  emptyWithSource: [],
  semicolon: [],
  subAucuneFiltered: [],
};

let totalChecks = 0;

for (const row of data) {
  const id = row[idIdx];
  const name = row[nameIdx];

  for (const finalCol of FINAL_COLUMNS) {
    const finalIdx = header.indexOf(finalCol);
    if (finalIdx === -1) continue;

    const value = cleanText(row[finalIdx]);
    const sources = SOURCE_BY_FINAL[finalCol] ?? [];
    totalChecks++;

    if (!SKIP_SEMICOLON_COLUMNS.has(finalCol) && /;/.test(value)) {
      issuesByType.semicolon.push({ id, name, finalCol, value });
    }

    const english = findEnglishTokens(value, finalCol);
    if (english.length > 0) {
      issuesByType.english.push({
        id,
        name,
        finalCol,
        value,
        detail: english.join(", "),
      });
    }

    const glued = findGluedIssues(value);
    if (glued.length > 0) {
      issuesByType.glued.push({ id, name, finalCol, value, detail: glued.join("; ") });
    }

    if (finalCol === "final_subaffiliations" || finalCol === "final_aliases" || finalCol === "final_autres_occupations") {
      const items = splitList(value);
      const dupGroups = findNearDuplicates(items);
      for (const group of dupGroups) {
        issuesByType.duplicates.push({
          id,
          name,
          finalCol,
          value,
          detail: group.join(" ~ "),
        });
      }
    }

    if (finalCol === "final_subaffiliations" && isEmpty(value)) {
      const enIdx = header.indexOf("en_wiki_subaffiliations");
      const frIdx = header.indexOf("fr_wiki_subaffiliations");
      const en = enIdx === -1 ? "" : cleanText(row[enIdx]);
      const fr = frIdx === -1 ? "" : cleanText(row[frIdx]);
      if (/^aucune$/i.test(en) && !fr) {
        issuesByType.subAucuneFiltered.push({
          id,
          name,
          finalCol,
          value: "(vide)",
          detail: `EN=Aucune FR=∅ → filtré volontairement`,
        });
      }
    }

    if (isEmpty(value) && sources.length > 0 && sourceHasData(row, header, sources)) {
      issuesByType.emptyWithSource.push({
        id,
        name,
        finalCol,
        value: "(vide)",
        detail: formatSources(row, header, sources),
      });
    }
  }
}

function section(title, items, formatter) {
  const lines = [];
  lines.push(`\n=== ${title} (${items.length}) ===\n`);
  if (items.length === 0) {
    lines.push("(aucun)\n");
    return lines;
  }
  for (const item of items) {
    lines.push(formatter(item));
  }
  return lines;
}

const out = [];
const push = (line = "") => out.push(line + "\n");

push("Rapport QA — colonnes final_*");
push(`Fichier: ${CSV_PATH}`);
push(`Lignes: ${data.length} personnages`);
push(`Colonnes final vérifiées: ${FINAL_COLUMNS.length}`);
push(`Contrôles effectués: ${totalChecks}`);
push();
push("RÉSUMÉ");
push(`- Termes anglais (listes / métiers): ${issuesByType.english.length}`);
push(`- Doublons proches (listes): ${issuesByType.duplicates.length}`);
push(`- Valeurs collées / bruit wiki: ${issuesByType.glued.length}`);
push(`- Final vide alors que source a des données: ${issuesByType.emptyWithSource.length}`);
push(`- Sous-affiliations vides (EN=Aucune, FR vide): ${issuesByType.subAucuneFiltered.length}`);
push(`- Point-virgule interdit dans final_*: ${issuesByType.semicolon.length}`);

const fmt = (item) =>
  `${item.id} (${item.name}) [${item.finalCol}]\n  final: ${item.value}\n  détail: ${item.detail}\n`;

out.push(
  ...section("1. Termes anglais détectés", issuesByType.english, (item) =>
    `${item.id} (${item.name}) [${item.finalCol}]\n  final: ${item.value}\n  mots: ${item.detail}\n`,
  ),
);

out.push(
  ...section("2. Doublons proches dans listes", issuesByType.duplicates, fmt),
);

out.push(
  ...section("3. Valeurs collées / bruit / trop longues", issuesByType.glued, fmt),
);

out.push(
  ...section(
    "4. Final vide mais source non vide (à corriger)",
    issuesByType.emptyWithSource,
    fmt,
  ),
);

out.push(
  ...section(
    "5. Sous-affiliations vides — EN=Aucune (info, pas bug)",
    issuesByType.subAucuneFiltered,
    fmt,
  ),
);

out.push(
  ...section("6. Séparateur point-virgule dans final", issuesByType.semicolon, (item) =>
    `${item.id} (${item.name}) [${item.finalCol}]: ${item.value}\n`,
  ),
);

// Top persos par nombre d'issues
const scoreById = new Map();
for (const bucket of Object.values(issuesByType)) {
  for (const item of bucket) {
    if (item.finalCol === "final_subaffiliations" && bucket === issuesByType.subAucuneFiltered) {
      continue;
    }
    const key = item.id;
    scoreById.set(key, (scoreById.get(key) ?? 0) + 1);
  }
}

const top = [...scoreById.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25);

push("=== TOP 25 personnages (alertes hors info Aucune) ===");
for (const [id, count] of top) {
  const row = data.find((r) => r[idIdx] === id);
  push(`${count}\t${id}\t${row?.[nameIdx] ?? ""}`);
}

fs.writeFileSync(OUT_PATH, out.join(""), "utf8");
console.log(`Wrote ${OUT_PATH}`);
console.log(
  `english=${issuesByType.english.length} dup=${issuesByType.duplicates.length} glued=${issuesByType.glued.length} empty=${issuesByType.emptyWithSource.length}`,
);
