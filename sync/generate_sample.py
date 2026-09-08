"""Generate a synthetic league (2010 -> current season) in the exact raw shape that
espn_sync.py writes, so the whole pipeline and website can be built and previewed
before real ESPN credentials are configured.

Run:  python sync/generate_sample.py
Everything it writes is flagged `source: "sample"`; the site shows a banner until a
real sync replaces it.
"""
from __future__ import annotations

import json
import random
from datetime import datetime, timezone
from pathlib import Path

import yaml

from config import (
    BOXSCORE_MIN_YEAR,
    FIRST_SEASON,
    LOGO_DIR,
    OWNERS_FILE,
    PRO_TEAM_MAP,
    RAW_DIR,
    current_season,
)

SEED = 2010
rng = random.Random(SEED)

# 12 fictional owners. Some change team names over the years; one changes ESPN accounts.
OWNERS = [
    ("Johnny", "Meier", ["Vick in a Box", "Johnny's Juggernauts", "Meier Time"]),
    ("Caleb", "Stone", ["Stone Cold Kickers", "Caleb's Crushers"]),
    ("Nick", "Alvarez", ["Big Blue Wrecking Crew", "G-Men Forever"]),
    ("Mike", "Chen", ["Kelce's Kingdom", "Chen Dynasty"]),
    ("Tyler", "Brooks", ["Brooks Was Here", "Show Me The Mahomes"]),
    ("Danny", "Russo", ["Russo's Rejects", "The Sacko Kings"]),
    ("Kevin", "O'Neil", ["Boston Tea Party", "O'Neil Deal"]),
    ("Brandon", "Hale", ["Hale Storm", "Hale Yeah"]),
    ("Eric", "Park", ["Park Place", "Boardwalk Empire"]),
    ("Sean", "Murphy", ["Murph's Turf", "Lawn Mower Rangers"]),
    ("Alex", "Rivera", ["Rivera's Roughnecks", "Bad Newz Bears"]),
    ("Chris", "Dunn", ["Dunn Deal", "Dunn & Dusted"]),
]

FIRST_NAMES = [
    "Marcus", "DeShawn", "Tyreek", "Jalen", "Josh", "Derrick", "Justin", "Lamar", "Travis",
    "Davante", "Cooper", "Saquon", "Christian", "Aaron", "Patrick", "Stefon", "Amari", "Nick",
    "Dalvin", "Ezekiel", "Julio", "Odell", "Adrian", "Calvin", "Antonio", "Rob", "Drew",
    "Russell", "Matt", "Kirk", "Jared", "Cam", "Alvin", "Austin", "George", "Mark", "Jonathan",
    "Kenneth", "Bijan", "Puka", "Garrett", "Sam", "Kyler", "Trevor", "Joe", "Jordan", "Dak",
    "Brock", "CeeDee", "Ja'Marr", "Tee", "Amon-Ra", "Nico", "Breece", "Kyren", "Rachaad",
]
LAST_NAMES = [
    "Johnson", "Williams", "Hill", "Hurts", "Allen", "Henry", "Jefferson", "Jackson", "Kelce",
    "Adams", "Kupp", "Barkley", "McCaffrey", "Rodgers", "Mahomes", "Diggs", "Cooper", "Chubb",
    "Cook", "Elliott", "Jones", "Beckham", "Peterson", "Ridley", "Brown", "Gronkowski", "Brees",
    "Wilson", "Ryan", "Cousins", "Goff", "Newton", "Kamara", "Ekeler", "Kittle", "Andrews",
    "Taylor", "Walker", "Robinson", "Nacua", "Wilson", "LaPorta", "Murray", "Lawrence", "Burrow",
    "Love", "Prescott", "Purdy", "Lamb", "Chase", "Higgins", "St. Brown", "Collins", "Hall",
    "Williams", "White",
]
POSITIONS = ["QB", "RB", "WR", "TE", "K", "D/ST"]
POS_WEIGHTS = [0.14, 0.28, 0.32, 0.12, 0.06, 0.08]
PRO_TEAMS = [abbr for tid, abbr in PRO_TEAM_MAP.items() if tid != 0]


def make_player_pool(n: int = 320) -> list[dict]:
    players = []
    used = set()
    pid = 10000
    while len(players) < n:
        pos = rng.choices(POSITIONS, POS_WEIGHTS)[0]
        team = rng.choice(PRO_TEAMS)
        if pos == "D/ST":
            name = f"{team} D/ST"
        else:
            name = f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"
        if name in used:
            continue
        used.add(name)
        pid += 1
        # Talent tier drives both draft position and weekly output.
        tier = rng.random()
        players.append({"playerId": pid, "name": name, "position": pos, "proTeam": team, "tier": tier})
    return players


PLAYER_POOL = make_player_pool()
POS_BASE = {"QB": 18, "RB": 11, "WR": 11, "TE": 7, "K": 8, "D/ST": 8}


def weekly_points(player: dict, r: random.Random) -> float:
    base = POS_BASE[player["position"]] * (0.6 + player["tier"])
    return round(max(0.0, r.gauss(base, base * 0.45)), 1)


def swid_for(index: int, variant: int = 0) -> str:
    return "{SAMPLE-%04d-%d}" % (index, variant)


def logo_svg(initials: str, color: str) -> str:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">'
        f'<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
        f'<stop offset="0" stop-color="{color}"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>'
        '<circle cx="64" cy="64" r="60" fill="url(#g)" stroke="#d4af37" stroke-width="4"/>'
        f'<text x="64" y="80" font-family="Impact, Arial Black, sans-serif" font-size="44" '
        f'text-anchor="middle" fill="#fff">{initials}</text></svg>'
    )


COLORS = ["#b91c1c", "#1d4ed8", "#047857", "#7c3aed", "#c2410c", "#0e7490", "#be123c",
          "#4d7c0f", "#6d28d9", "#0369a1", "#a16207", "#374151"]


def build_season(year: int, is_current: bool, completed_weeks_current: int) -> dict:
    r = random.Random(SEED + year)
    team_count = 12 if year >= 2012 else 10
    reg_weeks = 13 if year <= 2020 else 14
    playoff_teams = 6 if year >= 2014 else 4
    playoff_weeks = 3 if playoff_teams == 6 else 2
    total_weeks = reg_weeks + playoff_weeks
    owner_idx = list(range(team_count))

    # owner 11 (Chris) joined in 2012 with the league expansion; owner 10 changed ESPN accounts in 2016
    teams = []
    members = []
    for i in owner_idx:
        first, last, names = OWNERS[i]
        swid = swid_for(i, 1 if (i == 10 and year >= 2016) else 0)
        members.append({"swid": swid, "firstName": first, "lastName": last, "displayName": f"{first}{last[0]}"})
        # team name era: rotate names every ~5 seasons
        name = names[min(len(names) - 1, (year - 2010) // 5)]
        teams.append({
            "teamId": i + 1,
            "name": name,
            "abbrev": "".join(w[0] for w in name.split())[:4].upper(),
            "ownerSwids": [swid],
            "logoUrl": f"https://example.invalid/logos/{year}/{i+1}.svg",
            "logo": None,
            "strength": r.gauss(1.0, 0.12),
        })
    # Give each owner a "signature" draft tendency for the tendency facts
    # Caleb (1) drafts a K early, Nick (2) loves NYG, Mike (3) redrafts the same TE.
    # strength tilt for fun: Johnny is good, Danny is bad.
    for t in teams:
        if t["teamId"] == 1:
            t["strength"] += 0.10
        if t["teamId"] == 6:
            t["strength"] -= 0.12

    # ---- draft ---- (player pool evolves: tiers drift and ~12% of players turn over each year)
    year_pool = []
    for idx, p in enumerate(PLAYER_POOL):
        q = dict(p)
        drift = r.gauss(0, 0.18) + 0.06 * ((year + idx) % 5 - 2)
        q["tier"] = min(1.0, max(0.02, p["tier"] + drift))
        if r.random() < 0.12:
            q["tier"] = r.random() * 0.4  # a rookie/replacement-level year
        year_pool.append(q)
    pool = sorted(year_pool, key=lambda p: -p["tier"])
    available = pool[:]
    draft = []
    rounds = 16
    order = teams[:]
    r.shuffle(order)
    kelce = next(p for p in pool if p["position"] == "TE")
    for rd in range(1, rounds + 1):
        seq = order if rd % 2 == 1 else list(reversed(order))
        for pick_no, team in enumerate(seq, start=1):
            i = team["teamId"] - 1
            choice = None
            if i == 1 and rd == 5:  # Caleb takes a kicker in round 5 every year
                choice = next((p for p in available if p["position"] == "K"), None)
            elif i == 2 and rd <= 8 and r.random() < 0.55:  # Nick reaches for Giants
                choice = next((p for p in available if p["proTeam"] == "NYG"), None)
            elif i == 3 and rd == 3 and kelce in available:
                choice = kelce
            if choice is None:
                # best available with some noise, kickers/dst late
                window = [p for p in available[:12] if (rd >= 12 or p["position"] not in ("K", "D/ST"))]
                if not window:
                    window = available[:12]
                choice = r.choice(window)
            available.remove(choice)
            draft.append({
                "round": rd, "pick": pick_no, "overall": (rd - 1) * team_count + pick_no,
                "teamId": team["teamId"], "playerId": choice["playerId"], "playerName": choice["name"],
                "position": choice["position"], "proTeam": choice["proTeam"], "keeper": False, "bid": None,
            })
            team.setdefault("_roster", []).append(choice)

    # ---- schedule ----
    def round_robin(n: int):
        ids = list(range(1, n + 1))
        weeks = []
        for _ in range(n - 1):
            pairs = [(ids[k], ids[n - 1 - k]) for k in range(n // 2)]
            weeks.append(pairs)
            ids = [ids[0]] + [ids[-1]] + ids[1:-1]
        return weeks

    rr = round_robin(team_count)
    schedule_weeks = []
    while len(schedule_weeks) < reg_weeks:
        schedule_weeks.extend(rr)
    schedule_weeks = schedule_weeks[:reg_weeks]

    completed = completed_weeks_current if is_current else total_weeks
    matchups = []
    scores = {t["teamId"]: [] for t in teams}
    boxscores = {}
    lineup_slots = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "D/ST"]

    def team_week(team: dict, week: int):
        roster = team["_roster"]
        lines = []
        starters_taken = set()
        total = 0.0
        pts = {p["playerId"]: weekly_points(p, r) for p in roster}
        for slot in lineup_slots:
            elig = ["RB", "WR", "TE"] if slot == "FLEX" else [slot]
            cands = [p for p in roster if p["position"] in elig and p["playerId"] not in starters_taken]
            if not cands:
                continue
            best = max(cands, key=lambda p: pts[p["playerId"]] * (0.7 + 0.6 * r.random()))
            starters_taken.add(best["playerId"])
            lines.append({"playerId": best["playerId"], "name": best["name"], "position": best["position"],
                          "proTeam": best["proTeam"], "slot": slot, "points": pts[best["playerId"]]})
            total += pts[best["playerId"]]
        for p in roster:
            if p["playerId"] not in starters_taken:
                lines.append({"playerId": p["playerId"], "name": p["name"], "position": p["position"],
                              "proTeam": p["proTeam"], "slot": "BE", "points": pts[p["playerId"]]})
        total = round(total * team["strength"], 2)
        return total, lines

    for week in range(1, reg_weeks + 1):
        done = week <= completed
        for home_id, away_id in schedule_weeks[week - 1]:
            home = teams[home_id - 1]
            away = teams[away_id - 1]
            if done:
                hs, hl = team_week(home, week)
                as_, al = team_week(away, week)
                if hs == as_:
                    as_ += 0.1
                scores[home_id].append(hs)
                scores[away_id].append(as_)
                winner = "HOME" if hs > as_ else "AWAY"
                if year >= BOXSCORE_MIN_YEAR:
                    boxscores.setdefault(str(week), []).extend([
                        {"teamId": home_id, "players": hl}, {"teamId": away_id, "players": al}])
            else:
                hs = as_ = 0.0
                winner = "UNDECIDED"
            matchups.append({"week": week, "homeTeamId": home_id, "awayTeamId": away_id,
                             "homeScore": hs, "awayScore": as_, "type": "NONE", "isPlayoff": False,
                             "winner": winner})

    # standings after the regular season
    for t in teams:
        tid = t["teamId"]
        w = l = 0
        pf = sum(scores[tid])
        pa = 0.0
        for m in matchups:
            if m["winner"] == "UNDECIDED":
                continue
            if m["homeTeamId"] == tid:
                pa += m["awayScore"]
                w += m["winner"] == "HOME"
                l += m["winner"] == "AWAY"
            elif m["awayTeamId"] == tid:
                pa += m["homeScore"]
                w += m["winner"] == "AWAY"
                l += m["winner"] == "HOME"
        t.update({"wins": w, "losses": l, "ties": 0, "pointsFor": round(pf, 2), "pointsAgainst": round(pa, 2)})
    ranked = sorted(teams, key=lambda t: (-t["wins"], -t["pointsFor"]))
    for seed, t in enumerate(ranked, start=1):
        t["seed"] = seed

    final_ranks = {}
    if completed >= total_weeks:
        # playoffs: seeds 1..playoff_teams, byes for 6-team format
        alive = [t["teamId"] for t in ranked[:playoff_teams]]
        cons = [t["teamId"] for t in ranked[playoff_teams:]]
        week = reg_weeks + 1
        eliminated_order = []
        if playoff_teams == 6:
            # week 1: 3v6, 4v5; 1,2 bye
            pairs = [(alive[2], alive[5]), (alive[3], alive[4])]
            winners = []
            for h, a in pairs:
                hs, _ = team_week(teams[h - 1], week)
                as_, _ = team_week(teams[a - 1], week)
                if hs == as_:
                    as_ += 0.1
                matchups.append({"week": week, "homeTeamId": h, "awayTeamId": a, "homeScore": hs,
                                 "awayScore": as_, "type": "WINNERS_BRACKET", "isPlayoff": True,
                                 "winner": "HOME" if hs > as_ else "AWAY"})
                winners.append(h if hs > as_ else a)
                eliminated_order.append(a if hs > as_ else h)
            # consolation ladder (toilet bowl) for the bottom teams
            for h, a in [(cons[-1], cons[-2])] if len(cons) >= 2 else []:
                hs, _ = team_week(teams[h - 1], week)
                as_, _ = team_week(teams[a - 1], week)
                matchups.append({"week": week, "homeTeamId": h, "awayTeamId": a, "homeScore": hs,
                                 "awayScore": as_, "type": "LOSERS_CONSOLATION_LADDER", "isPlayoff": True,
                                 "winner": "HOME" if hs > as_ else "AWAY"})
            week += 1
            semis = [(alive[0], winners[1]), (alive[1], winners[0])]
        else:
            semis = [(alive[0], alive[3]), (alive[1], alive[2])]
        finalists = []
        third_place = []
        for h, a in semis:
            hs, _ = team_week(teams[h - 1], week)
            as_, _ = team_week(teams[a - 1], week)
            if hs == as_:
                as_ += 0.1
            matchups.append({"week": week, "homeTeamId": h, "awayTeamId": a, "homeScore": hs,
                             "awayScore": as_, "type": "WINNERS_BRACKET", "isPlayoff": True,
                             "winner": "HOME" if hs > as_ else "AWAY"})
            finalists.append(h if hs > as_ else a)
            third_place.append(a if hs > as_ else h)
        week += 1
        h, a = finalists
        hs, _ = team_week(teams[h - 1], week)
        as_, _ = team_week(teams[a - 1], week)
        if hs == as_:
            as_ += 0.1
        matchups.append({"week": week, "homeTeamId": h, "awayTeamId": a, "homeScore": hs,
                         "awayScore": as_, "type": "WINNERS_BRACKET", "isPlayoff": True,
                         "winner": "HOME" if hs > as_ else "AWAY"})
        champ = h if hs > as_ else a
        runner = a if champ == h else h
        h3, a3 = third_place
        h3s, _ = team_week(teams[h3 - 1], week)
        a3s, _ = team_week(teams[a3 - 1], week)
        matchups.append({"week": week, "homeTeamId": h3, "awayTeamId": a3, "homeScore": h3s,
                         "awayScore": a3s, "type": "WINNERS_CONSOLATION_LADDER", "isPlayoff": True,
                         "winner": "HOME" if h3s > a3s else "AWAY"})
        third = h3 if h3s > a3s else a3
        fourth = a3 if third == h3 else h3
        order_final = [champ, runner, third, fourth] + [t for t in eliminated_order] + cons
        # keep unique, preserve order
        seen = set()
        order_final = [x for x in order_final if not (x in seen or seen.add(x))]
        for rank, tid in enumerate(order_final, start=1):
            final_ranks[tid] = rank
        if year >= BOXSCORE_MIN_YEAR:
            for m in matchups:
                if m["isPlayoff"]:
                    for tid in (m["homeTeamId"], m["awayTeamId"]):
                        _, lines = team_week(teams[tid - 1], m["week"])
                        boxscores.setdefault(str(m["week"]), []).append({"teamId": tid, "players": lines})

    season_dir = LOGO_DIR / str(year)
    season_dir.mkdir(parents=True, exist_ok=True)
    for t in teams:
        i = t["teamId"] - 1
        initials = "".join(w[0] for w in t["name"].split())[:2].upper()
        path = season_dir / f"{t['teamId']}.svg"
        path.write_text(logo_svg(initials, COLORS[i % len(COLORS)]))
        t["logo"] = f"/logos/{year}/{t['teamId']}.svg"
        t["finalRank"] = final_ranks.get(t["teamId"], 0)
        roster = t.pop("_roster")
        r2 = random.Random(SEED + year * 100 + t["teamId"])
        t["roster"] = [{"playerId": p["playerId"], "name": p["name"], "position": p["position"],
                        "proTeam": p["proTeam"],
                        "seasonPoints": round(sum(weekly_points(p, r2) for _ in range(reg_weeks)), 1)}
                       for p in roster]
        t.pop("strength")
    season_pts = {p["playerId"]: p["seasonPoints"] for t in teams for p in t["roster"]}
    for d in draft:
        d["seasonPoints"] = season_pts.get(d["playerId"])

    # older-season data holes to exercise the coverage/override machinery
    warnings = []
    if year == 2010:
        draft = []
        warnings.append("ESPN returned no draft detail for 2010 (sample gap)")
    if year == 2011:
        for t in teams:
            t["finalRank"] = 0
        warnings.append("ESPN returned no final standings for 2011 (sample gap; see sync/overrides/2011.yml)")

    matchup_periods = {str(w): [w] for w in range(1, total_weeks + 1)}
    return {
        "year": year,
        "leagueId": 0,
        "source": "sample",
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "settings": {"name": "League of Gangstars", "teamCount": team_count, "regSeasonWeeks": reg_weeks,
                     "playoffTeamCount": playoff_teams, "scoringType": "H2H_POINTS", "isAuction": False,
                     "matchupPeriods": matchup_periods},
        "status": {"currentWeek": min(completed + 1, total_weeks), "currentMatchupPeriod": min(completed + 1, total_weeks),
                   "finalScoringPeriod": total_weeks, "isComplete": completed >= total_weeks,
                   "completedWeeks": list(range(1, completed + 1))},
        "members": members,
        "teams": teams,
        "matchups": matchups,
        "draft": draft,
        "boxscores": boxscores,
        "warnings": warnings,
    }


def write_sample_owners():
    """Ship a starter owners.yml (first-name display names) so the demo reads nicely."""
    if OWNERS_FILE.exists():
        existing = yaml.safe_load(OWNERS_FILE.read_text()) or {}
        if any(not o.get("sample") for o in existing.get("owners", [])):
            return  # real owners exist; never clobber
    owners = []
    for i, (first, last, _) in enumerate(OWNERS):
        swids = [swid_for(i, 0)] + ([swid_for(i, 1)] if i == 10 else [])
        owners.append({"key": first.lower(), "name": first, "swids": swids,
                       "color": COLORS[i % len(COLORS)], "active": True, "sample": True})
    OWNERS_FILE.write_text(
        "# Owner identity map. Each owner may have several ESPN accounts (swids) and\n"
        "# many team names over the years; all stats stick to the `key`.\n"
        "# Entries marked `sample: true` are demo data and are dropped once real ESPN data exists.\n"
        + yaml.safe_dump({"owners": owners}, sort_keys=False, allow_unicode=True)
    )


def write_sample_override():
    """Demonstrates filling a gap (2011 has no standings in the sample) from screenshots."""
    from config import OVERRIDES_DIR
    OVERRIDES_DIR.mkdir(exist_ok=True)
    path = OVERRIDES_DIR / "2011.yml"
    if path.exists():
        return
    path.write_text(
        "# Manual data for 2011, typed in from screenshots. Overrides always win over ESPN data.\n"
        "# Remove this file when using a real league (it is sample data).\n"
        "season: 2011\n"
        "sample: true\n"
        "champion: johnny\n"
        "runner_up: mike\n"
        "third: kevin\n"
        "last_place: danny\n"
        "final_standings: [johnny, mike, kevin, tyler, caleb, nick, brandon, eric, sean, danny]\n"
        "champion_roster:\n"
        "  - {player: \"Aaron Rodgers\", position: QB, nfl_team: GB, slot: QB, points: 31.2}\n"
        "  - {player: \"Arian Foster\", position: RB, nfl_team: HOU, slot: RB, points: 18.4}\n"
        "  - {player: \"Ray Rice\", position: RB, nfl_team: BAL, slot: RB, points: 22.0}\n"
        "  - {player: \"Calvin Johnson\", position: WR, nfl_team: DET, slot: WR, points: 27.9}\n"
        "  - {player: \"Wes Welker\", position: WR, nfl_team: NE, slot: WR, points: 14.1}\n"
        "  - {player: \"Rob Gronkowski\", position: TE, nfl_team: NE, slot: TE, points: 24.6}\n"
        "  - {player: \"Marshawn Lynch\", position: RB, nfl_team: SEA, slot: FLEX, points: 12.3}\n"
        "  - {player: \"Stephen Gostkowski\", position: K, nfl_team: NE, slot: K, points: 9.0}\n"
        "  - {player: \"49ers D/ST\", position: D/ST, nfl_team: SF, slot: D/ST, points: 11.0}\n"
    )


def main():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    cur = current_season()
    for year in range(FIRST_SEASON, cur + 1):
        season = build_season(year, is_current=(year == cur), completed_weeks_current=1)
        (RAW_DIR / f"{year}.json").write_text(json.dumps(season, indent=1))
        print(f"wrote sample season {year}: {len(season['teams'])} teams, {len(season['matchups'])} matchups")
    write_sample_owners()
    write_sample_override()


if __name__ == "__main__":
    main()
