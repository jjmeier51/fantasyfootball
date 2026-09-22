"""Weekly recap data for the current season: per-game box scores with starters, weekly
superlatives and awards, standings after each week, and a playoff predictor with a
week-over-week history."""
from __future__ import annotations

import math
import random
from collections import defaultdict

from .common import CONSOLATION_TYPES, PLAYOFF_TYPES

INJURED = {"OUT", "INJURY_RESERVE", "IR", "DOUBTFUL", "SUSPENSION"}
STARTING_SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "D/ST"]


def _team_entry(season: dict, week: int, team_id: int):
    for e in season.get("boxscores", {}).get(str(week), []):
        if e["teamId"] == team_id:
            return e
    return None


def _starters(entry):
    if not entry:
        return []
    return [p for p in entry["players"] if p.get("slot") and p["slot"] not in ("BE", "IR")]


def build_week_games(season: dict, week: int, names: dict, teams: dict) -> list[dict]:
    games = []
    for m in season["matchups"]:
        if m["week"] != week or not m["decided"] or m["type"] in CONSOLATION_TYPES:
            continue
        sides = {}
        for side in ("home", "away"):
            ms = m[side]
            t = teams.get(ms["ownerKey"], {})
            entry = _team_entry(season, week, ms["teamId"])
            starters = _starters(entry)
            top = max(starters, key=lambda p: p.get("points") or 0, default=None)
            sides[side] = {
                "ownerKey": ms["ownerKey"], "name": names.get(ms["ownerKey"], ms["ownerKey"]),
                "teamName": t.get("name", ""), "logo": t.get("logo"), "score": ms["score"],
                "projected": round(sum(p.get("projected") or 0 for p in starters), 2) if starters else None,
                "starters": [{"name": p["name"], "position": p.get("position", ""), "proTeam": p.get("proTeam", ""), "slot": p["slot"],
                              "points": p.get("points") or 0, "projected": p.get("projected"), "playerId": p.get("playerId")} for p in starters],
                "benchPoints": round(sum((p.get("points") or 0) for p in (entry["players"] if entry else []) if p.get("slot") in ("BE", "IR")), 2),
                "topPlayer": {"name": top["name"], "position": top.get("position", ""), "points": top.get("points") or 0, "playerId": top.get("playerId")} if top else None,
            }
        games.append({"matchupId": m["id"], "week": week, "type": m["type"], "isPlayoff": m["type"] in PLAYOFF_TYPES,
                      "home": sides["home"], "away": sides["away"], "winnerKey": m["winnerKey"],
                      "margin": round(abs(m["home"]["score"] - m["away"]["score"]), 2)})
    games.sort(key=lambda g: -max(g["home"]["score"], g["away"]["score"]))
    return games


def build_week_awards(games: list[dict]) -> dict:
    rows = []
    for g in games:
        for side in ("home", "away"):
            s = g[side]
            won = g["winnerKey"] == s["ownerKey"]
            for p in s["starters"]:
                rows.append(dict(p, ownerKey=s["ownerKey"], ownerName=s["name"], teamName=s["teamName"], won=won,
                                 surplus=round((p.get("points") or 0) - (p.get("projected") or 0), 2) if p.get("projected") is not None else None))
    if not rows:
        return {}
    non_qb = [r for r in rows if r["position"] not in ("QB", "K", "D/ST", "")]
    qbs = [r for r in rows if r["position"] == "QB"]
    duds = [r for r in rows if r.get("projected") and r["projected"] >= 8 and r["position"] not in ("K", "D/ST")]
    diff = [r for r in rows if r["won"] and r.get("surplus") is not None and r["position"] not in ("K", "D/ST")]
    pick = lambda pool, key: (max(pool, key=key) if pool else None)  # noqa: E731
    player = pick(non_qb, lambda r: r["points"])
    qb = pick(qbs, lambda r: r["points"])
    # spread the hardware around: the difference maker should be a different player from the
    # two top scorers whenever another winning-team starter beat his projection
    taken = {(r["name"], r["ownerKey"]) for r in (player, qb) if r}
    others = [r for r in diff if (r["name"], r["ownerKey"]) not in taken and r["surplus"] > 0]
    return {
        "playerOfWeek": player,
        "qbOfWeek": qb,
        "dud": pick(duds, lambda r: -(r["surplus"] if r["surplus"] is not None else -999)),
        "differenceMaker": pick(others or diff, lambda r: r["surplus"]),
    }


def build_superlatives(games: list[dict]) -> dict:
    if not games:
        return {}
    sides = [(g, g[s]) for g in games for s in ("home", "away")]
    hi = max(sides, key=lambda gs: gs[1]["score"])
    lo = min(sides, key=lambda gs: gs[1]["score"])
    blow = max(games, key=lambda g: g["margin"])
    close = min(games, key=lambda g: g["margin"])
    return {
        "highScore": {"ownerKey": hi[1]["ownerKey"], "score": hi[1]["score"], "matchupId": hi[0]["matchupId"]},
        "lowScore": {"ownerKey": lo[1]["ownerKey"], "score": lo[1]["score"], "matchupId": lo[0]["matchupId"]},
        "blowout": {"matchupId": blow["matchupId"], "margin": blow["margin"], "winnerKey": blow["winnerKey"]},
        "closest": {"matchupId": close["matchupId"], "margin": close["margin"], "winnerKey": close["winnerKey"]},
        "totalPoints": round(sum(s["score"] for _, s in sides), 2),
        "avgScore": round(sum(s["score"] for _, s in sides) / len(sides), 2),
    }


def build_standings(season: dict, through_week: int | None, names: dict) -> list[dict]:
    """Standings from decided regular-season games through a week. Tiebreaker: points for."""
    rows = {t["ownerKey"]: {"ownerKey": t["ownerKey"], "name": names.get(t["ownerKey"], t["ownerKey"]), "teamName": t["name"], "logo": t.get("logo"),
                            "wins": 0, "losses": 0, "ties": 0, "pointsFor": 0.0, "pointsAgainst": 0.0, "games": 0} for t in season["teams"]}
    for m in season["matchups"]:
        if not m["decided"] or m["type"] != "NONE" or (through_week and m["week"] > through_week):
            continue
        for me, opp in ((m["home"], m["away"]), (m["away"], m["home"])):
            r = rows.get(me["ownerKey"])
            if not r:
                continue
            r["games"] += 1
            r["pointsFor"] = round(r["pointsFor"] + me["score"], 2)
            r["pointsAgainst"] = round(r["pointsAgainst"] + opp["score"], 2)
            if m["winnerKey"] is None:
                r["ties"] += 1
            elif m["winnerKey"] == me["ownerKey"]:
                r["wins"] += 1
            else:
                r["losses"] += 1
    out = sorted(rows.values(), key=lambda r: (-(r["wins"] + 0.5 * r["ties"]), -r["pointsFor"]))
    for i, r in enumerate(out, start=1):
        r["rank"] = i
    return out


def _z(vals: dict) -> dict:
    xs = list(vals.values())
    if len(xs) < 2:
        return {k: 0.0 for k in vals}
    mu = sum(xs) / len(xs)
    sd = (sum((x - mu) ** 2 for x in xs) / len(xs)) ** 0.5 or 1.0
    return {k: (v - mu) / sd for k, v in vals.items()}


def lineup_value(team: dict) -> float:
    """Best-lineup season projection from ESPN's per-player projections, minus injured players."""
    pool = [p for p in team.get("roster", []) if (p.get("injuryStatus") or "").upper() not in INJURED]
    by_pos = defaultdict(list)
    for p in pool:
        by_pos[p.get("position", "")].append(p.get("projectedSeasonPoints") or 0)
    for v in by_pos.values():
        v.sort(reverse=True)
    total = 0.0
    used = defaultdict(int)
    for slot in STARTING_SLOTS:
        if slot == "FLEX":
            cands = [(pos, by_pos[pos][used[pos]]) for pos in ("RB", "WR", "TE") if len(by_pos[pos]) > used[pos]]
            if cands:
                pos, v = max(cands, key=lambda c: c[1])
                total += v
                used[pos] += 1
        elif len(by_pos[slot]) > used[slot]:
            total += by_pos[slot][used[slot]]
            used[slot] += 1
    return round(total, 1)


def build_predictor(season: dict, careers: dict, names: dict, through_week: int, prior: dict | None, seed: int = 7) -> dict:
    """Project final regular-season standings from strength (season projections, scoring so far,
    owner track record) and the remaining schedule, via Monte Carlo."""
    teams = {t["ownerKey"]: t for t in season["teams"]}
    keys = list(teams)
    standings = {r["ownerKey"]: r for r in build_standings(season, through_week, names)}
    reg = season["regSeasonWeeks"]
    remaining = [m for m in season["matchups"] if m["type"] == "NONE" and (not m["decided"] or m["week"] > through_week) and m["week"] <= reg]
    played = max((r["games"] for r in standings.values()), default=0)

    proj = _z({k: lineup_value(teams[k]) for k in keys})
    ppg = _z({k: (standings[k]["pointsFor"] / standings[k]["games"]) if standings[k]["games"] else 0.0 for k in keys})
    # era-adjusted career scoring (average z-score of points-for per season) so 2010 scoring
    # is not compared with today's
    hist = _z({k: (careers.get(k, {}).get("pfZAvg") or 0.0) for k in keys})
    w_recent = min(0.45, 0.12 * played)  # trust this season's scoring more as weeks accumulate
    strength = {k: (0.55 - w_recent / 2) * proj[k] + w_recent * ppg[k] + (0.45 - w_recent / 2) * hist[k] for k in keys}

    def p_win(st, a, b):
        # fantasy is noisy: a one-sigma strength edge is roughly a 60/40 game
        return 1 / (1 + math.exp(-(st[a] - st[b]) * 0.45))

    rng = random.Random(seed)
    sims = 3000
    playoff_n = season.get("playoffTeamCount") or 6
    finish_counts = {k: [0] * len(keys) for k in keys}
    playoff_hits = {k: 0 for k in keys}
    wins_total = {k: 0.0 for k in keys}
    for _ in range(sims):
        # each simulated season draws its own view of every team's true strength, since
        # projections, injuries and hot starts are all uncertain
        st = {k: strength[k] + rng.gauss(0, 0.5) for k in keys}
        w = {k: standings[k]["wins"] + 0.5 * standings[k]["ties"] for k in keys}
        pf = {k: standings[k]["pointsFor"] for k in keys}
        for m in remaining:
            a, b = m["home"]["ownerKey"], m["away"]["ownerKey"]
            if a not in w or b not in w:
                continue
            if rng.random() < p_win(st, a, b):
                w[a] += 1
            else:
                w[b] += 1
            pf[a] += 100 + 12 * st[a] + rng.gauss(0, 6)
            pf[b] += 100 + 12 * st[b] + rng.gauss(0, 6)
        order = sorted(keys, key=lambda k: (-w[k], -pf[k]))
        for i, k in enumerate(order):
            finish_counts[k][i] += 1
            if i < playoff_n:
                playoff_hits[k] += 1
            wins_total[k] += w[k]
    rows = []
    for k in keys:
        exp_finish = sum((i + 1) * c for i, c in enumerate(finish_counts[k])) / sims
        rows.append({
            "ownerKey": k, "name": names.get(k, k), "teamName": teams[k]["name"], "logo": teams[k].get("logo"),
            "currentWins": standings[k]["wins"], "currentLosses": standings[k]["losses"], "currentRank": standings[k]["rank"],
            "projectedWins": round(wins_total[k] / sims, 1), "projectedLosses": round(reg - wins_total[k] / sims, 1),
            "playoffOdds": round(100 * playoff_hits[k] / sims), "titleOddsProxy": round(100 * finish_counts[k][0] / sims),
            "expectedFinish": round(exp_finish, 2), "strength": round(strength[k], 2), "lineupValue": lineup_value(teams[k]),
            "injured": [p["name"] for p in teams[k].get("roster", []) if (p.get("injuryStatus") or "").upper() in INJURED][:4],
        })
    rows.sort(key=lambda r: (r["expectedFinish"], -r["projectedWins"]))
    prev = {r["ownerKey"]: r["rank"] for r in (prior or {}).get("rows", [])} if prior else {}
    for i, r in enumerate(rows, start=1):
        r["rank"] = i
        r["previousRank"] = prev.get(r["ownerKey"])
        r["movement"] = (prev[r["ownerKey"]] - i) if r["ownerKey"] in prev else None
    return {"week": through_week, "playoffTeamCount": playoff_n, "rows": rows, "remainingGames": len(remaining),
            "method": "3,000 simulated seasons over the remaining schedule. Team strength blends ESPN's rest-of-season projection for each team's best healthy lineup (injured players removed), this season's scoring so far, and the owner's era-adjusted career scoring. The weight on this season's results grows every week."}


def build_weekly(season: dict, owners: list[dict], careers: list[dict], prior_predictions: dict, recompute: bool = False) -> dict:
    names = {o["key"]: o["name"] for o in owners}
    teams = {t["ownerKey"]: t for t in season["teams"]}
    car = {c["ownerKey"]: c for c in careers}
    weeks = sorted({m["week"] for m in season["matchups"] if m["decided"] and m["type"] == "NONE"})
    out_weeks = []
    predictions = dict(prior_predictions or {})
    for w in weeks:
        games = build_week_games(season, w, names, teams)
        prior = predictions.get(str(w - 1))
        # Earlier weeks' predictions are frozen once written so movement week over week
        # reflects what was actually predicted at the time, not a re-run on today's rosters.
        if str(w) not in predictions or w == weeks[-1] or recompute:
            predictions[str(w)] = build_predictor(season, car, names, w, prior)
        out_weeks.append({"week": w, "games": games, "awards": build_week_awards(games), "superlatives": build_superlatives(games),
                          "standings": build_standings(season, w, names)})
    return {"year": season["year"], "regSeasonWeeks": season["regSeasonWeeks"], "playoffTeamCount": season.get("playoffTeamCount"),
            "weeks": out_weeks, "latestWeek": weeks[-1] if weeks else None,
            "standings": build_standings(season, None, names), "predictions": predictions}
