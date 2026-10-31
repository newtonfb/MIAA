'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {calculateRatings}=require('../rating-engine.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const DATA=JSON.parse(read('data/season-2026.js').trim().replace(/^const DATA=/,'').replace(/;$/,''));
const CONFIRMED_FINALS=JSON.parse(read('data/confirmed-final-scores-2026.js').trim().replace(/^.*?const CONFIRMED_FINALS=/s,'').replace(/;$/,''));
const key=g=>g[0]+'|'+[g[1],g[2]].sort().join('|');
const officialKeys=new Set(DATA.games.map(key));
const friday=DATA.games.filter(g=>g[0]==='2026-10-30');
test('Friday supplemental scores: distinct, published, and tied to scheduled October 30 fixtures',()=>{
 assert.equal(CONFIRMED_FINALS.date,'2026-10-30');
 assert.equal(CONFIRMED_FINALS.games.length,111);
 const seen=new Set();
 for(const g of CONFIRMED_FINALS.games){
  assert.equal(g[0],'2026-10-30');
  assert.equal(g.length,6);
  assert.ok(g[5]===0||g[5]===1,'Invalid forfeit flag');
  assert.ok(Number.isInteger(g[3])&&Number.isInteger(g[4])&&g[3]>=0&&g[4]>=0);
  assert.ok(officialKeys.has(key(g)), 'Missing Arbiter matchup '+key(g));
  assert.ok(!seen.has(key(g)), 'Duplicate published Friday final '+key(g));
  seen.add(key(g));
  const orig=DATA.games.find(t=>key(t)===key(g));
  assert.equal(orig[3],null, 'Published October 30 baseline must remain frozen');
  assert.equal(orig[4],null, 'Published October 30 baseline must remain frozen');
 }
 assert.equal(friday.filter(g=>g[3]!==null).length,0);
});
test('published finals are applied once, locked, and displace stale local predictions',()=>{
 const old=CONFIRMED_FINALS.games[0];
 const priorScenario=[...old];priorScenario[3]=0;priorScenario[4]=0;
 const localStorage={
  getItem(k){return k==='miaa-scenario-lab-2026-oct30-v2'?JSON.stringify([priorScenario]):null},
  setItem(){}
 };
 let app=read('app.js');
 assert.match(app,/lab\.textContent=locked\?\(g\[5\]/);
 assert.match(app,/gtag locked">FINAL</);
 assert.match(read('index.html'),/data\/confirmed-final-scores-2026\.js/);
 app=app.replace(/\ninit\(\);\s*initFixtures\(\);\s*$/,'\nglobalThis.__audit={source,BASE,MODEL,PUBLISHED_FINALS,LOCKED_KEYS,POSTPONED_KEYS,edits,isLocked,pairKey,records};');
 const sandbox={DATA,CONFIRMED_FINALS,FALL_DATA:{sports:{}},calculateRatings,
  location:{search:''},localStorage,URLSearchParams,matchMedia:()=>({matches:true})};
 vm.runInNewContext(app,sandbox,{timeout:60000});
 const state=sandbox.__audit;
 assert.equal(state.BASE.played,919);
 assert.equal(state.PUBLISHED_FINALS.length,125);
 assert.equal(state.LOCKED_KEYS.size,125);
 assert.equal(state.MODEL.played,1032);
 assert.equal(state.edits.length,0, 'Old user prediction for a confirmed game must be discarded');
 for(const g of CONFIRMED_FINALS.games){
  const actual=state.source.get(key(g));
  assert.ok(actual,'Missing final '+key(g));
  assert.deepEqual([...actual],[...g]);
  assert.equal(state.isLocked(key(g)),true);
  assert.equal(state.records().filter(x=>key(x)===key(g)).length,1,'Duplicated '+key(g));
 }
 assert.equal(state.BASE.teams['Mahar Regional'].gp,7);
 assert.equal(state.MODEL.teams['Mahar Regional'].gp,8);
 assert.equal(state.MODEL.teams['Mahar Regional'].w,3);
 assert.equal(state.MODEL.teams['Mahar Regional'].l,5);
 const forfeits=['2026-10-30|Groton-Dunstable|Quabbin Regional','2026-10-30|Arlington|Lexington','2026-10-30|Saugus|Swampscott','2026-10-30|Keefe Tech|Southbridge'];
 for(const k of forfeits){const g=state.source.get(k);assert.ok(g,'Forfeit absent: '+k);assert.equal(g[5],1,'Forfeit must not add opponent strength: '+k);}
 const open=['2026-10-30|Marlborough|Shepherd Hill Regional','2026-10-30|Putnam Vo-Tech|Taconic'];
 for(const k of open){assert.equal(state.isLocked(k),false,'Do not mark unverifiable games FINAL: '+k)}
 assert.ok(state.POSTPONED_KEYS.has('2026-10-30|Putnam Vo-Tech|Taconic'));
 assert.match(app,/POSTPONED_KEYS\.has\(k\)/);
 function expectFinal(a,b,sa,sb){
  const k='2026-10-30|'+[a,b].sort().join('|');
  const g=state.source.get(k);
  assert.ok(g,'Missing screenshot-backed score: '+k);
  assert.equal(g[1]===a?g[3]:g[4],sa,k+' first score');
  assert.equal(g[1]===a?g[4]:g[3],sb,k+' opponent score');
  assert.equal(state.isLocked(k),true,'Not marked FINAL: '+k);
 }
 const globe=[
  ['Ayer Shirley','Murdock',13,12],['Apponequet Regional','Dighton-Rehoboth',34,20],
  ['Brighton','Boston Latin Academy',18,16],['Somerville','Malden',38,6],
  ['Chicopee Comp.','Amherst-Pelham Reg.',12,6],['Old Colony RVT','Southeastern RVT',26,20],
  ['Winchester','Belmont',35,0],['Framingham','Needham',33,20],
  ['East Boston','Tech Boston Academy',38,13],['Northbridge','Millbury',50,13],
  ['Tantasqua Regional','Doherty Memorial',28,14],
  ['Springfield Central','West Springfield',54,7],
  ['La Salle Academy (R.I.)','Bishop Feehan',34,7],
  ['Waltham','Boston Latin',50,21],['Joseph Case','Sharon',41,14]
 ];
 for(const row of globe)expectFinal(...row);
 assert.equal(CONFIRMED_FINALS.scoreCorrections.length,9,'Every revised scoreboard should be auditable');
 assert.equal(CONFIRMED_FINALS.scoreCorrections.filter(x=>x.cappedMarginChanged).length,2);

 assert.deepEqual([...state.source.get('2026-10-30|Lynn Vo-Tech|Nashoba Valley Tech')],['2026-10-30','Nashoba Valley Tech','Lynn Vo-Tech',21,28,0]);

 assert.equal(state.MODEL.teams['Greenfield'].w,3);
 assert.equal(state.MODEL.teams['Greenfield'].l,5);
 assert.deepEqual([...state.source.get('2026-10-30|Franklin County Tech|Mahar Regional')],['2026-10-30','Mahar Regional','Franklin County Tech',6,36,0]);
 assert.deepEqual([...state.source.get('2026-10-30|Athol|Greenfield')],['2026-10-30','Athol','Greenfield',0,26,0]);
});
