import fs from "node:fs";
import path from "node:path";

const photosDir = "d:/worlddle/public/universes/marvel-cineverse/characters";

/** @type {Array<[string, string]>} */
const renames = [
  ["ben_grimm.jpeg", "ben_grimm_terre_828-mcu-828.jpeg"],
  ["blackagar_boltagon.webp", "blackagar_boltagon_terre_838-mcu-838.webp"],
  ["captain_britain.png", "captain_britain_terre_838-mcu-838.png"],
  ["captain_carter.png", "captain_carter_terre_82111-mcu-82111.png"],
  ["cassie-webb.jpg", "madame_web-ssu-688.jpg"],
  ["erik_lehnsherr.jpg", "erik_lehnsherr_terre_10005-fox-x-men-10005.jpg"],
  ["erik-lehnsherr.png", "erik_lensherr_jeune-fox-x-men-10005.png"],
  ["green-goblin-webb.png", "harry_osborn_terre_120703-webb-verse-120703.png"],
  ["gwen_stacy.png", "gwen_stacy_terre_120703-webb-verse-120703.png"],
  ["harry_osborn.webp", "harry_osborn_terre_120703-webb-verse-120703.webp"],
  ["johnny_storm.png", "johnny_storm_terre_828-mcu-828.png"],
  ["killmonger-king-mcu.jpg", "n_jadaka-mcu-616.jpg"],
  ["logan-fox.jpg", "logan_terre_10005-fox-x-men-10005.jpg"],
  ["logan.jpg", "james_howlett-fox-x-men-10005.jpg"],
  ["matt_murdock.jpg", "matt_murdock_terre_616-defenders-netflix-616.jpg"],
  ["peggy-carter-aos.jpg", "peggy_carter-mcu-616.jpg"],
  ["peter_parker.jpg", "peter_parker_terre_96283-raimi-verse-96283.jpg"],
  ["piotr-rasputin.png", "piotr_rasputin-fox-x-men-10005.png"],
  ["reed_richards.png", "reed_richards_terre_828-mcu-828.png"],
  ["sue_storm.png", "sue_storm_terre_828-mcu-828.png"],
  ["eddie_brock.jpg", "eddie_brock_terre_688-ssu-688.jpg"],
  ["eddie_brock.png", "eddie_brock_terre_96283-raimi-verse-96283.png"],
  ["venom.jpg", "venom_terre_688-ssu-688.jpg"],
  ["venom.png", "venom_terre_96283-raimi-verse-96283.png"],
  ["zombie-strange-mcu.jpg", "stephen_strange_terre_617-mcu-617.jpg"],
];

/** Orphans: fichier inutile si la fiche JSON + image canon existent déjà */
const deleteIfPresent = [
  "charles_xavier.jpg",
  "charles-xavier.jpg",
  "harry_osborn.png",
];

let renamed = 0;
let deletedDup = 0;
let skippedMissing = 0;

for (const [from, to] of renames) {
  const src = path.join(photosDir, from);
  const dst = path.join(photosDir, to);
  if (!fs.existsSync(src)) {
    skippedMissing++;
    continue;
  }
  if (fs.existsSync(dst)) {
    fs.unlinkSync(src);
    deletedDup++;
    console.log(`[dup->removed] ${from} (had ${to})`);
    continue;
  }
  fs.renameSync(src, dst);
  renamed++;
  console.log(`[renamed] ${from} -> ${to}`);
}

for (const f of deleteIfPresent) {
  const p = path.join(photosDir, f);
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    deletedDup++;
    console.log(`[removed orphan] ${f}`);
  }
}

const eddieWebp = path.join(photosDir, "eddie-brock.webp");
if (fs.existsSync(eddieWebp)) {
  const dst = path.join(photosDir, "eddie_brock_terre_688-ssu-688.webp");
  if (fs.existsSync(dst)) {
    fs.unlinkSync(eddieWebp);
    deletedDup++;
    console.log(`[dup->removed] eddie-brock.webp`);
  } else {
    fs.renameSync(eddieWebp, dst);
    renamed++;
    console.log(`[renamed] eddie-brock.webp -> eddie_brock_terre_688-ssu-688.webp`);
  }
}

console.log("");
console.log(`Renamed: ${renamed}`);
console.log(`Removed duplicate/orphan: ${deletedDup}`);
console.log(`Skipped (missing source): ${skippedMissing}`);
