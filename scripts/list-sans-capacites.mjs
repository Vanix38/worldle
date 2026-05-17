import fs from "node:fs";

const raw = fs.readFileSync(
  new URL("../data/marvel-cineverse.json", import.meta.url),
  "utf8",
);
const data = JSON.parse(raw);

const sans = data.characters.filter((c) => {
  if (!("abilities" in c)) return true;
  if (c.abilities == null) return true;
  if (Array.isArray(c.abilities) && c.abilities.length === 0) return true;
  return false;
});

const rawAbilities = (raw.match(/"abilities":/g) ?? []).length;
const rawIds = (raw.match(/"id":/g) ?? []).length - 1; // minus universe id

console.log(`Personnages: ${data.characters.length}`);
console.log(`Champ "abilities" dans le fichier: ${rawAbilities}`);
console.log(`Sans capacités (absent / null / []): ${sans.length}`);

if (sans.length) {
  sans
    .sort((a, b) => a.name.localeCompare(b.name, "fr"))
    .forEach((c) => console.log(`${c.id}\t${c.name}`));
}
