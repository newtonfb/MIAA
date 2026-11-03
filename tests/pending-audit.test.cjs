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
