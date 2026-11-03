'use strict';
// Tournament qualifications for MIAA statewide power-ranked fall team sports.
// Top 32 qualify by power rating; lower-ranked schools with a .500 record
// also qualify for a preliminary play-in, subject to 10 competed contests.
// In soccer a tie counts as half a win for the .500 test.
function classifyTournamentField(sortedRows,fieldSize=32,minGames=10){
 let nextTournamentSeed=1;
 return sortedRows.map((v,i)=>{
  const rank=i+1;
  const played=v.gp??(v.w+v.l+(v.ties||0));
  const competed=played-(v.forfeitLosses||0);
  const eligible=competed>=minGames;
  const automatic=rank<=fieldSize&&eligible;
  const byRecord=rank>fieldSize&&eligible&&2*v.w+(v.ties||0)>=2*played*0.5;
  const qualifier=automatic?'power':byRecord?'record':null;
  const tournamentSeed=qualifier?nextTournamentSeed++:null;
  return {...v,rank,eligible,seed:automatic?rank:null,qualified:!!qualifier,qualifier,tournamentSeed};
 });
}
// Preliminary matches are the lowest seeded qualifiers paired high vs low.
// Example: 35 qualifiers -> seeds 30-35, 31-34 and 32-33.
function tournamentPreliminaries(rows,fieldSize=32){
 const field=rows.filter(r=>r.qualified).sort((a,b)=>a.tournamentSeed-b.tournamentSeed);
 const extra=Math.max(0,field.length-fieldSize);
 const bySeed=new Map(field.map(r=>[r.tournamentSeed,r]));
 const matches=[];
 for(let i=0;i<extra;i++){
  const upper=fieldSize-extra+i+1,lower=field.length-i;
  matches.push({top:bySeed.get(upper),bottom:bySeed.get(lower),topSeed:upper,bottomSeed:lower});
 }
 return matches;
}
if(typeof module!=='undefined'&&module.exports)module.exports={classifyTournamentField,tournamentPreliminaries};
