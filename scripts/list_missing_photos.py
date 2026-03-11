#!/usr/bin/env python3
"""Liste les personnages sans photo dans public/universes/marvel-cineverse/characters/"""
import json
from pathlib import Path

JSON_PATH = Path(__file__).resolve().parent.parent / "data" / "marvel-cineverse.json"
PHOTOS_DIR = Path(__file__).resolve().parent.parent / "public" / "universes" / "marvel-cineverse" / "characters"

def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        data = json.load(f)
    
    char_ids = {c["id"] for c in data.get("characters", []) if c.get("id")}
    
    if not PHOTOS_DIR.exists():
        print(f"Dossier photos introuvable: {PHOTOS_DIR}")
        return
    
    photo_stems = {p.stem for p in PHOTOS_DIR.iterdir() if p.is_file()}
    
    missing = sorted(char_ids - photo_stems)
    missing_with_names = [
        (cid, next((c["name"] for c in data["characters"] if c.get("id") == cid), ""))
        for cid in missing
    ]
    
    print(f"Personnages sans photo ({len(missing)}):\n")
    for cid, name in missing_with_names:
        print(f"  {cid} ({name})")
    print(f"\nTotal: {len(missing)} manquants sur {len(char_ids)} personnages")

if __name__ == "__main__":
    main()
