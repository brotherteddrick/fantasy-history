export type {
  Accent,
  SiteConfig,
  ChampInfo,
  Standing,
  SeasonSummary,
  LeagueSummary,
  Manager,
  ManagerSeason,
  PersonRow,
} from './lib/types.ts'
export {
  findRepoRoot,
  dataDir,
  loadSummary,
  personSlug,
  loadPeopleMap,
  peopleByFirstL,
  historicalOnly,
  managersFromSummary,
  formatPts,
} from './lib/data.ts'
