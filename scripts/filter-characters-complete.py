#!/usr/bin/env python3
"""
Supprime du JSON les personnages qui n'ont pas les champs suivants renseignés :
age (non 0), affiliation, taille (size), origine (origin).
Seuls les personnages avec ces 4 champs complétés sont conservés.

Usage:
  python scripts/filter-characters-complete.py [--dry-run] [--output PATH]
  --dry-run : affiche combien seraient supprimés sans modifier le fichier
  --output  : écrit dans un autre fichier (défaut : écrase data/one-piece.json)
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "one-piece.json"


def is_completed(value, key: str) -> bool:
    """True si le champ est considéré comme renseigné (non vide, age > 0)."""
    if value is None:
        return False
    if key == "age":
        try:
            n = int(value)
            return n > 0
        except (TypeError, ValueError):
            return False
    if key == "affiliation" or key == "origin":
        return bool(str(value).strip())
    if key == "size":
        if isinstance(value, (int, float)):
            return value != 0
        return bool(str(value).strip())
    return False


def character_has_required_fields(char: dict) -> bool:
    """True si le personnage a age, affiliation, size et origin tous renseignés."""
    return (
        is_completed(char.get("age"), "age")
        and is_completed(char.get("affiliation"), "affiliation")
        and is_completed(char.get("size"), "size")
        and is_completed(char.get("origin"), "origin")
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Supprimer les personnages sans age, affiliation, taille et origine renseignés."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Ne pas modifier le fichier, seulement afficher les stats",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Fichier de sortie (défaut : écraser le JSON source)",
    )
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=JSON_PATH,
        help="Fichier JSON source (défaut: data/one-piece.json)",
    )
    args = parser.parse_args()

    with open(args.input, encoding="utf-8") as f:
        data = json.load(f)

    characters = data.get("characters", [])
    kept = [c for c in characters if character_has_required_fields(c)]
    removed = len(characters) - len(kept)

    print(f"Total personnages : {len(characters)}")
    print(f"Conservés (age, affiliation, taille, origine renseignés) : {len(kept)}")
    print(f"Supprimés : {removed}")

    if args.dry_run:
        print("(dry-run : aucun fichier modifié)")
        return

    out_path = args.output or args.input
    data["characters"] = kept
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Fichier écrit : {out_path}")


if __name__ == "__main__":
    main()
