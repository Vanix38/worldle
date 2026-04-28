import fs from "node:fs";
import path from "node:path";

const photosDir = "d:/worlddle/public/universes/marvel-cineverse/characters";

const mapping = {
  "deadpool-fox.jpg": "wade_wilson_deadpool-fox-x-men-10005.jpg",
  "doctor-doom-fox.jpg": "victor_von_doom-fox-fantastiques-121698.jpg",
  "elektra_natchios.png": "elektra_natchios-defenders-netflix-616.png",
  "hank-mccoy.png": "hank_mccoy_fox_jeune-fox-x-men-10005.png",
  "howard-stark-aos.jpg": "howard_stark-mcu-616.jpg",
  "jean-grey.jpg": "jean_grey-fox-x-men-10005.jpg",
  "kitty-pryde.jpg": "kitty_pryde-fox-x-men-10005.jpg",
  "kraven-ssu.jpg": "sergei_kravinoff-ssu-688.jpg",
  "kurt-wagner.jpg": "kurt_wagner-fox-x-men-10005.jpg",
  "may_parker.png": "may_parker-mcu-616.png",
  "michael-morbius.jpg": "michael_morbius-ssu-688.jpg",
  "negasonic-fox.jpg": "eloise_olivia_phimister-mcu-616.jpg",
  "phil-coulson-aos.jpg": "phillip_coulson-mcu-616.jpg",
  "raven-darkholme-fox.jpg": "raven_darkholme-fox-x-men-10005.jpg",
  "raven-darkholme.jpg": "raven_darkholme-fox-x-men-10005.jpg",
  "shriek.jpg": "shriek-ssu-688.jpg",
  "stephen_strange.jpg": "stephen_strange_terre_616-mcu-616.jpg",
  "sylvie-mcu.png": "sylvie-mcu-616.png",
  "t_challa.jpg": "t_challa-mcu-616.jpg",
  "thor_odinson.jpg": "thor-mcu-616.jpg",
  "victor-von-doom-fox.jpg": "victor_von_doom-fox-fantastiques-121698.jpg"
};

let renamed = 0;
let skippedMissing = 0;
let skippedCollision = 0;

for (const [sourceName, targetName] of Object.entries(mapping)) {
  const sourcePath = path.join(photosDir, sourceName);
  const targetPath = path.join(photosDir, targetName);

  if (!fs.existsSync(sourcePath)) {
    skippedMissing++;
    console.log(`[missing] ${sourceName}`);
    continue;
  }

  if (fs.existsSync(targetPath)) {
    skippedCollision++;
    console.log(`[collision] ${sourceName} -> ${targetName}`);
    continue;
  }

  fs.renameSync(sourcePath, targetPath);
  renamed++;
  console.log(`[renamed] ${sourceName} -> ${targetName}`);
}

console.log("");
console.log(`Renamed: ${renamed}`);
console.log(`Missing: ${skippedMissing}`);
console.log(`Collision: ${skippedCollision}`);
