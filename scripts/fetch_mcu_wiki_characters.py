#!/usr/bin/env python3
"""
Récupère les infos des personnages du wiki MCU Fandom et sauvegarde un fichier par personnage.

Deux modes :
- --source json : lit la liste depuis data/marvel-cineverse.json (ou --json PATH),
  cherche chaque nom sur le wiki et télécharge la page. Fichiers nommés par id du JSON.
- --source category : liste Category:Characters et télécharge chaque page (comportement historique).

Usage:
  python scripts/fetch_mcu_wiki_characters.py --source json [--json PATH] [--output-dir DIR]
  python scripts/fetch_mcu_wiki_characters.py --source category [--limit N] [--output-dir DIR]
"""

import argparse
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, Iterator, List, Optional, Tuple

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

BASE_URL = "https://marvelcinematicuniverse.fandom.com"
API_URL = f"{BASE_URL}/api.php"

DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Alias de recherche pour personnages dont le nom wiki peut différer
MCU_NAME_ALIASES: Dict[str, str] = {
    "sylvie-mcu": "Sylvie",
    "president-loki-mcu": "President Loki",
    "classic-loki-mcu": "Classic Loki",
    "kid-loki-mcu": "Kid Loki",
    "alligator-loki-mcu": "Alligator Loki",
    "boastful-loki-mcu": "Boastful Loki",
    "he-who-remains-mcu": "He Who Remains",
    "kang-the-conqueror-mcu": "Kang the Conqueror",
    "victor-timely-mcu": "Victor Timely",
    "gamora-2014-mcu": "Gamora/Cosmic Time Heist",
    "captain-carter-mcu": "Captain Carter",
    "strange-supreme-mcu": "Strange Supreme",
    "baron-mordo-838-mcu": "Baron Mordo/Earth-838",
    "reed-richards-838-mcu": "Mister Fantastic/Earth-838",
    "black-bolt-838-mcu": "Black Bolt/Earth-838",
    "charles-xavier-838-mcu": "Professor X/Earth-838",
    "maria-rambeau-838-mcu": "Maria Rambeau/Earth-838",
    "party-thor-mcu": "Thor/Party Prince Thor",
    "tchalla-star-lord-mcu": "T'Challa/Ravager T'Challa",
    "zombie-strange-mcu": "Doctor Strange/Zombie Outbreak",
    "killmonger-king-mcu": "Erik Killmonger",
}


def slug(title: str) -> str:
    """Convertit un titre de page en nom de fichier sûr."""
    s = re.sub(r'[<>:"/\\|?*]', "_", title)
    s = s.strip().strip(".") or "unnamed"
    return s[:200]


def resolve_title_to_page(name: str) -> Optional[Tuple[int, str]]:
    """Trouve une page du wiki pour ce nom : d'abord titre exact (avec redirections), puis recherche."""
    title_encoded = name.replace(" ", "_")
    params = {
        "action": "query",
        "titles": title_encoded,
        "redirects": 1,
        "format": "json",
        "formatversion": "2",
    }
    r = requests.get(API_URL, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
    if "error" in data:
        return None
    pages = data.get("query", {}).get("pages", [])
    if pages and "missing" not in pages[0]:
        return pages[0]["pageid"], pages[0].get("title", name)
    params2 = {
        "action": "query",
        "list": "search",
        "srsearch": name,
        "srnamespace": 0,
        "srlimit": 5,
        "format": "json",
        "formatversion": "2",
    }
    r2 = requests.get(API_URL, params=params2, timeout=30)
    r2.raise_for_status()
    hits = r2.json().get("query", {}).get("search", [])
    for h in hits:
        t = h.get("title", "")
        if t.startswith("List of"):
            continue
        return h["pageid"], t
    return None


def get_category_members(
    cmtitle: str = "Category:Characters",
    limit: Optional[int] = None,
    skip_lists: bool = True,
) -> Iterator[Tuple[int, str]]:
    """Génère les (pageid, title) des pages dans la catégorie."""
    params = {
        "action": "query",
        "list": "categorymembers",
        "cmtitle": cmtitle,
        "cmlimit": 500,
        "cmtype": "page",
        "format": "json",
    }
    count = 0
    while True:
        r = requests.get(API_URL, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
        if "error" in data:
            raise RuntimeError(data["error"])
        for m in data.get("query", {}).get("categorymembers", []):
            title = m.get("title", "")
            if skip_lists and title.startswith("List of"):
                continue
            yield m["pageid"], title
            count += 1
            if limit is not None and count >= limit:
                return
        if "continue" not in data:
            break
        params.update(data["continue"])
        time.sleep(0.2)


def get_page_content(pageid: int) -> Optional[Dict[str, str]]:
    """Récupère le contenu wikitext d'une page par pageid."""
    params = {
        "action": "query",
        "pageids": pageid,
        "prop": "revisions",
        "rvprop": "content|timestamp",
        "rvslots": "main",
        "format": "json",
        "formatversion": "2",
    }
    r = requests.get(API_URL, params=params, timeout=30)
    r.raise_for_status()
    data = r.json()
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
    return {
        "title": page.get("title", ""),
        "pageid": page.get("pageid"),
        "url": f"{BASE_URL}/wiki/{page.get('title', '').replace(' ', '_')}",
        "timestamp": revs[0].get("timestamp"),
        "content": slot.get("content", ""),
    }


def extract_infobox(wikitext: str) -> Optional[Dict[str, str]]:
    """Extrait les paires clé=valeur du premier template {{Character ... }}."""
    start = wikitext.find("{{Character")
    if start == -1:
        return None
    start = wikitext.find("\n", start) + 1
    infos = {}
    i = start
    while i < len(wikitext):
        line_end = wikitext.find("\n", i)
        if line_end == -1:
            line_end = len(wikitext)
        line = wikitext[i:line_end].strip()
        i = line_end + 1
        if not line or line == "}}":
            break
        if not (line.startswith("|") and "=" in line):
            continue
        key, _, value = line.lstrip("|").strip().partition("=")
        key = key.strip()
        value = value.strip().rstrip("}}").strip()
        if key and key not in infos:
            infos[key] = value
    return infos if infos else None


def main():
    parser = argparse.ArgumentParser(description="Fetch MCU wiki characters (one file per character)")
    parser.add_argument("--source", choices=["category", "json"], default="json", help="Source: json (marvel-cineverse) ou category (Category:Characters)")
    parser.add_argument("--json", type=str, default=None, help="Chemin du JSON (défaut: data/marvel-cineverse.json)")
    parser.add_argument("--output-dir", type=str, default="scripts/output/mcu_cineverse", help="Dossier de sortie")
    parser.add_argument("--missing-only", action="store_true", help="Ne récupérer que les personnages sans fichier existant (mode json)")
    parser.add_argument("--limit", type=int, default=None, help="Limiter le nombre de personnages (modes json et category)")
    parser.add_argument("--skip-lists", action="store_true", default=True, help="Ignorer les pages 'List of...' (mode category)")
    parser.add_argument("--no-skip-lists", action="store_false", dest="skip_lists")
    parser.add_argument("--format", choices=["json", "txt"], default="json", help="Format par fichier")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    if args.source == "json":
        json_path = Path(args.json) if args.json else DEFAULT_JSON_PATH
        if not json_path.is_file():
            print(f"Fichier introuvable: {json_path}", file=sys.stderr)
            sys.exit(1)
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        characters: List[Dict[str, str]] = data.get("characters", [])
        if args.missing_only:
            existing = {p.stem for p in out_dir.glob("*.json")}
            characters = [c for c in characters if (c.get("id") or slug(c.get("name", "unknown"))) not in existing]
        if args.limit is not None:
            characters = characters[: args.limit]
        if not characters:
            print("Aucun personnage dans le JSON.", file=sys.stderr)
            sys.exit(1)
        print(f"Récupération de {len(characters)} personnages depuis le wiki (source: {json_path.name})...")
        total = 0
        errors = 0
        for char in characters:
            cid = char.get("id") or slug(char.get("name", "unknown"))
            name = char.get("name", "")
            if not name:
                errors += 1
                print(f"  [skip] id={cid} (nom vide)", flush=True)
                continue
            total += 1
            search_name = MCU_NAME_ALIASES.get(cid, name)
            try:
                resolved = resolve_title_to_page(search_name)
                if not resolved:
                    errors += 1
                    print(f"  [skip] {name} (page non trouvée)", flush=True)
                    time.sleep(0.15)
                    continue
                pageid, wiki_title = resolved
                info = get_page_content(pageid)
                if not info:
                    errors += 1
                    print(f"  [skip] {name} (pas de contenu)", flush=True)
                    time.sleep(0.15)
                    continue
                if args.format == "json":
                    infobox = extract_infobox(info["content"])
                    if infobox is not None:
                        info["infobox"] = infobox
                    info["cineverse_id"] = cid
                    info["cineverse_name"] = name
                    info["cineverse_world"] = char.get("world", "MCU")
                    path = out_dir / f"{cid}.json"
                    path.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
                else:
                    path = out_dir / f"{cid}.txt"
                    path.write_text(info["content"], encoding="utf-8")
                print(f"  [{total}] {name} -> {wiki_title} -> {path.name}", flush=True)
            except Exception as e:
                errors += 1
                print(f"  [error] {name}: {e}", flush=True)
            time.sleep(0.2)
        print(f"\nTerminé. {total} traités, {errors} erreurs. Sortie: {out_dir.absolute()}")
        return

    # Mode category
    print("Listing Category:Characters...")
    total = 0
    errors = 0
    for pageid, title in get_category_members(limit=args.limit, skip_lists=args.skip_lists):
        total += 1
        try:
            info = get_page_content(pageid)
            if not info:
                errors += 1
                print(f"  [skip] {title} (no content)", flush=True)
                continue
            name = slug(info["title"])
            if args.format == "json":
                infobox = extract_infobox(info["content"])
                if infobox is not None:
                    info["infobox"] = infobox
                path = out_dir / f"{name}.json"
                path.write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding="utf-8")
            else:
                path = out_dir / f"{name}.txt"
                path.write_text(info["content"], encoding="utf-8")
            print(f"  [{total}] {info['title']} -> {path.name}", flush=True)
        except Exception as e:
            errors += 1
            print(f"  [error] {title}: {e}", flush=True)
        time.sleep(0.15)

    print(f"\nDone. {total} processed, {errors} errors. Output: {out_dir.absolute()}")


if __name__ == "__main__":
    main()
