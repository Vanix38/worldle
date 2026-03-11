#!/usr/bin/env python3
"""
Remplit les acteurs "Inconnu" en interrogeant les APIs des wikis Fandom.
 essaie successivement: MCU, X-Men, Spider-Man, Marvel Database, Spider-Verse...

Usage:
  python scripts/fill_inconnu_acteurs.py [--dry-run] [--limit N]
"""

import argparse
import json
import re
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    exit(1)

DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# world → wikis à essayer (ordre de priorité)
WORLD_WIKIS: Dict[str, List[str]] = {
    "MCU": [
        "marvelcinematicuniverse.fandom.com",
        "marvel.fandom.com",
    ],
    "Defenders (Netflix)": [
        "marvelcinematicuniverse.fandom.com",
        "marvel.fandom.com",
    ],
    "SSU": [
        "sonys-spider-man-universe.fandom.com",
        "marvel.fandom.com",
    ],
    "Raimi-Verse": [
        "spidermantrilogy.fandom.com",
        "marvel.fandom.com",
    ],
    "Webb-Verse": [
        "amazingspiderman.fandom.com",
        "spiderman-films.fandom.com",
        "marvel.fandom.com",
    ],
    "Fox X-Men": [
        "xmenmovies.fandom.com",
        "marvel.fandom.com",
    ],
    "Fantastic Four (Fox)": [
        "marvel.fandom.com",
    ],
    "AoS/Inhumans": [
        "marvelcinematicuniverse.fandom.com",
        "marvel.fandom.com",
    ],
    "Spider-Verse (animé)": [
        "intothespiderverse.fandom.com",
        "marvel.fandom.com",
    ],
    "Indépendants": [
        "marvel.fandom.com",
        "xmenmovies.fandom.com",
    ],
}
DEFAULT_WIKIS = [
    "marvelcinematicuniverse.fandom.com",
    "xmenmovies.fandom.com",
    "amazingspiderman.fandom.com",
    "spidermantrilogy.fandom.com",
    "sonys-spider-man-universe.fandom.com",
    "marvel.fandom.com",
]

# Alias nom wiki pour personnages difficiles à trouver
NAME_ALIASES: Dict[str, str] = {
    "brunnhilde": "Valkyrie",
    "adrian-toomes-jr": "Adrian Toomes",
    "baron-helmut-zemo": "Helmut Zemo",
    "baron-mordo-838-mcu": "Karl Mordo",
    "black-bolt-838-mcu": "Black Bolt",
    "captain-carter-mcu": "Peggy Carter",
    "charles-xavier-838-mcu": "Charles Xavier",
    "gamora-2014-mcu": "Gamora",
    "killmonger-king-mcu": "Erik Killmonger",
    "maria-rambeau-838-mcu": "Maria Rambeau",
    "party-thor-mcu": "Thor",
    "reed-richards-838-mcu": "Reed Richards",
    "strange-supreme-mcu": "Stephen Strange",
    "sylvie-mcu": "Sylvie",
    "victor-timely-mcu": "Victor Timely",
    "zombie-strange-mcu": "Stephen Strange",
    "raven-darkholme": "Mystique",
    "jean-grey": "Jean Grey",
    "kurt-wagner": "Nightcrawler",
}


def clean_wiki_text(raw: str) -> str:
    """Nettoie le markup wiki ([[Link|Text]] -> Text)."""
    if not raw or not isinstance(raw, str):
        return ""
    s = raw
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"<small>[^<]*</small>", "", s, flags=re.IGNORECASE)
    s = re.sub(r"<br\s*/?>", ", ", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def extract_infobox(wikitext: str) -> Optional[Dict[str, str]]:
    """Extrait le premier infobox Character."""
    for pattern in [
        "{{Character",
        "{{Infobox character",
        "{{Infobox",
        "{{CharInfobox",
    ]:
        start = wikitext.find(pattern)
        if start == -1:
            continue
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


def get_infobox_value(infobox: Dict[str, str], keys: List[str]) -> Optional[str]:
    infobox_lower = {k.lower(): v for k, v in infobox.items()}
    for key in keys:
        val = infobox_lower.get(key.lower())
        if val and str(val).strip():
            return str(val).strip()
    return None


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
        r = requests.get(api_url, params=params, timeout=15)
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
        r2 = requests.get(api_url, params=params2, timeout=15)
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


def get_page_content(pageid: int, api_url: str) -> Optional[str]:
    params = {
        "action": "query",
        "pageids": pageid,
        "prop": "revisions",
        "rvprop": "content",
        "rvslots": "main",
        "format": "json",
        "formatversion": 2,
    }
    try:
        r = requests.get(api_url, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
    except Exception:
        return None
    pages = data.get("query", {}).get("pages", [])
    if not pages or "missing" in pages[0]:
        return None
    revs = pages[0].get("revisions", [])
    if not revs:
        return None
    slot = revs[0].get("slots", {}).get("main", {})
    return slot.get("content", "")


def _get_search_names(char: dict) -> List[str]:
    """Liste des noms à essayer pour la recherche (alias, name, etc.)."""
    cid = char.get("id", "")
    names = []
    if cid in NAME_ALIASES:
        names.append(NAME_ALIASES[cid])
    name = char.get("name", "")
    if name and name not in names:
        names.append(name)
    for a in char.get("aliases", [])[:5]:
        if isinstance(a, str) and a not in names:
            names.append(a)
    return names


def _pick_wikis(char: dict) -> List[str]:
    """Choisit les wikis selon world et firstAppearance."""
    world = char.get("world", "")
    fa = char.get("firstAppearance", "")
    wikis = list(WORLD_WIKIS.get(world, DEFAULT_WIKIS))
    # firstAppearance X-Men/Deadpool → priorité xmenmovies même si world=MCU
    if fa and re.search(r"X-Men|Deadpool|Logan|Wolverine", fa, re.I) and "xmenmovies.fandom.com" not in wikis[:2]:
        wikis = ["xmenmovies.fandom.com"] + [w for w in wikis if w != "xmenmovies.fandom.com"]
    # firstAppearance Venom/Morbius/Madame Web → SSU
    if fa and re.search(r"Venom|Morbius|Madame Web", fa, re.I) and "sonys-spider-man-universe.fandom.com" not in wikis[:2]:
        wikis = ["sonys-spider-man-universe.fandom.com"] + [w for w in wikis if w != "sonys-spider-man-universe.fandom.com"]
    return wikis


def fetch_actor_for_char(char: dict, wikis: List[str]) -> Optional[str]:
    """Récupère l'acteur depuis les wikis. Retourne le premier trouvé."""
    search_names = _get_search_names(char)
    if not search_names:
        return None

    for wiki_host in wikis:
        api_url = f"https://{wiki_host}/api.php"
        resolved = None
        for search_name in search_names:
            resolved = resolve_title_to_page(search_name, api_url)
            if not resolved:
                base = re.sub(r"\s*\([^)]*\)\s*$", "", str(search_name)).strip()
                if base != search_name:
                    resolved = resolve_title_to_page(base, api_url)
            if resolved:
                break
        if not resolved:
            continue

        pageid, _ = resolved
        content = get_page_content(pageid, api_url)
        if not content:
            continue

        infobox = extract_infobox(content)
        if not infobox:
            continue

        # Spider-Verse animé : priorité voice actor (VO)
        # SSU wiki utilise portrayed_by au lieu de actor
        is_spider_verse = "Spider-Verse" in str(char.get("world", ""))
        keys = ["voice actor", "actor"] if is_spider_verse else ["actor", "voice actor", "portrayed_by"]
        val = get_infobox_value(infobox, keys)
        if val:
            first_part = re.split(r"<br\s*/?>", val, flags=re.IGNORECASE)[0].strip()
            # Retirer |name=X|game=Y (params template MediaWiki en fin de ligne)
            first_part = re.sub(r"\|\s*[a-z]+\s*=.*$", "", first_part).strip()
            # Retirer les crédits entre parenthèses (''film1'', ''film2'')
            first_part = re.sub(r"\s*\([^)]*\)\s*$", "", first_part).strip()
            cleaned = clean_wiki_text(first_part)
            if cleaned and len(cleaned) > 2 and len(cleaned) < 80:
                return cleaned

        time.sleep(0.15)

    return None


def main():
    parser = argparse.ArgumentParser(description="Fill acteur Inconnu from Fandom wiki APIs")
    parser.add_argument("--json", type=str, default=str(DEFAULT_JSON_PATH))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    json_path = Path(args.json)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    chars = data.get("characters", [])
    to_process = [c for c in chars if c.get("acteur") == "Inconnu"]
    if args.limit:
        to_process = to_process[: args.limit]

    print(f"{len(to_process)} personnages avec acteur Inconnu.")

    updated_count = 0
    for i, char in enumerate(chars):
        if char.get("acteur") != "Inconnu":
            continue
        wikis = _pick_wikis(char)

        actor = fetch_actor_for_char(char, wikis)
        if actor:
            chars[i]["acteur"] = actor
            updated_count += 1
            print(f"  [{updated_count}] {char.get('name')} ({char.get('id')}) -> {actor}")
        time.sleep(0.2)

    if not args.dry_run and updated_count > 0:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nTerminé. {updated_count} acteurs mis à jour.")
    else:
        print(f"\nDry-run: {updated_count} acteurs auraient été mis à jour.")


if __name__ == "__main__":
    main()
