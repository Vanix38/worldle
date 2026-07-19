/**
 * Ajoute le champ difficulte à hunterxhunter.json.
 * Usage: node scripts/apply-hxh-difficulte.mjs
 *
 * Critère : notoriété / facilité à deviner (Worldle), pas puissance.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "hunterxhunter.json");

const DIFF_ORDER = ["Très facile", "Facile", "Moyen", "Difficile", "Impossible"];

const DIFFICULTE = {
  // Très facile
  "ging-freecss": "Très facile",
  "gon-freecss": "Très facile",
  "hisoka-morow": "Très facile",
  "irumi-zoldik": "Très facile",
  "isaac-netero": "Très facile",
  "kaito": "Très facile",
  "kirua-zoldik": "Très facile",
  "kurapika": "Très facile",
  "kuroro-lucifer": "Très facile",
  "leolio-paradinaito": "Très facile",
  "meruem": "Très facile",
  "neferupito": "Très facile",

  // Facile
  "aruka-zoldik": "Facile",
  "beans": "Facile",
  "biscuit-kruger": "Facile",
  "feitan-portor": "Facile",
  "hanzo": "Facile",
  "ikarugo": "Facile",
  "kikyo-zoldik": "Facile",
  "knuckle-bine": "Facile",
  "koala": "Facile",
  "komugi": "Facile",
  "koruto": "Facile",
  "maha-zoldik": "Facile",
  "meleolon": "Facile",
  "miruki-zoldik": "Facile",
  "mito-freecss": "Facile",
  "montutyupi": "Facile",
  "morau-mccarnathy": "Facile",
  "neon-nostrad": "Facile",
  "nobunaga-hazama": "Facile",
  "novu": "Facile",
  "pairo": "Facile",
  "pakunoda": "Facile",
  "pamu-shiberia": "Facile",
  "parisuton-hill": "Facile",
  "phinks-magkav": "Facile",
  "reine-fourmis-chimere": "Facile",
  "senritsu": "Facile",
  "sharnalk": "Facile",
  "shaupfufu": "Facile",
  "shizuku-murasaki": "Facile",
  "silva-zoldik": "Facile",
  "tompa": "Facile",
  "uvoguine": "Facile",
  "wing": "Facile",
  "zeno-zoldik": "Facile",

  // Moyen
  "abengane": "Moyen",
  "amori": "Moyen",
  "binolt": "Moyen",
  "bodoro": "Moyen",
  "buhara": "Moyen",
  "cherry": "Moyen",
  "cocco": "Moyen",
  "franklin-bordeaux": "Moyen",
  "frere-oroso": "Moyen",
  "furatta": "Moyen",
  "geru": "Moyen",
  "goto": "Moyen",
  "haruna": "Moyen",
  "kanaria": "Moyen",
  "karuto-zoldik": "Moyen",
  "kastro": "Moyen",
  "korutopi-tonofumeiru": "Moyen",
  "leoru": "Moyen",
  "menchi": "Moyen",
  "mike": "Moyen",
  "mizaisutomu-nana": "Moyen",
  "pegui": "Moyen",
  "piedro": "Moyen",
  "piyon": "Moyen",
  "pokkuru": "Moyen",
  "ponzu": "Moyen",
  "ramotto": "Moyen",
  "reina": "Moyen",
  "saccho-kobayakawa": "Moyen",
  "satotsu": "Moyen",
  "shidore": "Moyen",
  "shoot-macmahon": "Moyen",
  "soeur-oroso": "Moyen",
  "todo": "Moyen",
  "tsubone": "Moyen",
  "zazan": "Moyen",
  "zebulo": "Moyen",
  "zushi": "Moyen",

  // Difficile
  "abe-freecss": "Difficile",
  "amane": "Difficile",
  "assassin-a": "Difficile",
  "banana-kavaro": "Difficile",
  "barbon": "Difficile",
  "bonorenof-ndongo": "Difficile",
  "burovuta": "Difficile",
  "bushidora-ambitious": "Difficile",
  "capitaine": "Difficile",
  "darzolne": "Difficile",
  "djido": "Difficile",
  "eather": "Difficile",
  "elena": "Difficile",
  "fukuro": "Difficile",
  "gashita-bellam": "Difficile",
  "gereta": "Difficile",
  "gozu": "Difficile",
  "grand-mere-galaxy": "Difficile",
  "hina": "Difficile",
  "imori": "Difficile",
  "kasuga": "Difficile",
  "koruko": "Difficile",
  "mitsuba": "Difficile",
  "mizuken": "Difficile",
  "noko": "Difficile",
  "podongo-lapoy": "Difficile",
  "rippo": "Difficile",
  "rist": "Difficile",
  "sadaso": "Difficile",
  "sedokan": "Difficile",
  "spinna-cro": "Difficile",
  "togari": "Difficile",
  "umori": "Difficile",
  "werefin": "Difficile",
  "won": "Difficile",

  // Impossible
  "agent-de-l-association-hunter": "Impossible",
  "agon": "Impossible",
  "amana": "Impossible",
  "amour-de-battera": "Impossible",
  "asuta": "Impossible",
  "bara": "Impossible",
  "bennie-doron": "Impossible",
  "boki": "Impossible",
  "coco-chan": "Impossible",
  "commissaire-priseur": "Impossible",
  "crapaud": "Impossible",
  "elisa": "Impossible",
  "fumi": "Impossible",
  "gorille": "Impossible",
  "hisaku": "Impossible",
  "interprete-de-ngl": "Impossible",
  "isaku": "Impossible",
  "iwalenkov": "Impossible",
  "jeitosari": "Impossible",
  "jito": "Impossible",
  "kara": "Impossible",
  "kenmi": "Impossible",
  "kenzaki": "Impossible",
  "kimera-ant-chauve-souris": "Impossible",
  "kimera-ant-moustique": "Impossible",
  "kyu": "Impossible",
  "maenore": "Impossible",
  "masuta": "Impossible",
  "meneuse-des-danseuses-de-goruto-est": "Impossible",
  "mikuri": "Impossible",
  "mimizu": "Impossible",
  "muuna": "Impossible",
  "oroso": "Impossible",
  "pekuba": "Impossible",
  "poorhatto": "Impossible",
  "rataza": "Impossible",
  "redwood": "Impossible",
  "rhino": "Impossible",
  "rover": "Impossible",
  "sabazushi": "Impossible",
  "sabu": "Impossible",
  "saccimonno-tocinno": "Impossible",
  "sarah": "Impossible",
  "shishito": "Impossible",
  "somi": "Impossible",
  "spot": "Impossible",
  "supar": "Impossible",
  "taragette": "Impossible",
  "yabibi": "Impossible",
  "yama-arashi": "Impossible",
  "zepairu": "Impossible",

};



const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
const missing = [];

for (const c of data.characters) {
  const d = DIFFICULTE[c.id];
  if (!d) {
    missing.push(c.id);
    c.difficulte = "Moyen";
  } else {
    c.difficulte = d;
  }
}

if (missing.length) {
  console.warn("IDs sans mapping → Moyen:", missing);
}

data.fieldMapping = data.fieldMapping || {};
data.fieldMapping.difficulte = {
  header: "Difficulté",
  fonction: "Comparaison",
  columnWidth: "small",
  order: DIFF_ORDER,
  description:
    "Facilité à deviner le personnage (notoriété). Ordre : Très facile → Facile → Moyen → Difficile → Impossible.",
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
for (const r of DIFF_ORDER) counts[r] = 0;
for (const c of data.characters) counts[c.difficulte] = (counts[c.difficulte] || 0) + 1;

console.log("Wrote", OUT);
console.log("Persos:", n);
console.log("Répartition difficulte:", counts);
