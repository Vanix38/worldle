#!/usr/bin/env python3
"""
Télécharge les photos des personnages des autres univers Marvel (SSU, Raimi-Verse, Fox X-Men, etc.)
via l'API Fandom. Les photos sont sauvegardées dans public/universes/marvel-cineverse/characters/ avec
l'id du personnage (ex: eddie-brock-ssu.jpg).

Utilise les mêmes wikis et alias que fetch_other_universes_wiki.py.

Usage:
  python scripts/download_wiki_photos_other_universes.py [--univers UNIV] [--limit N]
  
  --univers : filtrer par univers (SSU, Raimi-Verse, Webb-Verse, Fox X-Men, etc.)
  --limit   : limiter le nombre de téléchargements
"""

import argparse
import glob
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "universes" / "marvel-cineverse" / "characters"

# Réutilise la config de fetch_other_universes_wiki
UNIVERS_WIKI: Dict[str, str] = {
    "SSU": "sonys-spider-man-universe.fandom.com",
    "Raimi-Verse": "spidermantrilogy.fandom.com",
    "Webb-Verse": "amazingspiderman.fandom.com",
    "Fox X-Men": "xmenmovies.fandom.com",
    "Fantastic Four (Fox)": "marvel.fandom.com",
    "AoS/Inhumans": "marvel.fandom.com",
    "Spider-Verse (animé)": "intothespiderverse.fandom.com",
    "Defenders (Netflix)": "marvelcinematicuniverse.fandom.com",
    "Indépendants": "marvel.fandom.com",
}
WEBB_FALLBACK = "spiderman-films.fandom.com"

NAME_ALIASES: Dict[str, str] = {
    "eddie-brock-ssu": "Eddie Brock",
    "venom-ssu": "Venom (symbiote)",
    "cletus-kasady-ssu": "Cletus Kasady",
    "carnage-ssu": "Carnage",
    "morbius-ssu": "Michael Morbius",
    "madame-web-ssu": "Cassandra Webb",
    "julia-cornwall-ssu": "Julia Cornwall",
    "kraven-ssu": "Kraven the Hunter",
    "chameleon-ssu": "Chameleon",
    "riot-ssu": "Riot (symbiote)",
    "peter-parker-raimi": "Peter Parker",
    "mary-jane-raimi": "Mary Jane Watson",
    "doc-ock-raimi": "Doctor Octopus",
    "sandman-raimi": "Flint Marko",
    "eddie-brock-raimi": "Eddie Brock",
    "venom-raimi": "Venom",
    "aunt-may-raimi": "May Parker",
    "peter-parker-webb": "Peter Parker",
    "gwen-stacy-webb": "Gwen Stacy",
    "electro-webb": "Max Dillon",
    "lizard-webb": "Curt Connors",
    "green-goblin-webb": "Green Goblin",
    "rhino-webb": "Aleksei Sytsevich",
    "wolverine-fox": "Wolverine",
    "logan-fox": "Logan",
    "professor-x-fox": "Charles Xavier",
    "magneto-fox": "Magneto",
    "cyclops-fox": "Scott Summers",
    "storm-fox": "Storm",
    "beast-fox": "Beast",
    "colossus-fox": "Colossus",
    "deadpool-fox": "Deadpool",
    "cable-fox": "Cable",
    "apocalypse-fox": "Apocalypse",
    "charles-xavier-young-fox": "Charles Xavier",
    "erik-lensherr-young-fox": "Magneto",
    "scarlet-witch-fox": "Wanda Maximoff",
    "reed-richards-fox": "Reed Richards (Earth-121698)",
    "sue-storm-fox": "Sue Storm",
    "johnny-storm-fox": "Human Torch",
    "ben-grimm-fox": "Ben Grimm",
    "doctor-doom-fox": "Doctor Doom",
    "silver-surfer-fox": "Silver Surfer",
    "phil-coulson-aos": "Phil Coulson",
    "daisy-johnson-aos": "Daisy Johnson",
    "melinda-may-aos": "Melinda May",
    "miles-morales-spiderverse": "Miles Morales",
    "gwen-stacy-spiderverse": "Spider-Gwen",
    "peter-b-parker-spiderverse": "Peter B. Parker",
    "miguel-ohara-spiderverse": "Miguel O'Hara",
    "spot-spiderverse": "Spot",
    "kingpin-spiderverse": "Wilson Fisk",
    "blade-ind": "Blade",
    "johnny-blaze-ind": "Johnny Blaze",
    "punisher-2004-ind": "Frank Castle",
    "howard-the-duck-ind": "Howard the Duck",
    "man-thing-ind": "Man-Thing",
    "hulk-2003-ind": "Bruce Banner",
}


def strip_universe_suffix(name: str) -> str:
    """Retire (Terre-XXX) du nom pour la recherche wiki."""
    return re.sub(r"\s*\(Terre-\d+\)\s*$", "", name).strip()


def resolve_title_to_page(name: str, api_url: str) -> Optional[Tuple[int, str]]:
    """Trouve une page du wiki pour ce nom."""
    name_clean = strip_universe_suffix(name)
    title_encoded = name_clean.replace(" ", "_")
    params = {
        "action": "query",
        "titles": title_encoded,
        "redirects": 1,
        "format": "json",
        "formatversion": "2",
    }
    try:
        r = requests.get(api_url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None
    if "error" in data:
        return None
    pages = data.get("query", {}).get("pages", [])
    if pages and "missing" not in pages[0]:
        return pages[0]["pageid"], pages[0].get("title", name_clean)
    params2 = {
        "action": "query",
        "list": "search",
        "srsearch": name_clean,
        "srnamespace": 0,
        "srlimit": 5,
        "format": "json",
        "formatversion": "2",
    }
    try:
        r2 = requests.get(api_url, params=params2, timeout=30)
        r2.raise_for_status()
        hits = r2.json().get("query", {}).get("search", [])
    except Exception:
        return None
    for h in hits:
        t = h.get("title", "")
        if t.startswith("List of"):
            continue
        return h["pageid"], t
    return None


def get_page_image(page_title: str, api_url: str, size: int = 300) -> Optional[str]:
    """Retourne l'URL de l'image principale de la page (prop=pageimages)."""
    params = {
        "action": "query",
        "titles": page_title.replace(" ", "_"),
        "prop": "pageimages",
        "pithumbsize": size,
        "format": "json",
        "formatversion": "2",
    }
    try:
        r = requests.get(api_url, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None
    pages = data.get("query", {}).get("pages", [])
    if not pages or "missing" in pages[0]:
        return None
    thumb = pages[0].get("thumbnail", {})
    return thumb.get("source")


def main():
    parser = argparse.ArgumentParser(
        description="Download character photos from other univers Fandom wikis (SSU, Raimi-Verse, etc.)"
    )
    parser.add_argument("--json", type=str, default=str(DEFAULT_JSON_PATH))
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--univers", type=str, default=None, help="Filtrer par univers (ex: SSU, Raimi-Verse)")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = Path(args.json)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    chars = [
        c
        for c in data.get("characters", [])
        if c.get("id") and c.get("world") and c["world"] != "MCU"
    ]
    if args.univers:
        chars = [c for c in chars if c.get("world") == args.univers]
    if args.limit:
        chars = chars[: args.limit]

    if not chars:
        print("Aucun personnage trouvé (vérifiez --univers).")
        return

    print(f"Téléchargement des photos pour {len(chars)} personnages...")
    ok = 0
    skip = 0
    err = 0

    for char in chars:
        cid = char["id"]
        name = char.get("name", "")
        univers = char.get("world", "")
        if not name:
            err += 1
            print(f"  [skip] {cid} (nom vide)", flush=True)
            continue

        wiki_host = UNIVERS_WIKI.get(univers)
        if not wiki_host:
            err += 1
            print(f"  [skip] {name} (univers '{univers}' inconnu)", flush=True)
            continue

        api_url = f"https://{wiki_host}/api.php"
        search_name = NAME_ALIASES.get(cid, name)

        # Ne pas télécharger si une photo existe déjà (quelle que soit l'extension)
        existing = list(out_dir.glob(f"{glob.escape(cid)}.*"))
        if existing:
            ok += 1
            continue

        try:
            resolved = resolve_title_to_page(search_name, api_url)
            if not resolved:
                if univers == "Webb-Verse" and wiki_host != WEBB_FALLBACK:
                    api_url = f"https://{WEBB_FALLBACK}/api.php"
                    resolved = resolve_title_to_page(search_name, api_url)
                if not resolved:
                    err += 1
                    print(f"  [skip] {name} ({univers}) - page non trouvée", flush=True)
                    time.sleep(0.2)
                    continue

            pageid, wiki_title = resolved
            img_url = get_page_image(wiki_title, api_url)
            if not img_url:
                err += 1
                print(f"  [skip] {name} ({univers}) - pas d'image", flush=True)
                time.sleep(0.2)
                continue

            base_url = img_url.split("?")[0].lower()
            ext = "jpg"
            if ".png" in base_url:
                ext = "png"
            elif ".webp" in base_url:
                ext = "webp"
            out_path = out_dir / f"{cid}.{ext}"

            r = requests.get(img_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            out_path.write_bytes(r.content)
            ok += 1
            print(f"  [{ok}] {name} ({univers}) -> {out_path.name}", flush=True)
        except Exception as e:
            err += 1
            print(f"  [error] {name}: {e}", flush=True)

        time.sleep(0.25)

    print(f"\nTerminé. {ok} photos, {skip} skip, {err} erreurs. Sortie: {out_dir.absolute()}")


if __name__ == "__main__":
    main()
