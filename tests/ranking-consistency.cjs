'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const dataText=fs.readFileSync(path.join(root,'data/season-2026.js'),'utf8');
const DATA=vm.runInNewContext(dataText+'\nDATA;');
let code=fs.readFileSync(path.join(root,'app.js'),'utf8');
code=code.replace(/\binit\(\);\s*initWeek8\(\);\s*$/,'');
const sandbox={DATA,localStorage:{getItem:()=>null},matchMedia:()=>({matches:true})};
const snap=vm.runInNewContext(code+`
(() => {
 const raw=records();
 const get=t=>MODEL.teams[t];
 const upperKey=pairKey(['2026-10-29','Upper Cape Cod RVT','South Shore Vo-Tech',null,null,0]);
 const published=derive(compute(raw.filter(g=>pairKey(g)!==upperKey)));
 return {
   leeBaselineW:BASE.teams.Lee.w,
   leePublishedBaselineRating:BASELINE.teams.Lee.rating,
   leeW:get('Lee').w,
   leeL:get('Lee').l,
   leeMov:get('Lee').mov,
   leeRating:get('Lee').rating,
   abbyRecord:[get('Abby Kelley Foster').w,get('Abby Kelley Foster').l,get('Abby Kelley Foster').ties],
   southbridgeRecord:[get('Southbridge').w,get('Southbridge').l,get('Southbridge').ties],
   officialUpperCapeRecord:[published.teams['Upper Cape Cod RVT'].w,published.teams['Upper Cape Cod RVT'].l],
   finalCount:LOCKED_KEYS.size,
   availableDivisions:[1,2,3,4,5,6,7,8].map(d=>standings(d).length),
   lockedNotPredictable:unscoredWeek8().every(r=>!LOCKED_KEYS.has(wkKey(r))),
   ghostTie:raw.some(g=>g[1]==='Abby Kelley Foster'&&g[2]==='Southbridge'),
 };
})()`,sandbox);
assert.equal(snap.leeBaselineW,6,'October 27 baseline must not count late October 23 result');
assert.equal(snap.leePublishedBaselineRating,5.553,'October 27 MIAA rating must remain the anchor');
assert.deepEqual([snap.leeW,snap.leeL],[8,0]);
assert.equal(snap.leeMov,12.75);
assert.ok(Math.abs(snap.leeRating-6.2582)<0.15,'Lee projection should be close to the Oct 30 official value, not 1.08 points away');
assert.deepEqual(Array.from(snap.abbyRecord),[0,5,0]);
assert.deepEqual(Array.from(snap.southbridgeRecord),[0,6,0]);
assert.deepEqual(Array.from(snap.officialUpperCapeRecord),[2,4],'The reported Thursday final was not in the 4 a.m. Oct 30 MIAA snapshot');
assert.equal(snap.ghostTie,false);
assert.equal(snap.finalCount,14);
assert.equal(snap.lockedNotPredictable,true);
assert.deepEqual(Array.from(snap.availableDivisions),[33,22,29,37,36,32,31,42]);
console.log('PASS: frozen baseline, Lee rating, score integrity, lock guards and all eight divisions');
console.log('Lee projection:',snap.leeRating.toFixed(4),'vs MIAA Oct 30: 6.2582');
