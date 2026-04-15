#!/usr/bin/env node
/**
 * Migration Marvel Cinéverse: name = identité civile (ou équivalent),
 * aliases[0] = ancien nom public / nom de code.
 *
 * Usage:
 *   node scripts/migrate-marvel-names.js --dry-run
 *   node scripts/migrate-marvel-names.js --apply
 */
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "..", "data", "marvel-cineverse.json");

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

function lastWord(s) {
  const parts = String(s).trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

function isGarbage(s) {
  const t = String(s);
  if (t.length > 200) return true;
  if (/\]\]/.test(t)) return true;
  if (/DSit[A-Z]/.test(t)) return true;
  if (/BartonFiles|PymAMat|SitMoM|FilesGotG/i.test(t)) return true;
  if (/turally treated|Issue #?\d/i.test(t)) return true;
  return false;
}

/** First token (lowercase) often starts a superhero / title name (not "Michael", "Maria"). */
const HERO_FIRST_TOKEN = new Set(
  [
    "spider",
    "iron",
    "captain",
    "black",
    "white",
    "winter",
    "doctor",
    "dr.",
    "dr",
    "star-lord",
    "star",
    "ant-man",
    "ant",
    "green",
    "red",
    "silver",
    "ghost",
    "moon",
    "ms.",
    "ms",
    "she-hulk",
    "she",
    "mister",
    "invisible",
    "human",
    "strange",
    "war",
    "dead",
    "party",
    "kid",
    "alligator",
    "boastful",
    "zombie",
    "u.s.",
    "us",
    "professor",
    "valkyrie",
    "negasonic",
    "scarlet",
    "yellowjacket",
    "giant-man",
    "wasp",
    "mighty",
    "doc",
    "proxima",
    "corvus",
    "ebony",
    "cull",
    "death",
    "razor",
    "power",
    "madame",
    "general",
    "galactus",
    "celui",
    "l'",
    "le",
    "king",
    "misty",
    "psylocke",
    "agent",
    "deathlok",
    "deacon",
    "jared",
    "hannibal",
    "abigail",
    "elsa",
    "verussa",
    "ulysses",
    "kang",
    "cassandra",
    "kahhori",
    "hommekith",
    "l'ancien",
  ].map((x) => norm(x))
);

const MONONYM_PUBLIC_OR_ENTITY = new Set(
  [
    "Thanos",
    "Vision",
    "Gamora",
    "Drax",
    "Groot",
    "Nebula",
    "Ultron",
    "Loki",
    "Thor",
    "Odin",
    "Hela",
    "Ego",
    "Korg",
    "Miek",
    "Korath",
    "Sif",
    "Volstagg",
    "Fandral",
    "Hogun",
    "Laufey",
    "Yukio",
    "Mantis",
    "Talos",
    "Wong",
    "Dormammu",
    "Ayesha",
    "Taserface",
    "Skurge",
    "Surtur",
    "Cosmo",
    "Kang",
    "Ikaris",
    "Sersi",
    "Thena",
    "Ajak",
    "Kingo",
    "Sprite",
    "Phastos",
    "Makkari",
    "Druig",
    "Gilgamesh",
    "Kro",
    "Rintrah",
    "Attuma",
    "Namora",
    "Weasel",
    "Paradox",
    "Stick",
    "Nobu",
    "Kazi",
    "Kraglin",
    "Galactus",
    "Howard the Duck",
    "Rocket Raccoon",
    "Arnim Zola",
    "Dormammu",
  ].map((x) => norm(x))
);

function firstToken(s) {
  const parts = String(s).trim().split(/\s+/).filter(Boolean);
  return parts.length ? norm(parts[0].replace(/[’']/g, "'")) : "";
}

/** True if `s` is a superhero / codename / public mantle (not "Maria Hill", "Michael Morbius"). */
function looksLikeCodename(s) {
  const t = String(s).trim();
  if (!t) return false;
  const base = t.replace(/\s*\([^)]{3,}\)\s*$/, "").trim();
  const b = norm(base);
  const lw = norm(lastWord(base));
  const ft = firstToken(base);

  if (MONONYM_PUBLIC_OR_ENTITY.has(b)) return true;

  if (HERO_FIRST_TOKEN.has(ft)) return true;

  if (
    /^(spider-man|spider-woman|spider-gwen|spider-ham|spider-noir|iron man|iron monger|iron patriot|star-lord|ant-man|ms\. marvel|she-hulk|u\.s\. agent|us agent|red skull|green goblin|silver surfer|human torch|mister fantastic|invisible woman|doctor octopus|doc ock|doctor doom|docteur doom|winter soldier|black bolt|death dealer|power broker|madame web|captain carter|party thor|mighty thor|strange supreme|kid loki|alligator loki|boastful loki|deathlok|misty knight|celui qui demeure|le maître de l'évolution|kang the conqueror|rocket raccoon)/i.test(
      b
    )
  )
    return true;

  if (
    /^(man|woman|girl|boy|lord|king|queen|knight|widow|pool|bolt|fang|claw|fire|ice|ghost|devil|goblin|venom|carnage|lizard|octopus|monger|surfer|torch|thing|hulk|fauve|nova|maw|bolt|giant)s?$/i.test(
      lw
    ) &&
    lw.length >= 3
  )
    return true;

  if (/^(dr\.|doctor)\s+/i.test(t)) return true;
  if (/^(the\s+)?(thing|hulk|fauve)\b/i.test(b)) return true;

  return false;
}

function looksLikePersonalName(s) {
  const t = String(s).trim();
  if (t.length < 3) return false;
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return false;
  if (!/^[A-Za-zÀ-ÿ'.-]+$/.test(parts[0].replace(/'/g, ""))) return false;
  return true;
}

/**
 * OVERRIDES: { civil, hero? } | { skip: true }
 * If `civil` is set, always migrate: name=civil, aliases[0]=hero ?? oldName (before apply).
 */
const OVERRIDES = {
  "tony-stark": { civil: "Anthony Edward Stark", hero: "Iron Man" },
  "clint-barton": { civil: "Clinton Francis Barton", hero: "Hawkeye (Terre-616)" },
  "baron-mordo-838-mcu": { civil: "Karl Mordo", hero: "Baron Mordo (Terre-838)" },
  "reed-richards-838-mcu": { civil: "Reed Richards", hero: "Mister Fantastic" },
  "charles-xavier-838-mcu": { civil: "Charles Francis Xavier", hero: "Professor X" },
  "miguel-ohara-spiderverse": { civil: "Miguel O'Hara", hero: "Spider-Man 2099" },
  "nick-fury": { civil: "Nicholas Joseph Fury", hero: "Nick Fury" },
  "miles-morales-spiderverse": { civil: "Miles Morales", hero: "Spider-Man (Terre-8311)" },
  "gwen-stacy-spiderverse": { civil: "Gwen Stacy", hero: "Spider-Gwen" },
};

function dedupeAliases(list, heroFirst) {
  const seen = new Set();
  const out = [];
  const add = (s) => {
    const k = norm(s);
    if (!s || !String(s).trim()) return;
    if (seen.has(k)) return;
    seen.add(k);
    out.push(String(s).trim());
  };
  add(heroFirst);
  for (const a of list) add(a);
  return out;
}

function pickCivilFromAliases(name, aliases, heroLabel) {
  const nh = norm(heroLabel);
  const filtered = aliases.filter((a) => {
    if (!a || typeof a !== "string") return false;
    if (isGarbage(a)) return false;
    const na = norm(a);
    if (na === nh) return false;
    if (looksLikeCodename(a) && na !== norm(name)) return false;
    return true;
  });
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => b.length - a.length || a.localeCompare(b));
  return filtered[0];
}

function findHeroAliasInList(name, aliases) {
  const nn = norm(name);
  for (const a of aliases) {
    if (!a || isGarbage(a)) continue;
    if (looksLikeCodename(a) && norm(a) !== nn) return String(a).trim();
  }
  return null;
}

function pickHeroForCivilFirst(name, aliases) {
  const nn = norm(name);
  const heroes = aliases.filter((a) => a && !isGarbage(a) && looksLikeCodename(a) && norm(a) !== nn);
  if (heroes.length === 0) return null;
  heroes.sort((a, b) => b.length - a.length);
  return heroes[0].trim();
}

function applyHeroToAliasMigration(char, civil, heroLabel, aliasesList) {
  const oldName = char.name;
  const oldAliases =
    aliasesList ??
    (Array.isArray(char.aliases) ? char.aliases : []).filter((a) => a && !isGarbage(a));
  const rest = oldAliases.filter((a) => norm(a) !== norm(heroLabel) && norm(a) !== norm(civil));
  const newAliases = dedupeAliases(rest, heroLabel);
  const newChar = { ...char, name: civil, aliases: newAliases };
  const changed =
    norm(newChar.name) !== norm(oldName) ||
    newChar.aliases.length !== oldAliases.length ||
    newChar.aliases.some((v, i) => norm(v) !== norm(oldAliases[i]));
  return { char: newChar, changed, preview: { name: civil, aliases: newAliases } };
}

function migrateCharacter(char) {
  const id = char.id;
  const oldName = char.name;
  const oldAliases = (Array.isArray(char.aliases) ? char.aliases : []).filter((a) => a && !isGarbage(a));

  if (OVERRIDES[id]?.skip) {
    return { char, changed: false, reason: "override-skip" };
  }

  const override = OVERRIDES[id];

  if (override?.civil) {
    const heroLabel = override.hero ?? oldName;
    const r = applyHeroToAliasMigration(char, override.civil, heroLabel, oldAliases);
    if (!r.changed) return { char, changed: false, reason: "noop-override" };
    return { ...r, reason: "override-hero-to-alias" };
  }

  const nameIsCodename = looksLikeCodename(oldName);
  const heroAlias = findHeroAliasInList(oldName, oldAliases) || pickHeroForCivilFirst(oldName, oldAliases);

  if (!nameIsCodename && heroAlias) {
    const rest = oldAliases.filter((a) => norm(a) !== norm(heroAlias));
    const newAliases = dedupeAliases(rest, heroAlias);
    const same =
      oldAliases.length === newAliases.length &&
      oldAliases.every((v, i) => norm(v) === norm(newAliases[i]));
    if (same) return { char, changed: false, reason: "already-ordered-civil" };
    return {
      char: { ...char, aliases: newAliases },
      changed: true,
      reason: "reorder-civil-first",
      preview: { name: oldName, aliases: newAliases },
    };
  }

  if (!nameIsCodename) {
    return { char, changed: false, reason: "skip-not-hero-display" };
  }

  const heroLabel = oldName;
  const civil = pickCivilFromAliases(oldName, oldAliases, heroLabel);
  if (!civil) {
    return { char, changed: false, reason: "skip-no-civil-in-data" };
  }

  const r = applyHeroToAliasMigration(char, civil, heroLabel, oldAliases);
  if (!r.changed) return { char, changed: false, reason: "noop" };
  return { ...r, reason: "hero-to-alias" };
}

function main() {
  const apply = process.argv.includes("--apply");
  const dry = process.argv.includes("--dry-run") || !apply;

  const raw = fs.readFileSync(JSON_PATH, "utf8");
  const data = JSON.parse(raw);
  if (!data.characters || !Array.isArray(data.characters)) {
    console.error("Invalid JSON: missing characters[]");
    process.exit(1);
  }

  const report = [];
  let changeCount = 0;
  const newCharacters = data.characters.map((char) => {
    const r = migrateCharacter(char);
    report.push({
      id: char.id,
      oldName: char.name,
      newName: r.char.name,
      newAliases: r.char.aliases,
      changed: r.changed,
      reason: r.reason,
    });
    if (r.changed) changeCount++;
    return r.char;
  });

  const skipNoCivil = report.filter((x) => x.reason === "skip-no-civil-in-data");

  console.log(
    JSON.stringify(
      {
        total: report.length,
        changed: changeCount,
        skipNoCivil: skipNoCivil.length,
      },
      null,
      2
    )
  );
  if (skipNoCivil.length) {
    console.error("\nSKIP (codename display but no civil in aliases):");
    for (const u of skipNoCivil) console.error(`  ${u.id}: name=${JSON.stringify(u.oldName)}`);
  }

  if (dry) {
    const outPath = path.join(__dirname, "migrate-marvel-names-report.json");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf8");
    console.log(`\nWrote ${outPath}`);
    if (!apply) console.log("\nDry-run only. Pass --apply to write data/marvel-cineverse.json");
  }

  if (apply) {
    data.characters = newCharacters;
    fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
    console.log(`\nApplied migration to ${JSON_PATH}`);
  }
}

main();
