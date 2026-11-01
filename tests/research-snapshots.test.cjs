'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const date of ['2026-10-16','2026-10-23','2026-10-27','2026-10-30'])test(date+': research snapshot preserves records, margins and opponent equations',()=>{
 const r=require('../data/research/mahsratings/2026/football-'+date+'.json');
 assert.equal(Object.keys(r.official).length,262);assert.equal(r.provenance.kind,'third-party copy labeled published-only');
 const mov=(t,gs)=>{const mine=gs.filter(g=>g[1]===t||g[2]===t);return mine.reduce((s,g)=>s+Math.max(-14,Math.min(14,g[3]-g[4]))*(g[1]===t?1:-1),0)/mine.length};
 const nf=r.games.filter(g=>!g[5]);const adjusted={};
 for(const [t,v] of Object.entries(r.official)){
  const gs=r.games.filter(g=>g[1]===t||g[2]===t);let w=0,l=0,ties=0;
  for(const g of gs){const m=(g[3]-g[4])*(g[1]===t?1:-1);if(m>0)w++;else if(m<0)l++;else ties++}
  assert.deepEqual([w,l,ties],v.slice(4,7),t+' record');assert.ok(Math.abs(mov(t,r.games)-v[2])<.000051,t+' margin');
  adjusted[t]=v[1]-mov(t,r.games)+mov(t,nf);
 }
 let checked=0;
 for(const [t,v] of Object.entries(r.official)){
  const opp=nf.filter(g=>g[1]===t||g[2]===t).map(g=>g[1]===t?g[2]:g[1]);
  if(!opp.length||!opp.every(o=>r.official[o]))continue;
  assert.ok(Math.abs(opp.reduce((s,o)=>s+adjusted[o],0)/opp.length-v[3])<.0003,t+' opponent equation');checked++;
 }
 assert.ok(checked>=244);
 const local=path.join(root,'data/releases/2026/football-'+date+'.json');
 if(fs.existsSync(local)){const reference=JSON.parse(fs.readFileSync(local));for(const [t,v] of Object.entries(r.official))assert.equal(v[1],reference.official[t][1],t+' independently archived rating')}
});
