'use strict';
// Summarize what a sync changed in each sport, comparing the data files before the sync (a folder holding
// the previous season-2026.js, fall-2026.js and live-2026.js) with the ones now in data/.
//   node scripts/sync_summary.cjs /tmp/previous
// Prints one "SYNC_SUMMARY {json}" line, which api/sync.js reads from the run log for the Admin dialog,
// and adds a readable table to the GitHub Actions run page.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const prevDir=process.argv[2]||'/tmp/previous';

function read(file,name){
  if(!fs.existsSync(file))return null;
  return vm.runInNewContext(fs.readFileSync(file,'utf8')+`;${name}`);
}
function load(dir){
  const fb=read(path.join(dir,'season-2026.js'),'DATA'),fall=read(path.join(dir,'fall-2026.js'),'FALL_DATA'),live=read(path.join(dir,'live-2026.js'),'LIVE_DATA');
  const sports={};
  if(fb)sports.football={name:'Football',date:fb.date,games:fb.games.filter(g=>g[3]!==null)};
  for(const [slug,s] of Object.entries(fall?.sports||{}))sports[slug]={name:s.title,date:s.date||fall.date,games:s.games};
  for(const [slug,s] of Object.entries(live?.sports||{})){sports[slug]??={name:slug};Object.assign(sports[slug],{results:s.results||[],upcoming:(s.upcoming||[]).length})}
  return sports;
}

const before=load(prevDir),after=load(path.join(root,'data'));
const matchKey=g=>`${g[0]}|${g[1]}|${g[2]}`;
const summary=Object.entries(after).map(([slug,now])=>{
  const was=before[slug]||{};
  const oldResults=new Map((was.results||[]).map(g=>[matchKey(g),g]));
  const newResults=[],corrected=[];
  for(const g of now.results||[]){
    const old=oldResults.get(matchKey(g));
    if(!old)newResults.push(g.slice(0,5));
    else if(old[3]!==g[3]||old[4]!==g[4]||old[5]!==g[5])corrected.push(g.slice(0,5));
  }
  return {sport:slug,name:now.name,release:now.date||null,previousRelease:was.date||null,
    officialGamesAdded:Math.max(0,(now.games||[]).length-(was.games||[]).length),
    newResults,corrected,upcoming:now.upcoming??0,previousUpcoming:was.upcoming??0};
});

console.log('SYNC_SUMMARY '+JSON.stringify({finished:new Date().toISOString(),sports:summary}));
if(process.env.GITHUB_STEP_SUMMARY){
  const rows=summary.map(s=>`| ${s.name} | ${s.release===s.previousRelease?`${s.release} (unchanged)`:`${s.previousRelease} → ${s.release}`} | ${s.officialGamesAdded} | ${s.newResults.length} | ${s.corrected.length} | ${s.upcoming} |`);
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,['## Sync summary','','| Sport | Official ratings | Official games added | New results | Corrected scores | Upcoming |','| --- | --- | ---: | ---: | ---: | ---: |',...rows,''].join('\n'));
}
