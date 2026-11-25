/**
 * One Piece : colonnes « Fruit du démon » et « Saga », indice 2, titres en alias.
 *
 * - devilFruit (Multivalue, à côté du type) : nom du fruit, repris de l'ancien
 *   hint2 (corrigé d'après le wiki FR pour les valeurs qui n'étaient pas un nom).
 *   [] = pas de fruit ; « ? » = fruit dont le nom n'a pas été révélé.
 * - hint2 : pour les utilisateurs d'un fruit, le pouvoir en français (plus vague
 *   que le nom, d'après le champ « signifiant » du wiki FR) ; inchangé sinon.
 * - saga : déduite de l'arc de première apparition (groupes de fieldMapping.arc.order).
 * - aliases : épithètes / titres du wiki (FR + EN), voir scripts/one-piece-wiki-titles.json.
 *
 * Usage : node scripts/apply-one-piece-columns.mjs && npm run one-piece:build
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");
const TITLES = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts", "one-piece-wiki-titles.json"), "utf8"));

/** Noms corrigés (l'ancien hint2 contenait le type, un surnom ou un placeholder). */
const FRUIT_FIX = {
  "gecko-moria": ["Kage Kage no Mi"],
  "kurozumi-orochi": ["Hebi Hebi no Mi modèle Yamata no Orochi"],
  "yamato": ["Inu Inu no Mi modèle Okuchi no Makami"],
  "figarland-shamrock": ["?"],
  "urouge": ["?"],
  "imu": ["?"],
  "holdem": ["SMILE"],
  "killer": ["SMILE"],
  "speed": ["SMILE"],
  "marshall-d-teach": ["Yami Yami no Mi", "Gura Gura no Mi"],
  "loki": { $manga: ["Ryu Ryu no Mi modèle Nidhöggr"], $anime: [] },
};

/** Indice 2 pour les utilisateurs d'un fruit : ce que fait le fruit. */
const POWER = {
  "absalom": "Invisibilité", "alber": "Ptéranodon", "alvida": "Peau glissante", "avalo-pizarro": "Île",
  "baby-5": "Armes", "baggy": "Fragmentation", "bartholomew-kuma": "Coussinets (repousser)",
  "bartolomeo": "Barrière", "basil-hawkins": "Paille", "bellamy": "Ressort", "belo-betty": "Encouragement",
  "bentham": "Imitation", "biblo": "Élevage", "black-maria": "Araignée", "blueno": "Portes",
  "boa-hancock": "Amour (pétrification)", "boa-marigold": "Cobra royal", "boa-sandersonia": "Anaconda",
  "borsalino": "Lumière", "brook": "Résurrection", "buffalo": "Rotation", "capone-bege": "Château",
  "caribou": "Marais", "catarina-devon": "Renard à neuf queues", "cesar-clown": "Gaz",
  "charlotte-brulee": "Miroirs", "charlotte-cracker": "Biscuits", "charlotte-daifuku": "Génie de la lampe",
  "charlotte-katakuri": "Mochi", "charlotte-linlin": "Âmes", "charlotte-mont-d-or": "Livres",
  "charlotte-oven": "Chaleur", "charlotte-perospero": "Bonbons", "charlotte-pudding": "Souvenirs",
  "charlotte-smoothie": "Essorage", "crocodile": "Sable", "dalton": "Bison", "diamante": "Ondulation",
  "doc-q": "Maladie", "don-quichotte-doflamingo": "Fils", "don-quichotte-rossinante": "Silence",
  "drophy": "Taupe", "edward-newgate": "Séismes", "emporio-ivankov": "Hormones", "enel": "Foudre",
  "gecko-moria": "Ombres", "ethanbaron-v-nusjuro": "Cheval squelette", "eustass-kid": "Magnétisme",
  "figarland-shamrock": "Cerbère", "foxy": "Lenteur", "galdino": "Cire", "ganzui": "Explosions",
  "gem": "Explosions", "gill-bastar": "Fantômes", "gladius": "Éclatement", "gunko": "Flèches",
  "hina": "Cages", "holdem": "Lion (SMILE)", "imu": "Inconnu", "inazuma": "Ciseaux", "issho": "Gravité",
  "jabra": "Loup", "jack": "Mammouth", "jaygarcia-saturn": "Gyuki", "jesus-burgess": "Force",
  "jewelry-bonney": "Âge", "captain-john": "Magnétisme", "jora": "Art", "joz": "Diamant",
  "kaidou": "Dragon azur", "kaku": "Girafe", "kalifa": "Bulles", "karasu": "Suie",
  "killer": "Rire (SMILE)", "kinemon": "Vêtements", "kozuki-momonosuke": "Dragon (artificiel)",
  "kurozumi-kanjuro": "Pinceau", "kurozumi-orochi": "Serpent à huit têtes", "kurozumi-tama": "Domptage (kibi dango)",
  "kuzan": "Glace", "leo": "Couture", "loki": { $manga: "Dragon Nidhöggr" }, "machvise": "Tonnes",
  "magellan": "Poison", "mansherry": "Guérison", "marco": "Phénix", "marcus-mars": "Itsumade (oiseau)",
  "marshall-d-teach": "Ténèbres et séismes", "mikita": "Poids", "monet": "Neige",
  "monkey-d-luffy": "Caoutchouc", "morgans": "Albatros", "nico-robin": "Éclosion",
  "page-one": "Spinosaure", "pell": "Faucon", "perona": "Fantômes", "pica": "Pierre",
  "portgas-d-ace": "Feu", "ragnir": "Écureuil Ratatosk", "raizo": "Parchemins",
  "riku-viola": "Regard (lire les pensées)", "rimoshifu-killingham": "Kirin", "rob-lucci": "Léopard",
  "sabo": "Feu", "sakazuki": "Magma", "sanjuan-wolf": "Gigantisme", "sasaki": "Tricératops",
  "scratchmen-apoo": "Son", "sengoku": "Bouddha", "senor-pink": "Nage", "shepherd-ju-peter": "Ver géant",
  "shepherd-sommers": "Épines", "shiki": "Lévitation", "shinobu": "Maturation", "smoker": "Fumée",
  "speed": "Cheval (SMILE)", "stella": "Cerveau", "streusen": "Cuisine", "stussy": "Chauve-souris",
  "sugar": "Jouets", "tamago": "Œuf", "tony-tony-chopper": "Humain", "topman-warcury": "Sanglier",
  "trafalgar-d-water-law": "Opération", "trebol": "Glu", "tsuru": "Lessive",
  "ulti": "Pachycéphalosaure", "urouge": "Inconnu", "van-augur": "Téléportation",
  "vander-decken-ix": "Cible", "vasco-shot": "Alcool", "wapol": "Dévoration",
  "who-s-who": "Tigre à dents de sabre", "x-drake": "Allosaure", "yamato": "Loup divin", "zala": "Épines",
};

const isSplit = (v) => v !== null && typeof v === "object" && !Array.isArray(v) &&
  Object.keys(v).length > 0 && Object.keys(v).every((k) => k === "$manga" || k === "$anime");
const VERSIONS = ["manga", "anime"];
const valueFor = (v, version) => (isSplit(v) ? v[`$${version}`] : v);
const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const sameJSON = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Valeur par version → valeur simple si identique, sinon { $manga, $anime }. */
function joinVersions(c, byVersion) {
  const vs = c.versions.filter((v) => byVersion[v] !== undefined);
  if (vs.length && vs.every((v) => sameJSON(byVersion[v], byVersion[vs[0]]))) return byVersion[vs[0]];
  return Object.fromEntries(vs.map((v) => [`$${v}`, byVersion[v]]));
}

const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const known = new Set(src.characters.map((c) => c.id));
for (const id of [...Object.keys(POWER), ...Object.keys(FRUIT_FIX), ...Object.keys(TITLES)])
  if (!known.has(id)) throw new Error(`id inconnu : ${id}`);

// Saga = groupe de l'arc dans fieldMapping.arc.order (« Saga East Blue » → « East Blue »).
const sagaOfArc = {};
for (const version of VERSIONS) {
  const order = valueFor(src.fieldMapping.arc, version).order;
  for (const [saga, arcs] of Object.entries(order)) for (const arc of arcs) sagaOfArc[arc] = saga.replace(/^Saga /, "");
}
const sagaOrder = Object.keys(valueFor(src.fieldMapping.arc, "manga").order).map((s) => s.replace(/^Saga /, ""));

const fm = {};
for (const [k, v] of Object.entries(src.fieldMapping)) {
  if (k === "devilFruit" || k === "saga") continue;
  if (k === "arc") fm.saga = {
    header: "Saga",
    fonction: "Comparaison",
    order: sagaOrder,
    description: "Saga de la première apparition (déduite de l'arc) ; la flèche indique si la saga du perso mystère est avant ou après.",
  };
  fm[k] = v;
  if (k === "devilFruitType") fm.devilFruit = {
    header: "Fruit du démon",
    fonction: "Multivalue",
    description: "Nom du fruit du démon (ex. Gomu Gomu no Mi) ; vide si pas de fruit, « ? » si le nom n'a pas été révélé. Barbe Noire a deux fruits : un fruit en commun = orange.",
  };
}
src.fieldMapping = fm;

let titles = 0;
src.characters = src.characters.map((c) => {
  const fruitBy = {}, hintBy = {}, sagaBy = {}, aliasBy = {};
  for (const version of c.versions) {
    const type = valueFor(c.devilFruitType, version);
    const fix = FRUIT_FIX[c.id];
    const hint2 = valueFor(c.hint2, version);
    if (!type) fruitBy[version] = [];
    else if (fix) fruitBy[version] = valueFor(fix, version);
    else fruitBy[version] = String(hint2).split(" / ").map((s) => s.trim());
    const power = valueFor(POWER[c.id], version);
    hintBy[version] = type && power ? power : hint2;
    sagaBy[version] = sagaOfArc[valueFor(c.arc, version)];
    const aliases = [...(valueFor(c.aliases, version) ?? [])];
    const seen = new Set([norm(valueFor(c.name, version)), ...aliases.map(norm)]);
    for (const t of TITLES[c.id] ?? []) {
      if (seen.has(norm(t))) continue;
      seen.add(norm(t));
      aliases.push(t);
      if (version === c.versions[0]) titles++;
    }
    aliasBy[version] = aliases;
  }
  const out = {};
  for (const [k, v] of Object.entries(c)) {
    if (k === "devilFruit" || k === "saga") continue;
    if (k === "hint2") { out.hint2 = joinVersions(c, hintBy); continue; }
    if (k === "aliases") { out.aliases = joinVersions(c, aliasBy); continue; }
    out[k] = v;
    if (k === "devilFruitType") out.devilFruit = joinVersions(c, fruitBy);
    if (k === "arc") out.saga = joinVersions(c, sagaBy);
  }
  return out;
});

fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + "\n");
console.log(`Fruits, saga et indice 2 écrits ; ${titles} titres ajoutés aux alias.`);
