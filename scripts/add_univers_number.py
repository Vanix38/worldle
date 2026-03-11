#!/usr/bin/env python3
"""
Ajoute le champ 'univers' (numéro Earth) à chaque personnage de marvel-cineverse.json
en fonction de leur champ 'world'.

Mapping world -> numéro Earth (désignation Marvel officielle, Timeline Guidebook 2024):
- MCU: 616 (désignation officielle Marvel Studios depuis Doctor Strange 2)
- Defenders (Netflix): 616 (même continuité que MCU)
- AoS/Inhumans: 616 (MCU)
- SSU: 8311 (Sony Spider-Man Universe / Venomverse)
- Raimi-Verse: 96283
- Webb-Verse: 120703
- Fox X-Men: 10005
- 4 Fantastiques (Fox): 121698
- Spider-Verse (animé): 8311 (SSU lié) / multivers
- Blade: 26320
- Indépendants: 26320 (Legends / pre-MCU films)
"""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Surcharges par personnage : certains sont MCU mais d'une autre Terre que 616
# (Multiverse of Madness Illuminati = 838, What If = univers variés)
OVERRIDES_BY_ID: dict[str, int] = {
    # Earth-838 (Illuminati, Multiverse of Madness)
    "baron-mordo-838-mcu": 838,
    "reed-richards-838-mcu": 838,
    "black-bolt-838-mcu": 838,
    "charles-xavier-838-mcu": 838,
    "maria-rambeau-838-mcu": 838,
    # What If...? - chaque épisode = univers différent (designations souvent TRN/indéterminées)
    # On utilise 0 = variante (univers non officiellement numéroté) sauf si connu
    "captain-carter-mcu": 0,  # Captain Carter Universe
    "party-thor-mcu": 0,  # Party Prince Thor Universe
    "tchalla-star-lord-mcu": 0,  # Ravager T'Challa Universe
    "zombie-strange-mcu": 0,  # Zombie outbreak Universe
    "strange-supreme-mcu": 0,  # Strange Supreme
    "killmonger-king-mcu": 0,  # Killmonger Black Panther
    "sylvie-mcu": 0,  # Variante Loki (Void / fin du temps)
    "president-loki-mcu": 0,
    "classic-loki-mcu": 0,
    "kid-loki-mcu": 0,
    "alligator-loki-mcu": 0,
    "boastful-loki-mcu": 0,
    "he-who-remains-mcu": 0,  # Fin du temps
    "kang-the-conqueror-mcu": 0,
    "victor-timely-mcu": 0,
    "gamora-2014-mcu": 616,  # Gamora 2014 revenue dans timeline principale = 616
    "elektra-2005-ind": 701306,  # Elektra (film 2005) = Earth-701306, pas 26320
}

WORLD_TO_EARTH: dict[str, int] = {
    "MCU": 616,
    "Defenders (Netflix)": 616,
    "AoS/Inhumans": 616,
    "SSU": 8311,
    "Raimi-Verse": 96283,
    "Webb-Verse": 120703,
    "Fox X-Men": 10005,
    "4 Fantastiques (Fox)": 121698,
    "Spider-Verse (animé)": 8311,
    "Blade": 26320,
    "Indépendants": 26320,
}


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    unknown = set()
    for c in data["characters"]:
        cid = c.get("id", "")
        if cid in OVERRIDES_BY_ID:
            earth = OVERRIDES_BY_ID[cid]
        else:
            world = c.get("world", "")
            earth = WORLD_TO_EARTH.get(world)
            if earth is None:
                unknown.add(world)
                earth = 0  # inconnu
        c["univers"] = earth

    if unknown:
        print(f"Worlds sans mapping (univers=0): {unknown}")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Done. Added 'univers' to {len(data['characters'])} characters.")


if __name__ == "__main__":
    main()
