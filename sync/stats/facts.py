"""Templated fun facts. Each generator returns dicts: {id, category, text, ownerKey?, year?, href?}."""
from __future__ import annotations

from collections import Counter, defaultdict

from .common import PLAYOFF_TYPES, ordinal, team_games, team_name


def build_facts(seasons: list[dict], owners: list[dict], careers: list[dict], records: list[dict],
                h2h: dict, team_seasons: list[dict], luck_rows: list[dict]) -> list[dict]:
    names = {o["key"]: o["name"] for o in owners}
    N = lambda k: names.get(k, k)  # noqa: E731
    facts: list[dict] = []
    complete = [s for s in seasons if s["isComplete"]]
    cars = {c["ownerKey"]: c for c in careers}
    rec = {r["id"]: r for r in records}

    def add(fid, text, category="league", **kw):
        facts.append({"id": fid, "category": category, "text": text, **kw})

    # --- titles
    for c in careers:
        t = len(c["titles"])
        if t >= 2:
            yrs = ", ".join(str(y) for y in c["titles"])
            add(f"titles-{c['ownerKey']}", f"{N(c['ownerKey'])} has won {t} championships ({yrs}).", "trophies", ownerKey=c["ownerKey"], href="/trophy-room")
        if len(c["runnerUps"]) >= 2:
            add(f"runnerups-{c['ownerKey']}", f"{N(c['ownerKey'])} has lost {len(c['runnerUps'])} championship games. Always the bridesmaid.", "trophies", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}")
        if c["seasons"] >= 5 and not c["titles"] and not c["runnerUps"]:
            add(f"no-final-{c['ownerKey']}", f"In {c['seasons']} seasons, {N(c['ownerKey'])} has never played in a championship game.", "trophies", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}")
        if c["seasons"] >= 5 and not c["playoffApps"]:
            add(f"no-playoffs-{c['ownerKey']}", f"{N(c['ownerKey'])} has never made the playoffs in {c['seasons']} seasons.", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}")
        if len(c["lastPlaces"]) >= 2:
            add(f"sacko-{c['ownerKey']}", f"{N(c['ownerKey'])} has finished dead last {len(c['lastPlaces'])} times ({', '.join(map(str, c['lastPlaces']))}).", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}")
        if c["titles"] and c["lastPlaces"]:
            add(f"both-{c['ownerKey']}", f"{N(c['ownerKey'])} has both won a title ({c['titles'][0]}) and finished last ({c['lastPlaces'][0]}). Range.", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}")
        if c["longestWinStreak"] and c["longestWinStreak"]["length"] >= 7:
            st = c["longestWinStreak"]
            add(f"streak-{c['ownerKey']}", f"{N(c['ownerKey'])} once won {st['length']} straight games ({st['start']['year']} week {st['start']['week']} to {st['end']['year']} week {st['end']['week']}).", "streaks", ownerKey=c["ownerKey"], href="/records#streaks")
        if c["longestLossStreak"] and c["longestLossStreak"]["length"] >= 7:
            st = c["longestLossStreak"]
            add(f"lstreak-{c['ownerKey']}", f"{N(c['ownerKey'])} lost {st['length']} in a row starting in {st['start']['year']}. Dark times.", "streaks", ownerKey=c["ownerKey"], href="/records#streaks")
        if c["gamesPlayed"] >= 40 and abs(c["luck"]) >= 4:
            word = "luckier" if c["luck"] > 0 else "unluckier"
            add(f"luck-{c['ownerKey']}", f"Based on all-play records, {N(c['ownerKey'])} has been {abs(c['luck']):.1f} wins {word} than their scoring deserves.", "oddities", ownerKey=c["ownerKey"], href="/rankings#luck")
        if len(c["regSeasonTitles"]) >= 2 and len(c["titles"]) < len(c["regSeasonTitles"]):
            add(f"regchamp-{c['ownerKey']}", f"{N(c['ownerKey'])} has had the best regular-season record {len(c['regSeasonTitles'])} times but only {len(c['titles'])} title{'s' if len(c['titles']) != 1 else ''} to show for it.", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}")

    # --- title games
    for s in complete:
        champ, ru = s["honors"].get("champion"), s["honors"].get("runnerUp")
        if not champ:
            continue
        finals = [g for g in team_games(s) if g["isPlayoff"] and g["ownerKey"] == champ and g["oppKey"] == ru]
        if finals:
            g = max(finals, key=lambda g: g["week"])
            if 0 < g["margin"] <= 3:
                add(f"close-final-{s['year']}", f"The {s['year']} championship was decided by {g['margin']:.2f} points: {N(champ)} over {N(ru)}.", "trophies", year=s["year"], href=f"/seasons/{s['year']}")
            if g["margin"] >= 50:
                add(f"blowout-final-{s['year']}", f"{N(champ)} won the {s['year']} title by {g['margin']:.1f} points. {N(ru)} never had a chance.", "trophies", year=s["year"], href=f"/seasons/{s['year']}")
        ct = next((t for t in s["teams"] if t["ownerKey"] == champ), None)
        if ct and ct.get("seed") and ct["seed"] >= 5:
            add(f"low-seed-{s['year']}", f"{N(champ)} won the {s['year']} title as the {ordinal(ct['seed'])} seed.", "trophies", year=s["year"], ownerKey=champ, href=f"/seasons/{s['year']}")
        if ct and s["honors"].get("topScorer") and s["honors"]["topScorer"] != champ:
            add(f"not-top-{s['year']}", f"In {s['year']}, {N(s['honors']['topScorer'])} outscored everyone, but {N(champ)} took the trophy.", "oddities", year=s["year"], href=f"/seasons/{s['year']}")

    # champion's curse: how champions did the following year
    curse = []
    for i, s in enumerate(complete[:-1]):
        champ = s["honors"].get("champion")
        nxt = complete[i + 1]
        if not champ or nxt["year"] != s["year"] + 1:
            continue
        t = next((t for t in nxt["teams"] if t["ownerKey"] == champ), None)
        if t and t.get("finalRank"):
            curse.append((s["year"], champ, t["finalRank"], t["wins"], t["losses"]))
    if len(curse) >= 3:
        avg = sum(c[2] for c in curse) / len(curse)
        repeats = [c for c in curse if c[2] == 1]
        add("curse", f"Defending champions finish {avg:.1f} on average the following year. {len(repeats)} of {len(curse)} have repeated.", "trophies", href="/trophy-room")
        worst = max(curse, key=lambda c: c[2])
        if worst[2] >= len(complete[0]["teams"]) - 1:
            add("curse-worst", f"After winning in {worst[0]}, {N(worst[1])} finished {ordinal(worst[2])} the next season. The hangover was real.", "oddities", ownerKey=worst[1], href=f"/owners/{worst[1]}")
    for a, b, c in ((curse[i][1], curse[i][0], curse[i]) for i in range(len(curse))):
        pass
    back_to_back = [(complete[i]["year"], complete[i]["honors"]["champion"]) for i in range(1, len(complete))
                    if complete[i]["honors"].get("champion") and complete[i]["honors"]["champion"] == complete[i - 1]["honors"].get("champion")]
    for y, k in back_to_back:
        add(f"b2b-{y}", f"{N(k)} went back-to-back, winning in {y - 1} and {y}.", "trophies", ownerKey=k, year=y, href="/trophy-room")

    # --- records highlights
    def top(rid):
        r = rec.get(rid)
        return r["entries"][0] if r and r["entries"] else None

    e = top("high-score")
    if e:
        add("rec-high", f"The highest score in league history is {e['value']:.2f} by {N(e['ownerKey'])} ({e['year']} week {e['week']}).", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records")
    e = top("low-score")
    if e:
        add("rec-low", f"The lowest score ever posted was {e['value']:.2f} by {N(e['ownerKey'])} in {e['year']} week {e['week']}.", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records")
    e = top("points-in-loss")
    if e:
        add("rec-loss", f"{N(e['ownerKey'])} scored {e['value']:.2f} in {e['year']} week {e['week']} and still lost to {N(e['oppKey'])} ({e['oppScore']:.2f}).", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records#oddities")
    e = top("fewest-in-win")
    if e:
        add("rec-ugly", f"{N(e['ownerKey'])} won a game with just {e['value']:.2f} points in {e['year']} week {e['week']}.", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records#oddities")
    e = top("closest")
    if e:
        add("rec-closest", f"The closest game ever: {N(e['ownerKey'])} beat {N(e['oppKey'])} by {e['value']:.2f} in {e['year']} week {e['week']}.", "records", year=e["year"], href="/records")
    e = top("blowout")
    if e:
        add("rec-blowout", f"Biggest blowout: {N(e['ownerKey'])} crushed {N(e['oppKey'])} by {e['value']:.1f} points in {e['year']} week {e['week']}.", "records", year=e["year"], href="/records")
    e = top("season-pf")
    if e:
        add("rec-season", f"The {e['year']} {e['teamName']} ({N(e['ownerKey'])}) scored {e['value']:.1f} points, the most ever in a season.", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records#season")
    e = top("best-record-no-title")
    if e and e["value"] >= 0.75:
        add("rec-no-title", f"{N(e['ownerKey'])} went {e['record']} in {e['year']} and did not win the title.", "oddities", ownerKey=e["ownerKey"], year=e["year"], href="/records#oddities")

    # --- rivalries
    mat = h2h["matrix"]
    pairs = []
    for a in mat:
        for b, cell in mat[a].items():
            if a < b and cell["games"] >= 5:
                pairs.append((a, b, cell))
    if pairs:
        most = max(pairs, key=lambda p: p[2]["games"])
        add("rival-most", f"{N(most[0])} and {N(most[1])} have met {most[2]['games']} times, more than any other pair.", "rivalries", href=f"/head-to-head?a={most[0]}&b={most[1]}")
        for a, b, cell in pairs:
            w, l = cell["wins"], cell["losses"]
            if l == 0 and w >= 5:
                add(f"own-{a}-{b}", f"{N(a)} has never lost to {N(b)} ({w}-0).", "rivalries", ownerKey=a, href=f"/head-to-head?a={a}&b={b}")
            elif w == 0 and l >= 5:
                add(f"own-{b}-{a}", f"{N(b)} has never lost to {N(a)} ({l}-0).", "rivalries", ownerKey=b, href=f"/head-to-head?a={a}&b={b}")
            elif w + l >= 10 and abs(w - l) <= 1:
                add(f"even-{a}-{b}", f"{N(a)} vs {N(b)} is as even as it gets: {w}-{l} all time.", "rivalries", href=f"/head-to-head?a={a}&b={b}")
            if cell["streak"] and cell["streak"]["length"] >= 5:
                winner = a if cell["streak"]["type"] == "W" else b
                loser = b if winner == a else a
                add(f"rstreak-{a}-{b}", f"{N(winner)} has beaten {N(loser)} {cell['streak']['length']} straight times.", "rivalries", ownerKey=winner, href=f"/head-to-head?a={a}&b={b}")
            if cell["playoffWins"] + cell["playoffLosses"] >= 3:
                add(f"po-{a}-{b}", f"{N(a)} and {N(b)} have met {cell['playoffWins'] + cell['playoffLosses']} times in the playoffs ({N(a)} leads {cell['playoffWins']}-{cell['playoffLosses']})." if cell["playoffWins"] >= cell["playoffLosses"] else
                    f"{N(a)} and {N(b)} have met {cell['playoffWins'] + cell['playoffLosses']} times in the playoffs ({N(b)} leads {cell['playoffLosses']}-{cell['playoffWins']}).", "rivalries", href=f"/head-to-head?a={a}&b={b}")

    # --- best team-season
    if team_seasons:
        best = team_seasons[0]
        add("best-team", f"The best team performance of all time: the {best['year']} {best['teamName']} ({N(best['ownerKey'])}), {best['wins']}-{best['losses']} with {best['pointsFor']:.1f} points.", "records", ownerKey=best["ownerKey"], year=best["year"], href="/rankings")
        best_missed = next((r for r in team_seasons if r["result"] == "missed"), None)
        if best_missed and best_missed["rank"] <= 25:
            add("best-missed", f"The {best_missed['year']} {best_missed['teamName']} ranks {ordinal(best_missed['rank'])} all-time and still missed the playoffs.", "oddities", ownerKey=best_missed["ownerKey"], year=best_missed["year"], href="/rankings")

    # --- luck
    if luck_rows:
        done = [r for r in luck_rows if r["isComplete"]]
        if done:
            lucky = max(done, key=lambda r: r["luck"])
            unlucky = min(done, key=lambda r: r["luck"])
            add("luckiest", f"{N(lucky['ownerKey'])}'s {lucky['year']} team went {lucky['wins']}-{lucky['losses']} despite an all-play record of {lucky['allPlay']}. Schedule luck.", "oddities", ownerKey=lucky["ownerKey"], year=lucky["year"], href="/rankings#luck")
            add("unluckiest", f"{N(unlucky['ownerKey'])} was robbed in {unlucky['year']}: {unlucky['wins']}-{unlucky['losses']} with an all-play record of {unlucky['allPlay']}.", "oddities", ownerKey=unlucky["ownerKey"], year=unlucky["year"], href="/rankings#luck")

    # --- league-wide
    if complete:
        total_games = sum(1 for s in seasons for m in s["matchups"] if m["decided"])
        total_points = sum(m["home"]["score"] + m["away"]["score"] for s in seasons for m in s["matchups"] if m["decided"])
        add("totals", f"Since {seasons[0]['year']}, this league has played {total_games:,} games and scored {total_points:,.0f} fantasy points.", "league", href="/matchups")
        champs = Counter(s["honors"]["champion"] for s in complete if s["honors"].get("champion"))
        if champs:
            distinct = len(champs)
            add("distinct", f"{distinct} different owners have won a championship in {len(complete)} completed seasons.", "trophies", href="/trophy-room")
        never = [c for c in careers if c["seasons"] >= 3 and not c["titles"]]
        if never:
            longest = max(never, key=lambda c: c["seasons"])
            add("drought", f"{N(longest['ownerKey'])} owns the longest title drought: {longest['seasons']} seasons and counting.", "oddities", ownerKey=longest["ownerKey"], href=f"/owners/{longest['ownerKey']}")
        # most team names
        rename = max(owners, key=lambda o: len({v["name"] for v in o["teamNames"].values()}), default=None)
        if rename and len({v["name"] for v in rename["teamNames"].values()}) >= 3:
            n = len({v["name"] for v in rename["teamNames"].values()})
            add("renames", f"{N(rename['key'])} has used {n} different team names. Identity crisis or branding genius?", "league", ownerKey=rename["key"], href=f"/owners/{rename['key']}")

    # dedupe by id
    seen = set()
    out = []
    for f in facts:
        if f["id"] in seen:
            continue
        seen.add(f["id"])
        out.append(f)
    return out
