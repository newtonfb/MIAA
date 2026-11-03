'use strict';
// Compare every published MIAA score row across consecutive official releases.
// Unlike win-loss reconciliation, this catches winner reversals, score edits,
// forfeits, removed games and genuine same-day multiple contests.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function load(file,name){
 const s=fs.readFileSync(file,'utf8').trim();
 const prefix='const '+name+'=';
 const i=s.indexOf(prefix);
 if(i<0)throw new Error('Missing '+name+' in '+file);
 return JSON.parse(s.slice(i+prefix.length).replace(/;\s*$/,''));
}
function sportFiles(dir){
 const fb=load(path.join(dir,'season-2026.js'),'DATA');
 const fall=load(path.join(dir,'fall-2026.js'),'FALL_DATA');
 return {football:fb,...fall.sports};
}
const matchup=g=>g[0]+'|'+[g[1],g[2]].sort().join('|');
function asRecord(g){
 const ordered=g[1]<=g[2];
 return {date:g[0],teams:ordered?[g[1],g[2]]:[g[2],g[1]],
  scores:ordered?[g[3],g[4]]:[g[4],g[3]],forfeit:!!g[5]};
}
const signature=g=>g.scores.join(':')+'|'+Number(g.forfeit);
function compareGames(before,after){
 const group=games=>{
  const m=new Map();
  for(const g of games.filter(g=>g[3]!==null&&g[4]!==null)){
   const k=matchup(g);
   if(!m.has(k))m.set(k,[]);
   m.get(k).push(asRecord(g));
  }
  return m;
 };
 const a=group(before),b=group(after);
 const result={added:[],removed:[],scoreCorrections:[],forfeitCorrections:[]};
 for(const key of new Set([...a.keys(),...b.keys()])){
  let old=(a.get(key)||[]).slice(),now=(b.get(key)||[]).slice();
  for(let i=old.length-1;i>=0;i--){
   const k=signature(old[i]),j=now.findIndex(v=>signature(v)===k);
   if(j>=0){old.splice(i,1);now.splice(j,1)}
  }
  // Remaining records under the same date and pair are revisions, not new games.
  old.sort((x,y)=>signature(x).localeCompare(signature(y)));
  now.sort((x,y)=>signature(x).localeCompare(signature(y)));
  while(old.length&&now.length){
   const prev=old.shift(),next=now.shift();
   if(prev.scores.join(':')!==next.scores.join(':'))result.scoreCorrections.push({date:next.date,teams:next.teams,from:prev.scores,to:next.scores});
   if(prev.forfeit!==next.forfeit)result.forfeitCorrections.push({date:next.date,teams:next.teams,from:prev.forfeit,to:next.forfeit});
  }
  result.removed.push(...old);
  result.added.push(...now);
 }
 for(const name of Object.keys(result))result[name].sort((x,y)=>x.date.localeCompare(y.date)||x.teams.join('|').localeCompare(y.teams.join('|')));
 return result;
}
function build(previous,current){
 const reports=[];
 for(const sport of Object.keys(current)){
  const a=previous[sport],b=current[sport];
  if(!a||!b)continue;
  const changed=compareGames(a.games,b.games);
  const oldOfficial=a.official||{},newOfficial=b.official||{};
  const modified=Object.keys(newOfficial).filter(t=>oldOfficial[t]&&(oldOfficial[t][1]!==newOfficial[t][1]||oldOfficial[t][0]!==newOfficial[t][0]));
  const moved=(a.date!==b.date)||!!a.final!==!!b.final;
  if(!moved&&!Object.values(changed).some(v=>v.length))continue;
  reports.push({
   sport,from:a.date,to:b.date,final:!!b.final,
   source:b.urls?.scores||null,
   previousGames:a.games.filter(g=>g[3]!==null).length,
   publishedGames:b.games.filter(g=>g[3]!==null).length,
   ratingOrRankChanges:modified.length,
   ...changed
  });
 }
 return reports;
}
function run(dir){
 const before=sportFiles(dir),after=sportFiles(path.join(root,'data'));
 const reports=build(before,after);
 if(!reports.length){console.log('MIAA audit: no published game changes.');return []}
 const dest=path.join(root,'data','reconciliation-log.json');
 const log=fs.existsSync(dest)?JSON.parse(fs.readFileSync(dest,'utf8')):[];
 for(const x of reports){
  const key=x.sport+'|'+x.from+'|'+x.to+'|'+x.final;
  const i=log.findIndex(v=>v.sport+'|'+v.from+'|'+v.to+'|'+v.final===key);
  if(i>=0)log[i]=x;else log.push(x);
  console.log('MIAA reconciliation '+x.sport+' '+x.from+' -> '+x.to+': '+
   x.added.length+' added, '+x.removed.length+' removed, '+
   x.scoreCorrections.length+' changed scores, '+x.forfeitCorrections.length+' forfeit changes.');
  for(const g of x.scoreCorrections)console.log('  CHANGED '+g.date+' '+g.teams.join(' vs ')+': '+g.from.join('-')+' -> '+g.to.join('-'));
  for(const g of x.forfeitCorrections)console.log('  FORFEIT '+g.date+' '+g.teams.join(' vs ')+': '+g.from+' -> '+g.to);
 }
 fs.writeFileSync(dest,JSON.stringify(log,null,2)+'\n');
 return reports;
}
if(require.main===module){
 const previous=process.argv[2];
 if(!previous)throw new Error('Usage: node scripts/audit_releases.cjs <previous data folder>');
 run(path.resolve(previous));
}
module.exports={asRecord,compareGames,build,run};
