'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {calculateRatings,miaaLevel}=require('../rating-engine.js');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const parse=p=>JSON.parse(read(p).trim().replace(/^.*?const (?:DATA|CONFIRMED_FINALS)=/s,'').replace(/;$/,''));
const DATA=parse('data/season-2026.js'),CONFIRMED_FINALS=parse('data/confirmed-final-scores-2026.js');
function setup(){
 const elements=new Map();
 const getElement=id=>{
  if(!elements.has(id)){
   const set=new Set();
   elements.set(id,{
    id,innerHTML:'',textContent:'',value:'',disabled:false,
    classList:{toggle(k,v){if(v)set.add(k);else set.delete(k)},contains(k){return set.has(k)}},
    style:{setProperty(){}},
    querySelectorAll(){return []}
   });
  }
  return elements.get(id);
 };
 let script=read('app.js');
 script=script.replace(/\ninit\(\);\s*initFixtures\(\);\s*$/,
  '\nglobalThis.__test={standings,renderBracket,renderRankings,renderTeam,renderHeroLine,baseDivSeed,baseDivRank,setTeam(name){selectedTeam=name},setDivision(n){selectedDiv=n;bracketDiv=n}};');
 const globals={
  DATA,CONFIRMED_FINALS,FALL_DATA:{sports:{}},calculateRatings,miaaLevel,
  location:{search:''},localStorage:{getItem(){return null},setItem(){}},
  URLSearchParams,matchMedia:()=>({matches:true}),document:{getElementById:getElement},
  window:{},console
 };
 vm.runInNewContext(script,globals,{timeout:60000});
 return {...globals.__test,el:getElement};
}
test('Division 1 skips BC High (1-7) and Methuen (2-6), promotes Weymouth to seed 16',()=>{
 const a=setup(),rows=a.standings(1);
 const bc=rows.find(r=>r.team==='Boston College High');
 const methuen=rows.find(r=>r.team==='Methuen');
 const weymouth=rows.find(r=>r.team==='Weymouth');
 assert.equal(bc.rank,16);
 assert.equal(bc.w,1);assert.equal(bc.l,7);
 assert.equal(bc.eligible,false);assert.equal(bc.seed,null);
 assert.equal(methuen.rank,17);
 assert.equal(methuen.w,2);assert.equal(methuen.eligible,false);
 assert.equal(weymouth.rank,18);
 assert.equal(weymouth.w,5);assert.equal(weymouth.seed,16);
 assert.equal(weymouth.qualified,true);
 assert.equal(rows.filter(r=>r.qualified).length,16);
 assert.deepEqual([...rows.filter(r=>r.qualified).map(r=>r.seed)],Array.from({length:16},(_,i)=>i+1));
});
test('All eight divisions seed exactly the highest 16 eligible teams in rating order',()=>{
 const {standings}=setup();
 for(let division=1;division<=8;division++){
  const rows=standings(division),eligible=rows.filter(r=>r.eligible),field=rows.filter(r=>r.qualified);
  const count=Math.min(16,eligible.length);
  assert.equal(field.length,count,'D'+division);
  assert.deepEqual(Array.from(field,r=>r.team),Array.from(eligible.slice(0,count),r=>r.team),'D'+division);
  for(const [i,r] of field.entries()){
   assert.equal(r.seed,i+1,r.team);
   assert.ok(r.w>=3,'Seeded with under 3 wins: '+r.team);
   assert.ok(r.gp-r.forfeitLosses>=7,'Seeded with under 7 competed games: '+r.team);
  }
  for(const r of rows.filter(r=>!r.eligible))assert.equal(r.seed,null,'Ineligible seeded: '+r.team);
 }
});
test('3-win and 7-game requirements both affect seeding dynamically',()=>{
 const a=setup(),original=a.standings(1);
 const model={teams:Object.fromEntries(original.map(r=>[r.team,{...r}]))};
 model.teams.Methuen.w=3;model.teams.Methuen.l=5;
 let rows=a.standings(1,model);
 assert.equal(rows.find(r=>r.team==='Methuen').seed,16);
 assert.equal(rows.find(r=>r.team==='Weymouth').seed,null);
 model.teams.Methuen.gp=6;
 rows=a.standings(1,model);
 assert.equal(rows.find(r=>r.team==='Methuen').seed,null);
 assert.equal(rows.find(r=>r.team==='Weymouth').seed,16);
});
test('Projected bracket, bubble, hero, and both ranking views use eligible field',()=>{
 const a=setup();
 a.setDivision(1);
 a.renderBracket();
 const bracket=a.el('bracket').innerHTML;
 assert.match(bracket,/Weymouth/);
 assert.doesNotMatch(bracket,/Boston College High/);
 assert.doesNotMatch(bracket,/Methuen/);
 assert.match(a.el('bubble').innerHTML,/Boston College High/);
 assert.match(a.el('bubble').innerHTML,/Skipped/);
 assert.match(a.el('bracketSub').textContent,/three wins|3 wins/);
 a.renderRankings();
 const desktop=a.el('rankingsBody').innerHTML;
 const bc=desktop.split('</tr>').find(x=>x.includes('Boston College High'));
 const methuen=desktop.split('</tr>').find(x=>x.includes('Methuen'));
 const weymouth=desktop.split('</tr>').find(x=>x.includes('Weymouth'));
 assert.ok(bc);assert.ok(methuen);assert.ok(weymouth);
 assert.match(bc,/Ineligible for playoffs/);assert.doesNotMatch(bc,/class="playoff-zone"/);
 assert.match(methuen,/Ineligible for playoffs/);
 assert.doesNotMatch(weymouth,/PLAYOFF SEED/);assert.match(weymouth,/class="playoff-zone"/);
 assert.match(desktop,/Below last qualifying seed/);
 const mobile=a.el('mobileRankingsBody').innerHTML;
 assert.match(mobile,/Boston College High[\s\S]*?Ineligible for playoffs/);
 assert.match(mobile,/class="mrow playoff-zone"[^>]*data-row="Weymouth"/);
 const hero=a.el('heroLine').innerHTML;
 assert.match(hero,/Weymouth/);assert.match(hero,/Newton North/);
 assert.doesNotMatch(hero,/Boston College High/);
 a.setTeam('Boston College High');
 a.renderTeam();
 assert.match(a.el('teamDetails').innerHTML,/Ineligible for playoffs/);
 assert.doesNotMatch(a.el('teamDetails').innerHTML,/Inside top 16/);
});
