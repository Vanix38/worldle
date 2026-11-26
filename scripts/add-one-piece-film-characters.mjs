/**
 * Films One Piece : ajoute un groupe « Films » (hors chronologie) à la
 * progression (firstAppearance), à l'arc et à la saga, puis les persos
 * principaux des films (données : infobox du wiki One Piece, 2026-11-26).
 *
 * Un perso de film n'est jouable que si le joueur coche son film dans la
 * progression. Les films ne comptent pas pour savoir jusqu'où il a lu/vu
 * (fieldMapping.firstAppearance.nonChronologicalGroups).
 *
 * Usage : node scripts/add-one-piece-film-characters.mjs && npm run one-piece:build
 * (idempotent)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "sources", "one-piece.json");
const VOC = path.join(ROOT, "sources", "one-piece-vocabulary.json");

export const FILMS = [
  "Film 1 : One Piece, le film",
  "Film 2 : L'Aventure de l'île de l'horloge",
  "Film 3 : Le Royaume de Chopper",
  "Film 4 : L'Aventure sans issue",
  "Film 5 : La Malédiction de l'épée sacrée",
  "Film 6 : Le Baron Omatsuri et l'île secrète",
  "Film 7 : Le Mecha géant du château Karakuri",
  "Film 8 : Épisode d'Alabasta",
  "Film 9 : Épisode de Chopper",
  "Film 10 : Strong World",
  "Film 11 : Straw Hat Chase",
  "Film 12 : Z",
  "Film 13 : Gold",
  "Film 14 : Stampede",
  "Film 15 : Red",
];
const F = (n) => FILMS[n - 1];
const AO = ["Armement", "Observation"];

// [id, name, aliases, affiliation, sub, age, bounty, fruitType, fruit, gender, status, haki, origin, size, race, hint1, hint2, hint3, film, difficulty]
const NEW = [
  ["eldoraggo", "El Drago", ["Eldoraggo", "Erudorago"], "Équipage d'El Drago", [], "?", 10000000, "Paramecia", ["Goe Goe no Mi"], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Capitaine", "Cri destructeur", "Trésor de Woonan", F(1), "Difficile"],
  ["woonan", "Woonan", ["Ūnan", "Great Gold Pirate", "Le Grand Pirate de l'Or"], "Équipage de Woonan", [], "?", 60000000, "", [], "Masculin", "Décédé", [], "Inconnu", "?", ["Humain"], "Pirate légendaire", "Or", "Île d'Or", F(1), "Impossible"],
  ["bear-king", "Bear King", ["Bea Kingu"], "Équipage du Trump", [], "?", 11600000, "Paramecia", ["Kachi Kachi no Mi"], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Capitaine", "Corps dur et brûlant", "Île de l'horloge", F(2), "Difficile"],
  ["skunk-one", "Skunk One", ["Sukanku Wan"], "Équipage du Trump", [], "?", 6000000, "", [], "Féminin", "Inconnu", [], "Inconnu", "?", ["Humain"], "Membre du Trump", "Pistolets", "Île de l'horloge", F(2), "Impossible"],
  ["borodo", "Borodo", ["Borod", "Borōdo"], "Aucune", [], "?", "?", "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Voleur", "Frères voleurs", "Going Merry volé", F(2), "Impossible"],
  ["battler", "Battler", ["Butler", "Comte Battler", "Earl Battler", "Batorā"], "Aucune", [], "?", 14900000, "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Braconnier", "Musicien", "Île des animaux étranges", F(3), "Impossible"],
  ["gasparde", "Gasparde", ["Général Gasparde", "General Gasparde", "Gasupāde"], "Équipage de Gasparde", ["Marine"], "?", 95000000, "Logia", ["Ame Ame no Mi"], "Masculin", "Inconnu", [], "Inconnu", "?", ["Humain"], "Capitaine, ancien Marine", "Sirop", "Course de Hannabal", F(4), "Difficile"],
  ["needless", "Needless", ["Needles", "Nīdorusu"], "Équipage de Gasparde", [], "?", 57000000, "", [], "Masculin", "Inconnu", [], "Inconnu", "?", ["Humain"], "Bras droit", "Aiguilles", "Course de Hannabal", F(4), "Impossible"],
  ["shuraiya-bascud", "Shuraiya Bascùd", ["Shuraiya", "Shryer Bascudo", "Le Bourreau des Pirates", "Pirate Executioner"], "Aucune", ["Équipage de Gasparde"], 20, 0, "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Chasseur de pirates", "Vengeance", "Course de Hannabal", F(4), "Difficile"],
  ["adelle-bascud", "Adelle Bascùd", ["Adelle", "Adele Bascudo"], "Civil", [], 11, 0, "", [], "Féminin", "Vivant", [], "Inconnu", "?", ["Humain"], "Assistante", "Sœur de Shuraiya", "Course de Hannabal", F(4), "Impossible"],
  ["saga", "Saga", [], "Marine", [], "?", "?", "", [], "Masculin", "Vivant", [], "East Blue (Village de Shimotsuki)", "?", ["Humain"], "Maître de dojo", "Épée maudite", "Ami d'enfance de Zoro", F(5), "Difficile"],
  ["maya", "Maya", [], "Civil", [], "?", 0, "", [], "Féminin", "Vivant", [], "Inconnu", "?", ["Humain"], "Prêtresse", "Île d'Asuka", "Épée sacrée", F(5), "Impossible"],
  ["omatsuri", "Omatsuri", ["Baron Omatsuri", "Omatsuri Danshaku"], "Équipage des Flèches Rouges", [], "?", "?", "", [], "Masculin", "Décédé", [], "Inconnu", "?", ["Humain"], "Baron", "Épreuves", "Île secrète", F(6), "Difficile"],
  ["lily-carnation", "Lily Carnation", ["Rirī Kānēshon"], "Équipage des Flèches Rouges", [], "?", "?", "", [], "Indéterminé", "Décédé", [], "Inconnu", "?", ["Plante"], "Fleur maléfique", "Plante", "Île secrète", F(6), "Impossible"],
  ["ratchet", "Ratchet", ["Rachetto"], "Aucune", [], "?", 0, "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Seigneur de Mecha Island", "Inventeur", "Château Karakuri", F(7), "Impossible"],
  ["musshuru", "Musshuru", ["Musshūru"], "Équipage du Bliking", ["Royaume de Drum"], 33, "?", "Paramecia", ["Noko Noko no Mi"], "Masculin", "Vivant", [], "Grand Line (Royaume de Drum)", "?", ["Humain"], "Ancien prince de Drum", "Champignons", "Frère de Wapol", F(9), "Impossible"],
  ["indigo", "Indigo", ["Dr. Indigo", "Indigo le Scientifique"], "Équipage du Lion d'Or", [], "?", "?", "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Scientifique", "Clown mime", "Merveille", F(10), "Difficile"],
  ["xiao", "Xiao", ["Shao"], "Civil", [], "?", 0, "", [], "Féminin", "Vivant", [], "Inconnu", "?", ["Humain"], "Petite fille", "Village d'Alabasta", "Merveille", F(10), "Impossible"],
  ["z", "Z", ["Zephyr", "Zefā", "Bras Noir Zephyr", "Black Arm Zephyr", "Zetto"], "Néo-Marine", ["Marine"], "?", "?", "", [], "Masculin", "Décédé", ["Armement"], "Inconnu", 348, ["Humain"], "Ancien amiral", "Bras mécanique", "Néo-Marine", F(12), "Moyen"],
  ["ain", "Ain", [], "Néo-Marine", ["Marine"], "?", "?", "Paramecia", ["Modo Modo no Mi"], "Féminin", "Vivant", [], "Inconnu", 174, ["Humain"], "Seconde de Z", "Rajeunissement", "Néo-Marine", F(12), "Difficile"],
  ["binz", "Binz", ["Bins", "Binzu"], "Néo-Marine", ["Marine"], "?", "?", "Paramecia", ["Mosa Mosa no Mi"], "Masculin", "Vivant", [], "Inconnu", 435, ["Humain"], "Officier de la Néo-Marine", "Plantes", "Néo-Marine", F(12), "Difficile"],
  ["gild-tesoro", "Gild Tesoro", ["Tesoro", "L'Empereur d'Or", "Golden Emperor", "Girudo Tezōro"], "Gran Tesoro", [], 41, "?", "Paramecia", ["Goru Goru no Mi"], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Propriétaire du Gran Tesoro", "Or", "Ancien esclave", F(13), "Moyen"],
  ["baccarat", "Baccarat", ["Bakara"], "Gran Tesoro", [], "?", 0, "Paramecia", ["Raki Raki no Mi"], "Féminin", "Vivant", [], "Inconnu", "?", ["Humain"], "Concierge", "Chance", "Gran Tesoro", F(13), "Difficile"],
  ["tanaka", "Tanaka", ["Tanaka-san"], "Gran Tesoro", [], "?", 0, "Paramecia", ["Nuke Nuke no Mi"], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Chef de la sécurité", "Traverser les murs", "Gran Tesoro", F(13), "Difficile"],
  ["dice", "Dice", ["Daisu"], "Gran Tesoro", [], "?", 0, "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Croupier", "Masochiste", "Gran Tesoro", F(13), "Impossible"],
  ["carina", "Carina", ["Karīna", "Phantom Thief", "Vixen"], "Gran Tesoro", [], 19, "?", "", [], "Féminin", "Vivant", [], "Inconnu", "?", ["Humain"], "Voleuse et chanteuse", "Amie de Nami", "Gran Tesoro", F(13), "Moyen"],
  ["buena-festa", "Buena Festa", ["Festa", "Master of Festivities", "Le Faiseur de Fêtes"], "Équipage du Festival", [], "~78", "?", "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Organisateur de l'Expo des Pirates", "Ivresse des fêtes", "Ancien de l'ère de Roger", F(14), "Moyen"],
  ["douglas-bullet", "Douglas Bullet", ["Bullet", "Demon Heir", "L'Héritier du Démon", "Dagurasu Baretto"], "Équipage de Roger", [], 45, "?", "Paramecia", ["Gasha Gasha no Mi"], "Masculin", "Vivant", AO, "Inconnu", 355, ["Humain"], "Ancien de l'équipage de Roger", "Assemblage", "Armement, Observation", F(14), "Moyen"],
  ["gordon", "Gordon", ["Gōdon"], "Royaume d'Elegia", [], "?", 0, "", [], "Masculin", "Vivant", [], "West Blue", "?", ["Humain"], "Ancien roi d'Elegia", "Musique", "Tuteur d'Uta", F(15), "Moyen"],
];

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const voc = JSON.parse(fs.readFileSync(VOC, "utf8"));
const fm = src.fieldMapping;

// Progression / colonnes : groupe « Films » à la fin, hors chronologie.
// Films : version anime uniquement (Vanix).
fm.firstAppearance.$anime.order.Films = [...FILMS];
fm.firstAppearance.$anime.nonChronologicalGroups = ["Films"];
fm.firstAppearance.$anime.description = (fm.firstAppearance.$anime.description ?? "").replace(/\s*Les films.*$/, "") +
  " Les films sont à part : leurs persos n'apparaissent que si tu coches le film.";
const arcOrder = fm.arc.order;
arcOrder["Saga Films"] = [...FILMS];
if (!fm.saga.order.includes("Films")) fm.saga.order.push("Films");

const addVoc = (key, values) => {
  for (const v of values) if (!voc[key].includes(v)) voc[key].push(v);
  voc[key].sort((a, b) => a.localeCompare(b, "fr"));
};

const ids = new Set(src.characters.map((c) => c.id));
let added = 0;
for (const r of NEW) {
  const [id, name, aliases, affiliation, sub, age, bounty, dfType, df, gender, status, haki, origin, size, race, h1, h2, h3, film, difficulty] = r;
  addVoc("affiliation", [affiliation]);
  addVoc("sub_affiliation", sub);
  addVoc("race", race);
  if (ids.has(id)) continue;
  src.characters.push({
    versions: ["anime"], id, name, aliases, affiliation, sub_affiliation: sub, age,
    arc: film, saga: "Films", bounty, devilFruitType: dfType, devilFruit: df, gender, status, haki,
    origin, size, race, hint1: h1, hint2: h2, hint3: h3, firstAppearance: film, difficulty,
  });
  added++;
}
fs.writeFileSync(SRC, JSON.stringify(src, null, 2) + "\n");
fs.writeFileSync(VOC, JSON.stringify(voc, null, 2) + "\n");
console.log(`${added} perso(s) de film ajouté(s) ; total ${src.characters.length}`);
