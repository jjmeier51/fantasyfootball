"""End-to-end checks on a tiny fixture league: owner merging, overrides, records, h2h, streaks."""
import json

import pytest
import yaml

import normalize
from stats.careers import build_careers
from stats.h2h import build_h2h
from stats.rankings import build_luck, build_team_seasons
from stats.records import build_records


def raw_season(year, teams, matchups, members, final_ranks=None, draft=None, complete=True):
    ts = []
    reg = [m for m in matchups if m[4] <= 2]  # ESPN team records cover the regular season only
    for tid, (name, swids) in enumerate(teams, start=1):
        matchups_all = matchups
        matchups = reg
        w = sum(1 for m in matchups if (m[0] == tid and m[2] > m[3]) or (m[1] == tid and m[3] > m[2]))
        l = sum(1 for m in matchups if (m[0] == tid and m[2] < m[3]) or (m[1] == tid and m[3] < m[2]))
        pf = sum(m[2] for m in matchups if m[0] == tid) + sum(m[3] for m in matchups if m[1] == tid)
        pa = sum(m[3] for m in matchups if m[0] == tid) + sum(m[2] for m in matchups if m[1] == tid)
        ts.append({"teamId": tid, "name": name, "abbrev": name[:3].upper(), "ownerSwids": swids, "wins": w, "losses": l,
                   "ties": 0, "pointsFor": pf, "pointsAgainst": pa, "seed": tid,
                   "finalRank": (final_ranks or {}).get(tid, 0), "logoUrl": "", "logo": None,
                   "roster": [{"playerId": 1, "name": "Some Guy", "position": "RB", "proTeam": "NYG", "seasonPoints": 100}]})
        matchups = matchups_all
    ms = [{"week": wk, "homeTeamId": h, "awayTeamId": a, "homeScore": hs, "awayScore": as_,
           "type": "WINNERS_BRACKET" if wk > 2 else "NONE", "isPlayoff": wk > 2,
           "winner": "HOME" if hs > as_ else "AWAY"} for (h, a, hs, as_, wk) in matchups]
    return {"year": year, "leagueId": 1, "source": "espn", "fetchedAt": "2026-01-01T00:00:00Z",
            "settings": {"name": "Test League", "teamCount": len(teams), "regSeasonWeeks": 2, "playoffTeamCount": 2,
                         "scoringType": "H2H", "isAuction": False, "matchupPeriods": {"1": [1], "2": [2], "3": [3]}},
            "status": {"currentWeek": 4, "currentMatchupPeriod": 4, "finalScoringPeriod": 3, "isComplete": complete,
                       "completedWeeks": [1, 2, 3]},
            "members": [{"swid": s, "firstName": f, "lastName": l, "displayName": f} for s, f, l in members],
            "teams": ts, "matchups": ms, "draft": draft or [], "boxscores": {}, "warnings": []}


@pytest.fixture
def league(tmp_path, monkeypatch):
    owners_file = tmp_path / "owners.yml"
    overrides = tmp_path / "overrides"
    overrides.mkdir()
    monkeypatch.setattr(normalize, "OWNERS_FILE", owners_file)
    monkeypatch.setattr(normalize, "OVERRIDES_DIR", overrides)
    members = [("{A1}", "Ann", "Able"), ("{A2}", "Ann", "Able"), ("{B}", "Bob", "Baker"),
               ("{C}", "Cat", "Cole"), ("{D}", "Dan", "Dole")]
    owners_file.write_text(yaml.safe_dump({"owners": [
        {"key": "ann", "name": "Ann", "swids": ["{A1}", "{A2}"]},
        {"key": "bob", "name": "Bob", "swids": ["{B}"]},
    ]}))
    # 2019: Ann (swid A1) as "Ann's Army"; 2020: Ann (swid A2) renamed "Able Bodies"
    s19 = raw_season(2019,
                     [("Ann's Army", ["{A1}"]), ("Bob Squad", ["{B}"]), ("Cats", ["{C}"]), ("Dans", ["{D}"])],
                     [(1, 2, 120.5, 100.0, 1), (3, 4, 90.0, 95.0, 1), (1, 3, 130.0, 80.0, 2), (2, 4, 101.0, 99.0, 2),
                      (1, 2, 150.0, 149.5, 3)],
                     members, final_ranks={1: 1, 2: 2, 3: 4, 4: 3})
    # 2020 has NO final standings from ESPN -> override supplies them
    s20 = raw_season(2020,
                     [("Able Bodies", ["{A2}"]), ("Bob Squad", ["{B}"]), ("Cats", ["{C}"]), ("Dans", ["{D}"])],
                     [(1, 2, 88.0, 110.0, 1), (3, 4, 70.0, 75.0, 1), (1, 3, 200.0, 60.0, 2), (2, 4, 105.0, 104.0, 2),
                      (2, 1, 120.0, 119.0, 3)],
                     members)
    s20["boxscores"] = {
        "1": [{"teamId": 1, "players": [{"playerId": 1, "name": "Some Guy", "position": "RB", "proTeam": "NYG", "slot": "RB", "points": 30.0},
                                        {"playerId": 7, "name": "Bench Guy", "position": "WR", "proTeam": "DAL", "slot": "BE", "points": 12.0}]}],
        "2": [{"teamId": 1, "players": [{"playerId": 1, "name": "Some Guy", "position": "RB", "proTeam": "NYG", "slot": "RB", "points": 25.5},
                                        {"playerId": 7, "name": "Bench Guy", "position": "WR", "proTeam": "DAL", "slot": "WR", "points": 40.0}]}],
    }
    (overrides / "2020.yml").write_text(yaml.safe_dump({
        "season": 2020, "champion": "bob", "runner_up": "ann", "final_standings": ["bob", "ann", "dan-dole", "cat-cole"],
        "champion_roster": [{"player": "Old Guy", "position": "QB", "nfl_team": "GB", "slot": "QB", "points": 20}],
    }))
    owner_map = normalize.OwnerMap(normalize.load_yaml(owners_file), real_data=True)
    seasons = [normalize.normalize_season(s19, owner_map), normalize.normalize_season(s20, owner_map)]
    owner_map.save()
    owners = normalize.build_owners(seasons, owner_map)
    return seasons, owners, owner_map


def test_owner_merge_across_swids_and_team_names(league):
    seasons, owners, owner_map = league
    ann = next(o for o in owners if o["key"] == "ann")
    assert ann["seasons"] == [2019, 2020]
    assert {v["name"] for v in ann["teamNames"].values()} == {"Ann's Army", "Able Bodies"}
    careers = build_careers(seasons, owners)
    c = next(c for c in careers if c["ownerKey"] == "ann")
    assert c["seasons"] == 2
    assert (c["wins"], c["losses"]) == (2 + 1, 0 + 1)
    assert c["titles"] == [2019] and c["runnerUps"] == [2020]


def test_unknown_swids_get_stubs(league):
    seasons, owners, owner_map = league
    keys = {o["key"] for o in owners}
    assert "cat-cole" in keys and "dan-dole" in keys
    assert any(o.get("auto") for o in owner_map.owners)


def test_override_supplies_standings_and_roster(league):
    seasons, owners, _ = league
    s20 = seasons[1]
    assert s20["honors"]["champion"] == "bob"
    assert s20["honors"]["runnerUp"] == "ann"
    assert s20["honors"]["lastPlace"] == "cat-cole"
    assert s20["championRosterSource"] == "override"
    assert s20["championRoster"][0]["name"] == "Old Guy"
    assert s20["coverage"]["fields"]["finalStandings"] == "full"
    assert s20["coverage"]["tier"] == "full"
    # 2019 title-week roster falls back to final roster since no box scores
    assert seasons[0]["championRosterSource"] == "final-roster"


def test_records_and_h2h(league):
    seasons, owners, _ = league
    careers = build_careers(seasons, owners)
    luck = build_luck(seasons)
    records = {r["id"]: r for r in build_records(seasons, careers, luck)}
    hi = records["high-score"]["entries"][0]
    assert hi["ownerKey"] == "ann" and hi["value"] == 200.0 and hi["year"] == 2020
    closest = records["closest"]["entries"][0]
    assert closest["value"] == 0.5
    h2h = build_h2h(seasons, owners)["matrix"]
    ab, ba = h2h["ann"]["bob"], h2h["bob"]["ann"]
    assert ab["games"] == ba["games"] == 4
    assert ab["wins"] == ba["losses"] and ab["losses"] == ba["wins"]
    assert ab["playoffWins"] == 1 and ab["playoffLosses"] == 1


def test_streaks_and_team_seasons(league):
    seasons, owners, _ = league
    careers = {c["ownerKey"]: c for c in build_careers(seasons, owners)}
    assert careers["ann"]["longestWinStreak"]["length"] == 3
    ts = build_team_seasons(seasons)
    assert ts[0]["ownerKey"] == "ann" and ts[0]["year"] == 2019 and ts[0]["result"] == "champion"


def test_goat_override_reranks(league):
    from stats.rankings import build_goat
    seasons, owners, _ = league
    careers = build_careers(seasons, owners)
    plain = build_goat(careers)
    assert plain[0]["ownerKey"] == "ann"
    boosted = build_goat(careers, {"bob": 999})
    assert boosted[0]["ownerKey"] == "bob" and boosted[0]["adjusted"] and boosted[0]["score"] == 999.0
    assert "override" in boosted[0]["components"]


def test_fact_filtering_hides_owner_but_not_lookalikes():
    from build_stats import filter_facts
    owners = [{"key": "brown", "name": "Brown"}, {"key": "ann", "name": "Ann"}]
    facts = [
        {"id": "a", "category": "x", "text": "Brown has won 2 titles.", "ownerKey": "brown"},
        {"id": "b", "category": "x", "text": "Ann has beaten Brown 5 straight times.", "ownerKey": "ann"},
        {"id": "c", "category": "x", "text": "Ann always picks Browns players.", "ownerKey": "ann"},
    ]
    out = filter_facts(facts, owners, {"hide_facts_for": ["brown"], "custom_facts": [{"id": "z", "text": "Hand written."}]})
    assert [f["id"] for f in out] == ["c", "z"]


def test_single_game_records_respect_cutoff(league, monkeypatch):
    import stats.records as rec
    seasons, owners, _ = league
    careers = build_careers(seasons, owners)
    monkeypatch.setattr(rec, "RECORD_MIN_YEAR", 2020)
    records = {r["id"]: r for r in rec.build_records(seasons, careers, build_luck(seasons))}
    assert all(e["year"] >= 2020 for e in records["high-score"]["entries"])
    assert any(e["year"] == 2019 for e in records["season-pf"]["entries"])  # season records keep history


def test_highlights_best_team_and_mvp(league):
    from stats.highlights import build_highlights
    seasons, owners, _ = league
    ts = build_team_seasons(seasons)
    hl, top, waiver = build_highlights(seasons, ts)
    ann = hl["ann"]
    assert ann["bestTeam"]["year"] == 2019 and ann["bestTeam"]["roster"][0]["name"] == "Some Guy"
    # 2019 has no box scores -> season totals (100); 2020 box scores -> rostered weeks: Some Guy 55.5, Bench Guy 52
    flex = ann["bestPlayers"]["flex"]
    assert flex["name"] == "Some Guy" and flex["year"] == 2019 and flex["source"] == "season-total" and flex["points"] == 100
    assert ann["bestPlayers"]["qb"] is None  # fixture has no quarterbacks
    rostered = [r for r in top if r["source"] == "rostered-weeks" and r["ownerKey"] == "ann"]
    assert {r["name"]: r["points"] for r in rostered} == {"Some Guy": 55.5, "Bench Guy": 52.0}
    assert all(r["weeks"] == 2 for r in rostered)


def test_waiver_pickups_are_undrafted_players(league):
    from stats.highlights import build_highlights
    seasons, owners, _ = league
    # 2020: draft Some Guy (id 1) so only Bench Guy (id 7) counts as a pickup
    seasons[1]["draft"] = [{"round": 1, "pick": 1, "overall": 1, "teamId": 1, "ownerKey": "ann", "playerId": 1,
                             "playerName": "Some Guy", "position": "RB", "proTeam": "NYG", "keeper": False, "bid": None}]
    hl, _, waiver = build_highlights(seasons, build_team_seasons(seasons))
    w = hl["ann"]["bestPlayers"]["waiver"]
    assert w["name"] == "Bench Guy" and w["points"] == 52.0 and w["year"] == 2020
    assert [r["year"] for r in waiver["byYear"]] == [2020]
    assert waiver["allTime"][0]["name"] == "Bench Guy"


def test_waiver_qb_needs_top3_finish(league):
    from stats.highlights import build_highlights
    seasons, owners, _ = league
    # 2019: give Cat's final roster an undrafted QB who is the only QB (rank 1 -> qualifies)
    cat = next(t for t in seasons[0]["teams"] if t["ownerKey"] == "cat-cole")
    cat["roster"].append({"playerId": 50, "name": "Waiver QB", "position": "QB", "proTeam": "KC", "seasonPoints": 300})
    seasons[0]["draft"] = [{"round": 1, "pick": 1, "overall": 1, "teamId": 1, "ownerKey": "ann", "playerId": 1,
                             "playerName": "Some Guy", "position": "RB", "proTeam": "NYG", "keeper": False, "bid": None}]
    hl, _, waiver = build_highlights(seasons, build_team_seasons(seasons))
    assert hl["cat-cole"]["bestPlayers"]["waiver"]["name"] == "Waiver QB"
    # add three better QBs on other rosters -> now QB4, no longer a pickup
    for i, t in enumerate(seasons[0]["teams"][:3]):
        t["roster"].append({"playerId": 60 + i, "name": f"Star QB {i}", "position": "QB", "proTeam": "BUF", "seasonPoints": 400 + i})
        seasons[0]["draft"].append({"round": 2, "pick": i + 1, "overall": 5 + i, "teamId": t["teamId"], "ownerKey": t["ownerKey"], "playerId": 60 + i,
                                    "playerName": f"Star QB {i}", "position": "QB", "proTeam": "BUF", "keeper": False, "bid": None})
    hl, _, waiver = build_highlights(seasons, build_team_seasons(seasons))
    assert hl["cat-cole"]["bestPlayers"]["waiver"] is None


def test_two_week_playoffs_and_decimal_ties(league, monkeypatch):
    import stats.records as rec
    from stats.common import team_games
    seasons, owners, _ = league
    s19 = seasons[0]
    # make 2019's playoff week a two-week matchup and add a decimal tie in week 1
    for m in s19["matchups"]:
        if m["week"] == 3:
            m["multiWeek"] = True
    s19["matchups"].append({"id": "2019-w1-tie", "week": 1, "isPlayoff": False, "type": "NONE", "multiWeek": False,
                            "home": {"teamId": 1, "ownerKey": "ann", "score": 101.5}, "away": {"teamId": 3, "ownerKey": "cat-cole", "score": 101.5},
                            "winnerKey": None, "decided": True})
    assert all(not g["multiWeek"] for g in team_games(s19))
    assert any(g["multiWeek"] for g in team_games(s19, include_multiweek=True))
    careers = build_careers(seasons, owners)
    ann = next(c for c in careers if c["ownerKey"] == "ann")
    assert ann["playoffWins"] == 1                      # the two-week final still counts as a playoff win
    assert ann["highWeek"]["value"] == 200.0            # ...but its 150.0 total never competes for high week
    monkeypatch.setattr(rec, "RECORD_MIN_YEAR", 2019)
    records = {r["id"]: r for r in rec.build_records(seasons, careers, build_luck(seasons))}
    closest = records["closest"]["entries"][0]
    assert closest["value"] == 0.0 and closest["score"] == 101.5   # decimal tie ranks first
    assert all(e["week"] != 3 or e["year"] != 2019 for e in records["high-score"]["entries"])
