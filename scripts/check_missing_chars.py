# -*- coding: utf-8 -*-
"""
Compare out_parsed characters with data/one-piece.json and list which
characters from out_parsed can be added (have all required fields).
Required: nom, affiliation, age, arc (première), genre, origine, taille, race
"""

import json
import os
import re
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
OP_JSON = BASE / "data" / "one-piece.json"
OUT_PARSED = BASE / "out_parsed"

# Map arc names from "première" chapter refs (simplified)
CHAPTER_TO_ARC = {
    (1, 100): "Romance Dawn",
    (1, 50): "Romance Dawn",
    (51, 100): "Baratie",
    (43, 68): "Baratie",
    (69, 96): "Arlong Park",
    (97, 129): "Loguetown",
    (100, 218): "Arabasta",
    (217, 303): "Jaya",
    (303, 325): "Skypiea",
    (325, 375): "Long Ring Long Land",
    (375, 430): "Water Seven",
    (430, 490): "Enies Lobby",
    (490, 514): "Post-Enies Lobby",
    (514, 525): "Thriller Bark",
    (525, 580): "Thriller Bark",
    (580, 602): "Saboady",
    (602, 653): "Amazon Lily",
    (653, 700): "Impel Down",
    (700, 722): "Marine Ford",
    (722, 730): "Post-Guerre",
    (730, 802): "Retour à Saboady",
    (802, 825): "Île des Hommes-Poissons",
    (825, 903): "Punk Hazard",
    (903, 1058): "Dressrosa",
    (1058, 1100): "Zou",
    (1100, 1200): "Whole Cake Island",
    (917, 1058): "Pays des Wa",
    (971, 1058): "Wano Kuni",
    (621, 653): "Île des Hommes-Poissons",
    (0, 1): "Romance Dawn",
}


def normalize_id(filename):
    """Convert out_parsed filename to id format used in one-piece.json"""
    name = filename.replace(".json", "")
    # Replace _ with -, remove dots
    name = name.replace("_", "-").replace(".", "")
    # Collapse multiple hyphens
    name = re.sub(r"-+", "-", name).strip("-")
    return name.lower()


def extract_arc(premiere_str):
    """Try to extract arc from première string (chapter ref)."""
    if not premiere_str:
        return None
    # Match Chapitre 123 or similar
    m = re.search(r"Chapitre\s*(\d+)", premiere_str, re.I)
    if m:
        ch = int(m.group(1))
        if ch <= 100:
            return "Romance Dawn" if ch < 43 else "Baratie" if ch < 69 else "Arlong Park"
        if ch <= 218:
            return "Arabasta"
        if ch <= 303:
            return "Jaya"
        if ch <= 325:
            return "Skypiea"
        if ch <= 375:
            return "Long Ring Long Land"
        if ch <= 430:
            return "Water Seven"
        if ch <= 490:
            return "Enies Lobby"
        if ch <= 525:
            return "Thriller Bark"
        if ch <= 580:
            return "Saboady"
        if ch <= 602:
            return "Amazon Lily"
        if ch <= 653:
            return "Impel Down"
        if ch <= 722:
            return "Marine Ford"
        if ch <= 802:
            return "Retour à Saboady"
        if ch <= 825:
            return "Île des Hommes-Poissons"
        if ch <= 903:
            return "Punk Hazard"
        if ch <= 1058:
            return "Dressrosa" if ch < 908 else "Zou" if ch < 909 else "Whole Cake Island" if ch < 976 else "Pays des Wa"
        return "Pays des Wa"
    return None


def extract_age(age_str):
    """Extract numeric age from âge string like '65 ans' or '28 ans'."""
    if not age_str:
        return None
    m = re.search(r"(\d+)\s*ans?", str(age_str), re.I)
    if m:
        return int(m.group(1))
    return None


def get_gender_from_categories(categories):
    """Infer genre from categories (Personnages Masculins, Féminins)."""
    if not categories:
        return None
    for c in categories:
        c = (c or "").lower()
        if "masculin" in c or "homme" in c:
            return "Masculin"
        if "féminin" in c or "femme" in c:
            return "Féminin"
    return None


def get_race_from_categories(categories):
    """Infer race from categories."""
    if not categories:
        return None
    race_map = {
        "humains": "Humain",
        "homme-poisson": "Homme-Poisson",
        "hommes-poissons": "Homme-Poisson",
        "sirène": "Sirène",
        "géant": "Géant",
        "nain": "Nain",
        "minks": "Mink",
        "lunarien": "Lunarien",
        "oni": "Oni",
        "cyborg": "Cyborg",
        "zombie": "Zombie",
    }
    for c in categories:
        c_lower = (c or "").lower()
        for key, val in race_map.items():
            if key in c_lower:
                return val
    return None


def clean_wiki_value(v):
    """Strip wiki markup from a value."""
    if not v or not isinstance(v, str):
        return v
    # [[Link|Label]] -> Label, [[Link]] -> Link
    def repl_link(m):
        return (m.group(2) or m.group(1)).strip()
    v = re.sub(r"\[\[([^\]|]+)\|([^\]]*)\]\]", repl_link, v)
    v = re.sub(r"\[\[([^\]]+)\]\]", r"\1", v)
    v = re.sub(r"\{\{[^}]+\}\}", "", v)
    v = re.sub(r"<br\s*/?>", " ", v, flags=re.I)
    v = re.sub(r"<[^>]+>", "", v)
    v = re.sub(r"''+", "", v)
    v = re.sub(r"\s+", " ", v).strip()
    return v[:200] if len(v) > 200 else v


def has_required_fields(data):
    """Check if parsed character has all required fields. Returns (ok, missing_list)."""
    infobox = (data.get("infobox") or {})
    categories = data.get("categories") or []

    nom = infobox.get("nom") or data.get("title")
    affiliation = infobox.get("affiliation")
    age_raw = infobox.get("âge") or infobox.get("age")
    age = extract_age(age_raw) if age_raw else None
    premiere = infobox.get("première") or infobox.get("premiere")
    arc = extract_arc(premiere) if premiere else None
    if not arc and premiere:
        arc = clean_wiki_value(str(premiere))[:80]  # fallback
    genre = get_gender_from_categories(categories)
    if not genre and "statut" in infobox:
        s = str(infobox.get("statut", "")).lower()
        if "vivant" in s or "vivante" in s:
            pass  # can't infer
    origine = infobox.get("origine")
    taille = infobox.get("taille") or infobox.get("size")
    race = get_race_from_categories(categories)

    missing = []
    if not nom:
        missing.append("nom")
    if not affiliation:
        missing.append("affiliation")
    if age is None and not age_raw:
        missing.append("age")
    if not arc and not premiere:
        missing.append("arc (première)")
    # Genre peut être Indéterminé si pas trouvé
    if not genre:
        genre = "Indéterminé"
    # don't add "genre" to missing - we default to Indéterminé
    if not origine:
        missing.append("origine")
    if not taille:
        missing.append("taille")
    if not race:
        missing.append("race")

    return (len(missing) == 0, missing, {
        "nom": nom,
        "affiliation": clean_wiki_value(affiliation) if affiliation else None,
        "age": age,
        "arc": arc,
        "genre": genre or "Indéterminé",
        "origine": clean_wiki_value(origine) if origine else None,
        "taille": clean_wiki_value(taille) if taille else None,
        "race": race,
    })


def main():
    import sys
    out = open(BASE / "scripts" / "rapport_persos_manquants.txt", "w", encoding="utf-8")
    def w(s=""):
        print(s, file=out)
        print(s)
    with open(OP_JSON, "r", encoding="utf-8") as f:
        op = json.load(f)
    existing_ids = { c["id"] for c in op["characters"] }
    # Also build normalized id -> id mapping for out_parsed filenames
    existing_normalized = set()
    for c in op["characters"]:
        existing_normalized.add(c["id"])
        existing_normalized.add(c["id"].replace("-", "_"))

    missing_files = []
    for f in OUT_PARSED.glob("*.json"):
        nid = normalize_id(f.name)
        # Match: exact id, or with underscores instead of hyphens
        if nid in existing_ids:
            continue
        if nid.replace("-", "_") in [e.replace("-", "_") for e in existing_ids]:
            continue
        # Check if any existing id normalizes to same (e.g. trafalgar_d._water_law -> trafalgar-d-water-law)
        file_stem = f.stem.replace("_", "-").replace(".", "")
        file_stem = re.sub(r"-+", "-", file_stem).strip("-").lower()
        found = False
        for eid in existing_ids:
            en = eid.replace("_", "-").replace(".", "")
            en = re.sub(r"-+", "-", en).strip("-").lower()
            if en == file_stem:
                found = True
                break
        if found:
            continue
        missing_files.append(f)

    can_add = []
    cannot_add = []
    for f in sorted(missing_files, key=lambda x: x.stem.lower()):
        try:
            with open(f, "r", encoding="utf-8") as fp:
                data = json.load(fp)
        except Exception as e:
            cannot_add.append((f.stem, ["erreur lecture: " + str(e)]))
            continue
        ok, missing, fields = has_required_fields(data)
        if ok:
            can_add.append((f.stem, fields))
        else:
            cannot_add.append((f.stem, missing, fields))

    # Report: characters that CAN be added (have all required fields)
    w("=== PERSONNAGES À POUVOIR AJOUTER (tous les champs requis présents) ===\n")
    for stem, fields in can_add:
        w(f"  {stem}")
        w(f"    nom: {fields['nom']}")
        w(f"    affiliation: {fields['affiliation']}")
        w(f"    age: {fields['age']}")
        w(f"    arc: {fields['arc']}")
        w(f"    genre: {fields['genre']}")
        w(f"    origine: {fields['origine']}")
        w(f"    taille: {fields['taille']}")
        w(f"    race: {fields['race']}")
        w()
    w(f"Total: {len(can_add)} personnages peuvent être ajoutés.\n")

    # Personnages avec 1 ou 2 champs manquants (à compléter facilement)
    almost = [(x[0], x[1], x[2] if len(x) > 2 else {}) for x in cannot_add if len(x[1]) <= 2]
    w("=== PERSONNAGES PRESQUE COMPLETS (1 ou 2 champs manquants – à compléter) ===")
    for item in sorted(almost, key=lambda x: len(x[1])):
        stem, missing, fields = item[0], item[1], item[2] if isinstance(item[2], dict) else {}
        nom = (fields.get("nom") or stem.replace("_", " ").title()) if fields else stem
        w(f"  {stem} ({nom}) -> manque: {', '.join(missing)}")
    w(f"\n  ... total « presque complets » : {len(almost)}")

    # Optional: show first 30 that cannot be added (missing fields)
    w("\n=== EXEMPLES DE PERSONNAGES MANQUANT BEAUCOUP DE CHAMPS (premiers 25) ===")
    many_missing = [(x[0], x[1]) for x in cannot_add if len(x[1]) > 2]
    for stem, missing in many_missing[:25]:
        w(f"  {stem} -> manque: {', '.join(missing)}")
    w(f"\nTotal dans out_parsed mais pas dans one-piece: {len(missing_files)}")
    w(f"  -> {len(can_add)} avec tous les champs requis (ajoutables tels quels)")
    w(f"  -> {len(almost)} avec 1 ou 2 champs manquants (à compléter)")
    w(f"  -> {len(many_missing)} avec 3+ champs manquants")
    out.close()


if __name__ == "__main__":
    main()
