#!/usr/bin/env python3
"""
Convertit les noms de personnages: name = nom de super-héros, vrai nom dans aliases.

Mapping: id -> (nom_super_hero, vrai_nom)
Si pas de mapping, on garde le nom actuel (personnages sans identité secrète: Loki, Thanos, etc.)
"""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# id -> (hero_name, real_name) - hero_name = nom principal affiché
NAME_TO_HERO = {
    "tony-stark": ("Iron Man", "Tony Stark"),
    "steve-rogers": ("Captain America", "Steve Rogers"),
    "bruce-banner": ("Hulk", "Bruce Banner"),
    "natasha-romanoff": ("Black Widow", "Natasha Romanoff"),
    "clint-barton": ("Hawkeye", "Clint Barton"),
    "peter-parker": ("Spider-Man", "Peter Parker"),
    "wanda-maximoff": ("Scarlet Witch", "Wanda Maximoff"),
    "stephen-strange": ("Doctor Strange", "Stephen Strange"),
    "t-challa": ("Black Panther", "T'Challa"),
    "carol-danvers": ("Captain Marvel", "Carol Danvers"),
    "sam-wilson": ("Captain America", "Sam Wilson"),
    "bucky-barnes": ("Winter Soldier", "Bucky Barnes"),
    "peter-quill": ("Star-Lord", "Peter Quill"),
    "scott-lang": ("Ant-Man", "Scott Lang"),
    "hope-van-dyne": ("Wasp", "Hope van Dyne"),
    "matt-murdock": ("Daredevil", "Matt Murdock"),
    "wilson-fisk": ("Kingpin", "Wilson Fisk"),
    "frank-castle": ("Punisher", "Frank Castle"),
    "eddie-brock": ("Venom", "Eddie Brock"),
    "cletus-kasady": ("Carnage", "Cletus Kasady"),
    "michael-morbius": ("Morbius", "Michael Morbius"),
    "sergei-kravinoff": ("Kraven", "Sergei Kravinoff"),
    "patrick-mulligan": ("Toxin", "Patrick Mulligan"),
    "logan": ("Wolverine", "Logan"),
    "charles-xavier": ("Professeur X", "Charles Xavier"),
    "erik-lehnsherr": ("Magneto", "Erik Lehnsherr"),
    "raven-darkholme": ("Mystique", "Raven Darkhölme"),
    "jean-grey": ("Phoenix", "Jean Grey"),
    "scott-summers": ("Cyclope", "Scott Summers"),
    "ororo-munroe": ("Storm", "Ororo Munroe"),
    "wade-wilson": ("Deadpool", "Wade Wilson"),
    "hank-mccoy": ("Fauve", "Hank McCoy"),
    "rogue": ("Rogue", "Anna Marie"),
    "bobby-drake": ("Iceman", "Bobby Drake"),
    "kitty-pryde": ("Shadowcat", "Kitty Pryde"),
    "piotr-rasputin": ("Colossus", "Piotr Rasputin"),
    "warren-worthington-iii": ("Angel", "Warren Worthington III"),
    "peter-parker-raimi": ("Spider-Man", "Peter Parker"),
    "mary-jane-raimi": ("Mary Jane Watson", "Mary Jane Watson"),  # pas de nom hero
    "doc-ock-raimi": ("Doctor Octopus", "Otto Octavius"),
    "sandman-raimi": ("Sandman", "Flint Marko"),
    "eddie-brock-raimi": ("Venom", "Eddie Brock"),
    "venom-raimi": ("Venom", "Venom"),
    "aunt-may-raimi": ("May Parker", "May Parker"),
    "green-goblin-webb": ("Green Goblin", "Norman Osborn"),
    "electro-webb": ("Electro", "Max Dillon"),
    "lizard-webb": ("Lizard", "Curt Connors"),
    "rhino-webb": ("Rhino", "Aleksei Sytsevich"),
    "reed-richards-fox": ("Mister Fantastic", "Reed Richards"),
    "sue-storm-fox": ("Invisible Woman", "Sue Storm"),
    "johnny-storm-fox": ("Human Torch", "Johnny Storm"),
    "ben-grimm-fox": ("The Thing", "Ben Grimm"),
    "Docteur-doom-fox": ("Doctor Doom", "Victor von Doom"),
    "doctor-doom-fox": ("Doctor Doom", "Victor von Doom"),
    "silver-surfer-fox": ("Silver Surfer", "Norrin Radd"),
    "phil-coulson-aos": ("Phil Coulson", "Phil Coulson"),
    "daisy-johnson-aos": ("Quake", "Daisy Johnson"),
    "melinda-may-aos": ("Melinda May", "Melinda May"),
    "black-bolt-aos": ("Black Bolt", "Black Bolt"),
    "medusa-aos": ("Medusa", "Medusa"),
    "blade-ind": ("Blade", "Eric Brooks"),
    "whistler-ind": ("Whistler", "Abraham Whistler"),
    "hulk-2003-ind": ("Hulk", "Bruce Banner"),
    "daredevil-2003-ind": ("Daredevil", "Matt Murdock"),
    "elektra-2005-ind": ("Elektra", "Elektra Natchios"),
    "johnny-blaze-ind": ("Ghost Rider", "Johnny Blaze"),
    "punisher-2004-ind": ("Punisher", "Frank Castle"),
    "howard-the-duck-ind": ("Howard the Duck", "Howard the Duck"),
    "man-thing-ind": ("Man-Thing", "Ted Sallis"),
    "kate-bishop": ("Hawkeye", "Kate Bishop"),
    "yelena-belova": ("Black Widow", "Yelena Belova"),
    "shang-chi": ("Shang-Chi", "Shang-Chi"),
    "cassie-webb": ("Madame Web", "Cassandra Webb"),
    "kazi": ("Kazi", "Kazi"),
    "captain-carter-mcu": ("Captain Carter", "Peggy Carter"),
    # Autres personnages secondaires / soutiens
    "james-rhodes": ("War Machine", "James Rhodes"),
    "brunnhilde": ("Valkyrie", "Brunnhilde"),
    "johann-schmidt": ("Red Skull", "Johann Schmidt"),
    "obadiah-stane": ("Iron Monger", "Obadiah Stane"),
    "ivan-vanko": ("Whiplash", "Ivan Vanko"),
    "emil-blonsky": ("Abomination", "Emil Blonsky"),
    "betty-ross": ("Betty Ross", "Betty Ross"),
    "jane-foster": ("Mighty Thor", "Jane Foster"),
    "erik-stevens": ("Killmonger", "Erik Stevens"),
    "agatha-harkness": ("Agatha Harkness", "Agatha Harkness"),
    "john-walker": ("U.S. Agent", "John Walker"),
    "sharon-carter": ("Power Broker", "Sharon Carter"),
    "marc-spector": ("Moon Knight", "Marc Spector"),
    "jennifer-walters": ("She-Hulk", "Jennifer Walters"),
    "kamala-khan": ("Ms. Marvel", "Kamala Khan"),
    "riri-williams": ("Ironheart", "Riri Williams"),
    "victor-creed": ("Sabretooth", "Victor Creed"),
    "cain-marko": ("Juggernaut", "Cain Marko"),
    "kurt-wagner": ("Nightcrawler", "Kurt Wagner"),
    "norman-osborn": ("Green Goblin", "Norman Osborn"),
    "quentin-beck": ("Mysterio", "Quentin Beck"),
    "adrian-toomes": ("Vulture", "Adrian Toomes"),
    "felicia-hardy": ("Black Cat", "Felicia Hardy"),
    "otto-octavius": ("Doctor Octopus", "Otto Octavius"),
    "america-chavez": ("Miss America", "America Chavez"),
    "sylvie": ("Sylvie", "Sylvie Laufeydottir"),
    "venom-ssu": ("Venom", "Symbiote"),
    "carnage-ssu": ("Carnage", "Cletus Kasady"),
    "eddie-brock-ssu": ("Venom", "Eddie Brock"),
    "peter-parker-webb": ("Spider-Man", "Peter Parker"),
    "gwen-stacy-webb": ("Spider-Woman", "Gwen Stacy"),
    "miles-morales-spiderverse": ("Spider-Man", "Miles Morales"),
    "gwen-stacy-spiderverse": ("Spider-Gwen", "Gwen Stacy"),
    "miguel-ohara-spiderverse": ("Spider-Man 2099", "Miguel O'Hara"),
    "kingpin-spiderverse": ("Kingpin", "Wilson Fisk"),
    "yo-yo-rodriguez-aos": ("Yo-Yo", "Elena Rodriguez"),
    "robbie-reyes-aos": ("Ghost Rider", "Robbie Reyes"),
    "maximus-aos": ("Maximus", "Maximus Boltagon"),
    "madame-web-ssu": ("Madame Web", "Cassandra Webb"),
}

def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    chars = data["characters"]
    updated = 0
    for char in chars:
        cid = char.get("id")
        if not cid:
            continue
        mapping = NAME_TO_HERO.get(cid)
        if not mapping:
            continue

        hero_name, real_name = mapping
        current_name = char.get("name", "")

        # Si le nom hero est déjà le name principal et real_name dans aliases, skip
        if current_name == hero_name:
            aliases = char.get("aliases", [])
            if real_name in aliases or real_name == hero_name:
                continue

        # Mettre à jour
        char["name"] = hero_name
        aliases = list(char.get("aliases", []))
        # Retirer l'ancien name des aliases s'il y est
        if current_name in aliases:
            aliases.remove(current_name)
        # Ajouter le vrai nom en premier si différent du hero
        if real_name and real_name != hero_name and real_name not in aliases:
            aliases.insert(0, real_name)
        # Garder hero_name et current_name dans aliases pour la recherche
        for n in (hero_name, current_name):
            if n and n not in aliases:
                aliases.append(n)
        char["aliases"] = aliases
        updated += 1
        print(f"  {cid}: {current_name} -> {hero_name} (alias: {real_name})")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n{updated} personnages mis à jour.")

if __name__ == "__main__":
    main()
