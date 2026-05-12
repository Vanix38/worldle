import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

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

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCmText(value) {
  let s = String(value ?? "").trim();
  if (!s) return s;

  s = s.replace(/(\d+)\s*m\s*(\d{1,2})(?=\d+\s*cm)/gi, (_, m, cm) => {
    return `${parseInt(m, 10) * 100 + parseInt(cm, 10)} cm `;
  });

  s = s.replace(/(\d+)\s*m\s*(\d{1,2})(?!\d)/gi, (_, m, cm) => {
    return `${parseInt(m, 10) * 100 + parseInt(cm, 10)} cm`;
  });

  s = s.replace(/(\d+(?:[.,]\d+)?)\s*m\b/gi, (_, meters) => {
    const n = Math.round(parseFloat(meters.replace(",", ".")) * 100);
    return `${n} cm`;
  });

  s = s.replace(/(\d+)\s*cm\b/gi, (_, cm) => `${parseInt(cm, 10)} cm`);
  s = s.replace(/(\d+\s*cm)(?=\d)/gi, "$1 ");
  s = s.replace(/\)(?=\d)/g, ") ");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
const heightCols = ["en_wiki_height", "fr_wiki_taille"]
  .map((name) => headers.indexOf(name))
  .filter((idx) => idx >= 0);

let changed = 0;
const outLines = [headers.join(";")];

for (let i = 1; i < lines.length; i++) {
  const row = parseLine(lines[i]);
  while (row.length < headers.length) row.push("");

  for (const idx of heightCols) {
    const before = row[idx] ?? "";
    const after = toCmText(before);
    if (after !== before) {
      row[idx] = after;
      changed++;
    }
  }

  outLines.push(row.map(csvEscapeField).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Nettoyé:", CSV);
console.log("Cellules modifiées:", changed);
