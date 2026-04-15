#!/usr/bin/env node
/**
 * Retire des alias tout libellé contenant (Terre-XXX), ex. "Captain America (Terre-616)".
 */
const fs = require("fs");
const path = require("path");

const JSON_PATH = path.join(__dirname, "..", "data", "marvel-cineverse.json");
const TERRE_IN_ALIAS = /\(Terre-[^)]+\)/;

function main() {
  const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));
  let removed = 0;
  let charsTouched = 0;

  for (const c of data.characters || []) {
    if (!Array.isArray(c.aliases)) continue;
    const before = c.aliases.length;
    c.aliases = c.aliases.filter((a) => {
      if (typeof a !== "string") return true;
      if (TERRE_IN_ALIAS.test(a)) {
        removed++;
        return false;
      }
      return true;
    });
    if (c.aliases.length !== before) charsTouched++;
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ aliasesRemoved: removed, charactersTouched: charsTouched }, null, 2));
}

main();
