/**
 * Per-league playoff format rules.
 * divisionWildCardFrom: first season where the playoff field is the top 2 in each division
 * by record plus wild cards for the highest regular-season points among the rest.
 * Leagues without an entry never get Division / Wild card labels.
 */
export interface LeagueRules {
  divisionWildCardFrom?: number
}

export const LEAGUE_RULES: Record<string, LeagueRules> = {
  cmpffl: { divisionWildCardFrom: 2024 },
  // 'baptist-ballers': no wild cards
}

export function divisionWildCardApplies(leagueKey: string, season: string | number): boolean {
  const from = LEAGUE_RULES[leagueKey]?.divisionWildCardFrom
  return from != null && Number(season) >= from
}
