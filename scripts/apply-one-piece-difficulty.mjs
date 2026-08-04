/**
 * Ajoute le champ difficulty à one-piece-anime.json et one-piece-manga.json.
 * Critère : notoriété / facilité à deviner (Worlddle), pas puissance.
 * Usage: node scripts/apply-one-piece-difficulty.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FILES = [
  path.join(ROOT, "data", "one-piece-anime.json"),
  path.join(ROOT, "data", "one-piece-manga.json"),
];

const DIFF_ORDER = ["Très facile", "Facile", "Moyen", "Difficile", "Impossible"];

/** Overrides explicites (id → difficulté). */
const EXPLICIT = {
  // Très facile — icônes absolues
  "monkey-d-luffy": "Très facile",
  "roronoa-zoro": "Très facile",
  nami: "Très facile",
  usopp: "Très facile",
  sanji: "Très facile",
  "tony-tony-chopper": "Très facile",
  "nico-robin": "Très facile",
  franky: "Très facile",
  brook: "Très facile",
  jinbe: "Très facile",
  shanks: "Très facile",
  "marshall-d-teach": "Très facile",
  "gol-d-roger": "Très facile",
  "portgas-d-ace": "Très facile",
  sabo: "Très facile",
  "boa-hancock": "Très facile",
  "dracule-mihawk": "Très facile",
  baggy: "Très facile",
  crocodile: "Très facile",
  "donquixote-doflamingo": "Très facile",
  "trafalgard-water-law": "Très facile",
  "eustass-kid": "Très facile",
  kaidou: "Très facile",
  "charlotte-linlin": "Très facile",
  "edward-newgate": "Très facile",
  "monkey-d-garp": "Très facile",
  "monkey-d-dragon": "Très facile",
  "silvers-rayleigh": "Très facile",
  "bartholomew-kuma": "Très facile",
  "jewelry-bonney": "Facile",
  "gecko-moria": "Très facile",
  enel: "Très facile",
  arlong: "Très facile",
  smoker: "Facile",
  tashigi: "Facile",
  koby: "Très facile",
  helmeppo: "Très facile",
  "nefertari-vivi": "Très facile",
  yamato: "Facile",
  "gerd": "Difficile",
  "trafalgar-d-water-law": "Très facile",
  "don-quichotte-doflamingo": "Très facile",

  // Facile — très connus
  "sakazuki": "Très facile",
  "kuzan": "Facile",
  "borsalino": "Facile",
  "issho": "Facile",
  "aramaki": "Facile",
  "sengoku": "Facile",
  "don-krieg": "Facile",
  kuro: "Facile",
  alvida: "Facile",
  wapol: "Facile",
  foxy: "Facile",
  bellamy: "Facile",
  hatchan: "Facile",
  perona: "Facile",
  "absalom": "Moyen",
  "hogback": "Difficile",
  "cesar-clown": "Facile",
  "caesar-clown": "Facile",
  sugar: "Facile",
  trebol: "Facile",
  diamante: "Facile",
  pica: "Facile",
  rebecca: "Facile",
  kyros: "Facile",
  viola: "Facile",
  king: "Facile",
  queen: "Facile",
  jack: "Facile",
  "charlotte-katakuri": "Très facile",
  "charlotte-smoothie": "Facile",
  "charlotte-cracker": "Facile",
  "charlotte-oven": "Facile",
  "charlotte-pudding": "Facile",
  "charlotte-perospero": "Facile",
  "charlotte-brulee": "Facile",
  "charlotte-chiffon": "Moyen",
  "charlotte-praline": "Difficile",
  "charlotte-flampe": "Impossible",
  "senor-pink": "Moyen",
  "van-augur": "Moyen",
  caribou: "Moyen",
  "nico-olvia": "Moyen",
  bellemere: "Moyen",
  masira: "Impossible",
  suleiman: "Impossible",
  gotti: "Difficile",
  "manmayer-gurou": "Impossible",
  "satchels-maffey": "Impossible",
  // Impossible review ↑ Facile
  "kozuki-oden": "Facile",
  "kozuki-momonosuke": "Facile",
  magellan: "Facile",
  "hody-jones": "Facile",
  "kurozumi-orochi": "Facile",
  kinemon: "Facile",
  // Impossible review ↑ Moyen
  inuarashi: "Moyen",
  nekomamushi: "Moyen",
  "shimotsuki-kuina": "Moyen",
  "vinsmoke-reiju": "Moyen",
  shiki: "Moyen",
  "jesus-burgess": "Moyen",
  kikunojo: "Moyen",
  denjiro: "Moyen",
  raizo: "Moyen",
  "kozuki-hiyori": "Moyen",
  "kurozumi-kanjuro": "Moyen",
  "kurozumi-tama": "Moyen",
  "riku-viola": "Moyen",
  "vinsmoke-ichiji": "Moyen",
  "vinsmoke-niji": "Moyen",
  "vinsmoke-yonji": "Moyen",
  monet: "Moyen",
  oars: "Moyen",
  iceburg: "Moyen",
  tom: "Moyen",
  hiluluk: "Moyen",
  kureha: "Moyen",
  shakuyaku: "Moyen",
  morgans: "Moyen",
  stussy: "Moyen",
  "saint-rosward-charlos": "Moyen",
  leo: "Moyen",
  "vander-decken-ix": "Moyen",
  aladdin: "Moyen",
  mansherry: "Moyen",
  "riku-doldo-iii": "Moyen",
  shinobu: "Moyen",
  // Impossible review ↑ Difficile
  laffitte: "Difficile",
  joz: "Difficile",
  wiper: "Difficile",
  jabra: "Difficile",
  fukuro: "Difficile",
  kumadori: "Difficile",
  gin: "Difficile",
  zala: "Difficile",
  drophy: "Difficile",
  gem: "Difficile",
  gladius: "Difficile",
  machvise: "Difficile",
  jora: "Difficile",
  hannyabal: "Difficile",
  kokoro: "Difficile",
  paulie: "Difficile",
  johnny: "Difficile",
  yosaku: "Difficile",
  chouchou: "Difficile",
  morge: "Difficile",
  kuroobi: "Difficile",
  octo: "Difficile",
  gedatsu: "Difficile",
  ohm: "Difficile",
  satori: "Difficile",
  shura: "Difficile",
  holdem: "Difficile",
  streusen: "Difficile",
  ideo: "Difficile",
  "blue-gilly": "Difficile",
  marguerite: "Difficile",
  shyarly: "Difficile",
  kawamatsu: "Difficile",
  gloriosa: "Difficile",
  pedro: "Facile",
  pekoms: "Facile",
  "capone-bege": "Facile",
  "basil-hawkins": "Facile",
  "x-drake": "Facile",
  "scratchmen-apoo": "Facile",
  killer: "Facile",
  "urouge": "Moyen",
  "rob-lucci": "Très facile",
  "kaku": "Facile",
  "kalifa": "Moyen",
  "blueno": "Moyen",
  "spandam": "Moyen",
  sentomaru: "Facile",
  stella: "Facile",
  "shaka": "Moyen",
  lilith: "Facile",
  "edison": "Difficile",
  "york": "Facile",
  "atlas": "Moyen",
  "pythagoras": "Difficile",
  "jaygarcia-saturn": "Facile",
  "figarland-garling": "Facile",
  "marcus-mars": "Moyen",
  "topman-warcury": "Moyen",
  "ethanbaron-v-nusjuro": "Moyen",
  "shepherd-ju-peter": "Moyen",
  imu: "Facile",
  loki: "Facile",
  harald: "Facile",
  gunko: "Facile",
  "figarland-shamrock": "Facile",
  "scopper-gaban": "Facile",
  "rocks-d-xebec": "Facile",
  "haguar-d-sauro": "Facile",
  dorry: "Facile",
  brogy: "Facile",
  "oimo": "Difficile",
  "kashii": "Difficile",
  hajrudin: "Facile",
  laboon: "Facile",
  "ben-beckman": "Facile",
  "ben-beckmann": "Facile",
  "lucky-roux": "Facile",
  yasopp: "Facile",
  makino: "Facile",
  "woop-slap": "Facile",
  higuma: "Facile",
  "curly-dadan": "Facile",
  "emporio-ivankov": "Facile",
  inazuma: "Facile",
  bentham: "Facile",
  "dazz-bones": "Facile",
  pell: "Facile",
  chaka: "Facile",
  "nefertari-cobra": "Facile",
  marco: "Facile",
  jozu: "Facile",
  "vista": "Moyen",
  thatch: "Facile",
  "izou": "Moyen",
  "otohime": "Moyen",
  neptune: "Facile",
  shirahoshi: "Facile",
  "fukaboshi": "Moyen",
  "fisher-tiger": "Facile",
  koala: "Facile",
  "hack": "Difficile",
  "karoo": "Moyen",
  "ginny": "Moyen",
  "doll": "Difficile",
  "emet": "Moyen",
  bepo: "Facile",
  carrot: "Facile",
  crocus: "Facile",
  "gaimon": "Difficile",
  "dalton": "Moyen",
  "conis": "Difficile",
  galdino: "Facile",
  "baby-5": "Moyen",
  "buffalo": "Moyen",
  "don-quichotte-rossinante": "Facile",
  "cabaji": "Difficile",
  "brannew": "Difficile",
  "momonga": "Difficile",
  "bastille": "Difficile",
  "nezumi": "Difficile",
  "tsuru": "Facile",
  "gan-forr": "Moyen",
  zeff: "Facile",
  "bartolomeo": "Facile",
  cavendish: "Facile",
  "little-oars-jr": "Moyen",
  "charlotte-daifuku": "Moyen",
  sasaki: "Moyen",
  ulti: "Moyen",
  "who-s-who": "Moyen",
  chinjao: "Facile",
  sai: "Difficile",
  "belo-betty": "Moyen",
  karasu: "Moyen",
  tamago: "Moyen",
  "gill-bastar": "Impossible",
};

const VERY_EASY_AFF = [/^équipage du chapeau de paille$/i];

/** Affiliations qui tirent vers Moyen (pas Facile) sauf override / haute prime. */
const MEDIUM_AFF = [
  /équipage de barbe (blanche|noire|brune)/i,
  /équipage de big mom/i,
  /équipage aux cent bêtes/i,
  /équipage des cent bêtes/i,
  /équipage du roux/i,
  /équipage de roger/i,
  /équipage de kid/i,
  /équipage du heart/i,
  /équipage de bonney/i,
  /équipage de foxy/i,
  /équipage d'arlong/i,
  /équipage du clown/i,
  /équipage du chat noir/i,
  /équipage de don krieg/i,
  /équipage de gecko moria/i,
  /équipage de caribou/i,
  /équipage des pirates du soleil/i,
  /équipage des pirates kuja/i,
  /équipage des pirates volants/i,
  /équipage des géants/i,
  /équipage des moines dépravés/i,
  /équipage du fire tank/i,
  /équipage du rumbar/i,
  /nouvel équipage des hommes-poissons/i,
  /don quichotte family/i,
  /baroque works/i,
  /thriller bark/i,
  /cross guild/i,
];

const FACILE_AFF = [
  /quatre empereurs/i,
  /sept grands corsaires/i,
  /shichibukai/i,
  /armée révolutionnaire/i,
  /chevaliers de dieu/i,
  /cinq sages/i,
  /^marine$/i,
  /^marines$/i,
];

const FACILE_HINT = [
  /\b(yonko|empereur|amiral|shichibukai|corsaire|supernova|calamité|sweet commander|tobiroppo|gorosei)\b/i,
];

function normalizeAff(s) {
  return String(s || "").trim();
}

function guessDifficulty(c) {
  if (EXPLICIT[c.id]) return EXPLICIT[c.id];

  const aff = normalizeAff(c.affiliation);
  const sub = (c.sub_affiliation || []).join(" ");
  const name = `${c.name} ${(c.aliases || []).join(" ")}`;
  const hint = `${c.hint1 || ""} ${c.hint2 || ""} ${c.hint3 || ""}`;
  const bounty = Number(c.bounty) || 0;

  for (const re of VERY_EASY_AFF) {
    if (re.test(aff)) return "Très facile";
  }

  // Figures clés Marine / Gov / Empereurs (pas tous les matelots)
  if (FACILE_AFF.some((re) => re.test(aff))) {
    if (bounty >= 500_000_000 || FACILE_HINT.some((re) => re.test(hint) || re.test(name))) {
      return "Facile";
    }
    if (bounty >= 100_000_000) return "Moyen";
    return "Difficile";
  }

  if (FACILE_HINT.some((re) => re.test(hint) || re.test(name))) {
    return bounty >= 200_000_000 ? "Facile" : "Moyen";
  }

  if (bounty >= 1_500_000_000) return "Facile";
  if (bounty >= 500_000_000) return "Moyen";

  const inMediumCrew = MEDIUM_AFF.some((re) => re.test(aff) || re.test(sub));
  if (inMediumCrew) {
    if (bounty >= 300_000_000) return "Moyen";
    if (bounty >= 50_000_000) return "Difficile";
    return "Impossible";
  }

  const arc = String(c.arc || "");
  if (/^Elbaph$/i.test(arc) || /^Egghead$/i.test(arc)) {
    if (bounty >= 200_000_000) return "Moyen";
    if (bounty >= 1) return "Difficile";
    return "Impossible";
  }

  if (
    /Romance Dawn|Orange Town|Syrup|Baratie|Arlong|Logue|Reverse|Whisky|Whiskey|Little Garden|Drum|Royaume de Drum/i.test(
      arc,
    )
  ) {
    if (bounty >= 30_000_000) return "Moyen";
    if (bounty >= 1) return "Difficile";
    return "Impossible";
  }

  if (
    /Alabasta|Arabasta|Skypiea|Water Seven|Enies Lobby|Thriller Bark|Sabaody|Amazon Lily|Impel Down|Marineford|Fishman|Hommes-Poissons|Punk Hazard|Dressrosa|Zou|Whole Cake|Wano|Pays des Wa|Jaya/i.test(
      arc,
    )
  ) {
    if (bounty >= 200_000_000) return "Moyen";
    if (bounty >= 20_000_000) return "Difficile";
    return "Impossible";
  }

  if (bounty >= 100_000_000) return "Difficile";
  return "Impossible";
}

function ensureFieldMapping(data) {
  if (data.fieldMapping.difficulty) {
    data.fieldMapping.difficulty.order = [...DIFF_ORDER];
    data.fieldMapping.difficulty.fonction = "Comparaison";
    data.fieldMapping.difficulty.header = "Difficulté";
    return;
  }
  // Insérer après arc si présent, sinon avant hints
  const entries = Object.entries(data.fieldMapping);
  const difficultyEntry = [
    "difficulty",
    {
      header: "Difficulté",
      fonction: "Comparaison",
      columnWidth: "small",
      order: [...DIFF_ORDER],
      description:
        "Facilité à deviner le personnage (notoriété). Ordre : Très facile → Facile → Moyen → Difficile → Impossible.",
    },
  ];
  const arcIdx = entries.findIndex(([k]) => k === "arc");
  if (arcIdx >= 0) {
    entries.splice(arcIdx + 1, 0, difficultyEntry);
  } else {
    const hintIdx = entries.findIndex(([k]) => k.startsWith("hint"));
    if (hintIdx >= 0) entries.splice(hintIdx, 0, difficultyEntry);
    else entries.push(difficultyEntry);
  }
  data.fieldMapping = Object.fromEntries(entries);
}

function applyFile(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  ensureFieldMapping(data);

  const counts = Object.fromEntries(DIFF_ORDER.map((d) => [d, 0]));
  for (const c of data.characters) {
    const d = guessDifficulty(c);
    c.difficulty = d;
    counts[d]++;
  }

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`${path.basename(filePath)}: ${data.characters.length} persos`, counts);
}

for (const f of FILES) applyFile(f);
