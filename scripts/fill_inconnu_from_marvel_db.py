#!/usr/bin/env python3
"""
Remplit les champs status, species, gender "Inconnu" en interrogeant marvel.fandom.com
(Marvel Database) qui a des infobox Character complètes.

Usage:
  python scripts/fill_inconnu_from_marvel_db.py [--dry-run] [--limit N]
"""

import argparse
import json
import re
import time
from pathlib import Path
from typing import Dict, Optional

try:
    import requests
except ImportError:
    print("Install requests: pip install requests")
    exit(1)

DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
MARVEL_DB_API = "https://marvel.fandom.com/api.php"

# Traductions EN -> FR pour uniformiser
STATUS_TRANSLATIONS = {
    "alive": "Vivant",
    "dead": "Mort",
    "deceased": "Mort",
    "unknown": "Inconnu",
}

GENDER_TRANSLATIONS = {
    "male": "Homme",
    "female": "Femme",
    "non-binary": "Non-binaire",
    "unknown": "Inconnu",
}


def clean_wiki_text(raw: str) -> str:
    """Nettoie le markup wiki pour extraire du texte lisible."""
    if not raw or not isinstance(raw, str):
        return ""
    s = raw
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    for _ in range(5):
        prev = s
        s = re.sub(r"\{\{([^|{]+)\|([^{}]*)\}\}", r"\2", s)
        if s == prev:
            break
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.DOTALL)
    s = re.sub(r"<br\s*/?>", ", ", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def extract_infobox(wikitext: str) -> Optional[Dict[str, str]]:
    """Extrait le premier infobox Character (incl. Marvel Database:Character Template)."""
    for pattern in [
        "{{Marvel Database:Character Template",
        "{{Character",
        "{{Infobox character",
        "{{Infobox",
        "{{CharInfobox",
    ]:
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


def get_infobox_value(infobox: Dict[str, str], keys: list) -> Optional[str]:
    infobox_lower = {k.lower(): v for k, v in infobox.items()}
    for key in keys:
        val = infobox_lower.get(key.lower())
        if val and str(val).strip():
            return str(val).strip()
    return None


# Overrides quand Marvel DB retourne des données incorrectes (mauvaise page Earth, etc.)
STATUS_OVERRIDES = {
    "ororo-munroe": "Vivant",
    "bobby-drake": "Vivant",
    "warren-worthington-iii": "Vivant",
    "sue-storm-fox": "Vivant",
    "johnny-storm-fox": "Vivant",
    "reed-richards-fox": "Vivant",
    "ben-grimm-fox": "Vivant",
    "silver-surfer-fox": "Vivant",
}
GENDER_OVERRIDES = {
    "ororo-munroe": "Femme",
    "kitty-pryde": "Femme",
    "daisy-johnson-aos": "Femme",
    "sue-storm-fox": "Femme",
    "medusa-aos": "Femme",
    "peggy-carter-aos": "Femme",
    "captain-carter-mcu": "Femme",
}
SPECIES_OVERRIDES = {
    "sergei-kravinoff": "Humain",
    "kraven-ssu": "Humain",
    "shriek": "Humaine mutée",
    "grandmaster": "Élder de l'univers",
    "punisher-2004-ind": "Humain",
}

# Noms de recherche pour Marvel Database (page peut différer du nom cineverse)
MARVEL_DB_SEARCH = {
    "Docteur-doom-fox": "Victor von Doom (Earth-121698)",
    "doctor-doom-fox": "Victor von Doom (Earth-121698)",
    "drax": "Drax (Earth-199999)",
    "rocket-raccoon": "Rocket Raccoon (Earth-199999)",
    "groot": "Groot (Earth-199999)",
    "michael-morbius": "Michael Morbius (Earth-8311)",
    "sergei-kravinoff": "Sergei Kravinoff (Earth-8311)",
    "kraven-ssu": "Sergei Kravinoff (Earth-8311)",
    "shriek": "Shriek (Earth-8311)",
    "patrick-mulligan": "Patrick Mulligan (Earth-8311)",
    "cletus-kasady": "Cletus Kasady (Earth-8311)",
    "cletus-kasady-ssu": "Cletus Kasady (Earth-8311)",
    "eddie-brock": "Eddie Brock (Earth-199999)",
    "eddie-brock-ssu": "Eddie Brock (Earth-8311)",
    "venom-ssu": "Venom (Earth-8311)",
    "ororo-munroe": "Ororo Munroe (Earth-10005)",
    "rogue": "Rogue (Earth-10005)",
    "bobby-drake": "Bobby Drake (Earth-10005)",
    "reed-richards-fox": "Reed Richards (Earth-121698)",
    "sue-storm-fox": "Sue Storm (Earth-121698)",
    "johnny-storm-fox": "Johnny Storm (Earth-121698)",
    "ben-grimm-fox": "Ben Grimm (Earth-121698)",
    "silver-surfer-fox": "Silver Surfer (Earth-121698)",
    "phil-coulson-aos": "Phil Coulson (Earth-199999)",
    "daisy-johnson-aos": "Daisy Johnson (Earth-199999)",
    "melinda-may-aos": "Melinda May (Earth-199999)",
    "blade-ind": "Blade (Earth-26320)",
    "johnny-blaze-ind": "Johnny Blaze (Earth-26320)",
    "howard-the-duck-ind": "Howard the Duck (Earth-8311)",
    "man-thing-ind": "Man-Thing (Earth-26320)",
    "kitty-pryde": "Kitty Pryde (Earth-10005)",
    "warren-worthington-iii": "Warren Worthington III (Earth-10005)",
    "grandmaster": "Grandmaster (Earth-199999)",
    "taneleer-tivan": "Taneleer Tivan (Earth-199999)",
    "baron-wolfgang-von-strucker": "Wolfgang von Strucker (Earth-199999)",
    "baron-helmut-zemo": "Helmut Zemo (Earth-199999)",
    "anne-weying": "Anne Weying (Earth-8311)",
    "ebony-maw": "Ebony Maw (Earth-199999)",
    "cull-obsidian": "Cull Obsidian (Earth-199999)",
    "proxima-midnight": "Proxima Midnight (Earth-199999)",
    "corvus-glaive": "Corvus Glaive (Earth-199999)",
    "phil-coulson-aos": "Phil Coulson (Earth-199999)",
    "daisy-johnson-aos": "Daisy Johnson (Earth-199999)",
    "melinda-may-aos": "Melinda May (Earth-199999)",
    "leo-fitz-aos": "Leo Fitz (Earth-199999)",
    "jemma-simmons-aos": "Jemma Simmons (Earth-199999)",
    "peggy-carter-aos": "Peggy Carter (Earth-199999)",
    "howard-stark-aos": "Howard Stark (Earth-199999)",
    "black-bolt-aos": "Black Bolt (Earth-199999)",
    "medusa-aos": "Medusa (Earth-199999)",
    "blade-ind": "Blade (Earth-26320)",
    "whistler-ind": "Whistler (Earth-26320)",
    "johnny-blaze-ind": "Johnny Blaze (Earth-26320)",
    "punisher-2004-ind": "Frank Castle (Earth-26320)",
    "captain-carter-mcu": "Peggy Carter (Earth-8311)",
}


def search_marvel_db(query: str) -> Optional[tuple]:
    """Recherche une page sur Marvel Database. Retourne (pageid, title) ou None."""
    # 1. Essayer résolution directe par titre (redirects inclus)
    params = {
        "action": "query",
        "titles": query.replace(" ", "_"),
        "redirects": 1,
        "format": "json",
        "formatversion": 2,
    }
    try:
        r = requests.get(MARVEL_DB_API, params=params, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception:
        pass
    else:
        pages = data.get("query", {}).get("pages", [])
        if pages and "missing" not in pages[0]:
            return pages[0]["pageid"], pages[0].get("title", query)

    # 2. Fallback: recherche full-text
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srnamespace": 0,
        "srlimit": 10,
        "format": "json",
        "formatversion": 2,
    }
    try:
        r = requests.get(MARVEL_DB_API, params=params, timeout=30)
        r.raise_for_status()
        hits = r.json().get("query", {}).get("search", [])
    except Exception:
        return None
    for h in hits:
        t = h.get("title", "")
        if t.startswith(("List of", "Category:", "File:", "Template:")):
            continue
        return h["pageid"], t
    return None


def get_page_content(pageid: int) -> Optional[dict]:
    params = {
        "action": "query",
        "pageids": pageid,
        "prop": "revisions",
        "rvprop": "content|timestamp",
        "rvslots": "main",
        "format": "json",
        "formatversion": 2,
    }
    try:
        r = requests.get(MARVEL_DB_API, params=params, timeout=30)
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
    return {
        "title": pages[0].get("title", ""),
        "content": slot.get("content", ""),
    }


def translate_value(val: str, field: str) -> str:
    """Traduit status/gender en français si pertinent."""
    low = val.lower().strip()
    if field == "status":
        for en, fr in STATUS_TRANSLATIONS.items():
            if en in low:
                return fr
    elif field == "gender":
        for en, fr in GENDER_TRANSLATIONS.items():
            if en in low or low == en:
                return fr
    return val


def fetch_and_fill(char: dict, dry_run: bool) -> dict:
    """Récupère status/species/gender depuis Marvel DB et met à jour le personnage."""
    cid = char.get("id", "")
    needs = []
    if char.get("status") == "Inconnu":
        needs.append("status")
    if char.get("species") == "Inconnu":
        needs.append("species")
    if char.get("gender") == "Inconnu":
        needs.append("gender")
    if not needs:
        return char

    search_name = MARVEL_DB_SEARCH.get(cid) or char.get("name", "")
    if not search_name:
        return char

    resolved = search_marvel_db(search_name)
    if not resolved:
        # Fallback: recherche par nom simple
        base_name = re.sub(r"\s*\([^)]*\)\s*$", "", search_name).strip()
        resolved = search_marvel_db(base_name)
    if not resolved:
        return char

    pageid, _ = resolved
    page = get_page_content(pageid)
    if not page:
        return char

    infobox = extract_infobox(page.get("content", ""))
    if not infobox:
        return char

    updated = dict(char)
    changed = False

    # Marvel Database: Origin≈species, Gender; derive status from CauseOfDeath/PlaceOfDeath
    if "status" in needs and cid in STATUS_OVERRIDES:
        updated["status"] = STATUS_OVERRIDES[cid]
        changed = True
    else:
        status_val = get_infobox_value(infobox, ["status"])
        if not status_val and get_infobox_value(infobox, ["causeofdeath", "placeofdeath"]):
            status_val = "Deceased"
        if status_val and "status" in needs:
            cleaned = clean_wiki_text(status_val)
            if cleaned:
                updated["status"] = translate_value(cleaned, "status")
                changed = True
    for field, keys in [
        ("species", ["species", "origin"]),
        ("gender", ["gender", "sex"]),
    ]:
        if field not in needs:
            continue
        if field == "species" and cid in SPECIES_OVERRIDES:
            updated["species"] = SPECIES_OVERRIDES[cid]
            changed = True
            continue
        if field == "gender" and cid in GENDER_OVERRIDES:
            updated["gender"] = GENDER_OVERRIDES[cid]
            changed = True
            continue
        val = get_infobox_value(infobox, keys)
        if val:
            cleaned = clean_wiki_text(val)
            # Filtrer species invalide (fuite de catégories, trop long)
            if field == "species" and ("Category:" in cleaned or len(cleaned) > 80):
                continue
            if cleaned:
                if field in ("status", "gender"):
                    cleaned = translate_value(cleaned, field)
                updated[field] = cleaned
                changed = True

    return updated if changed else char


def main():
    parser = argparse.ArgumentParser(description="Fill Inconnu fields from Marvel Database")
    parser.add_argument("--json", type=str, default=str(DEFAULT_JSON_PATH))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()

    json_path = Path(args.json)
    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    chars = data.get("characters", [])
    to_process = [
        c for c in chars
        if c.get("status") == "Inconnu" or c.get("species") == "Inconnu" or c.get("gender") == "Inconnu"
    ]
    if args.limit:
        to_process = to_process[: args.limit]

    print(f"{len(to_process)} personnages avec au moins un champ Inconnu.")

    updated_count = 0
    for i, char in enumerate(chars):
        if char not in to_process:
            continue
        before = dict(char)
        after = fetch_and_fill(char, args.dry_run)
        if after != before:
            chars[i] = after
            updated_count += 1
            diff = {k: (before.get(k), after.get(k)) for k in ("status", "species", "gender") if before.get(k) != after.get(k)}
            print(f"  [{updated_count}] {char.get('name')} ({char.get('id')}): {diff}")
        time.sleep(0.3)  # politeness

    if not args.dry_run and updated_count > 0:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nTerminé. {updated_count} personnages mis à jour.")
    else:
        print(f"\nDry-run: {updated_count} personnages auraient été mis à jour.")


if __name__ == "__main__":
    main()
