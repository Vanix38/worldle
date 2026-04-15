#!/usr/bin/env node
/**
 * Applique les modifications manuelles de migrate-marvel-names-report.json
 * vers data/marvel-cineverse.json :
 * - name ← newName si différent
 * - fusion des aliases : ajouter ceux de newAliases s'ils manquent (ordre : newAliases puis existants)
 * - retirer tout alias strictement égal au name final
 */
const fs = require("fs");
const path = require("path");

const REPORT_PATH = path.join(__dirname, "migrate-marvel-names-report.json");
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

function mergeAliases(finalName, existingAliases, newAliases) {
  const seen = new Set();
  const out = [];

  const pushUnique = (a) => {
    if (a == null || typeof a !== "string") return;
    const t = a.trim();
    if (!t) return;
    const k = norm(t);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };

  for (const a of newAliases || []) pushUnique(a);
  for (const a of existingAliases || []) pushUnique(a);

  return out.filter((a) => a !== finalName);
}

function main() {
  const report = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  if (!Array.isArray(report)) {
    console.error("Report must be a JSON array");
    process.exit(1);
  }

  const byId = new Map(report.map((r) => [r.id, r]));
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  if (!data.characters || !Array.isArray(data.characters)) {
    console.error("Invalid universe JSON");
    process.exit(1);
  }

  let nameUpdates = 0;
  let aliasTouched = 0;

  for (const char of data.characters) {
    const r = byId.get(char.id);
    if (!r) continue;

    const newName = r.newName;
    if (typeof newName === "string" && newName !== char.name) {
      char.name = newName;
      nameUpdates++;
    }

    const finalName = char.name;
    const before = JSON.stringify(char.aliases || []);
    char.aliases = mergeAliases(finalName, char.aliases, r.newAliases);
    if (JSON.stringify(char.aliases) !== before) aliasTouched++;
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ characters: data.characters.length, nameUpdates, aliasTouched }, null, 2));
}

main();
