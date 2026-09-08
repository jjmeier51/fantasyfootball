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


def fetch_week_starts(league: League) -> dict[str, int]:
    """Earliest NFL kickoff (ms epoch) per scoring period, used to place dated events in a week."""
    starts: dict[str, int] = {}
    try:
        for games_by_period in league._get_all_pro_schedule().values():
            for period, games in (games_by_period or {}).items():
                for g in games or []:
                    d = g.get("date")
                    if d and (str(period) not in starts or d < starts[str(period)]):
                        starts[str(period)] = d
    except Exception as e:  # noqa: BLE001
        log(f"  pro schedule unavailable ({e}); trade weeks will be approximate")
    return starts


def _trades_from_activity(league: League) -> list[dict]:
    """Trades from the league activity feed. ESPN only serves this for the current season."""
    filters = {"topics": {"filterType": {"value": ["ACTIVITY_TRANSACTIONS"]}, "limit": 500, "limitPerMessageSet": {"value": 50},
                          "offset": 0, "sortMessageDate": {"sortPriority": 1, "sortAsc": False},
                          "sortFor": {"sortPriority": 2, "sortAsc": False}, "filterIncludeMessageTypeIds": {"value": [244]}}}
    data = league.espn_request.league_get(extend="/communication/", params={"view": "kona_league_communication"},
                                          headers={"x-fantasy-filter": json.dumps(filters)})
    trades = []
    for topic in data.get("topics", []) or []:
        items = []
        for msg in topic.get("messages", []) or []:
            if msg.get("messageTypeId") != 244:
                continue
            items.append({"playerId": msg.get("targetId"), "fromTeamId": msg.get("from"), "toTeamId": msg.get("to")})
        if items:
            trades.append({"id": topic.get("id"), "date": topic.get("date"), "week": None, "items": items, "source": "activity"})
    return trades


def _trades_from_transactions(league: League, final_period: int) -> list[dict]:
    """Trades from the league transaction ledger (mTransactions2), which persists for past seasons."""
    filters = {"transactions": {"filterType": {"value": ["TRADE_ACCEPT", "TRADE_UPHOLD"]}}}
    headers = {"x-fantasy-filter": json.dumps(filters)}
    seen: dict = {}

    def ingest(data):
        for tx in data.get("transactions", []) or []:
            if tx.get("status") not in (None, "EXECUTED"):
                continue
            if tx.get("type") not in ("TRADE_ACCEPT", "TRADE_UPHOLD"):
                continue
            tid = tx.get("id") or f"{tx.get('scoringPeriodId')}-{tx.get('proposedDate')}"
            if tid in seen:
                continue
            players: dict = {}
            for it in tx.get("items", []) or []:
                pid = it.get("playerId")
                if not pid:
                    continue
                rec = players.setdefault(pid, {"playerId": pid, "fromTeamId": None, "toTeamId": None})
                if it.get("fromTeamId"):
                    rec["fromTeamId"] = it["fromTeamId"]
                if it.get("toTeamId"):
                    rec["toTeamId"] = it["toTeamId"]
                if it.get("type") == "DROP" and not rec["fromTeamId"]:
                    rec["fromTeamId"] = tx.get("teamId")
                if it.get("type") == "ADD" and not rec["toTeamId"]:
                    rec["toTeamId"] = tx.get("teamId")
            items = [r for r in players.values() if r["fromTeamId"] and r["toTeamId"] and r["fromTeamId"] != r["toTeamId"]]
            if items:
                seen[tid] = {"id": tid, "date": tx.get("processDate") or tx.get("proposedDate"),
                             "week": tx.get("scoringPeriodId"), "items": items, "source": "transactions"}

    # one unfiltered-by-week call first; some seasons return everything at once
    ingest(league.espn_request.league_get(params={"view": "mTransactions2"}, headers=headers))
    if not seen:
        for week in range(1, final_period + 1):
            try:
                ingest(league.espn_request.league_get(params={"view": "mTransactions2", "scoringPeriodId": week}, headers=headers))
            except Exception:  # noqa: BLE001
                break
            time.sleep(0.15)
    return list(seen.values())


def fetch_trades(league: League, year: int) -> tuple[list[dict], list[str]]:
    """Every completed two-team trade for a season (2019+), plus warnings about what failed."""
    if year < 2019:
        return [], []
    notes: list[str] = []
    try:
        trades = _trades_from_transactions(league, league.finalScoringPeriod or 17)
        if trades:
            return trades, notes
        notes.append("transaction ledger returned no trades")
    except Exception as e:  # noqa: BLE001
        notes.append(f"transaction ledger unavailable: {e}")
    try:
        trades = _trades_from_activity(league)
        return trades, notes
    except Exception as e:  # noqa: BLE001
        notes.append(f"activity feed unavailable: {e}")
        return [], notes


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
                           "proTeam": p.proTeam, "seasonPoints": round(p.total_points or 0, 2),
                           "acquisitionType": getattr(p, "acquisitionType", None) or None})
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

    # --- trades (2019+) ---
    trades: list[dict] = []
    week_starts: dict[str, int] = {}
    if year >= 2019:
        try:
            trades, trade_notes = fetch_trades(league, year)
            if trade_notes and not trades:
                warnings.append("trade history unavailable: " + "; ".join(trade_notes))
            week_starts = fetch_week_starts(league)
            meta = fetch_player_meta(league, [it["playerId"] for t in trades for it in t["items"]], year) if trades else {}
            roster_meta = {p["playerId"]: p for t in teams for p in t["roster"]}
            for t in trades:
                for it in t["items"]:
                    info = meta.get(it["playerId"]) or roster_meta.get(it["playerId"]) or {}
                    it.update({"name": info.get("name", ""), "position": info.get("position", ""), "proTeam": info.get("proTeam", "")})
        except Exception as e:  # noqa: BLE001
            warnings.append(f"trade history unavailable: {e}")

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
                                         "points": round(bp.points or 0, 2),
                                         "acquisitionType": getattr(bp, "acquisitionType", None) or None} for bp in lineup],
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
                   "completedWeeks": sorted(completed_weeks), "weekStarts": week_starts},
        "members": members,
        "teams": teams,
        "matchups": matchups,
        "draft": draft,
        "boxscores": boxscores,
        "trades": trades,
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
            f"{len(season['draft'])} picks, {len(season['boxscores'])} box-score weeks, {len(season['trades'])} trades; "
            f"warnings: {len(season['warnings'])}")
        time.sleep(0.5)
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
