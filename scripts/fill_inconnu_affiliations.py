#!/usr/bin/env python3
"""
Remplit les affiliations "Inconnu" en s'appuyant sur:
1. Les fichiers wiki dans scripts/output/mcu_cineverse/*.json
2. Des règles d'inférence (firstAppearance, species, id)

Usage:
  python scripts/fill_inconnu_affiliations.py [--dry-run] [--json PATH]
"""
import json
import re
from pathlib import Path
from typing import Dict, Optional

# Réutiliser les helpers de merge_wiki_fields
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from merge_wiki_fields import clean_wiki_text, get_infobox_value

from replace_affiliations import REPLACEMENTS, CONSOLIDATIONS

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "scripts" / "output" / "mcu_cineverse"

ALL_MAPPINGS = {**REPLACEMENTS, **CONSOLIDATIONS}

# Règles d'inférence quand le wiki n'a pas d'affiliation
# (id -> affiliation) ou (firstAppearance pattern -> affiliation) ou (species -> affiliation)
ID_OVERRIDES: Dict[str, str] = {
    "heimdall": "Asgard",
    "sif": "Asgard",
    "skurge": "Asgard",
    "grandmaster": "Sakaar",
    "ego": "Indépendante",
    "kraglin": "Guardiens de la Galaxie",
    "laufey": "Indépendante",  # Géant de givre, ennemi
    "malekith": "Indépendante",  # Elfe sombre
    "algrim": "Indépendante",  # Kurse, elfe sombre
    "ultron": "Indépendante",
    "baron-wolfgang-von-strucker": "Hydra",
    "baron-helmut-zemo": "Hydra",
    "sonny-burch": "Indépendante",
    "jack-duquesne": "Wilson Fisk",
    "vanessa-carlysle": "Indépendante",
    "victor-timely": "Tribunal des Variations Anachroniques (TVA)",
    "morgan-h-stark": "Stark Industries",
    "harley-keener": "Stark Industries",
    "meredith-quill": "Indépendante",
    "namor": "Talokan",
    "otto-octavius": "Indépendante",
    "flint-marko": "Indépendante",
    "macdonald-gargan": "Le Vautour",
    "mac-gargan": "Le Vautour",
    "adrian-toomes-jr": "Le Vautour",
    "aleksei-sytsevich": "Kraven",
    "eddie-brock": "Indépendante",
    "anne-weying": "Indépendante",
    "felicia-hardy": "Indépendante",
    "silver-sable": "Indépendante",
    "doreen-green": "Indépendante",
    "patrick-mulligan": "USA",
    "kazi": "Wilson Fisk",
    "brad-wolfe": "Indépendante",
    "dopinder": "Indépendante",
    "althea": "Indépendante",
    "rio-vidal": "Indépendante",
    "nicholas-scratch": "Sorcières",
    "phil-coulson-aos": "S.H.I.E.L.D.",
}

# firstAppearance contient X -> affiliation (ordre de priorité)
FIRST_APP_PATTERNS = [
    (r"X-Men|Deadpool|Logan|Wolverine", "X-Men"),
    (r"Avengers: Doomsday", "X-Men"),
    (r"Thor", "Asgard"),
    (r"Guardians of the Galaxy", "Guardiens de la Galaxie"),
    (r"Black Panther|Wakanda", "Wakanda"),
    (r"Shang-Chi|Ten Rings", "Dix Anneaux"),
    (r"Moon Knight", "Dieux Egyptiens (Moon Knight)"),
    (r"Ms\. Marvel", "Indépendante"),
    (r"She-Hulk", "Indépendante"),
    (r"Ant-Man|Quantumania", "Monde Quantique"),
    (r"Loki", "Tribunal des Variations Anachroniques (TVA)"),
    (r"Eternals", "Eternals"),
    (r"Spider-Man|No Way Home|Homecoming|Far From Home", "Indépendante"),
    (r"Hawkeye", "Indépendante"),
    (r"Falcon and the Winter Soldier|Winter Soldier", "USA"),
    (r"Captain America", "USA"),
    (r"Iron Man", "Stark Industries"),
    (r"Agents of S\.H\.I\.E\.L\.D\.|S\.H\.I\.E\.L\.D\.", "S.H.I.E.L.D."),
    (r"Daredevil|Luke Cage|Iron Fist", "Harlem"),
    (r"Agatha", "Sorcières"),
    (r"Echo", "Wilson Fisk"),
    (r"What If", "Indépendante"),
    (r"Venom|Morbius|Kraven", "Indépendante"),
]

SPECIES_AFFINITY: Dict[str, str] = {
    "Asgardien": "Asgard",
    "Asgardienne": "Asgard",
    "Éternel": "Eternals",
    "Mutant": "X-Men",
    "Skrull": "Skrull",
    "Kree": "Kree",
    "Talokanil": "Talokan",
    "Souverain": "Indépendante",
    "Dévian": "Indépendante",
}


def resolve_wiki_affiliation(raw: str) -> Optional[str]:
    """Extrait et résout l'affiliation depuis le wikitext."""
    if not raw or not raw.strip():
        return None
    # {{Affiliation|XXX}} ou {{Affiliation|XXX|...}}
    m = re.search(r"\{\{Affiliation\|([^}|]+)", raw, re.IGNORECASE)
    if m:
        code = m.group(1).strip()
        return ALL_MAPPINGS.get(code, code)
    # [[Link]] ou [[Link|Text]] -> Text ou Link
    cleaned = clean_wiki_text(raw)
    if not cleaned:
        return None
    # Retirer (formerly), (anciennement), etc.
    cleaned = re.sub(r"\s*\([^)]*(?:formerly|anciennement)[^)]*\)", "", cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip()
    if len(cleaned) < 2:
        return None
    return ALL_MAPPINGS.get(cleaned, cleaned)


def get_affiliation_from_wiki(cid: str) -> Optional[str]:
    """Lit le fichier wiki et extrait l'affiliation."""
    path = OUTPUT_DIR / f"{cid}.json"
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    infobox = data.get("infobox") or {}
    if not infobox:
        return None
    # Vérifier affiliation, affilitation (typo), job
    val = get_infobox_value(infobox, ["affiliation", "affilitation", "job"])
    if not val:
        return None
    parts = re.split(r"<br\s*/?>", val, flags=re.IGNORECASE)
    first = parts[0].strip() if parts else ""
    return resolve_wiki_affiliation(first)


def infer_affiliation(char: dict) -> Optional[str]:
    """Infère l'affiliation à partir des champs du personnage."""
    cid = char.get("id", "")
    # 1. Override par id
    if cid in ID_OVERRIDES:
        return ID_OVERRIDES[cid]
    # 2. Par species
    species = (char.get("species") or "").lower()
    for sp, aff in SPECIES_AFFINITY.items():
        if sp.lower() in species:
            return aff
    # 3. Par firstAppearance
    fa = char.get("firstAppearance") or ""
    for pattern, aff in FIRST_APP_PATTERNS:
        if re.search(pattern, fa, re.IGNORECASE):
            return aff
    return None


def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--json", type=str, default=str(JSON_PATH))
    args = parser.parse_args()

    json_path = Path(args.json)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    chars = data.get("characters", [])
    updated = 0
    for char in chars:
        if char.get("affiliation") != "Inconnu":
            continue
        cid = char.get("id", "")
        aff = None
        source = ""
        # 1. Essayer le wiki
        aff = get_affiliation_from_wiki(cid)
        if aff:
            source = "wiki"
        # 2. Sinon inférence
        if not aff:
            aff = infer_affiliation(char)
            if aff:
                source = "inference"
        if aff:
            char["affiliation"] = aff
            updated += 1
            if args.dry_run:
                print(f"  {cid}: {aff} ({source})")

    if not args.dry_run:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Rempli {updated} affiliations Inconnu. Écrit dans {json_path}")
    else:
        print(f"Dry-run: {updated} affiliations seraient mises à jour.")


if __name__ == "__main__":
    main()
