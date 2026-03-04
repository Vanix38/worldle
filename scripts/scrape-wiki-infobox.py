#!/usr/bin/env python3
"""
Scrape pour chaque personnage de data/one-piece.json la page wiki Fandom
(https://onepiece.fandom.com/fr/wiki/Nom_du_personnage) et met à jour
affiliation, taille (size), origine (origin) et âge (age) depuis l'infobox.
Utilise l'API MediaWiki pour éviter le 403.

Usage:
  python scripts/scrape-wiki-infobox.py           # tous les personnages
  python scripts/scrape-wiki-infobox.py --limit 20   # test sur 20 premiers
"""
import argparse
import json
import re
import time
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "one-piece.json"
API_URL = "https://onepiece.fandom.com/fr/api.php"

HEADERS = {
    "User-Agent": "WorlddleScraper/1.0 (educational use)",
    "Accept": "application/json",
    "Accept-Language": "fr-FR,fr;q=0.9",
}

# Délai entre requêtes (secondes) pour ne pas surcharger le wiki
DELAY = 1.0

# Libellés possibles dans l'infobox (français)
LABEL_AFFILIATION = ("affiliation", "affiliations", "affiliation(s)")
LABEL_TAILLE = ("taille",)
LABEL_ORIGINE = ("origine", "origines")
LABEL_AGE = ("âge", "age", "âges", "ages")


def name_to_wiki_title(name: str) -> str:
    """Convertit un nom de personnage en titre de page wiki (espaces -> underscores)."""
    if not name or not name.strip():
        return ""
    # Garder la casse et les caractères spéciaux, remplacer espaces par _
    return name.strip().replace(" ", "_")


def fetch_wiki_page_html(page_title: str) -> str | None:
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


def text_of(el) -> str:
    """Retourne le texte nettoyé d'un élément BeautifulSoup."""
    if el is None:
        return ""
    return " ".join(el.get_text(separator=" ", strip=True).split())


# data-source (FR wiki) -> clé de sortie
PORTABLE_SOURCE_MAP = {
    "affiliation": "affiliation",
    "affiliations": "affiliation",
    "origine": "origin",
    "origines": "origin",
    "taille": "size",
    "âge": "age",
    "age": "age",
    "âges": "age",
    "ages": "age",
}


def parse_portable_infobox(soup: BeautifulSoup) -> dict:
    """
    Parse l'infobox portable Fandom (aside.portable-infobox avec div.pi-data).
    Retourne un dict avec affiliation, size, origin, age selon les data-source trouvés.
    """
    out = {}
    infobox = soup.find(class_=re.compile(r"portable-infobox"))
    if not infobox:
        return out
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
        else:
            out[key] = val
    return out


def find_infobox_value(soup: BeautifulSoup, label_keys: tuple[str, ...]) -> str | None:
    """Cherche dans les tables (infobox / wikitable) une ligne dont le libellé est dans label_keys et retourne la valeur."""
    for table in soup.find_all("table", class_=re.compile(r"infobox|wikitable")):
        for tr in table.find_all("tr"):
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue
            first = text_of(cells[0]).strip().lower()
            first_norm = unicodedata.normalize("NFD", first)
            first_norm = "".join(c for c in first_norm if unicodedata.category(c) != "Mn")
            for key in label_keys:
                if key.lower() in first_norm or first_norm in key.lower():
                    val = text_of(cells[1]).strip()
                    if val and val.lower() not in ("?", "inconnu", "inconnue", "inconnus", "n/a", "-", "—"):
                        return val
    return None


def parse_number(s: str) -> int | None:
    """Parse un nombre depuis une chaîne (ex. '19' ou '19 ans')."""
    if not s:
        return None
    m = re.search(r"\d+", s.replace("\u202f", "").replace(" ", ""))
    return int(m.group(0)) if m else None


def scrape_infobox(page_title: str) -> dict:
    """
    Récupère la page wiki, parse l'infobox (portable infobox prioritaire, sinon table), retourne un dict avec affiliation, size, origin, age.
    """
    html = fetch_wiki_page_html(page_title)
    if not html:
        return {}
    soup = BeautifulSoup(html, "html.parser")
    out = parse_portable_infobox(soup)
    if out:
        return out
    # Fallback: infobox en table (autres wikis)
    aff = find_infobox_value(soup, LABEL_AFFILIATION)
    if aff:
        out["affiliation"] = aff
    taille = find_infobox_value(soup, LABEL_TAILLE)
    if taille:
        out["size"] = taille
    orig = find_infobox_value(soup, LABEL_ORIGINE)
    if orig:
        out["origin"] = orig
    age_str = find_infobox_value(soup, LABEL_AGE)
    if age_str:
        age_num = parse_number(age_str)
        if age_num is not None:
            out["age"] = age_num
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape infobox wiki Fandom pour affiliation, taille, origine, âge.")
    parser.add_argument("--limit", type=int, default=0, help="Limiter au N premiers personnages (0 = tous)")
    args = parser.parse_args()

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    characters = data.get("characters", [])
    if args.limit:
        characters = characters[: args.limit]
        print(f"Mode test: {len(characters)} personnages.")
    else:
        print(f"{len(characters)} personnages à traiter…")
    updated = 0
    failed_pages = []
    for i, char in enumerate(characters):
        name = char.get("name", "").strip()
        if not name:
            continue
        page_title = name_to_wiki_title(name)
        if not page_title:
            continue
        time.sleep(DELAY)
        scraped = scrape_infobox(page_title)
        if not scraped:
            failed_pages.append(name)
            continue
        if "affiliation" in scraped:
            char["affiliation"] = scraped["affiliation"]
        if "size" in scraped:
            char["size"] = scraped["size"]
        if "origin" in scraped:
            char["origin"] = scraped["origin"]
        if "age" in scraped:
            char["age"] = scraped["age"]
        updated += 1
        if (i + 1) % 50 == 0:
            print(f"  ... {i + 1}/{len(characters)}")
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n{updated} personnages mis à jour (affiliation / taille / origine / âge).")
    if failed_pages:
        print(f"{len(failed_pages)} pages sans infobox ou page introuvable (premiers: {failed_pages[:10]}).")


if __name__ == "__main__":
    main()
