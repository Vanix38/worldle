import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("d:/worlddle/data/invincible.json", "utf8"));
const counts = new Map();

const split = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

for (const c of data.characters) {
  for (const field of ["occupation", "indice2"]) {
    for (const occ of split(c[field])) {
      counts.set(occ, (counts.get(occ) || 0) + 1);
    }
  }
}

const rows = [...counts.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")
);

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lines = ["occupation,count", ...rows.map(([o, n]) => `${esc(o)},${n}`)];

const out = "d:/worlddle/data/invincible-occupations.csv";
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${rows.length} occupations to ${out}`);
