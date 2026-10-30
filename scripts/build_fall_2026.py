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

def scores(slug):
    pdf,url=fetch(f"{slug}-scores")
    games={}
    bad=[]; date_matches=0
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
                    if k in games:
                        old=games[k]
                        if old[1]==a and old[2]==b:ok=(old[3]==sa and old[4]==sb)
                        else:ok=(old[3]==sb and old[4]==sa)
                        if not ok:raise ValueError(f"Conflicting scores: {old} versus {g}")
                        old[5]=max(old[5],g[5])
                    else:games[k]=g
    print(f" {slug} scores: {date_matches} PDF rows, {len(games)} unique games; {len(bad)} unscored/unclear lines")
    if len(games)<400:raise ValueError(f"{slug} contains only {len(games)} games; scoring PDF parse failed")
    if bad:print(" sample unmatched:",repr(bad[:8]))
    return sorted(games.values()),url,len(bad)

def main():
    snap={"date":DATE,"generatedAt":datetime.now(timezone.utc).isoformat(),"sports":{}}
    for slug,(title,count) in SPORTS.items():
        ranks,divisions,rank_urls=rankings(slug,count)
        games,scores_url,unknown=scores(slug)
        if len(ranks)<100:raise ValueError(f"{slug}: low rank count {len(ranks)}")
        # Official ratings are the baseline; the independent solver's error
        # is separately validated by test scripts. Never assert all 4 decimals match.
        snap["sports"][slug]={"title":title,"cap":3,"divisions":divisions,
            "official":ranks,"games":games,"urls":{"rankings":rank_urls,"scores":scores_url},
            "unmatchedScoreLines":unknown}
        print(" Total:",slug,len(ranks),"teams,",len(games),"games")
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text("const FALL_DATA="+json.dumps(snap,separators=(",",":"),ensure_ascii=False)+";\n",encoding="utf8")
    print("Wrote",OUT,OUT.stat().st_size,"bytes")
if __name__=="__main__":main()
