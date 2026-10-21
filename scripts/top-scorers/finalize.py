"""Turn raw top-scorer pulls (/workspace/topscorers/<league>/<season>.json, produced by
sleeper_top.py and the Yahoo pull) into small static data/<league>/top-scorers/<season>.json."""
import json, glob, os, sys
FH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
RAW = sys.argv[1] if len(sys.argv) > 1 else '/workspace/topscorers'
for f in sorted(glob.glob(f'{RAW}/cmpffl/*.json') + glob.glob(f'{RAW}/baptist-ballers/*.json')):
    league, season = f.split('/')[-2], os.path.basename(f)[:-5]
    if season == '2026': continue
    d = json.load(open(f))
    out = {k: d[k] for k in ('season', 'source', 'weeks', 'basis', 'note')}
    out['positions'] = []
    for p in d['positions']:
        players = []
        for r in p['players']:
            end = r.get('end_owner')
            st = sorted(((fl, n) for fl, n in r['started'].items() if fl and fl != 'None'),
                        key=lambda x: (-x[1], x[0] != end, x[0]))
            ro = sorted(((fl, n) for fl, n in r['rostered'].items() if fl and fl != 'None'),
                        key=lambda x: (-x[1], x[0] != end, x[0]))
            players.append({
                'name': r['name'], 'team': r['team'], 'pts': round(r['pts'], 2),
                'started': [{'first_l': fl, 'weeks': n} for fl, n in st],
                'rostered': {'first_l': ro[0][0], 'weeks': ro[0][1]} if ro else None,
                'end_owner': end if end and end != 'None' else None,
            })
        out['positions'].append({'pos': p['pos'], 'players': players})
    os.makedirs(f'{FH}/data/{league}/top-scorers', exist_ok=True)
    json.dump(out, open(f'{FH}/data/{league}/top-scorers/{season}.json', 'w'), indent=1)
    print(league, season, 'ok')
