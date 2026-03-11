#!/usr/bin/env python3
"""
Ajoute le numéro de Terre au nom des personnages qui apparaissent plusieurs fois
dans la base (ex: Spider-Man (Terre-199999), Spider-Man (Terre-96283)).
"""
import json
from collections import defaultdict
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    # Trouver les noms en doublon
    by_name = defaultdict(list)
    for i, c in enumerate(data["characters"]):
        by_name[c["name"]].append((i, c.get("univers", 0)))

    dupes = {k: v for k, v in by_name.items() if len(v) > 1}
    updated = 0

    for name, indices in dupes.items():
        for idx, univers in indices:
            char = data["characters"][idx]
            # Ne pas ajouter si déjà présent (éviter doublon)
            if f"(Terre-{univers})" in char["name"] or f"(Earth-{univers})" in char["name"]:
                continue
            char["name"] = f"{char['name']} (Terre-{univers})"
            updated += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Done. {updated} noms mis à jour avec le numéro de Terre.")


if __name__ == "__main__":
    main()
