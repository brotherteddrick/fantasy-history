# Data

Static, completed-season only. No 2026.

```
data/
  people-map.csv          # first_l is the person key (First + two-letter last initial)
  cmpffl/summary.json
  cmpffl/seasons/2024.json
  cmpffl/seasons/2025.json
  baptist-ballers/summary.json
  baptist-ballers/seasons/2025.json
```

`summary.json` is what the v1 sites render (champion, last place, standings). Season JSON is stored for later H2H / drafts / trades pages.

People are keyed by `first_l` (example: `Theodore Wo`, `Jason Cl`).

## current-members.json (OG badges)

`data/<league>/current-members.json` is a membership list only (people-map `first_l` keys of the
current Sleeper league roster; no current-season stats). A manager is an **OG** if they played in the
league's first published season and appear in this list. Refresh each season: update `CURRENT` in
`scripts/fetch-current-members.mjs` (season + Sleeper league id), then run
`node scripts/fetch-current-members.mjs` (it fails loudly on Sleeper user_ids missing from people-map.csv).
