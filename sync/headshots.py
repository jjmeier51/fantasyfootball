"""Download player headshots from ESPN's public CDN into public/headshots/.

ESPN serves headshots by the same playerId the league data uses. D/ST entries get the
team logo instead. Files already on disk are never re-fetched; failures return None so the
site falls back to a monogram badge.
"""
from __future__ import annotations

import time

import requests

from config import PUBLIC_DIR

HEADSHOT_DIR = PUBLIC_DIR / "headshots"
HEADSHOT_URL = "https://a.espncdn.com/i/headshots/nfl/players/full/{id}.png"
TEAM_LOGO_URL = "https://a.espncdn.com/i/teamlogos/nfl/500/{abbr}.png"


def _target(player: dict) -> tuple[str, str] | None:
    if player.get("position") == "D/ST":
        abbr = (player.get("proTeam") or "").lower()
        if not abbr or abbr == "fa":
            return None
        return TEAM_LOGO_URL.format(abbr=abbr), f"dst-{abbr}.png"
    pid = player.get("playerId")
    if not pid:
        return None
    return HEADSHOT_URL.format(id=pid), f"{pid}.png"


def download_headshots(players: list[dict], enabled: bool = True) -> dict[str, str | None]:
    """Map each player's key (playerId or dst-abbr) to a local /headshots path, or None."""
    HEADSHOT_DIR.mkdir(parents=True, exist_ok=True)
    out: dict[str, str | None] = {}
    for p in players:
        t = _target(p)
        if not t:
            continue
        url, fname = t
        key = fname[:-4]
        dest = HEADSHOT_DIR / fname
        if dest.exists() and dest.stat().st_size > 1000:
            out[key] = f"/headshots/{fname}"
            continue
        if not enabled:
            out[key] = None
            continue
        try:
            r = requests.get(url, timeout=15)
            if r.ok and r.headers.get("content-type", "").startswith("image") and len(r.content) > 1000:
                dest.write_bytes(r.content)
                out[key] = f"/headshots/{fname}"
            else:
                print(f"[headshots] no image for {p.get('name')} ({url}): HTTP {r.status_code}")
                out[key] = None
        except Exception as e:  # noqa: BLE001
            print(f"[headshots] failed for {p.get('name')}: {e}")
            out[key] = None
        time.sleep(0.2)
    return out


def headshot_key(player: dict) -> str | None:
    t = _target(player)
    return t[1][:-4] if t else None
