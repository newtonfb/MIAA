'use strict';
// Does each archived release satisfy MIAA's equations? For every team whose opponents all have published
// ratings, the published opponent rating should equal the average of those opponents' opponent-use ratings
// (published rating with forfeit games taken out of their own margin), up to four-decimal rounding.
//   node scripts/check_consistency.cjs [season ...]
// A release that fails shows MIAA used a different procedure (as in 2024), so leave it out of calibration.
const fs=require('node:fs');
const path=require('node:path');
const dir=path.join(path.resolve(__dirname,'..'),'data','releases');
const only=process.argv.slice(2);
for(const season of fs.readdirSync(dir).filter(d=>/^\d{4}$/.test(d)&&(!only.length||only.includes(d))).sort())
 for(const f of fs.readdirSync(path.join(dir,season)).filter(f=>f.endsWith('.json')).sort()){
  const r=JSON.parse(fs.readFileSync(path.join(dir,season,f),'utf8')),O=r.official;
  if(Object.values(O)[0].length<4){console.log(`${f}: no opponent ratings recorded`);continue}
  const all=r.games.filter(g=>g[3]!==null&&g[4]!==null),games=all.filter(g=>!g[5]);
  const cap=x=>Math.max(-r.cap,Math.min(r.cap,x));
  const mov=(t,list)=>{const m=list.filter(g=>g[1]===t||g[2]===t).map(g=>cap(g[3]-g[4])*(g[1]===t?1:-1));return m.length?m.reduce((a,b)=>a+b,0)/m.length:0};
  const adj={};for(const t of Object.keys(O))adj[t]=O[t][1]-mov(t,all)+mov(t,games);
  const left=[];
  for(const t of Object.keys(O)){const opps=games.filter(g=>g[1]===t||g[2]===t).map(g=>g[1]===t?g[2]:g[1]);
   if(opps.length&&opps.every(o=>O[o]))left.push(Math.abs(opps.reduce((s,o)=>s+adj[o],0)/opps.length-O[t][3]))}
  left.sort((a,b)=>a-b);const ok=left.filter(x=>x<0.0003).length;
  console.log(`${f.replace('.json','').padEnd(28)} ${ok}/${left.length} teams consistent, largest leftover ${left[left.length-1].toFixed(6)}${ok===left.length?'':'  <- different procedure'}`);
 }
