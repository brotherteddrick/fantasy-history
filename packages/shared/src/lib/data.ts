import fs from 'node:fs'
import path from 'node:path'
import type { LeagueSummary, Manager, PersonRow } from './types.ts'

export function findRepoRoot(): string {
  let dir = process.cwd()
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, 'data', 'people-map.csv'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error(`Cannot find data/people-map.csv walking up from ${process.cwd()}`)
}

export function dataDir(): string {
  return path.join(findRepoRoot(), 'data')
}

export function loadSummary(leagueKey: string): LeagueSummary {
  const file = path.join(dataDir(), leagueKey, 'summary.json')
  const raw = JSON.parse(fs.readFileSync(file, 'utf8')) as LeagueSummary
  raw.seasons = raw.seasons.filter((s) => s.season !== '2026')
  return raw
}

export function personSlug(first_l: string): string {
  return first_l.trim().toLowerCase().replace(/\s+/g, '-')
}

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') {
      field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  const headers = rows[0] ?? []
  return rows
    .slice(1)
    .filter((r) => r.some((x) => x.trim()))
    .map((r) => {
      const o: Record<string, string> = {}
      headers.forEach((h, i) => {
        o[h] = r[i] ?? ''
      })
      return o
    })
}

export function loadPeopleMap(): PersonRow[] {
  const text = fs.readFileSync(path.join(dataDir(), 'people-map.csv'), 'utf8')
  return parseCsv(text) as unknown as PersonRow[]
}

export function peopleByFirstL(): Map<string, PersonRow> {
  const map = new Map<string, PersonRow>()
  for (const row of loadPeopleMap()) {
    if (row.first_l) map.set(row.first_l, row)
  }
  return map
}

/** Drop in-progress / future 2026 labels from people-map display strings. */
export function historicalOnly(list: string, sep = ';'): string[] {
  return list
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/\b2026\b/.test(s))
}

export function managersFromSummary(summary: LeagueSummary): Manager[] {
  const people = peopleByFirstL()
  const map = new Map<string, Manager>()
  for (const season of summary.seasons) {
    for (const row of season.standings) {
      const key = row.first_l
      if (!map.has(key)) {
        const person = people.get(key)
        map.set(key, {
          first_l: key,
          slug: personSlug(key),
          displayNames: [],
          seasons: [],
          titles: [],
          notes: person?.notes || undefined,
        })
      }
      const m = map.get(key)!
      if (!m.displayNames.includes(row.display_name)) m.displayNames.push(row.display_name)
      const isChampion = season.champion.first_l === key
      const isLast = season.last_place.first_l === key
      m.seasons.push({
        season: season.season,
        team_name: row.team_name,
        display_name: row.display_name,
        record: row.record,
        rank: row.rank,
        fpts: row.fpts,
        isChampion,
        isLast,
      })
      if (isChampion) m.titles.push(season.season)
    }
  }
  return [...map.values()].sort((a, b) => a.first_l.localeCompare(b.first_l))
}

export function formatPts(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function loadSeasonFile(leagueKey: string, year: string): any {
  const file = path.join(dataDir(), leagueKey, 'seasons', `${year}.json`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

export function weeklyMatchups(leagueKey: string, year: string): { week: string; matchups: import('./types.ts').WeekMatchup[] }[] {
  const season = loadSeasonFile(leagueKey, year)
  const people = peopleByFirstL()
  // owner_id -> first_l via reverse from standings summary when possible
  const summary = loadSummary(leagueKey)
  const seasonSum = summary.seasons.find((s) => s.season === year)
  const rosterToPerson = new Map<number, { first_l: string; team_name: string }>()
  if (seasonSum) {
    for (const row of seasonSum.standings) {
      rosterToPerson.set(row.roster_id, { first_l: row.first_l, team_name: row.team_name })
    }
  }
  const users = new Map((season.users || []).map((u: any) => [u.user_id, u]))
  for (const r of season.rosters || []) {
    if (rosterToPerson.has(r.roster_id)) continue
    const u = users.get(r.owner_id) || {}
    const meta = u.metadata || {}
    const first = [...people.values()].find((row) => (row.sleeper_user_ids || '').includes(r.owner_id))
    rosterToPerson.set(r.roster_id, {
      first_l: first?.first_l || u.display_name || `Roster ${r.roster_id}`,
      team_name: (meta.team_name || u.display_name || '').trim(),
    })
  }

  const settings = (season.league || {}).settings || {}
  const playoffStart = Number(settings.playoff_week_start || 99)
  const byWeek = season.matchups_by_week || {}
  const weeks = Object.keys(byWeek)
    .map(Number)
    .sort((a, b) => a - b)
    .map(String)

  const out: { week: string; matchups: import('./types.ts').WeekMatchup[] }[] = []
  for (const week of weeks) {
    const rows = byWeek[week] || []
    const grouped = new Map<number, any[]>()
    for (const row of rows) {
      const id = row.matchup_id
      if (id == null) continue
      if (!grouped.has(id)) grouped.set(id, [])
      grouped.get(id)!.push(row)
    }
    const matchups: import('./types.ts').WeekMatchup[] = []
    for (const [matchup_id, sides] of [...grouped.entries()].sort((a, b) => a[0] - b[0])) {
      const mapped = sides.map((s) => {
        const person = rosterToPerson.get(s.roster_id) || { first_l: `Roster ${s.roster_id}`, team_name: '' }
        return {
          roster_id: s.roster_id,
          first_l: person.first_l,
          team_name: person.team_name,
          points: Number(s.points || 0),
        }
      })
      matchups.push({
        matchup_id,
        a: mapped[0],
        b: mapped[1] || null,
      })
    }
    const label = Number(week) >= playoffStart ? `${week} (playoffs)` : week
    out.push({ week: label, matchups })
  }
  return out
}
