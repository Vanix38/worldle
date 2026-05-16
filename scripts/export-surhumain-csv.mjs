import fs from "node:fs";

const data = JSON.parse(
  fs.readFileSync(new URL("../data/marvel-cineverse.json", import.meta.url), "utf8")
);

const rows = data.characters
  .filter((c) => Array.isArray(c.abilities) && c.abilities.includes("Surhumain"))
  .map((c) => c.name)
  .sort((a, b) => a.localeCompare(b, "fr"));

const SEP = ";";

function esc(s) {
  const t = String(s);
  return /[;"'\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

const outPath = new URL("../data/marvel-cineverse-surhumain.csv", import.meta.url);
const lines = [
  `nom${SEP}nouvelle capacité`,
  ...rows.map((n) => `${esc(n)}${SEP}`),
];
fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");
console.log(`${rows.length} lignes -> data/marvel-cineverse-surhumain.csv`);
