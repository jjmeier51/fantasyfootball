"""Shared configuration for the sync pipeline.

All secrets come from environment variables so nothing sensitive is ever committed:

  ESPN_LEAGUE_ID   numeric league id from the ESPN URL (leagueId=...)
  ESPN_S2          espn_s2 cookie value (private leagues)
  ESPN_SWID        SWID cookie value, including the curly braces, e.g. {ABCD-...}
  FIRST_SEASON     first season to pull (default 2010)
"""
from __future__ import annotations

import os
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SYNC_DIR = ROOT / "sync"
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PUBLIC_DIR = ROOT / "public"
LOGO_DIR = PUBLIC_DIR / "logos"
OWNERS_FILE = SYNC_DIR / "owners.yml"
OVERRIDES_DIR = SYNC_DIR / "overrides"

LEAGUE_ID = os.environ.get("ESPN_LEAGUE_ID", "").strip()
ESPN_S2 = os.environ.get("ESPN_S2", "").strip()
ESPN_SWID = os.environ.get("ESPN_SWID", "").strip()
FIRST_SEASON = int(os.environ.get("FIRST_SEASON", "2010"))

# ESPN only serves per-week player box scores from 2019 onwards.
BOXSCORE_MIN_YEAR = 2019
# Single-game records (highest score, blowouts, ...) only consider seasons from this year on.
RECORD_MIN_YEAR = 2019
ADJUSTMENTS_FILE = SYNC_DIR / "adjustments.yml"


def current_season() -> int:
    """The fantasy season that is 'current' today. A new season starts in August."""
    today = date.today()
    return today.year if today.month >= 8 else today.year - 1


# ESPN "defaultPositionId" -> position label (this is NOT the lineup-slot map).
DEFAULT_POSITION_MAP = {
    1: "QB",
    2: "RB",
    3: "WR",
    4: "TE",
    5: "K",
    7: "P",
    9: "DT",
    10: "DE",
    11: "LB",
    12: "CB",
    13: "S",
    14: "HC",
    16: "D/ST",
}

# ESPN proTeamId -> abbreviation.
PRO_TEAM_MAP = {
    0: "FA", 1: "ATL", 2: "BUF", 3: "CHI", 4: "CIN", 5: "CLE", 6: "DAL", 7: "DEN", 8: "DET",
    9: "GB", 10: "TEN", 11: "IND", 12: "KC", 13: "LV", 14: "LAR", 15: "MIA", 16: "MIN",
    17: "NE", 18: "NO", 19: "NYG", 20: "NYJ", 21: "PHI", 22: "ARI", 23: "PIT", 24: "LAC",
    25: "SF", 26: "SEA", 27: "TB", 28: "WSH", 29: "CAR", 30: "JAX", 33: "BAL", 34: "HOU",
}

PRO_TEAM_NAMES = {
    "ATL": "Falcons", "BUF": "Bills", "CHI": "Bears", "CIN": "Bengals", "CLE": "Browns",
    "DAL": "Cowboys", "DEN": "Broncos", "DET": "Lions", "GB": "Packers", "TEN": "Titans",
    "IND": "Colts", "KC": "Chiefs", "LV": "Raiders", "LAR": "Rams", "MIA": "Dolphins",
    "MIN": "Vikings", "NE": "Patriots", "NO": "Saints", "NYG": "Giants", "NYJ": "Jets",
    "PHI": "Eagles", "ARI": "Cardinals", "PIT": "Steelers", "LAC": "Chargers", "SF": "49ers",
    "SEA": "Seahawks", "TB": "Buccaneers", "WSH": "Commanders", "CAR": "Panthers",
    "JAX": "Jaguars", "BAL": "Ravens", "HOU": "Texans",
}

LINEUP_SLOT_MAP = {
    0: "QB", 1: "TQB", 2: "RB", 3: "RB/WR", 4: "WR", 5: "WR/TE", 6: "TE", 7: "OP", 8: "DT",
    9: "DE", 10: "LB", 11: "DL", 12: "CB", 13: "S", 14: "DB", 15: "DP", 16: "D/ST", 17: "K",
    18: "P", 19: "HC", 20: "BE", 21: "IR", 22: "", 23: "FLEX", 24: "ER", 25: "Rookie",
}
BENCH_SLOTS = {"BE", "IR"}
