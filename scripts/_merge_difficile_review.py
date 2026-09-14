# -*- coding: utf-8 -*-
"""Merge DIFFICILE review batches into marvel-cineverse.json."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

BATCH_COUNT = 27

KNOWN_WRONG_HERO_ALIASES = {
    "Star-Lord",
    "Iron Man",
    "Captain America",
    "Spider-Man",
    "Thor",
    "Hulk",
    "Black Widow",
    "Hawkeye",
    "Doctor Strange",
    "Scarlet Witch",
    "Ant-Man",
    "Wasp",
    "Falcon",
    "Winter Soldier",
    "Black Panther",
    "Panthère Noire",
    "Captain Marvel",
    "Wolverine",
    "Deadpool",
}


def load_batches():
    chars = []
    counts = {}
    for i in range(1, BATCH_COUNT + 1):
        path = DATA / f"marvel-difficile-review-batch-{i}.json"
        if not path.exists():
            raise FileNotFoundError(f"MISSING {path}")
        batch = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(batch, list):
            raise ValueError(f"NOT_ARRAY {path}")
        counts[i] = len(batch)
        chars.extend(batch)
    return chars, counts


def spot_check_wrong_aliases(characters):
    issues = []
    for c in characters:
        aliases = c.get("aliases") or []
        if not aliases:
            continue
        a0 = aliases[0]
        name = c.get("name") or ""
        uid = c.get("id") or ""
        name_l = name.lower().replace("'", "")
        a0_l = a0.lower().replace("'", "")
        if a0_l in name_l or name_l in a0_l:
            continue
        if a0 not in KNOWN_WRONG_HERO_ALIASES:
            continue
        hero_checks = {
            "Star-Lord": ["quill", "star_lord", "star-lord", "peter quill"],
            "Iron Man": ["tony_stark", "iron_man", "tony stark"],
            "Captain America": ["steve_rogers", "captain_america", "sam_wilson"],
            "Spider-Man": ["peter_parker", "spider_man", "miles_morales", "aaron_davis"],
            "Thor": ["thor"],
            "Hulk": ["bruce_banner", "hulk"],
            "Black Widow": ["natasha", "black_widow"],
            "Hawkeye": ["clint_barton", "hawkeye", "kate_bishop"],
            "Doctor Strange": ["stephen_strange", "doctor_strange"],
            "Scarlet Witch": ["wanda", "scarlet_witch"],
            "Ant-Man": ["scott_lang", "hank_pym", "ant_man"],
            "Wasp": ["hope_van", "janet_van", "wasp"],
            "Falcon": ["sam_wilson", "falcon"],
            "Winter Soldier": ["bucky", "winter_soldier"],
            "Black Panther": ["t_challa", "shuri", "black_panther"],
            "Panthère Noire": ["t_challa", "shuri", "panthere", "black_panther"],
            "Captain Marvel": ["carol_danvers", "captain_marvel"],
            "Wolverine": ["logan", "wolverine"],
            "Deadpool": ["wade_wilson", "deadpool"],
        }
        checks = hero_checks.get(a0, [])
        uid_l = uid.lower()
        name_ll = name.lower()
        expected_ok = any(chk in uid_l or chk in name_ll for chk in checks)
        if not expected_ok:
            issues.append(
                {
                    "id": uid,
                    "name": name,
                    "aliases0": a0,
                    "note": "aliases[0] looks like another hero",
                }
            )
    return issues


def sample_fr_nicknames(updated_chars, n=30):
    samples = []
    for c in updated_chars[:n]:
        aliases = c.get("aliases") or []
        samples.append(
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "aliases0": aliases[0] if aliases else None,
                "difficulty": c.get("difficulty"),
            }
        )
    return samples


def formerly_in_char(c):
    hits = []
    for key in ("affiliation", "status", "role", "species", "firstAppearance"):
        val = c.get(key)
        if isinstance(val, str) and "Formerly:" in val:
            hits.append({"field": key, "value": val})
    for key in ("aliases", "abilities"):
        for item in c.get(key) or []:
            if isinstance(item, str) and "Formerly:" in item:
                hits.append({"field": key, "value": item})
    for key in ("hint1", "hint2", "hint3"):
        val = c.get(key)
        if isinstance(val, str) and "Formerly:" in val:
            hits.append({"field": key, "value": val})
    return hits


def main():
    chars, batch_counts = load_batches()
    print("batch_counts:", batch_counts)
    print("total_loaded:", len(chars))

    cine = json.loads((DATA / "marvel-cineverse.json").read_text(encoding="utf-8"))
    by_id = {c["id"]: i for i, c in enumerate(cine["characters"])}

    difficile_before = sum(
        1 for c in cine["characters"] if c.get("difficulty") == "Difficile"
    )
    dist_before = Counter(c.get("difficulty") for c in cine["characters"])

    batch_by_id = {}
    for c in chars:
        batch_by_id[c["id"]] = c

    updated = []
    missing = []
    demoted_to_impossible = []
    unexpected_difficulty = []

    for cid, batch_char in batch_by_id.items():
        if cid not in by_id:
            missing.append(cid)
            continue
        idx = by_id[cid]
        old = cine["characters"][idx]
        old_diff = old.get("difficulty")
        new_char = dict(batch_char)
        new_diff = new_char.get("difficulty")

        if old_diff == "Difficile" and new_diff == "Impossible":
            demoted_to_impossible.append(
                {
                    "id": cid,
                    "name": new_char.get("name"),
                    "from": old_diff,
                    "to": new_diff,
                }
            )
        elif new_diff not in ("Difficile", "Impossible"):
            unexpected_difficulty.append(
                {
                    "id": cid,
                    "name": new_char.get("name"),
                    "difficulty": new_diff,
                }
            )

        cine["characters"][idx] = new_char
        updated.append(cid)

    updated_chars = [cine["characters"][by_id[i]] for i in updated if i in by_id]
    spot_issues = spot_check_wrong_aliases(updated_chars)

    formerly_hits = []
    for c in updated_chars:
        hits = formerly_in_char(c)
        if hits:
            formerly_hits.append({"id": c["id"], "name": c.get("name"), "hits": hits})

    difficile_after = sum(
        1 for c in cine["characters"] if c.get("difficulty") == "Difficile"
    )
    dist_after = Counter(c.get("difficulty") for c in cine["characters"])

    out_cine = DATA / "marvel-cineverse.json"
    out_cine.write_text(
        json.dumps(cine, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    verify_fail = []
    for cid, batch_char in batch_by_id.items():
        if cid not in by_id:
            verify_fail.append({"id": cid, "reason": "missing_in_cineverse"})
            continue
        merged = cine["characters"][by_id[cid]]
        batch_a0 = (batch_char.get("aliases") or [None])[0] if batch_char.get("aliases") else None
        merged_a0 = (merged.get("aliases") or [None])[0] if merged.get("aliases") else None
        if batch_a0 != merged_a0:
            verify_fail.append(
                {
                    "id": cid,
                    "reason": "aliases0_mismatch",
                    "batch": batch_a0,
                    "merged": merged_a0,
                }
            )
        if merged.get("difficulty") != batch_char.get("difficulty"):
            verify_fail.append(
                {
                    "id": cid,
                    "reason": "difficulty_mismatch",
                    "batch": batch_char.get("difficulty"),
                    "merged": merged.get("difficulty"),
                }
            )

    report = {
        "updated_count": len(updated),
        "batch_counts": {str(k): v for k, v in batch_counts.items()},
        "batch_total": len(chars),
        "unique_ids_count": len(batch_by_id),
        "unique_ids": sorted(batch_by_id.keys()),
        "missing_ids": missing,
        "demoted_to_Impossible_count": len(demoted_to_impossible),
        "demoted_to_Impossible": demoted_to_impossible,
        "unexpected_difficulty": unexpected_difficulty,
        "difficile_before": difficile_before,
        "difficile_after": difficile_after,
        "difficulty_distribution_before": dict(
            sorted(dist_before.items(), key=lambda x: (x[0] is None, x[0] or ""))
        ),
        "difficulty_distribution_after": dict(
            sorted(dist_after.items(), key=lambda x: (x[0] is None, x[0] or ""))
        ),
        "difficulty_snapshot": {
            k: dist_after.get(k, 0)
            for k in ["Très Facile", "Facile", "Moyen", "Difficile", "Impossible"]
        },
        "formerly_remaining": formerly_hits,
        "formerly_remaining_count": len(formerly_hits),
        "sample_fr_nicknames": sample_fr_nicknames(updated_chars, 30),
        "spot_check_wrong_aliases": spot_issues,
        "qa_notes": {
            "empty_aliases": [
                {"id": c["id"], "name": c.get("name")}
                for c in updated_chars
                if not (c.get("aliases") or [])
            ],
            "empty_role": [
                {"id": c["id"], "name": c.get("name")}
                for c in updated_chars
                if not (c.get("role") or "").strip()
            ],
            "empty_abilities": [
                {"id": c["id"], "name": c.get("name")}
                for c in updated_chars
                if not (c.get("abilities") or [])
            ],
        },
        "verify": {
            "all_batch_ids_in_cineverse": len(missing) == 0,
            "aliases0_and_difficulty_match": len(verify_fail) == 0,
            "verify_fail": verify_fail,
        },
    }

    report_path = DATA / "marvel-difficile-review-merge-report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("updated:", len(updated))
    print("missing:", missing)
    print("demoted:", len(demoted_to_impossible))
    for d in demoted_to_impossible:
        print("  DEM:", d["id"], d["name"])
    print("difficile:", difficile_before, "->", difficile_after)
    print("dist_after:", dict(dist_after))
    print("formerly:", len(formerly_hits))
    print("unexpected:", unexpected_difficulty)
    print("verify_fail:", verify_fail)
    print("wrote:", out_cine)
    print("wrote:", report_path)


if __name__ == "__main__":
    main()
