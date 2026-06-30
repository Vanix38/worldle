import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("d:/worlddle/data/invincible.json", "utf8"));
const csv = readFileSync("d:/worlddle/data/amazon-invincible-characters-fields.csv", "utf8").replace(/^\uFEFF/, "");

function parseRow(line) {
  const parts = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ";") {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

const lines = csv.trim().split(/\r?\n/);
const headers = parseRow(lines[0]);
const rows = lines.slice(1).map((line) => {
  const p = parseRow(line);
  return Object.fromEntries(headers.map((h, i) => [h, p[i] ?? ""]));
});
const byTitle = Object.fromEntries(rows.map((r) => [r.title.toLowerCase(), r]));

const idToTitle = {
  iguana: "Iguana",
  "ed-thompson": "Ed Thompson",
  domina: "Domina",
  "capitaine-pikell": "Captain Pikell",
  universa: "Universa",
  anissa: "Anissa",
  "april-howsam": "April Howsam",
  "komodo-dragon": "Komodo Dragon",
  "oliver-grayson-ii": "Oliver Grayson II",
  lucan: "Lucan",
  paul: "Paul",
  bulletproof: "Bulletproof",
  conquest: "Conquest",
  "great-wall": "Great Wall",
  kregg: "Kregg",
  thula: "Thula",
  isotope: "Isotope",
  "machine-head": "Machine Head",
  "tether-tyrant": "Tether Tyrant",
  "doc-seismic": "Doc Seismic",
  "cecil-stedman": "Cecil Stedman",
  "dupli-kate": "Dupli-Kate",
  "flaxan-leader": "Flaxan Leader",
  "rex-splode": "Rex Splode",
  "debbie-grayson": "Debbie Grayson",
  "art-rosenbaum": "Art Rosenbaum",
  kursk: "Kursk",
  "betsy-wilkins": "Betsy Wilkins",
  radcliffe: "Radcliffe",
  argall: "Argall",
  andressa: "Andressa",
  aquarus: "Aquarus",
  darkwing: "Darkwing",
  "green-ghost-ii": "Green Ghost II",
  "martian-man": "Martian Man",
  "red-rush": "Red Rush",
  "war-woman": "War Woman",
  "jumeaux-mauler": "Mauler Twins",
  killcannon: "Killcannon",
  "monster-girl": "Monster Girl",
  "multi-paul": "Multi-Paul",
  "battle-beast": "Battle Beast",
  magmaniac: "Magmaniac",
  furnace: "Furnace",
  "king-lizard": "King Lizard",
  salamander: "Salamander",
  octoboss: "Octoboss",
  "l-immortel": "The Immortal",
  invincible: "Invincible",
  "omni-man": "Omni-Man",
  titan: "Titan",
  "tech-jacket": "Tech Jacket",
  powerplex: "Powerplex",
  "space-racer": "Space Racer",
  thaedus: "Thaedus",
  "darkwing-ii": "Darkwing II",
  "angstrom-levy": "Angstrom Levy",
  "d-a-sinclair": "D.A. Sinclair",
  "rick-sheridan": "Rick Sheridan",
  "adam-wilkins": "Adam Wilkins",
  "ka-hor": "Ka-Hor",
  "mister-liu": "Mister Liu",
  "black-samson": "Black Samson",
  "shrinking-rae": "Shrinking Rae",
  "allen-l-extraterrestre": "Allen the Alien",
  "atom-eve": "Atom Eve",
  robot: "Robot",
  "amber-bennett": "Amber Bennett",
  volcanikka: "Volcanikka",
  thragg: "Thragg",
  satan: "Satan",
  brit: "Brit",
  "supreme-lizard": "Supreme Lizard",
  telia: "General Telia",
  vidor: "Vidor",
  elix: "Elix",
  kradd: "Kradd",
  mokk: "Mokk",
  "donald-ferguson": "Donald Ferguson",
  "the-elephant": "The Elephant",
  shapesmith: "Shapesmith",
  "l-immortel-ligne-temporelle-future": "Invincible/Future Timeline",
};

const empty = data.characters.filter((c) => !c.indice2 || !String(c.indice2).trim());
for (const c of empty) {
  const title = idToTitle[c.id] || c.name;
  const row = byTitle[title.toLowerCase()] || {};
  console.log(
    JSON.stringify({
      id: c.id,
      occupation: c.occupation,
      formerAffiliation: c.formerAffiliation,
      csvFormer: row.former_occupations || "",
      csvOccupation: row.occupation || "",
    }),
  );
}
