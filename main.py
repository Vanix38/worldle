#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Récupère la liste des personnages canon One Piece depuis la page Fandom FR,
puis pour chaque personnage appelle l'API MediaWiki pour obtenir le contenu
et enregistre les données dans ./out/<titre_normalise>.json.

Dépendances: pip install requests beautifulsoup4

Stratégie de reprise: si un fichier JSON existe déjà pour un personnage, on le
saute (skip) pour permettre de relancer le script sans tout retélécharger.
"""
import json
import re
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

import requests
from bs4 import BeautifulSoup

LIST_URL = "https://onepiece.fandom.com/fr/wiki/Liste_des_Personnages_Canon"
API_URL = "https://onepiece.fandom.com/fr/api.php"
OUT_DIR = Path(__file__).resolve().parent / "out"

HEADERS = {
    "User-Agent": "WorlddleCanonScraper/1.0 (educational use)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9",
}
HEADERS_JSON = {**HEADERS, "Accept": "application/json"}

DELAY = 1.0
RETRY_MAX = 3
RETRY_BACKOFF = 2.0
REQUEST_TIMEOUT = 25

# Titres à ignorer (page liste, redirections génériques, etc.)
SKIP_TITLES = frozenset({"Liste_des_Personnages_Canon", "Liste_des_personnages_canon"})


def normalize_filename(title: str) -> str:
    """Normalise le titre pour en faire un nom de fichier (minuscules, espaces -> _, pas de caractères illégaux)."""
    if not title:
        return ""
    # Décoder d'abord si c'était encodé (ex. %27 -> ')
    raw = unquote(title).strip()
    # Minuscules, NFD pour enlever accents puis garder alphanum + _ et -
    n = unicodedata.normalize("NFD", raw)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = n.lower().replace(" ", "_")
    n = re.sub(r"[^\w\-.]", "_", n)
    n = re.sub(r"_+", "_", n).strip("_")
    return n or "unnamed"


def _title_from_href(href: str, base: str = "https://onepiece.fandom.com") -> str | None:
    """Extrait le titre de page wiki depuis un href (ex. /fr/wiki/Monkey_D._Luffy)."""
    if not href or href.startswith("#"):
        return None
    full = urljoin(base, href)
    path = urlparse(full).path.rstrip("/")
    if "/fr/wiki/" not in path:
        return None
    parts = path.split("/fr/wiki/", 1)
    if len(parts) != 2:
        return None
    segment = parts[1].split("/")[0]
    if not segment:
        return None
    title = unquote(segment).replace(" ", "_").strip()
    if any(title.startswith(p) for p in ("Category:", "Fichier:", "File:", "Template:", "User:")):
        return None
    if title in SKIP_TITLES:
        return None
    return title


def fetch_character_list() -> list[str]:
    """
    Télécharge la page Liste des Personnages Canon et n'extrait que les liens
    qui sont dans les tableaux de personnages (ligne = image + lien vers fiche),
    pas les liens du texte (chapitres, épisodes, etc.).
    """
    params = {
        "action": "parse",
        "page": "Liste_des_Personnages_Canon",
        "prop": "text",
        "format": "json",
    }
    try:
        r = requests.get(API_URL, headers=HEADERS_JSON, params=params, timeout=REQUEST_TIMEOUT)
        if r.status_code == 200:
            data = r.json()
            if "parse" in data and "text" in data["parse"]:
                html = data["parse"]["text"]["*"]
            else:
                html = None
        else:
            html = None
    except (requests.RequestException, json.JSONDecodeError, KeyError):
        html = None

    if not html:
        r = requests.get(LIST_URL, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        r.raise_for_status()
        html = r.text

    soup = BeautifulSoup(html, "html.parser")
    base = "https://onepiece.fandom.com"
    seen: set[str] = set()
    titles: list[str] = []

    # Uniquement les tableaux type "liste de personnages" (wikitable / article-table)
    for table in soup.find_all("table", class_=re.compile(r"wikitable|article-table|sortable")):
        for tr in table.find_all("tr"):
            cells = tr.find_all("td")
            if len(cells) < 2:
                continue
            first, second = cells[0], cells[1]
            if not first.find("img"):
                continue
            link = second.find("a", href=True)
            if not link:
                continue
            title = _title_from_href(link.get("href", ""), base)
            if title:
                key = title.lower()
                if key not in seen:
                    seen.add(key)
                    titles.append(title)

    # Complément : figures (image + lien) utilisées parfois sur la page
    for figure in soup.find_all("figure"):
        if not figure.find("img"):
            continue
        link = figure.find("a", href=re.compile(r"/wiki/[^/]+$"))
        if not link or not link.get("href"):
            continue
        title = _title_from_href(link["href"], base)
        if title:
            key = title.lower()
            if key not in seen:
                seen.add(key)
                titles.append(title)

    return titles


def fetch_character_data(title: str) -> dict | None:
    """
    Appelle l'API Fandom (action=query, prop=revisions, rvprop=content) pour le titre
    donné. Retourne le dict de données à sauver, ou None en cas d'erreur / page absente.
    """
    params = {
        "action": "query",
        "titles": title,
        "prop": "revisions",
        "rvprop": "content",
        "format": "json",
        "rvslots": "main",
    }
    for attempt in range(RETRY_MAX):
        try:
            r = requests.get(
                API_URL,
                headers=HEADERS_JSON,
                params=params,
                timeout=REQUEST_TIMEOUT,
            )
            if r.status_code == 429:
                time.sleep(RETRY_BACKOFF * (attempt + 1))
                continue
            r.raise_for_status()
            data = r.json()
        except (requests.RequestException, json.JSONDecodeError) as e:
            if attempt == RETRY_MAX - 1:
                return None
            time.sleep(RETRY_BACKOFF * (attempt + 1))
            continue

        if "error" in data:
            return None
        q = data.get("query", {})
        pages = q.get("pages", {})
        if not pages:
            return None
        # -1 = page inexistante
        page_id = next(iter(pages))
        if page_id == "-1" or "missing" in pages.get(page_id, {}):
            return None

        page = pages[page_id]
        api_title = page.get("title", title)
        source_page_url = f"https://onepiece.fandom.com/fr/wiki/{api_title.replace(' ', '_')}"

        return {
            "title": api_title,
            "api_endpoint": API_URL,
            "api_raw": data,
            "source_page_url": source_page_url,
        }
    return None


def save_character_data(title: str, data: dict, skip_existing: bool = True) -> bool:
    """
    Écrit les données dans ./out/<titre_normalise>.json.
    Si skip_existing=True et que le fichier existe, ne fait rien et retourne False.
    Sinon écrit et retourne True.
    """
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fname = normalize_filename(title) + ".json"
    path = OUT_DIR / fname
    if skip_existing and path.exists():
        return False
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return True


def main() -> None:
    print("Récupération de la liste des personnages canon…")
    titles = fetch_character_list()
    print(f"  -> {len(titles)} personnages trouvés.")

    if not titles:
        print("Aucun personnage à traiter.")
        return

    saved = 0
    skipped = 0
    failed = []

    for i, title in enumerate(titles, 1):
        print(f"[{i}/{len(titles)}] {title}")
        time.sleep(DELAY)
        data = fetch_character_data(title)
        if data is None:
            print(f"  -> warning: page introuvable ou erreur API.")
            failed.append(title)
            continue
        if save_character_data(title, data, skip_existing=True):
            saved += 1
        else:
            skipped += 1

    print(f"\nTerminé: {saved} écrits, {skipped} déjà présents (skippés), {len(failed)} en échec.")
    if failed:
        print("Échecs (premiers):", failed[:15])


if __name__ == "__main__":
    main()
