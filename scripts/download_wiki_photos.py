#!/usr/bin/env python3
"""
Parse les pages HTML du wiki (Catégorie:Personnages) et télécharge les photos des personnages.
Les photos sont sauvegardées dans public/universes/marvel-cineverse/characters/ avec le nom correspondant
à l'id du personnage dans marvel-cineverse.json.

Usage:
  python scripts/download_wiki_photos.py [--html-dir DIR] [--output-dir DIR] [--json PATH]
  
  --html-dir : dossier contenant les 4 fichiers HTML (défaut: C:/Users/evans/Downloads)
  --output-dir : dossier de sortie pour les photos (défaut: public/universes/marvel-cineverse/characters)
  --json : chemin vers marvel-cineverse.json pour le mapping id
"""

import argparse
import glob
import json
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from urllib.parse import unquote, urlparse

try:
    import requests
except ImportError:
    print("Install requests: pip install requests", file=sys.stderr)
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Install beautifulsoup4: pip install beautifulsoup4", file=sys.stderr)
    sys.exit(1)

DEFAULT_HTML_DIR = Path(r"C:\Users\evans\Downloads")
DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "public" / "universes" / "marvel-cineverse" / "characters"

HTML_FILES = [
    "personnages a à d.html",
    "personnages d à k.html",
    "personnages k à r.html",
    "personnages r à z.html",
]


def wiki_title_to_slug(title: str) -> str:
    """Tony_Stark -> tony-stark. Gère les slashes (A.D._Doug/Ouroboros -> a.d.-doug-ouroboros)."""
    s = title.replace("_", " ").replace("%20", " ").replace("/", "-").strip().lower().replace(" ", "-")
    return re.sub(r"-+", "-", s).strip("-")


def normalize_for_match(s: str) -> str:
    """Normalise pour le matching (retire accents, ponctuation)."""
    s = s.lower().replace("-", " ").replace("_", " ")
    s = re.sub(r"[^\w\s]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def build_name_to_id_map(characters: List[dict]) -> Dict[str, str]:
    """Construit un mapping nom normalisé -> id pour le matching."""
    m = {}
    for c in characters:
        cid = c.get("id", "")
        name = c.get("name", "")
        if not cid:
            continue
        # id direct
        m[cid] = cid
        m[normalize_for_match(cid)] = cid
        # nom
        m[normalize_for_match(name)] = cid
        for a in c.get("aliases", []) or []:
            m[normalize_for_match(a)] = cid
    return m


def extract_characters_from_html(html_path: Path) -> List[Tuple[str, str]]:
    """
    Extrait (wiki_title, image_url) de chaque personnage.
    wiki_title: partie après /wiki/ (ex: Tony_Stark)
    image_url: URL complète de l'image (on modifie pour taille plus grande)
    """
    with open(html_path, encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    results = []
    for li in soup.select("li.category-page__member"):
        link = li.select_one("a[href*='/wiki/']")
        img = li.select_one("img.category-page__member-thumbnail")
        if not link or not img:
            continue
        href = link.get("href", "")
        if "/wiki/Cat" in href or "/wiki/Sp" in href:
            continue
        match = re.search(r"/wiki/([^?#]+)", href)
        if not match:
            continue
        wiki_title = unquote(match.group(1))
        img_url = img.get("data-src") or img.get("src")
        if not img_url or not img_url.startswith("http"):
            noscript = li.select_one("noscript img")
            if noscript:
                img_url = noscript.get("src", "")
        if not img_url or "wikia.nocookie" not in img_url:
            continue
        # Full size: replace /smart/width/40/height/30 with /scale-to-width-down/300
        img_url = re.sub(
            r"/revision/latest/smart/width/\d+/height/\d+",
            "/revision/latest/scale-to-width-down/300",
            img_url,
        )
        img_url = re.sub(
            r"/revision/latest/top-crop/width/\d+/height/\d+",
            "/revision/latest/scale-to-width-down/300",
            img_url,
        )
        results.append((wiki_title, img_url))
    return results


def resolve_to_cineverse_id(wiki_title: str, name_to_id: Dict[str, str]) -> Optional[str]:
    """Trouve l'id cineverse correspondant au wiki title."""
    slug = wiki_title_to_slug(wiki_title)
    display_name = wiki_title.replace("_", " ").replace("/", " ")
    norm_slug = normalize_for_match(slug)
    norm_name = normalize_for_match(display_name)
    # Priorité: slug exact (id) > norm_slug > norm_name
    if slug in name_to_id:
        return name_to_id[slug]
    if norm_slug in name_to_id:
        return name_to_id[norm_slug]
    if norm_name in name_to_id:
        return name_to_id[norm_name]
    return None


def main():
    parser = argparse.ArgumentParser(description="Download character photos from wiki HTML pages")
    parser.add_argument("--html-dir", type=str, default=str(DEFAULT_HTML_DIR))
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--json", type=str, default=str(DEFAULT_JSON_PATH))
    parser.add_argument("--save-unmapped", action="store_true", help="Sauvegarder aussi les persos non mappés (par slug wiki)")
    parser.add_argument("--list-unmapped", action="store_true", help="Afficher les persos non mappés (pour comprendre les 422 ignorés)")
    args = parser.parse_args()

    html_dir = Path(args.html_dir)
    out_dir = Path(args.output_dir)
    json_path = Path(args.json)
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)
    name_to_id = build_name_to_id_map(data.get("characters", []))

    all_chars: List[Tuple[str, str, Optional[str]]] = []
    for fn in HTML_FILES:
        p = html_dir / fn
        if not p.exists():
            print(f"[skip] Fichier introuvable: {p}", flush=True)
            continue
        for wiki_title, img_url in extract_characters_from_html(p):
            cid = resolve_to_cineverse_id(wiki_title, name_to_id)
            all_chars.append((wiki_title, img_url, cid))

    seen = set()
    unmapped = []
    ok = 0
    skip = 0
    err = 0
    for wiki_title, img_url, cid in all_chars:
        if not cid and not args.save_unmapped:
            skip += 1
            unmapped.append(wiki_title)
            continue
        filename = cid if cid else wiki_title_to_slug(wiki_title)
        if filename in seen:
            continue
        seen.add(filename)
        # Ne pas télécharger si une photo existe déjà (quelle que soit l'extension)
        existing = list(out_dir.glob(f"{glob.escape(filename)}.*"))
        if existing:
            ok += 1
            continue
        base_url = img_url.split("?")[0].lower()
        ext = "jpg"
        if ".png" in base_url:
            ext = "png"
        elif ".webp" in base_url:
            ext = "webp"
        out_path = out_dir / f"{filename}.{ext}"
        try:
            r = requests.get(img_url, timeout=30, headers={"User-Agent": "Mozilla/5.0"})
            r.raise_for_status()
            out_path.write_bytes(r.content)
            ok += 1
            print(f"  [{ok}] {wiki_title} -> {out_path.name}", flush=True)
        except Exception as e:
            err += 1
            print(f"  [error] {wiki_title}: {e}", flush=True)
        time.sleep(0.15)

    print(f"\nTerminé. {ok} photos, {skip} non mappés ignorés, {err} erreurs. Sortie: {out_dir.absolute()}")
    if args.list_unmapped and unmapped:
        print(f"\n--- Exemples de personnages non mappés (wiki présente mais absents de marvel-cineverse.json) ---")
        for t in sorted(set(unmapped))[:50]:
            print(f"  {t}")
        if len(unmapped) > 50:
            print(f"  ... et {len(unmapped) - 50} autres.")


if __name__ == "__main__":
    main()
