'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {calculateRatings}=require('../rating-engine.js');
const {classifyTournamentField,tournamentPreliminaries}=require('../tournament-rules.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const parse=(s,name)=>JSON.parse(s.slice(s.indexOf('const '+name+'=')+('const '+name+'=').length).replace(/;\s*$/,''));
const s=parse(read('data/fall-2026.js'),'FALL_DATA').sports.volleyball;
const original=parse(read('tests/fixtures/fall-2026-10-30.js'),'FALL_DATA').sports.volleyball;
test('2026 final volleyball ledger has 2904 official games, exact 2026 postseason field sizes',()=>{
 if(!s.final)return;
 assert.equal(s.games.length,2904,'Unexpected change in the final 2026 ledger: investigate official changes');
 const teams=[...new Set(s.games.flatMap(g=>[g[1],g[2]]).concat(Object.keys(s.divisions)))].sort();
 const model=calculateRatings(s.games,teams,s.divisions,3);
 let total=0;
 const expected={1:35,2:35,3:45,4:38,5:38};
 for(let d=1;d<=5;d++){
  const ranked=Object.keys(s.official).filter(t=>s.divisions[t]===d)
   .sort((a,b)=>s.official[a][0]-s.official[b][0])
   .map(t=>({team:t,w:s.official[t][4],l:s.official[t][5],ties:s.official[t][6],
    gp:s.official[t][4]+s.official[t][5]+s.official[t][6],forfeitLosses:model.teams[t].forfeitLosses}));
  const field=classifyTournamentField(ranked,32,10);
  const n=field.filter(v=>v.qualified).length;
  assert.equal(n,expected[d],'Incorrect 2026 Division '+d+' qualifiers');
  assert.equal(tournamentPreliminaries(field).length,expected[d]-32);
  total+=n;
 }
 assert.equal(total,191);
});
test('final MIAA ledger incorporates the corrected Bishop Stang - Middleborough result',()=>{
 if(!s.final)return;
 const found=s.games.filter(g=>g[0]==='2026-10-27' && g.includes('Bishop Stang') && g.includes('Middleborough'));
 assert.equal(found.length,1);
 const g=found[0], stang=g[1]==='Bishop Stang'?g[3]:g[4], middle=g[1]==='Middleborough'?g[3]:g[4];
 assert.deepEqual([stang,middle],[3,0]);
});
test('Oct 30 to final MIAA volleyball backtest stays at 160/160 top 32 picks and >= 155 correct seeds',()=>{
 if(!s.final)return;
 const teams=[...new Set([...original.games,...s.games].flatMap(g=>[g[1],g[2]]).concat(Object.keys(s.divisions)))].sort();
 const a=calculateRatings(original.games,teams,s.divisions,3);
 const b=calculateRatings(s.games,teams,s.divisions,3);
 const project=t=>original.official[t][1]+b.teams[t].raw-a.teams[t].raw;
 let selected=0,exact=0;
 for(let d=1;d<=5;d++){
  const names=Object.keys(s.official).filter(t=>s.divisions[t]===d);
  const expected=names.slice().sort((x,y)=>s.official[x][0]-s.official[y][0]).slice(0,32);
  const predicted=names.slice().sort((x,y)=>project(y)-project(x)).slice(0,32);
  selected+=expected.filter(t=>predicted.includes(t)).length;
  exact+=expected.filter((t,i)=>predicted[i]===t).length;
 }
 assert.equal(selected,160);
 assert.ok(exact>=155,'Exact seed regression: '+exact+' correct seeds (expected >= 155)');
});
