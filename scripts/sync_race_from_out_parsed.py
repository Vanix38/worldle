#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Remplit ou met à jour le champ race de chaque personnage dans data/one-piece.json
à partir des fichiers out_parsed/. La race peut être dans les catégories ou
écrite dans l'intro, les sections ou le raw_wikitext (pas forcément dans un champ dédié).

Sources : catégories (Catégorie:Humains, Hommes-Poissons, Minks, etc.) puis
recherche dans le texte (intro, sections, raw_wikitext).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JSON = ROOT / "data" / "one-piece.json"
OUT_PARSED_DIR = ROOT / "out_parsed"

# Catégories wiki (exact) -> valeur race dans notre JSON
CATEGORY_TO_RACE = {
    "humains": "Humain",
    "hommes-poissons": "Homme-Poisson",
    "minks": "Minks",
    "géants": "Géant",
    "lunariens": "Lunarien",
    "buccaneers": "Boucanier",
    "skypieiens": "Skypieien",
    "cyborgs": "Cyborg",
    "sirènes": "Sirène",
    "longues-jambes": "Longues-Jambes",
    "trois-yeux": "Trois Yeux",
    "tontattas": "Tontatta",
    "koroshians": "Koroshian",
    "kujas": "Kuja",
    "dieux": "Dieu",  # Brook catégorie "Dieux" (squelette)
}

# Patterns dans le texte (ordre de priorité : plus spécifique en premier)
# (pattern regex, race)
TEXT_RACE_PATTERNS = [
    (re.compile(r"Homme-Poisson|hommes-poissons", re.I), "Homme-Poisson"),
    (re.compile(r"est une sirène|sirène|sirènes", re.I), "Sirène"),
    (re.compile(r"tribu des minks|mink\s|minks\s|ours polaire.*mink", re.I), "Minks"),
    (re.compile(r"est un géant|géants\s|géante", re.I), "Géant"),
    (re.compile(r"lunarien|lunariens", re.I), "Lunarien"),
    (re.compile(r"boucanier|buccaneer", re.I), "Boucanier"),
    (re.compile(r"skypieien|skypieiens", re.I), "Skypieien"),
    (re.compile(r"cyborg", re.I), "Cyborg"),
    (re.compile(r"longues-jambes|longue-jambes", re.I), "Longues-Jambes"),
    (re.compile(r"tribu des (?:trois yeux|trois-yeux)|trois yeux", re.I), "Trois Yeux"),
    (re.compile(r"tontatta|tontattas", re.I), "Tontatta"),
    (re.compile(r"koroshian", re.I), "Koroshian"),
    (re.compile(r"kuja\s|tribu kuja", re.I), "Kuja"),
    (re.compile(r"zombie|soldat zombie", re.I), "Zombie"),
    (re.compile(r"squelette|mort-vivant", re.I), "Humain"),  # Brook = humain (squelette)
    (re.compile(r"homie|homies", re.I), "Homie"),
    (re.compile(r"araignée|race.*araignée", re.I), "Araignée"),
]


def id_to_stems(char_id: str) -> list[str]:
    """Retourne les stems de fichier possibles (ex: who-s-who -> who_s_who, who_s-who)."""
    s = char_id.replace("-", "_")
    stems = [s]
    if "_" in s and "-" in char_id:
        parts = s.split("_")
        if len(parts) >= 2:
            stems.append(parts[0] + "_" + "-".join(parts[1:]))
    return stems


def normalize_category(cat: str) -> str:
    """Normalise le nom de catégorie pour la recherche (minuscules, espaces -> tirets)."""
    return cat.strip().lower().replace(" ", "-").replace("'", "")


def extract_race_from_categories(categories: list[str]) -> str | None:
    """Retourne la race si une catégorie connue correspond."""
    for cat in categories:
        key = normalize_category(cat)
        if key in CATEGORY_TO_RACE:
            return CATEGORY_TO_RACE[key]
    return None


def extract_race_from_text(text: str) -> str | None:
    """Retourne la première race trouvée via les patterns texte."""
    if not text:
        return None
    for pattern, race in TEXT_RACE_PATTERNS:
        if pattern.search(text):
            return race
    return None


def get_full_text(parsed: dict) -> str:
    """Assemble intro + raw_wikitext + contenu des sections pour la recherche."""
    parts = [
        parsed.get("intro") or "",
        parsed.get("raw_wikitext") or "",
    ]
    for sec in parsed.get("sections", []):
        parts.append(sec.get("content") or "")
    return "\n".join(parts)


def extract_race_from_infobox(infobox: dict) -> str | None:
    """Si l'infobox contient race ou espèce, on le mappe vers notre format."""
    for key in ("race", "espèce", "espece"):
        val = (infobox.get(key) or "").strip()
        if not val:
            continue
        # Nettoyer le wikitexte basique ([[X]] -> X)
        def repl_link(m):
            return (m.group(2) or m.group(1)).strip()
        val = re.sub(r"\[\[([^\]|]+)\|?([^\]]*)\]\]", repl_link, val)
        val = re.sub(r"\{\{[^}]*\}\}", "", val).strip()
        if val:
            # Normaliser quelques variantes courantes
            v = val.lower()
            if "homme-poisson" in v or "hommes-poissons" in v:
                return "Homme-Poisson"
            if "mink" in v:
                return "Minks"
            if "géant" in v or "geant" in v:
                return "Géant"
            if "humain" in v:
                return "Humain"
            if "lunarien" in v:
                return "Lunarien"
            if "skypieien" in v:
                return "Skypieien"
            if "sirène" in v or "sirene" in v:
                return "Sirène"
            if "cyborg" in v:
                return "Cyborg"
            if "zombie" in v:
                return "Zombie"
            # Sinon on garde la valeur capitalisée
            return val.strip()
    return None


def main():
    with open(DATA_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    missing = 0
    default_humain = 0

    for char in data.get("characters", []):
        char_id = char.get("id", "")
        if not char_id:
            continue
        parsed = None
        for stem in id_to_stems(char_id):
            path = OUT_PARSED_DIR / f"{stem}.json"
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        parsed = json.load(f)
                    break
                except Exception:
                    pass
        if not parsed:
            missing += 1
            if "race" not in char or not char.get("race"):
                char["race"] = "Humain"
            continue

        infobox = parsed.get("infobox") or {}
        categories = parsed.get("categories") or []
        full_text = get_full_text(parsed)

        new_race = extract_race_from_infobox(infobox)
        if not new_race:
            new_race = extract_race_from_categories(categories)
        if not new_race:
            new_race = extract_race_from_text(full_text)
        if not new_race:
            new_race = "Humain"
            default_humain += 1

        old_race = char.get("race", "")
        if old_race != new_race:
            char["race"] = new_race
            updated += 1
        elif "race" not in char:
            char["race"] = new_race
            updated += 1

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"OK: race mise à jour ou ajoutée pour {updated} personnages. Défaut Humain: {default_humain}. Fichiers manquants: {missing}")


if __name__ == "__main__":
    main()
