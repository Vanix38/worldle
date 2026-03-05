#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Met à jour le champ haki de chaque personnage dans data/one-piece.json
à partir des catégories (et éventuellement de la section Haki) des fichiers
dans out_parsed/.

Règles :
- Catégorie "Utilisateurs du Haki de l'armement" -> Armement
- Catégorie "Utilisateurs du Haki de l'observation" -> Observation
- Catégorie "Utilisateurs du Haki des rois" ou "des Rois" -> des Rois
- Ordre de sortie : Armement, Observation, des Rois
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JSON = ROOT / "data" / "one-piece.json"
OUT_PARSED_DIR = ROOT / "out_parsed"

# Catégories wiki -> libellé dans notre JSON
CATEGORY_TO_HAKI = {
    "utilisateurs du haki de l'armement": "Armement",
    "utilisateurs du haki de l'observation": "Observation",
    "utilisateurs du haki des rois": "des Rois",
}
ORDER = ["Armement", "Observation", "des Rois"]


def id_to_parsed_stem(char_id: str) -> str:
    """Convertit l'id du JSON (ex: boa-hancock) en stem du fichier out_parsed (ex: boa_hancock)."""
    return char_id.replace("-", "_")


def extract_haki_from_parsed(parsed: dict) -> list:
    """
    Extrait la liste des types de haki depuis un fichier out_parsed.
    Source principale : catégories. Complément : section "Haki" si présente.
    """
    found = set()

    # 1) Catégories
    for cat in parsed.get("categories", []):
        cat_lower = cat.strip().lower()
        if cat_lower in CATEGORY_TO_HAKI:
            found.add(CATEGORY_TO_HAKI[cat_lower])

    # 2) Section "Haki" dans sections (texte peut mentionner les types)
    for sec in parsed.get("sections", []):
        title = (sec.get("title") or "").strip()
        if title and "haki" in title.lower():
            content = (sec.get("content") or "").lower()
            if "armement" in content or "busoshoku" in content:
                found.add("Armement")
            if "observation" in content or "kenbunshoku" in content:
                found.add("Observation")
            if "rois" in content or "haoshoku" in content or "royal" in content:
                found.add("des Rois")
            break

    # 3) Intro / raw_wikitext si pas de catégories (ex: page avec seulement [[Catégorie:...]])
    if not found:
        raw = (parsed.get("intro") or "") + "\n" + (parsed.get("raw_wikitext") or "")
        raw_lower = raw.lower()
        if "haki de l'armement" in raw_lower or "haki de l\'armement" in raw_lower:
            found.add("Armement")
        if "haki de l'observation" in raw_lower or "haki de l\'observation" in raw_lower:
            found.add("Observation")
        if "haki des rois" in raw_lower or "haoshoku" in raw_lower:
            found.add("des Rois")

    ordered = [x for x in ORDER if x in found]
    return ordered


def main():
    with open(DATA_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    missing_file = 0
    for char in data.get("characters", []):
        char_id = char.get("id", "")
        if not char_id:
            continue
        stem = id_to_parsed_stem(char_id)
        path = OUT_PARSED_DIR / f"{stem}.json"
        if not path.exists():
            missing_file += 1
            continue
        try:
            with open(path, "r", encoding="utf-8") as f:
                parsed = json.load(f)
        except Exception:
            continue
        new_haki = extract_haki_from_parsed(parsed)
        old_haki = char.get("haki")
        if isinstance(old_haki, list):
            old_set = set(old_haki)
        else:
            old_set = set()
        new_set = set(new_haki)
        if new_set != old_set:
            char["haki"] = new_haki
            updated += 1

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"OK: {updated} personnages mis à jour (haki). Fichiers out_parsed absents: {missing_file}")


if __name__ == "__main__":
    main()
