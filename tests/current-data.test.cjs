'use strict';
// Checks whatever data is currently published, so a sync can't ship a broken ledger.
// The frozen-release benchmarks live in rating-engine.test.cjs and fall-sports.test.cjs.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {calculateRatings}=require('../rating-engine.js');
const root=path.resolve(__dirname,'..');
const read=(file,name)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').trim().replace(new RegExp('^const '+name+'='),'').replace(/;\s*$/,''));
const football=read('data/season-2026.js','DATA');
const fall=read('data/fall-2026.js','FALL_DATA');
const sports={football:{...football,cap:14},...fall.sports};

for(const [slug,s] of Object.entries(sports)){
 test(slug+': published records and capped margins match the score ledger',()=>{
  const played=s.games.filter(g=>g[3]!==null);
  const names=[...new Set(played.flatMap(g=>[g[1],g[2]]).concat(Object.keys(s.official)))].sort();
  const m=calculateRatings(played,names,s.divisions,s.cap);
  assert.ok(m.convergence<1e-6,'solver did not converge');
  assert.equal(Object.keys(s.official).length,Object.keys(s.divisions).length);
  for(const [team,row] of Object.entries(s.official)){
   assert.ok(s.divisions[team],team+' has no division');
   if(row.length<7)continue; // older football rows hold only rank and rating
   const [, , mov, , w, l, ties]=row,v=m.teams[team];
   assert.deepEqual([v.w,v.l,v.ties],[w,l,ties],'record mismatch for '+team);
   assert.ok(Math.abs(v.mov-mov)<0.00051,'capped margin mismatch for '+team);
  }
 });
 test(slug+': independent ratings stay close to MIAA and keep its order',()=>{
  const played=s.games.filter(g=>g[3]!==null);
  const names=[...new Set(played.flatMap(g=>[g[1],g[2]]).concat(Object.keys(s.official)))].sort();
  const m=calculateRatings(played,names,s.divisions,s.cap);
  const rows=Object.entries(s.official);
  const offset=rows.reduce((x,[t,v])=>x+v[1]-m.teams[t].raw,0)/rows.length;
  const max=Math.max(...rows.map(([t,v])=>Math.abs(m.teams[t].raw+offset-v[1])));
  assert.ok(max<0.01,'max rating error '+max);
  let wrong=0;
  for(const d of new Set(Object.values(s.divisions))){
   rows.filter(([t])=>s.divisions[t]===d).sort((a,b)=>m.teams[b[0]].raw-m.teams[a[0]].raw).forEach(([,v],i)=>{if(v[0]!==i+1)wrong++});
  }
  assert.ok(wrong<=Math.ceil(rows.length*0.03),wrong+' rank positions differ from MIAA');
 });
}
