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
 assert.equal(CONFIRMED_FINALS.games.length,105);
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
 app=app.replace(/\ninit\(\);\s*initFixtures\(\);\s*$/,'\nglobalThis.__audit={source,BASE,MODEL,PUBLISHED_FINALS,LOCKED_KEYS,edits,isLocked,pairKey,records};');
 const sandbox={DATA,CONFIRMED_FINALS,FALL_DATA:{sports:{}},calculateRatings,
  location:{search:''},localStorage,URLSearchParams,matchMedia:()=>({matches:true})};
 vm.runInNewContext(app,sandbox,{timeout:60000});
 const state=sandbox.__audit;
 assert.equal(state.BASE.played,919);
 assert.equal(state.PUBLISHED_FINALS.length,119);
 assert.equal(state.LOCKED_KEYS.size,119);
 assert.equal(state.MODEL.played,1026);
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
 const open=['2026-10-30|Ayer Shirley|Murdock','2026-10-30|Apponequet Regional|Dighton-Rehoboth'];
 for(const k of open){assert.equal(state.isLocked(k),false,'Do not mark unverifiable games FINAL: '+k)}
 assert.deepEqual([...state.source.get('2026-10-30|Lynn Vo-Tech|Nashoba Valley Tech')],['2026-10-30','Nashoba Valley Tech','Lynn Vo-Tech',21,28,0]);

 assert.equal(state.MODEL.teams['Greenfield'].w,3);
 assert.equal(state.MODEL.teams['Greenfield'].l,5);
 assert.deepEqual([...state.source.get('2026-10-30|Franklin County Tech|Mahar Regional')],['2026-10-30','Mahar Regional','Franklin County Tech',6,36,0]);
 assert.deepEqual([...state.source.get('2026-10-30|Athol|Greenfield')],['2026-10-30','Athol','Greenfield',0,26,0]);
});
