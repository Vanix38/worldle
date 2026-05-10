const SIL_PAREN = String.raw`\([^)]*\bsilhouette\b[^)]*\)`;
const patterns = [
  new RegExp(String.raw`Chapter\s+\d+\s*;\s*Episode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
  new RegExp(String.raw`Chapitre\s+\d+\s*;\s*Épisode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
  new RegExp(String.raw`Chapitre\s+\d+\s*;\s*Episode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
  new RegExp(String.raw`Episode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
  new RegExp(String.raw`Épisode\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
  new RegExp(String.raw`Chapter\s+\d+\s*${SIL_PAREN}\s*;?\s*`, "gi"),
  new RegExp(String.raw`Chapitre\s+\d+\s*${SIL_PAREN}\s*`, "gi"),
];

function strip(s) {
  let prev;
  do {
    prev = s;
    for (const re of patterns) s = s.replace(re, "");
    s = s.replace(/;\s*;/g, "; ");
    s = s.replace(/^\s*;\s*|\s*;\s*$/g, "");
    s = s.replace(/\s{2,}/g, " ");
  } while (s !== prev);
  return s.trim();
}

const tests = [
  'Chapter 159; Episode 95 (silhouette);Chapter 234; Episode 151 (full)',
  'Chapter 860; Episode 828 (silhouette); Episode 830 (actual)',
  'Chapter 977; Episode 954 (silhouette); Episode 982 (actual)',
];
for (const t of tests) console.log(t, "=>", strip(t));
