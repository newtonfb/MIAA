'use strict';
// Run without dependencies: node --test tests/rating-engine.test.cjs
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculateRatings}=require('../rating-engine.js');
const ROOT=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'data/season-2026.js'),'utf8');
const DATA=JSON.parse(source.replace(/^\s*const DATA=/,'').replace(/;\s*$/,''));
const benchmark=JSON.parse(fs.readFileSync(path.join(ROOT,'data/official-oct30-2026.json'),'utf8'));
const names=[...new Set(DATA.games.flatMap(g=>[g[1],g[2]]))].sort();
const baseline=calculateRatings(DATA.games,names,DATA.divisions);
const official=benchmark.official;
const anchor=Object.entries(official).reduce((s,[team,record])=>
  s+record[1]-baseline.teams[team].raw,0)/Object.keys(official).length;

test('Oct 30 reference contains precisely 919 completed games and all 262 official ratings',()=>{
  assert.equal(DATA.date,'2026-10-30');
  assert.equal(baseline.played,919);
  assert.equal(Object.keys(official).length,262);
  assert.equal(DATA.games.filter(g=>g[5]&&g[3]!==null).length,7);
  assert.ok(baseline.convergence<1e-8);
  assert.ok(baseline.iter<500);
});

test('independent solver reproduces all 262 official ratings within 0.0022 points',()=>{
  let max=0,mae=0;
  for(const [team,[rank,expected]] of Object.entries(official)){
    assert.ok(baseline.teams[team], 'Missing '+team);
    const error=Math.abs(baseline.teams[team].raw+anchor-expected);
    max=Math.max(error,max);mae+=error;
  }
  mae/=262;
  assert.ok(max<0.0022,'maximum error '+max);
  assert.ok(mae<0.001,'mean absolute error '+mae);
});

test('only Ware and Wareham swap order because official ratings differ by 0.0006',()=>{
  const wrong=[];
  for(let division=1;division<=8;division++){
    const ranked=Object.entries(official).filter(([name])=>DATA.divisions[name]===division)
      .sort((a,b)=>baseline.teams[b[0]].raw-baseline.teams[a[0]].raw);
    ranked.forEach(([name,[rank]],index)=>{if(rank!==index+1)wrong.push(name)});
  }
  assert.deepEqual(wrong.sort(),['Ware','Wareham']);
  assert.ok(Math.abs(official.Ware[1]-official.Wareham[1])<0.001);
});

test('corrected Oct 23 score and forfeit classification are present exactly once',()=>{
  const kipp=DATA.games.filter(g=>g[0]==='2026-10-23'&&[g[1],g[2]].sort().join('|')==='KIPP Academy Lynn Coll.|Nashoba Valley Tech');
  assert.equal(kipp.length,1);
  assert.deepEqual(kipp[0].slice(3,6),[6,41,0]);
  const quabbin=DATA.games.filter(g=>g[0]==='2026-10-23'&&[g[1],g[2]].sort().join('|')==='Quabbin Regional|Tyngsborough');
  assert.equal(quabbin.length,1);
  assert.deepEqual(quabbin[0].slice(3,6),[0,14,1]);
  assert.equal(baseline.teams['Mahar Regional'].w,3);
  assert.equal(baseline.teams['Mahar Regional'].l,4);
  assert.equal(baseline.teams['Mahar Regional'].mov,2/7);
});

test('a 99-point win and a 14-point win have the same margin contribution',()=>{
  const g=[['2026-01-01','A','B',14,0,0],['2026-01-02','A','C',3,0,0],['2026-01-03','B','C',5,3,0]];
  const x=calculateRatings(g,['A','B','C'],{});
  g[0][3]=99;
  const y=calculateRatings(g,['A','B','C'],{});
  for(const t of ['A','B','C']) assert.ok(Math.abs(x.teams[t].raw-y.teams[t].raw)<1e-8);
});

test('an isolated out-of-state opponent leaves Massachusetts relative ratings unchanged',()=>{
  const more=[...DATA.games,['2026-10-30','Mahar Regional','Unconnected N.Y. School',42,0,0]];
  const m=calculateRatings(more,[...names,'Unconnected N.Y. School'],DATA.divisions);
  for(const team of ['Mahar Regional','Lee','Franklin County Tech','Ware']){
    const before=baseline.teams[team].raw-baseline.teams['St. John\'s Prep'].raw;
    const after=m.teams[team].raw-m.teams['St. John\'s Prep'].raw;
    assert.ok(Math.abs(before-after)<1e-7,team+' changed '+(after-before));
  }
});

test('a forfeit changes only the two teams own values, not the opponent-strength network',()=>{
  const more=[...DATA.games,['2026-10-30','Mahar Regional','Franklin County Tech',14,0,1]];
  const m=calculateRatings(more,names,DATA.divisions);
  for(const team of ['Lee','Greenfield','Ware']){
    assert.ok(Math.abs(m.teams[team].raw-baseline.teams[team].raw)<1e-7,team);
  }
  assert.ok(m.teams['Mahar Regional'].raw>baseline.teams['Mahar Regional'].raw);
  assert.equal(m.teams['Mahar Regional'].w,4);
  assert.equal(m.teams['Franklin County Tech'].forfeitLosses,1);
});
