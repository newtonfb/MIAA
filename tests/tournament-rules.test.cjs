'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {classifyTournamentField,tournamentPreliminaries}=require('../tournament-rules.js');
const row=(name,w,l,ties=0)=>({team:name,w,l,ties,gp:w+l+ties,forfeitLosses:0});
test('top 32 qualify regardless of record; .500 teams below the line also qualify',()=>{
 const rows=Array.from({length:35},(_,i)=>row('Team'+(i+1),5,15));
 rows[32]=row('Record qualifier',10,10);
 rows[33]=row('Below .500',9,11);
 rows[34]=row('Strong qualifier',12,8);
 const ranked=classifyTournamentField(rows);
 assert.equal(ranked.filter(r=>r.qualified).length,34);
 assert.equal(ranked[31].qualifier,'power');
 assert.equal(ranked[32].qualifier,'record');
 assert.equal(ranked[32].tournamentSeed,33);
 assert.equal(ranked[33].qualified,false);
 assert.equal(ranked[34].tournamentSeed,34);
 assert.deepEqual(tournamentPreliminaries(ranked).map(g=>[g.topSeed,g.bottomSeed]),[[31,34],[32,33]]);
});
test('soccer ties count as half a win and minimum competed games is enforced',()=>{
 const rows=Array.from({length:34},(_,i)=>row('Team'+i,5,15));
 rows[32]=row('Tied .500',8,8,4);rows[33]=row('Below .500',7,8,5);
 const ranked=classifyTournamentField(rows);
 assert.equal(ranked[32].qualifier,'record');assert.equal(ranked[33].qualified,false);
 const short=[row('Short season',8,1),row('Forfeit shortfall',10,0)];
 short[1].forfeitLosses=1;
 assert.equal(classifyTournamentField(short,32,10)[0].eligible,false);
 assert.equal(classifyTournamentField(short,32,10)[1].eligible,false);
});
test('13 additional qualifiers pair seeds 20-45 down to 32-33',()=>{
 const rows=Array.from({length:45},(_,i)=>row('Team'+(i+1),10,10));
 const matches=tournamentPreliminaries(classifyTournamentField(rows));
 assert.equal(matches.length,13);
 assert.deepEqual([matches[0].topSeed,matches[0].bottomSeed],[20,45]);
 assert.deepEqual([matches[12].topSeed,matches[12].bottomSeed],[32,33]);
});
