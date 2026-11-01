'use strict';
// Import independently hosted historical snapshots into a separate research archive.
// Usage: node scripts/import_research_snapshots.cjs [downloaded data.json]
// These are not independently retrieved historical MIAA PDFs. Never use for live standings.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source='https://mahsratings.com/data.json';
function convert(data,key){
 const rows=data[key+'AllOfficial'];if(!Array.isArray(rows)||rows.length!==262)throw Error(key+': expected 262 official rows');
 const games=data[key+'Games'].map(g=>[g.date,g.a,g.b,g.sa,g.sb,g.kind==='forfeit'?1:0]);
 const official={},divisions={};
 for(const v of rows){
  if(official[v.name])throw Error('duplicate team '+v.name);
  const mine=games.filter(g=>g[1]===v.name||g[2]===v.name);
  const w=mine.filter(g=>(g[1]===v.name?g[3]-g[4]:g[4]-g[3])>0).length;
  const l=mine.filter(g=>(g[1]===v.name?g[3]-g[4]:g[4]-g[3])<0).length;
  const mov=mine.reduce((s,g)=>s+(g[5]?Math.sign(g[3]-g[4])*14:Math.max(-14,Math.min(14,g[3]-g[4])))*(g[1]===v.name?1:-1),0)/mine.length;
  if(w!==v.w||l!==v.l||Math.abs(mov-v.mov)>.000051)throw Error(key+': inconsistent record or margin '+v.name);
  official[v.name]=[v.rank,v.rating,v.mov,v.sos,v.w,v.l,mine.length-w-l,v.opponentUse??null];divisions[v.name]=v.div;
 }
 const date='2026-10-'+key.slice(3),local=path.join(root,'data/releases/2026/football-'+date+'.json');let matches=null;
 if(fs.existsSync(local)){const reference=JSON.parse(fs.readFileSync(local));matches=rows.every(v=>reference.official[v.name]?.[1]===v.rating);if(!matches)throw Error(key+': ratings disagree with existing archive')}
 return {season:2026,sport:'football',date,cap:14,divisions,official,games,provenance:{source,kind:'third-party copy labeled published-only',independentlyMatchedExistingRatings:matches,ties:'Inferred from the score ledger; third-party official rows omit tie counts.'}};
}
async function main(){const raw=process.argv[2]?fs.readFileSync(process.argv[2],'utf8'):await(await fetch(source)).text();const data=JSON.parse(raw),hash=crypto.createHash('sha256').update(raw).digest('hex');
 const releases=['oct16','oct23','oct27','oct30'].map(k=>convert(data,k));
 const out=path.join(root,'data/research/mahsratings/2026');fs.mkdirSync(out,{recursive:true});
 for(const r of releases){r.provenance.downloadSha256=hash;fs.writeFileSync(path.join(out,'football-'+r.date+'.json'),JSON.stringify(r)+'\n');console.log(r.date+': '+Object.keys(r.official).length+' ratings, '+r.games.length+' games, records and own margins validated')}
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={convert};
