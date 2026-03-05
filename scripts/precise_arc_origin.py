#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Met à jour les champs arc et origin dans data/one-piece.json à partir des
fichiers out_parsed/ pour les rendre plus précis (ex: arc = "Arlong Park"
au lieu de "East Blue", origin = lieu précis quand disponible).

- arc : déduit de la "première" apparition (numéro de chapitre) via une table
  chapitre -> nom d'arc.
- origin : pris depuis l'infobox "origine" (et "lieuvie" si plus précis),
  nettoyé du wikitexte ([[ ]], {{ }}, <ref>, etc.).
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_JSON = ROOT / "data" / "one-piece.json"
OUT_PARSED_DIR = ROOT / "out_parsed"
ARCS_BY_CHAPTER_JSON = ROOT / "data" / "one-piece-arcs-by-chapter.json"


def load_arcs_by_chapter() -> list[tuple[int, str]]:
    """Charge la table chapitre max -> arc depuis le JSON (réutilisable par le site)."""
    with open(ARCS_BY_CHAPTER_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)
    arcs = data.get("arcs", [])
    return [(e["chapterMax"], e["arc"]) for e in arcs]


def chapter_to_arc(chapter: int, arcs_table: list[tuple[int, str]]) -> str:
    """Retourne le nom de l'arc pour un numéro de chapitre."""
    for max_ch, arc_name in arcs_table:
        if chapter <= max_ch:
            return arc_name
    return arcs_table[-1][1] if arcs_table else ""


def extract_first_chapter(premiere: str) -> int | None:
    """Extrait le premier numéro de chapitre depuis le champ première (wikitexte)."""
    if not premiere:
        return None
    # [[Chapitre 69]], [[Chapitre 444]], etc.
    m = re.search(r"\[\[Chapitre\s+(\d+)\]\]", premiere, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"chapitre\s*=\s*(\d+)", premiere, re.I)
    if m:
        return int(m.group(1))
    m = re.search(r"(\d{2,4})\s*[;\|]", premiere)
    if m:
        return int(m.group(1))
    return None


def clean_wiki_text(raw: str) -> str:
    """Nettoie le wikitexte pour obtenir du texte lisible (pour origin)."""
    if not raw:
        return ""
    s = raw.strip()
    # Supprimer les refs et templates (grossier)
    s = re.sub(r"\{\{[^}]*\}\}", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.DOTALL | re.I)
    s = re.sub(r"<ref[^/]*/>", "", s, flags=re.I)
    s = re.sub(r"<[^>]+>", "", s)
    # [[Libellé|affiché]] -> affiché ou Libellé
    s = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", s)
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    s = re.sub(r"''+", "", s)
    s = re.sub(r"<br\s*/?>", ", ", s, flags=re.I)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^\s*,\s*|\s*,\s*$", "", s)
    return s.strip() or ""


def id_to_stems(char_id: str) -> list[str]:
    """Retourne les stems de fichier possibles (ex: who-s-who -> who_s_who, who_s-who)."""
    s = char_id.replace("-", "_")
    stems = [s]
    if "_" in s and "-" in char_id:
        # who_s_who -> aussi who_s-who
        parts = s.split("_")
        if len(parts) >= 2:
            stems.append(parts[0] + "_" + "-".join(parts[1:]))
    return stems


def main():
    arcs_table = load_arcs_by_chapter()

    with open(DATA_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    updated_arc = 0
    updated_origin = 0
    missing = 0

    for char in data.get("characters", []):
        char_id = char.get("id", "")
        if not char_id:
            continue
        parsed = None
        for stem in id_to_stems(char_id):
            path = OUT_PARSED_DIR / f"{stem}.json"
            if path.exists():
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        parsed = json.load(f)
                    break
                except Exception:
                    pass
        if not parsed:
            missing += 1
            continue

        infobox = parsed.get("infobox") or {}

        # Arc depuis première apparition
        premiere = infobox.get("première") or infobox.get("premiere") or ""
        ch = extract_first_chapter(premiere)
        if ch is not None:
            new_arc = chapter_to_arc(ch, arcs_table)
            if char.get("arc") != new_arc:
                char["arc"] = new_arc
                updated_arc += 1

        # Origin depuis origine (lieu de naissance) ou lieuvie si plus précis
        origine_raw = infobox.get("origine") or infobox.get("origin") or ""
        lieuvie_raw = infobox.get("lieuvie") or ""
        origin_candidates = []
        if origine_raw:
            origin_candidates.append(clean_wiki_text(origine_raw))
        if lieuvie_raw:
            cleaned_lieu = clean_wiki_text(lieuvie_raw)
            if cleaned_lieu and cleaned_lieu not in origin_candidates:
                # On garde origine en priorité; si origine est très générique (ex. "East Blue")
                # et lieuvie est précis, on pourrait utiliser lieuvie - pour l'instant on garde origine
                pass
        new_origin = (origin_candidates[0] if origin_candidates else "").strip()
        if new_origin and char.get("origin") != new_origin:
            char["origin"] = new_origin
            updated_origin += 1

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"OK: arc mis à jour pour {updated_arc} personnages, origin pour {updated_origin}. Fichiers manquants: {missing}")


if __name__ == "__main__":
    main()
