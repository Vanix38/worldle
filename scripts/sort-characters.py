#!/usr/bin/env python3
"""Tri des personnages dans data/one-piece.json par ordre alphabétique (nom)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "one-piece.json"


def main() -> None:
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    characters = data.get("characters", [])
    if not characters:
        print("Aucun personnage trouvé.")
        return

    # Tri par nom (insensible à la casse, ordre alphabétique)
    data["characters"] = sorted(characters, key=lambda c: (c.get("name") or "").lower())

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"{len(data['characters'])} personnages triés par ordre alphabétique dans {JSON_PATH}")


if __name__ == "__main__":
    main()
