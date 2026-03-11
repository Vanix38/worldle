#!/usr/bin/env python3
"""
Normalise les champs gender et status vers l'anglais (Male/Female, Alive/Deceased, etc.).
"""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

GENDER_NORMALIZE = {
    "Homme": "Male",
    "Femme": "Female",
    "Inconnu": "Unknown",
}

STATUS_NORMALIZE = {
    "Mort": "Deceased",
    "Vivant": "Alive",
    "Inconnu": "Unknown",
    "Décédé": "Deceased",
}


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for char in data.get("characters", []):
        changed = False

        gender = char.get("gender")
        if gender and gender in GENDER_NORMALIZE:
            char["gender"] = GENDER_NORMALIZE[gender]
            changed = True

        status = char.get("status")
        if status and status in STATUS_NORMALIZE:
            char["status"] = STATUS_NORMALIZE[status]
            changed = True

        if changed:
            count += 1
            print(f"  {char.get('id')}: gender={gender}->{char.get('gender')}, status={status}->{char.get('status')}")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Terminé. {count} personnages normalisés.")


if __name__ == "__main__":
    main()
