# -*- coding: utf-8 -*-
"""Merge MOYEN review batches into marvel-cineverse.json."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

BATCH_COUNT = 14

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

# Must remain Moyen after relaunch corrections (sanity check, not force)
MUST_STAY_MOYEN = {
    "high_evolutionary-mcu-616",
    "haut_evolutionnaire-mcu-616",
    "maybelle_may_parker-webb_verse-120703",
    "maybelle_webb-webb_verse-120703",
    "may_parker-webb_verse-120703",
    "peter_wisdom-fox_x_men-41633",
}


def load_batches():
    chars = []
    counts = {}
    for i in range(1, BATCH_COUNT + 1):
        path = DATA / f"marvel-moyen-review-batch-{i}.json"
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


def sample_fr_nicknames(updated_chars, n=25):
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

    moyen_before = sum(1 for c in cine["characters"] if c.get("difficulty") == "Moyen")
    dist_before = Counter(c.get("difficulty") for c in cine["characters"])

    batch_by_id = {}
    for c in chars:
        batch_by_id[c["id"]] = c  # last wins

    # Sanity: relaunch corrections must be Moyen in latest files
    relaunch_checks = []
    for cid, expected in [
        ("high_evolutionary", "Moyen"),
        ("maybelle", "Moyen"),
        ("may_parker", "Moyen"),
        ("peter_wisdom", "Moyen"),
    ]:
        matches = [
            (i, c)
            for i, c in batch_by_id.items()
            if cid in i.lower()
            or cid.replace("_", " ") in (c.get("name") or "").lower()
            or ("haut" in i.lower() and "evol" in i.lower() and cid == "high_evolutionary")
            or ("evolutionnaire" in (c.get("name") or "").lower() and cid == "high_evolutionary")
            or ("tante may" in (c.get("name") or "").lower() and cid == "maybelle")
            or ("maybelle" in (c.get("name") or "").lower() and cid == "maybelle")
        ]
        for mid, mc in matches:
            relaunch_checks.append(
                {
                    "match_key": cid,
                    "id": mid,
                    "name": mc.get("name"),
                    "difficulty": mc.get("difficulty"),
                    "ok": mc.get("difficulty") == expected,
                }
            )

    updated = []
    missing = []
    demoted_to_impossible = []
    conflicts = []

    for cid, batch_char in batch_by_id.items():
        if cid not in by_id:
            missing.append(cid)
            continue
        idx = by_id[cid]
        old = cine["characters"][idx]
        old_diff = old.get("difficulty")
        new_char = dict(batch_char)
        new_diff = new_char.get("difficulty")

        if old_diff == "Moyen" and new_diff == "Impossible":
            demoted_to_impossible.append(
                {
                    "id": cid,
                    "name": new_char.get("name"),
                    "from": old_diff,
                    "to": new_diff,
                }
            )

        # Flag if a known-keep-Moyen id got demoted in files (should not happen after relaunch)
        name_l = (new_char.get("name") or "").lower()
        if new_diff == "Impossible" and (
            cid in MUST_STAY_MOYEN
            or "haut évolutionnaire" in name_l
            or "haut evolutionnaire" in name_l
            or "high evolutionary" in name_l
            or ("maybelle" in name_l and "webb" in cid.lower())
            or ("peter wisdom" in name_l)
        ):
            conflicts.append(
                {
                    "id": cid,
                    "name": new_char.get("name"),
                    "issue": "expected_Moyen_but_Impossible_in_batch",
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

    moyen_after = sum(1 for c in cine["characters"] if c.get("difficulty") == "Moyen")
    dist_after = Counter(c.get("difficulty") for c in cine["characters"])

    # Write cineverse
    out_cine = DATA / "marvel-cineverse.json"
    out_cine.write_text(
        json.dumps(cine, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    # Verify aliases0 match
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
        "moyen_before": moyen_before,
        "moyen_after": moyen_after,
        "difficulty_distribution_before": dict(sorted(dist_before.items(), key=lambda x: (x[0] is None, x[0] or ""))),
        "difficulty_distribution_after": dict(sorted(dist_after.items(), key=lambda x: (x[0] is None, x[0] or ""))),
        "difficulty_snapshot": {
            k: dist_after.get(k, 0)
            for k in ["Très Facile", "Facile", "Moyen", "Difficile", "Impossible"]
        },
        "relaunch_preserve_checks": relaunch_checks,
        "conflicts": conflicts,
        "formerly_remaining": formerly_hits,
        "formerly_remaining_count": len(formerly_hits),
        "sample_fr_nicknames": sample_fr_nicknames(updated_chars, 30),
        "spot_check_wrong_aliases": spot_issues,
        "qa_notes": {
            "source": "re-read all batches 1-14 from disk after relaunch rewrite of 3-6 and 8-13",
            "preserve": [
                "Haut Évolutionnaire → Moyen",
                "Tante May Webb (Maybelle) → Moyen",
                "Peter Wisdom → Moyen",
            ],
            "empty_aliases": [
                {"id": c["id"], "name": c.get("name")}
                for c in updated_chars
                if not (c.get("aliases") or [])
            ],
        },
        "verify": {
            "all_batch_ids_in_cineverse": len(missing) == 0,
            "aliases0_and_difficulty_match": len(verify_fail) == 0,
            "verify_fail": verify_fail,
        },
    }

    report_path = DATA / "marvel-moyen-review-merge-report.json"
    report_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    print("updated:", len(updated))
    print("missing:", missing)
    print("demoted:", len(demoted_to_impossible))
    for d in demoted_to_impossible:
        print("  DEM:", d["id"], d["name"])
    print("moyen:", moyen_before, "->", moyen_after)
    print("dist_after:", dict(dist_after))
    print("formerly:", len(formerly_hits))
    print("conflicts:", conflicts)
    print("relaunch_checks:")
    for r in relaunch_checks:
        print(" ", r)
    print("verify_fail:", verify_fail)
    print("wrote:", out_cine)
    print("wrote:", report_path)


if __name__ == "__main__":
    main()
