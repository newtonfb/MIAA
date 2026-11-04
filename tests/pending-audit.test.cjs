'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../scripts/pending_audit.cjs');
const match=(date='2026-11-02')=>[date,'A','B','16:00'];
const score=(date='2026-11-02')=>[date,'A','B',3,0,0];
test('only unscored pre-cutoff soccer fixtures stay unresolved',()=>{
 const out=audit('girls-soccer',{date:'2026-11-03',games:[]},{feedStatus:'ok',upcoming:[match(),match('2026-11-05')]},{},'2026-11-03');
 assert.equal(out.knownScheduledWithoutFinal,1);
 assert.equal(out.overdueCount,1);
 assert.equal(out.unresolved[0].status,'overdue');
});
test('published final removes pending game, with three-day date move tolerance',()=>{
 const out=audit('boys-soccer',{date:'2026-11-03',games:[score('2026-11-01')]},{upcoming:[match()]},{},'2026-11-03');
 assert.equal(out.knownScheduledWithoutFinal,0);
});
test('known scrimmage and explicit cancellation do not appear as missing scores',()=>{
 const excluded={notCounting:{'volleyball':[{game:match('2026-10-30')}]}};
 const x=audit('volleyball',{games:[]},{upcoming:[match('2026-10-30')]},excluded,'2026-11-03');
 assert.equal(x.knownScheduledWithoutFinal,0);assert.equal(x.ignored.length,1);
 const y=audit('boys-soccer',{games:[]},{upcoming:[match()],canceled:[match()]},{},'2026-11-03');
 assert.equal(y.knownScheduledWithoutFinal,0);
});

test('unscored MIAA PDF game is reported even when the live scoreboard never listed it',()=>{
 const official={date:'2026-11-03',games:[],divisions:{Clinton:3,Millbury:4},
  unmatchedScoreDetails:['11/2 Clinton Millbury','11/2 Millbury Clinton']};
 const out=audit('boys-soccer',official,{upcoming:[],feedStatus:'ok'},{},'2026-11-03');
 assert.equal(out.knownScheduledWithoutFinal,1);
 assert.equal(out.unresolved[0].source,'MIAA published unscored ledger row');
 assert.deepEqual(out.unparseableLedgerLines,[]);
});
test('PDF and scoreboard fixture entries are counted only once',()=>{
 const official={date:'2026-11-03',games:[],divisions:{A:1,B:2},unmatchedScoreDetails:['11/2 A B']};
 const out=audit('girls-soccer',official,{upcoming:[match()]},{},'2026-11-03');
 assert.equal(out.knownScheduledWithoutFinal,1);
 assert.equal(out.unresolved[0].source,'MIAA scoreboard');
});

test('removed MIAA scoreboard fixture is not counted as confirmed missing result',()=>{
 const game=match('2026-11-03');
 const data=audit('girls-soccer',{date:'2026-11-03',games:[]},{
  upcoming:[game],unverified:[game],overdue:[game],feedStatus:'ok'
 },{},'2026-11-04');
 assert.equal(data.knownScheduledWithoutFinal,1);
 assert.equal(data.unverifiedFixtureCount,1);
 assert.equal(data.overdueCount,0);
 assert.equal(data.unresolved[0].status,'unverified-fixture');
});

test('same-day scheduled game after 4 a.m. official PDF snapshot is awaiting next report, not overdue',()=>{
 const fixture=match('2026-11-03');
 const x=audit('boys-soccer',{date:'2026-11-03',games:[],final:false},{upcoming:[fixture],feedStatus:'ok'},{},'2026-11-04');
 assert.equal(x.knownScheduledWithoutFinal,1);
 assert.equal(x.overdueCount,0);
 assert.equal(x.awaitingNextReleaseCount,1);
 assert.equal(x.unresolved[0].status,'awaiting-next-release');
});
test('genuinely unscored game earlier than last MIAA release stays overdue',()=>{
 const x=audit('boys-soccer',{date:'2026-11-03',games:[],final:false},{upcoming:[match('2026-11-02')]},{},'2026-11-04');
 assert.equal(x.awaitingNextReleaseCount,0);
 assert.equal(x.overdueCount,1);
});
