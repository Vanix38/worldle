#!/usr/bin/env python3
"""
Récupère les infos des personnages manquants depuis les wikis Fandom des autres univers Marvel.
(MCU exclus - utiliser fetch_mcu_wiki_characters.py pour le MCU)

Univers → Wiki Fandom:
- SSU: sonys-spider-man-universe.fandom.com
- Raimi-Verse: spidermantrilogy.fandom.com
- Webb-Verse: spiderman-films.fandom.com (ou spidermantrilogy si pas trouvé)
- Fox X-Men: xmenmovies.fandom.com
- Fantastic Four (Fox): xmenmovies.fandom.com (FF partage le wiki)
- AoS/Inhumans: marvel.fandom.com (Marvel Database)
- Spider-Verse (animé): intothespiderverse.fandom.com
- Defenders (Netflix): marvelcinematicuniverse.fandom.com (Defenders est sur MCU wiki)
- Indépendants: marvel.fandom.com (Blade, Hulk 2003, etc.)

Usage:
  python scripts/fetch_other_universes_wiki.py [--output-dir DIR] [--limit N] [--univers UNIV]
"""

import argparse
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
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "scripts" / "output" / "mcu_cineverse"

# univers -> (wiki base URL, nom pour logs)
UNIVERS_WIKI = {
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
# Fallback pour Webb-Verse si amazingspiderman n'a pas la page
WEBB_FALLBACK = "spiderman-films.fandom.com"


def slug(title: str) -> str:
    s = re.sub(r'[<>:"/\\|?*]', "_", title)
    s = s.strip().strip(".") or "unnamed"
    return s[:200]


def strip_universe_suffix(name: str) -> str:
    """Retire (Terre-XXX) du nom pour la recherche wiki."""
    return re.sub(r'\s*\(Terre-\d+\)\s*$', '', name).strip()


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
    except Exception as e:
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


def get_page_content(pageid: int, api_url: str) -> Optional[Dict[str, str]]:
    params = {
        "action": "query",
        "pageids": pageid,
        "prop": "revisions",
        "rvprop": "content|timestamp",
        "rvslots": "main",
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
    if not pages:
        return None
    page = pages[0]
    if "missing" in page:
        return None
    revs = page.get("revisions", [])
    if not revs:
        return None
    slot = revs[0].get("slots", {}).get("main", {})
    base = api_url.replace("/api.php", "")
    return {
        "title": page.get("title", ""),
        "pageid": page.get("pageid"),
        "url": f"{base}/wiki/{page.get('title', '').replace(' ', '_')}",
        "timestamp": revs[0].get("timestamp"),
        "content": slot.get("content", ""),
    }


def extract_infobox(wikitext: str) -> Optional[Dict[str, str]]:
    """Extrait le premier infobox (Character, Infobox, etc.)."""
    for pattern in ["{{Character", "{{Infobox character", "{{Infobox", "{{CharInfobox"]:
        start = wikitext.find(pattern)
        if start != -1:
            start = wikitext.find("\n", start)
            if start == -1:
                continue
            start += 1
            infos = {}
            i = start
            brace_count = 1
            while i < len(wikitext):
                line_end = wikitext.find("\n", i)
                if line_end == -1:
                    line_end = len(wikitext)
                line = wikitext[i:line_end].strip()
                i = line_end + 1
                if line == "}}":
                    brace_count -= 1
                    if brace_count == 0:
                        break
                if line.startswith("{{"):
                    brace_count += line.count("{{") - line.count("}}")
                if not (line.startswith("|") and "=" in line):
                    continue
                key, _, value = line.lstrip("|").strip().partition("=")
                key = key.strip()
                value = value.strip().rstrip("}}").strip()
                if key and key not in infos:
                    infos[key] = value
            if infos:
                return infos
    return None


# Alias de recherche pour personnages dont le nom wiki peut différer
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
}


def main():
    parser = argparse.ArgumentParser(description="Fetch missing characters from other univers Fandom wikis")
    parser.add_argument("--json", type=str, default=None)
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--univers", type=str, default=None, help="Filtrer par univers (ex: SSU, Fox X-Men)")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = Path(args.json) if args.json else DEFAULT_JSON_PATH

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    existing = {p.stem for p in out_dir.glob("*.json")}
    chars = [
        c for c in data.get("characters", [])
        if c.get("id") and c["id"] not in existing
    ]

    if args.univers:
        chars = [c for c in chars if c.get("world") == args.univers]
    else:
        # Exclure MCU (déjà géré par fetch_mcu_wiki_characters)
        chars = [c for c in chars if c.get("world") != "MCU"]

    if args.limit:
        chars = chars[: args.limit]

    if not chars:
        print("Aucun personnage manquant à récupérer.")
        return

    print(f"Récupération de {len(chars)} personnages manquants...")
    ok = 0
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
        search_name = NAME_ALIASES.get(cid, strip_universe_suffix(name))

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
            info = get_page_content(pageid, api_url)
            if not info:
                err += 1
                print(f"  [skip] {name} (pas de contenu)", flush=True)
                time.sleep(0.2)
                continue

            infobox = extract_infobox(info["content"])
            if infobox is not None:
                info["infobox"] = infobox
            info["cineverse_id"] = cid
            info["cineverse_name"] = name
            info["cineverse_world"] = univers

            path = out_dir / f"{cid}.json"
            path.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
            ok += 1
            print(f"  [{ok}] {name} ({univers}) -> {wiki_title} -> {path.name}", flush=True)
        except Exception as e:
            err += 1
            print(f"  [error] {name}: {e}", flush=True)

        time.sleep(0.25)

    print(f"\nTerminé. {ok} récupérés, {err} erreurs. Sortie: {out_dir.absolute()}")


if __name__ == "__main__":
    main()
