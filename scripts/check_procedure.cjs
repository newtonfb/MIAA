'use strict';
// Read-only experiments: seed each consecutive archived release from the previous
// published ratings, varying update order, stopping threshold and intermediate rounding.
// Run: node scripts/check_procedure.cjs
// Research copies: RELEASE_DIR=data/research/mahsratings node scripts/check_procedure.cjs
const fs=require('node:fs'),path=require('node:path');
const {calculateRatings,miaaLevel}=require('../rating-engine.js');
const root=path.resolve(__dirname,'..'),dir=process.env.RELEASE_DIR?path.resolve(process.env.RELEASE_DIR):path.join(root,'data/releases');
function network(r,order){
 const games=r.games.filter(g=>g[3]!==null&&g[4]!==null);
 const names=[...new Set(games.flatMap(g=>[g[1],g[2]]))];
 if(order==='alpha')names.sort();
 if(order==='rank')names.sort((a,b)=>(r.divisions[a]||99)-(r.divisions[b]||99)||((r.official[a]||[999])[0]-(r.official[b]||[999])[0]));
 const idx=new Map(names.map((t,i)=>[t,i])),nb=names.map(()=>[]),sum=names.map(()=>0),all=names.map(()=>0),count=names.map(()=>0);
 for(const [,a,b,sa,sb,f] of games){const i=idx.get(a),j=idx.get(b),m=f?Math.sign(sa-sb)*r.cap:Math.max(-r.cap,Math.min(r.cap,sa-sb));all[i]+=m;all[j]-=m;count[i]++;count[j]++;if(f)continue;sum[i]+=m;sum[j]-=m;nb[i].push(j);nb[j].push(i)}
 return {names,nb,own:sum.map((s,i)=>nb[i].length?s/nb[i].length:0),all:all.map((s,i)=>s/count[i])};
}
function measure(pred,r){const signed=Object.entries(r.official).filter(([t])=>Number.isFinite(pred[t])).map(([t,v])=>pred[t]-v[1]),e=signed.map(Math.abs),bias=signed.reduce((a,b)=>a+b,0)/e.length;return {teams:e.length,exact:e.filter(x=>x<.00005).length,mae:e.reduce((a,b)=>a+b,0)/e.length,max:Math.max(...e),bias,centeredMax:Math.max(...signed.map(x=>Math.abs(x-bias)))}}
const groups=new Map();
for(const season of fs.readdirSync(dir).filter(s=>/^\d{4}$/.test(s)))for(const f of fs.readdirSync(path.join(dir,season)).filter(f=>f.endsWith('.json'))){const r=JSON.parse(fs.readFileSync(path.join(dir,season,f)));const k=season+'/'+r.sport;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(r)}
const results=[],evaluations=[];
for(const [key,releases] of groups){releases.sort((a,b)=>a.date.localeCompare(b.date));for(let p=1;p<releases.length;p++){
 const prev=releases[p-1],next=releases[p],names=[...new Set([...prev.games,...next.games].flatMap(g=>[g[1],g[2]]))].sort();
 const before=calculateRatings(prev.games,names,prev.divisions,prev.cap),after=calculateRatings(next.games,names,next.divisions,next.cap);
 const shift=Object.entries(prev.official).reduce((s,[t,v])=>s+v[1]-before.teams[t].raw,0)/Object.keys(prev.official).length;
 const model={};for(const [t,v] of Object.entries(prev.official))if(after.teams[t])model[t]=v[1]+after.teams[t].raw-before.teams[t].raw+miaaLevel(after)-miaaLevel(before);
 const candidates=[];
 for(const order of ['alpha','ledger','rank']){const n=network(next,order);
 for(const inPlace of [false,true])for(const damping of [0,.2,.5])for(const decimals of [null,4,5,6])for(const tol of [.001,.0001,.00005,.00001])for(const start of ['previous','previousOpponent','zero','margin']){
 const round=x=>decimals===null?x:Math.round(x*10**decimals)/10**decimals;
 const A=n.names.map((t,i)=>{if(start==='zero')return 0;if(start==='margin')return n.own[i];const old=prev.official[t]?prev.official[t][1]+before.teams[t].adjusted-before.teams[t].raw:before.teams[t].adjusted+shift;return start==='previousOpponent'?old-(before.teams[t].adjusted-before.teams[t].opp)+n.own[i]:old});
 let it=0,change=Infinity;
 for(;it<1000;it++){const src=inPlace?A:A.slice();change=0;for(let i=0;i<A.length;i++){if(!n.nb[i].length)continue;const v=round(damping*A[i]+(1-damping)*(round(n.own[i])+n.nb[i].reduce((s,j)=>s+src[j],0)/n.nb[i].length));change=Math.max(change,Math.abs(v-A[i]));A[i]=v}if(change<tol){it++;break}}
 const pred={};for(let i=0;i<A.length;i++)pred[n.names[i]]=A[i]-round(n.own[i])+n.all[i];
 candidates.push({order,inPlace,damping,decimals,tol,start,iterations:it,converged:change<tol,...measure(pred,next)});
 }}
 evaluations.push(candidates);
 const best=list=>list.sort((a,b)=>a.mae-b.mae||a.max-b.max).slice(0,3);
 results.push({candidates:candidates.length,pair:key+' '+prev.date+' → '+next.date,baseline:measure(model,next),bestPrevious:best(candidates.filter(c=>c.start==='previous')),bestZero:best(candidates.filter(c=>c.start==='zero')),bestMargin:best(candidates.filter(c=>c.start==='margin')),bestPreviousOpponent:best(candidates.filter(c=>c.start==='previousOpponent')),note:'Raw predictions; no fitted offset. Unpublished previous opponent ratings estimated from the previous ledger. Compare performance across pairs; unpublished daily states and full-precision starting values are unavailable.'});
}}

const identity=c=>[c.order,c.inPlace,c.damping,c.decimals,c.tol,c.start].join('|');
const aggregate=(sets)=>{const map=new Map();for(const candidates of sets)for(const c of candidates){const id=identity(c);if(!map.has(id))map.set(id,{order:c.order,inPlace:c.inPlace,damping:c.damping,decimals:c.decimals,tol:c.tol,start:c.start,teams:0,exact:0,absoluteError:0,max:0});const a=map.get(id);a.teams+=c.teams;a.exact+=c.exact;a.absoluteError+=c.mae*c.teams;a.max=Math.max(a.max,c.max)}return [...map.values()].map(({absoluteError,...a})=>({...a,mae:absoluteError/a.teams})).sort((a,b)=>a.mae-b.mae)};
const combined=aggregate(evaluations);
const heldOut=evaluations.length<2?[]:evaluations.map((set,i)=>{const train=aggregate(evaluations.filter((_,j)=>i!==j))[0],test=set.find(c=>identity(c)===identity(train));return {pair:results[i].pair,selectedOnOtherPairs:train,test}});
console.log(JSON.stringify({pairs:results,bestFixedProcedures:combined.slice(0,5),heldOut},null,2));
