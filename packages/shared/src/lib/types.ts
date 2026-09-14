export type Accent = 'gold' | 'teal'

export interface SiteConfig {
  leagueKey: string
  leagueName: string
  fullName: string
  accent: Accent
  tagline: string
}

export interface ChampInfo {
  roster_id: number
  owner_id: string
  display_name: string
  team_name: string
  first_l: string
  record: string
  fpts: number
}

export interface Standing {
  roster_id: number
  owner_id: string
  display_name: string
  team_name: string
  first_l: string
  wins: number
  losses: number
  ties: number
  fpts: number
  fpts_against: number
  record: string
  rank: number
}

export interface SeasonSummary {
  season: string
  league_id: string
  league_name: string
  champion: ChampInfo
  last_place: ChampInfo
  standings: Standing[]
  total_rosters: number
  weeks_with_matchups: string[]
}

export interface LeagueSummary {
  league_key: string
  league_name: string
  seasons: SeasonSummary[]
  gaps: unknown[]
}

export interface ManagerSeason {
  season: string
  team_name: string
  display_name: string
  record: string
  rank: number
  fpts: number
  isChampion: boolean
  isLast: boolean
}

export interface Manager {
  first_l: string
  slug: string
  displayNames: string[]
  seasons: ManagerSeason[]
  titles: string[]
  notes?: string
}

export interface PersonRow {
  first_l: string
  sleeper_display_names: string
  sleeper_user_ids: string
  team_names_seen: string
  leagues: string
  seasons_seen: string
  yahoo_usernames: string
  notes: string
}
