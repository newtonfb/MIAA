'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compareGames}=require('../scripts/audit_releases.cjs');
const g=(a,b,x,y,f=0)=>['2026-10-27',a,b,x,y,f];
test('catches a winner reversal even when date, teams and game count match',()=>{
 const changes=compareGames([g('Bishop Stang','Middleborough',0,3)],[g('Bishop Stang','Middleborough',3,0)]);
 assert.equal(changes.scoreCorrections.length,1);
 assert.deepEqual(changes.scoreCorrections[0].from,[0,3]);
 assert.deepEqual(changes.scoreCorrections[0].to,[3,0]);
 assert.equal(changes.added.length,0);assert.equal(changes.removed.length,0);
});
test('preserves legitimate same-day doubleheaders and reports extra duplicates',()=>{
 const first=[g('A','B',3,0),g('A','B',3,2)];
 const same=compareGames(first,first);
 assert.equal(Object.values(same).reduce((n,v)=>n+v.length,0),0);
 const extra=compareGames([...first,g('A','B',3,0)],first);
 assert.equal(extra.removed.length,1);
 assert.equal(extra.scoreCorrections.length,0);
});
test('detects changes to forfeit classification even when the score stays unchanged',()=>{
 const changes=compareGames([g('A','B',3,0,0)],[g('A','B',3,0,1)]);
 assert.equal(changes.forfeitCorrections.length,1);
 assert.equal(changes.scoreCorrections.length,0);
});
