"""league.json -> records.json + meta.json (all derived stats)."""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone

import yaml

from config import ADJUSTMENTS_FILE, DATA_DIR
from stats.careers import build_careers
from stats.common import PLAYOFF_TYPES, team_games
from stats.draft_tendencies import build_draft_tendencies
from stats.facts import build_facts, positive_pool
from stats.h2h import build_h2h
from stats.rankings import build_goat, build_luck, build_team_seasons
from stats.records import build_records


def build_trophies(seasons: list[dict], owners: list[dict]) -> list[dict]:
    names = {o["key"]: o["name"] for o in owners}
    out = []
    for s in seasons:
        h = s["honors"]

        def side(k):
            if not k:
                return None
            t = next((t for t in s["teams"] if t["ownerKey"] == k), None)
            return {"ownerKey": k, "name": names.get(k, k), "teamName": t["name"] if t else "", "logo": t.get("logo") if t else None,
                    "record": (f"{t['wins']}-{t['losses']}" + (f"-{t['ties']}" if t["ties"] else "")) if t else "",
                    "pointsFor": t["pointsFor"] if t else None, "seed": t.get("seed") if t else None}

        finals = [m for m in s["matchups"] if m["type"] in PLAYOFF_TYPES and m["decided"]]
        title_game = None
        if finals and h.get("champion"):
            last_week = max(m["week"] for m in finals)
            for m in finals:
                if m["week"] == last_week and h["champion"] in (m["home"]["ownerKey"], m["away"]["ownerKey"]):
                    ws = m["home"]["score"] if m["home"]["ownerKey"] == h["champion"] else m["away"]["score"]
                    ls = m["away"]["score"] if m["home"]["ownerKey"] == h["champion"] else m["home"]["score"]
                    title_game = {"matchupId": m["id"], "week": m["week"], "winnerScore": ws, "loserScore": ls}
        run = []
        if h.get("champion"):
            for g in sorted(team_games(s), key=lambda g: g["week"]):
                if g["isPlayoff"] and g["ownerKey"] == h["champion"]:
                    run.append({"week": g["week"], "oppKey": g["oppKey"], "oppName": names.get(g["oppKey"], g["oppKey"]),
                                "score": g["score"], "oppScore": g["oppScore"], "matchupId": g["matchupId"]})
        out.append({
            "year": s["year"], "isComplete": s["isComplete"],
            "champion": side(h.get("champion")), "runnerUp": side(h.get("runnerUp")), "third": side(h.get("third")),
            "lastPlace": side(h.get("lastPlace")), "regSeasonChamp": side(h.get("regSeasonChamp")), "topScorer": side(h.get("topScorer")),
            "titleGame": title_game, "playoffRun": run, "roster": s.get("championRoster"), "rosterSource": s.get("championRosterSource"),
            "coverageTier": s["coverage"]["tier"], "teamCount": len(s["teams"]),
        })
    return out


def filter_facts(facts: list[dict], owners: list[dict], adjustments: dict) -> list[dict]:
    """Drop facts about hidden owners (by key or by name mention), then add hand-written ones."""
    hidden = set(adjustments.get("hide_facts_for") or [])
    names = [o["name"] for o in owners if o["key"] in hidden]
    pattern = re.compile(r"\b(" + "|".join(re.escape(n) for n in names) + r")\b") if names else None
    out = []
    for f in facts:
        if f.get("ownerKey") in hidden:
            continue
        if pattern and pattern.search(f["text"]):
            continue
        out.append(f)
    for cf in adjustments.get("custom_facts") or []:
        if cf.get("id") and cf.get("text"):
            out.append({"id": cf["id"], "category": cf.get("category", "league"), "text": cf["text"], "tone": cf.get("tone", "positive"),
                        **({"ownerKey": cf["ownerKey"]} if cf.get("ownerKey") else {}),
                        **({"year": cf["year"]} if cf.get("year") else {}),
                        **({"href": cf["href"]} if cf.get("href") else {})})
    return out


def ensure_positive(facts: list[dict], pool: dict[str, list[dict]], hidden: set, minimum: int = 2) -> list[dict]:
    """Guarantee every owner who has played has at least `minimum` positive facts."""
    have = {f["id"] for f in facts}
    out = list(facts)
    for k, candidates in pool.items():
        if k in hidden:
            continue
        count = sum(1 for f in out if f.get("ownerKey") == k and f.get("tone") == "positive")
        for cand in candidates:
            if count >= minimum:
                break
            if cand["id"] in have:
                continue
            out.append(cand)
            have.add(cand["id"])
            count += 1
    return out


def main():
    league = json.loads((DATA_DIR / "league.json").read_text())
    owners = json.loads((DATA_DIR / "owners.json").read_text())["owners"]
    coverage = json.loads((DATA_DIR / "coverage.json").read_text())
    seasons = league["seasons"]

    adjustments = yaml.safe_load(ADJUSTMENTS_FILE.read_text()) if ADJUSTMENTS_FILE.exists() else {}
    adjustments = adjustments or {}

    careers = build_careers(seasons, owners)
    luck_rows = build_luck(seasons)
    records = build_records(seasons, careers, luck_rows)
    h2h = build_h2h(seasons, owners)
    team_seasons = build_team_seasons(seasons)
    goat = build_goat(careers, adjustments.get("goat_overrides"))
    draft = build_draft_tendencies(seasons, owners)
    facts = build_facts(seasons, owners, careers, records, h2h, team_seasons, luck_rows) + draft["facts"]
    facts = filter_facts(facts, owners, adjustments)
    facts = ensure_positive(facts, positive_pool(seasons, owners, careers, h2h, team_seasons, draft["greatest"]),
                            set(adjustments.get("hide_facts_for") or []), minimum=2)
    trophies = build_trophies(seasons, owners)

    # titles, then fewer finals losses, then earlier first title
    podium = sorted([{"ownerKey": c["ownerKey"], "titles": c["titles"], "runnerUps": c["runnerUps"], "thirds": c["thirds"], "lastPlaces": c["lastPlaces"]}
                     for c in careers if c["titles"] or c["runnerUps"]],
                    key=lambda p: (-len(p["titles"]), len(p["runnerUps"]), min(p["titles"]) if p["titles"] else 9999))

    records_out = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "trophies": trophies, "podium": podium, "careers": careers, "records": records,
        "h2h": h2h, "teamSeasons": team_seasons, "goat": goat, "luck": luck_rows,
        "draft": draft, "funFacts": facts,
    }
    (DATA_DIR / "records.json").write_text(json.dumps(records_out, separators=(",", ":")))

    warnings = []
    for s in seasons:
        for w in s.get("warnings", []):
            warnings.append({"year": s["year"], "message": w})
    current = max(seasons, key=lambda s: s["year"])
    meta = {
        "leagueName": league["leagueName"],
        "lastSynced": max((json.loads(p.read_text()).get("fetchedAt", "") for p in (DATA_DIR / "raw").glob("*.json")), default=datetime.now(timezone.utc).isoformat()),
        "generatedAt": records_out["generatedAt"],
        "seasons": [s["year"] for s in seasons],
        "firstSeason": seasons[0]["year"], "currentSeason": current["year"],
        "currentSeasonComplete": current["isComplete"], "currentWeek": current.get("currentWeek"),
        "isSample": all(s.get("source") == "sample" for s in seasons),
        "coverage": {y: c["tier"] for y, c in coverage.items()},
        "screenshotsNeeded": {y: c["screenshotsNeeded"] for y, c in coverage.items() if c["screenshotsNeeded"]},
        "warnings": warnings,
        "counts": {"owners": len(owners), "games": sum(1 for s in seasons for m in s["matchups"] if m["decided"]),
                   "facts": len(facts), "records": len(records)},
    }
    (DATA_DIR / "meta.json").write_text(json.dumps(meta, indent=1))
    print(f"records.json: {len(records)} records, {len(facts)} fun facts, {len(team_seasons)} team-seasons, "
          f"{len(draft['profiles'])} draft profiles; meta.json written (sample={meta['isSample']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
