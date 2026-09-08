"""Per-owner highlights: the best team-season (with roster) and the MVP player-season."""
from __future__ import annotations

from collections import defaultdict


def _roster_with_lineup(season: dict, team: dict) -> list[dict]:
    """End-of-season roster sorted by season points, with `starter` from the last box-score week."""
    starters: set = set()
    weeks = sorted((int(w) for w in (season.get("boxscores") or {}).keys()), reverse=True)
    for wk in weeks:
        entry = next((e for e in season["boxscores"][str(wk)] if e["teamId"] == team["teamId"]), None)
        if entry:
            starters = {p["playerId"] for p in entry["players"] if p.get("slot") and p["slot"] not in ("BE", "IR")}
            break
    roster = sorted(team.get("roster", []), key=lambda p: -(p.get("seasonPoints") or 0))
    return [{"playerId": p.get("playerId"), "name": p["name"], "position": p.get("position", ""), "proTeam": p.get("proTeam", ""),
             "seasonPoints": p.get("seasonPoints"), "starter": (p.get("playerId") in starters) if starters else None} for p in roster]


def _espn_url(player_id, position: str):
    if not player_id or position == "D/ST":
        return None
    return f"https://www.espn.com/nfl/player/_/id/{player_id}"


def _is_pickup(row: dict, drafted: set, acq: str | None) -> bool:
    """A waiver-wire / free-agent pickup: ESPN says ADD when we have it, otherwise any player
    who was never drafted in that season's draft."""
    if acq:
        return acq.upper() == "ADD"
    return row.get("playerId") is not None and row["playerId"] not in drafted


def build_highlights(seasons: list[dict], team_seasons: list[dict]) -> tuple[dict, list[dict], dict]:
    """Returns ({ownerKey: {bestTeam, bestPlayers: {qb, flex, waiver}}}, league-wide top player-seasons,
    {"byYear": [...best pickup per season...], "allTime": [...top pickups...]})."""
    by_year = {s["year"]: s for s in seasons}
    pickups: list[dict] = []

    # --- candidate player-seasons per owner
    candidates: dict[str, list[dict]] = defaultdict(list)
    all_rows: list[dict] = []
    for s in seasons:
        teams = {t["teamId"]: t for t in s["teams"]}
        if s.get("boxscores"):
            # points scored while on the owner's roster (starter or bench)
            acc: dict[tuple, dict] = {}
            for wk, entries in s["boxscores"].items():
                for e in entries:
                    k = e.get("ownerKey")
                    if not k:
                        continue
                    for p in e["players"]:
                        if p.get("playerId") is None:
                            continue
                        row = acc.setdefault((k, p["playerId"]), {"ownerKey": k, "playerId": p["playerId"], "name": p["name"],
                                                                  "position": p.get("position", ""), "proTeam": p.get("proTeam", ""),
                                                                  "points": 0.0, "weeks": 0, "teamName": teams.get(e["teamId"], {}).get("name", "")})
                        row["points"] = round(row["points"] + (p.get("points") or 0), 2)
                        row["weeks"] += 1
            season_totals = {p.get("playerId"): p.get("seasonPoints") for t in s["teams"] for p in t.get("roster", [])}
            drafted = {p.get("playerId") for p in s.get("draft", []) if p.get("playerId")}
            acq_types = {(e.get("ownerKey"), p.get("playerId")): p.get("acquisitionType")
                         for entries in s["boxscores"].values() for e in entries for p in e["players"] if p.get("acquisitionType")}
            for row in acc.values():
                row.update({"year": s["year"], "source": "rostered-weeks", "totalWeeks": len(s["boxscores"]),
                            "seasonPoints": season_totals.get(row["playerId"])})
                row["pickup"] = bool(drafted) and _is_pickup(row, drafted, acq_types.get((row["ownerKey"], row["playerId"])))
                candidates[row["ownerKey"]].append(row)
                all_rows.append(row)
                if row["pickup"]:
                    pickups.append(row)
        else:
            drafted = {p.get("playerId") for p in s.get("draft", []) if p.get("playerId")}
            for t in s["teams"]:
                for p in t.get("roster", []):
                    if not p.get("seasonPoints"):
                        continue
                    row = {"ownerKey": t["ownerKey"], "playerId": p.get("playerId"), "name": p["name"], "position": p.get("position", ""),
                           "proTeam": p.get("proTeam", ""), "points": p["seasonPoints"], "seasonPoints": p["seasonPoints"],
                           "weeks": None, "totalWeeks": None, "teamName": t["name"], "year": s["year"], "source": "season-total"}
                    row["pickup"] = bool(drafted) and _is_pickup(row, drafted, p.get("acquisitionType"))
                    candidates[t["ownerKey"]].append(row)
                    all_rows.append(row)
                    if row["pickup"]:
                        pickups.append(row)

    out: dict[str, dict] = {}
    owners = {t["ownerKey"] for s in seasons for t in s["teams"]}
    for k in owners:
        best = next((t for t in team_seasons if t["ownerKey"] == k), None)
        best_team = None
        if best:
            season = by_year[best["year"]]
            team = next((t for t in season["teams"] if t["ownerKey"] == k), None)
            if team:
                best_team = {
                    "year": best["year"], "teamName": team["name"], "logo": team.get("logo"), "wins": team["wins"], "losses": team["losses"],
                    "ties": team["ties"], "pointsFor": team["pointsFor"], "pointsAgainst": team["pointsAgainst"], "seed": team.get("seed"),
                    "finalRank": team.get("finalRank"), "rank": best["rank"], "result": best["result"], "score": best["score"],
                    "roster": _roster_with_lineup(season, team),
                }
        def pick(rows):
            if not rows:
                return None
            top = max(rows, key=lambda r: (r["points"], r.get("seasonPoints") or 0))
            row = dict(top, espnUrl=_espn_url(top["playerId"], top["position"]), headshot=None)
            row.pop("ownerKey", None)
            return row

        cands = candidates.get(k, [])
        best_players = {
            "qb": pick([r for r in cands if r["position"] == "QB"]),
            "flex": pick([r for r in cands if r["position"] not in ("QB", "K", "D/ST", "")]),
            "waiver": pick([r for r in cands if r.get("pickup") and r["position"] not in ("K", "D/ST", "")]),
        }
        out[k] = {"bestTeam": best_team, "bestPlayers": best_players}

    league_top = sorted(all_rows, key=lambda r: -r["points"])[:15]
    skill_pickups = [r for r in pickups if r["position"] not in ("K", "D/ST", "")]
    by_year = []
    for year in sorted({r["year"] for r in skill_pickups}, reverse=True):
        best = max([r for r in skill_pickups if r["year"] == year], key=lambda r: r["points"])
        by_year.append(dict(best, espnUrl=_espn_url(best["playerId"], best["position"]), headshot=None))
    all_time = [dict(r, espnUrl=_espn_url(r["playerId"], r["position"]), headshot=None)
                for r in sorted(skill_pickups, key=lambda r: -r["points"])[:15]]
    return out, league_top, {"byYear": by_year, "allTime": all_time}
