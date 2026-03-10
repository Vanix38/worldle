const fs = require("fs");
const path = require("path");

const dataPath = path.join(__dirname, "..", "data", "one-piece.json");
const data = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

/** Parse size string to meters. */
function parseSizeToMeters(val) {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  const s = String(val ?? "").trim().replace(",", ".");
  if (!s) return 0;
  const cmMatch = s.match(/^(\d+(?:\.\d+)?)\s*cm$/i);
  if (cmMatch) return parseFloat(cmMatch[1]) / 100;
  const mTwoMatch = s.match(/^(\d+)\s*m\s*(\d{1,2})$/i) || s.match(/^(\d+)m(\d{1,2})$/i);
  if (mTwoMatch) return parseInt(mTwoMatch[1], 10) + parseInt(mTwoMatch[2], 10) / 100;
  const mOneMatch = s.match(/^(\d+(?:\.\d+)?)\s*m?\s*$/i);
  if (mOneMatch) return parseFloat(mOneMatch[1]);
  const num = parseFloat(s);
  return Number.isNaN(num) ? 0 : num;
}

for (const char of data.characters) {
  if (char.size !== undefined) {
    const meters = typeof char.size === "number" ? char.size : parseSizeToMeters(char.size);
    char.size = Math.round(meters * 100);
  }
}

fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
console.log("Converted", data.characters.length, "characters' size to cm.");
