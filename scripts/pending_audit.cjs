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
function parseLedgerUnscored(line,official){
 const m=String(line).match(/^(\d{1,2})\/(\d{1,2})\s+(.+)$/);
 if(!m)return null;
 const date='2026-'+m[1].padStart(2,'0')+'-'+m[2].padStart(2,'0');
 const body=m[3].trim(),names=Object.keys(official?.divisions||{}).concat('#N/A');
 // The original two-column PDF loses its column separators for unscored games;
 // recover both names only when they exactly reconstruct the printed row.
 const candidates=[];
 for(const a of names){
  if(!body.startsWith(a+' '))continue;
  const b=body.slice(a.length+1);
  if(names.includes(b))candidates.push([date,a,b,null]);
 }
 const keys=[...new Set(candidates.map(key))];
 if(keys.length!==1)return null;
 return candidates[0];
}
function audit(sport,official,live,reported,today){
 const cutoff=CUTOFF[sport];
 if(!cutoff)throw Error('No cutoff for '+sport);
 const scored=(official?.games||[]).filter(g=>g[3]!==null&&g[4]!==null);
 const known=reported?.sports?.[sport]||[];
 const allScored=scored.concat(known.map(x=>x.game));
 const notCounting=new Map((reported?.notCounting?.[sport]||[]).map(x=>[key(x.game),x]));
 const canceled=new Set((live?.canceled||[]).map(key));
 const postponed=new Set((live?.postponed||[]).map(key));
 const unverified=new Set((live?.unverified||[]).map(key));
 const ignored=[],unresolved=[],unparseableLedgerLines=[],unidentifiedOpponentFixtures=[];
 const seen=new Set();
 const fromScoreboard=new Set((live?.upcoming||[]).map(key));
 const fixtures=(live?.upcoming||[]).slice();
 for(const line of official?.unmatchedScoreDetails||[]){
  const g=parseLedgerUnscored(line,official);
  if(g)fixtures.push(g);
  else unparseableLedgerLines.push(line);
 }
 for(const fixture of fixtures){
  if(fixture[0]>cutoff)continue;
  const k=key(fixture);
  if(seen.has(k))continue;
  seen.add(k);
  if(fixture[1]==='#N/A'||fixture[2]==='#N/A'){
   unidentifiedOpponentFixtures.push({date:fixture[0],teams:fixture.slice(1,3),reason:'MIAA PDF has an unknown opponent (#N/A); cannot treat as a verified fixture'});continue
  }
  if(notCounting.has(k)){
   const entry=notCounting.get(k),reason=/(?:scrimmage confirmed|listed in arbiter as a scrimmage|game type:\s*scrimmage)/i.test(entry?.note||'')?'scrimmage':/no (?:verified )?final|no final score/i.test(entry?.note||'')?'no reported final':'explicitly excluded';
   ignored.push({date:fixture[0],teams:fixture.slice(1,3),reason});continue
  }
  if(canceled.has(k)){ignored.push({date:fixture[0],teams:fixture.slice(1,3),reason:'canceled'});continue}
  if(allScored.some(g=>pair(g)===pair(fixture)&&daysApart(g[0],fixture[0])<=3))continue;
  unresolved.push({date:fixture[0],teams:fixture.slice(1,3),time:fixture[3]||null,
   status:postponed.has(k)?'postponed':unverified.has(k)?'unverified-fixture':(!official?.final&&official?.date&&fixture[0]>=official.date)?'awaiting-next-release':fixture[0]<today?'overdue':'scheduled',
   source:fromScoreboard.has(k)?'MIAA scoreboard':(official?.unmatchedScoreDetails||[]).length?'MIAA published unscored ledger row':'MIAA scoreboard',
   verifiedFinal:false});
 }
 const overdue=unresolved.filter(x=>x.status==='overdue'||x.status==='postponed');
 const unverifiedFixtures=unresolved.filter(x=>x.status==='unverified-fixture');
 const awaitingNextRelease=unresolved.filter(x=>x.status==='awaiting-next-release');
 return {cutoff,source:'MIAA scoreboard plus official unscored ledger',feedStatus:live?.feedStatus||'not-reported',
  verifiedRelease:official?.date||null,
  knownScheduledWithoutFinal:unresolved.length,overdueCount:overdue.length,
  unverifiedFixtureCount:unverifiedFixtures.length,awaitingNextReleaseCount:awaitingNextRelease.length,
  note:'Unverified fixtures disappeared from the live scoreboard; games scheduled on or after a 4 a.m. MIAA snapshot are awaiting the next release. Neither is a confirmed missing score.',
  unparseableLedgerLines,unidentifiedOpponentCount:unidentifiedOpponentFixtures.length,unidentifiedOpponentFixtures,unresolved,ignored};
}
function run(today=new Date().toLocaleDateString('sv-SE',{timeZone:'America/New_York'})){
 const fb=read('data/season-2026.js','DATA');
 const fall=read('data/fall-2026.js','FALL_DATA');
 const live=read('data/live-2026.js','LIVE_DATA').sports;
 const reported=read('data/verified-reported-2026.js','REPORTED_FALL_FINALS');
 const official={football:fb,...fall.sports};
 const result={asOf:today,note:'Known MIAA scoreboard fixtures and PDF unscored rows only; unverified fixtures may never have been played. No claim of complete statewide schedule.',sports:{}};
 for(const sport of Object.keys(CUTOFF)){
  result.sports[sport]=audit(sport,official[sport],live[sport],reported,today);
  const x=result.sports[sport];
  console.log(sport+': '+x.knownScheduledWithoutFinal+' unresolved through cutoff, '+x.overdueCount+' overdue or postponed. Live feed: '+x.feedStatus);
 }
 fs.writeFileSync(path.join(ROOT,'data','unresolved-games.json'),JSON.stringify(result,null,2)+'\n');
 return result;
}
if(require.main===module)run();
module.exports={audit,run,key,CUTOFF,parseLedgerUnscored};
