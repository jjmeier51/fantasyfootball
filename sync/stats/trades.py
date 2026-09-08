"""Trade analysis: what each side actually got out of a trade.

For every two-team trade, each side's haul is the fantasy points the players it received went
on to score for their new owner over the rest of that season (starter or bench, from box
scores). The gap between the two hauls is how lopsided the trade turned out."""
from __future__ import annotations

from collections import defaultdict


def _points_after(season: dict, owner_key: str, player_id, from_week: int | None) -> tuple[float, int]:
    total, weeks = 0.0, 0
    for wk, entries in (season.get("boxscores") or {}).items():
        if from_week is not None and int(wk) < from_week:
            continue
        for e in entries:
            if e.get("ownerKey") != owner_key:
                continue
            for p in e.get("players", []):
                if p.get("playerId") == player_id:
                    total += p.get("points") or 0
                    weeks += 1
    return round(total, 2), weeks


def build_trades(seasons: list[dict], owners: list[dict]) -> dict:
    names = {o["key"]: o["name"] for o in owners}
    rows: list[dict] = []
    for s in seasons:
        team_names = {t["ownerKey"]: t["name"] for t in s["teams"]}
        for t in s.get("trades", []) or []:
            sides = []
            for side in t["sides"]:
                received = []
                for p in side["received"]:
                    pts, wks = _points_after(s, side["ownerKey"], p["playerId"], t.get("week"))
                    received.append(dict(p, points=pts, weeks=wks))
                sides.append({"ownerKey": side["ownerKey"], "name": names.get(side["ownerKey"], side["ownerKey"]),
                              "teamName": team_names.get(side["ownerKey"], ""), "received": received,
                              "points": round(sum(r["points"] for r in received), 2)})
            if not any(r for sd in sides for r in sd["received"]):
                continue
            a, b = sorted(sides, key=lambda x: -x["points"])
            rows.append({
                "id": t["id"], "year": s["year"], "week": t.get("week"), "date": t.get("date"),
                "winner": a, "loser": b, "margin": round(a["points"] - b["points"], 2),
                "scoredWeeks": len(s.get("boxscores") or {}),
            })
    rows.sort(key=lambda r: -r["margin"])
    for i, r in enumerate(rows, start=1):
        r["rank"] = i
    by_owner: dict[str, dict] = defaultdict(lambda: {"count": 0, "wins": 0, "losses": 0, "best": None, "bestNet": None, "worst": None, "netPoints": 0.0})
    for r in rows:
        w, l = r["winner"]["ownerKey"], r["loser"]["ownerKey"]
        for k, won in ((w, True), (l, False)):
            d = by_owner[k]
            d["count"] += 1
            d["wins" if won else "losses"] += 1
            d["netPoints"] = round(d["netPoints"] + (r["margin"] if won else -r["margin"]), 2)
            net = r["margin"] if won else -r["margin"]
            if d["best"] is None or net > d["bestNet"]:
                d["best"], d["bestNet"] = r, net
            if not won and (d["worst"] is None or r["margin"] > d["worst"]["margin"]):
                d["worst"] = r
    return {"all": rows, "byOwner": dict(by_owner), "seasonsCovered": sorted({s["year"] for s in seasons if s.get("trades")})}
