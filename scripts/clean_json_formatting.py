#!/usr/bin/env python3
"""
Nettoie les champs du JSON des résidus de markup wiki (Ref, Conjec, Category, etc.).
"""
import json
import re
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Aliases incorrects à supprimer par personnage (ex: copié-collé d'une autre fiche)
ALIAS_REMOVALS = {
    "william-stryker": ["Wade Winston Wilson"],
}


def _clean_wiki_pipes(s: str) -> str:
    """Nettoie la syntaxe wiki [[Page|Display]] -> garde Display. Gère Page#ancre|Display."""
    if "|" not in s:
        return s
    parts = [p.strip() for p in s.split("|") if p.strip()]
    if not parts:
        return s
    # Si le dernier segment est un fragment parentétique (briefly), (formerly), on combine avec le premier
    last = parts[-1]
    first = parts[0]
    if last.startswith("(") and len(last) < 25 and len(first) > 2:
        return f"{first} {last}"
    # Sinon prendre le dernier segment (convention wiki: Page|Display -> Display)
    if len(last) >= 2 and not last.startswith("http"):
        return last
    return first


def _strip_alias_code_suffixes(t: str) -> str:
    """Retire les suffixes de type wiki/episode (TTT, MSCE, DD205, etc.) collés aux noms."""
    # 1. Supprimer les codes DD###, MK### collés à un mot (NatchiosDD205, NelsonDD210)
    t = re.sub(r"(?<=[a-zA-Z])(DD\d{2,3}|MK\d{2,3})(?=\s|$|[\(\),])", "", t)
    # 2. Supprimer les codes WV###, FFFS, CCMK###, etc. collés à un mot
    t = re.sub(r"(?<=[a-zA-Z])(WV\d{2,3}|FFFS|CCMK\d{2,3})(?=\s|$|[\(\),<\-])", "", t)
    # 3. Supprimer les suffixes en fin de chaîne (ParkerTTT, WilsonMSCE, PymAMatWMSCE)
    while True:
        new_t = re.sub(r"(.*[a-z])([A-Z][A-Z0-9]{2,10})$", r"\1", t)
        if new_t == t:
            break
        t = new_t
    return t


def clean_value(s: str) -> str:
    """Nettoie une chaîne des résidus wiki."""
    if not s or not isinstance(s, str):
        return s
    t = s
    # <ref>...</ref>, <ref .../> et <ref>... non fermé (tronqué)
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.DOTALL | re.IGNORECASE)
    t = re.sub(r"<ref[^>]*>.*$", "", t, flags=re.DOTALL | re.IGNORECASE)
    t = re.sub(r"<ref[^/]*/>", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\]?\s*</ref>\s*$", "", t, flags=re.IGNORECASE)
    # HTML comments <!-- ... --> et <!--- ... ---> (y compris non fermés)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.DOTALL)
    t = re.sub(r"<!--.*$", "", t)
    t = re.sub(r"<!---.*?--->", "", t, flags=re.DOTALL | re.IGNORECASE)
    t = re.sub(r"<!---.*", "", t, flags=re.DOTALL | re.IGNORECASE)
    t = re.sub(r"--->\s*$", "", t)
    # Conjec, ConjecCode, Ref, File (n'importe où)
    t = re.sub(r"Conjec(?:Code)?", "", t, flags=re.IGNORECASE)
    t = re.sub(r"[A-Z][a-z]*[A-Z][A-Za-z]{2,}(?:File|Ref|Reflist)\s*$", "", t)
    # CATFA, credits, file for patterns
    t = re.sub(r"CATFA\s*$", "", t, flags=re.IGNORECASE)
    t = re.sub(r"\s*(?:Credits|File)\s+for\s+[^>]*--?>?\s*$", "", t, flags=re.IGNORECASE)
    # Category:XXX (peut coller au mot précédent : HybridCategory:Pig/Spider Hybrids)
    t = re.sub(r"Category:[^\s]*(?:\s+[^\s]+)?", "", t, flags=re.IGNORECASE)
    # "Hybrid Hybrids" résiduel -> "Hybrid"
    t = re.sub(r"\s+Hybrids\s*$", "", t, flags=re.IGNORECASE)
    # 20px, 25px, 30px (tailles d'images wiki)
    t = re.sub(r"\d+px\s*", "", t)
    # Pipes wiki : Page|Display ou Page#ancre|Display -> Display
    t = _clean_wiki_pipes(t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def clean_aliases(aliases: list) -> list:
    """Nettoie la liste d'aliases et retire les entrées invalides."""
    if not aliases:
        return aliases
    seen = set()
    result = []
    for a in aliases:
        if not isinstance(a, str):
            continue
        cleaned = clean_value(a)
        # Appliquer le nettoyage des codes wiki (TTT, MSCE, DD205, etc.)
        cleaned = _strip_alias_code_suffixes(cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        # Rejeter les entrées purement markup ("File for X", "Credits for X" seul)
        if not cleaned or len(cleaned) < 2:
            continue
        if re.match(r"^(?:File|Credits|SSR)\s+for\s+", cleaned, re.I):
            continue
        # Rejeter les fragments de commentaires HTML et contenu de ref (ex: "but \"Percy\" comes from...")
        if re.match(r"^(?:but|and|or|although)\s+", cleaned, re.I):
            continue
        if "-->" in a or "comes from" in cleaned.lower() or "credited with" in cleaned.lower():
            continue
        # Alias trop court ou acronymes résiduels (SSR seul = reste de "SSR File for...")
        if len(cleaned) <= 3 and cleaned.isupper():
            continue
        if cleaned.lower() in seen:
            continue
        seen.add(cleaned.lower())
        result.append(cleaned)
    return result


def clean_char(char: dict) -> bool:
    """Nettoie un personnage. Retourne True si modifié."""
    changed = False
    for key in ("aliases", "species", "affiliation", "status", "name"):
        val = char.get(key)
        if val is None:
            continue
        if key == "aliases" and isinstance(val, list):
            cid = char.get("id", "")
            to_remove = ALIAS_REMOVALS.get(cid, [])
            val = [a for a in val if isinstance(a, str) and a not in to_remove]
            cleaned = clean_aliases(val)
            if cleaned != char.get("aliases", []):
                char[key] = cleaned
                changed = True
        elif isinstance(val, str):
            cleaned = clean_value(val)
            if cleaned != val:
                char[key] = cleaned
                changed = True
    return changed


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    count = 0
    for char in data.get("characters", []):
        if clean_char(char):
            count += 1
            print(f"  {char.get('id')}: corrigé")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Terminé. {count} personnages corrigés.")


if __name__ == "__main__":
    main()
