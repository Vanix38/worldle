#!/usr/bin/env python3
"""
Scrape les URLs d'images des personnages depuis la page Fandom
https://onepiece.fandom.com/fr/wiki/Liste_des_Personnages_Canon
et met à jour data/one-piece.json avec les vrais imageUrl.
"""
import json
import re
import unicodedata
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "one-piece.json"
LIST_URL = "https://onepiece.fandom.com/fr/wiki/Liste_des_Personnages_Canon"
# API MediaWiki de Fandom (évite souvent le 403)
API_URL = "https://onepiece.fandom.com/fr/api.php"

HEADERS = {
    "User-Agent": "WorlddleImageScraper/1.0 (https://github.com/; educational use)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
}


def normalize_name(name: str) -> str:
    """Normalise un nom pour la comparaison (minuscules, sans accents)."""
    if not name:
        return ""
    n = unicodedata.normalize("NFD", name)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    return n.lower().strip()


def extract_image_url(img) -> str | None:
    """Extrait l'URL d'image (src ou data-src). Optionnellement enlève le scale pour avoir une image plus grande."""
    url = img.get("data-src") or img.get("src")
    if not url or not url.startswith("http"):
        return None
    # Fandom: enlever /revision/latest/scale-to-width-down/XXX pour garder une taille correcte (ou garder tel quel)
    if "/revision/latest/" in url:
        url = re.sub(r"/revision/latest/scale-to-width-down/\d+", "", url)
    return url


def fetch_page_html() -> str:
    """Récupère le HTML de la page liste : essaie l'API MediaWiki puis la page directe."""
    # 1) Essai via l'API parse (souvent autorisé)
    params = {
        "action": "parse",
        "page": "Liste_des_Personnages_Canon",
        "prop": "text",
        "format": "json",
    }
    print(f"Récupération via API Fandom ({API_URL}) ...")
    resp = requests.get(API_URL, headers=HEADERS, params=params, timeout=30)
    if resp.status_code == 200:
        try:
            data = resp.json()
            if "parse" in data and "text" in data["parse"]:
                return data["parse"]["text"]["*"]
        except (KeyError, json.JSONDecodeError):
            pass
    # 2) Fallback : requête directe sur la page
    print(f"Fallback : récupération directe de {LIST_URL} ...")
    resp = requests.get(LIST_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def scrape_list_page() -> dict[str, str]:
    """
    Récupère la page Liste des Personnages Canon et retourne un dict
    normalized_name -> image_url.
    """
    html = fetch_page_html()
    soup = BeautifulSoup(html, "html.parser")

    name_to_image: dict[str, str] = {}

    # Les tableaux ont souvent la classe wikitable ou article-table
    for table in soup.find_all("table", class_=re.compile(r"wikitable|article-table|sortable")):
        rows = table.find_all("tr")
        for tr in rows:
            cells = tr.find_all("td")
            if len(cells) < 2:
                continue
            # Colonne Portrait (0) : image
            first = cells[0]
            img = first.find("img")
            if not img:
                continue
            image_url = extract_image_url(img)
            if not image_url:
                continue
            # Colonne Nom (1) : lien avec le nom du personnage
            second = cells[1]
            link = second.find("a")
            if not link:
                continue
            # Titre du lien (nom affiché) ou texte
            name = (link.get("title") or link.get_text() or "").strip()
            # Enlever les suffixes comme (PX-0), (Mr.2 Bon Clay), (alias ...)
            name = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()
            if not name:
                continue
            key = normalize_name(name)
            if key and key not in name_to_image:
                name_to_image[key] = image_url

    # Certaines pages ont des figures avec image + lien dans la même cellule
    for figure in soup.find_all("figure"):
        img = figure.find("img")
        link = figure.find("a", href=re.compile(r"/wiki/[^/]+$"))
        if img and link:
            image_url = extract_image_url(img)
            name = (link.get("title") or link.get_text() or "").strip()
            name = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()
            if image_url and name:
                key = normalize_name(name)
                if key and key not in name_to_image:
                    name_to_image[key] = image_url

    print(f"  -> {len(name_to_image)} personnages avec image trouvés sur la liste.")
    return name_to_image


def main() -> None:
    name_to_image = scrape_list_page()
    if not name_to_image:
        print("Aucune image trouvée. Vérifiez la structure de la page ou le sélecteur.")
        return

    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    characters = data.get("characters", [])
    updated = 0
    not_found: list[str] = []

    # Variantes connues : notre nom -> noms possibles sur le wiki (normalisés)
    name_variants: dict[str, list[str]] = {
        "benn beckman": ["ben beckman"],
        "benthams": ["bentham"],
        "beppo": ["bepo"],
        "bogard": ["bogart"],
        "bellobety": ["belo betty"],
        "brûlée": ["charlotte brûlée", "charlotte brûlee"],
        "buggy": ["baggy"],
        "cabaiji": ["cabaji"],
        "caesar clown": ["césar clown", "cesar clown"],
        "carmel": ["caramel"],
        "chiffon": ["charlotte chiffon"],
        "colon": ["colson", "colscon"],
        "daifuku": ["charlotte daifuku"],
        "daz bones": ["daz bones"],  # déjà bon
        "demalo black": ["demalo black"],
        "diez barrels": ["diez barrels"],
        "doflamingo": ["don quichotte doflamingo", "donquichotte doflamingo"],
        "gecko moria": ["gecko moria", "gekko moria"],
        "hody": ["hody jones"],
        "jimbe": ["jinbe", "jimbei"],
        "kuma": ["bartholomew kuma"],
        "marco": ["marco le phénix"],
        "monkey d. luffy": ["luffy", "monkey d. luffy"],
        "queen": ["queen le peste"],
        "reiju": ["reiju vinsmoke"],
        "sanji": ["sanji vinsmoke"],
        "smoothie": ["charlotte smoothie"],
        "stussy": ["buckingham stussy", "buckingham stussy"],
        "zoro": ["roronoa zoro"],
    }

    for char in characters:
        name = char.get("name", "").strip()
        aliases = char.get("aliases") or []
        # Clés possibles : nom exact, alias, et "Charlotte X" -> "X" ou inverse
        candidates = [normalize_name(name)]
        candidates.extend(normalize_name(a) for a in aliases)
        # Si le nom contient un espace, aussi essayer sans préfixe "Charlotte "
        if " " in name:
            parts = name.split()
            if parts[0].lower() == "charlotte" and len(parts) > 1:
                candidates.append(normalize_name(" ".join(parts[1:])))
        # Inversement : notre nom court -> "Charlotte " + nom sur le wiki
        if name and name.split()[0].lower() != "charlotte":
            candidates.append(normalize_name("Charlotte " + name))
        # Variantes connues (wiki vs notre JSON)
        key_lower = normalize_name(name)
        if key_lower in name_variants:
            candidates.extend(name_variants[key_lower])
        # Correspondance exacte
        image_url = None
        for key in candidates:
            if key in name_to_image:
                image_url = name_to_image[key]
                break
        if image_url:
            char["imageUrl"] = image_url
            updated += 1
        else:
            not_found.append(name)

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"\n{updated} personnages mis à jour avec une image.")
    if not_found:
        print(f"{len(not_found)} non trouvés sur la liste (conservent l'ancienne image ou avatar généré).")
        if len(not_found) <= 30:
            for n in not_found[:30]:
                print(f"  - {n}")
        else:
            for n in not_found[:15]:
                print(f"  - {n}")
            print(f"  ... et {len(not_found) - 15} autres.")


if __name__ == "__main__":
    main()
