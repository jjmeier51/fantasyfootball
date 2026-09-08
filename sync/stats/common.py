"""Shared helpers for the stats modules. Everything is keyed by ownerKey."""
from __future__ import annotations

from collections import defaultdict
from statistics import mean, pstdev

PLAYOFF_TYPES = {"WINNERS_BRACKET"}
CONSOLATION_TYPES = {"LOSERS_CONSOLATION_LADDER", "WINNERS_CONSOLATION_LADDER"}


def team_of(season: dict, owner_key: str) -> dict | None:
    for t in season["teams"]:
        if t["ownerKey"] == owner_key:
            return t
    return None


def team_by_id(season: dict, team_id: int) -> dict | None:
    for t in season["teams"]:
        if t["teamId"] == team_id:
            return t
    return None


def team_games(season: dict, include_consolation: bool = False, include_multiweek: bool = False):
    """Yield one record per team per decided matchup (two per matchup).

    Two-week playoff matchups (one "game" scored over two NFL weeks, used 2010-2018) are
    skipped by default because their totals aren't comparable to single-week scores."""
    for m in season["matchups"]:
        if not m["decided"]:
            continue
        if m["type"] in CONSOLATION_TYPES and not include_consolation:
            continue
        if m.get("multiWeek") and not include_multiweek:
            continue
        for side, other in (("home", "away"), ("away", "home")):
            me, opp = m[side], m[other]
            won = None if m["winnerKey"] is None else (m["winnerKey"] == me["ownerKey"])
            yield {
                "year": season["year"], "week": m["week"], "matchupId": m["id"],
                "ownerKey": me["ownerKey"], "oppKey": opp["ownerKey"],
                "score": me["score"], "oppScore": opp["score"], "margin": round(me["score"] - opp["score"], 2),
                "won": won, "isPlayoff": m["type"] in PLAYOFF_TYPES, "type": m["type"],
                "teamId": me["teamId"], "oppTeamId": opp["teamId"], "multiWeek": bool(m.get("multiWeek")),
            }


def team_name(season: dict, owner_key: str) -> str:
    t = team_of(season, owner_key)
    return t["name"] if t else owner_key


def logo(season: dict, owner_key: str):
    t = team_of(season, owner_key)
    return t.get("logo") if t else None


def zscores(values: list[float]) -> list[float]:
    if len(values) < 2:
        return [0.0 for _ in values]
    mu, sd = mean(values), pstdev(values)
    if sd == 0:
        return [0.0 for _ in values]
    return [(v - mu) / sd for v in values]


def made_playoffs(season: dict, team: dict) -> bool:
    n = season.get("playoffTeamCount") or 0
    if n and team.get("seed") and team["seed"] <= n:
        return True
    for m in season["matchups"]:
        if m["type"] in PLAYOFF_TYPES and team["ownerKey"] in (m["home"]["ownerKey"], m["away"]["ownerKey"]):
            return True
    if n and team.get("finalRank") and team["finalRank"] <= n and season["isComplete"]:
        return True
    return False


def week_scores(season: dict) -> dict[int, list[tuple[str, float]]]:
    """week -> [(ownerKey, score)] for decided regular-season + playoff games."""
    out: dict[int, list[tuple[str, float]]] = defaultdict(list)
    seen = set()
    for g in team_games(season, include_consolation=True):
        k = (g["week"], g["ownerKey"])
        if k in seen:
            continue
        seen.add(k)
        out[g["week"]].append((g["ownerKey"], g["score"]))
    return out


def ordinal(n: int) -> str:
    if 10 <= n % 100 <= 20:
        suf = "th"
    else:
        suf = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
    return f"{n}{suf}"


def record_str(w: int, l: int, t: int = 0) -> str:
    return f"{w}-{l}" + (f"-{t}" if t else "")
