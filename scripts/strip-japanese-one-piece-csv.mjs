import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV = path.join(__dirname, "..", "data", "one-piece-wiki-fixed.csv");

/** Blocs CJK / japonais + scripts (rattrape ー・・ restés avec Script=) */
function stripJapanese(s) {
  let t = String(s ?? "");
  t = t.replace(/\u3000/g, " ");
  t = t.replace(/\p{Script=Hiragana}/gu, "");
  t = t.replace(/\p{Script=Katakana}/gu, "");
  t = t.replace(/\p{Script=Han}/gu, "");
  t = t.replace(
    /[\u3001-\u303f\u3040-\u309f\u30a0-\u30ff\u31f0-\u31ff\u3200-\u32ff\u3300-\u33ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/g,
    "",
  );
  t = t.replace(/\uFF08/g, "(").replace(/\uFF09/g, ")");
  t = t.replace(/\uFF0C/g, ",").replace(/\uFF1A/g, ":").replace(/\uFF1B/g, ";");
  t = t.replace(/\s+/g, " ");
  t = t.replace(/\(\s*,/g, "(");
  t = t.replace(/,\s*\)/g, ")");
  t = t.replace(/\(\s*\)/g, "");
  t = t.replace(/\s*,\s*,/g, ",");
  t = t.replace(/^\s*,|,\s*$/g, "");
  return t.trim();
}

function parseLine(line) {
  const o = [];
  let c = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const x = line[i];
    if (q) {
      if (x === '"' && line[i + 1] === '"') {
        c += '"';
        i++;
      } else if (x === '"') q = false;
      else c += x;
    } else {
      if (x === '"') q = true;
      else if (x === ";") {
        o.push(c);
        c = "";
      } else c += x;
    }
  }
  o.push(c);
  return o;
}

function csvEscapeField(v) {
  if (v === undefined || v === null) return "";
  const s = String(v);
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const text = fs.readFileSync(CSV, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = parseLine(lines[0]).map((h) => h.replace(/^\uFEFF/, "").trim());

const outLines = [headers.join(";")];

for (let L = 1; L < lines.length; L++) {
  const row = parseLine(lines[L]);
  const cleaned = row.map((cell) => stripJapanese(cell));
  const obj = {};
  headers.forEach((h, idx) => (obj[h] = cleaned[idx] ?? ""));
  outLines.push(headers.map((h) => csvEscapeField(obj[h])).join(";"));
}

fs.writeFileSync(CSV, outLines.join("\n") + "\n", "utf8");
console.log("Stripped Japanese from", lines.length - 1, "rows");
