import fs from "fs";

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

const lines = fs.readFileSync("data/one-piece-wiki-fixed.csv", "utf8").split(/\r?\n/).filter(Boolean);
const nh = parseLine(lines[0]).length;
console.log("expected cols", nh);
for (let i = 1; i < lines.length; i++) {
  const n = parseLine(lines[i]).length;
  if (n !== nh) console.log("BAD row", i + 1, "cols", n, parseLine(lines[i])[0]);
}
