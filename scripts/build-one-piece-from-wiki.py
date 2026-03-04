#!/usr/bin/env python3
"""
Crée data/one-piece.json depuis zéro :
1. Récupère la liste des personnages canon sur la page wiki.
2. Pour chaque personnage, récupère la page wiki et parse l'infobox (affiliation, taille, origine, âge, etc.).
3. Écrit le fichier JSON.

Usage:
  python scripts/build-one-piece-from-wiki.py           # tous les personnages
  python scripts/build-one-piece-from-wiki.py --limit 20   # test sur 20 premiers
"""
import argparse
import json
import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "one-piece.json"
API_URL = "https://onepiece.fandom.com/fr/api.php"
LIST_PAGE_TITLE = "Liste_des_Personnages_Canon"

HEADERS = {
    "User-Agent": "WorlddleScraper/1.0 (educational use)",
    "Accept": "application/json",
    "Accept-Language": "fr-FR,fr;q=0.9",
}

DELAY = 1.0

# Pages / préfixes à ignorer quand on extrait les liens personnages
SKIP_WIKI_PREFIXES = (
    "chapitre_", "épisode_", "episode_", "liste_des_", "catégorie:",
    "sbs_", "databooks_", "discussion:", "fichier:", "aide:", "template:",
    "one_piece_", "vivre_card", "databooks_one_piece",
)


def fetch_wiki_html(page_title: str) -> str | None:
    """Récupère le HTML d'une page wiki via l'API parse."""
    params = {
        "action": "parse",
        "page": page_title,
        "prop": "text",
        "format": "json",
    }
    try:
        resp = requests.get(API_URL, headers=HEADERS, params=params, timeout=15)
        if resp.status_code != 200:
            return None
        data = resp.json()
        if "error" in data:
            return None
        if "parse" in data and "text" in data["parse"]:
            return data["parse"]["text"]["*"]
    except (requests.RequestException, json.JSONDecodeError, KeyError):
        pass
    return None


def slug_from_name(name: str) -> str:
    """Génère un id/slug à partir du nom (minuscules, espaces -> tirets, sans accents)."""
    if not name or not name.strip():
        return ""
    s = unicodedata.normalize("NFD", name.strip())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    return s or ""


def text_of(el) -> str:
    if el is None:
        return ""
    return " ".join(el.get_text(separator=" ", strip=True).split())


def extract_image_url(img) -> str | None:
    url = img.get("data-src") or img.get("src")
    if not url or not url.startswith("http"):
        return None
    if "/revision/latest/" in url:
        url = re.sub(r"/revision/latest/scale-to-width-down/\d+", "", url)
    return url


# data-source (FR wiki) -> clé JSON
PORTABLE_SOURCE_MAP = {
    "affiliation": "affiliation",
    "affiliations": "affiliation",
    "affiliation(s)": "affiliation",
    "origine": "origin",
    "origines": "origin",
    "taille": "size",
    "âge": "age",
    "age": "age",
    "âges": "age",
    "ages": "age",
    "sexe": "gender",
    "genre": "gender",
    "prime": "bounty",
    "prime actuelle": "bounty",
    "arc": "arc",
    "fruit": "devilFruitType",
    "fruit du démon": "devilFruitType",
    "haki": "haki",
}


def parse_number(s: str) -> int | None:
    if not s:
        return None
    m = re.search(r"\d+", s.replace("\u202f", "").replace(" ", ""))
    return int(m.group(0)) if m else None


def parse_portable_infobox(soup: BeautifulSoup) -> dict:
    """Parse l'infobox portable et extrait aussi l'image si présente."""
    out = {}
    infobox = soup.find(class_=re.compile(r"portable-infobox"))
    if not infobox:
        return out

    # Image : .pi-image img ou première img dans l'infobox
    img_el = infobox.find("div", class_=re.compile(r"pi-image")) and infobox.find("div", class_=re.compile(r"pi-image")).find("img")
    if not img_el:
        img_el = infobox.find("img")
    if img_el:
        url = extract_image_url(img_el)
        if url:
            out["imageUrl"] = url

    for div in infobox.find_all("div", class_=re.compile(r"pi-data")):
        source = div.get("data-source")
        if not source:
            continue
        source = source.strip().lower()
        key = PORTABLE_SOURCE_MAP.get(source)
        if not key:
            continue
        value_el = div.find("div", class_=re.compile(r"pi-data-value"))
        if not value_el:
            continue
        val = text_of(value_el).strip()
        if not val or val.lower() in ("?", "inconnu", "inconnue", "inconnus", "n/a", "-", "—"):
            continue
        if key == "age":
            num = parse_number(val)
            if num is not None:
                out["age"] = num
        elif key == "bounty":
            num = parse_number(val)
            if num is not None:
                out["bounty"] = num
            else:
                if val.lower() not in ("inconnue", "inconnu", "aucune"):
                    out["bounty"] = val
        else:
            out[key] = val
    return out


def scrape_character_infobox(page_title: str) -> dict:
    """Récupère la page du personnage et retourne les champs extraits de l'infobox."""
    html = fetch_wiki_html(page_title)
    if not html:
        return {}
    soup = BeautifulSoup(html, "html.parser")
    return parse_portable_infobox(soup)


def is_character_wiki_title(title: str) -> bool:
    """True si le titre de page ressemble à un personnage (pas Chapitre, Liste, etc.)."""
    t = unquote(title).strip().lower().replace("_", " ")
    for skip in SKIP_WIKI_PREFIXES:
        if t.startswith(skip) or skip.replace("_", " ") in t:
            return False
    if t.startswith("liste ") or "chapitre " in t or "épisode " in t:
        return False
    return True


def scrape_list_page() -> list[dict]:
    """
    Récupère la page Liste des Personnages Canon et retourne une liste de
    { "wiki_title": "...", "name": "...", "imageUrl": "..." (optionnel) }.
    """
    html = fetch_wiki_html(LIST_PAGE_TITLE)
    if not html:
        print("Impossible de récupérer la page liste.")
        return []
    soup = BeautifulSoup(html, "html.parser")
    seen = set()
    entries = []

    for table in soup.find_all("table", class_=re.compile(r"wikitable|article-table|sortable")):
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 1:
                continue
            first_cell = cells[0]
            # Premier lien de la ligne qui pointe vers une page personnage (pas Chapitre/Épisode/…)
            link = None
            for a in tr.find_all("a", href=re.compile(r"^/fr/wiki/")):
                href = a.get("href") or ""
                m = re.search(r"/wiki/([^/#?]+)$", href)
                if not m:
                    continue
                wiki_title = unquote(m.group(1)).strip()
                if is_character_wiki_title(wiki_title):
                    link = a
                    break
            if not link:
                continue
            if wiki_title in seen:
                continue
            seen.add(wiki_title)
            name = (link.get("title") or text_of(link) or wiki_title.replace("_", " ")).strip()
            name = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()
            if not name:
                name = wiki_title.replace("_", " ")
            image_url = None
            img = first_cell.find("img")
            if img:
                image_url = extract_image_url(img)
            entries.append({
                "wiki_title": wiki_title,
                "name": name,
                "imageUrl": image_url,
            })
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Construire one-piece.json depuis la liste wiki + infobox par personnage.")
    parser.add_argument("--limit", type=int, default=0, help="Limiter au N premiers personnages (0 = tous)")
    args = parser.parse_args()

    print("1. Récupération de la liste des personnages canon…")
    list_entries = scrape_list_page()
    if not list_entries:
        print("Aucun personnage trouvé sur la page liste.")
        return
    print(f"   -> {len(list_entries)} personnages trouvés.")

    if args.limit:
        list_entries = list_entries[: args.limit]
        print(f"   Mode test : {len(list_entries)} personnages.")

    characters = []
    failed = []

    for i, entry in enumerate(list_entries):
        wiki_title = entry["wiki_title"]
        name = entry["name"]
        time.sleep(DELAY)
        infos = scrape_character_infobox(wiki_title)
        cid = slug_from_name(name) or slug_from_name(wiki_title.replace("_", " "))
        if not cid:
            cid = f"char-{i}"

        char = {
            "id": cid,
            "name": name,
            "gender": infos.get("gender", ""),
            "age": infos.get("age", 0),
            "bounty": infos.get("bounty", 0),
            "arc": infos.get("arc", ""),
            "devilFruitType": infos.get("devilFruitType", ""),
            "affiliation": infos.get("affiliation", ""),
            "size": infos.get("size", 0) if isinstance(infos.get("size"), (int, float)) else (infos.get("size") or ""),
            "origin": infos.get("origin", ""),
            "haki": infos.get("haki", ""),
            "imageUrl": infos.get("imageUrl") or entry.get("imageUrl") or "",
        }
        # Bounty peut être "Inconnue" en string
        if isinstance(char["bounty"], str) and char["bounty"].lower() in ("inconnue", "inconnu", "?"):
            char["bounty"] = "Inconnue"
        characters.append(char)
        if (i + 1) % 50 == 0:
            print(f"   ... {i + 1}/{len(list_entries)}")

    out = {
        "id": "one-piece",
        "name": "One Piece",
        "characters": characters,
    }
    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nFichier écrit : {JSON_PATH} ({len(characters)} personnages).")


if __name__ == "__main__":
    main()
