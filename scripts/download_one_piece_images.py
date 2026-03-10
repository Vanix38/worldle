#!/usr/bin/env python3
"""
Télécharge les images des personnages One Piece depuis les URLs extraites du HTML
de la page "Liste des Personnages Canon" (Fandom), pour les personnages présents
dans data/one-piece.json.

Usage:
    python download_one_piece_images.py <fichier_html> [--output-dir DIR] [--json PATH]
"""

import argparse
import json
import re
import shutil
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urlparse

try:
    import requests
except ImportError:
    print("Installation requise: pip install requests")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("Installation requise: pip install beautifulsoup4")
    sys.exit(1)


def normalize_slug(s: str) -> str:
    """Normalise un nom/slug pour le matching (id JSON)."""
    if not s:
        return ""
    s = unquote(s).strip()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("_", " ").replace("-", " ").lower()
    s = re.sub(r"[^\w\s]", "", s)
    s = re.sub(r"\s+", "-", s).strip("-")
    return s


def extract_image_url_from_img(img) -> str | None:
    """Récupère l'URL d'image depuis un tag img (data-src ou src si absolu)."""
    url = img.get("data-src") or img.get("src")
    if not url:
        return None
    url = url.replace("&amp;", "&").strip()
    if url.startswith("data:"):
        return None
    if url.startswith("http://") or url.startswith("https://"):
        return url
    return None


def full_size_wikia_url(url: str) -> str:
    """Passe en pleine résolution (enlève scale-to-width-down/120)."""
    if "/scale-to-width-down/" in url:
        url = re.sub(r"/scale-to-width-down/\d+\?", "?", url)
        url = re.sub(r"/scale-to-width-down/\d+$", "", url)
    return url


def parse_html_for_characters(html_path: str) -> tuple[dict[str, str], dict[str, Path]]:
    """
    Parse le HTML Fandom.
    Retourne (urls_remote, urls_local): dict slug_normalized -> URL ou chemin local.
    """
    html_path = Path(html_path)
    if not html_path.is_file():
        return {}, {}

    with open(html_path, "r", encoding="utf-8", errors="replace") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    result_remote = {}
    result_local = {}
    html_dir = html_path.parent
    base_url = "https://onepiece.fandom.com/fr/wiki/"

    for a in soup.find_all("a", href=True):
        href = a.get("href", "")
        if not href.startswith(base_url):
            continue
        slug = href[len(base_url) :].split("?")[0].split("#")[0]
        if not slug or slug.startswith("Chapitre") or slug.startswith("Épisode"):
            continue
        img = a.find("img")
        if not img:
            continue
        key = normalize_slug(slug)
        if not key:
            continue
        url = extract_image_url_from_img(img)
        if url and "static.wikia.nocookie.net/onepiece" in url:
            if key not in result_remote:
                result_remote[key] = full_size_wikia_url(url)
        else:
            src = img.get("src", "")
            if src and not src.startswith("data:") and key not in result_local:
                local = (html_dir / src).resolve()
                if local.exists():
                    result_local[key] = local

    return result_remote, result_local


def load_json_characters(json_path: str) -> list[dict]:
    """Charge la liste des personnages depuis one-piece.json."""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("characters", [])


def download_image(url: str, dest_path: Path, session: requests.Session, timeout: int = 30) -> bool:
    """Télécharge une image et l'enregistre dans dest_path."""
    try:
        r = session.get(url, timeout=timeout, stream=True)
        r.raise_for_status()
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        return True
    except Exception as e:
        print(f"  Erreur: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Télécharge les images des personnages One Piece depuis le HTML Fandom."
    )
    parser.add_argument(
        "html_file",
        type=str,
        help="Chemin vers le fichier HTML (Liste des Personnages Canon)",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        type=str,
        default=None,
        help="Dossier de sortie pour les images (défaut: images/one-piece)",
    )
    parser.add_argument(
        "--json",
        "-j",
        type=str,
        default=None,
        help="Chemin vers one-piece.json (défaut: data/one-piece.json)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.5,
        help="Délai en secondes entre chaque téléchargement (défaut: 0.5)",
    )
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    project_root = script_dir.parent

    html_path = Path(args.html_file)
    if not html_path.is_absolute():
        html_path = Path(args.html_file).resolve()
    if not html_path.exists():
        print(f"Fichier HTML introuvable: {html_path}")
        sys.exit(1)

    json_path = Path(args.json) if args.json else project_root / "data" / "one-piece.json"
    if not json_path.exists():
        print(f"Fichier JSON introuvable: {json_path}")
        sys.exit(1)

    output_dir = Path(args.output_dir) if args.output_dir else project_root / "images" / "one-piece"
    output_dir = output_dir.resolve()

    print("Parsing du HTML...")
    html_urls, html_local = parse_html_for_characters(str(html_path))
    print(f"  {len(html_urls)} URLs distantes, {len(html_local)} chemins locaux.")

    print("Chargement du JSON...")
    characters = load_json_characters(str(json_path))
    print(f"  {len(characters)} personnages dans le JSON.")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0",
        "Accept": "image/webp,image/png,image/*,*/*;q=0.8",
    })

    ok = 0
    skip = 0
    fail = 0

    for char in characters:
        cid = char.get("id", "")
        name = char.get("name", "")
        json_url = char.get("imageUrl", "")

        key_from_id = normalize_slug(cid)
        key_from_name = normalize_slug(name)
        url = None
        local_path = None
        if key_from_id in html_urls:
            url = html_urls[key_from_id]
        elif key_from_name in html_urls:
            url = html_urls[key_from_name]
        if key_from_id in html_local:
            local_path = html_local[key_from_id]
        elif key_from_name in html_local and not local_path:
            local_path = html_local[key_from_name]
        if not url and json_url and "static.wikia.nocookie.net" in json_url:
            url = json_url

        if not url and not local_path:
            print(f"  [SKIP] {cid} ({name}) — pas d'URL trouvée")
            skip += 1
            continue

        if local_path:
            ext = local_path.suffix.lstrip(".")
            dest = output_dir / f"{cid}.{ext}"
            dest.parent.mkdir(parents=True, exist_ok=True)
            print(f"  [COPY] {cid}...", end=" ")
            try:
                shutil.copy2(local_path, dest)
                print("OK")
                ok += 1
            except Exception as e:
                print(f"Erreur: {e}")
                fail += 1
            continue

        ext = "png"
        if ".webp" in url.split("?")[0]:
            ext = "webp"
        elif ".jpg" in url.split("?")[0] or ".jpeg" in url.split("?")[0]:
            ext = "jpg"
        dest = output_dir / f"{cid}.{ext}"

        print(f"  [DL] {cid}...", end=" ")
        if download_image(url, dest, session, timeout=30):
            print("OK")
            ok += 1
        else:
            fail += 1
        time.sleep(args.delay)

    print(f"\nTerminé: {ok} téléchargées, {skip} ignorées, {fail} échecs.")
    print(f"Images dans: {output_dir}")


if __name__ == "__main__":
    main()
