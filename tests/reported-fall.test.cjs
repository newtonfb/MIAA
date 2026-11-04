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
  const teams=new Set([...Object.keys(official.divisions),...official.games.flatMap(g=>[g[1],g[2]])]);
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

test('Boston Globe October 30 finals absent from MIAA are sourced and modeled',()=>{
 const expected={
  'girls-soccer':['2026-10-30','Middleborough','Apponequet Regional',1,3,0],
  volleyball:['2026-10-30','Sturgis Charter West','Monomoy',1,3,0]
 };
 for(const [sport,game] of Object.entries(expected)){
  const found=reported.sports[sport].find(e=>e.game[0]===game[0]&&
   [e.game[1],e.game[2]].sort().join('|')===[game[1],game[2]].sort().join('|'));
  assert.ok(found,'No Globe result for '+sport);
  assert.deepEqual(found.game,game);
  assert.match(found.source.publisher,/Boston Globe/);
  assert.match(found.source.url,/bostonglobe.com\/sports\/high-schools\/scoreboard/);
 }
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


test('November 4 boys soccer corrections: tie counted, scrimmages and no-score excluded',()=>{
 const boys=reported.sports['boys-soccer'];
 const key=g=>g[0]+'|'+[g[1],g[2]].sort().join('|');
 const match=(date,a,b)=>boys.find(x=>key(x.game)===key([date,a,b]));
 const tie=match('2026-10-30','Weymouth','Braintree');
 assert.ok(tie,'Weymouth-Braintree 0-0 result is missing');
 assert.deepEqual(tie.game,['2026-10-30','Weymouth','Braintree',0,0,0]);
 assert.match(tie.source.url,/maxpreps\.com\/ma\/soccer\/scores/);
 assert.deepEqual(match('2026-10-31','Bishop Stang','Fairhaven').game.slice(3,5),[2,5]);
 assert.deepEqual(match('2026-11-02','Clinton','Millbury').game.slice(3,5),[3,0]);
 const ex=reported.notCounting['boys-soccer'];
 for(const [date,a,b,type] of [
  ['2026-09-17','KIPP Academy Lynn Coll.','Salem','No verified final'],
  ['2026-10-26','Parker Charter','Trivium School','No final score'],
  ['2026-10-27','Parker Charter','Southbridge','No final score'],
  ['2026-10-31','Tewksbury Memorial','Nashoba Regional','No final'],
  ['2026-11-03','Chicopee','Westfield','Scrimmage'],
  ['2026-11-03','Hingham','Cohasset','Scrimmage'],
 ]){
  const entry=ex.find(x=>key(x.game)===key([date,a,b]));
  assert.ok(entry,'Missing non-counting fixture: '+a+' - '+b);
  assert.match(entry.note,new RegExp(type,'i'));
 }
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/for\(const g of LIVE\.results\)\{\s*if\(NOT_COUNTING\.has\(pairKey\(g\)\)\)continue;/);
 assert.match(app,/for\(const g of PUBLISHED_FINALS\)\{if\(NOT_COUNTING\.has\(pairKey\(g\)\)\)continue;/);
});


test('Oct 26 KIPP Academy vs Lynn English 2-2 draw is distinct from Oct 19 final',()=>{
 const match=reported.sports['boys-soccer'].filter(x=>x.game[0]==='2026-10-26'&&
  [x.game[1],x.game[2]].sort().join('|')==='KIPP Academy Lynn Coll.|Lynn English');
 assert.equal(match.length,1,'Expected exactly one Oct 26 reported draw');
 assert.deepEqual(match[0].game,['2026-10-26','KIPP Academy Lynn Coll.','Lynn English',2,2,0]);
 assert.match(match[0].source.url,/maxpreps\.com\/news/);
 const official=fall.sports['boys-soccer'].games.filter(g=>g[0]==='2026-10-19' &&
  [g[1],g[2]].sort().join('|')==='KIPP Academy Lynn Coll.|Lynn English');
 assert.equal(official.length,1);
 assert.deepEqual(official[0].slice(3,5),[0,3]);
});
