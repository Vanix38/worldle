#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Lit les JSON dans ./out/ (un par personnage), récupère le wikitext brut depuis
api_raw.query.pages.XXX.revisions[0].slots.main["*"], le parse en infobox / intro /
sections / catégories, et écrit un fichier par personnage dans ./out_parsed/
avec les données séparées dans plusieurs champs.

Dépendances: aucune (stdlib uniquement).

Usage: python scripts/parse-wikitext-to-json.py
"""
import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "out"
PARSED_DIR = ROOT / "out_parsed"


def normalize_filename(title: str) -> str:
    """Normalise le titre pour un nom de fichier (minuscules, espaces -> _, caractères sûrs)."""
    if not title:
        return ""
    n = unicodedata.normalize("NFD", title)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = n.lower().replace(" ", "_")
    n = re.sub(r"[^\w\-.]", "_", n)
    n = re.sub(r"_+", "_", n).strip("_")
    return n or "unnamed"


def _find_matching_brace(text: str, start: int, open_c: str = "{", close_c: str = "}") -> int:
    """Retourne l'index du caractère fermant correspondant à text[start] (ouvrant)."""
    depth = 0
    i = start
    while i < len(text):
        if text[i] == open_c:
            depth += 1
        elif text[i] == close_c:
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


def _parse_template_block(block: str) -> dict:
    """Parse le contenu d'un template (entre {{ et }}) en dict | key = value."""
    params = {}
    for line in block.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("|"):
            line = line[1:].strip()
        if "=" not in line:
            continue
        idx = line.index("=")
        key = line[:idx].strip()
        value = line[idx + 1 :].strip()
        if key and key not in params:
            params[key] = value
    return params


def extract_first_infobox(wikitext: str) -> tuple[dict, int]:
    """
    Extrait le premier template de type infobox (Char box, etc.) : on cherche
    {{ ... }} qui contient des paramètres (| nom =, etc.) pour ignorer {{Spoil}}, etc.
    Retourne (dict des paramètres, index de fin du template).
    """
    pos = 0
    while True:
        match = re.search(r"\{\{", wikitext[pos:])
        if not match:
            return {}, pos
        start = pos + match.start()
        end = _find_matching_brace(wikitext, start)
        if end == -1:
            return {}, pos
        block = wikitext[start + 2 : end]
        params = _parse_template_block(block)
        if len(params) >= 3 or any(k.strip().lower() in ("nom", "affiliation", "origine") for k in params):
            return params, end + 2
        pos = end + 2


def extract_sections(wikitext: str) -> list[dict]:
    """
    Découpe le wikitext par == Titre == et === Sous-titre ===.
    Retourne une liste de { "level": 2 ou 3, "title": "...", "content": "..." }.
    """
    sections = []
    # Pattern pour == Titre == ou === Sous-titre ===
    pattern = re.compile(r"^(={2,3})\s*(.+?)\s*\1\s*$", re.MULTILINE)
    last_end = 0
    last_level = 0
    last_title = None
    for m in pattern.finditer(wikitext):
        level = len(m.group(1))
        title = m.group(2).strip()
        content_start = m.end()
        if last_title is not None:
            content = wikitext[last_end: m.start()].strip()
            if content:
                sections.append({"level": last_level, "title": last_title, "content": content})
        last_level = level
        last_title = title
        last_end = content_start
    if last_title is not None:
        content = wikitext[last_end:].strip()
        if content:
            sections.append({"level": last_level, "title": last_title, "content": content})
    return sections


def extract_categories(wikitext: str) -> list[str]:
    """Extrait les [[Catégorie:...]] du wikitext."""
    return re.findall(r"\[\[Catégorie:([^\]]+)\]\]", wikitext)


def parse_wikitext(wikitext: str) -> dict:
    """
    Parse le wikitext brut en :
    - infobox : dict des paramètres du premier template (ex. Char box)
    - intro : texte entre la fin du premier template et la première section ==
    - sections : liste de { level, title, content }
    - categories : liste des noms de catégories
    - raw_wikitext : contenu brut (conservé)
    """
    result = {
        "infobox": {},
        "intro": "",
        "sections": [],
        "categories": [],
        "raw_wikitext": wikitext,
    }
    if not wikitext or not wikitext.strip():
        return result

    infobox, end_infobox = extract_first_infobox(wikitext)
    result["infobox"] = infobox

    rest = wikitext[end_infobox:].strip()
    # Intro = tout jusqu'au premier == Section ==
    first_section = re.search(r"^={2,}\s*.+?\s*={2,}\s*$", rest, re.MULTILINE)
    if first_section:
        result["intro"] = rest[: first_section.start()].strip()
        rest_for_sections = rest[first_section.start() :]
    else:
        result["intro"] = rest
        rest_for_sections = ""

    result["sections"] = extract_sections(rest_for_sections) if rest_for_sections else []
    result["categories"] = extract_categories(wikitext)
    return result


def get_wikitext_from_character_file(data: dict) -> str | None:
    """Récupère le champ * depuis api_raw.query.pages.XXX.revisions[0].slots.main."""
    try:
        raw = data.get("api_raw") or {}
        query = raw.get("query") or {}
        pages = query.get("pages") or {}
        if not pages:
            return None
        page = next(iter(pages.values()))
        if isinstance(page, dict) and "missing" in page:
            return None
        revs = page.get("revisions") or []
        if not revs:
            return None
        slots = revs[0].get("slots") or {}
        main = slots.get("main") or {}
        return main.get("*")
    except (KeyError, TypeError, StopIteration):
        return None


def process_character_file(path: Path) -> dict | None:
    """Lit un fichier JSON personnage, parse le wikitext, retourne l'objet à écrire."""
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return None

    wikitext = get_wikitext_from_character_file(data)
    if wikitext is None:
        return None

    parsed = parse_wikitext(wikitext)
    out = {
        "title": data.get("title"),
        "source_page_url": data.get("source_page_url"),
        "api_endpoint": data.get("api_endpoint"),
        "infobox": parsed["infobox"],
        "intro": parsed["intro"],
        "sections": parsed["sections"],
        "categories": parsed["categories"],
        "raw_wikitext": parsed["raw_wikitext"],
    }
    return out


def main() -> None:
    PARSED_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(OUT_DIR.glob("*.json"))
    print(f"Fichiers trouvés dans {OUT_DIR}: {len(files)}")

    done = 0
    failed = 0
    for path in files:
        out_data = process_character_file(path)
        if out_data is None:
            print(f"  skip (pas de wikitext ou erreur): {path.name}")
            failed += 1
            continue
        out_name = path.stem + ".json"
        out_path = PARSED_DIR / out_name
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(out_data, f, ensure_ascii=False, indent=2)
        done += 1
        if done % 50 == 0:
            print(f"  ... {done}/{len(files)}")

    print(f"\nTerminé: {done} écrits dans {PARSED_DIR}, {failed} ignorés/erreurs.")


if __name__ == "__main__":
    main()
