#!/usr/bin/env python3
"""Add different versions/variants of MCU characters (Loki variants, Kang, recasts, What If, Illuminati)."""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Format: (id, name, world)
# Personnages MCU qui existent en plusieurs versions
MCU_VARIANTS = [
    # Loki - Série Loki (variants)
    ("sylvie-mcu", "Sylvie", "MCU"),
    ("president-loki-mcu", "President Loki", "MCU"),
    ("classic-loki-mcu", "Classic Loki", "MCU"),
    ("kid-loki-mcu", "Kid Loki", "MCU"),
    ("alligator-loki-mcu", "Alligator Loki", "MCU"),
    ("boastful-loki-mcu", "Boastful Loki", "MCU"),
    # Kang / He Who Remains
    ("he-who-remains-mcu", "He Who Remains", "MCU"),
    ("kang-the-conqueror-mcu", "Kang the Conqueror", "MCU"),
    ("victor-timely-mcu", "Victor Timely", "MCU"),
    # Gamora 2014 (timeline passée, Endgame)
    ("gamora-2014-mcu", "Gamora (2014)", "MCU"),
    # Multiverse of Madness - Illuminati (Earth-838)
    ("captain-carter-mcu", "Captain Carter", "MCU"),
    ("strange-supreme-mcu", "Strange Supreme", "MCU"),
    ("baron-mordo-838-mcu", "Baron Mordo", "MCU"),
    ("reed-richards-838-mcu", "Reed Richards", "MCU"),
    ("black-bolt-838-mcu", "Black Bolt", "MCU"),
    ("charles-xavier-838-mcu", "Charles Xavier", "MCU"),
    ("maria-rambeau-838-mcu", "Maria Rambeau", "MCU"),
    # What If...?
    ("party-thor-mcu", "Party Thor", "MCU"),
    ("tchalla-star-lord-mcu", "T'Challa", "MCU"),
    ("zombie-strange-mcu", "Zombie Strange", "MCU"),
    ("killmonger-king-mcu", "Erik Killmonger", "MCU"),
]

def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    existing_ids = {c["id"] for c in data["characters"]}
    added = 0
    for cid, name, univers in MCU_VARIANTS:
        if cid in existing_ids:
            continue
        data["characters"].append({"id": cid, "name": name, "world": world})
        existing_ids.add(cid)
        added += 1
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Added {added} MCU variants.")

if __name__ == "__main__":
    main()
