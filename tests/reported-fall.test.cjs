'use strict';
// Independent local-news results are projections inputs, never silently labeled MIAA finals.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const js=fs.readFileSync(path.join(root,'data/verified-reported-2026.js'),'utf8');
const reported=JSON.parse(js.replace(/^\/\/[^\n]*\n/g,'').trim().replace(/^const REPORTED_FALL_FINALS=/,'').replace(/;\s*$/,''));
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
});
