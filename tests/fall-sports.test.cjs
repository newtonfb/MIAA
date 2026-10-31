'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculateRatings}=require('../rating-engine.js');
const root=path.resolve(__dirname,'..');
// Frozen copy of the Oct 30 release; data/fall-2026.js changes whenever scores are synced.
const js=fs.readFileSync(path.join(root,'tests/fixtures/fall-2026-10-30.js'),'utf8').trim();
const data=JSON.parse(js.replace(/^const FALL_DATA=/,'').replace(/;$/,''));
const keys=['field-hockey','boys-soccer','girls-soccer','volleyball'];
const limits={
 'field-hockey':{max:0.0022,mismatches:0},
 'boys-soccer':{max:0.0036,mismatches:6},
 'girls-soccer':{max:0.0040,mismatches:2},
 'volleyball':{max:0.0060,mismatches:4}
};
test('official Oct 30 PDF snapshot includes all four additional fall sports',()=>{
 assert.equal(data.date,'2026-10-30');
 for(const key of keys){
  const s=data.sports[key];
  assert.ok(s,key);
  assert.equal(s.cap,3);
  assert.ok(Object.keys(s.official).length>=100);
  assert.ok(s.games.length>=400);
  assert.ok(Object.values(s.divisions).every(d=>Number.isInteger(d)&&d>=1&&d<=5));
 }
});
for(const key of keys){
 test(key+' independent rating benchmark',()=>{
  const s=data.sports[key];
  const names=[...new Set(s.games.flatMap(g=>[g[1],g[2]]).concat(Object.keys(s.official)))].sort();
  const result=calculateRatings(s.games,names,s.divisions,s.cap);
  assert.equal(result.played,s.games.length);
  assert.ok(result.convergence<1e-6,key+' solver did not converge: '+result.convergence);
  const pairs=Object.entries(s.official);
  const offset=pairs.reduce((x,[t,v])=>x+v[1]-result.teams[t].raw,0)/pairs.length;
  const errs=pairs.map(([t,v])=>({t,err:result.teams[t].raw+offset-v[1]}));
  const max=Math.max(...errs.map(x=>Math.abs(x.err)));
  const mae=errs.reduce((a,x)=>a+Math.abs(x.err),0)/errs.length;
  const incorrect=[];
  for(const div of new Set(Object.values(s.divisions))){
   const entries=pairs.filter(([t])=>s.divisions[t]===div).sort((a,b)=>result.teams[b[0]].raw-result.teams[a[0]].raw);
   entries.forEach(([t,v],i)=>{if(v[0]!==i+1)incorrect.push({t,official:v[0],modeled:i+1})});
  }
  console.log(JSON.stringify({sport:key,teams:pairs.length,games:s.games.length,maxError:max,mae,rankMismatches:incorrect.length,worst:errs.sort((a,b)=>Math.abs(b.err)-Math.abs(a.err)).slice(0,6),reportedMarginDiscrepancies:s.marginErrors?.length||0}));
  assert.ok(Number.isFinite(max),key+' model produced nonfinite result');
  assert.ok(max<limits[key].max,key+' maximum rating error '+max+' exceeds published validation');
  assert.ok(incorrect.length<=limits[key].mismatches,key+' unexpected ranking changes '+JSON.stringify(incorrect));
  assert.equal(s.marginErrors.length,0,key+' official average capped margins do not match score data');
  for(const [team,[rank,rating,mov,opp,w,l,ties]] of pairs){
    const v=result.teams[team];
    assert.deepEqual([v.w,v.l,v.ties],[w,l,ties],key+' record mismatch for '+team);
    assert.ok(Math.abs(v.mov-mov)<0.001,key+' capped margin mismatch for '+team);
  }
  // Validation summary is intentionally printed separately; a rating benchmark
  // must not be falsely presented as four-decimal perfection.
 });
}
test('soccer draws and volleyball sets use correct scoring caps',()=>{
 const g=[['2026-10-30','A','B',7,0,0],['2026-10-29','A','C',0,0,0],['2026-10-28','B','C',3,2,0]];
 const model=calculateRatings(g,['A','B','C'],{},3);
 assert.equal(model.teams.A.mov,1.5);
 assert.equal(model.teams.A.ties,1);
 assert.ok(Number.isFinite(model.teams.A.raw));
});
