export type {
  Accent,
  SiteConfig,
  ChampInfo,
  Standing,
  SeasonSummary,
  SeasonPlacements,
  PlacementPerson,
  LeagueSummary,
  Manager,
  ManagerSeason,
  PersonRow,
  WeekMatchup,
  WeekMatchupSide,
} from './lib/types.ts'
export {
  findRepoRoot,
  dataDir,
  loadSummary,
  loadSeasonFile,
  weeklyMatchups,
  personSlug,
  loadPeopleMap,
  peopleByFirstL,
  historicalOnly,
  managersFromSummary,
  standingWinPct,
  compareRegularSeason,
  formatPts,
  parsePersonKey,
  displayLabels,
  labelsForSummary,
  labelOf,
} from './lib/data.ts'
export { seasonTeamResults, leagueResults, managerCareer, winPct, ordinal, recordStr, headToHead } from './lib/manager-stats.ts'
export type { SeasonTeamResult, ManagerCareer, TeamGame, WeekScore, H2HOpponent, H2HGame, H2HSplit } from './lib/manager-stats.ts'
export { LEAGUE_RULES, divisionWildCardApplies } from './lib/league-rules.ts'
