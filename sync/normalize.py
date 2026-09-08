"""Turn data/raw/{year}.json into the site's data files.

  data/league.json    normalized seasons keyed by owner
  data/owners.json    owner directory (team names + logos by year)
  data/coverage.json  what ESPN gave us per season, and what needs screenshots

Applies sync/owners.yml (identity map) and sync/overrides/{year}.yml (manual data).

  python sync/normalize.py            # build
  python sync/normalize.py --report   # also print owner map + coverage matrix
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import yaml

from config import BOXSCORE_MIN_YEAR, DATA_DIR, OVERRIDES_DIR, OWNERS_FILE, RAW_DIR

OWNERS_HEADER = (
    "# Owner identity map. Each owner may have several ESPN accounts (swids) and\n"
    "# many team names over the years; all stats stick to the `key`.\n"
    "# Edit `name` freely (it is what the site displays). Merge two ESPN accounts by\n"
    "# listing both swids under one owner. `teams: [{year: 2010, teamId: 4}]` pins a\n"
    "# team-season to an owner when ESPN has no owner info for it.\n"
)


def slugify(s: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return s or "owner"


def load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    return yaml.safe_load(path.read_text()) or {}


# --------------------------------------------------------------------------- owners
class OwnerMap:
    def __init__(self, cfg: dict, real_data: bool):
        owners = cfg.get("owners", []) or []
        if real_data:
            owners = [o for o in owners if not o.get("sample")]
        self.owners: list[dict] = owners
        self.by_swid: dict[str, dict] = {}
        self.by_team: dict[tuple[int, int], dict] = {}
        self.changed = False
        for o in self.owners:
            o.setdefault("swids", [])
            for swid in o["swids"]:
                self.by_swid[str(swid).upper()] = o
            for t in o.get("teams", []) or []:
                self.by_team[(int(t["year"]), int(t["teamId"]))] = o

    def keys(self):
        return {o["key"] for o in self.owners}

    def _unique_key(self, base: str) -> str:
        key, n = base, 2
        while key in self.keys():
            key = f"{base}-{n}"
            n += 1
        return key

    def display_name(self, member: dict) -> str:
        first = (member.get("firstName") or "").strip()
        last = (member.get("lastName") or "").strip()
        if first and last:
            others = {o["name"].split(" ")[0].lower() for o in self.owners}
            return first if first.lower() not in others else f"{first} {last[0]}."
        return first or member.get("displayName") or "Unknown"

    def resolve(self, year: int, team: dict, members: dict[str, dict], warnings: list[str]) -> tuple[str, list[str]]:
        """Return (primaryOwnerKey, coOwnerKeys) for a raw team-season, creating stubs as needed."""
        keys: list[str] = []
        for swid in team.get("ownerSwids", []) or []:
            sw = str(swid).upper()
            o = self.by_swid.get(sw)
            if o is None:
                member = members.get(sw, {})
                name = self.display_name(member) if member else f"Unknown owner ({year} {team.get('name')})"
                base = slugify(f"{member.get('firstName', '')} {member.get('lastName', '')}") if member else f"unknown-{year}-{team['teamId']}"
                o = {"key": self._unique_key(base), "name": name, "swids": [swid], "active": True, "auto": True}
                self.owners.append(o)
                self.by_swid[sw] = o
                self.changed = True
                warnings.append(f"new owner stub '{o['key']}' created for {name}; edit sync/owners.yml to rename/merge")
            if o["key"] not in keys:
                keys.append(o["key"])
        if not keys:
            o = self.by_team.get((year, int(team["teamId"])))
            if o is None:
                base = f"unknown-{year}-{team['teamId']}"
                o = {"key": self._unique_key(base), "name": f"Unknown ({year} {team.get('name', 'team')})",
                     "swids": [], "teams": [{"year": year, "teamId": team["teamId"]}], "active": False, "auto": True}
                self.owners.append(o)
                self.by_team[(year, int(team["teamId"]))] = o
                self.changed = True
                warnings.append(f"team '{team.get('name')}' in {year} has no ESPN owner; stub '{o['key']}' created. "
                                f"Pin it to the right owner in sync/owners.yml with teams: [{{year: {year}, teamId: {team['teamId']}}}]")
            keys = [o["key"]]
        return keys[0], keys[1:]

    def save(self):
        clean = []
        for o in self.owners:
            item = {k: v for k, v in o.items() if k in ("key", "name", "swids", "color", "active", "teams", "auto", "sample")}
            clean.append(item)
        OWNERS_FILE.write_text(OWNERS_HEADER + yaml.safe_dump({"owners": clean}, sort_keys=False, allow_unicode=True))


# --------------------------------------------------------------------------- seasons
def apply_overrides(season: dict, ov: dict, owners: OwnerMap, warnings: list[str]):
    """Merge a manual override file on top of ESPN data. Overrides always win."""
    key_set = owners.keys()

    def check(k):
        if k and k not in key_set:
            warnings.append(f"override references unknown owner key '{k}' (see sync/owners.yml)")
        return k

    teams_by_owner = {t["ownerKey"]: t for t in season["teams"]}
    next_id = 100
    for row in ov.get("teams", []) or []:
        k = check(row.get("owner"))
        if not k:
            continue
        t = teams_by_owner.get(k)
        if t is None:
            t = {"teamId": next_id, "ownerKey": k, "coOwnerKeys": [], "name": row.get("team_name") or k,
                 "abbrev": "", "logo": None, "wins": 0, "losses": 0, "ties": 0, "pointsFor": 0.0,
                 "pointsAgainst": 0.0, "seed": 0, "finalRank": 0, "roster": [], "fromOverride": True}
            next_id += 1
            season["teams"].append(t)
            teams_by_owner[k] = t
        for src, dst in (("team_name", "name"), ("wins", "wins"), ("losses", "losses"), ("ties", "ties"),
                         ("points_for", "pointsFor"), ("points_against", "pointsAgainst"),
                         ("playoff_seed", "seed"), ("final_rank", "finalRank")):
            if row.get(src) is not None:
                t[dst] = row[src]

    if ov.get("final_standings"):
        for rank, k in enumerate(ov["final_standings"], start=1):
            check(k)
            t = teams_by_owner.get(k)
            if t is None:
                t = {"teamId": next_id, "ownerKey": k, "coOwnerKeys": [], "name": k, "abbrev": "", "logo": None,
                     "wins": 0, "losses": 0, "ties": 0, "pointsFor": 0.0, "pointsAgainst": 0.0, "seed": 0,
                     "finalRank": 0, "roster": [], "fromOverride": True}
                next_id += 1
                season["teams"].append(t)
                teams_by_owner[k] = t
            t["finalRank"] = rank
    for src, rank in (("champion", 1), ("runner_up", 2), ("third", 3)):
        k = ov.get(src)
        if k:
            check(k)
            season["honors"][{"champion": "champion", "runner_up": "runnerUp", "third": "third"}[src]] = k
            t = teams_by_owner.get(k)
            if t is not None and not ov.get("final_standings"):
                t["finalRank"] = rank
    if ov.get("last_place"):
        season["honors"]["lastPlace"] = check(ov["last_place"])
        t = teams_by_owner.get(ov["last_place"])
        if t is not None and not ov.get("final_standings") and season["teams"]:
            t["finalRank"] = len(season["teams"])

    for row in ov.get("matchups", []) or []:
        h, a = check(row.get("home")), check(row.get("away"))
        ht, at = teams_by_owner.get(h), teams_by_owner.get(a)
        if not ht or not at:
            continue
        hs, as_ = float(row.get("home_score", 0)), float(row.get("away_score", 0))
        week = int(row.get("week", 0))
        forced_winner = row.get("winner")
        if forced_winner:
            check(forced_winner)
        # replace any ESPN matchup for the same pair/week
        season["matchups"] = [m for m in season["matchups"] if not (
            m["week"] == week and {m["home"]["ownerKey"], m["away"]["ownerKey"]} == {h, a})]
        season["matchups"].append({
            "id": f"{season['year']}-w{week}-ov{len(season['matchups'])}", "week": week,
            "isPlayoff": bool(row.get("playoff", False)),
            "type": row.get("type") or ("WINNERS_BRACKET" if row.get("playoff") else "NONE"),
            "home": {"teamId": ht["teamId"], "ownerKey": h, "score": hs},
            "away": {"teamId": at["teamId"], "ownerKey": a, "score": as_},
            "winnerKey": forced_winner if forced_winner else (None if hs == as_ else (h if hs > as_ else a)),
            "decided": True, "fromOverride": True, "multiWeek": False,
        })
    if ov.get("note"):
        season["honorsNote"] = str(ov["note"])
    if ov.get("champion_roster"):
        season["championRoster"] = [{
            "playerId": None, "name": r.get("player", ""), "position": r.get("position", ""),
            "proTeam": r.get("nfl_team", ""), "slot": r.get("slot", ""), "points": r.get("points"),
            "seasonPoints": r.get("season_points"),
        } for r in ov["champion_roster"]]
        season["championRosterSource"] = "override"


def derive_honors(season: dict):
    teams = season["teams"]
    honors = season["honors"]
    by_rank = {t["finalRank"]: t for t in teams if t.get("finalRank")}
    # cross-check with the winners-bracket final if standings are missing
    if not by_rank.get(1):
        finals = [m for m in season["matchups"] if m["type"] == "WINNERS_BRACKET" and m["decided"]]
        if finals:
            last_week = max(m["week"] for m in finals)
            last = [m for m in finals if m["week"] == last_week]
            if len(last) == 1 and last[0]["winnerKey"]:
                w = last[0]["winnerKey"]
                loser = last[0]["home"]["ownerKey"] if w != last[0]["home"]["ownerKey"] else last[0]["away"]["ownerKey"]
                honors.setdefault("champion", w)
                honors.setdefault("runnerUp", loser)
    for rank, name in ((1, "champion"), (2, "runnerUp"), (3, "third")):
        if by_rank.get(rank) and not honors.get(name):
            honors[name] = by_rank[rank]["ownerKey"]
    if teams and all(t.get("finalRank") for t in teams) and not honors.get("lastPlace"):
        honors["lastPlace"] = max(teams, key=lambda t: t["finalRank"])["ownerKey"]
    played = [t for t in teams if (t["wins"] + t["losses"] + t["ties"]) > 0]
    if played:
        best = max(played, key=lambda t: (t["wins"] + 0.5 * t["ties"], t["pointsFor"]))
        honors["regSeasonChamp"] = best["ownerKey"]
        honors["topScorer"] = max(played, key=lambda t: t["pointsFor"])["ownerKey"]
    for k in ("champion", "runnerUp", "third", "lastPlace", "regSeasonChamp", "topScorer"):
        honors.setdefault(k, None)


def champion_roster(season: dict, raw: dict):
    if season.get("championRoster"):
        return
    champ = season["honors"].get("champion")
    if not champ:
        season["championRoster"], season["championRosterSource"] = None, None
        return
    team = next((t for t in season["teams"] if t["ownerKey"] == champ), None)
    if team is None:
        season["championRoster"], season["championRosterSource"] = None, None
        return
    # title week lineup from box scores
    finals = [m for m in season["matchups"] if m["type"] == "WINNERS_BRACKET" and m["decided"]]
    if finals and raw.get("boxscores"):
        wk = str(max(m["week"] for m in finals))
        for entry in raw["boxscores"].get(wk, []):
            if entry["teamId"] == team["teamId"]:
                season_pts = {p["playerId"]: p.get("seasonPoints") for p in team["roster"]}
                season["championRoster"] = [{
                    "playerId": p["playerId"], "name": p["name"], "position": p["position"], "proTeam": p["proTeam"],
                    "slot": p["slot"], "points": p["points"], "seasonPoints": season_pts.get(p["playerId"]),
                } for p in entry["players"]]
                season["championRosterSource"] = "title-week"
                return
    if team["roster"]:
        season["championRoster"] = [{
            "playerId": p["playerId"], "name": p["name"], "position": p["position"], "proTeam": p["proTeam"],
            "slot": "", "points": None, "seasonPoints": p.get("seasonPoints"),
        } for p in team["roster"]]
        season["championRosterSource"] = "final-roster"
        return
    season["championRoster"], season["championRosterSource"] = None, None


def coverage_for(season: dict, raw: dict, owner_map: OwnerMap) -> dict:
    teams = season["teams"]
    n = len(teams)
    reg = season["regSeasonWeeks"]
    completed = season["completedWeeks"]
    cov: dict[str, str] = {}
    cov["settings"] = "full" if raw.get("settings") else "missing"
    cov["teams"] = "full" if teams and all((t["wins"] + t["losses"] + t["ties"]) > 0 for t in teams) else ("partial" if teams else "missing")
    if teams and not season["isComplete"] and not completed:
        cov["teams"] = "n/a"  # season hasn't kicked off yet; nothing is missing
    unknown = [t for t in teams if t["ownerKey"].startswith("unknown-")]
    cov["owners"] = "missing" if not teams or len(unknown) == n else ("partial" if unknown else "full")
    reg_expected = (n // 2) * len([w for w in completed if w <= reg]) if n else 0
    reg_have = len([m for m in season["matchups"] if m["decided"] and not m["isPlayoff"]])
    cov["weeklyScores"] = "full" if reg_expected and reg_have >= reg_expected else ("partial" if reg_have else "missing")
    if not season["isComplete"] and not completed:
        cov["weeklyScores"] = "n/a"
    ranked = [t for t in teams if t.get("finalRank")]
    if not season["isComplete"]:
        cov["finalStandings"] = "n/a"
        cov["champion"] = "n/a"
    else:
        cov["finalStandings"] = "full" if teams and len(ranked) == n else ("partial" if ranked or season["honors"].get("champion") else "missing")
        cov["champion"] = "full" if season["honors"].get("champion") else "missing"
    picks = season["draft"]
    named = [p for p in picks if p.get("playerName")]
    if picks and len(picks) >= n * 6 and len(named) >= 0.9 * len(picks):
        cov["draft"] = "full"
    elif picks:
        cov["draft"] = "partial"
    else:
        cov["draft"] = "missing"
    if not picks and not season["isComplete"] and not completed:
        cov["draft"] = "n/a"
    logos = [t for t in teams if t.get("logo")]
    cov["logos"] = "full" if teams and len(logos) == n else ("partial" if logos else "missing")
    if season["year"] < BOXSCORE_MIN_YEAR:
        cov["boxscores"] = "n/a"
    else:
        weeks = [w for w in completed]
        have = [w for w in weeks if str(w) in (raw.get("boxscores") or {})]
        cov["boxscores"] = "full" if weeks and len(have) == len(weeks) else ("partial" if have else ("n/a" if not weeks else "missing"))
    core = [cov[k] for k in ("teams", "owners", "weeklyScores", "finalStandings", "champion")]
    if all(c in ("full", "n/a") for c in core):
        tier = "full"
    elif season["honors"].get("champion") or cov["teams"] != "missing":
        tier = "partial"
    else:
        tier = "missing"
    needs = []
    if season["isComplete"]:
        if cov["champion"] != "full":
            needs.append("who won the championship (and runner-up)")
        if cov["finalStandings"] != "full":
            needs.append("final standings screenshot (every team's finishing place)")
        if cov["teams"] != "full":
            needs.append("each team's regular-season record and points for/against")
        if cov["weeklyScores"] == "missing":
            needs.append("weekly scoreboard screenshots (optional; enables single-game records)")
        if not season.get("championRoster"):
            needs.append("champion's roster screenshot (for the trophy case)")
        if cov["owners"] != "full":
            needs.append("which person owned each team (edit sync/owners.yml)")
    return {"fields": cov, "tier": tier, "screenshotsNeeded": needs, "source": raw.get("source", "espn")}


def write_override_template(season: dict, cov: dict):
    if not cov["screenshotsNeeded"] or cov["source"] == "sample":
        return
    tdir = OVERRIDES_DIR / "templates"
    tdir.mkdir(parents=True, exist_ok=True)
    path = tdir / f"{season['year']}.yml"
    if (OVERRIDES_DIR / f"{season['year']}.yml").exists():
        return
    lines = [
        f"# Fill in from screenshots, then move this file to sync/overrides/{season['year']}.yml",
        f"# Missing from ESPN: {', '.join(cov['screenshotsNeeded'])}",
        f"season: {season['year']}",
        f"champion: {season['honors'].get('champion') or ''}",
        f"runner_up: {season['honors'].get('runnerUp') or ''}",
        f"third: {season['honors'].get('third') or ''}",
        f"last_place: {season['honors'].get('lastPlace') or ''}",
        "final_standings: []   # owner keys in finishing order",
        "teams:",
    ]
    for t in sorted(season["teams"], key=lambda t: t.get("finalRank") or 99):
        lines.append(f"  - {{owner: {t['ownerKey']}, team_name: \"{t['name']}\", wins: {t['wins']}, losses: {t['losses']}, "
                     f"ties: {t['ties']}, points_for: {t['pointsFor']}, points_against: {t['pointsAgainst']}}}")
    lines += ["champion_roster: []   # [{player: \"Name\", position: RB, nfl_team: NYG, slot: RB, points: 12.3}]", ""]
    path.write_text("\n".join(lines))


def normalize_season(raw: dict, owner_map: OwnerMap) -> dict:
    year = raw["year"]
    warnings = list(raw.get("warnings", []))
    members = {str(m.get("swid", "")).upper(): m for m in raw.get("members", [])}
    settings = raw.get("settings", {})
    status = raw.get("status", {})
    teams = []
    for t in raw.get("teams", []):
        primary, co = owner_map.resolve(year, t, members, warnings)
        teams.append({
            "teamId": t["teamId"], "ownerKey": primary, "coOwnerKeys": co, "name": t.get("name") or "",
            "abbrev": t.get("abbrev") or "", "logo": t.get("logo"),
            "wins": t.get("wins", 0) or 0, "losses": t.get("losses", 0) or 0, "ties": t.get("ties", 0) or 0,
            "pointsFor": round(t.get("pointsFor", 0) or 0, 2), "pointsAgainst": round(t.get("pointsAgainst", 0) or 0, 2),
            "seed": t.get("seed", 0) or 0, "finalRank": t.get("finalRank", 0) or 0,
            "roster": t.get("roster", []),
        })
    owner_of = {t["teamId"]: t["ownerKey"] for t in teams}
    matchups = []
    periods = {str(k): v for k, v in (settings.get("matchupPeriods") or {}).items()}
    for i, m in enumerate(raw.get("matchups", [])):
        h, a = owner_of.get(m["homeTeamId"]), owner_of.get(m["awayTeamId"])
        if not h or not a:
            continue
        decided = m.get("winner", "UNDECIDED") != "UNDECIDED"
        winner = None
        if decided:
            winner = h if m["winner"] == "HOME" else (a if m["winner"] == "AWAY" else None)
        span = periods.get(str(m["week"]), [m["week"]])
        matchups.append({
            "id": f"{year}-w{m['week']}-{i}", "week": m["week"], "isPlayoff": bool(m.get("isPlayoff")),
            "type": m.get("type", "NONE"), "multiWeek": len(span) > 1,
            "home": {"teamId": m["homeTeamId"], "ownerKey": h, "score": m.get("homeScore", 0)},
            "away": {"teamId": m["awayTeamId"], "ownerKey": a, "score": m.get("awayScore", 0)},
            "winnerKey": winner, "decided": decided,
        })
    boxscores = {}
    for wk, entries in (raw.get("boxscores") or {}).items():
        boxscores[wk] = [dict(e, ownerKey=owner_of.get(e["teamId"])) for e in entries]
    # Season points per player: end-of-season roster totals first, then summed box scores
    # for players who were dropped before the season ended (2019+).
    season_pts: dict = {}
    for entries in boxscores.values():
        for e in entries:
            for pl in e.get("players", []):
                if pl.get("playerId") is not None:
                    season_pts[pl["playerId"]] = round(season_pts.get(pl["playerId"], 0.0) + (pl.get("points") or 0), 2)
    for t in teams:
        for pl in t.get("roster", []):
            if pl.get("playerId") is not None and pl.get("seasonPoints"):
                season_pts[pl["playerId"]] = pl["seasonPoints"]
    draft = []
    for p in raw.get("draft", []):
        d = dict(p)
        d["ownerKey"] = owner_of.get(p.get("teamId"))
        if d.get("seasonPoints") is None and d.get("playerId") in season_pts:
            d["seasonPoints"] = season_pts[d["playerId"]]
        draft.append(d)

    # trades: map team ids to owners and place each trade in the first week it affected
    week_starts = {int(k): v for k, v in (status.get("weekStarts") or {}).items()}
    final_period = status.get("finalScoringPeriod") or (settings.get("regSeasonWeeks", 13) + 4)
    known_players = {p.get("playerId"): p for t in raw.get("teams", []) for p in t.get("roster", [])}
    for wk_entries in (raw.get("boxscores") or {}).values():
        for e in wk_entries:
            for p in e.get("players", []):
                known_players.setdefault(p.get("playerId"), p)
    trades = []
    for t in raw.get("trades", []) or []:
        date = t.get("date") or 0
        week = t.get("week")
        if week is None and week_starts:
            later = [w for w, start in week_starts.items() if start > date]
            week = min(later) if later else final_period + 1
        sides: dict = {}
        for it in t.get("items", []):
            frm, to = owner_of.get(it.get("fromTeamId")), owner_of.get(it.get("toTeamId"))
            if not frm or not to or frm == to:
                continue
            info = known_players.get(it.get("playerId"), {})
            player = {"playerId": it.get("playerId"), "name": it.get("name") or info.get("name", "Unknown"),
                      "position": it.get("position") or info.get("position", ""), "proTeam": it.get("proTeam") or info.get("proTeam", "")}
            sides.setdefault(to, {"ownerKey": to, "teamId": it.get("toTeamId"), "received": []})["received"].append(player)
            sides.setdefault(frm, {"ownerKey": frm, "teamId": it.get("fromTeamId"), "received": []})
        if len(sides) != 2:
            continue  # only two-team trades are scored
        a, b = sides.values()
        trades.append({"id": f"{year}-t{t.get('id') or len(trades)}", "year": year, "date": date, "week": week,
                       "sides": [a, b]})
    trades.sort(key=lambda t: t["date"])

    season = {
        "year": year, "name": re.sub(r"\s+Season\s+\d+\s*$", "", settings.get("name", "") or "", flags=re.I), "teamCount": settings.get("teamCount", len(teams)),
        "regSeasonWeeks": settings.get("regSeasonWeeks", 13), "playoffTeamCount": settings.get("playoffTeamCount", 0),
        "matchupPeriods": periods,
        "isComplete": bool(status.get("isComplete")), "completedWeeks": status.get("completedWeeks", []),
        "currentWeek": status.get("currentWeek"), "source": raw.get("source", "espn"),
        "teams": teams, "matchups": matchups, "draft": draft, "boxscores": boxscores, "trades": trades,
        "honors": {}, "championRoster": None, "championRosterSource": None, "warnings": warnings,
    }
    ov = load_yaml(OVERRIDES_DIR / f"{year}.yml")
    if ov.get("sample") and raw.get("source") != "sample":
        ov = {}
    if ov:
        apply_overrides(season, ov, owner_map, warnings)
        season["hasOverride"] = True
    derive_honors(season)
    champion_roster(season, raw)
    season["coverage"] = coverage_for(season, raw, owner_map)
    return season


def build_owners(seasons: list[dict], owner_map: OwnerMap) -> list[dict]:
    out = []
    for o in owner_map.owners:
        k = o["key"]
        team_names, logos, years = {}, {}, []
        for s in seasons:
            for t in s["teams"]:
                if t["ownerKey"] == k or k in t["coOwnerKeys"]:
                    years.append(s["year"])
                    team_names[str(s["year"])] = {"name": t["name"], "abbrev": t["abbrev"], "teamId": t["teamId"]}
                    if t.get("logo"):
                        logos[str(s["year"])] = t["logo"]
        if not years and o.get("auto"):
            continue
        years = sorted(set(years))
        latest_logo = logos[str(max(int(y) for y in logos))] if logos else None
        out.append({
            "key": k, "name": o.get("name", k), "color": o.get("color"), "swids": o.get("swids", []),
            "active": bool(o.get("active", True)) and (bool(years) and years[-1] >= max(s["year"] for s in seasons) - 1),
            "seasons": years, "firstSeason": years[0] if years else None, "lastSeason": years[-1] if years else None,
            "teamNames": team_names, "logos": logos, "currentLogo": latest_logo,
            "titles": [s["year"] for s in seasons if s["honors"].get("champion") == k],
        })
    return out


def print_report(seasons, owners, coverage):
    print("\nOWNER MAP (owner -> seasons -> team names)")
    for o in owners:
        names = sorted({v["name"] for v in o["teamNames"].values()})
        span = f"{o['firstSeason']}-{o['lastSeason']}" if o["seasons"] else "-"
        print(f"  {o['key']:<18} {o['name']:<18} {span:<10} {len(o['seasons']):>2} seasons  {', '.join(names)}")
    fields = ["teams", "owners", "weeklyScores", "finalStandings", "champion", "draft", "logos", "boxscores"]
    print("\nCOVERAGE (full / partial / missing / n-a)")
    print("  year  tier     " + "  ".join(f"{f[:10]:<10}" for f in fields))
    for year, c in sorted(coverage.items()):
        print(f"  {year}  {c['tier']:<8} " + "  ".join(f"{c['fields'][f]:<10}" for f in fields))
    needs = {y: c["screenshotsNeeded"] for y, c in coverage.items() if c["screenshotsNeeded"]}
    if needs:
        print("\nSCREENSHOTS NEEDED")
        for y, items in sorted(needs.items()):
            for it in items:
                print(f"  {y}: {it}")
    else:
        print("\nNo manual data needed.")


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args(argv)
    raws = []
    for f in sorted(RAW_DIR.glob("*.json")):
        try:
            raws.append(json.loads(f.read_text()))
        except Exception as e:  # noqa: BLE001
            print(f"skipping unreadable {f.name}: {e}", file=sys.stderr)
    if not raws:
        print("no raw seasons in data/raw; run espn_sync.py or generate_sample.py", file=sys.stderr)
        return 2
    real = any(r.get("source") != "sample" for r in raws)
    owner_map = OwnerMap(load_yaml(OWNERS_FILE), real_data=real)
    seasons = [normalize_season(r, owner_map) for r in sorted(raws, key=lambda r: r["year"])]
    if owner_map.changed or not OWNERS_FILE.exists():
        owner_map.save()
    owners = build_owners(seasons, owner_map)
    coverage = {str(s["year"]): s["coverage"] for s in seasons}
    for s in seasons:
        write_override_template(s, s["coverage"])
    league_name = next((s["name"] for s in reversed(seasons) if s["name"]), "Fantasy League")
    # ESPN appends things like "Season 17" to the league name; the site wants the bare name.
    league_name = re.sub(r"\s*[-–:|]?\s*(season|year)\s*\d+\s*$", "", league_name, flags=re.I).strip() or league_name
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / "league.json").write_text(json.dumps({"leagueName": league_name, "seasons": seasons}, separators=(",", ":")))
    (DATA_DIR / "owners.json").write_text(json.dumps({"owners": owners}, indent=1))
    (DATA_DIR / "coverage.json").write_text(json.dumps(coverage, indent=1))
    print(f"normalized {len(seasons)} seasons, {len(owners)} owners -> data/league.json")
    if args.report:
        print_report(seasons, owners, coverage)
    return 0


if __name__ == "__main__":
    sys.exit(main())
