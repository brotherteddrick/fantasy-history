# Top scorers by position

Static output: `data/<league>/top-scorers/<season>.json` (top 3 per roster position, regular-season
weeks = start week .. playoff_week_start-1, league scoring; who started/rostered each player).

- Sleeper seasons: `python3 sleeper_top.py` — computes points from api.sleeper.com weekly stats with
  the league's `scoring_settings` (cross-checked against matchup `players_points`: 0 diffs), ownership
  from weekly matchup `starters`/`players`. Raw output goes to /workspace/topscorers/.
- Yahoo seasons: pulled with the box-only Yahoo OAuth client (`/workspace/yahoo-oauth/yahoo_top.py`):
  top 25 per position by season points as the candidate pool, then weekly league-scored points for
  the regular-season weeks, ownership from weekly `teams/roster` (selected_position != BN/IR = started).
- Then `python3 finalize.py` writes the small JSON files here. Never include the in-progress season.
