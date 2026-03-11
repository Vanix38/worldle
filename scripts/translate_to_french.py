#!/usr/bin/env python3
"""
Traduit les champs en anglais du marvel-cineverse.json vers le français.

Usage:
  python scripts/translate_to_french.py [--json PATH] [--dry-run]
"""

import argparse
import json
import re
from pathlib import Path

DEFAULT_JSON = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Traductions littérales (exact match, case-sensitive pour clarté)
STATUS_TRANSLATIONS = {
    "Alive": "Vivant",
    "Deceased": "Décédé",
    "Unknown": "Inconnu",
    "In Custody": "En détention",
    "Existing": "Existant",
    "Alive (In Custody)": "Vivant (en détention)",
    "Alive (revised timeline)": "Vivant (chronologie révisée)",
    "Deceased (Rebuilt as White Vision)": "Décédé (reconstruit en White Vision)",
    "Deceased (original timeline version)<br>Unknown (revised timeline)": "Décédé (chronologie d'origine) / Inconnu (chronologie révisée)",
    "Deceased (original timeline)<br>Unknown (revised timeline)": "Décédé (chronologie d'origine) / Inconnu (chronologie révisée)",
    "Non-existent (original timeline)<br>Alive (revised timeline)": "Inexistant (chronologie d'origine) / Vivant (chronologie révisée)",
    "Unknown (Timeline Erased)": "Inconnu (chronologie effacée)",
    "Unknown (original timeline)<br/>Deceased (revised timeline)": "Inconnu (chronologie d'origine) / Décédé (chronologie révisée)",
    "Unknown (prior to timeline erasure)": "Inconnu (avant effacement de la chronologie)",
}

GENDER_TRANSLATIONS = {
    "Male": "Homme",
    "Female": "Femme",
    "Unknown": "Inconnu",
    "Agender": "Agenre",
    "Agender (masculine traits)": "Agenre (traits masculins)",
    "Fluid": "Fluide",
}

SPECIES_TRANSLATIONS = {
    "Human": "Humain",
    "Mutant": "Mutant",
    "Asgardian": "Asgardien",
    "Cyborg": "Cyborg",
    "Celestial": "Céleste",
    "Eternal": "Éternel",
    "Deviant": "Dévian",
    "Dark Elf": "Elfe sombre",
    "Frost Giant": "Géant de givre",
    "Fire Demon": "Démon de feu",
    "Flora colossus": "Flore colossale",
    "Faltine": "Faltine",
    "Dog": "Chien",
    "Alligator": "Alligator",
    "Ennead": "Ennéade",
    "Fuertona": "Fuertona",
    "Unknown": "Inconnu",
    "Human (Cyborg)": "Humain (cyborg)",
    "Human (cyborg)": "Humain (cyborg)",
    "Human (Enhanced)": "Humain (amélioré)",
    "Human (enhanced)": "Humain (amélioré)",
    "Human (mutant)": "Humain (mutant)",
    "Human (formerly Eternal)": "Humain (anciennement Éternel)",
    "Human (formerly), Artificial Intelligence": "Humain (anciennement), Intelligence artificielle",
    "Human Ghost": "Fantôme humain",
    "Celestial Hybrid": "Hybride céleste",
    "Centaurian (Cyborg)": "Centaurien (cyborg)",
    "Cosmic Entity": "Entité cosmique",
    "Halfworlder (evolved raccoon)": "Halfworlder (raton laveur évolué)",
    "Halfworlder (Evolved Otter)": "Halfworlder (loutre évoluée)",
    "Human Hybrid": "Hybride humain",
    "Human-Celestial Hybrid": "Hybride humain-céleste",
    "Human-Cosmic Entity Hybrid": "Hybride humain-entité cosmique",
    "Human-Kree Hybrid": "Hybride humain-kree",
    "Human/Kree Hybrid": "Hybride humain-kree",
    "Inhuman": "Inhumain",
    "Kree": "Kree",
    "Kree (Cyborg)": "Kree (cyborg)",
    "Kronan": "Kronan",
    "Living Vampire": "Vampire vivant",
    "Living Vampire (formerly Human)": "Vampire vivant (anciennement humain)",
    "Luphomoid (Cyborg)": "Luphomoïde (cyborg)",
    "Mindless One (formerly Human)": "Sans-Esprit (anciennement humain)",
    "Mutant Hybrid": "Hybride mutant",
    "Mutant/Cyborg": "Mutant/cyborg",
    "R'Vaalian": "R'Vaalian",
    "Robot (formerly Artificial Intelligence)": "Robot (anciennement intelligence artificielle)",
    "Sakaaran": "Sakaaran",
    "Skrull": "Skrull",
    "Sovereign": "Souverain",
}

# Mots isolés pour traduction dans species complexes
SPECIES_WORD_MAP = [
    ("Pig body with spider-powers", "corps de cochon avec pouvoirs d'araignée"),
    ("Mutate", "Muté"),
    ("Frog", "Grenouille"),
    ("evolved raccoon", "raton laveur évolué"),
    ("Evolved Otter", "loutre évoluée"),
    ("Artificial Intelligence", "Intelligence artificielle"),
]

# Patterns à remplacer dans n'importe quel champ texte
PATTERN_TRANSLATIONS = [
    (r"\(formerly\)", "(anciennement)"),
    (r"\bformerly\b", "anciennement"),
    (r"\btemporarily\b", "temporairement"),
    (r"\(temporarily\)", "(temporairement)"),
    (r"\bmentioned\b", "mentionné"),
    (r"\(mentioned\)", "(mentionné)"),
    (r"\bdeleted scene\b", "scène supprimée"),
    (r"\(deleted scene\)", "(scène supprimée)"),
    (r"\bmid-credits scene\b", "scène inter-générique"),
    (r"\(mid-credits scene\)", "(scène inter-générique)"),
    (r"\bpre-credits scene\b", "scène avant générique"),
    (r"\(pre-credits scene\)", "(scène avant générique)"),
    (r"\bpost-credits scene\b", "scène post-générique"),
    (r"\(post-credits scene\)", "(scène post-générique)"),
    (r"\bpost-credit scene\b", "scène post-générique"),
    (r"\(post-credit scene\)", "(scène post-générique)"),
    (r"\bflashbacks?\b", "flashbacks"),
    (r"\(flashbacks?\)", "(flashbacks)"),
    (r"\bscenes? deleted\b", "scènes supprimées"),
    (r"\bdeleted scenes?\b", "scènes supprimées"),
    (r"\bphoto(s)?\b", "photo(s)"),
    (r"\b& ", "et "),
    (r"\bunreleased\b", "non sorti"),
    (r"\(unreleased\)", "(non sorti)"),
    (r"\bindirectly\b", "indirectement"),
    (r"\bin newspaper\b", "dans le journal"),
    (r";\s*newspaper\b", "; journal"),
    (r"\(\s*newspaper\b", "(journal"),
    (r"\bpost-credits\)", "post-générique)"),
]


def translate_patterns(text: str) -> str:
    """Applique les remplacements de patterns."""
    if not text or not isinstance(text, str):
        return text
    for pattern, repl in PATTERN_TRANSLATIONS:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text


def translate_status(val: str) -> str:
    return STATUS_TRANSLATIONS.get(val) or translate_patterns(val)


def translate_gender(val: str) -> str:
    # Nettoyer les résidus (ex: FluidLokiTVAFile)
    if "File" in val or "Ref" in val:
        val = re.sub(r"[A-Z][a-z]*[A-Z][A-Za-z]*File$", "", val).strip() or val
    return GENDER_TRANSLATIONS.get(val) or translate_patterns(val)


def translate_species(val: str) -> str:
    if not val:
        return val
    # Match exact d'abord
    if val in SPECIES_TRANSLATIONS:
        return SPECIES_TRANSLATIONS[val]
    # Traduire parties séparées par <br> ou ,
    parts = re.split(r"<br\s*/?>|,\s*", val, flags=re.IGNORECASE)
    result = []
    for p in parts:
        p = p.strip()
        translated = SPECIES_TRANSLATIONS.get(p)
        if translated:
            result.append(translated)
        else:
            # Remplacements partiels
            for eng, fr in SPECIES_WORD_MAP:
                p = p.replace(eng, fr)
            # Patterns génériques
            p = re.sub(r"\bHuman\b", "Humain", p, flags=re.IGNORECASE)
            p = re.sub(r"\bAsgardian\b", "Asgardien", p, flags=re.IGNORECASE)
            p = re.sub(r"\bformerly\b", "anciennement", p, flags=re.IGNORECASE)
            p = re.sub(r"\btemporarily\b", "temporairement", p, flags=re.IGNORECASE)
            result.append(translate_patterns(p))
    return ", ".join(result)


def translate_affiliation(val: str) -> str:
    if val == "Unknown":
        return "Inconnu"
    return translate_patterns(val)


def translate_first_appearance(val: str) -> str:
    if val == "Unknown":
        return "Inconnu"
    return translate_patterns(val)


def translate_character(char: dict) -> dict:
    """Traduit les champs d'un personnage."""
    if char.get("status"):
        char["status"] = translate_status(char["status"])
    if char.get("gender"):
        char["gender"] = translate_gender(char["gender"])
    if char.get("species"):
        char["species"] = translate_species(char["species"])
    if char.get("affiliation"):
        char["affiliation"] = translate_affiliation(char["affiliation"])
    if char.get("firstAppearance"):
        char["firstAppearance"] = translate_first_appearance(char["firstAppearance"])
    return char


def main():
    parser = argparse.ArgumentParser(description="Traduire marvel-cineverse.json en français")
    parser.add_argument("--json", type=str, default=str(DEFAULT_JSON))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    path = Path(args.json)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    for char in data.get("characters", []):
        translate_character(char)

    if not args.dry_run:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Traduction terminée. Écrit dans {path}")
    else:
        print("Dry-run: aucun fichier modifié.")


if __name__ == "__main__":
    main()
