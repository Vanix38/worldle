#!/usr/bin/env python3
"""
Ajoute le champ sub_affiliation à data/one-piece.json.
Règle : affiliation principale = équipage/organisation directe, le reste va dans sub_affiliation.
"""
import json
import re

PATH = "data/one-piece.json"

# Termes qui vont typiquement en sub (arcs, catégories larges) — ne pas prendre comme main
SUB_ONLY = {
    "Thriller Bark", "Quatre Mystérieux", "Onze Supernovae", "Onze Supernovae",
    "Skypiea", "Skypiéa", "Marineford", "Enies Lobby", "Impel Down",
    "Dressrosa", "Alabasta", "Zou", "Orange Town", "New Comer Land",
    "Long Ring Long Land", "Water Seven", "Archipel Totto Land",
    "Île des Hommes-Poissons", "Pays des Wa", "Whole Cake", "Punk Hazard",
    "Île d'Egg Head", "Erbaf",
}

# Mots-clés indiquant une affiliation "principale" (équipage, org directe)
MAIN_KEYWORDS = re.compile(
    r"Équipage|Marine|Marines|Famille|Clan|Germa|Baroque|Gouvernement|"
    r"CP-|CP\d|Alliance|Principauté|Shandia|Kujas|Pègre|Révolutionnaires|"
    r"Cross Guild|Orochi|Shandia|Galley-La|Baratie|MADS|SWORD",
    re.I
)


def pick_main_affiliation(parts):
    """Choisit l'affiliation principale parmi les parts (trimmed)."""
    parts = [p.strip() for p in parts if p.strip()]
    if not parts:
        return "", []
    if len(parts) == 1:
        return parts[0], []

    # D'abord : une part qui matche les mots-clés "main"
    for p in parts:
        if MAIN_KEYWORDS.search(p):
            sub = [x for x in parts if x != p]
            return p, sub

    # Sinon : première part qui n'est pas dans SUB_ONLY
    for p in parts:
        if p not in SUB_ONLY:
            sub = [x for x in parts if x != p]
            return p, sub

    # Tout est "sub_only" : première = main, reste = sub
    return parts[0], parts[1:]


def main():
    with open(PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    # Ordre des clés : sub_affiliation juste après affiliation
    KEY_ORDER = ["id", "name", "aliases", "affiliation", "sub_affiliation", "age", "arc", "bounty",
                 "devilFruitType", "gender", "haki", "imageUrl", "origin", "size"]

    for char in data.get("characters", []):
        aff = char.get("affiliation", "")
        if not aff:
            char["sub_affiliation"] = []
        else:
            parts = [p.strip() for p in aff.split(",") if p.strip()]
            main_aff, sub_aff = pick_main_affiliation(parts)
            char["affiliation"] = main_aff
            char["sub_affiliation"] = sub_aff

    # Réordonner les clés pour mettre sub_affiliation après affiliation
    for char in data.get("characters", []):
        ordered = {}
        for k in KEY_ORDER:
            if k in char:
                ordered[k] = char[k]
        for k, v in char.items():
            if k not in ordered:
                ordered[k] = v
        char.clear()
        char.update(ordered)

    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("OK: sub_affiliation ajouté, affiliation principale mise à jour.")


if __name__ == "__main__":
    main()
