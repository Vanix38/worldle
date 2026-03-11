#!/usr/bin/env python3
"""
Corrige les fiches mélangées et les erreurs ciblées dans marvel-cineverse.json :
- Suppression de cassie-webb, apocalypse (fiches incorrectes/dupliquées)
- Correction shriek (species, gender)
- Correction sergei-kravinoff (species)
"""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# IDs à supprimer (fiches mélangées ou dupliquées)
REMOVE_IDS = {"cassie-webb", "apocalypse"}

# Corrections ciblées par champ
CHARACTER_FIXES = {
    "shriek": {
        "species": "Human (mutant)",
        "gender": "Female",
    },
    "sergei-kravinoff": {
        "species": "Human",
    },
    "anne-weying": {
        "gender": "Female",
        "acteur": "Michelle Williams",
    },
    "rogue": {
        "gender": "Female",
    },
}


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    chars = data["characters"]
    original_count = len(chars)

    # Supprimer les entrées incorrectes
    data["characters"] = [c for c in chars if c.get("id") not in REMOVE_IDS]
    removed = original_count - len(data["characters"])
    if removed:
        print(f"Supprimé: {REMOVE_IDS & {c['id'] for c in chars}}")

    # Appliquer les corrections ciblées
    for char in data["characters"]:
        cid = char.get("id", "")
        fixes = CHARACTER_FIXES.get(cid)
        if fixes:
            for key, val in fixes.items():
                char[key] = val
            print(f"Corrigé {cid}: {fixes}")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Terminé. {removed} entrées supprimées, corrections appliquées.")


if __name__ == "__main__":
    main()
