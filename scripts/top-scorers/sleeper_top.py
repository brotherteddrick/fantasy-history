import json, os, csv, urllib.request, time
FH='/workspace/fantasy-history'; C='/workspace/topscorers/sleeper_cache'; os.makedirs(C,exist_ok=True)
ORDER=['QB','RB','WR','TE','K','DEF']
people=list(csv.DictReader(open(f'{FH}/data/people-map.csv',newline='')))
uid2fl={}
for p in people:
    for u in (p['sleeper_user_ids'] or '').replace('|',';').split(';'):
        if u.strip(): uid2fl[u.strip()]=p['first_l']
def get(season,week,pos):
    f=f'{C}/{season}_{week}_{pos}.json'
    if not os.path.exists(f):
        url=f'https://api.sleeper.com/stats/nfl/{season}/{week}?season_type=regular&position[]={pos}'
        d=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60)); json.dump(d,open(f,'w'))
    return json.load(open(f))
def score(stats,ss): return sum(v*ss[k] for k,v in stats.items() if k in ss)
def run(league,season):
    sf=json.load(open(f'{FH}/data/{league}/seasons/{season}.json')); L=sf['league']; ss=L['scoring_settings']
    weeks=list(range(1,int(L['settings']['playoff_week_start'])))
    poss=[p for p in ORDER if p in L['roster_positions']]
    rid2fl={r['roster_id']:uid2fl.get(str(r['owner_id'])) for r in sf['rosters']}
    tot={}; meta={}
    for w in weeks:
        for pos in poss:
            for x in get(season,w,pos):
                pl=x.get('player') or {}
                if pl.get('position')!=pos: continue
                pid=x['player_id']; tot.setdefault(pid,{})[w]=round(score(x['stats'] or {},ss),2)
                name=f"{pl.get('first_name','')} {pl.get('last_name','')}".strip()
                meta[pid]={'name':name,'team':x.get('team') or pl.get('team') or '','pos':pos}
    started={}; rostered={}; end={}; pp={}
    for w in weeks:
        for m in sf['matchups_by_week'].get(str(w),[]):
            fl=rid2fl.get(m['roster_id'])
            for pid in m.get('players') or []:
                rostered.setdefault(pid,{}); rostered[pid][fl]=rostered[pid].get(fl,0)+1
                if w==weeks[-1]: end[pid]=fl
            for pid in m.get('starters') or []:
                if pid=='0': continue
                started.setdefault(pid,{}); started[pid][fl]=started[pid].get(fl,0)+1
            for pid,v in (m.get('players_points') or {}).items(): pp.setdefault(pid,{})[w]=v
    # cross-check computed vs Sleeper matchup players_points
    diffs=[]; n=0
    for pid,wk in pp.items():
        for w,v in wk.items():
            if pid in tot and w in tot[pid]:
                n+=1
                if abs(tot[pid][w]-v)>0.011: diffs.append((meta[pid]['name'],w,tot[pid][w],v))
    out={'season':season,'source':'sleeper','weeks':[weeks[0],weeks[-1]],'basis':'regular','note':None,'positions':[]}
    for pos in poss:
        rows=[dict(meta[p],pts=round(sum(tot[p].values()),2),started=started.get(p,{}),rostered=rostered.get(p,{}),end_owner=end.get(p),id=p) for p in tot if meta[p]['pos']==pos]
        rows.sort(key=lambda r:-r['pts'])
        out['positions'].append({'pos':pos,'players':rows[:3]})
    os.makedirs(f'/workspace/topscorers/{league}',exist_ok=True)
    json.dump(out,open(f'/workspace/topscorers/{league}/{season}.json','w'),indent=1)
    print(league,season,f'weeks {weeks[0]}-{weeks[-1]}',f'xcheck {n} player-weeks, {len(diffs)} diffs',diffs[:5])
    for p in out['positions']: print('  ',p['pos'],[(r['name'],r['team'],r['pts'],r['started']) for r in p['players']])
for l,s in [('cmpffl','2024'),('cmpffl','2025'),('baptist-ballers','2025')]: run(l,s)
