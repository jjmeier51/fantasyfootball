import leagueJson from "@/data/league.json";
import ownersJson from "@/data/owners.json";
import recordsJson from "@/data/records.json";
import metaJson from "@/data/meta.json";
import type { League, Matchup, Meta, Owner, OwnerLite, Records, Season } from "./types";

export const league = leagueJson as unknown as League;
export const owners = (ownersJson as unknown as { owners: Owner[] }).owners;
export const records = recordsJson as unknown as Records;
export const meta = metaJson as unknown as Meta;

const ownerMap = new Map(owners.map((o) => [o.key, o]));
const seasonMap = new Map(league.seasons.map((s) => [s.year, s]));

export const seasons: Season[] = league.seasons;
export const seasonsDesc: Season[] = [...league.seasons].sort((a, b) => b.year - a.year);
export const completeSeasons: Season[] = league.seasons.filter((s) => s.isComplete);

export function getOwner(key: string | null | undefined): Owner | undefined {
  return key ? ownerMap.get(key) : undefined;
}

export function ownerName(key: string | null | undefined): string {
  if (!key) return "—";
  return ownerMap.get(key)?.name ?? key;
}

export function ownerLite(key: string): OwnerLite {
  const o = ownerMap.get(key);
  return { key, name: o?.name ?? key, color: o?.color ?? null, logo: o?.currentLogo ?? null };
}

export const ownersLite: OwnerLite[] = owners.map((o) => ownerLite(o.key));

export function getSeason(year: number | string): Season | undefined {
  return seasonMap.get(Number(year));
}

export function teamFor(season: Season, ownerKey: string) {
  return season.teams.find((t) => t.ownerKey === ownerKey || t.coOwnerKeys.includes(ownerKey));
}

export function teamNameIn(year: number, ownerKey: string): string {
  const s = seasonMap.get(year);
  return s ? (teamFor(s, ownerKey)?.name ?? ownerName(ownerKey)) : ownerName(ownerKey);
}

export function logoIn(year: number, ownerKey: string): string | null {
  const s = seasonMap.get(year);
  return s ? (teamFor(s, ownerKey)?.logo ?? null) : null;
}

export function findMatchup(id: string): { season: Season; matchup: Matchup } | undefined {
  const year = Number(id.split("-")[0]);
  const s = seasonMap.get(year);
  const m = s?.matchups.find((m) => m.id === id);
  return s && m ? { season: s, matchup: m } : undefined;
}

/** Every decided matchup across history as slim rows for the explorer. */
export function allMatchupRows() {
  const rows = [];
  for (const s of league.seasons) {
    for (const m of s.matchups) {
      if (!m.decided) continue;
      rows.push({
        id: m.id,
        year: s.year,
        week: m.week,
        type: m.type,
        isPlayoff: m.isPlayoff,
        home: m.home.ownerKey,
        away: m.away.ownerKey,
        homeScore: m.home.score,
        awayScore: m.away.score,
        homeTeam: teamFor(s, m.home.ownerKey)?.name ?? "",
        awayTeam: teamFor(s, m.away.ownerKey)?.name ?? "",
        winner: m.winnerKey,
      });
    }
  }
  return rows;
}

export type MatchupRow = ReturnType<typeof allMatchupRows>[number];

export const currentSeason: Season = seasonsDesc[0];
export const reigningTrophy = records.trophies.filter((t) => t.champion).sort((a, b) => b.year - a.year)[0];

/** Everything a modal needs to show one matchup, including starters when box scores exist. */
export interface MatchupDetail {
  id: string;
  year: number;
  week: number;
  type: string;
  isPlayoff: boolean;
  home: MatchupDetailSide;
  away: MatchupDetailSide;
}
export interface MatchupDetailSide {
  ownerKey: string;
  name: string;
  teamName: string;
  logo: string | null;
  score: number;
  won: boolean;
  starters: { name: string; position: string; proTeam: string; slot: string; points: number }[];
}

export function matchupDetail(id: string): MatchupDetail | undefined {
  const found = findMatchup(id);
  if (!found) return undefined;
  const { season: s, matchup: m } = found;
  const box = s.boxscores[String(m.week)] ?? [];
  const side = (ms: Matchup["home"]): MatchupDetailSide => {
    const t = teamFor(s, ms.ownerKey);
    const entry = box.find((b) => b.teamId === ms.teamId);
    const starters = (entry?.players ?? [])
      .filter((p) => p.slot && p.slot !== "BE" && p.slot !== "IR")
      .map((p) => ({ name: p.name, position: p.position, proTeam: p.proTeam, slot: p.slot ?? "", points: p.points ?? 0 }));
    return {
      ownerKey: ms.ownerKey,
      name: ownerName(ms.ownerKey),
      teamName: t?.name ?? "",
      logo: t?.logo ?? null,
      score: ms.score,
      won: m.winnerKey === ms.ownerKey,
      starters,
    };
  };
  return { id: m.id, year: s.year, week: m.week, type: m.type, isPlayoff: m.isPlayoff, home: side(m.home), away: side(m.away) };
}
