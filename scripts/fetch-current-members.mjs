#!/usr/bin/env node
// Refresh data/<league>/current-members.json from the current Sleeper league.
// Stores ONLY a membership list (people-map first_l keys) used for "OG" badges;
// no current-season stats are written. Update CURRENT each new season and re-run:
//   node scripts/fetch-current-members.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const CURRENT = {
  cmpffl: { season: '2026', leagueId: '1389738176553160704' },
  'baptist-ballers': { season: '2026', leagueId: '1389735967409065984' },
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const csv = fs.readFileSync(path.join(root, 'data', 'people-map.csv'), 'utf8')

function parseCsv(text) {
  const rows = []; let row = [], f = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++ } else if (c === '"') q = false; else f += c }
    else if (c === '"') q = true
    else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = '' }
    else f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const [head, ...body] = rows
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}
const byUserId = new Map()
for (const p of parseCsv(csv)) for (const id of (p.sleeper_user_ids || '').split(/[;|\s]+/).filter(Boolean)) byUserId.set(id, p.first_l)

const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${r.status} ${u}`); return r.json() }
let failed = false
for (const [league, { season, leagueId }] of Object.entries(CURRENT)) {
  const rosters = await get(`https://api.sleeper.app/v1/league/${leagueId}/rosters`)
  const owners = new Set()
  for (const r of rosters) for (const id of [r.owner_id, ...(r.co_owners || [])]) if (id) owners.add(String(id))
  const members = [], unmapped = []
  for (const id of owners) (byUserId.has(id) ? members.push(byUserId.get(id)) : unmapped.push(id))
  if (unmapped.length) { failed = true; console.error(`${league}: unmapped Sleeper user_ids ${unmapped.join(', ')} — add them to people-map.csv`) }
  const out = { season, sleeper_league_id: leagueId, members: [...new Set(members)].sort() }
  fs.writeFileSync(path.join(root, 'data', league, 'current-members.json'), JSON.stringify(out, null, 2) + '\n')
  console.log(`${league} ${season}: ${out.members.length} members -> ${out.members.join(', ')}`)
}
if (failed) process.exitCode = 1
