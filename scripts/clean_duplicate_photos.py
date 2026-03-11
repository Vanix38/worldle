#!/usr/bin/env python3
"""Supprime les doublons dans photos/ (garde .jpg, sinon .png, sinon .webp)."""
from pathlib import Path

PHOTOS_DIR = Path(__file__).resolve().parent.parent / "public" / "universes" / "marvel-cineverse" / "characters"
PRIORITY = (".jpg", ".png", ".webp")

def main():
    if not PHOTOS_DIR.exists():
        print(f"Dossier introuvable: {PHOTOS_DIR}")
        return
    by_base = {}
    for f in PHOTOS_DIR.iterdir():
        if f.is_file():
            by_base.setdefault(f.stem, []).append(f)
    removed = 0
    for base, files in by_base.items():
        if len(files) <= 1:
            continue
        # Garder le fichier avec l'extension prioritaire (jpg > png > webp)
        def sort_key(p):
            ext = p.suffix.lower()
            return (PRIORITY.index(ext) if ext in PRIORITY else 99, p.name)
        files.sort(key=sort_key)
        keep = files[0]
        for f in files[1:]:
            f.unlink()
            removed += 1
            print(f"  Supprimé: {f.name} (gardé: {keep.name})")
    print(f"\n{removed} doublons supprimés.")

if __name__ == "__main__":
    main()
