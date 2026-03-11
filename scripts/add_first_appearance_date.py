#!/usr/bin/env python3
"""Ajoute le champ firstAppearanceDate (date de sortie) à chaque personnage."""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Surcharges par personnage (priorité sur FIRST_APPEARANCE_DATES)
FIRST_APPEARANCE_DATE_OVERRIDES = {
    "steve-rogers": "2011",
    "peter-parker": "2016",
    "kate-bishop": "2021",
}

# firstAppearance (titre film/série) -> année de sortie (YYYY)
FIRST_APPEARANCE_DATES = {
    # MCU Films
    "Iron Man": "2008",
    "L'Incroyable Hulk": "2008",
    "The Incredible Hulk": "2008",
    "Iron Man 2": "2010",
    "Thor": "2011",
    "Captain America: The First Avenger": "2011",
    "The Avengers": "2012",
    "Iron Man 3": "2013",
    "Thor: The Dark World": "2013",
    "Captain America: The Winter Soldier": "2014",
    "Guardians of the Galaxy": "2014",
    "Avengers: Age of Ultron": "2015",
    "Ant-Man": "2015",
    "Captain America: Civil War": "2016",
    "Docteur Strange": "2016",
    "Guardians of the Galaxy Vol. 2": "2017",
    "Spider-Man: Homecoming": "2017",
    "Thor: Ragnarok": "2017",
    "Black Panther": "2018",
    "Ant-Man and the Wasp": "2018",
    "Captain Marvel": "2019",
    "Avengers: Endgame": "2019",
    "Spider-Man: Far From Home": "2019",
    "Black Widow": "2021",
    "Shang-Chi and the Legend of the Ten Rings": "2021",
    "Eternals": "2021",
    "Spider-Man: No Way Home": "2021",
    "Docteur Strange in the Multiverse of Madness": "2022",
    "Thor: Love and Thunder": "2022",
    "Black Panther: Wakanda Forever": "2022",
    "Ant-Man and the Wasp: Quantumania": "2023",
    "Guardians of the Galaxy Vol. 3": "2023",
    "The Marvels": "2023",
    "Deadpool & Wolverine": "2024",
    "Captain America: Brave New World": "2025",
    "Thunderbolts*": "2025",
    "Avengers: Doomsday": "2026",
    "The 4 Fantastiques: First Steps": "2025",
    # MCU Séries
    "Agent Carter": "2015",
    "Agents of S.H.I.E.L.D.": "2013",
    "Daredevil": "2015",
    "Daredevil (TV series)": "2015",
    "Jessica Jones (TV series)": "2015",
    "Luke Cage (TV series)": "2016",
    "Iron Fist (TV series)": "2017",
    "The Punisher": "2017",
    "Inhumans": "2017",
    "Inhumans (TV series)": "2017",
    "WandaVision": "2021",
    "The Falcon and The Winter Soldier": "2021",
    "Loki": "2021",
    "Loki (TV series)": "2021",
    "What If...?": "2021",
    "Hawkeye": "2021",
    "Hawkeye (TV series)": "2021",
    "Moon Knight (TV series)": "2022",
    "Ms. Marvel (TV series)": "2022",
    "Echo (TV series)": "2025",
    "Agatha All Along": "2024",
    "Your Friendly Neighborhood Spider-Man": "2025",
    # Fox X-Men
    "X-Men": "2000",
    "X2: X-Men United": "2003",
    "X-Men: The Last Stand": "2006",
    "X-Men: First Class": "2011",
    "X-Men: Days of Future Past": "2014",
    "Logan": "2017",
    "Deadpool": "2016",
    # Spider-Man (Raimi, Webb, Sony)
    "Spider-Man": "2002",
    "Spider-Man 2": "2004",
    "Spider-Man 3": "2007",
    "The Amazing Spider-Man": "2012",
    "The Amazing Spider-Man 2": "2014",
    "The Amazing Spider-Man: The Movie": "2012",
    "Venom": "2018",
    "Venom: Let There Be Carnage": "2021",
    "Morbius": "2022",
    "Kraven the Hunter": "2024",
    "Madame Web": "2024",
    # Spider-Verse
    "Spider-Man: Into the Spider-Verse": "2018",
    "Spider-Ham: Caught in a Ham": "2019",
    # Autres Marvel
    "Blade": "1998",
    "Hulk": "2003",
    "Elektra": "2005",
    "Ghost Rider": "2007",
    "Howard the Duck": "1986",
    "Man-Thing": "2005",
    "4 Fantastiques": "2005",
    "4 Fantastiques: Rise of the Silver Surfer": "2007",
    "New Warriors": "2017",
}


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    unknown = set()
    for char in data["characters"]:
        cid = char.get("id", "")
        fa = char.get("firstAppearance")
        if not fa:
            char["firstAppearanceDate"] = "Inconnu"
            continue
        date = FIRST_APPEARANCE_DATE_OVERRIDES.get(cid) or FIRST_APPEARANCE_DATES.get(fa)
        if date:
            # Garder uniquement l'année si une date complète existait
            char["firstAppearanceDate"] = str(date)[:4] if len(str(date)) > 4 else str(date)
        else:
            char["firstAppearanceDate"] = "Inconnu"
            unknown.add(fa)

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Ajouté firstAppearanceDate pour {len(data['characters'])} personnages.")
    if unknown:
        print(f"Sans date connue ({len(unknown)} titres): {sorted(unknown)}")


if __name__ == "__main__":
    main()
