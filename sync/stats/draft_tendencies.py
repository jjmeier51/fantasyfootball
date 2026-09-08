"""Draft habits per owner: position timing, NFL-team loyalty, player loyalty, steals and busts."""
from __future__ import annotations

from collections import Counter, defaultdict

from config import PRO_TEAM_NAMES

KEY_POSITIONS = ["K", "D/ST", "QB", "TE"]
LOYALTY_ENDINGS = [
    "Some habits are permanent.",
    "That's a relationship at this point.",
    "Old flames die hard.",
    "Someone check on him.",
    "Commitment issues, solved.",
    "Ride or die.",
    "The group chat has noticed.",
    "Muscle memory.",
    "He'd draft him again tomorrow.",
    "No notes.",
]


def build_draft_tendencies(seasons: list[dict], owners: list[dict]) -> dict:
    keys = {o["key"] for o in owners}
    names = {o["key"]: o["name"] for o in owners}
    drafts = [s for s in seasons if s["draft"] and any(p.get("position") for p in s["draft"])]
    per_owner = defaultdict(lambda: {
        "drafts": 0, "picks": 0, "teamCounts": Counter(), "playerCounts": Counter(), "playerNames": {},
        "firstPosRound": defaultdict(list), "firstToDraft": Counter(), "top3": Counter(), "picksByRound": defaultdict(list),
    })
    league_team_counts = Counter()
    league_picks = 0
    league_first_round = defaultdict(list)
    league_first_to = Counter()
    player_drafted = Counter()
    player_names = {}
    per_owner_team_years = defaultdict(lambda: defaultdict(set))

    for s in drafts:
        picks = sorted([p for p in s["draft"] if p.get("ownerKey") in keys], key=lambda p: (p["round"], p["pick"]))
        owners_in = {p["ownerKey"] for p in picks}
        for k in owners_in:
            per_owner[k]["drafts"] += 1
        seen_first = set()
        first_pos_by_owner = defaultdict(dict)
        for p in picks:
            k, pos, team = p["ownerKey"], p.get("position") or "", p.get("proTeam") or ""
            o = per_owner[k]
            o["picks"] += 1
            league_picks += 1
            if team and team != "FA":
                o["teamCounts"][team] += 1
                league_team_counts[team] += 1
                per_owner_team_years[k][team].add(s["year"])
            if p.get("playerId"):
                o["playerCounts"][p["playerId"]] += 1
                o["playerNames"][p["playerId"]] = p.get("playerName") or ""
                player_drafted[p["playerId"]] += 1
                player_names[p["playerId"]] = p.get("playerName") or ""
            if pos in KEY_POSITIONS and pos not in first_pos_by_owner[k]:
                first_pos_by_owner[k][pos] = p["round"]
                o["firstPosRound"][pos].append(p["round"])
                league_first_round[pos].append(p["round"])
                if pos not in seen_first:
                    seen_first.add(pos)
                    o["firstToDraft"][pos] += 1
                    league_first_to[pos] += 1
            if p["round"] <= 3 and pos:
                o["top3"][pos] += 1
            o["picksByRound"][p["round"]].append(pos)

    facts = []
    profiles = {}
    n_drafts = len(drafts)
    league_avg_first = {pos: (sum(v) / len(v) if v else None) for pos, v in league_first_round.items()}
    pos_word = {"K": "kicker", "D/ST": "defense", "QB": "quarterback", "TE": "tight end"}

    for idx, (k, o) in enumerate(sorted(per_owner.items())):
        if o["drafts"] == 0:
            continue
        name = names.get(k, k)
        prof = {"drafts": o["drafts"], "picks": o["picks"], "facts": []}
        # position timing
        for pos in KEY_POSITIONS:
            cnt = o["firstToDraft"][pos]
            rounds = o["firstPosRound"][pos]
            avg = sum(rounds) / len(rounds) if rounds else None
            prof[f"first{pos.replace('/', '')}Round"] = round(avg, 1) if avg else None
            prof[f"firstTo{pos.replace('/', '')}"] = cnt
            if cnt >= 3 and cnt >= 0.4 * o["drafts"]:
                facts.append({"id": f"first-{pos}-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{name} has been the first to draft a {pos_word[pos]} in {cnt} of {o['drafts']} drafts.",
                              "href": f"/owners/{k}#draft"})
            if avg and league_avg_first.get(pos) and o["drafts"] >= 3:
                diff = league_avg_first[pos] - avg
                if diff >= 2.0:
                    facts.append({"id": f"early-{pos}-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                                  "text": f"{name} takes a {pos_word[pos]} in round {avg:.1f} on average, {diff:.1f} rounds earlier than the league.",
                                  "href": f"/owners/{k}#draft"})
                elif diff <= -2.0:
                    facts.append({"id": f"late-{pos}-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                                  "text": f"{name} waits on {pos_word[pos]}s: round {avg:.1f} on average, {abs(diff):.1f} rounds later than the league.",
                                  "href": f"/owners/{k}#draft"})
        # NFL-team loyalty
        if o["teamCounts"]:
            team, cnt = o["teamCounts"].most_common(1)[0]
            pct = cnt / o["picks"]
            league_pct = league_team_counts[team] / league_picks if league_picks else 0
            years = sorted(per_owner_team_years[k][team])
            # consecutive drafts with at least one pick from that team
            best = cur = 0
            prev = None
            for y in years:
                cur = cur + 1 if prev is not None and y == prev + 1 else 1
                best = max(best, cur)
                prev = y
            prof["favoriteTeam"] = {"team": team, "name": PRO_TEAM_NAMES.get(team, team), "picks": cnt,
                                    "pct": round(100 * pct, 1), "leaguePct": round(100 * league_pct, 1), "streak": best}
            if cnt >= 6 and league_pct and pct >= 2.2 * league_pct:
                facts.append({"id": f"team-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{round(100 * pct)}% of {name}'s draft picks have been {PRO_TEAM_NAMES.get(team, team)} (league average {round(100 * league_pct)}%). {name} always picks {PRO_TEAM_NAMES.get(team, team)} players for some reason.",
                              "href": f"/owners/{k}#draft"})
            elif best >= 5:
                facts.append({"id": f"team-streak-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{name} has drafted at least one {PRO_TEAM_NAMES.get(team, team)} player in {best} straight drafts.",
                              "href": f"/owners/{k}#draft"})
        # player loyalty
        if o["playerCounts"]:
            pid, cnt = o["playerCounts"].most_common(1)[0]
            pname = o["playerNames"].get(pid) or "the same player"
            prof["mostDraftedPlayer"] = {"name": pname, "times": cnt}
            if cnt >= 3:
                facts.append({"id": f"player-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{name} has drafted {pname} {cnt} times. {LOYALTY_ENDINGS[idx % len(LOYALTY_ENDINGS)]}",
                              "href": f"/owners/{k}#draft"})
        # positional makeup of rounds 1-3
        tot = sum(o["top3"].values())
        if tot:
            mix = {pos: round(100 * c / tot) for pos, c in o["top3"].most_common()}
            prof["earlyRoundMix"] = mix
            rb, wr = mix.get("RB", 0), mix.get("WR", 0)
            if rb >= 65 and o["drafts"] >= 3:
                facts.append({"id": f"rb-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{rb}% of {name}'s first three-round picks have been running backs. Ground and pound.",
                              "href": f"/owners/{k}#draft"})
            elif wr >= 60 and o["drafts"] >= 3:
                facts.append({"id": f"wr-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{name} goes wide receiver early: {wr}% of their first three-round picks are WRs.",
                              "href": f"/owners/{k}#draft"})
            qb_rounds = o["firstPosRound"]["QB"]
            if qb_rounds and min(qb_rounds) >= 6 and len(qb_rounds) >= 3:
                facts.append({"id": f"qb-wait-{k}", "category": "draft", "tone": "neutral", "ownerKey": k,
                              "text": f"{name} has never taken a quarterback before round {min(qb_rounds)}.",
                              "href": f"/owners/{k}#draft"})
        profiles[k] = prof

    # league-wide: most drafted player
    if player_drafted:
        pid, cnt = player_drafted.most_common(1)[0]
        if cnt >= 3:
            facts.append({"id": "most-drafted", "category": "draft", "tone": "neutral",
                          "text": f"{player_names.get(pid) or 'One player'} is the most drafted player in league history, taken {cnt} times.",
                          "href": "/drafts"})

    # steals and busts (seasons with season points on picks)
    steals, busts = [], []
    for s in drafts:
        picks = [p for p in s["draft"] if p.get("seasonPoints") is not None and p.get("ownerKey") in keys]
        if len(picks) < 20:
            continue
        ranked = sorted(picks, key=lambda p: -(p["seasonPoints"] or 0))
        finish_rank = {p["playerId"]: i + 1 for i, p in enumerate(ranked)}
        for p in picks:
            diff = p["overall"] - finish_rank[p["playerId"]]
            row = {"ownerKey": p["ownerKey"], "year": s["year"], "player": p["playerName"], "position": p.get("position"),
                   "proTeam": p.get("proTeam"), "round": p["round"], "overall": p["overall"],
                   "seasonPoints": p["seasonPoints"], "finishRank": finish_rank[p["playerId"]], "value": diff}
            steals.append(row)
            if p["round"] <= 3:
                busts.append(row)
    for f in facts:
        if f.get("ownerKey") in profiles:
            profiles[f["ownerKey"]]["facts"].append(f["text"])
    steals.sort(key=lambda r: -r["value"])
    busts.sort(key=lambda r: r["value"])

    # Greatest picks of all time: skill players only. Compare where a player was taken among
    # his position (e.g. the 41st RB drafted) with where he finished among his position that
    # season (e.g. RB4). Only starter-caliber finishes count, so the list is real hits, not
    # late-round quarterbacks padding raw points.
    STARTER_CUTOFF = {"QB": 8, "TE": 8, "RB": 14, "WR": 14}
    greatest = []
    for s in drafts:
        picks = [p for p in s["draft"] if p.get("seasonPoints") is not None and p.get("ownerKey") in keys
                 and p.get("position") in STARTER_CUTOFF]
        if len(picks) < 20:
            continue
        ranked = sorted(picks, key=lambda p: -(p["seasonPoints"] or 0))
        finish = {p["playerId"]: i + 1 for i, p in enumerate(ranked)}
        pos_finish, pos_draft = {}, {}
        for pos in STARTER_CUTOFF:
            for i, p in enumerate([q for q in ranked if q["position"] == pos]):
                pos_finish[p["playerId"]] = i + 1
            for i, p in enumerate(sorted([q for q in picks if q["position"] == pos], key=lambda q: q["overall"])):
                pos_draft[p["playerId"]] = i + 1
        for p in picks:
            pf, pd = pos_finish[p["playerId"]], pos_draft[p["playerId"]]
            if pf > STARTER_CUTOFF[p["position"]]:
                continue
            greatest.append({
                "ownerKey": p["ownerKey"], "year": s["year"], "player": p["playerName"], "position": p["position"],
                "proTeam": p.get("proTeam"), "round": p["round"], "overall": p["overall"], "seasonPoints": p["seasonPoints"],
                "finishRank": finish[p["playerId"]], "posFinishRank": pf, "posDraftRank": pd,
                "value": pd - pf,
            })
    greatest.sort(key=lambda r: (-r["value"], -r["seasonPoints"]))
    for i, r in enumerate(greatest[:15], start=1):
        r["rank"] = i
    return {"profiles": profiles, "facts": facts, "steals": steals[:15], "busts": busts[:15],
            "greatest": greatest[:15], "draftsAnalyzed": n_drafts}
