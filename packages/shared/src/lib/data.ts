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
