# -*- coding: utf-8 -*-
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
JSON_PATH = BASE / "data" / "one-piece.json"
OUT_PATH = BASE / "data" / "affiliations_extract.txt"

with open(JSON_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

aff = set()
sub = set()
for c in data["characters"]:
    a = c.get("affiliation", "").strip()
    if a:
        aff.add(a)
    for s in c.get("sub_affiliation", []) or []:
        if s and s.strip():
            sub.add(s.strip())

lines = [
    "# Extract des affiliations – data/one-piece.json",
    "# Généré à partir de tous les personnages du fichier",
    "",
    "=" * 80,
    "AFFILIATIONS (principales) – valeurs uniques",
    "=" * 80,
    "",
]
lines.extend(sorted(aff))
lines.extend(["", "", "=" * 80, "SUB_AFFILIATIONS – valeurs uniques (toutes sous-affiliations confondues)", "=" * 80, ""])
lines.extend(sorted(sub))
lines.append("")

with open(OUT_PATH, "w", encoding="utf-8") as out:
    out.write("\n".join(lines))

print(f"Écrit: {len(aff)} affiliations, {len(sub)} sub_affiliations -> {OUT_PATH}")
