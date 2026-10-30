#!/usr/bin/env python3
"""Download MIAA's *published* fall rankings and scores to a versioned JSON snapshot.
Run: pip install requests pdfplumber ; python scripts/build_fall_2026.py
Requires no MIAA account. Never silently skip an unavailable source PDF.
"""
import io
import json
import re
from pathlib import Path
from datetime import datetime, timezone
import requests
import pdfplumber

BASE="https://www.miaa.net/sites/default/files/2026-09/power-rankings-fall-2026-"
SPORTS={"field-hockey":("Field Hockey",4),"boys-soccer":("Boys Soccer",5),"girls-soccer":("Girls Soccer",5),"volleyball":("Volleyball",5)}
OUT=Path(__file__).resolve().parents[1]/"data"/"fall-2026.js"
DATE="2026-10-30"
FLOAT=r"([+-]?\d+\.\d{4})"
RANK_SOCCER=re.compile(r"^(\d{1,3})\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\s+"+r"\s+".join([FLOAT]*3)+r"(?:\s+"+FLOAT+r")?\s*$")
RANK_VB=re.compile(r"^(\d{1,3})\s+(.+?)\s+(\d{1,2})\s+(\d{1,2})\s+"+r"\s+".join([FLOAT]*3)+r"(?:\s+"+FLOAT+r")?\s*$")
SCORE=re.compile(r"^(\d{1,2}/\d{1,2})\s+(.+?)\s+(\d{1,2})\s+(.+?)\s+(\d{1,2})(?:\s+(F))?\s*$")

def fetch(suffix):
    url=BASE+suffix+".pdf"
    r=requests.get(url,timeout=70,headers={"User-Agent":"MIAA-2026-Public-Rankings-Archiver/1.0"})
    r.raise_for_status()
    if not r.content.startswith(b"%PDF"):
        raise ValueError("Not a PDF: "+url)
    print(f"Downloaded {suffix}: {len(r.content):,} bytes")
    return pdfplumber.open(io.BytesIO(r.content)),url

def rankings(slug,ndiv):
    result={}; divisions={}; urls=[]
    for division in range(1,ndiv+1):
        pdf,url=fetch(f"{slug}-division-{division}")
        urls.append(url)
        with pdf:
            found=[]
            for page in pdf.pages:
                for line in (page.extract_text(x_tolerance=2,y_tolerance=3) or "").splitlines():
                    line=" ".join(line.strip().split())
                    m=(RANK_VB if slug=="volleyball" else RANK_SOCCER).match(line)
                    if not m:continue
                    g=m.groups(); rank=int(g[0]); name=g[1].strip()
                    wl=list(map(int,g[2:4])); ties=0 if slug=="volleyball" else int(g[4])
                    vals=g[4:] if slug=="volleyball" else g[5:]
                    margin,opponent,rating=map(float,vals[:3])
                    if name in result:raise ValueError(f"{slug}: duplicate team {name}")
                    result[name]=[rank,rating,margin,opponent,wl[0],wl[1],ties, float(vals[3]) if vals[3] else None]
                    divisions[name]=division
                    found.append(name)
            if len(found)<8:raise ValueError(f"{slug} D{division}: parsed just {len(found)} rankings; PDF layout changed")
            print(f" {slug} D{division}: {len(found)} teams")
    return result,divisions,urls

def scores(slug,official):
    pdf,url=fetch(f"{slug}-scores")
    games={}
    observed={}
    bad=[]; date_matches=0; conflicting_capped=[]; conflicts=[]
    with pdf:
        for page in pdf.pages:
            mid=page.width/2
            for x0,x1 in [(0,mid-5),(mid-5,page.width)]:
                txt=page.crop((x0,0,x1,page.height)).extract_text(x_tolerance=2,y_tolerance=3) or ""
                for row in txt.splitlines():
                    line=" ".join(row.strip().split())
                    m=SCORE.match(line)
                    if not m:
                        if re.match(r"^\d{1,2}/\d{1,2}\s",line):bad.append(line)
                        continue
                    day,a,sa,b,sb,flag=m.groups()
                    date_matches+=1
                    d=f"2026-{int(day.split('/')[0]):02d}-{int(day.split('/')[1]):02d}"
                    if d>DATE:continue
                    sa,sb=int(sa),int(sb)
                    if sa>99 or sb>99:raise ValueError(f"Suspicious score {slug} {line}")
                    if not a or not b or a==b:raise ValueError("Bad matchup "+line)
                    k=(d,)+tuple(sorted((a,b)))
                    g=[d,a,b,sa,sb,1 if flag else 0]
                    observed.setdefault(k,[]).append(g)
                    if k in games:
                        old=games[k]
                        if old[1]==a and old[2]==b:ok=(old[3]==sa and old[4]==sb)
                        else:ok=(old[3]==sb and old[4]==sa)
                        if not ok:
                            # MIAA occasionally reports a different raw blowout in the
                            # two team schedules. Both are equivalent if the cap is 3.
                            diff1=old[3]-old[4]
                            diff2=(sa-sb) if old[1]==a else (sb-sa)
                            cap=lambda x:max(-3,min(3,x))
                            if cap(diff1)==cap(diff2):
                                conflicting_capped.append([old,g]);continue
                            conflicts.append((k,old,g));continue
                        old[5]=max(old[5],g[5])
                    else:games[k]=g
    # IMPORTANT: one team can play the same opponent *twice on the same date*.
    # The PDFs list each match under both schools. Don't collapse a doubleheader
    # into one result just because the date and teams are the same.
    extras=[]
    doubleheaders=[]
    for key,records in observed.items():
        by_source={}
        for g in records:by_source.setdefault(g[1],[]).append(g)
        source=max(by_source.values(),key=len)
        if len(source)>1:
            games[key]=source[0]
            extras.extend(source[1:])
            doubleheaders.append([key[0],key[1],key[2],len(source)])
    if doubleheaders:print("Same-day multiple-match fixtures:",repr(doubleheaders[:20]))
    # Resolve inconsistent non-capped scores against the published average
    # capped margin; do not silently assume either team's entry is correct.
    def fitted_margin(team, candidate, lookup_key):
        season=[candidate if k==lookup_key else g for k,g in games.items()]+extras
        played=[g for g in season if g[1]==team or g[2]==team]
        if not played:return None
        margins=[max(-3,min(3,g[3]-g[4]))*(1 if g[1]==team else -1) for g in played]
        return sum(margins)/len(margins)
    unresolved=[]
    for k,old,new in conflicts:
        trial=[]
        for proposed in [old,new]:
            score=0;used=0
            for t in {old[1],old[2]}:
                if t not in official:continue
                predicted=fitted_margin(t,proposed,k)
                score+=(predicted-official[t][2])**2
                used+=1
            trial.append(score if used else float('inf'))
        if trial[1]<trial[0]:games[k]=new
        unresolved.append({"date":k[0],"teams":[k[1],k[2]],"candidates":[[old[3],old[4]],[new[3],new[4]]],
            "chosen":"second" if trial[1]<trial[0] else "first","marginResidual":[round(x,6) if x!=float('inf') else None for x in trial]})
    if unresolved:print("Non-equivalent reported score conflicts:",repr(unresolved[:12]))
    # Margin-of-victory consistency is a more meaningful data-quality check
    # than team count or PDF size. Capture all mismatches for independent audit.
    margin_errors=[]
    for team,row in official.items():
        actual=fitted_margin(team,None,("unmatched",))
        if actual is not None and abs(actual-row[2])>0.001:
            margin_errors.append([team,round(actual-row[2],4)])
    margin_errors.sort(key=lambda x:abs(x[1]),reverse=True)
    print(" MOV errors >0.001:",len(margin_errors),"largest:",margin_errors[:12])
    print(f" {slug} scores: {date_matches} PDF rows, {len(games)+len(extras)} unique games; {len(bad)} unscored/unclear lines; {len(conflicting_capped)} equivalent-score discrepancies")
    if len(games)+len(extras)<400:raise ValueError(f"{slug} contains only {len(games)} games; scoring PDF parse failed")
    if bad:print(" sample unmatched:",repr(bad[:8]))
    if conflicting_capped: print(" capped-equivalent discrepancies:",repr(conflicting_capped[:6]))
    return sorted(list(games.values())+extras),url,len(bad),len(conflicting_capped),unresolved,margin_errors,doubleheaders

def main():
    snap={"date":DATE,"generatedAt":datetime.now(timezone.utc).isoformat(),"sports":{}}
    for slug,(title,count) in SPORTS.items():
        ranks,divisions,rank_urls=rankings(slug,count)
        games,scores_url,unknown,discrepant,conflicts,margin_errors,doubleheaders=scores(slug,ranks)
        if len(ranks)<100:raise ValueError(f"{slug}: low rank count {len(ranks)}")
        # Official ratings are the baseline; the independent solver's error
        # is separately validated by test scripts. Never assert all 4 decimals match.
        snap["sports"][slug]={"title":title,"cap":3,"divisions":divisions,
            "official":ranks,"games":games,"urls":{"rankings":rank_urls,"scores":scores_url},
            "unmatchedScoreLines":unknown,"equivalentScoreDiscrepancies":discrepant,"scoreConflicts":conflicts,"marginErrors":margin_errors,"sameDayMultipleMatches":doubleheaders}
        print(" Total:",slug,len(ranks),"teams,",len(games),"games")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text("const FALL_DATA="+json.dumps(snap,separators=(",",":"),ensure_ascii=False)+";\n",encoding="utf8")
    print("Wrote",OUT,OUT.stat().st_size,"bytes")
if __name__=="__main__":main()
