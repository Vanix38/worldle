#!/usr/bin/env python3
"""Exporte les noms des personnages de data/one-piece.json vers un CSV (un par ligne)."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "one-piece.json"
CSV_PATH = ROOT / "data" / "one-piece-names.csv"


def main() -> None:
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    characters = data.get("characters", [])
    names = [c.get("name", "").strip() for c in characters if c.get("name")]

    with open(CSV_PATH, "w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["name"])
        for name in names:
            writer.writerow([name])

    print(f"{len(names)} noms exportés vers {CSV_PATH}")


if __name__ == "__main__":
    main()
