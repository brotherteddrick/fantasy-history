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
