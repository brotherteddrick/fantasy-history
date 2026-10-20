import { loadSeasonFile, compareRegularSeason } from './data.ts'
import type { Standing } from './types.ts'
import { divisionWildCardApplies } from './league-rules.ts'
import type { LeagueSummary, SeasonSummary } from './types.ts'

/** One played game for one team. */
export interface TeamGame {
  week: number
  points: number
  oppRosterId: number
  oppFirstL: string
  oppTeam: string
  oppPoints: number
  kind: 'regular' | 'playoff' | 'consolation'
}

export interface SeasonTeamResult {
  season: string
  source: 'sleeper' | 'yahoo'
  leagueName: string
  rosterId: number
  first_l: string
  teamName: string
  totalTeams: number
  rank: number // regular-season standing rank
  seed: number | null
  madePlayoffs: boolean
  finalPlace: number | null
  playoffResult: string // Champion / Runner-up / 3rd place / Lost in ... / Missed playoffs
  regW: number
  regL: number
  regT: number
  medW: number
  medL: number
  medT: number
  hasMedian: boolean
  poW: number
  poL: number
  pf: number
  pa: number
  regGames: number
  isChampion: boolean
  isRunnerUp: boolean
  isThird: boolean
  isLast: boolean
  isHighPoints: boolean
  isLowPoints: boolean
  division: string | null
  qualifier: Qualifier | null
  games: TeamGame[]
}

const rec = (w: number, l: number, t: number) => `${w}-${l}${t ? `-${t}` : ''}`
export const recordStr = rec

function roundLabel(round: number, maxRound: number): string {
  const back = maxRound - round
  if (back === 0) return 'Lost in final'
  if (back === 1) return 'Lost in semifinal'
  if (back === 2) return 'Lost in quarterfinal'
  return `Lost in round ${round}`
}

/** Per-team results for one season, keyed by roster_id. Computed from static season data. */
export function seasonTeamResults(leagueKey: string, s: SeasonSummary): Map<number, SeasonTeamResult> {
  const file = loadSeasonFile(leagueKey, s.season)
  const source: 'sleeper' | 'yahoo' = s.source === 'yahoo' || file.source === 'yahoo' ? 'yahoo' : 'sleeper'
  const settings = file.league?.settings || {}
  const playoffStart = Number(settings.playoff_week_start || 99)
  const byRoster = new Map(s.standings.map((r) => [r.roster_id, r]))
  const hasMedian = source === 'sleeper' && Number(settings.league_average_match || 0) === 1

  const out = new Map<number, SeasonTeamResult>()
  for (const r of s.standings) {
    out.set(r.roster_id, {
      season: s.season,
      source,
      leagueName: s.league_name,
      rosterId: r.roster_id,
      first_l: r.first_l,
      teamName: r.team_name,
      totalTeams: s.total_rosters,
      rank: r.rank,
      seed: null,
      madePlayoffs: false,
      finalPlace: null,
      playoffResult: 'Missed playoffs',
      regW: 0, regL: 0, regT: 0,
      medW: 0, medL: 0, medT: 0,
      hasMedian,
      poW: 0, poL: 0,
      pf: r.fpts,
      pa: r.fpts_against,
      regGames: 0,
      isChampion: s.champion?.roster_id === r.roster_id,
      isRunnerUp: s.placements?.second?.roster_id === r.roster_id,
      isThird: s.placements?.third?.roster_id === r.roster_id,
      isLast: s.last_place?.roster_id === r.roster_id,
      isHighPoints: s.placements?.high_points?.roster_id === r.roster_id,
      isLowPoints: s.placements?.low_points?.roster_id === r.roster_id,
      division: null,
      qualifier: null,
      games: [],
    })
  }

  // --- games (pair rows by matchup_id per week) ---
  const playoffPairs = new Set<string>() // "week:a:b" championship-bracket games
  const pairKey = (w: number, a: number, b: number) => `${w}:${Math.min(a, b)}:${Math.max(a, b)}`

  // Playoff structure
  let maxRound = 0
  const elimRound = new Map<number, number>()
  if (source === 'yahoo') {
    const nPlayoff = Number(settings.num_playoff_teams || 0)
    for (const ro of file.rosters || []) {
      const t = out.get(ro.roster_id)
      if (!t) continue
      t.seed = ro.playoff_seed ?? null
      t.finalPlace = ro.final_rank ?? null
      t.madePlayoffs = ro.playoff_seed != null && ro.playoff_seed <= nPlayoff
    }
    const endWeek = Number(settings.end_week || 0)
    maxRound = endWeek - playoffStart + 1
    for (const [wk, rows] of Object.entries<any[]>(file.matchups_by_week || {})) {
      const w = Number(wk)
      if (w < playoffStart) continue
      const grouped = new Map<number, any[]>()
      for (const row of rows) {
        if (!grouped.has(row.matchup_id)) grouped.set(row.matchup_id, [])
        grouped.get(row.matchup_id)!.push(row)
      }
      for (const sides of grouped.values()) {
        if (sides.length !== 2) continue
        const [a, b] = sides
        const ta = out.get(a.roster_id), tb = out.get(b.roster_id)
        if (!ta || !tb || a.is_consolation || !ta.madePlayoffs || !tb.madePlayoffs) continue
        playoffPairs.add(pairKey(w, a.roster_id, b.roster_id))
        const round = w - playoffStart + 1
        const loser = a.points > b.points ? b.roster_id : b.points > a.points ? a.roster_id : null
        if (loser != null && !elimRound.has(loser)) elimRound.set(loser, round)
      }
    }
  } else {
    const wb: any[] = file.winners_bracket || []
    maxRound = wb.reduce((m, g) => Math.max(m, Number(g.r || 0)), 0)
    for (const g of wb) {
      for (const id of [g.t1, g.t2]) {
        if (typeof id === 'number' && out.has(id)) out.get(id)!.madePlayoffs = true
      }
      if (typeof g.t1 === 'number' && typeof g.t2 === 'number') {
        playoffPairs.add(pairKey(playoffStart + Number(g.r) - 1, g.t1, g.t2))
      }
      if (typeof g.l === 'number' && !elimRound.has(g.l)) elimRound.set(g.l, Number(g.r))
      // Placement games give exact final places among playoff teams.
      if (g.p != null && typeof g.w === 'number' && typeof g.l === 'number') {
        const p = Number(g.p)
        if (out.has(g.w)) out.get(g.w)!.finalPlace = p
        if (out.has(g.l)) out.get(g.l)!.finalPlace = p + 1
      }
    }
    // Seeds for Sleeper's 6-team, 2-bye bracket. Observed layout (CMPFFL 2024-25, Baptist 2025):
    // r1 m1 = seed 4 (t1) v seed 5 (t2); r1 m2 = seed 6 (t1) v seed 3 (t2);
    // r2 = seed 1 / seed 2 (t1) v winners of m1 / m2.
    const r1 = wb.filter((g) => g.r === 1).sort((a, b) => a.m - b.m)
    const r2 = wb.filter((g) => g.r === 2 && !g.p && g.t2_from?.w != null).sort((a, b) => a.m - b.m)
    if (r1.length === 2 && r2.length === 2 && r2[0].t2_from.w === r1[0].m && r2[1].t2_from.w === r1[1].m) {
      const seedOf: [number, number][] = [
        [r2[0].t1, 1], [r2[1].t1, 2], [r1[1].t2, 3], [r1[0].t1, 4], [r1[0].t2, 5], [r1[1].t1, 6],
      ]
      for (const [id, seed] of seedOf) if (out.has(id)) out.get(id)!.seed = seed
    }
  }

  // Places for non-playoff teams (and last place) come from the regular-season record,
  // ignoring the consolation / losers bracket. Playoff places stay bracket-based.
  const nPlayoffTeams = [...out.values()].filter((t) => t.madePlayoffs).length
  const nonPlayoff = s.standings.filter((r) => !out.get(r.roster_id)?.madePlayoffs).sort(compareRegularSeason)
  nonPlayoff.forEach((r, i) => {
    out.get(r.roster_id)!.finalPlace = nPlayoffTeams + i + 1
  })
  for (const t of out.values()) {
    if (t.isChampion) { t.finalPlace = 1; t.playoffResult = 'Champion' }
    else if (t.isRunnerUp) { t.finalPlace = 2; t.playoffResult = 'Runner-up' }
    else if (t.isThird) { t.finalPlace = 3; t.playoffResult = '3rd place' }
    else if (t.madePlayoffs) {
      const r = elimRound.get(t.rosterId)
      t.playoffResult = r ? roundLabel(r, maxRound) : 'Playoffs'
    }
  }

  for (const [wk, rows] of Object.entries<any[]>(file.matchups_by_week || {})) {
    const w = Number(wk)
    const grouped = new Map<number, any[]>()
    for (const row of rows) {
      if (row.matchup_id == null) continue
      if (!grouped.has(row.matchup_id)) grouped.set(row.matchup_id, [])
      grouped.get(row.matchup_id)!.push(row)
    }
    const regular = w < playoffStart
    // Sleeper median game: every team vs the week's median (regular season only)
    if (regular && hasMedian) {
      const pts = rows.filter((r) => r.matchup_id != null).map((r) => Number(r.points || 0)).sort((a, b) => a - b)
      if (pts.length) {
        const half = pts.length / 2
        const median = pts.length % 2 ? pts[Math.floor(half)] : (pts[half - 1] + pts[half]) / 2
        for (const r of rows) {
          const t = out.get(r.roster_id)
          if (!t || r.matchup_id == null) continue
          const p = Number(r.points || 0)
          if (p > median) t.medW++
          else if (p < median) t.medL++
          else t.medT++
        }
      }
    }
    for (const sides of grouped.values()) {
      if (sides.length !== 2) continue
      const [a, b] = sides
      const ap = Number(a.points || 0), bp = Number(b.points || 0)
      if (ap === 0 && bp === 0) continue
      const key = pairKey(w, a.roster_id, b.roster_id)
      const kind: TeamGame['kind'] = regular ? 'regular' : playoffPairs.has(key) ? 'playoff' : 'consolation'
      for (const [me, op, mp, opp] of [[a, b, ap, bp], [b, a, bp, ap]] as const) {
        const t = out.get(me.roster_id)
        if (!t) continue
        const o = byRoster.get(op.roster_id)
        t.games.push({ week: w, points: mp, oppRosterId: op.roster_id, oppFirstL: o?.first_l || '', oppTeam: o?.team_name || '', oppPoints: opp, kind })
        if (kind === 'regular') {
          t.regGames++
          if (mp > opp) t.regW++
          else if (mp < opp) t.regL++
          else t.regT++
        } else if (kind === 'playoff') {
          if (mp > opp) t.poW++
          else if (mp < opp) t.poL++
        }
      }
    }
  }
  const div = seasonDivisions(leagueKey, s)
  if (div) {
    for (const t of out.values()) {
      const d = div.teamDivision.get(t.rosterId)
      t.division = d != null ? div.names.get(d) ?? `Division ${d}` : null
      t.qualifier = div.qualifiers.get(t.rosterId) ?? null
    }
  }
  return out
}

export type Qualifier = 'Division' | 'Wild card (points)'

export interface SeasonDivisions {
  names: Map<number, string>
  teamDivision: Map<number, number>
  /** True when the actual playoff field = top 2 per division by record + best-PF wild cards. */
  ruleMatches: boolean
  qualifiers: Map<number, Qualifier> // only filled when ruleMatches
  wildCards: number[]
  note: string
}

/** Roster ids of championship-bracket teams. */
export function playoffTeamIds(file: any): Set<number> {
  const ids = new Set<number>()
  if (file.source === 'yahoo') {
    const n = Number(file.league?.settings?.num_playoff_teams || 0)
    for (const r of file.rosters || []) if (r.playoff_seed != null && r.playoff_seed <= n) ids.add(r.roster_id)
  } else {
    for (const g of file.winners_bracket || []) for (const t of [g.t1, g.t2]) if (typeof t === 'number') ids.add(t)
  }
  return ids
}

/**
 * Division layout for a season, if the data has divisions, and whether the actual playoff
 * field matches the league rule: top 2 in each division by regular-season record
 * (tiebreak PF), plus wild cards = highest regular-season PF among the rest.
 */
export function seasonDivisions(leagueKey: string, s: { season: string; standings: Standing[] }): SeasonDivisions | null {
  // Division grouping and berth labels only for leagues/seasons using the division + points wild card format.
  if (!divisionWildCardApplies(leagueKey, s.season)) return null
  const file = loadSeasonFile(leagueKey, s.season)
  const names = new Map<number, string>()
  const teamDivision = new Map<number, number>()
  if (file.source === 'yahoo') {
    for (const d of file.league?.settings?.divisions || []) names.set(Number(d.division_id), d.name)
    for (const r of file.rosters || []) if (r.division_id != null) teamDivision.set(r.roster_id, Number(r.division_id))
  } else {
    const meta = file.league?.metadata || {}
    for (const [k, v] of Object.entries<string>(meta)) {
      const m = /^division_(\d+)$/.exec(k)
      if (m) names.set(Number(m[1]), v)
    }
    if (Number(file.league?.settings?.divisions || 0) > 0) {
      for (const r of file.rosters || []) if (r.settings?.division != null) teamDivision.set(r.roster_id, Number(r.settings.division))
    }
  }
  if (!teamDivision.size) return null
  const divIds = [...new Set(teamDivision.values())].sort((a, b) => a - b)
  const actual = playoffTeamIds(file)
  const byDiv = new Set<number>()
  for (const d of divIds) {
    s.standings
      .filter((r) => teamDivision.get(r.roster_id) === d)
      .sort(compareRegularSeason)
      .slice(0, 2)
      .forEach((r) => byDiv.add(r.roster_id))
  }
  const wcSlots = actual.size - byDiv.size
  const wildCards =
    wcSlots > 0
      ? s.standings.filter((r) => !byDiv.has(r.roster_id)).sort((a, b) => b.fpts - a.fpts).slice(0, wcSlots).map((r) => r.roster_id)
      : []
  const ruleField = new Set([...byDiv, ...wildCards])
  const ruleMatches = wcSlots > 0 && ruleField.size === actual.size && [...actual].every((id) => ruleField.has(id))
  const qualifiers = new Map<number, Qualifier>()
  if (ruleMatches) {
    for (const id of byDiv) qualifiers.set(id, 'Division')
    for (const id of wildCards) qualifiers.set(id, 'Wild card (points)')
  }
  const note = ruleMatches
    ? 'Playoffs: top 2 in each division by record, plus wild cards for the highest points among the rest.'
    : `${divIds.length} divisions; this season's playoff field doesn't follow the top-2-per-division + points wild card rule, so qualification isn't labeled.`
  return { names, teamDivision, ruleMatches, qualifiers, wildCards: ruleMatches ? wildCards : [], note }
}

export interface WeekScore {
  season: string
  week: number
  points: number
  oppFirstL: string
  oppTeam: string
  oppPoints: number
  kind: TeamGame['kind']
}

export interface ManagerCareer {
  first_l: string
  seasons: SeasonTeamResult[] // newest first
  championships: string[]
  runnerUps: string[]
  thirds: string[]
  lasts: string[]
  playoffYears: string[]
  wildCardYears: string[]
  highPoints: string[]
  lowPoints: string[]
  regW: number; regL: number; regT: number
  medW: number; medL: number; medT: number; medianSeasons: number
  poW: number; poL: number
  pf: number; pa: number; regGames: number
  best: WeekScore | null
  worst: WeekScore | null
}

export function leagueResults(leagueKey: string, summary: LeagueSummary): SeasonTeamResult[] {
  const all: SeasonTeamResult[] = []
  for (const s of summary.seasons) all.push(...seasonTeamResults(leagueKey, s).values())
  return all
}

export function managerCareer(first_l: string, all: SeasonTeamResult[]): ManagerCareer {
  const seasons = all.filter((r) => r.first_l === first_l).sort((a, b) => Number(b.season) - Number(a.season))
  const years = (pred: (r: SeasonTeamResult) => boolean) => seasons.filter(pred).map((r) => r.season)
  const sum = (f: (r: SeasonTeamResult) => number) => seasons.reduce((n, r) => n + f(r), 0)
  let best: WeekScore | null = null
  let worst: WeekScore | null = null
  for (const r of seasons) {
    for (const g of r.games) {
      const ws: WeekScore = { season: r.season, week: g.week, points: g.points, oppFirstL: g.oppFirstL, oppTeam: g.oppTeam, oppPoints: g.oppPoints, kind: g.kind }
      if (!best || g.points > best.points) best = ws
      if (!worst || g.points < worst.points) worst = ws
    }
  }
  return {
    first_l,
    seasons,
    championships: years((r) => r.isChampion),
    runnerUps: years((r) => r.isRunnerUp),
    thirds: years((r) => r.isThird),
    lasts: years((r) => r.isLast),
    playoffYears: years((r) => r.madePlayoffs),
    wildCardYears: years((r) => r.qualifier === 'Wild card (points)'),
    highPoints: years((r) => r.isHighPoints),
    lowPoints: years((r) => r.isLowPoints),
    regW: sum((r) => r.regW), regL: sum((r) => r.regL), regT: sum((r) => r.regT),
    medW: sum((r) => r.medW), medL: sum((r) => r.medL), medT: sum((r) => r.medT),
    medianSeasons: seasons.filter((r) => r.hasMedian).length,
    poW: sum((r) => r.poW), poL: sum((r) => r.poL),
    pf: sum((r) => r.pf), pa: sum((r) => r.pa), regGames: sum((r) => r.regGames),
    best, worst,
  }
}

export function winPct(w: number, l: number, t: number): string {
  const g = w + l + t
  if (!g) return '—'
  return ((w + 0.5 * t) / g).toFixed(3).replace(/^0/, '')
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
