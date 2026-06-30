import { readFileSync, writeFileSync } from "fs";

const data = JSON.parse(readFileSync("d:/worlddle/data/invincible.json", "utf8"));
const counts = new Map();

const split = (s) => (s || "").split(",").map((x) => x.trim()).filter(Boolean);

for (const c of data.characters) {
  for (const home of split(c.home)) {
    counts.set(home, (counts.get(home) || 0) + 1);
  }
}

const rows = [...counts.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")
);

const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lines = ["home,count", ...rows.map(([home, n]) => `${esc(home)},${n}`)];

const out = "d:/worlddle/data/invincible-homes.csv";
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`Wrote ${rows.length} homes to ${out}`);
