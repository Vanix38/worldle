#!/usr/bin/env python3
"""
Fusionne les alias dans data/one-piece.json :
- Récupère les alias depuis one-piece.json.bak (par id) si présents.
- Ajoute une liste complémentaire pour empereurs, supernovas, surnoms courants.
- La recherche du site matche déjà sur le champ aliases (lib/game.ts).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRENT_JSON = ROOT / "data" / "one-piece.json"
BACKUP_JSON = ROOT / "data" / "one-piece.json.bak"

# Alias complémentaires (surnoms, titres) pour que "empereur", "chapeau de paille", etc. trouvent les bons persos
CURATED_ALIASES: dict[str, list[str]] = {
    "monkey-d-luffy": [
        "Chapeau de paille",
        "Mugiwara",
        "Petit Fils de Garp",
        "Fils de Dragon",
        "Supernova",
        "Empereur",
        "5e Empereur",
    ],
    "charlotte-linlin": [
        "Big Mom",
        "Empereur",
    ],
    "kaidou": [
        "Kaido",
        "Empereur",
        "Ogre des cent bêtes",
    ],
    "shanks": [
        "Empereur",
        "Roux",
    ],
    "marshall-d-teach": [
        "Barbe Noire",
        "Teach",
        "Empereur",
    ],
    # Supernovas (pour recherche "supernova")
    "eustass-kid": ["Supernova", "Captain Kid"],
    "trafalgar-law": ["Supernova", "Surgeon of Death"],
    "basil-hawkins": ["Supernova"],
    "scratchmen-apoo": ["Supernova"],
    "x-drake": ["Supernova"],
    "jewelry-bonney": ["Supernova"],
    "capone-bege": ["Supernova", "Gang Bege", "Fire Tank"],
    "killer": ["Supernova", "Massacre Soldier"],
    "roronoa-zoro": ["Chasseur de pirates", "Roronoa Zoro"],
    "vinsmoke-sanji": ["Sanji", "Black Leg"],
    "nico-robin": ["Enfant du démon"],
    "donquichotte-doflamingo": ["Joker", "Ancien seigneur de guerre", "Doflamingo"],
    "dracule-mihawk": ["Plus grand escrimeur du monde", "Hawk Eyes"],
    "gecko-moria": ["Seigneur de guerre"],
    "crocodile": ["Mr. 0", "Seigneur de guerre"],
    "bartholomew-kuma": ["PX-0", "Cyborg", "Tyran"],
    "baggy": ["Clown", "Seigneur de guerre"],
    "borsalino": ["Kizaru", "Amiral"],
    "aramaki": ["Ryokugyu", "Amiral"],
    "issho": ["Fujitora", "Amiral"],
}


def main() -> None:
    with open(CURRENT_JSON, encoding="utf-8") as f:
        data = json.load(f)

    # Alias depuis le backup (id -> list)
    backup_aliases: dict[str, list[str]] = {}
    if BACKUP_JSON.exists():
        with open(BACKUP_JSON, encoding="utf-8") as f:
            backup = json.load(f)
        for char in backup.get("characters", []):
            cid = char.get("id")
            aliases = char.get("aliases")
            if cid and aliases and isinstance(aliases, list):
                backup_aliases[cid] = [str(a).strip() for a in aliases if a]

    # Ordre des clés pour un personnage : id, name, aliases, puis le reste
    base_keys = ["id", "name", "aliases"]
    all_keys = set()
    for char in data["characters"]:
        all_keys.update(char.keys())
    other_keys = sorted(k for k in all_keys if k not in base_keys)
    desired_order = base_keys + other_keys

    updated = 0
    for char in data["characters"]:
        cid = char.get("id", "")
        from_backup = backup_aliases.get(cid, [])
        from_curated = CURATED_ALIASES.get(cid, [])
        combined: list[str] = []
        seen: set[str] = set()
        for a in from_backup + from_curated:
            key = a.strip().lower()
            if a.strip() and key not in seen:
                seen.add(key)
                combined.append(a.strip())
        char["aliases"] = combined
        if combined:
            updated += 1
        # Réordonner les clés
        ordered = {k: char[k] for k in desired_order if k in char}
        for k in char:
            if k not in ordered:
                ordered[k] = char[k]
        char.clear()
        char.update(ordered)

    with open(CURRENT_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Aliases fusionnés : {updated} personnages avec au moins un alias.")
    print("Ex. 'empereur' -> Luffy, Kaido, Big Mom, Shanks, Barbe Noire, etc.")


if __name__ == "__main__":
    main()
