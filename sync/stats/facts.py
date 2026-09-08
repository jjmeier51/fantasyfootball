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

    def add(fid, text, category="league", tone="neutral", **kw):
        facts.append({"id": fid, "category": category, "text": text, "tone": tone, **kw})

    # --- titles
    for c in careers:
        t = len(c["titles"])
        if t >= 2:
            yrs = ", ".join(str(y) for y in c["titles"])
            add(f"titles-{c['ownerKey']}", f"{N(c['ownerKey'])} has won {t} championships ({yrs}).", "trophies", ownerKey=c["ownerKey"], href="/trophy-room", tone="positive")
        if len(c["runnerUps"]) >= 2:
            add(f"runnerups-{c['ownerKey']}", f"{N(c['ownerKey'])} has lost {len(c['runnerUps'])} championship games. Always the bridesmaid.", "trophies", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}", tone="negative")
        if c["seasons"] >= 5 and not c["titles"] and not c["runnerUps"]:
            add(f"no-final-{c['ownerKey']}", f"In {c['seasons']} seasons, {N(c['ownerKey'])} has never played in a championship game.", "trophies", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}", tone="negative")
        if c["seasons"] >= 5 and not c["playoffApps"]:
            add(f"no-playoffs-{c['ownerKey']}", f"{N(c['ownerKey'])} has never made the playoffs in {c['seasons']} seasons.", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}", tone="negative")
        if len(c["lastPlaces"]) >= 2:
            add(f"sacko-{c['ownerKey']}", f"{N(c['ownerKey'])} has finished dead last {len(c['lastPlaces'])} times ({', '.join(map(str, c['lastPlaces']))}).", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}", tone="negative")
        if c["titles"] and c["lastPlaces"]:
            add(f"both-{c['ownerKey']}", f"{N(c['ownerKey'])} has both won a title ({c['titles'][0]}) and finished last ({c['lastPlaces'][0]}). Range.", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}", tone="neutral")
        if c["longestWinStreak"] and c["longestWinStreak"]["length"] >= 7:
            st = c["longestWinStreak"]
            add(f"streak-{c['ownerKey']}", f"{N(c['ownerKey'])} once won {st['length']} straight games ({st['start']['year']} week {st['start']['week']} to {st['end']['year']} week {st['end']['week']}).", "streaks", ownerKey=c["ownerKey"], href="/records#streaks", tone="positive")
        if c["longestLossStreak"] and c["longestLossStreak"]["length"] >= 7:
            st = c["longestLossStreak"]
            add(f"lstreak-{c['ownerKey']}", f"{N(c['ownerKey'])} lost {st['length']} in a row starting in {st['start']['year']}. Dark times.", "streaks", ownerKey=c["ownerKey"], href="/records#streaks", tone="negative")
        if c["gamesPlayed"] >= 40 and abs(c["luck"]) >= 4:
            word = "luckier" if c["luck"] > 0 else "unluckier"
            add(f"luck-{c['ownerKey']}", f"Based on all-play records, {N(c['ownerKey'])} has been {abs(c['luck']):.1f} wins {word} than their scoring deserves.", "oddities", tone="positive" if c["luck"] > 0 else "negative", ownerKey=c["ownerKey"], href="/rankings#luck")
        if len(c["regSeasonTitles"]) >= 2 and len(c["titles"]) < len(c["regSeasonTitles"]):
            add(f"regchamp-{c['ownerKey']}", f"{N(c['ownerKey'])} has had the best regular-season record {len(c['regSeasonTitles'])} times but only {len(c['titles'])} title{'s' if len(c['titles']) != 1 else ''} to show for it.", "oddities", ownerKey=c["ownerKey"], href=f"/owners/{c['ownerKey']}", tone="negative")

    # --- title games
    for s in complete:
        champ, ru = s["honors"].get("champion"), s["honors"].get("runnerUp")
        if not champ:
            continue
        finals = [g for g in team_games(s) if g["isPlayoff"] and g["ownerKey"] == champ and g["oppKey"] == ru]
        if finals:
            g = max(finals, key=lambda g: g["week"])
            if 0 < g["margin"] <= 3:
                add(f"close-final-{s['year']}", f"The {s['year']} championship was decided by {g['margin']:.2f} points: {N(champ)} over {N(ru)}.", "trophies", year=s["year"], href=f"/seasons/{s['year']}", tone="neutral")
            if g["margin"] >= 50:
                add(f"blowout-final-{s['year']}", f"{N(champ)} won the {s['year']} title by {g['margin']:.1f} points. {N(ru)} never had a chance.", "trophies", year=s["year"], href=f"/seasons/{s['year']}", tone="neutral")
        ct = next((t for t in s["teams"] if t["ownerKey"] == champ), None)
        if ct and ct.get("seed") and ct["seed"] >= 5:
            add(f"low-seed-{s['year']}", f"{N(champ)} won the {s['year']} title as the {ordinal(ct['seed'])} seed.", "trophies", year=s["year"], ownerKey=champ, href=f"/seasons/{s['year']}", tone="positive")
        if ct and s["honors"].get("topScorer") and s["honors"]["topScorer"] != champ:
            add(f"not-top-{s['year']}", f"In {s['year']}, {N(s['honors']['topScorer'])} outscored everyone, but {N(champ)} took the trophy.", "oddities", year=s["year"], href=f"/seasons/{s['year']}", tone="neutral")

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
        add("curse", f"Defending champions finish {avg:.1f} on average the following year. {len(repeats)} of {len(curse)} have repeated.", "trophies", href="/trophy-room", tone="neutral")
        worst = max(curse, key=lambda c: c[2])
        if worst[2] >= len(complete[0]["teams"]) - 1:
            add("curse-worst", f"After winning in {worst[0]}, {N(worst[1])} finished {ordinal(worst[2])} the next season. The hangover was real.", "oddities", ownerKey=worst[1], href=f"/owners/{worst[1]}", tone="negative")
    for a, b, c in ((curse[i][1], curse[i][0], curse[i]) for i in range(len(curse))):
        pass
    back_to_back = [(complete[i]["year"], complete[i]["honors"]["champion"]) for i in range(1, len(complete))
                    if complete[i]["honors"].get("champion") and complete[i]["honors"]["champion"] == complete[i - 1]["honors"].get("champion")]
    for y, k in back_to_back:
        add(f"b2b-{y}", f"{N(k)} went back-to-back, winning in {y - 1} and {y}.", "trophies", ownerKey=k, year=y, href="/trophy-room", tone="positive")

    # --- records highlights
    def top(rid):
        r = rec.get(rid)
        return r["entries"][0] if r and r["entries"] else None

    e = top("high-score")
    if e:
        add("rec-high", f"The highest score in league history is {e['value']:.2f} by {N(e['ownerKey'])} ({e['year']} week {e['week']}).", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records", tone="positive")
    e = top("low-score")
    if e:
        add("rec-low", f"The lowest score ever posted was {e['value']:.2f} by {N(e['ownerKey'])} in {e['year']} week {e['week']}.", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records", tone="negative")
    e = top("points-in-loss")
    if e:
        add("rec-loss", f"{N(e['ownerKey'])} scored {e['value']:.2f} in {e['year']} week {e['week']} and still lost to {N(e['oppKey'])} ({e['oppScore']:.2f}).", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records#oddities", tone="negative")
    e = top("fewest-in-win")
    if e:
        add("rec-ugly", f"{N(e['ownerKey'])} won a game with just {e['value']:.2f} points in {e['year']} week {e['week']}.", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records#oddities", tone="neutral")
    e = top("closest")
    if e:
        add("rec-closest", f"The closest game ever: {N(e['ownerKey'])} beat {N(e['oppKey'])} by {e['value']:.2f} in {e['year']} week {e['week']}.", "records", year=e["year"], href="/records", tone="neutral")
    e = top("blowout")
    if e:
        add("rec-blowout", f"Biggest blowout: {N(e['ownerKey'])} crushed {N(e['oppKey'])} by {e['value']:.1f} points in {e['year']} week {e['week']}.", "records", year=e["year"], href="/records", tone="neutral")
    e = top("season-pf")
    if e:
        add("rec-season", f"The {e['year']} {e['teamName']} ({N(e['ownerKey'])}) scored {e['value']:.1f} points, the most ever in a season.", "records", ownerKey=e["ownerKey"], year=e["year"], href="/records#season", tone="positive")
    e = top("best-record-no-title")
    if e and e["value"] >= 0.75:
        add("rec-no-title", f"{N(e['ownerKey'])} went {e['record']} in {e['year']} and did not win the title.", "oddities", ownerKey=e["ownerKey"], year=e["year"], href="/records#oddities", tone="negative")

    # --- rivalries
    mat = h2h["matrix"]
    pairs = []
    for a in mat:
        for b, cell in mat[a].items():
            if a < b and cell["games"] >= 5:
                pairs.append((a, b, cell))
    if pairs:
        most = max(pairs, key=lambda p: p[2]["games"])
        add("rival-most", f"{N(most[0])} and {N(most[1])} have met {most[2]['games']} times, more than any other pair.", "rivalries", href=f"/head-to-head?a={most[0]}&b={most[1]}", tone="neutral")
        for a, b, cell in pairs:
            w, l = cell["wins"], cell["losses"]
            if l == 0 and w >= 5:
                add(f"own-{a}-{b}", f"{N(a)} has never lost to {N(b)} ({w}-0).", "rivalries", ownerKey=a, href=f"/head-to-head?a={a}&b={b}", tone="positive")
            elif w == 0 and l >= 5:
                add(f"own-{b}-{a}", f"{N(b)} has never lost to {N(a)} ({l}-0).", "rivalries", ownerKey=b, href=f"/head-to-head?a={a}&b={b}", tone="positive")
            elif w + l >= 10 and abs(w - l) <= 1:
                add(f"even-{a}-{b}", f"{N(a)} vs {N(b)} is as even as it gets: {w}-{l} all time.", "rivalries", href=f"/head-to-head?a={a}&b={b}", tone="neutral")
            if cell["streak"] and cell["streak"]["length"] >= 5:
                winner = a if cell["streak"]["type"] == "W" else b
                loser = b if winner == a else a
                add(f"rstreak-{a}-{b}", f"{N(winner)} has beaten {N(loser)} {cell['streak']['length']} straight times.", "rivalries", ownerKey=winner, href=f"/head-to-head?a={a}&b={b}", tone="positive")
            if cell["playoffWins"] + cell["playoffLosses"] >= 3:
                add(f"po-{a}-{b}", f"{N(a)} and {N(b)} have met {cell['playoffWins'] + cell['playoffLosses']} times in the playoffs ({N(a)} leads {cell['playoffWins']}-{cell['playoffLosses']})." if cell["playoffWins"] >= cell["playoffLosses"] else
                    f"{N(a)} and {N(b)} have met {cell['playoffWins'] + cell['playoffLosses']} times in the playoffs ({N(b)} leads {cell['playoffLosses']}-{cell['playoffWins']}).", "rivalries", href=f"/head-to-head?a={a}&b={b}", tone="neutral")

    # --- best team-season
    if team_seasons:
        best = team_seasons[0]
        add("best-team", f"The best team performance of all time: the {best['year']} {best['teamName']} ({N(best['ownerKey'])}), {best['wins']}-{best['losses']} with {best['pointsFor']:.1f} points.", "records", ownerKey=best["ownerKey"], year=best["year"], href="/rankings", tone="positive")
        best_missed = next((r for r in team_seasons if r["result"] == "missed"), None)
        if best_missed and best_missed["rank"] <= 25:
            add("best-missed", f"The {best_missed['year']} {best_missed['teamName']} ranks {ordinal(best_missed['rank'])} all-time and still missed the playoffs.", "oddities", ownerKey=best_missed["ownerKey"], year=best_missed["year"], href="/rankings", tone="negative")

    # --- luck
    if luck_rows:
        done = [r for r in luck_rows if r["isComplete"]]
        if done:
            lucky = max(done, key=lambda r: r["luck"])
            unlucky = min(done, key=lambda r: r["luck"])
            add("luckiest", f"{N(lucky['ownerKey'])}'s {lucky['year']} team went {lucky['wins']}-{lucky['losses']} despite an all-play record of {lucky['allPlay']}. Schedule luck.", "oddities", ownerKey=lucky["ownerKey"], year=lucky["year"], href="/rankings#luck", tone="positive")
            add("unluckiest", f"{N(unlucky['ownerKey'])} was robbed in {unlucky['year']}: {unlucky['wins']}-{unlucky['losses']} with an all-play record of {unlucky['allPlay']}.", "oddities", ownerKey=unlucky["ownerKey"], year=unlucky["year"], href="/rankings#luck", tone="negative")

    # --- league-wide
    if complete:
        total_games = sum(1 for s in seasons for m in s["matchups"] if m["decided"])
        total_points = sum(m["home"]["score"] + m["away"]["score"] for s in seasons for m in s["matchups"] if m["decided"])
        add("totals", f"Since {seasons[0]['year']}, this league has played {total_games:,} games and scored {total_points:,.0f} fantasy points.", "league", href="/matchups", tone="neutral")
        champs = Counter(s["honors"]["champion"] for s in complete if s["honors"].get("champion"))
        if champs:
            distinct = len(champs)
            add("distinct", f"{distinct} different owners have won a championship in {len(complete)} completed seasons.", "trophies", href="/trophy-room", tone="neutral")
        never = [c for c in careers if c["seasons"] >= 3 and not c["titles"]]
        if never:
            longest = max(never, key=lambda c: c["seasons"])
            add("drought", f"{N(longest['ownerKey'])} owns the longest title drought: {longest['seasons']} seasons and counting.", "oddities", ownerKey=longest["ownerKey"], href=f"/owners/{longest['ownerKey']}", tone="negative")
        # most team names
        rename = max(owners, key=lambda o: len({v["name"] for v in o["teamNames"].values()}), default=None)
        if rename and len({v["name"] for v in rename["teamNames"].values()}) >= 3:
            n = len({v["name"] for v in rename["teamNames"].values()})
            add("renames", f"{N(rename['key'])} has used {n} different team names. Identity crisis or branding genius?", "league", ownerKey=rename["key"], href=f"/owners/{rename['key']}", tone="neutral")

    # dedupe by id
    seen = set()
    out = []
    for f in facts:
        if f["id"] in seen:
            continue
        seen.add(f["id"])
        out.append(f)
    return out


def positive_pool(seasons: list[dict], owners: list[dict], careers: list[dict], h2h: dict,
                  team_seasons: list[dict], greatest_picks: list[dict]) -> dict[str, list[dict]]:
    """Ordered candidate 'brag' facts per owner. Every owner who has played gets several, so the
    build can guarantee a couple of positive facts even for owners whose history is mostly grim."""
    names = {o["key"]: o["name"] for o in owners}
    N = lambda k: names.get(k, k)  # noqa: E731
    pool: dict[str, list[dict]] = {}
    champs = {s["year"]: s["honors"].get("champion") for s in seasons}
    ppg_rank = {c["ownerKey"]: i + 1 for i, c in enumerate(sorted([x for x in careers if x["gamesPlayed"] >= 20], key=lambda x: -x["ppg"]))}
    for c in careers:
        k = c["ownerKey"]
        if c["gamesPlayed"] == 0:
            continue
        out: list[dict] = []

        def add(fid, text, category="league", **kw):
            out.append({"id": fid, "category": category, "text": text, "tone": "positive", "ownerKey": k, **kw})

        best = next((t for t in team_seasons if t["ownerKey"] == k), None)
        if best:
            rank_clause = f", the {ordinal(best['rank'])}-best team-season in league history" if best["rank"] <= 25 else ""
            add(f"pos-best-season-{k}", f"{N(k)}'s best team was the {best['year']} {best['teamName']}: {best['wins']}-{best['losses']} with {best['pointsFor']:.1f} points{rank_clause}.", "records", year=best["year"], href="/rankings")
        hw = c.get("highWeek")
        if hw:
            add(f"pos-high-week-{k}", f"{N(k)}'s best week ever: {hw['value']:.2f} points against {N(hw['oppKey'])} in {hw['year']} week {hw['week']}.", "records", year=hw["year"], href=f"/owners/{k}")
        cells = [(opp, v) for opp, v in (h2h["matrix"].get(k) or {}).items() if (v["wins"] + v["losses"]) >= 4]
        if cells:
            opp, v = max(cells, key=lambda kv: (kv[1]["wins"] / (kv[1]["wins"] + kv[1]["losses"]), kv[1]["wins"]))
            if v["wins"] / (v["wins"] + v["losses"]) >= 0.65:
                extra = f", including {v['playoffWins']} playoff win{'s' if v['playoffWins'] != 1 else ''}" if v["playoffWins"] else ""
                add(f"pos-owns-{k}", f"{N(k)} owns {N(opp)}: {v['wins']}-{v['losses']} all time{extra}.", "rivalries", href=f"/head-to-head?a={k}&b={opp}")
        bw = c.get("biggestWin")
        if bw and bw["value"] >= 40:
            add(f"pos-big-win-{k}", f"{N(k)}'s biggest beatdown: a {bw['value']:.1f}-point win over {N(bw['oppKey'])} in {bw['year']} week {bw['week']}.", "records", year=bw["year"], href=f"/owners/{k}")
        gp = next((g for g in greatest_picks if g["ownerKey"] == k), None)
        if gp:
            add(f"pos-pick-{k}", f"{N(k)}'s best draft pick: {gp['player']}, the {ordinal(gp['posDraftRank'])} {gp['position']} taken in {gp['year']}, who finished as the {gp['position']}{gp['posFinishRank']}.", "draft", year=gp["year"], href="/drafts")
        if c["playoffApps"] and len(c["playoffApps"]) >= max(2, c["seasons"] // 2):
            add(f"pos-playoffs-{k}", f"{N(k)} has made the playoffs in {len(c['playoffApps'])} of {c['seasons']} seasons.", "trophies", href=f"/owners/{k}")
        if c["playoffWins"] >= 3:
            add(f"pos-playoff-wins-{k}", f"{N(k)} has {c['playoffWins']} career playoff wins.", "trophies", href=f"/owners/{k}")
        giant = 0
        for s in seasons:
            ch = champs.get(s["year"])
            if not ch or ch == k:
                continue
            for g in team_games(s):
                if g["ownerKey"] == k and g["oppKey"] == ch and g["won"] and not g["isPlayoff"]:
                    giant += 1
        if giant >= 3:
            add(f"pos-giant-{k}", f"{N(k)} has beaten the eventual champion {giant} times in the regular season. Giant killer.", "oddities", href=f"/owners/{k}")
        if c["weeksTop"] >= 5:
            add(f"pos-weeks-top-{k}", f"{N(k)} has been the league's top scorer in {c['weeksTop']} different weeks.", "records", href=f"/owners/{k}")
        st = c.get("longestWinStreak")
        if st and 5 <= st["length"] < 7:
            add(f"pos-streak-{k}", f"{N(k)} once won {st['length']} straight games ({st['start']['year']} week {st['start']['week']} to {st['end']['year']} week {st['end']['week']}).", "streaks", href=f"/owners/{k}")
        if ppg_rank.get(k, 99) <= 5:
            add(f"pos-ppg-{k}", f"{N(k)} averages {c['ppg']:.1f} points per game, {ordinal(ppg_rank[k])}-best in league history.", "records", href="/records#career")
        pool[k] = out
    return pool
