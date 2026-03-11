#!/usr/bin/env python3
"""
Télécharge les photos des personnages manquants depuis les wikis Marvel.
 Essaie successivement: MCU wiki, X-Men, Spider-Man, Marvel Database.

Usage:
  python scripts/download_wiki_photos_mcu_missing.py [--limit N]
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

# Wikis à essayer en ordre (MCU d'abord, puis fallbacks)
WIKIS_TO_TRY = [
    "marvelcinematicuniverse.fandom.com",
    "xmenmovies.fandom.com",
    "amazingspiderman.fandom.com",
    "spidermantrilogy.fandom.com",
    "marvel.fandom.com",
]
DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
PHOTOS_DIR = Path(__file__).resolve().parent.parent / "public" / "universes" / "marvel-cineverse" / "characters"

# Alias pour les persos dont le nom wiki diffère de l'id/nom JSON
MCU_NAME_ALIASES: Dict[str, str] = {
    "brunnhilde": "Valkyrie",
    "adrian-toomes-jr": "Adrian Toomes",
    "aleksei-sytsevich": "Rhino",
    "alligator-loki-mcu": "Alligator Loki",
    "ancient-one": "Ancient One",
    "anne-weying": "Anne Weying",
    "baron-helmut-zemo": "Helmut Zemo",
    "baron-mordo-838-mcu": "Karl Mordo",
    "baron-wolfgang-von-strucker": "Wolfgang von Strucker",
    "black-bolt-838-mcu": "Black Bolt",
    "boastful-loki-mcu": "Boastful Loki",
    "captain-carter-mcu": "Peggy Carter",
    "cassie-webb": "Cassandra Webb",
    "charles-xavier-838-mcu": "Charles Xavier",
    "classic-loki-mcu": "Classic Loki",
    "death-dealer": "Death Dealer",
    "gamora-2014-mcu": "Gamora",
    "general-dox": "General Dox",
    "he-who-remains": "He Who Remains",
    "he-who-remains-mcu": "He Who Remains",
    "high-evolutionary": "High Evolutionary",
    "j-jonah-jameson": "J. Jonah Jameson",
    "kang-the-conqueror-mcu": "Kang the Conqueror",
    "kid-loki-mcu": "Kid Loki",
    "killmonger-king-mcu": "Erik Killmonger",
    "maria-rambeau-838-mcu": "Maria Rambeau",
    "mordo": "Karl Mordo",
    "party-thor-mcu": "Thor",
    "president-loki-mcu": "President Loki",
    "reed-richards-838-mcu": "Reed Richards",
    "strange-supreme-mcu": "Stephen Strange",
    "sylvie-mcu": "Sylvie",
    "the-watcher": "Watcher",
    "victor-timely-mcu": "Victor Timely",
    "zombie-strange-mcu": "Stephen Strange",
    "brad-wolfe": "Brad Wolfe",
    "kurt-wagner": "Nightcrawler",
    "raven-darkholme": "Mystique",
    "jean-grey": "Jean Grey",
}


def strip_universe_suffix(name: str) -> str:
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
    parser = argparse.ArgumentParser(description="Download missing MCU character photos from English wiki")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
    with open(DEFAULT_JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    char_by_id = {c["id"]: c for c in data.get("characters", []) if c.get("id")}
    photo_stems = {p.stem for p in PHOTOS_DIR.iterdir()} if PHOTOS_DIR.exists() else set()
    missing_ids = sorted(set(char_by_id) - photo_stems)

    if args.limit:
        missing_ids = missing_ids[: args.limit]

    if not missing_ids:
        print("Aucun personnage sans photo.")
        return

    print(f"Recherche des photos pour {len(missing_ids)} personnages (essai: MCU, X-Men, Spider-Man, Marvel DB)...")

    ok = 0
    err = 0
    for cid in missing_ids:
        char = char_by_id[cid]
        name = char.get("name", "")
        search_name = MCU_NAME_ALIASES.get(cid, strip_universe_suffix(name))

        existing = list(PHOTOS_DIR.glob(f"{glob.escape(cid)}.*"))
        if existing:
            ok += 1
            continue

        downloaded = False
        for wiki_host in WIKIS_TO_TRY:
            api_url = f"https://{wiki_host}/api.php"
            try:
                resolved = resolve_title_to_page(search_name, api_url)
                if not resolved:
                    continue
                pageid, wiki_title = resolved
                img_url = get_page_image(wiki_title, api_url)
                if not img_url:
                    continue
                base_url = img_url.split("?")[0].lower()
                ext = "jpg"
                if ".png" in base_url:
                    ext = "png"
                elif ".webp" in base_url:
                    ext = "webp"
                out_path = PHOTOS_DIR / f"{cid}.{ext}"
                r = requests.get(img_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
                r.raise_for_status()
                out_path.write_bytes(r.content)
                ok += 1
                print(f"  [{ok}] {cid} ({name}) <- {wiki_host.split('.')[0]} -> {out_path.name}", flush=True)
                downloaded = True
                break
            except Exception:
                pass
            time.sleep(0.2)

        if not downloaded:
            err += 1
            print(f"  [skip] {cid} ({name}) - aucune image trouvée sur les wikis", flush=True)

        time.sleep(0.25)

    print(f"\nTerminé. {ok} photos, {err} erreurs/skip. Sortie: {PHOTOS_DIR.absolute()}")


if __name__ == "__main__":
    main()
