"""Best team-seasons of all time, owner GOAT composite, and luck tables."""
from __future__ import annotations

from .careers import season_luck
from .common import made_playoffs, zscores


def build_team_seasons(seasons: list[dict]) -> list[dict]:
    rows = []
    for s in seasons:
        if not s["isComplete"]:
            continue
        played = [t for t in s["teams"] if (t["wins"] + t["losses"] + t["ties"]) > 0 and t["pointsFor"] > 0]
        if len(played) < 2:
            continue
        zs = zscores([t["pointsFor"] for t in played])
        h = s["honors"]
        for t, z in zip(played, zs):
            gp = t["wins"] + t["losses"] + t["ties"]
            win_pct = (t["wins"] + 0.5 * t["ties"]) / gp
            k = t["ownerKey"]
            result = "champion" if h.get("champion") == k else "runnerUp" if h.get("runnerUp") == k else \
                "third" if h.get("third") == k else ("playoffs" if made_playoffs(s, t) else "missed")
            bonus = {"champion": 25, "runnerUp": 12, "third": 6, "playoffs": 3, "missed": 0}[result]
            score = 50 * win_pct + 15 * z + bonus
            rows.append({
                "ownerKey": k, "year": s["year"], "teamName": t["name"], "logo": t.get("logo"),
                "wins": t["wins"], "losses": t["losses"], "ties": t["ties"], "winPct": round(win_pct, 3),
                "pointsFor": t["pointsFor"], "pfZ": round(z, 2), "finalRank": t.get("finalRank"),
                "result": result, "score": round(score, 1),
                "components": {"winPct": round(50 * win_pct, 1), "scoring": round(15 * z, 1), "playoffs": bonus},
            })
    rows.sort(key=lambda r: -r["score"])
    for i, r in enumerate(rows, start=1):
        r["rank"] = i
    return rows


def build_goat(careers: list[dict]) -> list[dict]:
    out = []
    for c in careers:
        if c["seasons"] == 0:
            continue
        comp = {
            "titles": 10 * len(c["titles"]),
            "finals": 4 * len(c["runnerUps"]),
            "playoffs": 2 * len(c["playoffApps"]),
            "regSeasonTitles": 3 * len(c["regSeasonTitles"]),
            "winPct": round(30 * c["winPct"], 1),
            "scoring": round(5 * c["pfZAvg"], 1),
            "sackos": -3 * len(c["lastPlaces"]),
        }
        out.append({"ownerKey": c["ownerKey"], "score": round(sum(comp.values()), 1), "components": comp,
                    "seasons": c["seasons"]})
    out.sort(key=lambda r: -r["score"])
    for i, r in enumerate(out, start=1):
        r["rank"] = i
    return out


def build_luck(seasons: list[dict]) -> list[dict]:
    rows = []
    for s in seasons:
        if not s["completedWeeks"]:
            continue
        luck = season_luck(s)
        for t in s["teams"]:
            lk = luck.get(t["ownerKey"])
            if not lk or (t["wins"] + t["losses"] + t["ties"]) == 0:
                continue
            rows.append({"ownerKey": t["ownerKey"], "year": s["year"], "teamName": t["name"], "logo": t.get("logo"),
                         "wins": t["wins"], "losses": t["losses"], "expectedWins": round(lk["expectedWins"], 2),
                         "luck": round(t["wins"] - lk["expectedWins"], 2), "allPlay": f"{lk['allPlayWins']}-{lk['allPlayLosses']}",
                         "isComplete": s["isComplete"], "finalRank": t.get("finalRank")})
    return rows
