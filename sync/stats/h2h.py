"""Head-to-head matrix for every owner pair."""
from __future__ import annotations

from collections import defaultdict

from .common import PLAYOFF_TYPES, team_games


def build_h2h(seasons: list[dict], owners: list[dict]) -> dict:
    keys = [o["key"] for o in owners]
    matrix: dict[str, dict[str, dict]] = {a: {} for a in keys}
    games: dict[str, list[dict]] = defaultdict(list)
    for a in keys:
        for b in keys:
            if a != b:
                matrix[a][b] = {"wins": 0, "losses": 0, "ties": 0, "pointsFor": 0.0, "pointsAgainst": 0.0,
                                "playoffWins": 0, "playoffLosses": 0, "games": 0, "streak": None, "lastYear": None,
                                "biggestWin": None, "closest": None}
    seen = set()
    for s in seasons:
        for g in sorted(team_games(s, include_consolation=True, include_multiweek=True), key=lambda g: (g["year"], g["week"])):
            a, b = g["ownerKey"], g["oppKey"]
            if a not in matrix or b not in matrix.get(a, {}):
                continue
            cell = matrix[a][b]
            cell["games"] += 1
            cell["pointsFor"] += g["score"]
            cell["pointsAgainst"] += g["oppScore"]
            cell["lastYear"] = g["year"]
            res = "W" if g["won"] else ("L" if g["won"] is False else "T")
            if g["type"] not in ("LOSERS_CONSOLATION_LADDER", "WINNERS_CONSOLATION_LADDER"):
                cell["wins"] += res == "W"
                cell["losses"] += res == "L"
                cell["ties"] += res == "T"
            if g["isPlayoff"]:
                cell["playoffWins"] += res == "W"
                cell["playoffLosses"] += res == "L"
            st = cell["streak"]
            if st and st["type"] == res:
                st["length"] += 1
            else:
                cell["streak"] = {"type": res, "length": 1}
            if not g["multiWeek"]:
                if res == "W" and (cell["biggestWin"] is None or g["margin"] > cell["biggestWin"]["margin"]):
                    cell["biggestWin"] = {"margin": g["margin"], "year": g["year"], "week": g["week"], "matchupId": g["matchupId"]}
                if cell["closest"] is None or abs(g["margin"]) < abs(cell["closest"]["margin"]):
                    cell["closest"] = {"margin": g["margin"], "year": g["year"], "week": g["week"], "matchupId": g["matchupId"]}
            pair = "|".join(sorted((a, b)))
            if g["matchupId"] not in seen:
                seen.add(g["matchupId"])
                first, second = sorted((a, b))
                games[pair].append({
                    "matchupId": g["matchupId"], "year": g["year"], "week": g["week"], "type": g["type"],
                    "isPlayoff": g["isPlayoff"],
                    "scores": {first: g["score"] if a == first else g["oppScore"], second: g["oppScore"] if a == first else g["score"]},
                    "winnerKey": (a if res == "W" else (b if res == "L" else None)),
                })
    for a in keys:
        for b, cell in matrix[a].items():
            cell["pointsFor"] = round(cell["pointsFor"], 2)
            cell["pointsAgainst"] = round(cell["pointsAgainst"], 2)
            cell["avgMargin"] = round((cell["pointsFor"] - cell["pointsAgainst"]) / cell["games"], 2) if cell["games"] else 0.0
    return {"matrix": matrix, "games": games}
