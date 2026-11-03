'use strict';
// Independently report fixtures known by MIAA's public scoreboard that do
// not yet have an authoritative scored ledger row or a sourced reported final.
// Zero unresolved does NOT prove a complete statewide schedule.
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
function read(file,key){
 const s=fs.readFileSync(path.join(ROOT,file),'utf8');
 const marker='const '+key+'=',i=s.indexOf(marker);
 if(i<0)throw Error('Cannot find '+key+' in '+file);
 return JSON.parse(s.slice(i+marker.length).trim().replace(/;\s*$/,''));
}
const pair=g=>[g[1],g[2]].sort().join('|');
const key=g=>g[0]+'|'+pair(g);
const daysApart=(a,b)=>Math.abs(Date.parse(a+'T12:00:00Z')-Date.parse(b+'T12:00:00Z'))/86400000;
const CUTOFF={'football':'2026-10-31','field-hockey':'2026-11-01','boys-soccer':'2026-11-03','girls-soccer':'2026-11-03','volleyball':'2026-11-01'};
function audit(sport,official,live,reported,today){
 const cutoff=CUTOFF[sport];
 if(!cutoff)throw Error('No cutoff for '+sport);
 const scored=(official?.games||[]).filter(g=>g[3]!==null&&g[4]!==null);
 const known=reported?.sports?.[sport]||[];
 const allScored=scored.concat(known.map(x=>x.game));
 const notCounting=new Set((reported?.notCounting?.[sport]||[]).map(x=>key(x.game)));
 const canceled=new Set((live?.canceled||[]).map(key));
 const postponed=new Set((live?.postponed||[]).map(key));
 const unverified=new Set((live?.unverified||[]).map(key));
 const ignored=[],unresolved=[];
 const seen=new Set();
 for(const fixture of live?.upcoming||[]){
  if(fixture[0]>cutoff)continue;
  const k=key(fixture);
  if(seen.has(k))continue;
  seen.add(k);
  if(notCounting.has(k)){ignored.push({date:fixture[0],teams:fixture.slice(1,3),reason:'excluded exhibition/scrimmage'});continue}
  if(canceled.has(k)){ignored.push({date:fixture[0],teams:fixture.slice(1,3),reason:'canceled'});continue}
  if(allScored.some(g=>pair(g)===pair(fixture)&&daysApart(g[0],fixture[0])<=3))continue;
  unresolved.push({date:fixture[0],teams:fixture.slice(1,3),time:fixture[3]||null,
   status:postponed.has(k)?'postponed':fixture[0]<today?'overdue':unverified.has(k)?'unverified':'scheduled',
   verifiedFinal:false});
 }
 const overdue=unresolved.filter(x=>x.status==='overdue'||x.status==='postponed');
 return {cutoff,source:'MIAA public scoreboard',feedStatus:live?.feedStatus||'not-reported',
  verifiedRelease:official?.date||null,
  knownScheduledWithoutFinal:unresolved.length,overdueCount:overdue.length,
  unresolved,ignored};
}
function run(today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'})){
 const fb=read('data/season-2026.js','DATA');
 const fall=read('data/fall-2026.js','FALL_DATA');
 const live=read('data/live-2026.js','LIVE_DATA').sports;
 const reported=read('data/verified-reported-2026.js','REPORTED_FALL_FINALS');
 const official={football:fb,...fall.sports};
 const result={asOf:today,note:'Known scoreboard fixtures only; no claim of complete statewide schedule or game verification.',sports:{}};
 for(const sport of Object.keys(CUTOFF)){
  result.sports[sport]=audit(sport,official[sport],live[sport],reported,today);
  const x=result.sports[sport];
  console.log(sport+': '+x.knownScheduledWithoutFinal+' unresolved through cutoff, '+x.overdueCount+' overdue or postponed. Live feed: '+x.feedStatus);
 }
 fs.writeFileSync(path.join(ROOT,'data','unresolved-games.json'),JSON.stringify(result,null,2)+'\n');
 return result;
}
if(require.main===module)run();
module.exports={audit,run,key,CUTOFF};
