import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

const VERIFIED_BOUNTIES = new Map([
  ["marshall-d-teach", "3 996 000 000"],
  ["avalo-pizarro", "Inconnu"],
  ["baggy", "3 189 000 000"],
  ["bartolomeo", "200 000 000"],
  ["basil-hawkins", "320 000 000"],
  ["bastille", "Au moins 500 000 000"],
  ["bepo", "1 500"],
  ["boa-hancock", "1 659 000 000"],
  ["brannew", "Au moins 100 000 000"],
  ["brogy", "1 800 000 000"],
  ["brook", "383 000 000"],
  ["capone-bege", "350 000 000"],
  ["catarina-devon", "Inconnu"],
  ["cavendish", "330 000 000"],
  ["cesar-clown", "300 000 000"],
  ["charlotte-linlin", "4 388 000 000"],
  ["chinjao", "542 000 000"],
  ["crocodile", "1 965 000 000"],
  ["dorry", "1 800 000 000"],
  ["eustass-kid", "3 000 000 000"],
  ["franky", "394 000 000"],
  ["fullbody", "Au moins 1 000 000"],
  ["gecko-moria", "320 000 000"],
  ["hina", "Inconnu"],
  ["jewelry-bonney", "320 000 000"],
  ["jinbe", "1 100 000 000"],
  ["kaidou", "4 611 100 000"],
  ["killer", "200 000 000"],
  ["momonga", "Au moins 500 000 000"],
  ["monkey-d-luffy", "3 000 000 000"],
  ["nami", "366 000 000"],
  ["nezumi", "Au moins 100 000 000"],
  ["nico-robin", "930 000 000"],
  ["orlumbus", "148 000 000"],
  ["roronoa-zoro", "1 111 000 000"],
  ["sanjuan-wolf", "Inconnu"],
  ["scratchmen-apoo", "350 000 000"],
  ["shanks", "4 048 900 000"],
  ["smoker", "Au moins 500 000 000"],
  ["tashigi", "Inconnu"],
  ["trafalgar-d-water-law", "3 000 000 000"],
  ["tsuru", "Au moins 500 000 000"],
  ["vasco-shot", "Inconnu"],
  ["zeff", "Inconnu"],
  ["vinsmoke-sanji", "1 032 000 000"],
  ["tony-tony-chopper", "1 000"],
  ["usopp", "500 000 000"],
]);

const PIRATE_IDS_WITH_UNKNOWN_BOUNTY_IF_EMPTY = new Set([
  "baby-5",
  "blue-gilly",
  "buffalo",
  "cabaji",
  "charlotte-brulee",
  "charlotte-chiffon",
  "charlotte-flampe",
  "charlotte-praline",
  "charlotte-pudding",
  "chess",
  "gaimon",
  "gerd",
  "hajrudin",
  "hody-jones",
  "holdem",
  "ideo",
  "inuarashi",
  "jora",
  "kuzan",
  "marguerite",
  "monet",
  "morge",
  "nekomamushi",
  "oars",
  "oimo",
  "perona",
  "shakuyaku",
  "sheep-s-head",
  "speed",
  "streusen",
  "sugar",
  "vergo",
  "wadatsumi",
  "yarle",
  "yorle",
  "zeo",
]);

function parseLine(line) {
  const out = [];
  let cur = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ";") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }

  out.push(cur);
  return out;
}

function csvEscapeField(value) {
  const text = String(value ?? "");
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function numbers(value) {
  return [...String(value ?? "").matchAll(/\d[\d., ]*/g)]
    .map((match) => match[0].replace(/[^\d]/g, ""))
    .filter(Boolean);
}

function uniqueNumbers(value) {
  return [...new Set(numbers(value))];
}

function hasUnknown(value) {
  return /\bunknown\b|\binconnu\b|\?/.test(String(value ?? "").toLowerCase());
}

function hasAtLeast(value) {
  return /at least|au moins/i.test(String(value ?? ""));
}

function formatNumber(raw) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function pickValue(enBounty, frBounty) {
  const enNums = uniqueNumbers(enBounty);
  const frNums = uniqueNumbers(frBounty);
  const enOne = enNums.length === 1 ? enNums[0] : "";
  const frOne = frNums.length === 1 ? frNums[0] : "";

  if (enOne && frOne && enOne === frOne) {
    const formatted = formatNumber(enOne);
    if (hasAtLeast(enBounty) || hasAtLeast(frBounty)) return `Au moins ${formatted}`;
    return formatted;
  }

  if (frOne && !enOne && !hasUnknown(enBounty)) {
    return hasAtLeast(frBounty) ? `Au moins ${formatNumber(frOne)}` : formatNumber(frOne);
  }

  if (enOne && !frOne && !hasUnknown(frBounty)) {
    return hasAtLeast(enBounty) ? `Au moins ${formatNumber(enOne)}` : formatNumber(enOne);
  }

  if (hasUnknown(enBounty) || hasUnknown(frBounty)) return "Inconnu";
  if (!String(enBounty ?? "").trim() && !String(frBounty ?? "").trim()) return "Aucune";
  return "Inconnu";
}

const raw = fs.readFileSync(CSV_PATH, "utf8");
const lines = raw.split(/\r?\n/).filter((line) => line.length > 0);
const rows = lines.map(parseLine);
const header = rows[0];

const idIdx = header.indexOf("id");
const enBountyIdx = header.indexOf("en_wiki_bounty");
const frBountyIdx = header.indexOf("fr_wiki_prime");
let finalBountyIdx = header.indexOf("final_bounty");

if (finalBountyIdx === -1) {
  header.push("final_bounty");
  finalBountyIdx = header.length - 1;
}

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const id = row[idIdx];
  const finalValue = VERIFIED_BOUNTIES.has(id)
    ? VERIFIED_BOUNTIES.get(id)
    : pickValue(row[enBountyIdx], row[frBountyIdx]);

  row[finalBountyIdx] =
    finalValue === "Aucune" && PIRATE_IDS_WITH_UNKNOWN_BOUNTY_IF_EMPTY.has(id)
      ? "Inconnu"
      : finalValue;
}

const output = rows
  .map((row) => row.map(csvEscapeField).join(";"))
  .join("\n")
  .concat("\n");

fs.writeFileSync(CSV_PATH, output, "utf8");
console.log(`Updated ${CSV_PATH}`);
