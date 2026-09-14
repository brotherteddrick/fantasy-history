# Fantasy History — handoff

Monorepo is at `/workspace/fantasy-history`. Zip (no `node_modules`) is `/workspace/fantasy-history.zip`.

## What shipped

- npm workspaces: `@fh/shared`, `@fh/cmpffl`, `@fh/baptist-ballers`
- Real data copied from `/workspace/league-history` (summaries, people-map, season JSON)
- Completed seasons only: CMPFFL 2024–2025, Baptist Ballers 2025
- Shared chrome; gold accent (CMPFFL) vs teal (Baptist Ballers)
- Champions from `summary.json` render on home + season pages

### Champions (playoff winners)

- CMPFFL 2024 — Casie Wo, All Killer No Filler
- CMPFFL 2025 — Jason Cl, End The Fed
- Baptist Ballers 2025 — Theodore Wo, Stop Looking at Me Swan

## Build

```bash
cd /workspace/fantasy-history
npm install
npm run build
```

Outputs: `sites/cmpffl/dist` and `sites/baptist-ballers/dist`.

## Push (you do this; no auth on the box)

```bash
cd /workspace/fantasy-history   # or unzip first
git init
git add .
git commit -m "Initial twin-site fantasy history monorepo"
git branch -M main
git remote add origin https://github.com/brotherteddrick/fantasy-history.git
git push -u origin main
```

## Cloudflare Pages

Two projects, same repo, **root = repo root**:

| Project | Build command | Output |
|---|---|---|
| CMPFFL | `npm ci && npm run build -w @fh/cmpffl` | `sites/cmpffl/dist` |
| Baptist Ballers | `npm ci && npm run build -w @fh/baptist-ballers` | `sites/baptist-ballers/dist` |

Set `NODE_VERSION=20` on both. Do not set the Pages project root to `sites/*` or `data/` and `packages/shared` will miss the build.
