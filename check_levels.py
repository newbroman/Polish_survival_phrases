#!/usr/bin/env python3
"""Validate the phrase level files and regenerate levels.json.

Run from the repo root before committing level changes:

    python3 check_levels.py            # validate + rewrite levels.json
    python3 check_levels.py --check    # validate only; fail if levels.json is stale

Errors (exit code 1) are things that break the app or corrupt progress:
  - missing or duplicate phrase ids, ids not of the form "<level>-NN"
  - a phrase's "level" field not matching its file
  - gender "both" with no "/" (only the masculine form would be taught)
  - the same Polish phrase twice in one level
  - missing pl / en text
Warnings are content gaps (no note, no emoji, thin level).
Cross-level duplicates are reported as information only: each level keeps
its own progress for them, so they are allowed.
"""
import glob
import json
import os
import re
import sys
from collections import defaultdict

ROOT = os.path.dirname(os.path.abspath(__file__))
INDEX = os.path.join(ROOT, "levels.json")
MIN_LEVEL_SIZE = 40
TIER_ORDER = ["FOUNDATION", "SURVIVAL", "PRACTICAL", "ADVANCED", "FLUENCY"]


# Whose gender picks the form of a two-form phrase. "speaker" (the default)
# is the only kind the app narrows to the learner's own form.
GENDER_OF = ("speaker", "listener", "group", "word")


def spaced(text):
    return re.sub(r"\s*/\s*", " / ", text or "").strip()


def pl_matches_variants(pl, m, f):
    """pl must read 'm / f' in full, or as the app's word-level shorthand
    ('Zgubiłem / Zgubiłam paszport'), and expand to exactly the two variants."""
    pl = spaced(pl)
    if pl == f"{m} / {f}":
        return True
    toks = pl.split()
    alts = [""]
    i = 0
    while i < len(toks):
        if i + 2 < len(toks) and toks[i + 1] == "/":
            alts = [(a + " " + w).strip() for a in alts for w in (toks[i], toks[i + 2])]
            i += 3
        else:
            alts = [(a + " " + toks[i]).strip() for a in alts]
            i += 1
    # punctuation is ignored, as the app ignores it when checking answers
    return sorted(norm(x) for x in alts) == sorted([norm(m), norm(f)])


def level_key(level_id):
    return tuple(int(x) for x in level_id.split("."))


def norm(text):
    return re.sub(r"[^\w ]", "", (text or "").lower()).strip()


def main():
    check_only = "--check" in sys.argv
    errors, warnings = [], []
    files = glob.glob(os.path.join(ROOT, "phrases_*.json"))
    levels = []
    for path in files:
        m = re.fullmatch(r"phrases_(\d+(?:\.\d+)?)\.json", os.path.basename(path))
        if not m:
            errors.append(f"{os.path.basename(path)}: filename is not phrases_<N>.json or phrases_<N>.<M>.json")
            continue
        levels.append((m.group(1), path))
    levels.sort(key=lambda x: level_key(x[0]))

    all_ids = {}
    pl_levels = defaultdict(set)
    index = []
    for lv, path in levels:
        name = os.path.basename(path)
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except ValueError as exc:
            errors.append(f"{name}: invalid JSON ({exc})")
            continue
        phrases = data.get("phrases") if isinstance(data, dict) else None
        if not isinstance(phrases, list):
            errors.append(f"{name}: no 'phrases' list")
            continue
        if str(data.get("level")) != lv:
            errors.append(f"{name}: top-level 'level' is {data.get('level')!r}, expected {lv}")
        if not data.get("description"):
            warnings.append(f"{name}: no description (menu title)")
        tier = data.get("tier")
        if tier not in TIER_ORDER:
            warnings.append(f"{name}: tier {tier!r} is not one of {TIER_ORDER}")
        if len(phrases) < MIN_LEVEL_SIZE:
            warnings.append(f"{name}: only {len(phrases)} phrases (most levels have ~75)")

        seen_pl = {}
        no_note = no_emoji = 0
        for i, p in enumerate(phrases):
            where = f"{name} #{i + 1}"
            pid = p.get("id")
            pl = p.get("pl")
            if not pl or not p.get("en"):
                errors.append(f"{where} ({pid}): missing pl or en")
            if not pid:
                errors.append(f"{where} ({pl}): missing id")
            else:
                if not re.fullmatch(re.escape(lv) + r"-\d{2,3}", pid):
                    errors.append(f"{where}: id {pid!r} should look like {lv}-01")
                if pid in all_ids:
                    errors.append(f"{where}: id {pid!r} already used in {all_ids[pid]}")
                all_ids[pid] = name
            if str(p.get("level")) != lv:
                errors.append(f"{where} ({pid}): level field {p.get('level')!r}, expected {lv}")
            if p.get("gender") == "both":
                v = p.get("variants") or {}
                if "/" not in (pl or ""):
                    errors.append(f"{where} ({pid}): gender 'both' but only one form: {pl!r}")
                if not v.get("m") or not v.get("f") or v.get("m") == v.get("f"):
                    errors.append(f"{where} ({pid}): gender 'both' needs distinct variants.m and variants.f")
                elif not pl_matches_variants(pl, v["m"], v["f"]):
                    errors.append(f"{where} ({pid}): pl {pl!r} does not match variants {v['m']!r} / {v['f']!r}")
                if p.get("genderOf", "speaker") not in GENDER_OF:
                    errors.append(f"{where} ({pid}): genderOf must be one of {GENDER_OF}")
            key = norm(pl)
            if key in seen_pl:
                errors.append(f"{where} ({pid}): {pl!r} duplicates {seen_pl[key]} in the same level")
            seen_pl[key] = pid
            pl_levels[key].add(lv)
            if lv != "0":
                no_note += not p.get("note")
                no_emoji += not p.get("emoji")
        if no_note:
            warnings.append(f"{name}: {no_note} phrase(s) without a note")
        if no_emoji:
            warnings.append(f"{name}: {no_emoji} phrase(s) without an emoji")
        index.append({
            "id": lv,
            "file": name,
            "title": data.get("description") or f"Level {lv}",
            "tier": tier,
            "count": len(phrases),
        })

    shared = {k: v for k, v in pl_levels.items() if len(v) > 1}

    new_index = json.dumps({"levels": index}, ensure_ascii=False, indent=2) + "\n"
    old_index = open(INDEX, encoding="utf-8").read() if os.path.exists(INDEX) else ""
    if new_index != old_index:
        if check_only:
            errors.append("levels.json is out of date: run python3 check_levels.py")
        else:
            with open(INDEX, "w", encoding="utf-8") as fh:
                fh.write(new_index)
            print("levels.json rewritten")

    for w in warnings:
        print("WARN ", w)
    for e in errors:
        print("ERROR", e)
    total = sum(item["count"] for item in index)
    print(f"\n{len(index)} levels, {total} phrases, {len(shared)} phrases shared across levels (info), "
          f"{len(warnings)} warning(s), {len(errors)} error(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
