'use strict';
// After a sync, measure how well we would have projected each new MIAA release from the previous one.
//   node scripts/accuracy_report.cjs <folder with the previous data files>
// For every sport whose official date moved forward: start from the previous official ratings, add the
// change our model predicts from the new games, shift by MIAA's scale rule, and compare to the new release.
// Appends one entry per sport to data/accuracy-log.json.
const fs=require('node:fs');
const path=require('node:path');
const {calculateRatings,miaaLevel}=require('../rating-engine.js');
const root=path.resolve(__dirname,'..');
const read=(file,name)=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\/\/[^\n]*\n/,'').trim().replace(new RegExp('^\\s*const '+name+'='),'').replace(/;\s*$/,''));
function sportsIn(dir){
 const fb=read(path.join(dir,'season-2026.js'),'DATA'),fall=read(path.join(dir,'fall-2026.js'),'FALL_DATA');
 return {football:{date:fb.date,games:fb.games,official:fb.official,divisions:fb.divisions,cap:14},
  ...Object.fromEntries(Object.entries(fall.sports).map(([k,s])=>[k,{date:s.date||fall.date,games:s.games,official:s.official,divisions:s.divisions,cap:s.cap}]))};
}
function project(prev,next){
 const played=s=>s.games.filter(g=>g[3]!==null&&g[4]!==null);
 const teams=[...new Set(played(prev).concat(played(next)).flatMap(g=>[g[1],g[2]]))].sort();
 const a=calculateRatings(played(prev),teams,next.divisions,next.cap),b=calculateRatings(played(next),teams,next.divisions,next.cap);
 const shift=miaaLevel(b)-miaaLevel(a);
 const errors=Object.keys(next.official).filter(t=>prev.official[t]&&a.teams[t]).map(t=>Math.abs(prev.official[t][1]+(b.teams[t].raw-a.teams[t].raw)+shift-next.official[t][1]));
 let rankMisses=0;
 for(const d of new Set(Object.values(next.divisions))){
  const ts=Object.keys(next.official).filter(t=>next.divisions[t]===d&&prev.official[t]&&a.teams[t]);
  const proj=t=>prev.official[t][1]+(b.teams[t].raw-a.teams[t].raw);
  ts.sort((x,y)=>proj(y)-proj(x)).forEach((t,i)=>{if(next.official[t][0]!==i+1)rankMisses++});
 }
 return {teams:errors.length,maxError:+Math.max(...errors).toFixed(5),meanError:+(errors.reduce((x,y)=>x+y,0)/errors.length).toFixed(5),within0001:errors.filter(e=>e<0.001).length,rankMisses};
}
const prevDir=process.argv[2];
if(!prevDir){console.error('usage: node scripts/accuracy_report.cjs <previous data folder>');process.exit(2)}
const before=sportsIn(prevDir),after=sportsIn(path.join(root,'data'));
const logFile=path.join(root,'data','accuracy-log.json');
const log=fs.existsSync(logFile)?JSON.parse(fs.readFileSync(logFile,'utf8')):[];
let added=0;
for(const [slug,next] of Object.entries(after)){
 const prev=before[slug];if(!prev||next.date<=prev.date)continue;
 const entry={sport:slug,from:prev.date,to:next.date,...project(prev,next)};
 log.push(entry);added++;console.log(JSON.stringify(entry));
}
if(added)fs.writeFileSync(logFile,JSON.stringify(log,null,1)+'\n');
else console.log('No new official release; nothing to measure.');
