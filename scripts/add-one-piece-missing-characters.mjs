/**
 * Ajoute à sources/one-piece.json les persos notables qui manquaient
 * (comparaison avec la liste des persos canon du wiki One Piece, 2026-11-26).
 * Données : infobox du wiki EN (statut, âge, taille, fruit, 1re apparition)
 * + wiki FR (épithètes, noms français). arc et saga sont déduits de
 * firstAppearance via fieldMapping (comme apply-one-piece-arc-from-first-appearance).
 *
 * Usage : node scripts/add-one-piece-missing-characters.mjs && npm run one-piece:build
 * (idempotent : un id déjà présent est ignoré)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "sources", "one-piece.json");
const VOC = path.join(ROOT, "sources", "one-piece-vocabulary.json");

const fa = (ch, ep) => ({ $manga: `Chapitre ${ch}`, $anime: `Épisode ${ep}` });
const changeAt = (before, after, ch, ep) => [{ value: before }, { value: after, from: fa(ch, ep) }];
const AO = ["Armement", "Observation"];

// [id, name, aliases, affiliation, sub, age, bounty, fruitType, fruit, gender, status, haki, origin, size, race, hint1, hint2, hint3, first, difficulty]
const NEW = [
  ["kaya", "Kaya", [], "Civil", [], 17, 0, "", [], "Féminin", "Vivant", [], "East Blue (Archipel des Gekko)", 169, ["Humain"], "Riche héritière", "Étudiante en médecine", "Village de Sirop", fa(23, 9), "Facile"],
  ["merry", "Merry", ["Merī"], "Civil", [], "?", 0, "", [], "Masculin", "Vivant", [], "East Blue (Archipel des Gekko)", "?", ["Humain"], "Majordome", "Humain", "Village de Sirop", fa(24, 11), "Difficile"],
  ["igaram", "Igaram", ["Mr. 8", "Igaramu", "Igarappoi"], "Royaume d'Alabasta", ["Baroque Works", "Garde royale"], 48, 0, "", [], "Masculin", "Vivant", [], "Grand Line (Alabasta)", 218, ["Humain"], "Capitaine de la garde royale", "Agent infiltré", "Grand Line (Alabasta)", fa(106, 64), "Moyen"],
  ["toto", "Toto", ["Toh-Toh", "Tu-tu"], "Civil", ["Royaume d'Alabasta"], "?", 0, "", [], "Masculin", "Vivant", [], "Grand Line (Alabasta)", "?", ["Humain"], "Habitant de Yuba", "Père de Koza", "Grand Line (Alabasta)", fa(163, 100), "Difficile"],
  ["thatch", "Thatch", ["Satch", "Satchi"], "Équipage de Barbe Blanche", [], "?", "?", "", [], "Masculin", "Décédé", [], "North Blue", "?", ["Humain"], "Commandant de la 4e division", "Cuisinier", "North Blue", fa(440, 325), "Moyen"],
  ["haruta", "Haruta", [], "Équipage de Barbe Blanche", [], "?", "?", "", [], "Masculin", "Vivant", [], "South Blue", "?", ["Humain"], "Commandant de la 12e division", "Épéiste", "South Blue", fa(553, 461), "Difficile"],
  ["blamenco", "Blamenco", ["Buramenko"], "Équipage de Barbe Blanche", [], "?", "?", "Paramecia", ["Poke Poke no Mi"], "Masculin", "Vivant", [], "Grand Line", "?", ["Humain"], "Commandant de la 6e division", "Poches", "Grand Line", fa(553, 461), "Difficile"],
  ["rakuyo", "Rakuyo", ["Rakuyou", "Rakuyō"], "Équipage de Barbe Blanche", [], "?", "?", "", [], "Masculin", "Vivant", [], "South Blue", "?", ["Humain"], "Commandant de la 7e division", "Humain", "South Blue", fa(553, 461), "Difficile"],
  ["whitey-bay", "Whitey Bay", ["La Sorcière des Glaces", "Ice Witch", "Howaiti Bei"], "Équipage de Barbe Blanche", [], "?", "?", "", [], "Féminin", "Vivant", [], "Inconnu", "?", ["Humain"], "Capitaine alliée", "Brise-glace", "Allié de Barbe Blanche", fa(556, 462), "Difficile"],
  ["atmos", "Atmos", ["Le Buffle d'Eau", "Water Buffalo", "Atomosu"], "Équipage de Barbe Blanche", [], "?", "?", "", [], "Masculin", "Vivant", [], "West Blue", "?", ["Humain"], "Commandant de la 13e division", "Épéiste", "West Blue", fa(553, 461), "Difficile"],
  ["penguin", "Penguin", ["Pengin"], "Équipage du Heart", ["Alliance des Ninjas-Pirates-Minks-Samouraïs"], 26, "?", "", [], "Masculin", changeAt("Vivant", "Inconnu", 1064, 1094), [], "North Blue", "?", ["Humain"], "Membre d'équipage", "Casquette « Penguin »", "North Blue", fa(498, 392), "Moyen"],
  ["shachi", "Shachi", [], "Équipage du Heart", ["Alliance des Ninjas-Pirates-Minks-Samouraïs"], 25, "?", "", [], "Masculin", changeAt("Vivant", "Inconnu", 1064, 1094), [], "North Blue", "?", ["Humain"], "Membre d'équipage", "Lunettes de soleil", "North Blue", fa(498, 392), "Moyen"],
  ["jean-bart", "Jean Bart", ["Janbāru"], "Équipage du Heart", ["Alliance des Ninjas-Pirates-Minks-Samouraïs"], "?", "?", "", [], "Masculin", changeAt("Vivant", "Inconnu", 1064, 1094), [], "Inconnu", "?", ["Humain"], "Ancien capitaine pirate", "Ancien esclave", "Équipage du Heart", fa(497, 391), "Moyen"],
  ["kong", "Kong", ["Kongu"], "Gouvernement Mondial", ["Marine"], "?", 5000000000, "", [], "Masculin", "Vivant", AO, "Inconnu", "?", ["Humain"], "Commandant en chef", "Ancien amiral en chef", "Armement, Observation", fa(594, 511), "Difficile"],
  ["gion", "Gion", ["Momousagi", "Momo-Usagi"], "Marine", [], "?", 500000000, "", [], "Féminin", "Vivant", AO, "Inconnu", "?", ["Humain"], "Vice-Amiral", "Épéiste", "Armement, Observation", fa(907, 887), "Difficile"],
  ["doberman", "Doberman", ["Dōberuman"], "Marine", [], "?", 500000000, "", [], "Masculin", "Vivant", AO, "Inconnu", "?", ["Humain"], "Vice-Amiral", "Épéiste", "Armement, Observation", fa(420, 302), "Difficile"],
  ["shimotsuki-ryuma", "Shimotsuki Ryuma", ["Ryuma", "Le Samouraï Légendaire", "Dieu des lames", "Sword God", "Legendary Samurai", "Ryuma de King"], "Famille Shimotsuki", ["Pays des Wa"], 47, 0, "", [], "Masculin", "Décédé", ["Armement"], "Grand Line (Pays des Wa)", 179, ["Humain"], "Samouraï légendaire", "Tueur de dragon", "Armement", fa(448, 342), "Moyen"],
  ["kozuki-toki", "Kozuki Toki", ["Kouzuki Toki", "Kōzuki Toki"], "Famille Kozuki", ["Équipage de Barbe Blanche", "Équipage de Roger"], 36, "?", "Paramecia", ["Toki Toki no Mi"], "Féminin", "Décédé", [], "Inconnu", 190, ["Humain"], "Épouse d'Oden", "Voyage dans le futur", "Venue d'il y a 800 ans", fa(919, 893), "Moyen"],
  ["ashura-doji", "Ashura Doji", ["Shutenmaru", "Ashura Dōji", "Strongest Monster of Kuri"], "Famille Kozuki", ["Neuf Fourreaux Rouges", "Alliance des Ninjas-Pirates-Minks-Samouraïs", "Pays des Wa"], 56, "?", "", [], "Masculin", changeAt("Vivant", "Décédé", 1008, 1025), AO, "Grand Line (Pays des Wa)", 544, ["Humain"], "Fourreau Rouge", "Chef des bandits", "Armement, Observation", fa(920, 910), "Moyen"],
  ["shimotsuki-yasuie", "Shimotsuki Yasuie", ["Yasu le Hérisson", "Yasu the Hedgehog", "Tonoyasu"], "Famille Shimotsuki", ["Pays des Wa"], 71, 0, "SMILE", ["SMILE"], "Masculin", changeAt("Vivant", "Décédé", 943, 941), [], "Grand Line (Pays des Wa)", 155, ["Humain"], "Ancien daimyo", "Rire (SMILE)", "Hakumai", fa(929, 916), "Moyen"],
  ["shimotsuki-ushimaru", "Shimotsuki Ushimaru", ["Ushimaru"], "Famille Shimotsuki", ["Pays des Wa"], 50, 0, "", [], "Masculin", "Décédé", AO, "Grand Line (Pays des Wa)", 298, ["Humain"], "Daimyo de Ringo", "Samouraï", "Armement, Observation", fa(953, 954), "Difficile"],
  ["portgas-d-rouge", "Portgas D. Rouge", ["Portgaz D. Rouge", "Pōtogasu Dī Rūju", "Rouge"], "Civil", ["Clan des D."], "?", 0, "", [], "Féminin", "Décédé", [], "South Blue (Baterilla)", "?", ["Humain"], "Mère d'Ace", "Grossesse de 20 mois", "South Blue (Baterilla)", fa(550, 459), "Moyen"],
  ["masked-deuce", "Masked Deuce", ["Deuce", "Masukudo Dyūsu"], "Équipage de Barbe Blanche", ["Équipage du Spade"], "?", "?", "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Second d'Ace", "Masque", "Équipage du Spade", fa(552, 461), "Difficile"],
  ["donquixote-homing", "Donquixote Homing", ["Don Quichotte Homing", "Don Quixote Homing", "Donkihōte Hōmingu"], "Gouvernement Mondial", ["Nobles Mondiaux", "Famille Don Quichotte"], "?", 0, "", [], "Masculin", "Décédé", [], "Red Line (Marie-Joie)", "?", ["Humain"], "Ancien Dragon Céleste", "Père de Doflamingo", "Red Line (Marie-Joie)", fa(760, 699), "Difficile"],
  ["charlotte-amande", "Charlotte Amande", ["Amande", "Demon Lady", "Shārotto Amando"], "Équipage de Big Mom", ["Famille Charlotte"], 47, "?", "", [], "Féminin", "Vivant", [], "Grand Line (Whole Cake Island)", "?", ["Humain", "Serpent"], "Ministre des Noix", "Femme-serpent", "Totto Land", fa(827, 786), "Moyen"],
  ["charlotte-opera", "Charlotte Opera", ["Shārotto Opera"], "Équipage de Big Mom", ["Famille Charlotte"], 46, "?", "Paramecia", ["Kuri Kuri no Mi"], "Masculin", changeAt("Vivant", "Inconnu", 863, 833), [], "Grand Line (Whole Cake Island)", "?", ["Humain"], "Ministre de la Crème", "Crème", "Totto Land", fa(829, 789), "Difficile"],
  ["charlotte-galette", "Charlotte Galette", ["Shārotto Garetto"], "Équipage de Big Mom", ["Famille Charlotte"], 31, "?", "Paramecia", ["Bata Bata no Mi"], "Féminin", "Vivant", [], "Grand Line (Whole Cake Island)", "?", ["Humain"], "Ministre du Beurre", "Beurre", "Totto Land", fa(829, 789), "Difficile"],
  ["capone-pez", "Capone Pez", ["Pez", "Junior", "Kapone Pettsu"], "Équipage de Big Mom", ["Équipage du Fire Tank", "Famille Charlotte"], 1, 0, "", [], "Masculin", "Vivant", [], "Grand Line (Whole Cake Island)", "?", ["Humain"], "Fils de Bege", "Bébé", "Totto Land", fa(834, 795), "Difficile"],
  ["vinsmoke-sora", "Vinsmoke Sora", ["Sora", "Vinsumōku Sora"], "Famille Vinsmoke", ["Royaume de Germa", "Germa 66"], "?", 0, "", [], "Féminin", "Décédé", [], "North Blue (Royaume de Germa)", "?", ["Humain"], "Reine de Germa", "Mère de Sanji", "North Blue (Royaume de Germa)", fa(841, 804), "Moyen"],
  ["mr-9", "Mr. 9", ["Misutā Nain"], "Baroque Works", [], "?", "?", "", [], "Masculin", "Vivant", [], "Grand Line", "?", ["Humain"], "Agent de Baroque Works", "Batte-acrobate", "Whisky Peak", fa(103, 62), "Moyen"],
  ["miss-monday", "Miss Monday", ["Ms. Monday", "Misu Mandē"], "Baroque Works", [], "?", "?", "", [], "Féminin", "Vivant", [], "Grand Line", "?", ["Humain"], "Agent de Baroque Works", "Force colossale", "Whisky Peak", fa(107, 64), "Difficile"],
  ["kumashi", "Kumashi", ["Kumacy", "Kumashī"], "Thriller Bark", ["Équipage de Gecko Moria"], "?", 0, "", [], "Masculin", "Décédé", [], "Inconnu", "?", ["Zombie"], "Serviteur de Perona", "Ours en peluche", "Thriller Bark", fa(449, 343), "Difficile"],
  ["hera", "Hera", ["Héra", "Hera the Thundercloud", "Nuage orageux"], "Équipage de Big Mom", [], "?", 0, "", [], "Féminin", changeAt("Vivant", "Inconnu", 1040, 1067), [], "Grand Line", "?", ["Homie"], "Homie de Big Mom", "Nuage d'orage", "Grand Line", fa(1011, 1028), "Difficile"],
  ["tank-lepanto", "Tank Lepanto", ["Tank Lepant", "Tanku Repanto"], "Famille Riku", ["Royaume de Dressrosa"], "?", 0, "", [], "Masculin", "Vivant", [], "Grand Line (Dressrosa)", "?", ["Humain"], "Commandant de l'armée", "Gladiateur", "Grand Line (Dressrosa)", fa(706, 636), "Impossible"],
  ["big-pan", "Big Pan", ["Big Bun", "Biggu Pan", "Wotan"], "Équipage de Foxy", [], "?", "?", "", [], "Masculin", "Vivant", [], "Inconnu", "?", ["Humain"], "Groggy Monster", "Géant du Davy Back Fight", "Long Ring Long Land", fa(309, 210), "Impossible"],
  ["kingbaum", "Kingbaum", ["King Baum", "Kingubāmu"], "Équipage de Big Mom", [], "?", 0, "", [], "Masculin", changeAt("Vivant", "Inconnu", 874, 845), [], "Grand Line", 2340, ["Homie"], "Maître de la Forêt de la Séduction", "Arbre", "Whole Cake Island", fa(836, 797), "Difficile"],
  ["mocha", "Mocha", [], "Civil", [], 9, 0, "", [], "Féminin", "Vivant", [], "Grand Line (Nouveau Monde)", 692, ["Humain"], "Enfant de Punk Hazard", "Géante artificielle", "Punk Hazard", fa(657, 582), "Difficile"],
];

const UTA = ["uta", "Uta", ["La Plus Grande Cantatrice du Monde", "Sekai no Utahime"], "Équipage du Roux", [], 21, "?", "Paramecia", ["Uta Uta no Mi"], "Féminin", "Inconnu", [], "West Blue", 169, ["Humain"], "Chanteuse", "Chant", "Fille de Shanks", fa(1055, 1082), "Facile"];
if (process.argv.includes("--uta")) NEW.push(UTA);

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const voc = JSON.parse(fs.readFileSync(VOC, "utf8"));
const fm = src.fieldMapping;

const segToArc = {};
for (const v of ["$manga", "$anime"]) {
  segToArc[v] = new Map();
  for (const arcs of Object.values(fm.firstAppearance[v].order))
    for (const [arc, segs] of Object.entries(arcs)) for (const s of segs) segToArc[v].set(s, arc);
}
const arcOrder = fm.arc.order.$manga ? fm.arc.order.$manga : fm.arc.order;
const sagaOfArc = {};
for (const [saga, arcs] of Object.entries(arcOrder)) for (const a of arcs) sagaOfArc[a] = saga.replace(/^Saga /, "");
const perVersion = (m, a) => (m === a ? m : { $manga: m, $anime: a });

if (!voc.race.includes("Zombie")) voc.race = [...voc.race, "Zombie"].sort((a, b) => a.localeCompare(b, "fr"));
if (!voc.race.includes("Serpent")) voc.race = [...voc.race, "Serpent"].sort((a, b) => a.localeCompare(b, "fr"));

const ids = new Set(src.characters.map((c) => c.id));
let added = 0;
for (const r of NEW) {
  const [id, name, aliases, affiliation, sub, age, bounty, dfType, df, gender, status, haki, origin, size, race, h1, h2, h3, first, difficulty] = r;
  if (ids.has(id)) continue;
  const arcM = segToArc.$manga.get(first.$manga);
  const arcA = segToArc.$anime.get(first.$anime);
  if (!arcM || !arcA) throw new Error(`${id}: arc introuvable pour ${JSON.stringify(first)}`);
  const sagaM = sagaOfArc[arcM], sagaA = sagaOfArc[arcA];
  src.characters.push({
    versions: ["manga", "anime"], id, name, aliases, affiliation, sub_affiliation: sub, age,
    arc: perVersion(arcM, arcA), saga: perVersion(sagaM, sagaA), bounty,
    devilFruitType: dfType, devilFruit: df, gender, status, haki, origin, size, race,
    hint1: h1, hint2: h2, hint3: h3, firstAppearance: first, difficulty,
  });
  added++;
}
fs.writeFileSync(SRC, JSON.stringify(src, null, 2) + "\n");
fs.writeFileSync(VOC, JSON.stringify(voc, null, 2) + "\n");
console.log(`${added} perso(s) ajouté(s) ; total ${src.characters.length}`);
