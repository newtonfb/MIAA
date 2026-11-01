'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const r=require('../data/releases/2024/football-2024-11-02.json');
const corrections=require('../data/ledger-corrections.json');
test('sourced 2024 football forfeits restore every checkable opponent-rating equation',()=>{
 for(const c of corrections){
  const matches=r.games.filter(g=>g[0]===c.date&&[g[1],g[2]].sort().join('|')===[...c.teams].sort().join('|'));
  assert.equal(matches.length,1);assert.equal(matches[0][5],1);assert.ok(c.source.startsWith('https://'));
 }
 const mov=(t,games)=>{const mine=games.filter(g=>g[1]===t||g[2]===t);return mine.reduce((s,g)=>s+Math.max(-r.cap,Math.min(r.cap,g[3]-g[4]))*(g[1]===t?1:-1),0)/mine.length};
 const played=r.games.filter(g=>!g[5]);
 const adjusted=Object.fromEntries(Object.entries(r.official).map(([t,v])=>[t,v[1]-mov(t,r.games)+mov(t,played)]));
 let checked=0;
 for(const [t,v] of Object.entries(r.official)){
  assert.ok(Math.abs(mov(t,r.games)-v[2])<.000051,t+' own margin');
  const opp=played.filter(g=>g[1]===t||g[2]===t).map(g=>g[1]===t?g[2]:g[1]);
  if(!opp.length||!opp.every(o=>r.official[o]))continue;
  const expected=opp.reduce((s,o)=>s+adjusted[o],0)/opp.length;
  assert.ok(Math.abs(expected-v[3])<.0003,t+' opponent rating');checked++;
 }
 assert.equal(checked,256);
});
