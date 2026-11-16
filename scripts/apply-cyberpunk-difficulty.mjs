/**
 * Ajoute le champ difficulty à data/cyberpunk.json (notoriété / facilité à deviner).
 * Usage: node scripts/apply-cyberpunk-difficulty.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "data", "cyberpunk.json");

const DIFF_ORDER = ["Très facile", "Facile", "Moyen", "Difficile", "Impossible"];

/** Overrides manuels (notoriété Worldle). */
const EXPLICIT = {
  // Très facile — cast principal jeu / anime
  v: "Très facile",
  "johnny-silverhand": "Très facile",
  "jackie-welles": "Très facile",
  "judy-alvarez": "Très facile",
  "panam-palmer": "Très facile",
  "river-ward": "Très facile",
  "kerry-eurodyne": "Très facile",
  "rogue-amendiares": "Très facile",
  "adam-smasher": "Très facile",
  "goro-takemura": "Très facile",
  "evelyn-parker": "Très facile",
  "dexter-deshawn": "Très facile",
  "viktor-vektor": "Très facile",
  "misty-olszewski": "Très facile",
  "t-bug": "Très facile",
  "altiera-cunningham": "Très facile",
  "saburo-arasaka": "Très facile",
  "hanako-arasaka": "Très facile",
  "yorinobu-arasaka": "Très facile",
  "david-martinez": "Très facile",
  "lucyna-kushinada": "Très facile",
  rebecca: "Très facile",
  maine: "Très facile",
  kiwi: "Très facile",
  faraday: "Très facile",
  "gloria-martinez": "Très facile",

  // Facile — companions secondaires, fixers majeurs, PL heads, Edgerunners secondaires
  "claire-russell": "Facile",
  "dakota-smith": "Facile",
  "wakako-okada": "Facile",
  "sebastian-ibarra": "Facile",
  "regina-jones": "Facile",
  "muamar-reyes": "Facile",
  delamain: "Facile",
  placide: "Facile",
  "dum-dum": "Facile",
  "simon-randall": "Facile", // Royce
  "saul-bright": "Facile",
  "mitch-anderson": "Facile",
  "solomon-reed": "Facile",
  "song-so-mi": "Facile",
  "alena-xenakis": "Facile", // Alex (FIA)
  "kurt-hansen": "Facile",
  "rosalind-myers": "Facile",
  pilar: "Facile",
  "dorio-gunnarsdottir": "Facile",
  falco: "Facile",
  "james-norris": "Facile",
  "rache-bartmoss": "Facile",
  "spider-murphy": "Facile",
  "sandayu-oda": "Facile",
  "meredith-stout": "Facile",
  "elizabeth-peralez": "Facile",
  "jefferson-peralez": "Facile",
  "blue-moon": "Facile",
  "red-menace": "Facile",
  "purple-force": "Facile",
  "bes-isis": "Facile", // Nancy / Bes Isis
  denny: "Facile",
  henry: "Facile",
  "lizzy-wizzy": "Facile",
  "anders-hellman": "Facile",
  "michiko-sanderson-nee-arasaka": "Facile",
  "emmerick-bronson": "Facile",
  "coach-fred": "Facile",
  "ozob-bozo": "Facile",
  "barry-alken": "Facile",
  brendan: "Facile",
  "mr-blue-eyes": "Facile",

  // Moyen — PNJ de quêtes mémorables / PL secondaires / Edgerunners mineurs
  "aurore-cassel": "Moyen",
  "aymeric-cassel": "Moyen",
  "albert-murphy": "Moyen",
  "bill-mitchel": "Moyen",
  "carl-robinson": "Moyen",
  "chester-bennett": "Moyen",
  "edgar-tool": "Moyen",
  "elizabeth-borden": "Moyen",
  "eva-cole": "Moyen",
  "griselda-martinez": "Moyen",
  "jake-scooter": "Moyen",
  "hideshi-hino": "Moyen",
  "mike-kowalski": "Moyen",
  "miriam-night": "Moyen",
  "nele-springer": "Moyen",
  "nolan-frakes": "Moyen",
  "odell-blanco": "Moyen",
  "paco-torres": "Moyen",
  "philippe-oreste": "Moyen",
  rhino: "Moyen",
  "ross-ulmer": "Moyen",
  "stella-ramos": "Moyen",
  "trevor-brass": "Moyen",
  vasquez: "Moyen",
  vortex: "Moyen",
  "wilky-laguerre": "Moyen",
  "willie-mccoy": "Moyen",
  "yuri-bychkov": "Moyen",
  "zoli-barnes": "Moyen",
  "aleksander-pushkin": "Moyen",
  "anthony-anderson": "Moyen",
  ashlay: "Moyen",
  "ayden-daniels": "Moyen",
  boz: "Moyen",
  "charles-graham": "Moyen",
  "damir-kovac": "Moyen",
  "jake-estevez": "Moyen",
  "jim-jarry": "Moyen",
  "josie-alcazar": "Moyen",
  "juliet-horrigan": "Moyen",
  "kyle-araujo": "Moyen",
  "leah-gladen": "Moyen",
  "lisa-smith": "Moyen",
  "melissa-wellingham": "Moyen",
  "nuka-shank-ohlone": "Moyen",
  "tommie-walker": "Moyen",
  "fredrik-persson": "Moyen",
  "gottfrid-persson": "Moyen",
  "gaston-slayton": "Moyen",
  "jack-mausser": "Moyen",
  "roh-chi-won": "Moyen",
  "sasha-yakovleva": "Moyen",
  "jimmy-kurosaki": "Moyen",
  "katsuo-tanaka": "Moyen",
  "maximum-mike": "Moyen",
  "lucius-rhyne": "Moyen",
};

const MAJOR_AFF = [
  /\bAfterlife\b/i,
  /\bSamurai\b/i,
  /\bArasaka\b/i,
  /\bMilitech\b/i,
  /\bAldecaldos\b/i,
  /\bVoodoo Boys\b/i,
  /\bMaelstrom\b/i,
  /\bTyger Claws\b/i,
  /\bValentinos\b/i,
  /\bThe Mox\b/i,
  /\bBARGHEST\b/i,
  /\bFIA\b/i,
  /\bNUSA\b/i,
  /\bMaxTac\b/i,
  /\bNetWatch\b/i,
];

const ICONIC_ROLE = /\b(Solo|Netrunner|Fixer|Rockerboy|Nomad|Media)\b/i;

function guessDifficulty(c) {
  if (EXPLICIT[c.id]) return EXPLICIT[c.id];

  const fa = String(c.firstAppearance || "");
  const aff = String(c.affiliation || "");
  const role = String(c.role || "");
  const hasVoice = Boolean(c.hint1 && String(c.hint1).trim());
  const majorAff = MAJOR_AFF.some((re) => re.test(aff));
  const iconicRole = ICONIC_ROLE.test(role);

  // Anime S1 named cast without override → at least Facile / Moyen
  if (fa === "Edgerunners Saison 1") {
    if (hasVoice && (majorAff || iconicRole)) return "Facile";
    if (hasVoice || majorAff) return "Moyen";
    return "Difficile";
  }

  // Phantom Liberty: voiced or major aff → Moyen, sinon Difficile
  if (fa === "Phantom Liberty") {
    if (hasVoice && majorAff) return "Facile";
    if (hasVoice || majorAff || iconicRole) return "Moyen";
    return "Difficile";
  }

  // Saison 2 mostly new/obscure for quiz players
  if (fa === "Edgerunners Saison 2") {
    if (hasVoice) return "Difficile";
    return "Impossible";
  }

  // Jeu vidéo base
  if (hasVoice && majorAff && iconicRole) return "Facile";
  if (hasVoice && (majorAff || iconicRole)) return "Moyen";
  if (hasVoice || majorAff) return "Difficile";
  return "Impossible";
}

function ensureFieldMapping(data) {
  const entry = {
    header: "Difficulté",
    fonction: "Comparaison",
    columnWidth: "small",
    order: [...DIFF_ORDER],
    description:
      "Facilité à deviner le personnage (notoriété). Ordre : Très facile → Facile → Moyen → Difficile → Impossible.",
  };
  if (data.fieldMapping.difficulty) {
    data.fieldMapping.difficulty = { ...data.fieldMapping.difficulty, ...entry };
    return;
  }
  const entries = Object.entries(data.fieldMapping);
  const difficultyEntry = ["difficulty", entry];
  const faIdx = entries.findIndex(([k]) => k === "firstAppearance");
  if (faIdx >= 0) entries.splice(faIdx + 1, 0, difficultyEntry);
  else {
    const hintIdx = entries.findIndex(([k]) => k.startsWith("hint"));
    if (hintIdx >= 0) entries.splice(hintIdx, 0, difficultyEntry);
    else entries.push(difficultyEntry);
  }
  data.fieldMapping = Object.fromEntries(entries);
}

function main() {
  const data = JSON.parse(fs.readFileSync(OUT, "utf8"));
  ensureFieldMapping(data);

  const counts = Object.fromEntries(DIFF_ORDER.map((d) => [d, 0]));
  for (const c of data.characters) {
    const d = guessDifficulty(c);
    c.difficulty = d;
    counts[d]++;
  }

  data.fieldPrevalence = data.fieldPrevalence || {};
  data.fieldPrevalence.difficulty = 1;

  fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log("Répartition difficulty:", counts);
  console.log("Total", data.characters.length);
}

main();
