'use strict';
// MIAA final football PDFs from November 1, 2026 are authoritative. Preserve them exactly.
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
function read(file,variable){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 const marker='const '+variable+'=';
 return JSON.parse(text.slice(text.indexOf(marker)+marker.length).trim().replace(/;\s*$/,''));
}
const final=read('data/football-final-2026.js','FOOTBALL_FINAL_2026');
const old=read('data/season-2026.js','DATA');
test('all 262 official MIAA final 2026 football ratings exist across all eight divisions',()=>{
 assert.equal(final.status,'FINAL');assert.equal(final.date,'2026-11-01');
 assert.equal(Object.keys(final.official).length,262);
 assert.deepEqual(Object.keys(final.divisionCounts).map(Number),[1,2,3,4,5,6,7,8]);
 assert.equal(Object.values(final.divisionCounts).reduce((a,b)=>a+b,0),262);
 const byDiv={};
 for(const [team,row]of Object.entries(final.official)){
  assert.equal(row.length,8,team);
  assert.equal(typeof row[0],'number');assert.equal(typeof row[1],'number');
  assert.equal(old.divisions[team]>0,true,team+' unknown');
  assert.ok(Math.abs(row[1]-(row[2]+row[3]))<=0.00011,team+' rating components');
  assert.ok(Number.isInteger(row[4])&&Number.isInteger(row[5]),team+' records');
  (byDiv[old.divisions[team]]??=[]).push(row[0]);
 }
 for(let d=1;d<=8;d++){
  assert.equal(byDiv[d].length,final.divisionCounts[d]);
  assert.deepEqual(byDiv[d].sort((a,b)=>a-b),Array.from({length:final.divisionCounts[d]},(_,i)=>i+1));
 }
});
test('Division 8 official playoff cutoff and records are preserved',()=>{
 const x=final.official;
 assert.deepEqual(x['Mahar Regional'].slice(0,6),[34,-18.7533,-1.5,-17.2533,3,5]);
 assert.deepEqual(x['Lee'].slice(0,2),[1,5.9717]);
 assert.deepEqual(x['Randolph'].slice(0,2),[2,4.6449]);
 assert.deepEqual(x['English High'].slice(0,6),[12,-5.0092,4.8333,-9.8425,4,2]);
 assert.deepEqual(x['Cathedral'].slice(0,2),[16,-9.4295]);
 assert.deepEqual(x['Ware'].slice(0,2),[17,-9.7407]);
 assert.equal(x['Keefe Tech'][7],-5.3507,'forfeit adjusted opponent-use rating');
});
test('final football data is loaded before the app, and anchors model scenarios',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('football-final-2026.js')>0);
 assert.ok(html.indexOf('football-final-2026.js')<html.indexOf('src="app.js"'));
 assert.match(app,/HAS_FOOTBALL_FINAL\?FOOTBALL_FINAL_2026\.official:SD\.official/);
 assert.match(app,/const BASE=compute\(HAS_FOOTBALL_FINAL\?\[\.\.\.source\.values\(\)\]:SD\.games\)/);
 assert.match(app,/row\[4\]\+winsDiff/);
 assert.match(app,/FINAL_EXCLUDED_GAMES/);
 assert.match(app,/Official MIAA FINAL/);
});
