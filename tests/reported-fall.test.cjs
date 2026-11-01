'use strict';
// Independent local-news results are projections inputs, never silently labeled MIAA finals.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'data/verified-reported-2026.js'),'utf8');
const reported=JSON.parse(js.replace(/^(?:\/\/[^\n]*\n)+/,'').trim().replace(/^const REPORTED_FALL_FINALS=/,'').replace(/;\s*$/,''));
const fallText=fs.readFileSync(path.join(root,'data/fall-2026.js'),'utf8');
const fall=JSON.parse(fallText.trim().replace(/^const FALL_DATA=/,'').replace(/;\s*$/,''));
for(const [sport,entries] of Object.entries(reported.sports)){
 test(sport+': independently reported scores include verifiable provenance and known teams',()=>{
  const official=fall.sports[sport];assert.ok(official);
  const teams=new Set(Object.keys(official.divisions));
  for(const entry of entries){
   const g=entry.game;
   assert.equal(g.length,6);
   assert.match(g[0],/^20\d\d-\d\d-\d\d$/);
   assert.ok(teams.has(g[1])&&teams.has(g[2]),'unknown team '+g.join(' '));
   assert.ok(Number.isInteger(g[3])&&Number.isInteger(g[4]));
   assert.ok(g[3]>=0&&g[4]>=0);
   assert.ok(entry.source?.publisher);
   assert.match(entry.source.url,/^https:\/\//);
   assert.ok(entry.source.published);
  }
 });
}
test('local reporting is shown separately from MIAA finals',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/data\/verified-reported-2026\.js/);
 assert.ok(html.indexOf('verified-reported-2026.js')<html.indexOf('src="app.js"'));
 assert.match(app,/REPORTED_APPLIED/);
 assert.match(app,/REPORTED FINAL/);
 assert.match(app,/source\.get\(pairKey\(x\.game\)\)===x\.game/);
 assert.match(app,/const REPORTED_FIXTURES=/,'include games omitted from Arbiter schedule');
 assert.match(app,/\.\.\.REPORTED_FIXTURES/,'reported fixtures must be shown');
});

test('Telegram scoreboard finals were added with exact date and score',()=>{
 const expected={
  'field-hockey':[['2026-10-31','Nipmuc Regional','Quaboag Regional',3,0,0]],
  'girls-soccer':[['2026-10-30','Shawsheen Valley Tech','Montachusett RVT',0,0,0]],
  volleyball:[['2026-10-30','Advanced Math & Science','Montachusett RVT',3,0,0]]
 };
 for(const [sport,rows] of Object.entries(expected)){
  for(const game of rows){
   const found=reported.sports[sport].find(e=>e.game[0]===game[0]&&
     [e.game[1],e.game[2]].sort().join('|')===[game[1],game[2]].sort().join('|'));
   assert.ok(found,sport+' result absent');
   assert.deepEqual(found.game,game);
   assert.equal(found.source.publisher,'Worcester Telegram & Gazette high school scoreboard');
   assert.ok(found.source.url.includes('date='+game[0].replace(/-/g,'')));
  }
 }
});

test('Globe-confirmed October finals are present with traceable sources',()=>{
 const expected={
  'boys-soccer':[['2026-10-31','Boston International','Boston Latin Academy',1,0,0]],
  'girls-soccer':[['2026-10-31','Milton','Brockton',5,0,0],['2026-10-31',"O'Bryant",'Boston Latin Academy',1,0,0]],
  volleyball:[['2026-10-30','Winchester','Newton North',2,3,0]]
 };
 for(const [sport,fixtures] of Object.entries(expected)){
  for(const game of fixtures){
   const match=reported.sports[sport].find(x=>x.game[0]===game[0]&&
    [x.game[1],x.game[2]].sort().join('|')===[game[1],game[2]].sort().join('|'));
   assert.ok(match,'missing Globe final '+game.join(' '));
   assert.deepEqual(match.game,game);
   assert.equal(match.source.publisher,'The Boston Globe');
   assert.ok(match.source.url.startsWith('https://www.bostonglobe.com/'));
  }
 }
});

test('confirmed postponement does not count as an unreported final',()=>{
 const rows=reported.postponed['field-hockey'];
 const entry=rows.find(x=>x.game[0]==='2026-10-31'&&x.game[1]==='Manchester Essex'&&x.game[2]==='Triton Regional');
 assert.ok(entry,'missing independently confirmed postponement');
 assert.equal(entry.source.publisher,'Cape Ann Current');
 assert.ok(entry.source.url.startsWith('https://capeanncurrent.com/'));
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/const REPORTED_POSTPONED=new Map/);
 assert.match(app,/\.\.\.REPORTED_POSTPONED\.keys\(\)/);
 assert.match(app,/!LIVE_POSTPONED\.has\(fixtureKey\(r\)\)/);
});
