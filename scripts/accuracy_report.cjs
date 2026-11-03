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
function project(prev,next,topN){
 const played=s=>s.games.filter(g=>g[3]!==null&&g[4]!==null);
 const teams=[...new Set(played(prev).concat(played(next)).flatMap(g=>[g[1],g[2]]))].sort();
 const a=calculateRatings(played(prev),teams,next.divisions,next.cap);
 const b=calculateRatings(played(next),teams,next.divisions,next.cap);
 const shift=miaaLevel(b)-miaaLevel(a);
 const ratings={};
 for(const t of Object.keys(next.official)){
  if(!prev.official[t]||!a.teams[t]||!b.teams[t])continue;
  ratings[t]=prev.official[t][1]+b.teams[t].raw-a.teams[t].raw+shift;
 }
 const residuals=Object.keys(ratings).map(t=>({team:t,division:next.divisions[t],error:ratings[t]-next.official[t][1]}));
 const errors=residuals.map(x=>Math.abs(x.error)).sort((x,y)=>x-y);
 const sum=errors.reduce((x,y)=>x+y,0);
 const divisions=[],n=Math.min(topN||32,32);
 let rankMisses=0,selected=0,exact=0;
 for(const d of [...new Set(Object.values(next.divisions))].sort((x,y)=>x-y)){
  const names=Object.keys(ratings).filter(t=>next.divisions[t]===d);
  const ordered=names.slice().sort((x,y)=>ratings[y]-ratings[x]||x.localeCompare(y));
  const published=names.slice().sort((x,y)=>next.official[x][0]-next.official[y][0]);
  const index=new Map(ordered.map((t,i)=>[t,i+1]));
  const misses=published.filter((t,i)=>index.get(t)!==i+1).length;
  const field=Math.min(n,published.length);
  const top=published.slice(0,field),predicted=ordered.slice(0,field);
  const selectedD=top.filter(t=>predicted.includes(t)).length;
  const exactD=top.filter((t,i)=>predicted[i]===t).length;
  rankMisses+=misses;selected+=selectedD;exact+=exactD;
  divisions.push({division:d,teams:names.length,rankMisses:misses,topN:field,topNSelected:selectedD,topNExactSeeds:exactD});
 }
 const quantile=p=>errors[Math.min(errors.length-1,Math.floor((errors.length-1)*p))]||0;
 return {
  teams:errors.length,maxError:+(errors.at(-1)||0).toFixed(5),
  meanError:+(sum/(errors.length||1)).toFixed(5),
  medianError:+quantile(.5).toFixed(5),
  p95Error:+quantile(.95).toFixed(5),
  within0001:errors.filter(e=>e<.001).length,rankMisses,
  topN:n,topNSelected:selected,topNExactSeeds:exact,
  divisions,
  largestResiduals:residuals.sort((x,y)=>Math.abs(y.error)-Math.abs(x.error)).slice(0,10)
   .map(x=>({...x,error:+x.error.toFixed(5)}))
 };
}
const prevDir=process.argv[2];
if(!prevDir){console.error('usage: node scripts/accuracy_report.cjs <previous data folder>');process.exit(2)}
const before=sportsIn(prevDir),after=sportsIn(path.join(root,'data'));
const logFile=path.join(root,'data','accuracy-log.json');
const log=fs.existsSync(logFile)?JSON.parse(fs.readFileSync(logFile,'utf8')):[];
let added=0;
for(const [slug,next] of Object.entries(after)){
 const prev=before[slug];if(!prev||next.date<=prev.date)continue;
 const entry={sport:slug,from:prev.date,to:next.date,...project(prev,next,slug==='football'?16:32)};
 log.push(entry);added++;console.log(JSON.stringify(entry));
}
if(added)fs.writeFileSync(logFile,JSON.stringify(log,null,1)+'\n');
else console.log('No new official release; nothing to measure.');
