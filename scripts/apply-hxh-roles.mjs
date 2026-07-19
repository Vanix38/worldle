/**
 * Ajoute le champ role à hunterxhunter.json (fieldMapping + chaque personnage).
 * Usage: node scripts/apply-hxh-roles.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");

const ROLE_ORDER = [
  "Protagoniste",
  "Deuteragoniste",
  "Tritagoniste",
  "Antagoniste Majeur",
  "Antagoniste Secondaire",
  "Fonctionnel",
];

/** Rôles narratifs (4 protagonistes + deut/trit + antagonistes + figurants). */
const ROLES = {
  // Protagonistes
  "gon-freecss": "Protagoniste",
  "kirua-zoldik": "Protagoniste",
  "kurapika": "Protagoniste",
  "leolio-paradinaito": "Protagoniste",

  // Deuteragonistes
  "hisoka-morow": "Deuteragoniste",
  "isaac-netero": "Deuteragoniste",
  "komugi": "Deuteragoniste",
  "kaito": "Deuteragoniste",
  "silva-zoldik": "Deuteragoniste",
  "wing": "Deuteragoniste",
  "biscuit-kruger": "Deuteragoniste",
  "knuckle-bine": "Deuteragoniste",
  "shoot-macmahon": "Deuteragoniste",
  "morau-mccarnathy": "Deuteragoniste",
  "neon-nostrad": "Deuteragoniste",
  "aruka-zoldik": "Deuteragoniste",

  // Tritagonistes (protagoniste tertiaire)
  "ging-freecss": "Tritagoniste",
  "zeno-zoldik": "Tritagoniste",
  "ikarugo": "Tritagoniste",
  "koruto": "Tritagoniste",
  "koala": "Tritagoniste",
  "menchi": "Tritagoniste",
  "satotsu": "Tritagoniste",
  "hanzo": "Tritagoniste",
  "ponzu": "Tritagoniste",
  "pokkuru": "Tritagoniste",
  "senritsu": "Tritagoniste",
  "todo": "Tritagoniste",
  "meleolon": "Tritagoniste",
  "mizaisutomu-nana": "Tritagoniste",
  "mizuken": "Tritagoniste",
  "gashita-bellam": "Tritagoniste",
  "tsubone": "Tritagoniste",
  "kanaria": "Tritagoniste",
  "kikyo-zoldik": "Tritagoniste",
  "rist": "Tritagoniste",
  "werefin": "Tritagoniste",
  "novu": "Tritagoniste",
  "pamu-shiberia": "Tritagoniste",

  // Antagonistes majeurs
  "parisuton-hill": "Antagoniste Majeur",
  "kuroro-lucifer": "Antagoniste Majeur",
  "meruem": "Antagoniste Majeur",
  "neferupito": "Antagoniste Majeur",
  "shaupfufu": "Antagoniste Majeur",
  "montutyupi": "Antagoniste Majeur",
  "uvoguine": "Antagoniste Majeur",
  "reine-fourmis-chimere": "Antagoniste Majeur",
  "zazan": "Antagoniste Majeur",
  "leoru": "Antagoniste Majeur",
  "binolt": "Antagoniste Majeur",

  // Antagonistes secondaires
  "kastro": "Antagoniste Secondaire",
  "burovuta": "Antagoniste Secondaire",
  "sadaso": "Antagoniste Secondaire",
  "miruki-zoldik": "Antagoniste Secondaire",
  "karuto-zoldik": "Antagoniste Secondaire",
  "sharnalk": "Antagoniste Secondaire",
  "irumi-zoldik": "Antagoniste Secondaire",
  "feitan-portor": "Antagoniste Secondaire",
  "phinks-magkav": "Antagoniste Secondaire",
  "nobunaga-hazama": "Antagoniste Secondaire",
  "pakunoda": "Antagoniste Secondaire",
  "korutopi-tonofumeiru": "Antagoniste Secondaire",
  "franklin-bordeaux": "Antagoniste Secondaire",
  "shizuku-murasaki": "Antagoniste Secondaire",
  "piyon": "Antagoniste Secondaire",
  "frere-oroso": "Antagoniste Secondaire",
  "soeur-oroso": "Antagoniste Secondaire",
  "pegui": "Antagoniste Secondaire",
  "ramotto": "Antagoniste Secondaire",
  "furatta": "Antagoniste Secondaire",
  "djido": "Antagoniste Secondaire",
  "bushidora-ambitious": "Antagoniste Secondaire",
  "fukuro": "Antagoniste Secondaire",
  "gereta": "Antagoniste Secondaire",
  "yabibi": "Antagoniste Secondaire",
  "capitaine": "Antagoniste Secondaire",
  "rippo": "Antagoniste Secondaire",
  "rataza": "Antagoniste Secondaire",

  // Fonctionnel (figurants, candidats, seconds rôles)
  agon: "Fonctionnel",
  amana: "Fonctionnel",
  amane: "Fonctionnel",
  asuta: "Fonctionnel",
  "banana-kavaro": "Fonctionnel",
  bara: "Fonctionnel",
  beans: "Fonctionnel",
  bodoro: "Fonctionnel",
  "bonorenof-ndongo": "Fonctionnel",
  buhara: "Fonctionnel",
  "coco-chan": "Fonctionnel",
  darzolne: "Fonctionnel",
  eather: "Fonctionnel",
  elisa: "Fonctionnel",
  geru: "Fonctionnel",
  goto: "Fonctionnel",
  gozu: "Fonctionnel",
  kara: "Fonctionnel",
  kyu: "Fonctionnel",
  sedokan: "Fonctionnel",
  "spinna-cro": "Fonctionnel",
  "saccimonno-tocinno": "Fonctionnel",
  "podongo-lapoy": "Fonctionnel",
  mike: "Fonctionnel",
  hina: "Fonctionnel",
  "mito-freecss": "Fonctionnel",
  mimizu: "Fonctionnel",
  sabu: "Fonctionnel",
  "saccho-kobayakawa": "Fonctionnel",
  somi: "Fonctionnel",
  togari: "Fonctionnel",
  tompa: "Fonctionnel",
  "yama-arashi": "Fonctionnel",
  zebulo: "Fonctionnel",
  zepairu: "Fonctionnel",
  zushi: "Fonctionnel",
};

const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
const missing = [];

for (const c of data.characters) {
  const role = ROLES[c.id];
  if (!role) {
    missing.push(c.id);
    c.role = "Fonctionnel";
  } else {
    c.role = role;
  }
}

if (missing.length) {
  console.warn("IDs sans mapping explicite → Fonctionnel:", missing);
}

data.fieldMapping = data.fieldMapping || {};
data.fieldMapping.role = {
  header: "Rôle",
  fonction: "Classique",
  columnWidth: "small",
  order: ROLE_ORDER,
  description:
    "Importance narrative : Protagoniste, Deuteragoniste, Tritagoniste, Antagoniste Majeur, Antagoniste Secondaire, Fonctionnel.",
};

const keys = Object.keys(data.fieldMapping);
const n = data.characters.length;
const rates = {};
for (const key of keys) {
  let count = 0;
  for (const ch of data.characters) {
    const v = ch[key];
    if (v != null && (typeof v !== "string" || v.trim() !== "") && (!Array.isArray(v) || v.length))
      count++;
  }
  rates[key] = count / n;
}
data.fieldPrevalence = Object.fromEntries(Object.entries(rates).sort((a, b) => b[1] - a[1]));

fs.writeFileSync(OUT, JSON.stringify(data, null, 2), "utf8");

const counts = {};
for (const r of ROLE_ORDER) counts[r] = 0;
for (const c of data.characters) counts[c.role] = (counts[c.role] || 0) + 1;

console.log("Wrote", OUT);
console.log("Persos:", n);
console.log("Répartition role:", counts);
