#!/usr/bin/env python3
"""Add characters from SSU, Raimi-Verse, Webb-Verse, Fox X-Men, FF Fox, AoS, Spider-Verse, Indépendants."""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Format: (id, name, world)
NEW_CHARACTERS = [
    # SSU - Venom, Morbius, Madame Web, Kraven
    ("eddie-brock-ssu", "Eddie Brock", "SSU"),
    ("venom-ssu", "Venom", "SSU"),
    ("cletus-kasady-ssu", "Cletus Kasady", "SSU"),
    ("carnage-ssu", "Carnage", "SSU"),
    ("anne-weying-ssu", "Anne Weying", "SSU"),
    ("morbius-ssu", "Michael Morbius", "SSU"),
    ("milo-ssu", "Milo", "SSU"),
    ("madame-web-ssu", "Cassandra Webb", "SSU"),
    ("julia-cornwall-ssu", "Julia Cornwall", "SSU"),
    ("mattie-franklin-ssu", "Mattie Franklin", "SSU"),
    ("anya-corazon-ssu", "Anya Corazón", "SSU"),
    ("kraven-ssu", "Kraven the Hunter", "SSU"),
    ("chameleon-ssu", "Chameleon", "SSU"),
    ("riot-ssu", "Riot", "SSU"),
    ("shriek-ssu", "Shriek", "SSU"),
    # Raimi-Verse
    ("peter-parker-raimi", "Peter Parker", "Raimi-Verse"),
    ("mary-jane-raimi", "Mary Jane Watson", "Raimi-Verse"),
    ("harry-osborn-raimi", "Harry Osborn", "Raimi-Verse"),
    ("norman-osborn-raimi", "Norman Osborn", "Raimi-Verse"),
    ("doc-ock-raimi", "Doctor Octopus", "Raimi-Verse"),
    ("sandman-raimi", "Sandman", "Raimi-Verse"),
    ("eddie-brock-raimi", "Eddie Brock", "Raimi-Verse"),
    ("venom-raimi", "Venom", "Raimi-Verse"),
    ("j-jonah-jameson-raimi", "J. Jonah Jameson", "Raimi-Verse"),
    ("aunt-may-raimi", "May Parker", "Raimi-Verse"),
    # Webb-Verse
    ("peter-parker-webb", "Peter Parker", "Webb-Verse"),
    ("gwen-stacy-webb", "Gwen Stacy", "Webb-Verse"),
    ("electro-webb", "Electro", "Webb-Verse"),
    ("lizard-webb", "Le Lézard", "Webb-Verse"),
    ("harry-osborn-webb", "Harry Osborn", "Webb-Verse"),
    ("green-goblin-webb", "Green Goblin", "Webb-Verse"),
    ("rhino-webb", "Rhino", "Webb-Verse"),
    ("denis-carradine-webb", "Denis Carradine", "Webb-Verse"),
    ("captain-stacy-webb", "George Stacy", "Webb-Verse"),
    ("richard-parker-webb", "Richard Parker", "Webb-Verse"),
    # Fox X-Men
    ("wolverine-fox", "Wolverine", "Fox X-Men"),
    ("logan-fox", "Logan", "Fox X-Men"),
    ("professor-x-fox", "Charles Xavier", "Fox X-Men"),
    ("magneto-fox", "Magneto", "Fox X-Men"),
    ("mystique-fox", "Mystique", "Fox X-Men"),
    ("jean-grey-fox", "Jean Grey", "Fox X-Men"),
    ("cyclops-fox", "Cyclops", "Fox X-Men"),
    ("storm-fox", "Storm", "Fox X-Men"),
    ("beast-fox", "Beast", "Fox X-Men"),
    ("rogue-fox", "Rogue", "Fox X-Men"),
    ("iceman-fox", "Iceman", "Fox X-Men"),
    ("kitty-pryde-fox", "Kitty Pryde", "Fox X-Men"),
    ("nightcrawler-fox", "Nightcrawler", "Fox X-Men"),
    ("colossus-fox", "Colossus", "Fox X-Men"),
    ("sabretooth-fox", "Sabretooth", "Fox X-Men"),
    ("toad-fox", "Toad", "Fox X-Men"),
    ("pyro-fox", "Pyro", "Fox X-Men"),
    ("juggernaut-fox", "Juggernaut", "Fox X-Men"),
    ("deadpool-fox", "Deadpool", "Fox X-Men"),
    ("cable-fox", "Cable", "Fox X-Men"),
    ("negasonic-fox", "Negasonic Teenage Warhead", "Fox X-Men"),
    ("dopinder-fox", "Dopinder", "Fox X-Men"),
    ("apocalypse-fox", "Apocalypse", "Fox X-Men"),
    ("emma-frost-fox", "Emma Frost", "Fox X-Men"),
    ("psylocke-fox", "Psylocke", "Fox X-Men"),
    ("angel-fox", "Angel", "Fox X-Men"),
    ("havok-fox", "Havok", "Fox X-Men"),
    ("moira-mactaggert-fox", "Moira MacTaggert", "Fox X-Men"),
    ("raven-darkholme-fox", "Raven Darkholme", "Fox X-Men"),
    ("stryker-fox", "William Stryker", "Fox X-Men"),
    ("laura-kinney-fox", "Laura", "Fox X-Men"),
    ("charles-xavier-young-fox", "Charles Xavier (jeune)", "Fox X-Men"),
    ("erik-lensherr-young-fox", "Erik Lensherr (jeune)", "Fox X-Men"),
    ("scarlet-witch-fox", "Wanda Maximoff", "Fox X-Men"),
    ("quicksilver-fox", "Quicksilver", "Fox X-Men"),
    # Fantastic Four (Fox)
    ("reed-richards-fox", "Reed Richards", "Fantastic Four (Fox)"),
    ("sue-storm-fox", "Sue Storm", "Fantastic Four (Fox)"),
    ("johnny-storm-fox", "Human Torch", "Fantastic Four (Fox)"),
    ("ben-grimm-fox", "The Thing", "Fantastic Four (Fox)"),
    ("doctor-doom-fox", "Doctor Doom", "Fantastic Four (Fox)"),
    ("silver-surfer-fox", "Silver Surfer", "Fantastic Four (Fox)"),
    ("galactus-fox", "Galactus", "Fantastic Four (Fox)"),
    ("victor-von-doom-fox", "Victor von Doom", "Fantastic Four (Fox)"),
    # AoS / Inhumans
    ("phil-coulson-aos", "Phil Coulson", "AoS/Inhumans"),
    ("daisy-johnson-aos", "Daisy Johnson", "AoS/Inhumans"),
    ("melinda-may-aos", "Melinda May", "AoS/Inhumans"),
    ("leo-fitz-aos", "Leo Fitz", "AoS/Inhumans"),
    ("jemma-simmons-aos", "Jemma Simmons", "AoS/Inhumans"),
    ("grant-ward-aos", "Grant Ward", "AoS/Inhumans"),
    ("yo-yo-rodriguez-aos", "Yo-Yo Rodriguez", "AoS/Inhumans"),
    ("mack-aos", "Alphonso Mackenzie", "AoS/Inhumans"),
    ("robbie-reyes-aos", "Ghost Rider", "AoS/Inhumans"),
    ("peggy-carter-aos", "Peggy Carter", "AoS/Inhumans"),
    ("howard-stark-aos", "Howard Stark", "AoS/Inhumans"),
    ("black-bolt-aos", "Black Bolt", "AoS/Inhumans"),
    ("medusa-aos", "Medusa", "AoS/Inhumans"),
    ("maximus-aos", "Maximus", "AoS/Inhumans"),
    # Spider-Verse (animé)
    ("miles-morales-spiderverse", "Miles Morales", "Spider-Verse (animé)"),
    ("gwen-stacy-spiderverse", "Spider-Gwen", "Spider-Verse (animé)"),
    ("peter-b-parker-spiderverse", "Peter B. Parker", "Spider-Verse (animé)"),
    ("spider-pig-spiderverse", "Spider-Ham", "Spider-Verse (animé)"),
    ("spider-noir-spiderverse", "Spider-Noir", "Spider-Verse (animé)"),
    ("peni-parker-spiderverse", "Peni Parker", "Spider-Verse (animé)"),
    ("miguel-ohara-spiderverse", "Miguel O'Hara", "Spider-Verse (animé)"),
    ("spot-spiderverse", "Spot", "Spider-Verse (animé)"),
    ("kingpin-spiderverse", "Kingpin", "Spider-Verse (animé)"),
    ("aaron-davis-spiderverse", "Aaron Davis", "Spider-Verse (animé)"),
    ("rio-morales-spiderverse", "Rio Morales", "Spider-Verse (animé)"),
    ("jefferson-morales-spiderverse", "Jefferson Morales", "Spider-Verse (animé)"),
    # Indépendants
    ("blade-ind", "Blade", "Indépendants"),
    ("whistler-ind", "Whistler", "Indépendants"),
    ("hulk-2003-ind", "Bruce Banner", "Indépendants"),
    ("daredevil-2003-ind", "Matt Murdock", "Indépendants"),
    ("elektra-2005-ind", "Elektra", "Indépendants"),
    ("johnny-blaze-ind", "Johnny Blaze", "Indépendants"),
    ("punisher-2004-ind", "Frank Castle", "Indépendants"),
    ("howard-the-duck-ind", "Howard the Duck", "Indépendants"),
    ("man-thing-ind", "Man-Thing", "Indépendants"),
]

def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    existing_ids = {c["id"] for c in data["characters"]}
    added = 0
    for cid, name, world in NEW_CHARACTERS:
        if cid in existing_ids:
            continue
        data["characters"].append({"id": cid, "name": name, "world": world})
        existing_ids.add(cid)
        added += 1
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"Added {added} characters.")

if __name__ == "__main__":
    main()
