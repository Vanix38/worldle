#!/usr/bin/env python3
"""
Transforme le champ haki (string) en tableau dans data/one-piece.json.
Ex: "Armement, Observation, des rois" -> ["Armement", "Observation", "des rois"]
    "" -> []
"""
import json

PATH = "data/one-piece.json"


def main():
    with open(PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    for char in data.get("characters", []):
        val = char.get("haki")
        if isinstance(val, list):
            continue
        if isinstance(val, str):
            char["haki"] = [s.strip() for s in val.split(",") if s.strip()]
        else:
            char["haki"] = []

    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print("OK: champ haki converti en tableau.")


if __name__ == "__main__":
    main()
