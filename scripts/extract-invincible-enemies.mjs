import { readFileSync, writeFileSync } from "fs";

function splitEnemies(value) {
  const preprocessed = (value || "").replace(
    /99,\s*9\s*%\s*des autres/gi,
    "99,9 % des autres"
  );

  return preprocessed
    .split(/,\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const data = JSON.parse(readFileSync("d:/worlddle/data/invincible.json", "utf8"));
const counts = new Map();

for (const c of data.characters) {
  for (const enemy of splitEnemies(c.indice1)) {
    counts.set(enemy, (counts.get(enemy) || 0) + 1);
  }
}

const rows = [...counts.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")
);

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lines = ["enemy,count", ...rows.map(([enemy, n]) => `${esc(enemy)},${n}`)];

const out = "d:/worlddle/data/invincible-enemies.csv";
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${rows.length} enemies to ${out}`);
