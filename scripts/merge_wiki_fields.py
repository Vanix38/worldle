#!/usr/bin/env python3
"""
Fusionne les champs des infobox wiki (status, aliases, species, gender, affiliation, firstAppearance)
depuis scripts/output/mcu_cineverse/*.json vers data/marvel-cineverse.json.

Usage:
  python scripts/merge_wiki_fields.py [--dry-run] [--json PATH] [--output-dir DIR]
"""

import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional

DEFAULT_JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
DEFAULT_OUTPUT_DIR = Path(__file__).resolve().parent.parent / "scripts" / "output" / "mcu_cineverse"

# Mapping id cineverse -> nom fichier wiki (quand différent, ex: Docteur vs Doctor)
FILE_ID_ALIASES: Dict[str, str] = {
    "Docteur-doom-fox": "doctor-doom-fox",
}

# Surcharges acteur quand la page wiki est incorrecte (ex: page acteur au lieu du personnage)
ACTEUR_OVERRIDES: Dict[str, str] = {
    "michael-morbius": "Jared Leto",
    "morbius-ssu": "Jared Leto",
}

INFOBOX_MAPPING = {
    "status": ["status"],
    "aliases": ["alias", "aka", "real name", "realname", "name"],
    "species": ["species"],
    "gender": ["gender"],
    "affiliation": ["affiliation", "affilitation", "job"],
    "first": ["first", "movie", "films"],
}

# Surcharges manuelles quand la page wiki est incorrecte ou données manquantes
FIRST_APPEARANCE_OVERRIDES: Dict[str, str] = {
    "steve-rogers": "Captain America: The First Avenger",
    "peter-parker": "Captain America: Civil War",
    "kate-bishop": "Hawkeye",
    "michael-morbius": "Morbius",
    "sergei-kravinoff": "Kraven the Hunter",
    "shriek": "Venom: Let There Be Carnage",
    "patrick-mulligan": "Venom: Let There Be Carnage",
    "felicia-hardy": "Spider-Man: No Way Home",
    "adrian-toomes-jr": "Spider-Man: Homecoming",
    "ororo-munroe": "X-Men",
    "rogue": "X-Men",
    "bobby-drake": "X-Men",
    "kitty-pryde": "X-Men: The Last Stand",
    "warren-worthington-iii": "X-Men",
    "baron-wolfgang-von-strucker": "Captain America: The Winter Soldier",
    "baron-helmut-zemo": "Captain America: Civil War",
    "anne-weying": "Venom",
    "doreen-green": "New Warriors",
    "wilson-fisk": "Daredevil",
    "cletus-kasady": "Venom: Let There Be Carnage",
    "aleksei-sytsevich": "The Amazing Spider-Man 2",
    "kraglin": "Guardians of the Galaxy",
    "kazi": "Hawkeye",
    "prince-yan": "Shang-Chi and the Legend of the Ten Rings",
    "general-dox": "Loki",
    "victor-von-doom": "Fantastic Four",
    "venom-ssu": "Venom",
    "rhino-webb": "The Amazing Spider-Man 2",
    "scarlet-witch-fox": "X-Men: Days of Future Past",
    "reed-richards-fox": "Fantastic Four",
    "sue-storm-fox": "Fantastic Four",
    "johnny-storm-fox": "Fantastic Four",
    "ben-grimm-fox": "Fantastic Four",
    "doctor-doom-fox": "Fantastic Four",
    "silver-surfer-fox": "Fantastic Four: Rise of the Silver Surfer",
    "galactus-fox": "Fantastic Four: Rise of the Silver Surfer",
    "victor-von-doom-fox": "Fantastic Four",
    "phil-coulson-aos": "Iron Man",
    "daisy-johnson-aos": "Agents of S.H.I.E.L.D.",
    "melinda-may-aos": "Agents of S.H.I.E.L.D.",
    "leo-fitz-aos": "Agents of S.H.I.E.L.D.",
    "jemma-simmons-aos": "Agents of S.H.I.E.L.D.",
    "grant-ward-aos": "Agents of S.H.I.E.L.D.",
    "yo-yo-rodriguez-aos": "Agents of S.H.I.E.L.D.",
    "mack-aos": "Agents of S.H.I.E.L.D.",
    "robbie-reyes-aos": "Agents of S.H.I.E.L.D.",
    "peggy-carter-aos": "Agent Carter",
    "howard-stark-aos": "Iron Man",
    "black-bolt-aos": "Inhumans",
    "medusa-aos": "Inhumans",
    "maximus-aos": "Inhumans",
    "blade-ind": "Blade",
    "whistler-ind": "Blade",
    "hulk-2003-ind": "Hulk",
    "daredevil-2003-ind": "Daredevil",
    "elektra-2005-ind": "Elektra",
    "johnny-blaze-ind": "Ghost Rider",
    "punisher-2004-ind": "The Punisher",
    "howard-the-duck-ind": "Howard the Duck",
    "man-thing-ind": "Man-Thing",
    "captain-carter-mcu": "What If...?",
}


def _replace_template(m: re.Match) -> str:
    """{{Name|arg1|arg2}} -> arg1 pour extraire le contenu utile."""
    inner = m.group(1)
    if "|" in inner:
        return inner.split("|", 1)[1]
    return ""


def clean_wiki_text(raw: str) -> str:
    """Nettoie le markup wiki pour extraire du texte lisible."""
    if not raw or not isinstance(raw, str):
        return ""
    s = raw
    # [[Link|Text]] ou [[Text]] -> Text
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    # {{Template|arg}} -> arg (plusieurs passes pour imbriqués)
    for _ in range(8):
        prev = s
        # Cible le template le plus interne sans {{ dans l'arg: {{X|Y}} où Y sans {{
        s = re.sub(r"\{\{([^|{]+)\|([^{}]*)\}\}", r"\2", s)
        if s == prev:
            break
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    # {{Name| au début -> retirer pour garder le contenu après |
    s = re.sub(r"^\s*\{\{[^|]+\|\s*", "", s)
    s = re.sub(r"\{\{[^}]*$", "", s)
    # <ref>...</ref>, <ref .../>
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.DOTALL)
    s = re.sub(r"<ref[^/]*/>", "", s)
    # <!-- ... -->
    s = re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)
    # <small>, <u>, ''', ''
    s = re.sub(r"<small>([^<]*)</small>", r"\1", s)
    s = re.sub(r"<u>([^<]*)</u>", r"\1", s)
    s = re.sub(r"'''([^']*)'''", r"\1", s)
    s = re.sub(r"''([^']*)''", r"\1", s)
    # Résidus wiki : Conjec, Category, commentaires HTML
    s = re.sub(r"Conjec(?:Code)?", "", s, flags=re.IGNORECASE)
    s = re.sub(r"Category:[^\s]*", "", s, flags=re.IGNORECASE)
    s = re.sub(r"<!---.*?--->", "", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"<!---.*", "", s, flags=re.DOTALL | re.IGNORECASE)
    s = re.sub(r"[A-Z][a-z]*[A-Z][A-Za-z]{2,}(?:File|Ref|Reflist)\s*$", "", s)
    s = re.sub(r"CATFA\s*$", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def parse_aliases(
    alias_str: Optional[str],
    realname_str: Optional[str],
    name_str: Optional[str],
) -> List[str]:
    """Fusionne alias, real name, name en liste sans doublons."""
    seen = set()
    result = []
    for raw in (alias_str, realname_str, name_str):
        if not raw:
            continue
        parts = re.split(r"<br\s*/?>|,", raw, flags=re.IGNORECASE)
        for p in parts:
            cleaned = clean_wiki_text(p)
            if "{{" in cleaned or cleaned.startswith("|"):
                continue
            if len(cleaned) >= 2 and cleaned.lower() not in seen:
                # Filtrer les en-têtes comme "Codenames", "Nicknames"
                if cleaned.lower() not in ("codenames", "nicknames", "derivatives", "undercover aliases", "in-universe media"):
                    seen.add(cleaned.lower())
                    result.append(cleaned)
    return result


# Regex pour extraire ''[[Titre]]'' ou [[Titre|Label]] du wikitext (fonctionne avec templates imbriqués)
_WIKI_LINK = re.compile(r"''\[\[([^\]|]+)(?:\|[^\]]+)?\]\]''|\[\[([^\]|]+)(?:\|[^\]]+)?\]\]")


def _extract_first_film_link(raw: str) -> Optional[str]:
    """Extrait le premier lien de film/série depuis du wikitext brut."""
    if not raw:
        return None
    for m in _WIKI_LINK.finditer(raw):
        title = (m.group(1) or m.group(2) or "").strip()
        if not title or len(title) < 2:
            continue
        # Ignorer liens non-médias (Category, File, etc.)
        if title.startswith(("Category:", "File:", "Wikipedia:", "Template:", ":")):
            continue
        if "(" in title and "film)" in title.lower():
            title = title.split("(")[0].strip()
        return title
    return None


def extract_first_appearance(infobox: Dict[str, str], content: str = "") -> Optional[str]:
    """Extrait la première apparition depuis first, movie, films, tv series, ou content."""
    # 1. Champ first direct
    val = get_infobox_value(infobox, ["first"])
    if val:
        link = _extract_first_film_link(val)
        if link:
            return link
        cleaned = clean_wiki_text(val)
        if cleaned:
            return cleaned

    # 2. first dans voice
    voice = infobox.get("voice", "")
    if voice:
        for pattern in [r"first=''([^']+)''", r"first='([^']*)'"]:
            m = re.search(pattern, voice)
            if m and m.group(1).strip():
                link = _extract_first_film_link(m.group(1))
                if link:
                    return link
                cleaned = clean_wiki_text(m.group(1))
                if cleaned:
                    return cleaned

    # 3. movie, films, tv series, media, appearances - extraire premier lien [[X]]
    for key in ["movie", "films", "tv series", "media", "appearances"]:
        val = get_infobox_value(infobox, [key])
        if not val:
            continue
        link = _extract_first_film_link(val)
        if link:
            return link
        # Fallback: split par <br> et nettoyer chaque partie
        parts = re.split(r"<br\s*/?>", val, flags=re.IGNORECASE)
        for p in parts:
            link = _extract_first_film_link(p)
            if link:
                return link
            cleaned = clean_wiki_text(p)
            if cleaned and not cleaned.startswith("("):
                return cleaned

    # 4. Fallback: parser le content
    if content:
        # [[Category:Iron Man characters]] ou [[Category:Spider-Man: Homecoming]]
        for cat_pattern in [
            r"\[\[Category:([^\]]+)\s+[Cc]haracters?\]\]",
            r"\[\[Category:([^\]]+)\s+Actors\]\]",
            r"DISPLAYTITLE:.*?''\[\[([^\]|]+)",
        ]:
            for m in re.finditer(cat_pattern, content[:8000]):
                title = m.group(1).strip()
                if title and "Category" not in title and len(title) > 2:
                    if "(" in title and "film)" in title.lower():
                        title = title.split("(")[0].strip()
                    return title
        link = _extract_first_film_link(content[:8000])
        if link:
            return link

    return None


def _first_appearance_from_page_title(wiki_data: dict) -> Optional[str]:
    """Utilise le titre de la page wiki si c'est Film/Credits ou similaire."""
    title = wiki_data.get("title", "")
    if "/Credits" in title or "/Cast" in title:
        film = title.split("/")[0].strip()
        if film and len(film) > 2:
            return film
    return None


def get_infobox_value(infobox: Dict[str, str], keys: List[str]) -> Optional[str]:
    """Retourne la première valeur non vide pour les clés données (case-insensitive)."""
    infobox_lower = {k.lower(): v for k, v in infobox.items()}
    for key in keys:
        val = infobox_lower.get(key.lower())
        if val and str(val).strip():
            return str(val).strip()
    return None


def merge_character(char: dict, output_path: Path) -> dict:
    """Fusionne les champs wiki dans le personnage."""
    if not output_path.exists():
        return char
    try:
        data = json.loads(output_path.read_text(encoding="utf-8"))
    except Exception:
        return char
    infobox = data.get("infobox") or {}
    if not infobox:
        return char

    # status
    val = get_infobox_value(infobox, INFOBOX_MAPPING["status"])
    if val:
        char["status"] = clean_wiki_text(val)

    # aliases
    alias_raw = get_infobox_value(infobox, ["alias", "aka"])
    realname_raw = get_infobox_value(infobox, ["real name", "realname"])
    name_raw = get_infobox_value(infobox, ["name"])
    aliases = parse_aliases(alias_raw, realname_raw, name_raw)
    if aliases:
        char["aliases"] = aliases

    # species (remplacer <br> par ", ")
    val = get_infobox_value(infobox, INFOBOX_MAPPING["species"])
    if val:
        val = re.sub(r"<br\s*/?>", ", ", val, flags=re.IGNORECASE)
        char["species"] = clean_wiki_text(val)

    # gender
    val = get_infobox_value(infobox, INFOBOX_MAPPING["gender"])
    if val:
        char["gender"] = clean_wiki_text(val)

    # affiliation - prendre le premier si plusieurs <br>
    val = get_infobox_value(infobox, INFOBOX_MAPPING["affiliation"])
    if val:
        parts = re.split(r"<br\s*/?>", val, flags=re.IGNORECASE)
        first_aff = clean_wiki_text(parts[0]) if parts else ""
        if first_aff:
            char["affiliation"] = first_aff

    # firstAppearance (infobox, content, titre de page, puis overrides)
    content = data.get("content", "")
    cid = char.get("id", "")
    first = extract_first_appearance(infobox, content)
    if not first:
        first = _first_appearance_from_page_title(data)
    if not first:
        first = FIRST_APPEARANCE_OVERRIDES.get(cid)
    # Overrides ont priorité pour corriger les erreurs wiki (steve-rogers, peter-parker, etc.)
    if cid in FIRST_APPEARANCE_OVERRIDES:
        first = FIRST_APPEARANCE_OVERRIDES[cid]
    if first:
        char["firstAppearance"] = first

    # acteur (actor, voice actor, portrayed_by selon le wiki)
    cid = char.get("id", "")
    if cid in ACTEUR_OVERRIDES:
        char["acteur"] = ACTEUR_OVERRIDES[cid]
    else:
        val = get_infobox_value(infobox, ["actor", "voice actor", "portrayed_by"])
        if val:
            parts = re.split(r"<br\s*/?>", val, flags=re.IGNORECASE)
            first_actor = clean_wiki_text(parts[0]) if parts else ""
            if first_actor:
                char["acteur"] = first_actor

    return complete_missing_fields(char)


def complete_missing_fields(char: dict) -> dict:
    """Complète les champs vides avec des valeurs par défaut."""
    name = char.get("name") or ""
    # Valeurs par défaut pour les champs manquants (en français)
    if not char.get("status"):
        char["status"] = "Inconnu"
    if not char.get("species"):
        char["species"] = "Inconnu"
    if not char.get("gender"):
        char["gender"] = "Inconnu"
    if not char.get("affiliation"):
        char["affiliation"] = "Inconnu"
    if not char.get("acteur"):
        char["acteur"] = "Inconnu"
    fa = char.get("firstAppearance")
    if not fa or fa == "Inconnu":
        override = FIRST_APPEARANCE_OVERRIDES.get(char.get("id", ""))
        char["firstAppearance"] = override if override else (fa or "Inconnu")
    # Filtrer les aliases invalides (markup résiduel, fragments Ref/File)
    aliases = char.get("aliases", [])
    if aliases:
        # Retirer les résidus de templates (ex: HStarkSHDFile en fin)
        junk_suffix = re.compile(r"[A-Z][a-z]*[A-Z][A-Za-z]{3,}(?:File|Ref|Reflist)$")
        cleaned_aliases = []
        for a in aliases:
            if not isinstance(a, str) or "{{" in a or len(a.strip()) < 2:
                continue
            if re.match(r"^(?:File|Credits|SSR)\s+for\s+", a.strip(), re.I):
                continue
            a = re.sub(junk_suffix, "", a.strip()).strip()
            if len(a) >= 2 and a.lower() not in (x.lower() for x in cleaned_aliases):
                cleaned_aliases.append(a)
        result = cleaned_aliases if cleaned_aliases else []
        if name and (not result or name.lower() not in {a.lower() for a in result}):
            result = [name] + result
        char["aliases"] = result
    # Nettoyer firstAppearance (markup résiduel {{, }}, etc.)
    fa = char.get("firstAppearance")
    if fa:
        fa = str(fa).lstrip("}>")
        if "{{" in fa:
            fa = clean_wiki_text(fa)
        if fa:
            char["firstAppearance"] = fa
        else:
            del char["firstAppearance"]
    return char


def main():
    parser = argparse.ArgumentParser(description="Merge wiki infobox fields into marvel-cineverse.json")
    parser.add_argument("--json", type=str, default=str(DEFAULT_JSON_PATH))
    parser.add_argument("--output-dir", type=str, default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--dry-run", action="store_true", help="Afficher les changements sans écrire")
    args = parser.parse_args()

    json_path = Path(args.json)
    out_dir = Path(args.output_dir)

    with open(json_path, encoding="utf-8") as f:
        data = json.load(f)

    chars = data.get("characters", [])
    merged = 0
    for char in chars:
        cid = char.get("id")
        if not cid:
            continue
        file_stem = FILE_ID_ALIASES.get(cid, cid)
        output_path = out_dir / f"{file_stem}.json"
        before = dict(char)
        char = merge_character(char, output_path)
        if char != before:
            merged += 1
            if args.dry_run:
                diff = set(char.keys()) - set(before.keys())
                changed = [k for k in char if k in before and char[k] != before.get(k)]
                if diff or changed:
                    print(f"  {cid}: +{list(diff)} changed={changed}")
    # Compléter les champs manquants pour TOUS les personnages
    for char in chars:
        complete_missing_fields(char)

    if not args.dry_run:
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Terminé. {merged} personnages mis à jour. Écrit dans {json_path}")
    else:
        print(f"Dry-run: {merged} personnages auraient été mis à jour.")


if __name__ == "__main__":
    main()
