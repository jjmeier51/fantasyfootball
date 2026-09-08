"""Pull every season of the league from ESPN into data/raw/{year}.json.

Usage:
  python sync/espn_sync.py            # refresh only the current season (weekly job)
  python sync/espn_sync.py --all      # refetch every season since FIRST_SEASON
  python sync/espn_sync.py --season 2014
  python sync/espn_sync.py --no-boxscores   # skip per-week player box scores (faster)

Requires ESPN_LEAGUE_ID, and for private leagues ESPN_S2 + ESPN_SWID, in the environment.
The output shape is documented in sync/normalize.py (RawSeason).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone

import requests

from config import (
    BOXSCORE_MIN_YEAR,
    DEFAULT_POSITION_MAP,
    ESPN_S2,
    ESPN_SWID,
    FIRST_SEASON,
    LEAGUE_ID,
    LINEUP_SLOT_MAP,
    LOGO_DIR,
    PRO_TEAM_MAP,
    RAW_DIR,
    current_season,
)

try:
    from espn_api.football import League
    from espn_api.requests.espn_requests import ESPNAccessDenied, ESPNInvalidLeague, ESPNUnknownError
except ImportError:  # pragma: no cover
    print("espn_api is not installed: pip install -r sync/requirements.txt", file=sys.stderr)
    raise

COOKIE_HELP = (
    "ESPN rejected the credentials. For a private league you need fresh cookies:\n"
    "  1. Log in to fantasy.espn.com in Chrome, open DevTools > Application > Cookies > espn.com\n"
    "  2. Copy the values of `espn_s2` and `SWID` (SWID includes the curly braces)\n"
    "  3. Update the ESPN_S2 and ESPN_SWID repository secrets (they expire roughly yearly)\n"
)


def log(msg: str):
    print(f"[espn_sync] {msg}", flush=True)


def slot_name(slot_id) -> str:
    return LINEUP_SLOT_MAP.get(slot_id, "")


def player_from_entry(entry: dict, year: int) -> dict:
    """Normalize a roster/box entry from ESPN's raw JSON."""
    pool = entry.get("playerPoolEntry", entry)
    player = pool.get("player", pool)
    season_points = None
    for st in player.get("stats", []) or []:
        if st.get("seasonId") == year and st.get("statSourceId") == 0 and st.get("statSplitTypeId") == 0:
            season_points = round(st.get("appliedTotal", 0) or 0, 2)
    return {
        "playerId": player.get("id"),
        "name": player.get("fullName", ""),
        "position": DEFAULT_POSITION_MAP.get(player.get("defaultPositionId"), ""),
        "proTeam": PRO_TEAM_MAP.get(player.get("proTeamId", 0), "FA"),
        "seasonPoints": season_points,
    }


def fetch_player_meta(league: League, player_ids: list[int], year: int) -> dict[int, dict]:
    """Name/position/team/season points for a list of playerIds for a given season."""
    meta: dict[int, dict] = {}
    if not player_ids:
        return meta
    ids = sorted({int(p) for p in player_ids if p})
    for start in range(0, len(ids), 200):
        chunk = ids[start:start + 200]
        filters = {"players": {"filterIds": {"value": chunk}, "limit": len(chunk)}}
        headers = {"x-fantasy-filter": json.dumps(filters)}
        data = None
        try:
            data = league.espn_request.league_get(params={"view": "kona_player_info"}, headers=headers)
        except Exception as e:  # noqa: BLE001
            log(f"  kona_player_info failed ({e}); trying players_wl")
        if not data or not data.get("players"):
            try:
                data = {"players": league.espn_request.get(extend="/players", params={"view": "players_wl"}, headers=headers)}
            except Exception as e:  # noqa: BLE001
                log(f"  players_wl failed too ({e})")
                continue
        for p in data.get("players", []) or []:
            info = player_from_entry(p, year)
            if info["playerId"]:
                meta[info["playerId"]] = info
    return meta


def download_logo(url: str, year: int, team_id: int) -> str | None:
    if not url or not url.startswith("http"):
        return None
    dest_dir = LOGO_DIR / str(year)
    dest_dir.mkdir(parents=True, exist_ok=True)
    existing = [p for p in dest_dir.glob(f"{team_id}.*") if p.suffix != ".url"]
    marker = dest_dir / f"{team_id}.url"
    if existing and marker.exists() and marker.read_text().strip() == url:
        return f"/logos/{year}/{existing[0].name}"
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        ctype = r.headers.get("content-type", "").lower()
        ext = "png"
        if "jpeg" in ctype or "jpg" in ctype or url.lower().endswith((".jpg", ".jpeg")):
            ext = "jpg"
        elif "gif" in ctype or url.lower().endswith(".gif"):
            ext = "gif"
        elif "svg" in ctype or url.lower().endswith(".svg"):
            ext = "svg"
        elif "webp" in ctype or url.lower().endswith(".webp"):
            ext = "webp"
        if len(r.content) < 100:
            return None
        for old in existing:
            old.unlink()
        (dest_dir / f"{team_id}.{ext}").write_bytes(r.content)
        marker.write_text(url)
        return f"/logos/{year}/{team_id}.{ext}"
    except Exception as e:  # noqa: BLE001
        log(f"  logo download failed for team {team_id} ({e})")
        return None


def fetch_season(year: int, existing: dict | None, with_boxscores: bool) -> dict | None:
    cookies = {}
    if ESPN_S2 and ESPN_SWID:
        cookies = {"espn_s2": ESPN_S2, "swid": ESPN_SWID}
    try:
        league = League(league_id=int(LEAGUE_ID), year=year, **cookies)
    except ESPNInvalidLeague:
        log(f"{year}: league does not exist for this season (skipping)")
        return None
    except ESPNAccessDenied as e:
        log(f"{year}: access denied ({e})")
        print(COOKIE_HELP, file=sys.stderr)
        raise
    except ESPNUnknownError as e:
        log(f"{year}: ESPN error {e} (skipping)")
        return None
    except (KeyError, TypeError) as e:
        log(f"{year}: ESPN returned an unexpected payload ({e!r}); season unavailable")
        return None

    warnings: list[str] = []
    settings = league.settings
    reg_weeks = settings.reg_season_count
    matchup_periods = {str(k): v for k, v in settings.matchup_periods.items()}
    total_matchup_periods = max(int(k) for k in matchup_periods) if matchup_periods else reg_weeks
    is_current = year >= current_season()
    current_mp = league.currentMatchupPeriod
    is_complete = (not is_current) or current_mp > total_matchup_periods

    members = [{"swid": m.get("id"), "firstName": m.get("firstName", ""), "lastName": m.get("lastName", ""),
                "displayName": m.get("displayName", "")} for m in league.members]

    # --- matchups (one call gives every week) ---
    matchups = []
    completed_weeks: set[int] = set()
    try:
        sched = league.espn_request.league_get(params={"view": "mMatchupScore"}).get("schedule", [])
    except Exception as e:  # noqa: BLE001
        sched = []
        warnings.append(f"mMatchupScore unavailable: {e}")
    for m in sched:
        home, away = m.get("home"), m.get("away")
        if not home or not away:
            continue  # bye
        week = m.get("matchupPeriodId")
        winner = m.get("winner", "UNDECIDED")
        hs = round(home.get("totalPoints", 0) or 0, 2)
        as_ = round(away.get("totalPoints", 0) or 0, 2)
        decided = winner in ("HOME", "AWAY", "TIE")
        if not decided and (hs + as_) > 0 and (is_complete or week < current_mp):
            decided = True
            winner = "TIE" if hs == as_ else ("HOME" if hs > as_ else "AWAY")
        if decided:
            completed_weeks.add(week)
        tier = m.get("playoffTierType", "NONE") or "NONE"
        matchups.append({"week": week, "homeTeamId": home["teamId"], "awayTeamId": away["teamId"],
                         "homeScore": hs, "awayScore": as_, "type": tier, "isPlayoff": tier != "NONE",
                         "winner": winner if decided else "UNDECIDED"})

    # --- teams ---
    teams = []
    for t in league.teams:
        logo_url = getattr(t, "logo_url", "") or ""
        roster = []
        for p in t.roster:
            roster.append({"playerId": p.playerId, "name": p.name, "position": p.position,
                           "proTeam": p.proTeam, "seasonPoints": round(p.total_points or 0, 2)})
        teams.append({
            "teamId": t.team_id, "name": t.team_name, "abbrev": t.team_abbrev,
            "ownerSwids": [o.get("id") for o in t.owners if o.get("id")],
            "wins": t.wins, "losses": t.losses, "ties": t.ties,
            "pointsFor": round(t.points_for, 2), "pointsAgainst": round(t.points_against, 2),
            "seed": t.standing, "finalRank": t.final_standing,
            "logoUrl": logo_url, "logo": download_logo(logo_url, year, t.team_id),
            "roster": roster,
        })
    if not members:
        warnings.append("ESPN returned no member list; owners must be mapped via owners.yml `teams:` overrides")

    # --- draft ---
    draft = []
    try:
        picks = league.draft
        missing_ids = [p.playerId for p in picks if not p.playerName]
        meta = fetch_player_meta(league, [p.playerId for p in picks], year) if picks else {}
        roster_meta = {p["playerId"]: p for t in teams for p in t["roster"]}
        for p in picks:
            info = meta.get(p.playerId) or roster_meta.get(p.playerId) or {}
            draft.append({
                "round": p.round_num, "pick": p.round_pick,
                "overall": (p.round_num - 1) * len(teams) + p.round_pick,
                "teamId": p.team.team_id if p.team else None,
                "playerId": p.playerId,
                "playerName": p.playerName or info.get("name", ""),
                "position": info.get("position", ""),
                "proTeam": info.get("proTeam", ""),
                "seasonPoints": info.get("seasonPoints"),
                "keeper": bool(p.keeper_status),
                "bid": p.bid_amount if p.bid_amount else None,
            })
        unresolved = sum(1 for d in draft if not d["playerName"])
        if picks and unresolved:
            warnings.append(f"{unresolved} of {len(draft)} draft picks could not be resolved to a player name")
        if not picks:
            warnings.append("ESPN returned no draft for this season")
        if missing_ids and not meta:
            warnings.append("player metadata endpoint unavailable for this season; positions/teams may be blank")
    except Exception as e:  # noqa: BLE001
        warnings.append(f"draft unavailable: {e}")

    # --- box scores (2019+) ---
    boxscores: dict[str, list] = {}
    if with_boxscores and year >= BOXSCORE_MIN_YEAR:
        prev = (existing or {}).get("boxscores", {}) if existing else {}
        cache: dict = {}
        for week in sorted(completed_weeks):
            if str(week) in prev and prev[str(week)]:
                boxscores[str(week)] = prev[str(week)]
                continue
            try:
                for bs in league.box_scores(week, player_team_cache=cache):
                    for side in ("home", "away"):
                        team = getattr(bs, f"{side}_team")
                        lineup = getattr(bs, f"{side}_lineup")
                        if not team or team == 0:
                            continue
                        boxscores.setdefault(str(week), []).append({
                            "teamId": team.team_id,
                            "players": [{"playerId": bp.playerId, "name": bp.name, "position": bp.position,
                                         "proTeam": bp.proTeam, "slot": bp.slot_position,
                                         "points": round(bp.points or 0, 2)} for bp in lineup],
                        })
                time.sleep(0.3)
            except Exception as e:  # noqa: BLE001
                warnings.append(f"box scores unavailable for week {week}: {e}")
                break

    return {
        "year": year,
        "leagueId": int(LEAGUE_ID),
        "source": "espn",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "settings": {"name": settings.name, "teamCount": settings.team_count, "regSeasonWeeks": reg_weeks,
                     "playoffTeamCount": settings.playoff_team_count, "scoringType": settings.scoring_type,
                     "isAuction": any(p.bid_amount for p in league.draft) if league.draft else False,
                     "matchupPeriods": matchup_periods},
        "status": {"currentWeek": league.current_week, "currentMatchupPeriod": current_mp,
                   "finalScoringPeriod": league.finalScoringPeriod, "isComplete": is_complete,
                   "completedWeeks": sorted(completed_weeks)},
        "members": members,
        "teams": teams,
        "matchups": matchups,
        "draft": draft,
        "boxscores": boxscores,
        "warnings": warnings,
    }


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true", help="refetch every season")
    ap.add_argument("--season", type=int, help="fetch one season")
    ap.add_argument("--no-boxscores", action="store_true")
    args = ap.parse_args(argv)

    if not LEAGUE_ID:
        print("ESPN_LEAGUE_ID is not set. Nothing to sync.", file=sys.stderr)
        return 2
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    cur = current_season()
    if args.season:
        years = [args.season]
    elif args.all:
        years = list(range(FIRST_SEASON, cur + 1))
    else:
        years = [cur]

    # A real sync replaces any sample data (raw seasons + generated logos).
    had_real = False
    for f in RAW_DIR.glob("*.json"):
        try:
            raw = json.loads(f.read_text())
        except Exception:  # noqa: BLE001
            continue
        if raw.get("source") == "sample":
            f.unlink()
            for logo in (LOGO_DIR / str(raw.get("year"))).glob("*.svg"):
                logo.unlink()
        else:
            had_real = True
    if not had_real and not args.season:
        log("no real seasons on disk yet: doing a full history fetch")
        years = list(range(FIRST_SEASON, cur + 1))

    failures = 0
    for year in years:
        path = RAW_DIR / f"{year}.json"
        existing = json.loads(path.read_text()) if path.exists() else None
        log(f"fetching {year} ...")
        try:
            season = fetch_season(year, existing, with_boxscores=not args.no_boxscores)
        except ESPNAccessDenied:
            return 3
        except Exception as e:  # noqa: BLE001
            log(f"{year}: failed: {e!r}")
            failures += 1
            continue
        if season is None:
            if year == cur:
                log(f"{year}: current season not available yet (league may not have drafted)")
            continue
        path.write_text(json.dumps(season, indent=1))
        log(f"{year}: {len(season['teams'])} teams, {len(season['matchups'])} matchups, "
            f"{len(season['draft'])} picks, {len(season['boxscores'])} box-score weeks; "
            f"warnings: {len(season['warnings'])}")
        time.sleep(0.5)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
