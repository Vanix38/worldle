/**
 * Remplit le champ `status` de sources/one-piece.json (Vivant / Décédé / Inconnu)
 * d'après l'infobox du wiki One Piece Fandom (relevé du 2026-11-25).
 *
 * Statut sans spoiler : quand le statut change au cours de l'histoire, `status`
 * est une chronologie [{ value }, { value, from: { $manga: "Chapitre N", $anime: "Épisode N" } }, …].
 * Le jeu affiche la dernière valeur dont le chapitre / l'épisode a été vu
 * (voir lib/value-timeline.ts). `from` = moment où le lecteur l'apprend.
 * Un changement sans épisode ($anime absent) n'existe pas encore dans l'anime.
 *
 * Usage : node scripts/apply-one-piece-status.mjs && npm run one-piece:build
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(ROOT, "sources", "one-piece.json");

const V = "Vivant", D = "Décédé", I = "Inconnu";

/** Statut final (wiki) pour les persos qui ne sont pas « Vivant ». */
const FINAL = {
  D: ["absalom", "bellemere", "candelle", "carmel", "clou-d-clover", "donquixote-mjosgard",
    "don-quichotte-rossinante", "douzan", "estrid", "eris", "fisher-tiger", "ganzui", "ginny",
    "gill-bastar", "hiluluk", "higuma", "ida", "captain-john", "kurozumi-orochi", "magnolia",
    "marlon", "monet", "mont-blanc-noland", "nefertari-cobra", "nico-olvia", "oars", "polo-gram",
    "porchemy", "reuven", "shimotsuki-kouzaburou", "shimotsuki-kuina", "t-bone", "stella", "tom",
    "victoria-cindry", "yorle", "edward-newgate", "gol-d-roger", "harald", "guernika", "izou",
    "jaygarcia-saturn", "kalgara", "kozuki-oden", "kurozumi-kanjuro", "otohime", "pedro",
    "portgas-d-ace", "rocks-d-xebec", "tritoma", "vergo"],
  I: ["barbel", "baskerville", "bartolomeo", "bluejam", "chocolat", "emet", "fukurokuju", "kyo",
    "louis-arnote", "little-oars-jr", "moulon", "napoleon", "mounblutain", "nero", "ochoku",
    "prometheus", "sarquiss", "sheep-s-head", "zaza", "yeti-cool-brothers", "basil-hawkins",
    "charlotte-linlin", "eustass-kid", "kaidou", "killer", "ohm", "pekoms", "satchels-maffey",
    "satori", "shura", "stussy",
    // Prince d'Esperia (ch. 1183), pas de page wiki : statut non confirmé.
    "luven"],
};

const at = (value, chap, ep) => ({
  value,
  from: ep ? { $manga: `Chapitre ${chap}`, $anime: `Épisode ${ep}` } : { $manga: `Chapitre ${chap}` },
});

/**
 * Changements de statut après la première apparition (chapitre / épisode d'après
 * les références du wiki). Les morts déjà connues à la première apparition
 * (Roger, Oden, flash-backs…) restent un statut simple.
 */
const TIMELINES = {
  "absalom": [at(D, 925, 917)],
  "carmel": [at(D, 868, 838)],
  "clou-d-clover": [at(D, 398, 278)],
  "nico-olvia": [at(D, 398, 278)],
  "donquixote-mjosgard": [at(D, 1086, 1120)],
  "don-quichotte-rossinante": [at(D, 767, 706)],
  "ginny": [at(D, 1098, 1132)],
  "hiluluk": [at(D, 145, 86)],
  // Décapité par Kaidou, survit grâce à son fruit, meurt brûlé.
  "kurozumi-orochi": [at(D, 985, 994), at(V, 1026, 1051), at(D, 1057, 1085)],
  "monet": [at(D, 694, 620)],
  // Le meurtre de Cobra est annoncé (Sabo accusé) au ch. 1054.
  "nefertari-cobra": [at(D, 1054, 1081)],
  "porchemy": [at(D, 584, 495)],
  "t-bone": [at(D, 1082, 1116)],
  "stella": [at(D, 1114, 1148)],
  "yorle": [at(D, 1136)],
  "edward-newgate": [at(D, 576, 485)],
  "guernika": [at(D, 1043, 1070)],
  "izou": [at(D, 1041, 1068)],
  "jaygarcia-saturn": [at(D, 1125, 1155)],
  "kurozumi-kanjuro": [at(D, 1030, 1055)],
  "pedro": [at(D, 878, 850)],
  "portgas-d-ace": [at(D, 574, 483)],
  "vergo": [at(D, 698, 624)],
  "fisher-tiger": [at(D, 609, 528)],
  "marlon": [at(D, 1159)],
  "reuven": [at(D, 1185)],
  // Inconnu : sort laissé en suspens à partir de ce chapitre.
  "bartolomeo": [at(I, 1126, 1156)],
  "bluejam": [at(I, 588, 503)],
  "chocolat": [at(I, 603, 523)],
  "mounblutain": [at(I, 603, 523)],
  "little-oars-jr": [at(I, 580, 489)],
  "yeti-cool-brothers": [at(I, 667, 593)],
  "basil-hawkins": [at(I, 1052, 1079)],
  "charlotte-linlin": [at(I, 1040, 1067)],
  "napoleon": [at(I, 1040, 1067)],
  "prometheus": [at(I, 1040, 1067)],
  "kaidou": [at(I, 1049, 1076)],
  "eustass-kid": [at(I, 1079, 1112)],
  "killer": [at(I, 1079, 1112)],
  "pekoms": [at(I, 897, 872)],
  "stussy": [at(I, 1112, 1146)],
  "satori": [at(I, 300, 193)],
  "shura": [at(I, 300, 193)],
  "ohm": [at(I, 300, 193)],
  // Vivants aujourd'hui, mais crus morts un temps.
  "sabo": [at(D, 588, 503), at(V, 731, 663)],
  "pell": [at(D, 208, 125), at(V, 217, 130)],
};

const final = new Map();
for (const [k, ids] of Object.entries(FINAL)) for (const id of ids) final.set(id, k === "D" ? D : I);

const src = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const known = new Set(src.characters.map((c) => c.id));
for (const id of [...final.keys(), ...Object.keys(TIMELINES)])
  if (!known.has(id)) throw new Error(`id inconnu : ${id}`);

src.characters = src.characters.map((c) => {
  const end = final.get(c.id) ?? V;
  const steps = TIMELINES[c.id];
  let status = end;
  if (steps) {
    if (steps[steps.length - 1].value !== end) throw new Error(`${c.id} : la chronologie ne finit pas sur ${end}`);
    status = [{ value: V }, ...steps];
  }
  // Insère status juste après gender (ordre des colonnes de la source).
  const out = {};
  for (const [k, v] of Object.entries(c)) {
    if (k === "status") continue;
    out[k] = v;
    if (k === "gender") out.status = status;
  }
  if (!("status" in out)) out.status = status;
  return out;
});

fs.writeFileSync(SOURCE, JSON.stringify(src, null, 2) + "\n");
console.log(`Statut écrit pour ${src.characters.length} persos (${Object.keys(TIMELINES).length} chronologies).`);
