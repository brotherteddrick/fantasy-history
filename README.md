# Fantasy History

Twin-site static monorepo for two league archives:

| Site | Completed seasons | Accent |
|---|---|---|
| CMPFFL (`sites/cmpffl`) | 2024, 2025 | gold |
| Baptist Ballers (`sites/baptist-ballers`) | 2025 | teal |

Historical only. No 2026. People are keyed by `first_l` (first name + two-letter last initial).

## Repo layout

```
data/                 static JSON + people-map.csv
packages/shared/      layout, nav, components, CSS, data loaders
sites/cmpffl/         thin Astro app
sites/baptist-ballers thin Astro app
```

## Local

```bash
npm install
npm run dev:cmpffl        # http://localhost:4321
npm run dev:baptist
npm run build             # both sites
npm run build:cmpffl      # sites/cmpffl/dist
npm run build:baptist     # sites/baptist-ballers/dist
```

Requires Node 20+.

## Push to GitHub

Do this on a machine that has your GitHub credentials. This repo is not pushed from the build box.

```bash
cd fantasy-history
git init
git add .
git commit -m "Initial twin-site fantasy history monorepo"
git branch -M main
git remote add origin https://github.com/brotherteddrick/fantasy-history.git
git push -u origin main
```

If the GitHub repo already has a README, pull first or use `--allow-unrelated-histories`.

## Cloudflare Pages — two projects, one repo

Create **two** Cloudflare Pages projects pointing at the same GitHub repo. Different build/output per site.

### Project 1 — CMPFFL

- Production branch: `main`
- Framework preset: Astro (or None)
- Root directory: `/` (repository root, not `sites/cmpffl`)
- Build command: `npm ci && npm run build -w @fh/cmpffl`
- Build output directory: `sites/cmpffl/dist`
- Environment: `NODE_VERSION=20`

### Project 2 — Baptist Ballers

- Same repo and branch
- Root directory: `/`
- Build command: `npm ci && npm run build -w @fh/baptist-ballers`
- Build output directory: `sites/baptist-ballers/dist`
- Environment: `NODE_VERSION=20`

Root must stay the monorepo root so `packages/shared` and `data/` resolve during the build. Do not set the Pages root to `sites/*`.

Optional custom domains after the first deploy.

## v1 pages

- Home — latest title + champion cards
- Seasons list + season detail (playoff champion, last place, standings)
- Managers index + stub detail (`first_l` slug)
- Nav stubs: H2H, Drafts, Trades

Champion is the playoff winner and can differ from regular-season #1.
