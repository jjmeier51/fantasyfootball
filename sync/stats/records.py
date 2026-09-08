"""The all-time records book."""
from __future__ import annotations

from config import RECORD_MIN_YEAR
from .common import PLAYOFF_TYPES, team_games, team_name, logo, week_scores


def _entry(season: dict, g: dict, value) -> dict:
    return {
        "ownerKey": g["ownerKey"], "value": value, "year": g["year"], "week": g["week"],
        "oppKey": g["oppKey"], "matchupId": g["matchupId"], "teamName": team_name(season, g["ownerKey"]),
        "logo": logo(season, g["ownerKey"]), "score": g["score"], "oppScore": g["oppScore"],
        "isPlayoff": g["isPlayoff"], "won": g["won"],
    }


def _rec(rid, category, title, unit, better, entries, description="", limit=10):
    rev = better == "high"
    entries = sorted(entries, key=lambda e: e["value"], reverse=rev)[:limit]
    return {"id": rid, "category": category, "title": title, "unit": unit, "better": better,
            "description": description, "entries": entries}


def build_records(seasons: list[dict], careers: list[dict], luck_rows: list[dict]) -> list[dict]:
    recs = []
    games = []
    since = f"({RECORD_MIN_YEAR} onward; two-week playoff matchups excluded)"
    for s in seasons:
        if s["year"] < RECORD_MIN_YEAR:
            continue  # single-game records only count the modern scoring era
        for g in team_games(s):
            games.append((s, g))
    decided = [(s, g) for s, g in games if g["won"] is not None]

    # ---- single game
    recs.append(_rec("high-score", "singleGame", "Highest Single-Week Score", "pts", "high",
                     [_entry(s, g, g["score"]) for s, g in games], f"Most points by one team in a single week {since}."))
    recs.append(_rec("low-score", "singleGame", "Lowest Single-Week Score", "pts", "low",
                     [_entry(s, g, g["score"]) for s, g in games if g["score"] > 0], f"The weeks nobody wants to remember {since}."))
    recs.append(_rec("blowout", "singleGame", "Biggest Blowout", "margin", "high",
                     [_entry(s, g, g["margin"]) for s, g in decided if g["margin"] > 0], f"Largest margin of victory {since}."))
    # ties count as the closest possible game, but only when the scores carry decimals
    # (whole-number ties from the old scoring era were far too common to be interesting)
    seen_ties = set()
    tie_entries = []
    for s, g in games:
        if g["won"] is None and g["score"] != int(g["score"]) and g["matchupId"] not in seen_ties:
            seen_ties.add(g["matchupId"])
            tie_entries.append(_entry(s, g, 0.0))
    recs.append(_rec("closest", "singleGame", "Closest Game", "margin", "low",
                     [_entry(s, g, abs(g["margin"])) for s, g in decided if g["margin"] > 0] + tie_entries,
                     f"Decided by the thinnest margins, including ties with decimal scores {since}."))
    recs.append(_rec("shootout", "singleGame", "Highest-Scoring Game", "combined", "high",
                     [_entry(s, g, round(g["score"] + g["oppScore"], 2)) for s, g in decided if g["margin"] > 0], f"Combined points, both teams {since}."))
    recs.append(_rec("points-in-loss", "oddities", "Most Points in a Loss", "pts", "high",
                     [_entry(s, g, g["score"]) for s, g in decided if g["won"] is False], f"Great week, wrong opponent {since}."))
    recs.append(_rec("fewest-in-win", "oddities", "Fewest Points in a Win", "pts", "low",
                     [_entry(s, g, g["score"]) for s, g in decided if g["won"] and g["score"] > 0], f"Winning ugly {since}."))
    recs.append(_rec("playoff-high", "playoffs", "Highest Playoff Score", "pts", "high",
                     [_entry(s, g, g["score"]) for s, g in games if g["isPlayoff"]], since))
    finals = []
    for s in seasons:
        if s["year"] < RECORD_MIN_YEAR:
            continue
        fw = [m["week"] for m in s["matchups"] if m["type"] in PLAYOFF_TYPES and m["decided"]]
        if not fw:
            continue
        last = max(fw)
        for g in team_games(s):
            if g["isPlayoff"] and g["week"] == last and s["honors"].get("champion") in (g["ownerKey"], g["oppKey"]):
                finals.append((s, g))
    recs.append(_rec("title-game-high", "playoffs", "Highest Championship-Game Score", "pts", "high",
                     [_entry(s, g, g["score"]) for s, g in finals], since))
    recs.append(_rec("title-game-closest", "playoffs", "Closest Championship Game", "margin", "low",
                     [_entry(s, g, abs(g["margin"])) for s, g in finals if g["won"]], since))
    recs.append(_rec("title-game-blowout", "playoffs", "Most Lopsided Championship Game", "margin", "high",
                     [_entry(s, g, g["margin"]) for s, g in finals if g["won"]], since))

    # ---- season
    tseasons = []
    for s in seasons:
        for t in s["teams"]:
            gp = t["wins"] + t["losses"] + t["ties"]
            if gp == 0:
                continue
            tseasons.append((s, t, gp))
    complete = [(s, t, gp) for s, t, gp in tseasons if s["isComplete"]]

    def tentry(s, t, value):
        return {"ownerKey": t["ownerKey"], "value": value, "year": s["year"], "teamName": t["name"], "logo": t.get("logo"),
                "record": f"{t['wins']}-{t['losses']}" + (f"-{t['ties']}" if t["ties"] else ""),
                "pointsFor": t["pointsFor"], "finalRank": t.get("finalRank"), "champion": s["honors"].get("champion") == t["ownerKey"]}

    recs.append(_rec("season-pf", "season", "Most Points in a Season", "pts", "high", [tentry(s, t, t["pointsFor"]) for s, t, _ in complete]))
    recs.append(_rec("season-pf-low", "season", "Fewest Points in a Season", "pts", "low", [tentry(s, t, t["pointsFor"]) for s, t, _ in complete if t["pointsFor"] > 0]))
    recs.append(_rec("season-ppg", "season", "Highest Points Per Game (Season)", "ppg", "high", [tentry(s, t, round(t["pointsFor"] / gp, 2)) for s, t, gp in complete if t["pointsFor"] > 0]))
    recs.append(_rec("season-pa", "season", "Most Points Against in a Season", "pts", "high", [tentry(s, t, t["pointsAgainst"]) for s, t, _ in complete if t["pointsAgainst"] > 0]))
    recs.append(_rec("season-best-record", "season", "Best Regular-Season Record", "win%", "high",
                     [tentry(s, t, round((t["wins"] + 0.5 * t["ties"]) / gp, 3)) for s, t, gp in complete]))
    recs.append(_rec("season-worst-record", "season", "Worst Regular-Season Record", "win%", "low",
                     [tentry(s, t, round((t["wins"] + 0.5 * t["ties"]) / gp, 3)) for s, t, gp in complete]))
    recs.append(_rec("champ-worst-record", "oddities", "Champion With the Worst Regular Season", "win%", "low",
                     [tentry(s, t, round((t["wins"] + 0.5 * t["ties"]) / gp, 3)) for s, t, gp in complete if s["honors"].get("champion") == t["ownerKey"]],
                     "Got hot at the right time."))
    recs.append(_rec("lowest-seed-champ", "playoffs", "Lowest Seed to Win It All", "seed", "high",
                     [tentry(s, t, t["seed"]) for s, t, gp in complete if s["honors"].get("champion") == t["ownerKey"] and t.get("seed")]))
    recs.append(_rec("best-record-no-title", "oddities", "Best Record Without a Title", "win%", "high",
                     [tentry(s, t, round((t["wins"] + 0.5 * t["ties"]) / gp, 3)) for s, t, gp in complete if s["honors"].get("champion") != t["ownerKey"]],
                     "Regular-season juggernauts that came up short."))
    # weeks as top scorer within a season
    tops = []
    for s in seasons:
        counts = {}
        for wk, rows in week_scores(s).items():
            if wk > s["regSeasonWeeks"]:
                continue
            best = max(rows, key=lambda r: r[1])
            counts[best[0]] = counts.get(best[0], 0) + 1
        for k, n in counts.items():
            t = next((t for t in s["teams"] if t["ownerKey"] == k), None)
            if t:
                tops.append(tentry(s, t, n))
    recs.append(_rec("weeks-top-scorer", "season", "Most Weeks as League Top Scorer (Season)", "weeks", "high", tops))
    if luck_rows:
        recs.append(_rec("luckiest", "oddities", "Luckiest Season", "wins above expected", "high",
                         [dict(r, value=r["luck"]) for r in luck_rows], "Actual wins minus all-play expected wins."))
        recs.append(_rec("unluckiest", "oddities", "Unluckiest Season", "wins below expected", "low",
                         [dict(r, value=r["luck"]) for r in luck_rows], "Scored plenty, faced the wrong opponent every week."))

    # ---- career
    def centry(c, value):
        return {"ownerKey": c["ownerKey"], "value": value, "seasons": c["seasons"], "record": f"{c['wins']}-{c['losses']}" + (f"-{c['ties']}" if c["ties"] else "")}

    recs.append(_rec("career-titles", "career", "Most Championships", "titles", "high", [centry(c, len(c["titles"])) for c in careers if c["titles"]]))
    recs.append(_rec("career-wins", "career", "Most Career Wins", "wins", "high", [centry(c, c["wins"]) for c in careers]))
    recs.append(_rec("career-winpct", "career", "Best Career Win Percentage", "win%", "high", [centry(c, c["winPct"]) for c in careers if c["gamesPlayed"] >= 20]))
    recs.append(_rec("career-pf", "career", "Most Career Points", "pts", "high", [centry(c, c["pointsFor"]) for c in careers]))
    recs.append(_rec("career-ppg", "career", "Highest Career Points Per Game", "ppg", "high", [centry(c, c["ppg"]) for c in careers if c["gamesPlayed"] >= 20]))
    recs.append(_rec("career-playoff-wins", "career", "Most Playoff Wins", "wins", "high", [centry(c, c["playoffWins"]) for c in careers if c["playoffWins"]]))
    recs.append(_rec("career-playoff-apps", "career", "Most Playoff Appearances", "apps", "high", [centry(c, len(c["playoffApps"])) for c in careers if c["playoffApps"]]))
    recs.append(_rec("career-finals", "career", "Most Championship-Game Appearances", "apps", "high", [centry(c, len(c["finalsApps"])) for c in careers if c["finalsApps"]]))
    recs.append(_rec("career-last", "oddities", "Most Last-Place Finishes", "sackos", "high", [centry(c, len(c["lastPlaces"])) for c in careers if c["lastPlaces"]]))
    recs.append(_rec("career-luck", "oddities", "Luckiest Career", "wins above expected", "high", [centry(c, c["luck"]) for c in careers if c["gamesPlayed"]]))

    # ---- streaks
    def sentry(c, st):
        return {"ownerKey": c["ownerKey"], "value": st["length"], "year": st["start"]["year"], "week": st["start"]["week"],
                "endYear": st["end"]["year"], "endWeek": st["end"]["week"]}
    recs.append(_rec("win-streak", "streaks", "Longest Winning Streak", "games", "high", [sentry(c, c["longestWinStreak"]) for c in careers if c["longestWinStreak"]]))
    recs.append(_rec("loss-streak", "streaks", "Longest Losing Streak", "games", "high", [sentry(c, c["longestLossStreak"]) for c in careers if c["longestLossStreak"]]))
    # consecutive playoff appearances
    po = []
    for c in careers:
        yrs = sorted(c["playoffApps"])
        best, cur, start, bstart = 0, 0, None, None
        prev = None
        for y in yrs:
            if prev is not None and y == prev + 1:
                cur += 1
            else:
                cur, start = 1, y
            if cur > best:
                best, bstart = cur, start
            prev = y
        if best:
            po.append({"ownerKey": c["ownerKey"], "value": best, "year": bstart, "endYear": bstart + best - 1})
    recs.append(_rec("playoff-streak", "streaks", "Most Consecutive Playoff Appearances", "seasons", "high", po))
    return [r for r in recs if r["entries"]]
