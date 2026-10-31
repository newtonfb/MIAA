'use strict';
// Checks the live results synced from MIAA's public scoreboard (data/live-2026.js).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(file,name)=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8').replace(/^\/\/[^\n]*\n/,'').trim().replace(new RegExp('^const '+name+'='),'').replace(/;\s*$/,''));
const live=read('data/live-2026.js','LIVE_DATA');
const football=read('data/season-2026.js','DATA');
const fall=read('data/fall-2026.js','FALL_DATA');
const official={football,...fall.sports};

for(const [slug,s] of Object.entries(live.sports)){
 test(slug+': live results are clean, known teams, after the official release',()=>{
  const o=official[slug];assert.ok(o,'unknown sport '+slug);
  const known=new Set(o.games.flatMap(g=>[g[1],g[2]]).concat(Object.keys(o.divisions)));
  for(const g of s.results){
   assert.equal(g.length,6);assert.match(g[0],/^\d{4}-\d\d-\d\d$/);
   assert.ok(g[0]>=s.asOf,'result before the official release: '+g.join(' '));
   assert.ok(known.has(g[1])&&known.has(g[2]),'unknown team in '+g.join(' '));
   assert.notEqual(g[1],g[2]);
   assert.ok(Number.isInteger(g[3])&&Number.isInteger(g[4])&&g[3]>=0&&g[4]>=0,'bad score '+g.join(' '));
   assert.ok(g[5]===0||g[5]===1);
   assert.ok(!/^(TBA|TBD|#N\/?A)$/i.test(g[1])&&!/^(TBA|TBD|#N\/?A)$/i.test(g[2]),'placeholder team');
  }
  for(const r of s.upcoming){assert.ok(known.has(r[1])&&known.has(r[2]),'unknown team in upcoming '+r.join(' '))}
  assert.ok(s.matchedTeams>=0.9*Object.keys(o.divisions).length,'too few teams matched');
 });
}
