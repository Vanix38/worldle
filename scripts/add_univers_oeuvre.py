#!/usr/bin/env python3
"""Add 'world' to each character in marvel-cineverse.json."""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

DEFENDERS_IDS = {
    "matt-murdock", "wilson-fisk", "frank-castle", "elektra", "stick", "foggy-nelson",
    "karen-page", "bullseye", "jessica-jones", "danny-rand", "luke-cage", "ben-urich",
    "vanessa-fisk", "wesley", "leland-owlsley", "madame-gao", "nobu", "melvin-potter",
    "sister-maggie", "ray-nadeem", "kilgrave", "trish-walker", "malcolm-ducasse",
    "jeri-hogarth", "colleen-wing", "ward-meachum", "joy-meachum", "harold-meachum",
    "davos", "mary-walker", "misty-knight", "cornell-stokes", "mariah-dillard",
    "shades", "claire-temple", "bushmaster", "willis-stryker", "alexandra",
    "david-lieberman", "curtis-hoyle", "dinah-madani", "billy-russo", "john-pilgrim",
    "amy-bendix",
}

# Films du Sony Spider-Man Universe (SSU) - personnages avec firstAppearance dedans -> world SSU
SSU_FIRST_APPEARANCES = {
    "Venom",
    "Venom: Let There Be Carnage",
    "Morbius",
    "Kraven the Hunter",
    "Madame Web",
}

# Worlds non-MCU à préserver (définis par add_other_universes ou autres scripts)
PRESERVE_WORLDS = {
    "SSU", "Raimi-Verse", "Webb-Verse", "Fox X-Men",
    "Fantastic Four (Fox)", "4 Fantastiques (Fox)",
    "AoS/Inhumans", "Spider-Verse (animé)", "Indépendants", "Blade",
}

def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    for c in data["characters"]:
        cid = c.get("id", "")
        if cid in DEFENDERS_IDS:
            c["world"] = "Defenders (Netflix)"
        elif c.get("world") in PRESERVE_WORLDS:
            pass
        elif c.get("firstAppearance") in SSU_FIRST_APPEARANCES:
            c["world"] = "SSU"
        else:
            c["world"] = "MCU"
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Done. Added world to {len(data['characters'])} characters.")

if __name__ == "__main__":
    main()
