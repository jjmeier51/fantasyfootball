"""Per-owner career totals, finishes, streaks, all-play and luck."""
from __future__ import annotations

from collections import defaultdict

from .common import PLAYOFF_TYPES, made_playoffs, team_games, week_scores, zscores


def season_luck(season: dict) -> dict[str, dict]:
    """All-play record + expected wins per owner for the regular season."""
    out: dict[str, dict] = defaultdict(lambda: {"allPlayWins": 0, "allPlayLosses": 0, "allPlayTies": 0, "expectedWins": 0.0, "weeksTop": 0, "weeksBottom": 0})
    reg = season["regSeasonWeeks"]
    for week, rows in week_scores(season).items():
        if week > reg or len(rows) < 2:
            continue
        n = len(rows)
        top = max(s for _, s in rows)
        bottom = min(s for _, s in rows)
        for k, s in rows:
            w = sum(1 for _, o in rows if o < s)
            l = sum(1 for _, o in rows if o > s)
            t = n - 1 - w - l
            d = out[k]
            d["allPlayWins"] += w
            d["allPlayLosses"] += l
            d["allPlayTies"] += t
            d["expectedWins"] += (w + 0.5 * t) / (n - 1)
            d["weeksTop"] += s == top
            d["weeksBottom"] += s == bottom
    return out


def build_careers(seasons: list[dict], owners: list[dict]) -> list[dict]:
    keys = [o["key"] for o in owners]
    by_key = {o["key"]: o for o in owners}
    car: dict[str, dict] = {k: {
        "ownerKey": k, "name": by_key[k]["name"], "seasons": 0, "wins": 0, "losses": 0, "ties": 0,
        "pointsFor": 0.0, "pointsAgainst": 0.0, "gamesPlayed": 0,
        "titles": [], "runnerUps": [], "thirds": [], "lastPlaces": [], "regSeasonTitles": [], "topScorerSeasons": [],
        "playoffApps": [], "playoffWins": 0, "playoffLosses": 0, "finalsApps": [],
        "finishes": [], "bestFinish": None, "worstFinish": None,
        "allPlayWins": 0, "allPlayLosses": 0, "expectedWins": 0.0, "luck": 0.0, "weeksTop": 0, "weeksBottom": 0,
        "highWeek": None, "lowWeek": None, "biggestWin": None, "worstLoss": None,
        "longestWinStreak": None, "longestLossStreak": None, "currentStreak": None,
        "pfZAvg": 0.0, "coverageSeasons": [], "activeSeasons": [],
    } for k in keys}

    # chronological games for streaks
    games_by_owner: dict[str, list[dict]] = defaultdict(list)
    z_by_owner: dict[str, list[float]] = defaultdict(list)

    for s in seasons:
        luck = season_luck(s)
        played = [t for t in s["teams"] if (t["wins"] + t["losses"] + t["ties"]) > 0 or t.get("finalRank")]
        pf_vals = [t["pointsFor"] for t in played if t["pointsFor"] > 0]
        zmap = {}
        if len(pf_vals) >= 2:
            zs = zscores(pf_vals)
            zmap = {t["ownerKey"]: z for t, z in zip([t for t in played if t["pointsFor"] > 0], zs)}
        for t in played:
            k = t["ownerKey"]
            if k not in car:
                continue
            c = car[k]
            c["seasons"] += 1
            c["activeSeasons"].append(s["year"])
            c["wins"] += t["wins"]
            c["losses"] += t["losses"]
            c["ties"] += t["ties"]
            c["pointsFor"] += t["pointsFor"]
            c["pointsAgainst"] += t["pointsAgainst"]
            c["gamesPlayed"] += t["wins"] + t["losses"] + t["ties"]
            if k in zmap:
                z_by_owner[k].append(zmap[k])
            h = s["honors"]
            if h.get("champion") == k:
                c["titles"].append(s["year"])
            if h.get("runnerUp") == k:
                c["runnerUps"].append(s["year"])
            if h.get("third") == k:
                c["thirds"].append(s["year"])
            if h.get("lastPlace") == k:
                c["lastPlaces"].append(s["year"])
            if h.get("regSeasonChamp") == k:
                c["regSeasonTitles"].append(s["year"])
            if h.get("topScorer") == k:
                c["topScorerSeasons"].append(s["year"])
            if h.get("champion") == k or h.get("runnerUp") == k:
                c["finalsApps"].append(s["year"])
            mp = made_playoffs(s, t)
            if mp:
                c["playoffApps"].append(s["year"])
            lk = luck.get(k)
            if lk:
                c["allPlayWins"] += lk["allPlayWins"]
                c["allPlayLosses"] += lk["allPlayLosses"]
                c["expectedWins"] += lk["expectedWins"]
                c["weeksTop"] += lk["weeksTop"]
                c["weeksBottom"] += lk["weeksBottom"]
            c["finishes"].append({
                "year": s["year"], "rank": t.get("finalRank") or None, "seed": t.get("seed") or None,
                "wins": t["wins"], "losses": t["losses"], "ties": t["ties"],
                "pointsFor": t["pointsFor"], "pointsAgainst": t["pointsAgainst"], "teamName": t["name"],
                "logo": t.get("logo"), "madePlayoffs": mp, "isComplete": s["isComplete"],
                "expectedWins": round(lk["expectedWins"], 2) if lk else None,
                "pfZ": round(zmap.get(k, 0.0), 2) if k in zmap else None,
                "champion": h.get("champion") == k,
            })
        for g in team_games(s, include_multiweek=True):
            k = g["ownerKey"]
            if k not in car:
                continue
            c = car[k]
            games_by_owner[k].append(g)
            if g["isPlayoff"]:
                if g["won"] is True:
                    c["playoffWins"] += 1
                elif g["won"] is False:
                    c["playoffLosses"] += 1
            if g["multiWeek"]:
                continue  # two-week totals don't compete with single-week scores
            entry = {"value": g["score"], "year": g["year"], "week": g["week"], "oppKey": g["oppKey"],
                     "matchupId": g["matchupId"], "won": g["won"], "oppScore": g["oppScore"]}
            if c["highWeek"] is None or g["score"] > c["highWeek"]["value"]:
                c["highWeek"] = entry
            if c["lowWeek"] is None or g["score"] < c["lowWeek"]["value"]:
                c["lowWeek"] = entry
            m_entry = dict(entry, value=g["margin"])
            if g["margin"] > 0 and (c["biggestWin"] is None or g["margin"] > c["biggestWin"]["value"]):
                c["biggestWin"] = m_entry
            if g["margin"] < 0 and (c["worstLoss"] is None or g["margin"] < c["worstLoss"]["value"]):
                c["worstLoss"] = m_entry

    for k, c in car.items():
        gp = c["gamesPlayed"]
        c["winPct"] = round((c["wins"] + 0.5 * c["ties"]) / gp, 4) if gp else 0.0
        c["ppg"] = round(c["pointsFor"] / gp, 2) if gp else 0.0
        c["papg"] = round(c["pointsAgainst"] / gp, 2) if gp else 0.0
        c["pointsFor"] = round(c["pointsFor"], 2)
        c["pointsAgainst"] = round(c["pointsAgainst"], 2)
        c["expectedWins"] = round(c["expectedWins"], 2)
        c["luck"] = round(c["wins"] - c["expectedWins"], 2)
        ranks = [f["rank"] for f in c["finishes"] if f["rank"]]
        c["bestFinish"] = min(ranks) if ranks else None
        c["worstFinish"] = max(ranks) if ranks else None
        c["avgFinish"] = round(sum(ranks) / len(ranks), 2) if ranks else None
        c["pfZAvg"] = round(sum(z_by_owner[k]) / len(z_by_owner[k]), 3) if z_by_owner[k] else 0.0
        c["playoffRecord"] = f"{c['playoffWins']}-{c['playoffLosses']}"
        c["coverageSeasons"] = sorted(c["activeSeasons"])
        # streaks (chronological, regular season + playoffs)
        games = sorted(games_by_owner[k], key=lambda g: (g["year"], g["week"]))
        best_w = best_l = None
        cur_type, cur_len, cur_start = None, 0, None
        for g in games:
            t = "W" if g["won"] else ("L" if g["won"] is False else "T")
            if t == cur_type:
                cur_len += 1
            else:
                cur_type, cur_len, cur_start = t, 1, (g["year"], g["week"])
            end = (g["year"], g["week"])
            rec = {"length": cur_len, "start": {"year": cur_start[0], "week": cur_start[1]}, "end": {"year": end[0], "week": end[1]}}
            if t == "W" and (best_w is None or cur_len > best_w["length"]):
                best_w = dict(rec)
            if t == "L" and (best_l is None or cur_len > best_l["length"]):
                best_l = dict(rec)
        c["longestWinStreak"] = best_w
        c["longestLossStreak"] = best_l
        c["currentStreak"] = {"type": cur_type, "length": cur_len} if cur_type else None
        del c["activeSeasons"]
    return sorted(car.values(), key=lambda c: (-len(c["titles"]), -c["winPct"], -c["wins"]))
