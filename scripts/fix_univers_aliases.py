#!/usr/bin/env python3
"""
Corrige les incohérences entre le champ 'univers' et les aliases contenant (Terre-XXX).
- Si un alias contient (Terre-N) différent de univers: soit corriger univers, soit retirer l'alias.
- Pour les personnages avec override connu (elektra-2005 = 701306), on met à jour univers.
- On retire des aliases les entrées du type "X (Terre-N)" qui ne correspondent pas au univers du perso.
"""
import json
import re
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"

# Personnages dont le bon univers est dans les aliases (wiki plus précis que notre mapping)
UNIVERS_FROM_ALIAS_OVERRIDES = {
    "elektra-2005-ind": 701306,  # Elektra 2005 = Earth-701306 (pas 26320)
}

terre_re = re.compile(r"\(Terre-(\d+)\)|\(Earth-(\d+)\)", re.I)


def extract_earth_from_text(s: str) -> int | None:
    m = terre_re.search(s)
    if m:
        return int(m.group(1) or m.group(2))
    return None


def clean_alias(alias: str, univers: int) -> str | None:
    """Retourne l'alias nettoyé (sans Terre-X si incohérent) ou None pour supprimer."""
    earth = extract_earth_from_text(alias)
    if earth is None:
        return alias  # pas de Terre-X, garder
    if earth == univers or univers == 0:
        return alias  # cohérent ou variante
    # Incohérent: retirer le (Terre-X) de l'alias ou le remplacer par le bon
    if univers != 0:
        # Supprimer cet alias car il référence une mauvaise Terre
        return None
    return alias


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)

    updated = 0
    for c in data["characters"]:
        cid = c.get("id", "")
        univers = c.get("univers", 0)

        # 1. Override univers si configuré (ex: elektra-2005)
        if cid in UNIVERS_FROM_ALIAS_OVERRIDES:
            new_univers = UNIVERS_FROM_ALIAS_OVERRIDES[cid]
            if univers != new_univers:
                c["univers"] = new_univers
                univers = new_univers
                # Mettre à jour le name si il contient (Terre-XXX)
                name = c.get("name", "")
                old_earth = extract_earth_from_text(name)
                if old_earth is not None and old_earth != new_univers:
                    c["name"] = terre_re.sub(f"(Terre-{new_univers})", name)
                updated += 1

        # 2. Nettoyer les aliases incohérents
        aliases = c.get("aliases", [])
        cleaned = []
        for a in aliases:
            result = clean_alias(a, univers)
            if result is not None:
                cleaned.append(result)
        if len(cleaned) != len(aliases):
            c["aliases"] = cleaned
            updated += 1

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Done. {updated} personnages corrigés.")


if __name__ == "__main__":
    main()
