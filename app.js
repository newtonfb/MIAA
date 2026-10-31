'use strict';
/* One page serves every MIAA sport; ?sport= picks the dataset.
   Football keeps its hand-built Week 8 schedule and confirmed Thursday finals.
   The other sports use the upcoming games on MIAA's scoreboard, and viewers can add any that are missing. */
const SPORTS={
 football:{name:'Football',cap:14,field:16,unit:'point'},
 'field-hockey':{name:'Field Hockey',cap:3,field:32,unit:'goal'},
 'boys-soccer':{name:'Boys Soccer',cap:3,field:32,unit:'goal'},
 'girls-soccer':{name:'Girls Soccer',cap:3,field:32,unit:'goal'},
 volleyball:{name:'Volleyball',cap:3,field:32,unit:'set'}
};
const SPORT=(()=>{const s=new URLSearchParams(location.search).get('sport');return s&&SPORTS[s]&&s!=='football'&&typeof FALL_DATA!=='undefined'&&FALL_DATA.sports?.[s]?s:'football'})();
const SP=SPORTS[SPORT],FOOTBALL=SPORT==='football',CAP=SP.cap,FIELD=SP.field;
const SD=FOOTBALL?DATA:FALL_DATA.sports[SPORT];
const SD_DATE=SD.date||(FOOTBALL?DATA.date:FALL_DATA.date);
// Football keeps its original storage keys so existing visitors keep their scenarios.
const store=name=>FOOTBALL?name:`${name}:${SPORT}`;
const KEY=store('miaa-scenario-lab-2026-oct30-v2');
const DIV=SD.divisions, OFF=SD.official;  // MIAA's published ratings for every division
const HISTORICAL_FINALS=FOOTBALL&&typeof CONFIRMED_FINALS!=='undefined'?(CONFIRMED_FINALS.historical||[]):[];
const TEAMS=[...new Set(SD.games.flatMap(g=>[g[1],g[2]]).concat(Object.keys(DIV),HISTORICAL_FINALS.flatMap(g=>[g[1],g[2]])))].sort((a,b)=>a.localeCompare(b));
const DIVISIONS=[...new Set(Object.values(DIV))].sort((a,b)=>a-b);
const divTeams=Object.fromEntries(DIVISIONS.map(d=>[d,Object.keys(DIV).filter(x=>DIV[x]===d)]));
function pairKey(g){return g[0]+'|'+[g[1],g[2]].sort().join('|')}
function validScore(n){return n===null||(Number.isInteger(n)&&n>=0&&n<=999)}
function signed(n,d=4){return Number.isFinite(n)?(n>0?'+':'')+n.toFixed(d):'—'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const el=id=>document.getElementById(id);
const shortDate=d=>new Date(d+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'});
const BASELINE_DATE=new Date(SD_DATE+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

// Football: results played Thursday, October 29, 2026, confirmed from published score reports.
// Shared by all visitors, unlike locally saved what-if scenarios. MIAA's own ledger wins
// whenever it already has a score for the same game.
const PUBLISHED_FINALS=FOOTBALL?[["2026-10-29","Lee","Ware",46,14,0],["2026-10-29","Hoosac Valley","Holyoke",8,27,0],["2026-10-29","Quaboag Regional","Smith Vo-Tech",0,36,0],["2026-10-29","Lynn English","Medford",48,21,0],["2026-10-29","Chelsea","Minuteman Regional",23,22,0],["2026-10-29","Upper Cape Cod RVT","South Shore Vo-Tech",8,45,0],["2026-10-29","Winthrop","Salem",42,22,0],["2026-10-29","Cathedral","Archbishop Williams",26,47,0],["2026-10-29","Haverhill","Central Catholic",36,43,0],["2026-10-29","Quincy","Pembroke",41,14,0],["2026-10-29","Blue Hills RVT","Tri-County RVT",30,7,0],["2026-10-29","Milton","Weymouth",27,20,0],["2026-10-29","McCann Tech","Belchertown",0,54,0],["2026-10-29","Springfield Int'l Charter","HS of Commerce",49,6,0],...(typeof CONFIRMED_FINALS!=='undefined'?CONFIRMED_FINALS.games:[]),...HISTORICAL_FINALS]:[];
// Football Week 8 schedule (date, home, away, kickoff).
const WEEK8=[["2026-10-29","Lee","Ware","18:00"],["2026-10-29","Hoosac Valley","Holyoke","18:00"],["2026-10-29","Quaboag Regional","Smith Vo-Tech","18:00"],["2026-10-29","Lynn English","Medford","18:00"],["2026-10-29","Chelsea","Minuteman Regional","18:00"],["2026-10-29","Upper Cape Cod RVT","South Shore Vo-Tech","18:00"],["2026-10-29","Winthrop","Salem","18:30"],["2026-10-29","Cathedral","Archbishop Williams","19:00"],["2026-10-29","Haverhill","Central Catholic","19:00"],["2026-10-29","Quincy","Pembroke","19:00"],["2026-10-29","Blue Hills RVT","Tri-County RVT","19:00"],["2026-10-29","Milton","Weymouth","19:00"],["2026-10-30","O'Bryant","English High","16:00"],["2026-10-30","Everett","Lynn Classical","17:00"],["2026-10-30","Leominster","Grafton","18:00"],["2026-10-30","Northeast Metro RVT","Greater Lowell Tech","18:00"],["2026-10-30","Winchester","Belmont","18:00"],["2026-10-30","Shawsheen Valley Tech","Greater Lawrence Tech","18:00"],["2026-10-30","Putnam Vo-Tech","Taconic","18:00"],["2026-10-30","Norwell","Randolph","18:00"],["2026-10-29","Springfield Int'l Charter","HS of Commerce","18:00"],["2026-10-30","Lexington","Arlington","18:00"],["2026-10-30","Dennis-Yarmouth","Falmouth","18:00"],["2026-10-30","Malden Catholic","Xaverian Brothers","18:00"],["2026-10-30","East Boston","Tech Boston Academy","18:00"],["2026-10-30","North High","Worcester Tech","18:00"],["2026-10-30","Monument Mountain","Pathfinder RVT","18:00"],["2026-10-30","Bishop Feehan","La Salle Academy (R.I.)","18:00"],["2026-10-30","Saint John's","Boston College High","18:00"],["2026-10-30","Hull","Carver","18:00"],["2026-10-30","Cape Cod RVT","Atlantis Charter","18:00"],["2026-10-30","Gardner","Tyngsborough","18:00"],["2026-10-30","Barnstable","Bridgewater-Raynham","18:00"],["2026-10-30","Ashland","Norwood","18:00"],["2026-10-30","Hopkinton","Westwood","18:00"],["2026-10-30","Oliver Ames","Canton","18:00"],["2026-10-30","Malden","Somerville","18:00"],["2026-10-30","Medfield","Holliston","18:00"],["2026-10-30","Seekonk","West Bridgewater","18:00"],["2026-10-30","Franklin","Taunton","18:00"],["2026-10-30","Chelmsford","Lawrence","18:00"],["2026-10-30","North Andover","Lowell","18:00"],["2026-10-30","Needham","Framingham","18:00"],["2026-10-30","St. John's Prep","Catholic Memorial","18:00"],["2026-10-30","Millis","Dover-Sherborn","18:00"],["2026-10-30","Whittier RVT","Revere","18:00"],["2026-10-30","David Prouty","Abby Kelley Foster","18:00"],["2026-10-30","Sandwich","Nauset Regional","18:00"],["2026-10-30","Amesbury","Hamilton-Wenham","18:00"],["2026-10-30","Concord-Carlisle","Wayland","18:00"],["2026-10-30","Hingham","Silver Lake Regional","18:00"],["2026-10-30","Brookline","Wellesley","18:00"],["2026-10-30","Burlington","Wakefield Memorial","18:00"],["2026-10-30","Mansfield","King Philip Regional","18:00"],["2026-10-30","Duxbury","Plymouth North","18:00"],["2026-10-30","St. Mary's","Norton","18:00"],["2026-10-30","Reading Memorial","Woburn Memorial","18:00"],["2026-10-30","Wachusett Regional","Algonquin","18:00"],["2026-10-30","Joseph Case","Sharon","18:00"],["2026-10-30","Manchester Essex","Pentucket Regional","18:00"],["2026-10-30","Montachusett RVT","Nashoba Regional","18:00"],["2026-10-30","Holbrook","Monomoy","18:00"],["2026-10-30","Marshfield","Whitman-Hanson Reg.","18:00"],["2026-10-30","Newton North","Braintree","18:00"],["2026-10-30","Attleboro","Milford","18:00"],["2026-10-30","Medway","Bellingham","18:00"],["2026-10-30","Bishop Stang","Cardinal Spellman","18:00"],["2026-10-30","St. Bernard's","Oxford","18:30"],["2026-10-30","Shrewsbury","Westborough","18:30"],["2026-10-30","Lunenburg","Leicester","18:30"],["2026-10-30","Melrose","Stoneham","18:30"],["2026-10-30","Brockton","Durfee","18:30"],["2026-10-30","Keefe Tech","Southbridge","18:30"],["2026-10-30","Apponequet Regional","Dighton-Rehoboth","18:30"],["2026-10-30","North Reading","Essex North Shore","18:30"],["2026-10-30","Natick","Walpole","18:30"],["2026-10-30","Fairhaven","Greater New Bedford","18:30"],["2026-10-30","Lincoln-Sudbury","Cambridge Rindge & Lat.","18:30"],["2026-10-30","Nashua North (N.H.)","Dracut","18:30"],["2026-10-30","Stoughton","Wareham","18:30"],["2026-10-30","Boston Latin Academy","Brighton","18:30"],["2026-10-30","Cohasset","Mashpee","18:30"],["2026-10-30","Lynnfield","Newburyport","18:30"],["2026-10-30","Old Rochester Regional","Somerset Berkley Reg.","18:30"],["2026-10-29","McCann Tech","Belchertown","19:00"],["2026-10-30","Doherty Memorial","Tantasqua Regional","19:00"],["2026-10-30","Waltham","Boston Latin","19:00"],["2026-10-30","Agawam","Wahconah Regional","19:00"],["2026-10-30","KIPP Academy Lynn Coll.","Lowell Catholic","19:00"],["2026-10-30","Athol","Greenfield","19:00"],["2026-10-30","Methuen","Billerica Memorial","19:00"],["2026-10-30","Minnechaug","Longmeadow","19:00"],["2026-10-30","Acton-Boxborough","Bedford","19:00"],["2026-10-30","Blackstone Valley RVT","Assabet Valley RVT","19:00"],["2026-10-30","Maynard","Hudson","19:00"],["2026-10-30","Masconomet Regional","Marblehead","19:00"],["2026-10-30","Andover","Tewksbury Memorial","19:00"],["2026-10-30","Arlington Catholic","Bishop Fenwick","19:00"],["2026-10-30","South High Community","Auburn","19:00"],["2026-10-30","Saugus","Swampscott","19:00"],["2026-10-30","Chicopee","Northampton","19:00"],["2026-10-30","Millbury","Northbridge","19:00"],["2026-10-30","Marlborough","Shepherd Hill Regional","19:00"],["2026-10-30","Diman RVT","Bristol-Plymouth RVT","19:00"],["2026-10-30","Springfield Central","West Springfield","19:00"],["2026-10-30","Easthampton","South Hadley","19:00"],["2026-10-30","Newton South","Westford Academy","19:00"],["2026-10-30","Weston","Fitchburg","19:00"],["2026-10-30","Southeastern RVT","Old Colony RVT","19:00"],["2026-10-30","Bay Path RVT","Uxbridge","19:00"],["2026-10-30","East Longmeadow","Westfield","19:00"],["2026-10-30","Quabbin Regional","Groton-Dunstable","19:00"],["2026-10-30","North Attleborough","Foxborough","19:00"],["2026-10-30","East Bridgewater","Abington","19:00"],["2026-10-30","Scituate","Hanover","19:00"],["2026-10-30","Danvers","Peabody Veterans","19:00"],["2026-10-30","Bartlett","Narragansett Regional","19:00"],["2026-10-30","Middleborough","Rockland","19:00"],["2026-10-30","Murdock","Ayer Shirley","19:00"],["2026-10-30","Watertown","Wilmington","19:00"],["2026-10-30","Mahar Regional","Franklin County Tech","19:00"],["2026-10-30","New Bedford","Dartmouth","19:00"],["2026-10-30","Ludlow","Frontier Regional","19:00"],["2026-10-30","West Boylston","Oakmont Regional","19:00"],["2026-10-30","Plymouth South","North Quincy","19:00"],["2026-10-30","Amherst-Pelham Reg.","Chicopee Comp.","19:00"],["2026-10-30","Nashoba Valley Tech","Lynn Vo-Tech","19:30"],["2026-10-31","Gloucester","Beverly","11:00"],["2026-10-31","Blackstone-Millville","Burncoat","12:00"],["2026-10-31","Clinton","Nipmuc Regional","12:00"],["2026-10-31","Martha's Vineyard Reg.","Nantucket","15:00"]];
const LOCKED_MATCHUPS=new Set(PUBLISHED_FINALS.map(g=>[g[1],g[2]].sort().join('|')));
function isPublishedWeek8Game(g){return g[0]>='2026-10-27'&&g[0]<='2026-10-31'&&LOCKED_MATCHUPS.has([g[1],g[2]].sort().join('|'))}
function isPublishedWeek8Key(k){const parts=k.split('|');return parts.length===3&&parts[0]>='2026-10-27'&&parts[0]<='2026-10-31'&&LOCKED_MATCHUPS.has(parts.slice(1).join('|'))}
// Keyed by date and teams. Same-day doubleheaders (common in volleyball) keep a second key,
// so both games count; scenarios only ever address the first.
const source=new Map();
for(const g of SD.games){let k=pairKey(g);if(source.has(k)){let i=2;while(source.has(k+'#'+i))i++;k+='#'+i}source.set(k,g)}
// Remove outdated unplayed placeholders for games completed Thursday.
for(const [k,g] of source)if(g[3]===null&&g[4]===null&&isPublishedWeek8Game(g))source.delete(k);
// Order of authority: MIAA's official ledger, then live results from MIAA's public scoreboard (Arbiter data,
// synced daily by scripts/sync_live.py), then hand-entered finals for anything neither has yet.
// A later source is skipped when an earlier one has the same two teams within three days
// (a Friday game can be logged as Saturday), so no game is counted twice.
const LIVE=(typeof LIVE_DATA!=='undefined'&&LIVE_DATA.sports?.[SPORT])||{results:[],upcoming:[]};
const matchup=g=>[g[1],g[2]].sort().join('|');
const playedOn=new Map();
const notePlayed=g=>{(playedOn.get(matchup(g))||playedOn.set(matchup(g),[]).get(matchup(g))).push(Date.parse(g[0]))};
const playedNear=g=>(playedOn.get(matchup(g))||[]).some(t=>Math.abs(t-Date.parse(g[0]))<=3*864e5);
for(const g of SD.games)if(g[3]!==null)notePlayed(g);
const HAND_FORFEITS=new Map(PUBLISHED_FINALS.filter(g=>g[5]).map(g=>[matchup(g),g]));
const LIVE_KEYS=new Set();
// Live results and the official ledger both come from Arbiter, so their dates agree exactly; a live game is
// skipped only if the ledger has that exact game. Same-day doubleheaders get a second key, as in the ledger.
for(const g of LIVE.results){
 if(!TEAMS.includes(g[1])||!TEAMS.includes(g[2]))continue;
 // Keep a hand-verified forfeit label when Arbiter shows the same score as an ordinary game.
 const f=HAND_FORFEITS.get(matchup(g)),same=f&&(f[1]===g[1]?[f[3],f[4]]:[f[4],f[3]]).join()===[g[3],g[4]].join();
 const r=same&&!g[5]?[...g.slice(0,5),1]:g;
 let k=pairKey(r);const cur=source.get(k);if(cur&&cur[3]!==null&&!LIVE_KEYS.has(k))continue;
 if(LIVE_KEYS.has(k)){let i=2;while(source.has(k+'#'+i))i++;k+='#'+i}
 source.set(k,r);LIVE_KEYS.add(k);notePlayed(r);
}
for(const g of PUBLISHED_FINALS){const cur=source.get(pairKey(g));if((!cur||cur[3]===null)&&!playedNear(g))source.set(pairKey(g),g)}
// A scheduled game logged under a different date is attached to its schedule card, so the card shows the
// final and a prediction can't count the same game twice.
for(const r of FOOTBALL?WEEK8:[]){const k=pairKey([r[0],r[1],r[2]]);const cur=source.get(k);if(cur&&cur[3]!==null)continue;
 for(const [other,g] of source)if(other!==k&&g[3]!==null&&matchup(g)===matchup(r)&&Math.abs(Date.parse(g[0])-Date.parse(r[0]))<=3*864e5){source.delete(other);source.set(k,g);if(LIVE_KEYS.delete(other))LIVE_KEYS.add(k);break}}
// A game is locked once a final score exists: MIAA's ledger, the live scoreboard or a confirmed final.
const isLocked=k=>{const g=source.get(k);return !!(g&&g[3]!==null)};
const PUBLISHED_FINAL_KEYS=new Set(PUBLISHED_FINALS.map(pairKey));
const LOCKED_KEYS=new Set([...source.keys()].filter(k=>(PUBLISHED_FINAL_KEYS.has(k)||LIVE_KEYS.has(k))&&isLocked(k)));
const LIVE_THROUGH=[...LIVE_KEYS].map(k=>k.slice(0,10)).sort().pop()||null;
const POSTPONED_KEYS=new Set((FOOTBALL&&typeof CONFIRMED_FINALS!=='undefined'?(CONFIRMED_FINALS.postponed||[]):[]).map(p=>p.date+'|'+p.teams.slice().sort().join('|')));

// Games the viewer adds (every sport but football); scores for them live in `edits` like any scenario.
const FIXTURE_STORE=store('miaa-fixtures-2026');
let addedFixtures=[];
try{const s=JSON.parse(localStorage.getItem(FIXTURE_STORE)||'[]');if(Array.isArray(s))addedFixtures=s.filter(f=>Array.isArray(f)&&TEAMS.includes(f[1])&&TEAMS.includes(f[2])&&f[1]!==f[2]&&/^\d{4}-\d\d-\d\d$/.test(f[0]))}catch{}
let edits=[];
try{const s=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(s))edits=s.filter(g=>Array.isArray(g)&&g.length===6&&TEAMS.includes(g[1])&&TEAMS.includes(g[2])&&!isPublishedWeek8Game(g)&&!isLocked(pairKey(g)));}catch{}
// Bring over scenarios saved by the old separate fall-sports page.
if(!FOOTBALL&&!addedFixtures.length)try{const old=JSON.parse(localStorage.getItem('miaa-fall-2026-v1:'+SPORT)||'[]');
 if(Array.isArray(old)&&old.length){for(const g of old)if(Array.isArray(g)&&TEAMS.includes(g[1])&&TEAMS.includes(g[2])){addedFixtures.push([g[0],g[1],g[2],null]);edits.push(g)}localStorage.removeItem('miaa-fall-2026-v1:'+SPORT)}}catch{}
const LIVE_UPCOMING=FOOTBALL?[]:LIVE.upcoming.filter(r=>TEAMS.includes(r[1])&&TEAMS.includes(r[2]));
const schedule=()=>FOOTBALL?WEEK8:[...LIVE_UPCOMING,...addedFixtures.filter(f=>!LIVE_UPCOMING.some(r=>pairKey([r[0],r[1],r[2]])===pairKey([f[0],f[1],f[2]])))];
const isAddedFixture=k=>addedFixtures.some(f=>pairKey([f[0],f[1],f[2]])===k);
let selectedDiv=DIVISIONS[0], activePage='rankings', selectedTeam=Object.keys(DIV).sort((a,b)=>a.localeCompare(b))[0], weekDiv=DIVISIONS[0];
let alertTimer;
function toast(s){const x=el('alert');x.textContent=s;x.classList.add('show');clearTimeout(alertTimer);alertTimer=setTimeout(()=>x.classList.remove('show'),3000)}
function records(){const m=new Map(source);for(const g of edits)if(!isPublishedWeek8Game(g))m.set(pairKey(g),g);return [...m.values()]}
function compute(games){return calculateRatings(games,TEAMS,DIV,CAP)}
const BASE=compute(SD.games);
const offset=Object.keys(OFF).reduce((s,t)=>s+OFF[t][1]-BASE.teams[t].raw,0)/Object.keys(OFF).length;
function derive(m){
 // The Laplacian ratings have an arbitrary additive constant. Adding a previously
 // isolated out-of-state team can shift that constant without changing any actual
 // Massachusetts ratings. Anchor scenario *deltas* to the mean of all published MA
 // teams so a one-game non-MA opponent doesn't create a fictitious statewide swing.
 const officialNames=Object.keys(OFF);
 const gauge=officialNames.reduce((sum,t)=>sum+(m.teams[t].raw-BASE.teams[t].raw),0)/officialNames.length;
 for(const [t,v] of Object.entries(m.teams)){
  const b=BASE.teams[t];const anchor=OFF[t]?OFF[t][1]:b.raw+offset;
  v.rating=anchor+(v.raw-b.raw)-gauge;v.change=v.rating-anchor;
 }
 return m;
}
let MODEL=derive(compute(records()));
// Official ranks, used to show how far a team moves under the viewer's scenario.
const BASELINE=derive(compute(SD.games)),byRating=(a,b)=>b.rating-a.rating||a.team.localeCompare(b.team);
const baseDivRank={},baseDivSeed={};
for(const d of DIVISIONS)for(const r of standings(d,BASELINE)){baseDivRank[r.team]=r.rank;baseDivSeed[r.team]=r.seed;}
function rec(r){return `${r.w}–${r.l}${r.ties?'–'+r.ties:''}`}
function moveTag(now,before){const d=before-now;return d?`<span class="move ${d>0?'up':'down'}" title="${d>0?'Up':'Down'} ${Math.abs(d)} since ${shortDate(SD_DATE)}">${Math.abs(d)}</span>`:''}
function deltaTag(c){return Math.abs(c)<0.00001?'<span class="delta-none">—</span>':`<span class="delta ${c>0?'pos':'neg'}">${signed(c)}</span>`}
// 2026 MIAA football: skip teams with fewer than three wins or seven competed
// games, then promote the next eligible team by power-rating order into each seed.
// A published rating rank and a tournament seed are separate concepts.
function standings(d,model=MODEL){
 let nextSeed=0;
 return divTeams[d].map(t=>model.teams[t]).sort(byRating).map((v,i)=>{
  const eligible=!FOOTBALL||(v.w>=3&&v.gp-(v.forfeitLosses||0)>=7);
  const seed=eligible&&nextSeed<FIELD?++nextSeed:null;
  return {...v,rank:i+1,eligible,seed,qualified:seed!==null};
 });
}
const playoffField=d=>standings(d).filter(r=>r.qualified);
const ineligibleReason=r=>r.w<3?'Fewer than 3 wins':'Fewer than 7 games';
// Only ineligible football teams get a note; the playoff-zone bar and the playoff line show everything else.
const eligibilityTag=r=>FOOTBALL&&!r.eligible?`<span class="team-qualifier is-ineligible" title="${ineligibleReason(r)}">Ineligible for playoffs</span>`:'';
function recalc(){MODEL=derive(compute(records()));renderRankings(true);renderEdits();if(activePage==='team')renderTeam();if(activePage==='bracket')renderBracket();updateFixtureStates();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(edits));localStorage.setItem(PRED_STORE,JSON.stringify([...predictedKeys]));if(!FOOTBALL)localStorage.setItem(FIXTURE_STORE,JSON.stringify(addedFixtures))}catch{}recalc()}
function renderDivisionTabs(){el('divisions').innerHTML=DIVISIONS.map(d=>`<button type="button" class="division ${selectedDiv===d?'selected':''}" data-div="${d}" aria-pressed="${selectedDiv===d}">D${d}</button>`).join('')}

// After a recalculation, slide rows from their old positions so teams visibly move past each other,
// and flash rows whose rating changed. Skipped for filter changes and for reduced-motion users.
const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
function flipRows(containers,render){
 const before=new Map();
 for(const c of containers)for(const n of c.querySelectorAll('[data-row]'))before.set(c.id+n.dataset.row,{top:n.getBoundingClientRect().top,rating:n.dataset.rating});
 render();
 if(reduceMotion.matches)return;
 for(const c of containers)for(const n of c.querySelectorAll('[data-row]')){
  const b=before.get(c.id+n.dataset.row);if(!b)continue;
  if(b.rating!==n.dataset.rating)n.classList.add('is-bumped');
  const dy=b.top-n.getBoundingClientRect().top;
  if(Math.abs(dy)>1)n.animate([{transform:`translateY(${dy}px)`},{transform:'none'}],{duration:520,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
}
function scoredCount(){return schedule().filter(r=>{const g=fixtureScore(r);return g&&g[3]!==null&&g[4]!==null}).length}
function renderRankings(animate){if(animate===true){flipRows([el('rankingsBody'),el('mobileRankingsBody')],()=>renderRankings());return}renderDivisionTabs();
 const all=standings(selectedDiv),lastSeed=all.filter(r=>r.qualified).at(-1);
 let rows=all;const q=el('rankingSearch').value.trim().toLowerCase();if(q)rows=rows.filter(t=>t.team.toLowerCase().includes(q));
 const showCut=!q,cutRank=lastSeed?.rank;
 el('tableMeta').textContent=`${rows.length} ${rows.length===1?'team':'teams'} in Division ${selectedDiv} · ${all.filter(r=>r.qualified).length} projected playoff seeds`;
 el('rankingsBody').innerHTML=rows.length?rows.map(r=>{const zone=r.qualified?'playoff-zone':!r.eligible?'ineligible-row':'',move=moveTag(r.rank,baseDivRank[r.team]);
  return `${showCut&&cutRank&&r.rank===cutRank+1?'<tr class="cutrow"><td colspan="7"><div class="cutline-label"><span>Below last qualifying seed</span></div></td></tr>':''}<tr class="${zone}" data-row="${esc(r.team)}" data-rating="${r.rating.toFixed(4)}"><td class="col-rank"><span class="rank">${r.rank}</span>${move}</td><td class="col-team"><button type="button" class="team-button" data-team="${esc(r.team)}"><span class="team-label"><span class="team-name">${esc(r.team)}</span>${eligibilityTag(r)}</span></button></td><td class="col-rec">${rec(r)}</td><td class="num">${signed(r.mov)}</td><td class="num">${signed(r.opp)}</td><td class="num col-rating">${signed(r.rating)}</td><td class="num">${deltaTag(r.change)}</td></tr>`}).join(''):'<tr><td colspan="7" class="empty">No teams match your search.</td></tr>';
 el('mobileRankingsBody').innerHTML=rows.length?rows.map(r=>{const zone=r.qualified?'playoff-zone':!r.eligible?'ineligible-row':'',move=moveTag(r.rank,baseDivRank[r.team]);
  return `${showCut&&cutRank&&r.rank===cutRank+1?'<div class="mcut"><span>Below last qualifying seed</span></div>':''}<div class="mrow ${zone}" data-row="${esc(r.team)}" data-rating="${r.rating.toFixed(4)}"><span class="mrank"><span class="rank">${r.rank}</span>${move}</span><button type="button" class="mteam" data-team="${esc(r.team)}"><span class="team-label"><span class="team-name">${esc(r.team)}</span>${eligibilityTag(r)}<span class="team-sub"><span>${rec(r)}</span><span>Margin ${signed(r.mov,1)}</span><span>Opp ${signed(r.opp,1)}</span></span></span></button><span class="mrating"><b>${signed(r.rating)}</b>${deltaTag(r.change)}</span></div>`}).join(''):'<div class="empty">No teams match your search.</div>';
 renderHeroLine();
 el('resetSearch').classList.toggle('hidden',!q);
 el('tableFootText').textContent=FOOTBALL?'Power-rating ranks remain unchanged. The tournament seeds are the top 16 eligible teams with at least 3 wins and 7 competed games. Ineligible teams are skipped, and the next eligible teams move in.':'Teams below the playoff line are outside the top 32. Lower-ranked teams at .500 or better can generally still reach a preliminary round.';
 const scored=scoredCount(),total=schedule().length,lockedN=schedule().filter(r=>isLocked(fixtureKey(r))).length;
 el('scenarioBadge').classList.toggle('is-active',edits.length>0);
 el('scenarioBadge').innerHTML=FOOTBALL
  ?(edits.length?`<strong>Week 8: ${lockedN} finals + your scenarios (${scored} of ${total} scored)</strong>`:`<strong>🔒 ${lockedN} Week 8 finals applied statewide</strong>`)
  :(edits.length?`<strong>Your projection: ${scored} of ${total} added ${total===1?'game':'games'} scored</strong>`:'Showing official rankings');
 el('heroReset').classList.toggle('hidden',!edits.length);
 const extraFinals=PUBLISHED_FINALS.filter(g=>{const s=SD.games.find(h=>pairKey(h)===pairKey(g));return !s||s[3]===null}).length;
 el('heroDate').textContent=edits.length?'Projected rankings':LIVE_THROUGH?`MIAA ratings as of ${shortDate(SD_DATE)} + live scores through ${shortDate(LIVE_THROUGH)}`:extraFinals?`${shortDate(SD_DATE)} MIAA baseline + ${extraFinals} verified supplemental ${extraFinals===1?'result':'results'}`:`As of ${BASELINE_DATE}`;
}
// Hero card: the teams on either side of the line in the chosen division.
function renderHeroLine(){
 const s=standings(selectedDiv),a=s.filter(r=>r.qualified).at(-1),b=s.find(r=>r.eligible&&!r.qualified);
 if(!a||!b){el('heroLine').innerHTML='';return}
 const row=(r,n,cls)=>`<button type="button" class="hl-row${cls}" data-team="${esc(r.team)}"><span class="hl-rank">${n}</span><span class="hl-name">${esc(r.team)}</span><span class="hl-rate">${signed(r.rating,2)}</span></button>`;
 el('heroLine').innerHTML=`<p class="hl-title">Division ${selectedDiv} · Last seed / next eligible team</p>${row(a,a.seed,'')}<div class="hl-chalk" aria-hidden="true"></div>${row(b,FIELD+1,' is-out')}<p class="hl-gap">${(a.rating-b.rating).toFixed(a.rating-b.rating<0.01?4:2)} rating points apart</p>`;
}
function renderEdits(){
 const keys=new Set(schedule().map(fixtureKey));
 el('editCount').textContent=`(${edits.length})`;el('editBadge').textContent=edits.length;el('editBadge').classList.toggle('on',edits.length>0);
 el('editSub').textContent=edits.length?'Your scenarios are saved in this browser only':FOOTBALL?'Verified Thursday and Friday finals are included for everyone':'Scores you enter for added games appear here';
 el('editList').innerHTML=edits.length?edits.slice().sort((a,b)=>b[0].localeCompare(a[0])).map(g=>`<div class="editrow"><div class="editrow-main"><span class="editrow-teams">${esc(g[1])}<span class="score">${g[3]}–${g[4]}</span>${esc(g[2])}</span><small>${shortDate(g[0])}${predictedKeys.has(pairKey(g))?' <span class="tag-pred">Prediction</span>':''}</small></div><div class="editrow-actions">${keys.has(pairKey(g))?`<button type="button" class="bttn sml ghost" data-load="${esc(pairKey(g))}">Edit</button>`:''}<button type="button" class="bttn sml ghost danger" data-remove="${esc(pairKey(g))}" aria-label="Remove">×</button></div></div>`).join(''):`<div class="edit-empty">No scenario scores yet.<br>${FOOTBALL?'Enter a Week 8 score to start.':'Add a game and enter its score to start.'}</div>`;
}
function showTeam(name){selectedTeam=name;el('teamSearch').value=name;el('teamSelect').value=name;switchPage('team')}
function renderTeam(){const x=MODEL.teams[selectedTeam];if(!x){el('teamDetails').innerHTML='<div class="empty">Choose a team to view its schedule.</div>';return}const myGames=records().filter(g=>g[1]===selectedTeam||g[2]===selectedTeam).sort((a,b)=>a[0].localeCompare(b[0]));const row=x.division?standings(x.division).find(r=>r.team===selectedTeam):null,curRank=row?row.rank:null;
 const editKeys=new Set(edits.map(pairKey)),cls=n=>n>0.00001?'pos':n<-0.00001?'neg':'';
 el('teamDetails').innerHTML=`<div class="details"><div class="team-hero"><div class="team-id"><div><p class="eyebrow">${x.division?`Division ${x.division}`:'Out-of-state opponent'}${curRank?`, ranked ${curRank} of ${divTeams[x.division].length}`:''}</p><h2>${esc(x.team)}</h2><div class="team-facts"><span class="chip"><strong>${rec(x)}</strong></span><span class="chip">${x.gp} games</span>${row?`<span class="chip ${row.qualified?'ok':'no'}">${row.qualified?`Playoff seed ${row.seed}`:!row.eligible?'Ineligible for playoffs':`Outside top ${FIELD} eligible teams`}</span>`:''}</div></div></div><button type="button" class="bttn" id="returnRankings">Back to rankings</button></div>
 <div class="metrics"><div class="metric"><small>Power rating</small><b>${signed(x.rating,2)}</b></div><div class="metric"><small>Avg capped margin</small><b>${signed(x.mov,2)}</b></div><div class="metric"><small>Opponent rating</small><b>${signed(x.opp,2)}</b></div><div class="metric"><small>Scenario change</small><b class="${cls(x.change)}">${signed(x.change,2)}</b></div></div>
 <div class="section-head"><h3>Schedule &amp; results</h3><span>Margins capped at ±${CAP}</span></div><div class="table-scroll"><table class="gameTable"><thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th class="num">Margin</th><th class="num">Opp rating</th></tr></thead><tbody>${myGames.map(g=>{const own=g[1]===selectedTeam,opp=own?g[2]:g[1],my=own?g[3]:g[4],their=own?g[4]:g[3],k=pairKey(g),wl=my===null?'u':my>their?'w':my<their?'l':'t',margin=my===null?'—':signed(Math.max(-CAP,Math.min(CAP,my-their)),0);
  const tag=LOCKED_KEYS.has(k)?(g[5]?'<span class="gtag locked">FINAL · FORFEIT</span>':'<span class="gtag locked">FINAL</span>'):g[5]?'<span class="gtag ff">Forfeit</span>':editKeys.has(k)?(predictedKeys.has(k)?'<span class="gtag pred">Prediction</span>':'<span class="gtag scen">Scenario</span>'):POSTPONED_KEYS.has(k)?'<span class="gtag postponed">POSTPONED</span>':'';
  return `<tr><td class="date">${shortDate(g[0])}</td><td><button type="button" class="team-button" data-team="${esc(opp)}"><span class="team-name">${esc(opp)}</span></button></td><td><span class="result"><span class="wl ${wl}">${wl==='u'?'–':wl.toUpperCase()}</span>${my===null?'Unplayed':my+'–'+their}</span>${tag}</td><td class="num">${margin}</td><td class="num">${signed(MODEL.teams[opp]?.rating,2)}</td></tr>`}).join('')}</tbody></table></div></div>`;}
function switchPage(page){activePage=page;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('hidden',e.id!==page+'Page'));document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('selected',e.dataset.page===page));if(page==='team')renderTeam();if(page==='bracket'){bracketDiv=selectedDiv;renderBracket()}window.scrollTo(0,0)}
function reset(){if(edits.length&&!confirm('Remove all scenario changes?'))return;edits=[];predictedKeys.clear();save();toast(FOOTBALL?'Scenarios cleared; confirmed scores remain locked':'Scenario scores cleared; your added games are still listed')}

/* Projected brackets: the top FIELD teams by rating in each division, standard seeding
   (1 plays the last seed, and the top two seeds can only meet in the final).
   Later rounds advance the higher seed, which is also the higher-rated team. */
let bracketDiv=DIVISIONS[0];
function seedOrder(n){let order=[1];while(order.length<n){const size=order.length*2;order=order.flatMap(s=>[s,size+1-s])}return order}
const ROUND_NAMES={32:'Round of 32',16:'Round of 16',8:'Quarterfinals',4:'Semifinals',2:'State final'};
function renderBracket(){
 el('bracketDivs').innerHTML=DIVISIONS.map(d=>`<button type="button" class="${bracketDiv===d?'selected':''}" data-bdiv="${d}" aria-pressed="${bracketDiv===d}">D${d}</button>`).join('');
 const rows=standings(bracketDiv),field=rows.filter(r=>r.qualified),nextEligible=rows.filter(r=>r.eligible&&!r.qualified),seed=Object.fromEntries(field.map(r=>[r.seed,r]));
 const slot=(s,fav,proj)=>{const r=seed[s];if(!r)return `<div class="slot is-empty"><span class="seed">${s}</span><span class="slot-name">No eligible team</span></div>`;
  const warn='';
  return `<button type="button" class="slot${fav?' is-fav':''}${proj?' is-proj':''}" data-team="${esc(r.team)}"><span class="seed">${s}</span><span class="slot-name">${esc(r.team)}</span>${warn}<span class="slot-rate">${signed(r.rating,2)}</span></button>`};
 const order=seedOrder(FIELD);let round=Array.from({length:FIELD/2},(_,i)=>[order[2*i],order[2*i+1]]);const rounds=[round];
 while(round.length>1){round=Array.from({length:round.length/2},(_,i)=>[Math.min(...round[2*i]),Math.min(...round[2*i+1])].sort((a,b)=>a-b));rounds.push(round)}
 el('bracket').style.setProperty('--rounds',rounds.length);
 el('bracket').innerHTML=rounds.map((rd,i)=>{const pairs=rd.length>1?Array.from({length:rd.length/2},(_,k)=>rd.slice(2*k,2*k+2)):[rd];
  return `<section class="round"><h3>${ROUND_NAMES[rd.length*2]}</h3><div class="round-body">${pairs.map(p=>`<div class="pair${p.length===1?' is-single':''}">${p.map(([a,b])=>`<div class="match-wrap"><div class="match">${slot(a,true,i>0)}${slot(b,false,i>0)}</div></div>`).join('')}</div>`).join('')}</div></section>`}).join('');
 const lastSeed=field.at(-1),firstOut=nextEligible[0];
 const item=(r,gap)=>`<li><span class="bubble-rank">${r.seed||r.rank}</span><button type="button" class="team-button" data-team="${esc(r.team)}"><span class="team-name">${esc(r.team)}</span></button><span class="bubble-gap">${gap}</span></li>`;
 const lastIn=firstOut?field.slice(-4).map(r=>item(r,'+'+(r.rating-firstOut.rating).toFixed(2))).join(''):field.slice(-4).map(r=>item(r,'—')).join(''),out=lastSeed?nextEligible.slice(0,4).map(r=>item(r,'−'+(lastSeed.rating-r.rating).toFixed(2))).join(''):'';
 const moved=rows.filter(r=>!!r.qualified!==!!baseDivSeed[r.team]);
  const skipped=FOOTBALL?rows.filter(r=>!r.eligible&&r.rank<=(lastSeed?.rank||FIELD)):[];
  const skipCard=skipped.length?'<div class="bubble-col"><h3>Skipped — ineligible</h3><p>Replaced by next eligible teams</p><ol>'+skipped.map(r=>'<li><span class="bubble-rank">'+r.rank+'</span><button type="button" class="team-button" data-team="'+esc(r.team)+'"><span class="team-name">'+esc(r.team)+'</span></button><span class="bubble-gap">'+(r.w<3?r.w+' win'+(r.w===1?'':'s'):'Under 7 games')+'</span></li>').join('')+'</ol></div>':'';
 el('bubble').innerHTML=`<div class="bubble-col"><h3>Last four in</h3><p>Eligible seeds in the projected bracket</p><ol>${lastIn}</ol></div><div class="bubble-col"><h3>First four out</h3><p>Next eligible teams by rating</p><ol>${out}</ol></div>${skipCard}${moved.length?`<div class="bubble-col bubble-moves"><h3>Projected field changes</h3><p>Compared with the ${BASELINE_DATE} eligible field</p><ul>${moved.map(r=>`<li><button type="button" class="team-button" data-team="${esc(r.team)}"><span class="team-name">${esc(r.team)}</span></button><span class="move-label ${r.qualified?'is-in':'is-out'}">${r.qualified?'Now seeded '+r.seed:'Now out'}, was ${baseDivSeed[r.team]||'not seeded'}</span></li>`).join('')}</ul></div>`:''}`;
 el('bracketSub').textContent=FOOTBALL?`Division ${bracketDiv}: ${field.length} projected playoff seeds. The 16 highest-rated eligible teams (3 wins and 7 competed games minimum) are selected; ineligible teams are skipped. ${edits.length?'Includes your '+edits.length+' scenario score(s).':'Includes all entered final scores.'}`:`Division ${bracketDiv} has ${rows.length} teams and the top ${FIELD} make the projected bracket.`;
}

/* Matchups: football's Week 8 schedule, or the games a viewer adds for other sports. */
function fixtureKey(r){return pairKey([r[0],r[1],r[2],null,null,0])}
// "Edit" on an entered score jumps to its matchup card and focuses the first score box.
function focusFixture(key){
 document.querySelector('[data-side-tab=week8]').click();
 if(![...el('fixtureList').querySelectorAll('[data-fixture]')].some(c=>c.dataset.fixture===key)){el('weekSearch').value='';const r=schedule().find(x=>fixtureKey(x)===key);if(r)weekDiv=DIV[r[1]]||DIV[r[2]]||weekDiv;renderFixtures()}
 const card=[...el('fixtureList').querySelectorAll('[data-fixture]')].find(c=>c.dataset.fixture===key);if(!card)return;
 card.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'center'});card.querySelector('[data-side=a]').focus({preventScroll:true});
}
function fixtureScore(r){return edits.find(g=>pairKey(g)===fixtureKey(r))||source.get(fixtureKey(r))}
function visibleFixtures(){const q=(el('weekSearch')?.value||'').trim().toLowerCase();return schedule().filter(r=>(DIV[r[1]]===weekDiv||DIV[r[2]]===weekDiv)&&(!q||(r[1]+' '+r[2]).toLowerCase().includes(q))).sort((a,b)=>a[0].localeCompare(b[0])||String(a[3]||'').localeCompare(String(b[3]||''))||a[1].localeCompare(b[1]))}
function fixtureWhen(r){const day=new Date(r[0]+'T12:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});if(!r[3])return day;let [h,m]=r[3].split(':').map(Number);return `${day}, ${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
// Scores are estimated locally from official ratings and actual 2026 results.
// This is a transparent ratings model, NOT an online generative AI prediction service.
const PRED_STORE=store('miaa-week8-auto-picks-2026-v1');
let predictedKeys=new Set();
try{const arr=JSON.parse(localStorage.getItem(PRED_STORE)||'[]');if(Array.isArray(arr))predictedKeys=new Set(arr.filter(x=>typeof x==='string'&&!isPublishedWeek8Key(x)));}catch{}
const seasonPoints={},seasonMargins={};
for(const g of SD.games){if(g[3]===null||g[4]===null||!validScore(g[3])||!validScore(g[4])||g[5])continue;
 for(const [team,opp,scored,allowed] of [[g[1],g[2],g[3],g[4]],[g[2],g[1],g[4],g[3]]]){
 const stat=seasonPoints[team]||(seasonPoints[team]={games:0,scored:0,allowed:0});
 stat.games++;stat.scored+=scored;stat.allowed+=allowed;
 const m=seasonMargins[team]||(seasonMargins[team]=new Map());m.set(opp,[...(m.get(opp)||[]),scored-allowed]);
 }}
function originalRating(team){return OFF[team]?OFF[team][1]:BASE.teams[team]?BASE.teams[team].raw+offset:0;}
// Common-opponent comparison: how A did against shared opponents minus how B did against them.
// A previous meeting between the two teams counts double. Margins are clipped (±28 points in
// football, the ±3 cap elsewhere) so one blowout can't dominate.
function commonOpponents(a,b){
 const ma=seasonMargins[a],mb=seasonMargins[b];if(!ma||!mb)return {n:0,edge:0};
 const lim=FOOTBALL?28:CAP,avg=xs=>xs.reduce((s,x)=>s+x,0)/xs.length,clip=x=>Math.max(-lim,Math.min(lim,x));
 let n=0,edge=0;
 for(const [opp,xs] of ma){if(opp===b||!mb.has(opp))continue;edge+=clip(avg(xs))-clip(avg(mb.get(opp)));n++}
 if(ma.has(b)){edge+=2*clip(avg(ma.get(b)));n+=2}
 return {n,edge:n?edge/n:0};
}
function estimateGameScore(r){
 const a=r[1],b=r[2],aa=seasonPoints[a],bb=seasonPoints[b];
 const avg=(s,k,none)=>s&&s.games?s[k]/s.games:none;
 const gap=originalRating(a)-originalRating(b),common=commonOpponents(a,b);
 if(FOOTBALL){
  const scoringA=.60*avg(aa,'scored',21)+.40*avg(bb,'allowed',21);
  const scoringB=.60*avg(bb,'scored',21)+.40*avg(aa,'allowed',21);
  // Baseline team scoring establishes total points, with relative strength anchoring margin.
  const total=Math.max(14,Math.min(85,scoringA+scoringB));
  const form=scoringA-scoringB;
  // Weights from a walk-forward backtest on 2026 weeks 3–7 (each week predicted from prior weeks only):
  // 76.8% winners and 6.45 avg capped-margin error, vs 76.2% and 6.96 for the previous .75·gap+.25·form.
  const w=.3*common.n/(common.n+2);
  const margin=Math.max(-35,Math.min(35,(1-w)*(1.25*gap+.8*form)+w*common.edge));
  let sa=Math.max(0,Math.round((total+margin)/2)),sb=Math.max(0,Math.round((total-margin)/2));
  // High-school football can have ties during regulation but a finished matchup normally has a winner.
  if(sa===sb){if(gap>=0)sa+=1;else sb+=1;}
  return [sa,sb];
 }
 const scoringA=.60*avg(aa,'scored',1.5)+.40*avg(bb,'allowed',1.5);
 const scoringB=.60*avg(bb,'scored',1.5)+.40*avg(aa,'allowed',1.5);
 // Weights from a walk-forward backtest of each 2026 fall sport (each week predicted from prior weeks):
 // winners right 77.8% field hockey, 67.8% boys soccer, 70.9% girls soccer, 82.3% volleyball.
 // Predicting draws never beat picking the favorite, so every prediction names a winner.
 const w=.2*common.n/(common.n+2);
 let margin=(1-w)*(.9*gap+.2*(scoringA-scoringB))+w*common.edge;
 if(margin===0)margin=gap>=0?.01:-.01;
 if(SPORT==='volleyball'){const lost=Math.abs(margin)>=2?0:Math.abs(margin)>=1?1:2;return margin>0?[3,lost]:[lost,3]}
 const total=Math.max(1,Math.min(8,scoringA+scoringB));
 let sa=Math.max(0,Math.round((total+margin)/2)),sb=Math.max(0,Math.round((total-margin)/2));
 // Rounding can produce a draw or flip the winner; the predicted favorite always wins by at least one.
 if(sa===sb){if(margin>0)sa++;else sb++}
 else if((sa>sb)!==(margin>0))[sa,sb]=[sb,sa];
 return [sa,sb];
}
function unscoredFixtures(){const done=new Set(edits.map(g=>pairKey(g)));return schedule().filter(r=>!done.has(fixtureKey(r))&&!isLocked(fixtureKey(r)))}
// Returns how many games were filled in.
function predictAll(){
 const open=unscoredFixtures();
 if(!open.length){toast(schedule().length?'Every game already has a score. Clear scores to generate more.':'Add a game first, then predict it.');return 0}
 for(const r of open){const [sa,sb]=estimateGameScore(r);edits.push([r[0],r[1],r[2],sa,sb,0]);predictedKeys.add(fixtureKey(r))}
 save();toast(`Estimated ${open.length} ${open.length===1?'game':'games'}. Manual scores preserved.`);
 return open.length;
}
function clearAllPredictions(){
 if(!predictedKeys.size)return;
 const count=predictedKeys.size;
 edits=edits.filter(g=>!predictedKeys.has(pairKey(g)));
 predictedKeys.clear();save();toast('Removed '+count+' predicted game scores. Manual scores kept.');
}
function teamMeta(name){
 const m=MODEL.teams[name], div=DIV[name];
 // Out-of-state opponents have only their games versus MA schools in our ledger.
 const record=div&&m?rec(m):'—';
 const rating=div&&m?signed(m.rating,2):'—';
 return `<span class="fixture-data" data-meta-team="${esc(name)}"><span class="fixture-rec">${record}</span><span class="fixture-div">${div?'D'+div:'Non-MA'}</span><span class="fixture-rate">${rating}</span></span>`;
}
function renderFixtures(){
 const filters=el('weekFilters');if(!filters)return;
 filters.innerHTML=DIVISIONS.map(d=>`<button type="button" data-wdiv="${d}" class="weekFilter ${weekDiv===d?'selected':''}">D${d}</button>`).join('');
 const games=visibleFixtures();
 const line=(side,name)=>`<div class="fixtureline" data-line="${side}"><div class="fixtureteam"><button type="button" class="fixture-team-link" data-team="${esc(name)}" title="View ${esc(name)}"><span class="fixture-name">${esc(name)}</span></button>${teamMeta(name)}</div><div class="score-actions"><input class="fixture-score" data-side="${side}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Score for ${esc(name)}" placeholder="–"><button type="button" class="max-win" data-max="${side}" title="Set ${esc(name)} to win ${CAP}–0">MAX</button></div></div>`;
 const none=FOOTBALL?'No matchups match your search.':schedule().length?`No added games involve a Division ${weekDiv} team.`:'No upcoming games on MIAA\'s scoreboard yet. Add any you know of above.';
 el('fixtureList').innerHTML=games.length?games.map(r=>`<article class="fixture" data-fixture="${esc(fixtureKey(r))}">
   <div class="fixturetop"><span class="fixture-date">${fixtureWhen(r)}</span><div class="fixture-meta"><span class="fixtureStatus"></span><button type="button" class="fixtureClear" data-clear="${esc(fixtureKey(r))}" title="${FOOTBALL?'Remove score':'Remove game'}" aria-label="${FOOTBALL?'Remove score':'Remove game'}">×</button></div></div>
   ${line('a',r[1])}${line('b',r[2])}
 </article>`).join(''):`<div class="empty">${none}</div>`;
 updateFixtureStates();
}
function updateFixtureStates(){
 const list=el('fixtureList');if(!list)return;let n=0;
 for(const card of list.querySelectorAll('[data-fixture]')){
 const k=card.dataset.fixture,entered=edits.find(g=>pairKey(g)===k),base=source.get(k), g=entered||base;
 const locked=isLocked(k),has=!!(g&&g[3]!==null&&g[4]!==null),pred=!!entered&&predictedKeys.has(k);if(has)n++;
 const lab=card.querySelector('.fixtureStatus');lab.textContent=locked?(g[5]?'FINAL · FORFEIT':'FINAL'):entered?(pred?'Prediction':'Scenario'):POSTPONED_KEYS.has(k)?'POSTPONED':'';lab.classList.toggle('saved',!!entered&&!pred);lab.classList.toggle('pred',pred);lab.classList.toggle('locked',locked);lab.classList.toggle('postponed',!locked&&!entered&&POSTPONED_KEYS.has(k));lab.classList.remove('warn');
 for(const [side,index] of [['a',3],['b',4]]){const input=card.querySelector(`[data-side=${side}]`);if(input!==document.activeElement){const target=has?String(g[index]):'';if(input.value!==target)input.value=target;}input.disabled=locked;
   card.querySelector(`[data-line=${side}]`).classList.toggle('is-win',has&&g[index]>g[index===3?4:3]);}
 card.classList.toggle('fixture-edited',!!entered);card.classList.toggle('is-pred',pred);card.classList.toggle('fixture-locked',locked);card.querySelectorAll('[data-max]').forEach(b=>b.disabled=locked);
 card.classList.toggle('has-result',has&&g[3]!==g[4]);
 // Never replace the score inputs: the user may be in the middle of typing.
 for(const row of card.querySelectorAll('[data-meta-team]')){
   const name=row.dataset.metaTeam, m=MODEL.teams[name], div=DIV[name];
   row.querySelector('.fixture-rec').textContent=div&&m?rec(m):'—';
   row.querySelector('.fixture-div').textContent=div?'D'+div:'Non-MA';
   row.querySelector('.fixture-rate').textContent=div&&m?signed(m.rating,2):'—';
 }
 card.querySelector('.fixtureClear').disabled=isAddedFixture(k)?false:locked||!entered;
 }
 const total=visibleFixtures().length;
 el('weekMeta').textContent=total?`${n} of ${total} ${total===1?'matchup':'matchups'} scored`:FOOTBALL?'':'Games you add are saved in this browser only';
 el('clearPredictions').disabled=!predictedKeys.size;
}
// A score must be whole numbers; volleyball counts sets, so the winner has exactly 3 and the loser 0–2.
function scoreProblem(a,b){
 if(SPORT==='volleyball'&&!((a===3&&b<3)||(b===3&&a<3)))return 'Sets: winner 3, loser 0–2';
 if(!FOOTBALL&&(a>99||b>99))return 'Scores up to 99';
 return '';
}
function addFixture(){
 const a=el('addA').value.trim(),b=el('addB').value.trim(),date=el('addDate').value;
 if(!TEAMS.includes(a)||!TEAMS.includes(b)){toast('Choose both teams from the list.');return}
 if(a===b){toast('Choose two different teams.');return}
 if(!/^\d{4}-\d\d-\d\d$/.test(date)||date<SD_DATE){toast(`Pick a date on or after ${shortDate(SD_DATE)}.`);return}
 const f=[date,a,b,null];
 if(addedFixtures.some(x=>fixtureKey(x)===fixtureKey(f))){toast('That game is already on the list.');return}
 if(isLocked(fixtureKey(f))){toast('That game already has an official result.');return}
 addedFixtures.push(f);weekDiv=DIV[a]||DIV[b]||weekDiv;selectedDiv=weekDiv;
 el('addA').value='';el('addB').value='';save();renderFixtures();
 focusFixture(fixtureKey(f));toast(`Added ${a} vs ${b}.`);
}

// First-visit chooser. Dismissal is remembered per browser and per sport.
const INTRO_KEY=store('miaa-intro-seen-v1');
function scrollToEl(node){node.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'})}
function openIntro(){const d=el('intro');if(d.open||typeof d.showModal!=='function')return;
 const n=unscoredFixtures().length;
 if(FOOTBALL)el('introCount').textContent=n?`the ${n} Week 8 ${n===1?'game':'games'} that ${n===1?'has':'have'} no score yet`:'Week 8';
 d.showModal()}
// Shows the matchup list and puts the cursor in the first empty score box (or the add-game form).
function jumpToWeek8(){if(activePage!=='rankings')switchPage('rankings');document.querySelector('[data-side-tab=week8]').click();
 const open=[...el('fixtureList').querySelectorAll('.fixture-score')].find(x=>!x.value&&!x.disabled);
 scrollToEl(el('week8View'));const target=open||(!FOOTBALL&&el('addA'));if(target)setTimeout(()=>target.focus({preventScroll:true}),350)}

/* Sport-specific words on the page. */
function applySportCopy(){
 document.body.dataset.sport=SPORT;
 document.title=`MIAA ${SP.name} Power Rankings${FOOTBALL?' and Week 8 Predictor':' and Predictor'}`;
 for(const a of document.querySelectorAll('[data-sport-link]')){const on=a.dataset.sportLink===SPORT;a.classList.toggle('selected',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')}
 // On phones the sport bar scrolls; bring the current sport into view without moving the page.
 const bar=document.querySelector('.sportbar-inner'),cur=bar.querySelector('.selected');if(cur)bar.scrollLeft=cur.offsetLeft-(bar.clientWidth-cur.offsetWidth)/2;
 const text=(sel,v)=>{for(const n of document.querySelectorAll(sel))n.textContent=v};
 text('.js-sport',SP.name);text('.js-sport-lower',SP.name.toLowerCase());text('.js-field',FIELD);text('.js-cap',CAP);
 text('.js-capunit',`${CAP}-${SP.unit}`);text('.js-date',BASELINE_DATE);
 text('.js-teams',Object.keys(OFF).length);text('.js-games',SD.games.filter(g=>g[3]!==null).length.toLocaleString('en-US'));text('.js-divisions',DIVISIONS.length);
 el('capExample').textContent=FOOTBALL?'A 35–7 win is treated as +14; a 14–21 loss is −7.':SPORT==='volleyball'?'Results count in sets: a 3–0 match is +3 and a 3–2 match is +1.':'A 6–0 win is treated as +3; a 1–2 loss is −1.';
 el('headlineSub').textContent=FOOTBALL?'Use this tool to predict the power rankings after Week 8, the final week of the regular season, and see who makes each division\'s top-16 tournament field.'
  :`MIAA ratings with live scores from MIAA's scoreboard. Enter or predict the games still to be played and see who makes each division's top-32 tournament field.`;
 for(const n of document.querySelectorAll('.football-only'))n.hidden=!FOOTBALL;
 for(const n of document.querySelectorAll('.added-games-only'))n.hidden=FOOTBALL;
 el('heroPredictLabel').textContent=FOOTBALL?'Predict Week 8':'Add a game';
 el('weekJumpLabel').textContent=FOOTBALL?'Enter scores myself':'Predict my games';
 el('week8Tab').textContent=FOOTBALL?'Week 8':'Games';
 el('weekTitle').textContent=FOOTBALL?'Week 8 scores':'Games still to play';
 el('weekIntro').innerHTML=FOOTBALL?'Verified Thursday and Friday finals are already entered and locked. Enter remaining scores, or select <strong>Predict Week 8</strong> to estimate the rest.'
  :'Upcoming games come from MIAA\'s scoreboard. Type a score or select <strong>Predict all games</strong> to estimate them from ratings and common opponents, and add any game that\'s missing.';
 el('predictLabel').textContent=FOOTBALL?'Predict Week 8':'Predict all games';
 el('predictHelp').textContent=FOOTBALL?'Confirmed finals are locked for everyone. Only unplayed games can be predicted or edited.':SPORT==='volleyball'?'Volleyball scores are sets won: the winner has 3. Scores you type are never overwritten.':'Scores you type yourself are never overwritten by predictions.';
 el('introDate').textContent=`Official rankings as of ${BASELINE_DATE}`;
 el('introTitle').textContent=`Predict the final MIAA ${SP.name.toLowerCase()} power rankings`;
 el('introBody').innerHTML=FOOTBALL?'Week 8 is the last week before the tournament, and the top 16 in each division make the field. Choose how to fill in <span id="introCount">Week 8</span>.'
  :`The top 32 in each division make the tournament. The games still to be played come from MIAA's scoreboard; score them yourself or predict them, and add any that are missing.`;
 if(!FOOTBALL){const next=new Date(SD_DATE+'T12:00');next.setDate(next.getDate()+1);el('addDate').value=next.toISOString().slice(0,10);el('addDate').min=SD_DATE}
}

/* Admin: start a sync of MIAA's newest Arbiter export (api/sync.js runs a GitHub workflow). */
function initAdmin(){
 const d=el('admin'),status=el('adminStatus');let key='',timer=0;
 const show=(text,tone)=>{status.textContent=text;status.dataset.tone=tone||''};
 const releases=()=>{const rows=[['Football',DATA.date]];if(typeof FALL_DATA!=='undefined')for(const [slug,s] of Object.entries(FALL_DATA.sports))rows.push([SPORTS[slug]?.name||s.title,s.date||FALL_DATA.date]);
  el('adminData').innerHTML=rows.map(([n,dt])=>`<li><span>${esc(n)}</span><b>${shortDate(dt)}</b></li>`).join('')};
 const poll=async()=>{
  try{const r=await fetch('/api/sync',{headers:{'x-admin-key':key}});const j=await r.json();
   if(!r.ok){show(j.error||'Could not read sync status.','bad');return}
   if(j.status==='completed'){show(j.conclusion==='success'?'Sync finished. If there were new results, the site redeploys in about a minute; reload then.':'Sync failed, and nothing was published. Open the run log for details.',j.conclusion==='success'?'good':'bad');
    el('adminLog').href=j.url;el('adminLog').hidden=false;el('adminRun').disabled=false;return}
   show(j.status==='queued'?'Sync queued on GitHub…':'Downloading and checking MIAA\'s newest PDFs…');el('adminLog').href=j.url||'#';el('adminLog').hidden=!j.url;
  }catch{show('Lost contact with the sync service. Try again.','bad');el('adminRun').disabled=false;return}
  timer=setTimeout(poll,8000);
 };
 el('adminOpen').addEventListener('click',()=>{releases();d.showModal()});
 el('adminClose').addEventListener('click',()=>d.close());
 el('adminForm').addEventListener('submit',async e=>{
  e.preventDefault();key=el('adminKey').value;clearTimeout(timer);el('adminLog').hidden=true;
  if(!key){show('Enter the admin key.','bad');return}
  el('adminRun').disabled=true;show('Starting sync…');
  try{const r=await fetch('/api/sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key})});
   const j=r.headers.get('content-type')?.includes('json')?await r.json():{};
   if(r.status===404||r.status===501){show('Sync runs on the published site only, not on a local preview.','bad');el('adminRun').disabled=false;return}
   if(!r.ok){show(j.error||`Sync could not start (${r.status}).`,'bad');el('adminRun').disabled=false;return}
   show('Sync started. Checking progress…');timer=setTimeout(poll,6000);
  }catch{show('Could not reach the sync service.','bad');el('adminRun').disabled=false}
 });
 d.addEventListener('close',()=>{clearTimeout(timer);el('adminKey').value='';key=''});
}

/* "Add to home screen": pwa-install handles each platform's install flow (Chrome prompt, iOS share-sheet steps).
   The buttons stay hidden once the site is already running as an installed app. */
function initInstall(){
 const installed=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const prompt=document.querySelector('pwa-install');
 for(const b of document.querySelectorAll('.install-only')){
  b.hidden=installed||!prompt;
  b.addEventListener('click',()=>{if(typeof prompt?.showDialog==='function')prompt.showDialog(true);else toast('Use your browser menu to add this site to your home screen.')});
 }
}
// Offer the install prompt on its own once a week at most: after the first-visit intro closes,
// or shortly after load for returning visitors. Never inside the installed app or over another dialog.
const INSTALL_PROMPTED='miaa-install-prompted';
function scheduleInstallPrompt(){
 const prompt=document.querySelector('pwa-install');
 if(!prompt||matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)return;
 let last=0;try{last=Number(localStorage.getItem(INSTALL_PROMPTED))||0}catch{}
 if(Date.now()-last<7*864e5)return;
 const show=()=>{if(document.querySelector('dialog[open]')||typeof prompt.showDialog!=='function')return;
  prompt.showDialog(true);try{localStorage.setItem(INSTALL_PROMPTED,String(Date.now()))}catch{}};
 if(el('intro').open)el('intro').addEventListener('close',()=>setTimeout(show,900),{once:true});
 else setTimeout(show,2000);
}
function init(){applySportCopy();el('teamsList').innerHTML=TEAMS.map(t=>`<option value="${esc(t)}"></option>`).join('');renderRankings();renderEdits();el('teamSearch').value=selectedTeam;el('teamSelect').innerHTML=Object.keys(DIV).sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${esc(t)}">${esc(t)} (D${DIV[t]})</option>`).join('');el('teamSelect').value=selectedTeam;
 el('bracketDivs').addEventListener('click',e=>{const b=e.target.closest('[data-bdiv]');if(b){bracketDiv=Number(b.dataset.bdiv);renderBracket()}});
 for(const id of ['bracket','bubble','heroLine'])el(id).addEventListener('click',e=>{const t=e.target.closest('[data-team]');if(t)showTeam(t.dataset.team)});
 document.querySelector('.navigation').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)switchPage(b.dataset.page)});
 el('divisions').addEventListener('click',e=>{const b=e.target.closest('[data-div]');if(b){selectedDiv=Number(b.dataset.div);weekDiv=selectedDiv;renderRankings();renderFixtures()}});el('rankingSearch').oninput=()=>renderRankings();el('resetSearch').onclick=()=>{el('rankingSearch').value='';renderRankings()};
 el('rankingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)showTeam(b.dataset.team)});
 el('mobileRankingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)showTeam(b.dataset.team)});
 el('resetAll').onclick=reset;
 el('editList').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');const load=e.target.closest('[data-load]');if(remove){if(LOCKED_KEYS.has(remove.dataset.remove))return;edits=edits.filter(g=>pairKey(g)!==remove.dataset.remove);predictedKeys.delete(remove.dataset.remove);save();toast('Scenario removed')}else if(load)focusFixture(load.dataset.load)});
 el('openTeam').onclick=()=>{const t=el('teamSearch').value.trim();if(!TEAMS.includes(t)){toast('Choose a listed team');return}showTeam(t)};el('teamSelect').addEventListener('change',e=>{if(TEAMS.includes(e.target.value))showTeam(e.target.value)});el('teamSearch').addEventListener('change',e=>{const t=e.target.value.trim();if(TEAMS.includes(t))showTeam(t)});el('teamSearch').addEventListener('keydown',e=>{if(e.key==='Enter')el('openTeam').click()});
 el('teamDetails').addEventListener('click',e=>{if(e.target.closest('#returnRankings'))switchPage('rankings');const t=e.target.closest('[data-team]');if(t)showTeam(t.dataset.team)});
 initAdmin();
 initInstall();
}

function initFixtures(){
 // Hero buttons: football predicts Week 8 / enters scores; other sports add a game / predict the added games.
 el('heroPredict').addEventListener('click',()=>FOOTBALL?predictAll():jumpToWeek8());
 el('weekJump').addEventListener('click',()=>{if(FOOTBALL){jumpToWeek8();return}if(predictAll())scrollToEl(document.querySelector('.wrap'))});
 el('heroReset').addEventListener('click',reset);
 el('openIntro').addEventListener('click',openIntro);
 el('intro').addEventListener('close',()=>{try{localStorage.setItem(INTRO_KEY,'1')}catch{}});
 // Close on a backdrop click only: the press and release must both land outside the dialog box,
 // so scrollbar drags and text selections that end on the dialog don't dismiss it.
 for(const d of [el('intro'),el('admin')]){
  const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
  let pressedOutside=false;
  d.addEventListener('pointerdown',e=>{pressedOutside=e.target===d&&outside(e)});
  d.addEventListener('click',e=>{if(e.target===d&&pressedOutside&&outside(e))d.close()});
 }
 el('intro').addEventListener('click',e=>{
   const b=e.target.closest('[data-intro]');if(!b)return;el('intro').close();
   if(b.dataset.intro==='predict'){if(activePage!=='rankings')switchPage('rankings');document.querySelector('[data-side-tab=week8]').click();if(predictAll())scrollToEl(document.querySelector('.wrap'))}
   else if(b.dataset.intro==='enter'||b.dataset.intro==='add')jumpToWeek8();
   else if(b.dataset.intro==='bracket')switchPage('bracket');
 });
 let seen=false;try{seen=localStorage.getItem(INTRO_KEY)==='1'}catch{}
 if(!seen&&!edits.length)openIntro();
 scheduleInstallPrompt();
 const tabs=document.querySelector('.sideTabs');tabs.addEventListener('click',e=>{const b=e.target.closest('[data-side-tab]');if(!b)return;const name=b.dataset.sideTab;tabs.querySelectorAll('.sideTab').forEach(x=>x.classList.toggle('selected',x===b));for(const n of ['week8','changes'])el(n+'View').classList.toggle('hidden',name!==n)});
 el('predictWeek8').addEventListener('click',predictAll);el('clearPredictions').addEventListener('click',clearAllPredictions);
 el('weekSearch').addEventListener('input',renderFixtures);
 el('addGame').addEventListener('submit',e=>{e.preventDefault();addFixture()});
 el('weekFilters').addEventListener('click',e=>{const btn=e.target.closest('[data-wdiv]');if(!btn)return;weekDiv=Number(btn.dataset.wdiv);selectedDiv=weekDiv;renderRankings();renderFixtures()});
 el('fixtureList').addEventListener('input',e=>{
   const inp=e.target.closest('.fixture-score');if(!inp)return;
   let card=inp.closest('[data-fixture]');if(isLocked(card.dataset.fixture))return;let a=card.querySelector('[data-side=a]').value.trim(),b=card.querySelector('[data-side=b]').value.trim();
   const st=card.querySelector('.fixtureStatus'),warn=t=>{st.textContent=t;st.classList.add('warn')};
   if((a&&!/^\d{1,3}$/.test(a))||(b&&!/^\d{1,3}$/.test(b))){warn('Numbers only');return}
   if(!a||!b){warn('Enter both scores');return}
   const problem=scoreProblem(Number(a),Number(b));if(problem){warn(problem);return}
   const r=schedule().find(r=>fixtureKey(r)===card.dataset.fixture);if(!r)return;
   const g=[r[0],r[1],r[2],Number(a),Number(b),0];
   const prev=edits.find(x=>pairKey(x)===card.dataset.fixture);if(prev&&prev[3]===g[3]&&prev[4]===g[4])return;
   edits=edits.filter(x=>pairKey(x)!==card.dataset.fixture);edits.push(g);predictedKeys.delete(card.dataset.fixture);save();
 });
 el('fixtureList').addEventListener('click',e=>{
   const teamButton=e.target.closest('.fixture-team-link');
   if(teamButton){showTeam(teamButton.dataset.team);return;}
   const maxBtn=e.target.closest('[data-max]');
   if(maxBtn){const card=maxBtn.closest('[data-fixture]'),r=schedule().find(x=>fixtureKey(x)===card.dataset.fixture);if(!r||isLocked(card.dataset.fixture))return;
     const scoreA=maxBtn.dataset.max==='a'?CAP:0,scoreB=maxBtn.dataset.max==='b'?CAP:0;
     edits=edits.filter(g=>pairKey(g)!==card.dataset.fixture);
     edits.push([r[0],r[1],r[2],scoreA,scoreB,0]);predictedKeys.delete(card.dataset.fixture);
     card.querySelector('[data-side=a]').value=scoreA;card.querySelector('[data-side=b]').value=scoreB;save();return;
   }
   const btn=e.target.closest('[data-clear]');if(!btn||(isLocked(btn.dataset.clear)&&!isAddedFixture(btn.dataset.clear)))return;
   const k=btn.dataset.clear;
   edits=edits.filter(g=>pairKey(g)!==k);predictedKeys.delete(k);
   addedFixtures=addedFixtures.filter(f=>fixtureKey(f)!==k);
   save();renderFixtures();
 });
 // Score inputs keep focus while the calculated records and ratings refresh.
 renderFixtures();
}

init();
initFixtures();
