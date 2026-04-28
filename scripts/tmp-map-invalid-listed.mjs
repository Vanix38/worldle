import fs from "node:fs";
import path from "node:path";

const dataPath = "d:/worlddle/data/marvel-cineverse.json";
const list = [
  "ben_grimm.jpeg","blackagar_boltagon.webp","captain_britain.png","captain_carter.png","cassie-webb.jpg","charles_xavier.jpg","charles-xavier.jpg","daisy-johnson-aos.jpg","deadpool-fox.jpg","doctor-doom-fox.jpg","doreen-green.png","eddie_brock.jpg","eddie_brock.png","eddie-brock.webp","elektra_natchios.png","erik_lehnsherr.jpg","erik-lehnsherr.png","grant-ward-aos.jpg","green-goblin-webb.png","gwen_stacy.png","hank-mccoy.png","harry_osborn.png","harry_osborn.webp","howard-stark-aos.jpg","jean-grey.jpg","jemma-simmons-aos.jpg","johnny_storm.png","killmonger-king-mcu.jpg","kitty-pryde.jpg","kraven-ssu.jpg","kurt-wagner.jpg","leo-fitz-aos.jpg","logan-fox.jpg","logan.jpg","mack-aos.jpg","matt_murdock.jpg","maximus-aos.jpg","may_parker.png","medusa-aos.jpg","melinda-may-aos.jpg","michael-morbius.jpg","negasonic-fox.jpg","peggy-carter-aos.jpg","peter_parker.jpg","phil-coulson-aos.jpg","piotr-rasputin.png","raven-darkholme-fox.jpg","raven-darkholme.jpg","reed_richards.png","robbie-reyes-aos.jpg","shriek.jpg","silver-sable.png","stephen_strange.jpg","sue_storm.png","sylvie-mcu.png","t_challa.jpg","thor_odinson.jpg","venom.jpg","venom.png","victor-von-doom-fox.jpg","yo-yo-rodriguez-aos.png","zombie-strange-mcu.jpg"
];

const toSlug = (value, separator = "-") =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`${separator}+`, "g"), separator)
    .replace(new RegExp(`^${separator}|${separator}$`, "g"), "");
const toNameSlug = (value) => toSlug(value, "_");
const uni = (v) => {
  const raw = toSlug(v);
  return raw.replace(/^(terre|earth)-?/, "") || raw;
};

const json = JSON.parse(fs.readFileSync(dataPath, "utf8").replace(/^\uFEFF/, ""));
const byKey = new Map();
for (const c of json.characters || []) {
  const expected = `${toNameSlug(c.name)}-${toSlug(c.univers)}-${uni(c.earth)}`;
  const keys = new Set([
    toSlug(c.id, "_"),
    toSlug(c.name, "_"),
    toSlug(c.name, "-"),
  ]);
  for (const a of c.aliases || []) {
    keys.add(toSlug(a, "_"));
    keys.add(toSlug(a, "-"));
  }
  for (const k of keys) {
    if (!k) continue;
    if (!byKey.has(k)) byKey.set(k, new Set());
    byKey.get(k).add(expected);
  }
}

for (const file of list) {
  const ext = path.extname(file);
  const base = path.basename(file, ext).toLowerCase();
  const cleaned = base.replace(/_terre_[a-z0-9-]+/g, "").replace(/-terre-[a-z0-9-]+/g, "");
  const candidates = new Set([
    ...(byKey.get(base) || []),
    ...(byKey.get(cleaned) || []),
    ...(byKey.get(base.replace(/-/g, "_")) || []),
    ...(byKey.get(base.replace(/_/g, "-")) || []),
    ...(byKey.get(base.replace(/-(mcu|fox|aos|ssu|webb|raimi|spider|independants).*$/, "")) || []),
    ...(byKey.get(base.replace(/_(mcu|fox|aos|ssu|webb|raimi|spider|independants).*$/, "")) || []),
  ]);
  console.log(`${file} => ${[...candidates].join(" | ")}`);
}
