#!/usr/bin/env python3
"""Remplace les affiliations codées (SHD, MSST, etc.) par les noms complets."""
import json
import re
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Surcharges par personnage : priorité à l'équipe super-héroïque (pas école/entreprise)
AFFILIATION_OVERRIDES = {
    # Avengers (MCU)
    "tony-stark": "Avengers",
    "steve-rogers": "Avengers",
    "bruce-banner": "Avengers",
    "natasha-romanoff": "Avengers",
    "clint-barton": "Avengers",
    "thor-odinson": "Avengers",
    "vision": "Avengers",
    "sam-wilson": "Avengers",
    "bucky-barnes": "Avengers",
    "james-rhodes": "Avengers",
    "scott-lang": "Avengers",
    "hope-van-dyne": "Avengers",
    "carol-danvers": "Avengers",
    "peter-parker": "Avengers",
    "wanda-maximoff": "Avengers",
    "t-challa": "Avengers",
    "stephen-strange": "Kamar-Taj",
    "nick-fury": "S.H.I.E.L.D.",
    "brunnhilde": "Asgard",
    "shang-chi": "Avengers",
    # Guardians
    "peter-quill": "Guardiens de la Galaxie",
    "gamora": "Guardiens de la Galaxie",
    "drax": "Guardiens de la Galaxie",
    "rocket-raccoon": "Guardiens de la Galaxie",
    "groot": "Guardiens de la Galaxie",
    "nebula": "Guardiens de la Galaxie",
    "mantis": "Guardiens de la Galaxie",
    "kraglin": "Guardiens de la Galaxie",
    "cosmo": "Guardiens de la Galaxie",
}

# Suffixes wiki à ignorer : (formerly), (exiled) → on garde uniquement l'affiliation de base
SUFFIX_PATTERNS = [
    (r"\s*\(formerly\)\s*$", ""),
    (r"\s*\(exiled\)\s*$", ""),
    (r"\s*\(undercover;\s*formerly\)\s*$", ""),
]

REPLACEMENTS = {
    # Codes → noms complets (jamais "Civil")
    "GOTG3": "Guardiens de la Galaxie",
    "SHD2": "S.H.I.E.L.D.",
    "SHD": "S.H.I.E.L.D.",
    "SHD3": "S.H.I.E.L.D.",
    "MMA": "Kamar-Taj",
    "TVA": "Tribunal des Variations Anachroniques (TVA)",
    "Division X": "X-Men",
    "10R2": "Dix Anneaux",
    "STI2": "Stark Industries",
    "Golden Tribe": "Wakanda",
    "X2E10005": "X-Men",
    "CNH": "Citadelle (Vortex TVA)",
    "STAR": "Starforce",
    "Black Order": "Ordre noir (Thanos)",
    "ASG2": "Asgard",
    "USMC": "USA",
    "MIT": "MIT",
    "RVG": "Ravageurs",
    "CVU": "Columbia University",
    "Warriors Three": "Asgard",
    "Einherjar": "Asgard",
    "USAF": "USA",
    "The Daily Bugle": "Le Daily Bugle",
    "Coles Academic High School": "Coles Academic High School",
    "IF": "Ta Lo",
    "Boo Crew": "Équipe de Ghost (Ant-Man)",
    "OSC|": "Oscorp",
    "United States Armed Forces": "USA",
    "HYD5": "Hydra",
    "Wilson Family Seafood": "Poissonnerie des Wilson",
    "Batch 89": "Inhumains",
    "X3MG": "X-Men",
    "X4": "X-Men",
    "Sakaaran Rebellion": "Sakaar",
    "Border Tribe": "Wakanda",
    "River Tribe": "Wakanda",
    "USNA": "USA",
    "AIM": "A.I.M.",
    "DOD": "USA",
    "Howard University": "Howard University",
    "MGH": "Massachusetts General Hospital",
    "CTW": "Choctaw",
    "Chaste": "Ordre des chastes",
    "SAF": "Russie",
    "Red Room": "Chambre Rouge",
    "Natural History Museum": "Musée d'histoire naturelle",
    "Talokanil Armed Forces": "Talokan",
    "ASGGOM": "Asgard",
    "Council of Kangs": "Conseil des Kangs",
    "The Bombers": "The Bombers",
    "Hand": "La Main",
    "Midtown High": "Midtown School of Science and Technology",
    "Kid Loki's Crew": "Vortex (TVA)",
    "ILL": "Illuminati",
    "Sparrows": "Sparrows",
    "Tracksuit Mafia": "Wilson Fisk",
    "SARMY": "US Army",
    "V": "Asgard",
    "TVN": "Le Collectionneur",
    "NOVA": "Xandar",
    "Accusers": "Kree",
    "SS": "Hydra",
    "SA": "Hydra",
    "ZLT": "Dimension Noire",
    "Skrull Council": "Skrull",
    "Nick Fury's Crew": "Skrull",
    "Bestman Salvage": "Le Vautour",
    "Intelligencia": "Intelligencia (She-Hulk)",
    "Adrian Toomes' Crew": "Le Vautour",
    "OXE": "O.X.E.",
    "Salemites": "Sorcière",
    "SWD": "S.W.O.R.D.",
    "Order of the Watchers": "Ordre des Gardiens",
    "Disciples of Ammit": "Dieux Egyptiens (Moon Knight)",
    "Ennead Council": "Dieux Egyptiens (Moon Knight)",
    "Clandestines": "Clandestines (Ms. Marvel)",
    "Freedom Fighters": "Monde Quantique",
    "Skrull Resistance": "Skrull",
    "Lilia Calderu's Coven": "Sorcières",
    "WEB": "W.E.B.",
    "BSAE828": "Young Avengers",
    "Stokes Crime Family": "Harlem",
    "Rivals": "Harlem",
    "Yardies": "Harlem",
    "Aryan Brotherhood": "Fraternité Aryenne (Gang)",
    "Fiona's Crew": "Fiona's Crew",
    "Kravinoff Criminal Empire": "Kraven",
    "Original Timeline:": "X-Men",
    "Horsemen of Apocalypse": "Cavaliers d'Apocalypse (X-Men)",
    "Team X (Original Timeline)": "X-Men",
    "* Daily Beagle": "Daily Beagle",
    "* Radioactive spider": "Indépendante",
    "* Spider-Society": "Équipe de Spider-Man (Spider-Verse animé)",
    "* Kingpin": "Wilson Fisk",
    "PDNY": "New York Police Department",
    "ASGPPT": "Asgard",
    "Titan Royal Family": "Famille royale de Titan (Thanos)",
    "MSST": "Midtown School of Science and Technology",
    "XXAB": "X-Men",
    "HARV": "Harvard University",
    "USA": "USA",
    "X-Men": "X-Men",
    "Phillips Academy": "Phillips Academy",
    "George Washington High School": "George Washington High School",
}

# Consolidation : codes / noms wiki → affiliations réelles (jamais "Civil")
CONSOLIDATIONS = {
    "A2": "Avengers",
    "GOTG": "Guardiens de la Galaxie",
    "STI": "Stark Industries",
    "HYD2": "Hydra",
    "HYD3": "Hydra",
    "ASG": "Asgard",
    "ASG2SSL": "Asgard",
    "ASGKTK": "Asgard",
    "Brotherhood of Mutants": "X-Men",
    "Hellfire Club": "X-Men",
    "Omegas": "X-Men",
    "X-23 Children": "X-Men",
    "Masters of the Mystic Arts": "Kamar-Taj",
    "MMAZO": "Kamar-Taj",
    "Ta Lo Armed Forces": "Ta Lo",
    "IRF": "Inhumains",
    "DORA": "Wakanda",
    "Jabari Tribe": "Wakanda",
    "War Dogs": "Wakanda",
    "United States Air Force": "USA",
    "USN": "USA",
    "Canadian Special Operations Forces Command": "USA",
    "Central Intelligence Agency": "USA",
    "Captain of the New York Police Department": "New York Police Department",
    "FBI": "USA",
    "BRM": "USA",
    "USSR": "Russie",
    "Oscorp Industries": "Oscorp",
    "Oscorp#Sam Raimi's Spider-Man trilogy|Oscorp": "Oscorp",
    "Oscorp#The Amazing Spider-Man duology|Oscorp": "Oscorp",
    "RVG (exiled)": "Ravageurs",
    "FF2E838": "Illuminati",
    "IRFE838": "Illuminati",
    "Loki Bandits": "Vortex (TVA)",
    "* Spider-Gang": "*Spider-Gang",
    # Écoles, universités, entreprises → garder le vrai nom
    "CU": "Columbia University",
    "St. Charles Elementary": "St. Charles Elementary",
    "Spence School": "Spence School",
    "University of Cambridge": "Université de Cambridge",
    "Trinity College, Cambridge|Trinity College": "Trinity College",
    "RICE": "Rice University",
    "Brookemont Elementary School": "Brookemont Elementary School",
    "SSICP": "SSICP",
    "Custer's Grove High School": "Custer's Grove High School",
    "OSU": "Ohio State University",
    "Grayburn College": "Grayburn College",
    "DeWitt Clinton High School": "DeWitt Clinton High School",
    "Midtown High School": "Midtown School of Science and Technology",
    "Sister Margaret's School for Wayward Children": "Sister Margaret's School for Wayward Children",
    "Lyndhurst Home for Boys": "Lyndhurst Home for Boys",
    "Wharton School": "Wharton School",
    "HMI": "HMI",
    "TGT": "TGT",
    "CAL": "Université de Californie",
    "RT": "RT",
    "RAND": "RAND Corporation",
    "RAND2": "RAND Corporation",
    "BISH": "Bishop College",
    "PYM": "Pym Technologies",
    "PYM (undercover)": "Pym Technologies",
    "VC": "VC",
    "ORGO": "Organisation",
    "ANSA": "ANSA",
    "Alias Investigations": "Alias Investigations",
    "NYB": "NYB",
    "Scene Contempo Gallery": "Scene Contempo Gallery",
    "Confederated Global Investments": "Confederated Global Investments",
    "Silver & Brent": "Silver & Brent",
    "Catholic Church": "Église catholique",
    "ABC": "ABC",
    "Kilgrave Victim Support Group": "Groupe de soutien Kilgrave",
    "Nelson's Meats": "Nelson's Meats",
    "PP": "PP",
    "Hoskins Family Flowers": "Hoskins Family Flowers",
    "Titania Worldwide": "Titania Worldwide",
    "Horizon Labs": "Horizon Labs",
    "NYFD": "New York Fire Department",
    "Daily Globe": "Daily Globe",
    "St. Estes Home for Unwanted Children": "St. Estes Home for Unwanted Children",
    "Micheline and McFarland": "Micheline and McFarland",
    "Alchemax": "Alchemax",
    "* Alchemax": "Alchemax",
    "West Chesapeake Valley Thunderbolts": "West Chesapeake Valley Thunderbolts",
    "Ray of Hope": "Ray of Hope",
    "FU": "FU",
    "ALF": "ALF",
    "Hokey Pokey Bowl": "Hokey Pokey Bowl",
    "Kale Kare": "Kale Kare",
    "Student (graduated)": "Indépendante",
    "Peter Parker": "Indépendante",
    "Lieber Academy": "Lieber Academy",
    "TIDE": "TIDE",
    "MGH2": "MGH2",
    "30px Harvard University": "Harvard University",
    "25px UCLA": "UCLA",
    "20px French Foreign Legion": "Légion étrangère",
    "Xavier High School (New York City)|Xavier High School": "Xavier High School",
}


def build_full_mappings():
    """Construit le mapping complet. (formerly)/(exiled) → même affiliation, sans suffixe."""
    all_mappings = {**REPLACEMENTS, **CONSOLIDATIONS}
    expanded = dict(all_mappings)
    for key, value in list(all_mappings.items()):
        expanded[f"{key} (formerly)"] = value
        expanded[f"{key} (exiled)"] = value
    return expanded


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    all_mappings = build_full_mappings()
    count = 0
    for c in data["characters"]:
        aff = c.get("affiliation")
        if not aff:
            continue
        # Match exact
        if aff in all_mappings:
            c["affiliation"] = all_mappings[aff]
            count += 1
            continue
        # Match avec suffixes (formerly), (exiled) déjà dans la clé
        for pattern, suffix in SUFFIX_PATTERNS:
            base = re.sub(pattern, "", aff, flags=re.IGNORECASE)
            if base and base in all_mappings:
                c["affiliation"] = all_mappings[base] + suffix
                count += 1
                break

    # Civil résiduel → affiliation réelle selon contexte
    for c in data["characters"]:
        if c.get("affiliation") != "Civil":
            continue
        fa = (c.get("firstAppearance") or "").lower()
        if "eternals" in fa:
            c["affiliation"] = "Eternals"
        else:
            c["affiliation"] = "Indépendante"
        count += 1

    # Surcharges : super-héros → équipe (Avengers, Gardiens, etc.) pas école/entreprise
    for c in data["characters"]:
        cid = c.get("id")
        if cid and cid in AFFILIATION_OVERRIDES:
            c["affiliation"] = AFFILIATION_OVERRIDES[cid]
            count += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Remplacé: {count} affiliations")


if __name__ == "__main__":
    main()
