

'use strict';
const KEY='miaa-scenario-lab-2026-oct27-v1';
const DIV=DATA.divisions, OFF=DATA.official;  // MIAA's published Oct 27 ratings, all divisions
const TEAMS=[...new Set(DATA.games.flatMap(g=>[g[1],g[2]]))].sort((a,b)=>a.localeCompare(b));
const IND=Object.fromEntries(TEAMS.map((t,i)=>[t,i]));
const divTeams=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,Object.keys(DIV).filter(x=>DIV[x]===i+1)]));
// Results played Thursday, October 29, 2026, confirmed from published score reports.
// Shared by all visitors, unlike locally saved what-if scenarios.
// These are POST-October 27 results; do not fold them into DATA.games or the official baseline.
const PUBLISHED_FINALS=[["2026-10-29","Lee","Ware",46,14,0],["2026-10-29","Hoosac Valley","Holyoke",8,27,0],["2026-10-29","Quaboag Regional","Smith Vo-Tech",0,36,0],["2026-10-29","Lynn English","Medford",48,21,0],["2026-10-29","Chelsea","Minuteman Regional",23,22,0],["2026-10-29","Upper Cape Cod RVT","South Shore Vo-Tech",8,45,0],["2026-10-29","Winthrop","Salem",42,22,0],["2026-10-29","Cathedral","Archbishop Williams",26,47,0],["2026-10-29","Haverhill","Central Catholic",36,43,0],["2026-10-29","Quincy","Pembroke",41,14,0],["2026-10-29","Blue Hills RVT","Tri-County RVT",30,7,0],["2026-10-29","Milton","Weymouth",27,20,0],["2026-10-29","McCann Tech","Belchertown",0,54,0],["2026-10-29","Springfield Int'l Charter","HS of Commerce",49,6,0]];
const LOCKED_KEYS=new Set(PUBLISHED_FINALS.map(pairKey));
const LOCKED_MATCHUPS=new Set(PUBLISHED_FINALS.map(g=>[g[1],g[2]].sort().join('|')));
function isPublishedWeek8Game(g){return g[0]>='2026-10-27'&&g[0]<='2026-10-31'&&LOCKED_MATCHUPS.has([g[1],g[2]].sort().join('|'))}
function isPublishedWeek8Key(k){const parts=k.split('|');return parts.length===3&&parts[0]>='2026-10-27'&&parts[0]<='2026-10-31'&&LOCKED_MATCHUPS.has(parts.slice(1).join('|'))}
const source=new Map(DATA.games.map(g=>[pairKey(g),g]));
// Remove outdated unplayed Friday placeholders for games completed Thursday.
for(const [k,g] of source)if(g[3]===null&&g[4]===null&&isPublishedWeek8Game(g))source.delete(k);
for(const g of PUBLISHED_FINALS)source.set(pairKey(g),g);
let edits=[];
try{const s=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(s))edits=s.filter(g=>Array.isArray(g)&&g.length===6&&TEAMS.includes(g[1])&&TEAMS.includes(g[2])&&!isPublishedWeek8Game(g));}catch{}
let selectedDiv=1, activePage='rankings', selectedTeam=Object.keys(DIV).sort((a,b)=>a.localeCompare(b))[0], weekDiv=1;
function pairKey(g){return g[0]+'|'+[g[1],g[2]].sort().join('|')}
function validScore(n){return n===null||(Number.isInteger(n)&&n>=0&&n<=999)}
function fmt(n,d=4){return Number.isFinite(n)?n.toFixed(d):'—'}
function signed(n,d=4){return Number.isFinite(n)?(n>0?'+':'')+n.toFixed(d):'—'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const el=id=>document.getElementById(id);
let alertTimer;
function toast(s){const x=el('alert');x.textContent=s;x.classList.add('show');clearTimeout(alertTimer);alertTimer=setTimeout(()=>x.classList.remove('show'),3000)}
function records(){const m=new Map(source);for(const g of edits)if(!isPublishedWeek8Game(g))m.set(pairKey(g),g);return [...m.values()]}
function compute(games){const N=TEAMS.length, degrees=new Float64Array(N), sums=new Float64Array(N), sumsAll=new Float64Array(N), countAll=new Int32Array(N), forfeitLosses=new Int32Array(N), ws=new Int32Array(N),ls=new Int32Array(N),ties=new Int32Array(N),neighbors=Array.from({length:N},()=>[]),played=[];
for(const g of games){const [date,a,b,sa,sb,f]=g;if(sa===null||sb===null||!validScore(sa)||!validScore(sb))continue;const ai=IND[a],bi=IND[b];if(ai===undefined||bi===undefined)continue;const m=Math.max(-14,Math.min(14,sa-sb));countAll[ai]++;countAll[bi]++;sumsAll[ai]+=m;sumsAll[bi]-=m;if(sa>sb){ws[ai]++;ls[bi]++}else if(sa<sb){ws[bi]++;ls[ai]++}else{ties[ai]++;ties[bi]++}played.push(g);if(f){if(sa<sb)forfeitLosses[ai]++;else if(sb<sa)forfeitLosses[bi]++;}
if(!f){degrees[ai]++;degrees[bi]++;sums[ai]+=m;sums[bi]-=m;neighbors[ai].push(bi);neighbors[bi].push(ai)}}
const ratings=new Float64Array(N),next=new Float64Array(N),mean=new Float64Array(N);let totalDegree=0;for(let i=0;i<N;i++){totalDegree+=degrees[i];mean[i]=degrees[i]>0?sums[i]/degrees[i]:0}
let iter=0,maxDelta=0;for(iter=0;iter<1000;iter++){let total=0;for(let i=0;i<N;i++){if(!degrees[i]){next[i]=0;continue}let opp=0;for(let k=0;k<neighbors[i].length;k++)opp+=ratings[neighbors[i][k]];next[i]=.35*ratings[i]+.65*(mean[i]+opp/degrees[i]);total+=next[i]*degrees[i]}
const shift=total/totalDegree;maxDelta=0;for(let i=0;i<N;i++){if(degrees[i])next[i]-=shift;maxDelta=Math.max(maxDelta,Math.abs(next[i]-ratings[i]));ratings[i]=next[i]}if(maxDelta<0.0001)break}
const out={};for(let i=0;i<N;i++){const own=countAll[i]?sumsAll[i]/countAll[i]:0;const opp=ratings[i]-mean[i];const adjOwn=degrees[i]?mean[i]:own;const adjusted=adjOwn+opp;out[TEAMS[i]]={team:TEAMS[i],division:DIV[TEAMS[i]]||null,w:ws[i],l:ls[i],ties:ties[i],gp:countAll[i],mov:own,opp,raw:own+opp,adjusted,rating:own+opp,nonforfeit:degrees[i],forfeitLosses:forfeitLosses[i]}}
return {teams:out,iter,played:played.length,convergence:maxDelta}}

// MIAA's published October 27 ratings reflect only the results Arbiter had at 4 a.m.
// Three October 23 games were confirmed later. Include them in current records(),
// but do NOT retroactively include them in the model we compare to the Oct 27 baseline.
const LATE_RESULTS=new Set([
  '2026-10-23|Lee|South Hadley',
  '2026-10-23|Bishop Fenwick|Cathedral',
  '2026-10-23|KIPP Academy Lynn Coll.|Nashoba Valley Tech'
]);
const OFFICIAL_BASE_GAMES=DATA.games.filter(g=>!LATE_RESULTS.has(pairKey(g)));
const BASE=compute(OFFICIAL_BASE_GAMES);
const offset=Object.keys(OFF).reduce((s,t)=>s+OFF[t][1]-BASE.teams[t].raw,0)/Object.keys(OFF).length;
function derive(m){for(const [t,v] of Object.entries(m.teams)){const b=BASE.teams[t];const anchor=OFF[t]?OFF[t][1]:b.raw+offset;v.rating=anchor+(v.raw-b.raw);v.change=v.rating-anchor}return m}
let MODEL=derive(compute(records()));
// October 27 ranks, used to show how far a team moves under the user's scenario.
const BASELINE=derive(compute(OFFICIAL_BASE_GAMES)),byRating=(a,b)=>b.rating-a.rating||a.team.localeCompare(b.team);
const baseDivRank={};
for(let d=1;d<=8;d++)divTeams[d].map(t=>BASELINE.teams[t]).sort(byRating).forEach((v,i)=>baseDivRank[v.team]=i+1);
function rec(r){return `${r.w}–${r.l}${r.ties?'–'+r.ties:''}`}
function moveTag(now,before){const d=before-now;return d?`<span class="move ${d>0?'up':'down'}" title="${d>0?'Up':'Down'} ${Math.abs(d)} since Oct 27">${Math.abs(d)}</span>`:''}
function deltaTag(c){return Math.abs(c)<0.00001?'<span class="delta-none">—</span>':`<span class="delta ${c>0?'pos':'neg'}">${signed(c)}</span>`}
function standings(d){return divTeams[d].map(t=>MODEL.teams[t]).sort((a,b)=>b.rating-a.rating||a.team.localeCompare(b.team)).map((v,i)=>({...v,rank:i+1,eligible:v.w>=3&&v.gp-v.forfeitLosses>=7}))}
function recalc(){MODEL=derive(compute(records()));renderRankings(true);renderEdits();if(activePage==='team')renderTeam();if(activePage==='bracket')renderBracket();updateWeek8States();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(edits));localStorage.setItem(PRED_STORE,JSON.stringify([...predictedKeys]))}catch{}recalc()}
function renderDivisionTabs(){el('divisions').innerHTML=[1,2,3,4,5,6,7,8].map(d=>`<button type="button" class="division ${selectedDiv===d?'selected':''}" data-div="${d}" aria-pressed="${selectedDiv===d}">D${d}</button>`).join('')}

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
function renderRankings(animate){if(animate===true){flipRows([el('rankingsBody'),el('mobileRankingsBody')],()=>renderRankings());return}renderDivisionTabs();let rows=standings(selectedDiv);const q=el('rankingSearch').value.trim().toLowerCase();if(q)rows=rows.filter(t=>t.team.toLowerCase().includes(q));
 const showCut=!q;
 el('tableMeta').textContent=`${rows.length} ${rows.length===1?'team':'teams'} in Division ${selectedDiv}`;
 el('rankingsBody').innerHTML=rows.length?rows.map(r=>{const zone=r.rank<=16?'playoff-zone':'',move=moveTag(r.rank,baseDivRank[r.team]);
  return `${showCut&&r.rank===17?'<tr class="cutrow"><td colspan="7"><div class="cutline-label"><span>Playoff line</span></div></td></tr>':''}<tr class="${zone}" data-row="${esc(r.team)}" data-rating="${r.rating.toFixed(4)}"><td class="col-rank"><span class="rank">${r.rank}</span>${move}</td><td class="col-team"><button type="button" class="team-button" data-team="${esc(r.team)}"><span class="team-label"><span class="team-name">${esc(r.team)}</span></span></button></td><td class="col-rec">${rec(r)}</td><td class="num">${signed(r.mov)}</td><td class="num">${signed(r.opp)}</td><td class="num col-rating">${signed(r.rating)}</td><td class="num">${deltaTag(r.change)}</td></tr>`}).join(''):'<tr><td colspan="7" class="empty">No teams match your search.</td></tr>';
 el('mobileRankingsBody').innerHTML=rows.length?rows.map(r=>{const zone=r.rank<=16?'playoff-zone':'',move=moveTag(r.rank,baseDivRank[r.team]);
  return `${showCut&&r.rank===17?'<div class="mcut"><span>Playoff line</span></div>':''}<div class="mrow ${zone}" data-row="${esc(r.team)}" data-rating="${r.rating.toFixed(4)}"><span class="mrank"><span class="rank">${r.rank}</span>${move}</span><button type="button" class="mteam" data-team="${esc(r.team)}"><span class="team-label"><span class="team-name">${esc(r.team)}</span><span class="team-sub"><span>${rec(r)}</span><span>Margin ${signed(r.mov,1)}</span><span>Opp ${signed(r.opp,1)}</span></span></span></button><span class="mrating"><b>${signed(r.rating)}</b>${deltaTag(r.change)}</span></div>`}).join(''):'<div class="empty">No teams match your search.</div>';
 renderHeroLine();
 
 el('resetSearch').classList.toggle('hidden',!q);
 el('tableFootText').textContent='Teams below the playoff line are outside the top 16. Teams also need 3 wins and 7 games.';
 const scored=WEEK8.filter(r=>{const g=wkScore(r);return g&&g[3]!==null&&g[4]!==null}).length;
 el('scenarioBadge').classList.toggle('is-active',edits.length>0);el('scenarioBadge').innerHTML=edits.length?`<strong>Week 8: ${LOCKED_KEYS.size} locked finals + your scenarios (${scored} of ${WEEK8.length} scored)</strong>`:`<strong>🔒 ${LOCKED_KEYS.size} Thursday finals applied statewide</strong>`;el('heroReset').classList.toggle('hidden',!edits.length);
 el('heroDate').textContent=edits.length?'Projected Week 8 rankings':`Projections with Oct 29 finals (baseline ${BASELINE_DATE})`;
}
// Hero card: the 16th and 17th teams on either side of the line in the chosen division.
function renderHeroLine(){
 const lines=[selectedDiv].map(d=>{const s=standings(d);return {d,a:s[15],b:s[16]}}).filter(x=>x.a&&x.b).map(x=>({...x,gap:x.a.rating-x.b.rating}));
 if(!lines.length){el('heroLine').innerHTML='';return}
 const t=lines.reduce((m,x)=>x.gap<m.gap?x:m),row=(r,n,cls)=>`<button type="button" class="hl-row${cls}" data-team="${esc(r.team)}"><span class="hl-rank">${n}</span><span class="hl-name">${esc(r.team)}</span><span class="hl-rate">${signed(r.rating,2)}</span></button>`;
 el('heroLine').innerHTML=`<p class="hl-title">The line in Division ${t.d}</p>${row(t.a,16,'')}<div class="hl-chalk" aria-hidden="true"></div>${row(t.b,17,' is-out')}<p class="hl-gap">${t.gap.toFixed(2)} rating points apart</p>`;
}
function renderEdits(){el('editCount').textContent=`(${edits.length})`;el('editBadge').textContent=edits.length;el('editBadge').classList.toggle('on',edits.length>0);el('editSub').textContent=edits.length?'Your scenarios are saved in this browser only':'Thursday finals are included for everyone';el('editList').innerHTML=edits.length?edits.slice().sort((a,b)=>b[0].localeCompare(a[0])).map(g=>`<div class="editrow"><div class="editrow-main"><span class="editrow-teams">${esc(g[1])}<span class="score">${g[3]}–${g[4]}</span>${esc(g[2])}</span><small>${new Date(g[0]+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}${predictedKeys.has(pairKey(g))?' <span class="tag-pred">Prediction</span>':''}</small></div><div class="editrow-actions">${WEEK8_KEYS.has(pairKey(g))?`<button type="button" class="bttn sml ghost" data-load="${esc(pairKey(g))}">Edit</button>`:''}<button type="button" class="bttn sml ghost danger" data-remove="${esc(pairKey(g))}" aria-label="Remove">×</button></div></div>`).join(''):'<div class="edit-empty">No scenario scores yet.<br>Enter a Week 8 score or test a custom game.</div>'}
function showTeam(name){selectedTeam=name;el('teamSearch').value=name;el('teamSelect').value=name;switchPage('team')}
function renderTeam(){const x=MODEL.teams[selectedTeam];if(!x){el('teamDetails').innerHTML='<div class="empty">Choose a team to view its schedule.</div>';return}const myGames=records().filter(g=>g[1]===selectedTeam||g[2]===selectedTeam).sort((a,b)=>a[0].localeCompare(b[0]));const row=x.division?standings(x.division).find(r=>r.team===selectedTeam):null,curRank=row?row.rank:null;
 const editKeys=new Set(edits.map(pairKey)),cls=n=>n>0.00001?'pos':n<-0.00001?'neg':'';
 el('teamDetails').innerHTML=`<div class="details"><div class="team-hero"><div class="team-id"><div><p class="eyebrow">${x.division?`Division ${x.division}`:'Out-of-state opponent'}${curRank?`, ranked ${curRank} of ${divTeams[x.division].length}`:''}</p><h2>${esc(x.team)}</h2><div class="team-facts"><span class="chip"><strong>${rec(x)}</strong></span><span class="chip">${x.gp} games</span>${row?`<span class="chip ${curRank<=16?'ok':'no'}">${curRank<=16?'Inside top 16':'Outside top 16'}</span>`:''}</div></div></div><button type="button" class="bttn" id="returnRankings">Back to rankings</button></div>
 <div class="metrics"><div class="metric"><small>Power rating</small><b>${signed(x.rating,2)}</b></div><div class="metric"><small>Avg capped margin</small><b>${signed(x.mov,2)}</b></div><div class="metric"><small>Opponent rating</small><b>${signed(x.opp,2)}</b></div><div class="metric"><small>Scenario change</small><b class="${cls(x.change)}">${signed(x.change,2)}</b></div></div>
 <div class="section-head"><h3>Schedule &amp; results</h3><span>Margins capped at ±14</span></div><div class="table-scroll"><table class="gameTable"><thead><tr><th>Date</th><th>Opponent</th><th>Result</th><th class="num">Margin</th><th class="num">Opp rating</th></tr></thead><tbody>${myGames.map(g=>{const own=g[1]===selectedTeam,opp=own?g[2]:g[1],my=own?g[3]:g[4],their=own?g[4]:g[3],k=pairKey(g),wl=my===null?'u':my>their?'w':my<their?'l':'t',margin=my===null?'—':signed(Math.max(-14,Math.min(14,my-their)),0);
  const tag=LOCKED_KEYS.has(k)?'<span class="gtag locked">🔒 Final</span>':g[5]?'<span class="gtag ff">Forfeit</span>':editKeys.has(k)?(predictedKeys.has(k)?'<span class="gtag pred">Prediction</span>':'<span class="gtag scen">Scenario</span>'):'';
  return `<tr><td class="date">${new Date(g[0]+'T12:00').toLocaleDateString('en-US',{month:'short',day:'numeric'})}</td><td><button type="button" class="team-button" data-team="${esc(opp)}"><span class="team-name">${esc(opp)}</span></button></td><td><span class="result"><span class="wl ${wl}">${wl==='u'?'–':wl.toUpperCase()}</span>${my===null?'Unplayed':my+'–'+their}</span>${tag}</td><td class="num">${margin}</td><td class="num">${signed(MODEL.teams[opp]?.rating,2)}</td></tr>`}).join('')}</tbody></table></div></div>`;}
function switchPage(page){activePage=page;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('hidden',e.id!==page+'Page'));document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('selected',e.dataset.page===page));if(page==='team')renderTeam();if(page==='bracket'){bracketDiv=selectedDiv;renderBracket()}window.scrollTo(0,0)}
function reset(){if(edits.length&&!confirm('Remove all scenario changes?'))return;edits=[];predictedKeys.clear();save();toast('Scenarios cleared; October 29 final scores remain locked')}
/* Projected brackets: top 16 by rating in each division, standard 1–16 seeding.
   Later rounds advance the higher seed, which is also the higher-rated team. */
let bracketDiv=1;
const ROUND_OF_16=[[1,16],[8,9],[5,12],[4,13],[6,11],[3,14],[7,10],[2,15]],ROUND_NAMES=['Round of 16','Quarterfinals','Semifinals','State final'];
function renderBracket(){
 el('bracketDivs').innerHTML=[1,2,3,4,5,6,7,8].map(d=>`<button type="button" class="${bracketDiv===d?'selected':''}" data-bdiv="${d}" aria-pressed="${bracketDiv===d}">D${d}</button>`).join('');
 const rows=standings(bracketDiv),seed=Object.fromEntries(rows.slice(0,16).map(r=>[r.rank,r]));
 const slot=(s,fav,proj)=>{const r=seed[s];if(!r)return `<div class="slot is-empty"><span class="seed">${s}</span><span class="slot-name">No team</span></div>`;
  const warn=r.eligible?'':`<span class="slot-warn" title="${r.w<3?'Fewer than 3 wins':'Fewer than 7 games'} so far">!</span>`;
  return `<button type="button" class="slot${fav?' is-fav':''}${proj?' is-proj':''}" data-team="${esc(r.team)}"><span class="seed">${s}</span><span class="slot-name">${esc(r.team)}</span>${warn}<span class="slot-rate">${signed(r.rating,2)}</span></button>`};
 let round=ROUND_OF_16;const rounds=[round];
 while(round.length>1){round=Array.from({length:round.length/2},(_,i)=>[Math.min(...round[2*i]),Math.min(...round[2*i+1])].sort((a,b)=>a-b));rounds.push(round)}
 el('bracket').innerHTML=rounds.map((rd,i)=>{const pairs=rd.length>1?Array.from({length:rd.length/2},(_,k)=>rd.slice(2*k,2*k+2)):[rd];
  return `<section class="round"><h3>${ROUND_NAMES[i]}</h3><div class="round-body">${pairs.map(p=>`<div class="pair${p.length===1?' is-single':''}">${p.map(([a,b])=>`<div class="match-wrap"><div class="match">${slot(a,true,i>0)}${slot(b,false,i>0)}</div></div>`).join('')}</div>`).join('')}</div></section>`}).join('');
 const r16=rows[15],r17=rows[16];
 const item=(r,gap)=>`<li><span class="bubble-rank">${r.rank}</span><button type="button" class="team-button" data-team="${esc(r.team)}"><span class="team-name">${esc(r.team)}</span></button><span class="bubble-gap">${gap}</span></li>`;
 const lastIn=r17?rows.slice(12,16).map(r=>item(r,'+'+(r.rating-r17.rating).toFixed(2))).join(''):'',firstOut=r16?rows.slice(16,20).map(r=>item(r,'−'+(r16.rating-r.rating).toFixed(2))).join(''):'';
 const moved=rows.filter(r=>(r.rank<=16)!==(baseDivRank[r.team]<=16));
 el('bubble').innerHTML=`<div class="bubble-col"><h3>Last four in</h3><p>Rating ahead of the 17th team</p><ol>${lastIn}</ol></div><div class="bubble-col"><h3>First four out</h3><p>Rating behind the 16th team</p><ol>${firstOut}</ol></div>${moved.length?`<div class="bubble-col bubble-moves"><h3>Changed by your scores</h3><p>Compared with the October 27 field</p><ul>${moved.map(r=>`<li><button type="button" class="team-button" data-team="${esc(r.team)}"><span class="team-name">${esc(r.team)}</span></button><span class="move-label ${r.rank<=16?'is-in':'is-out'}">${r.rank<=16?'Now in':'Now out'}, was ${baseDivRank[r.team]}</span></li>`).join('')}</ul></div>`:''}`;
 el('bracketSub').textContent=`Division ${bracketDiv} has ${rows.length} teams and the top 16 make the tournament. ${edits.length?`This field includes your ${edits.length} entered ${edits.length===1?'score':'scores'}.`:'This field includes confirmed October 29 finals, projected from October 27 official ratings.'}`;
 
}
function init(){el('teamsList').innerHTML=TEAMS.map(t=>`<option value="${esc(t)}"></option>`).join('');renderRankings();renderEdits();el('teamSearch').value=selectedTeam;el('teamSelect').innerHTML=Object.keys(DIV).sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${esc(t)}">${esc(t)} (D${DIV[t]})</option>`).join('');el('teamSelect').value=selectedTeam;
 el('bracketDivs').addEventListener('click',e=>{const b=e.target.closest('[data-bdiv]');if(b){bracketDiv=Number(b.dataset.bdiv);renderBracket()}});
 for(const id of ['bracket','bubble','heroLine'])el(id).addEventListener('click',e=>{const t=e.target.closest('[data-team]');if(t)showTeam(t.dataset.team)});
 document.querySelector('.navigation').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)switchPage(b.dataset.page)});
 el('divisions').addEventListener('click',e=>{const b=e.target.closest('[data-div]');if(b){selectedDiv=Number(b.dataset.div);weekDiv=selectedDiv;renderRankings();renderWeek8()}});el('rankingSearch').oninput=()=>renderRankings();el('resetSearch').onclick=()=>{el('rankingSearch').value='';renderRankings()};
 el('rankingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)showTeam(b.dataset.team)});
 el('mobileRankingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)showTeam(b.dataset.team)});
 el('resetAll').onclick=reset;
 el('editList').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');const load=e.target.closest('[data-load]');if(remove){if(LOCKED_KEYS.has(remove.dataset.remove))return;edits=edits.filter(g=>pairKey(g)!==remove.dataset.remove);predictedKeys.delete(remove.dataset.remove);save();toast('Scenario removed')}else if(load)focusFixture(load.dataset.load)});
 el('openTeam').onclick=()=>{const t=el('teamSearch').value.trim();if(!TEAMS.includes(t)){toast('Choose a listed team');return}showTeam(t)};el('teamSelect').addEventListener('change',e=>{if(TEAMS.includes(e.target.value))showTeam(e.target.value)});el('teamSearch').addEventListener('change',e=>{const t=e.target.value.trim();if(TEAMS.includes(t))showTeam(t)});el('teamSearch').addEventListener('keydown',e=>{if(e.key==='Enter')el('openTeam').click()});
 el('teamDetails').addEventListener('click',e=>{if(e.target.closest('#returnRankings'))switchPage('rankings');const t=e.target.closest('[data-team]');if(t)showTeam(t.dataset.team)});
}

const WEEK8=[["2026-10-29","Lee","Ware","18:00"],["2026-10-29","Hoosac Valley","Holyoke","18:00"],["2026-10-29","Quaboag Regional","Smith Vo-Tech","18:00"],["2026-10-29","Lynn English","Medford","18:00"],["2026-10-29","Chelsea","Minuteman Regional","18:00"],["2026-10-29","Upper Cape Cod RVT","South Shore Vo-Tech","18:00"],["2026-10-29","Winthrop","Salem","18:30"],["2026-10-29","Cathedral","Archbishop Williams","19:00"],["2026-10-29","Haverhill","Central Catholic","19:00"],["2026-10-29","Quincy","Pembroke","19:00"],["2026-10-29","Blue Hills RVT","Tri-County RVT","19:00"],["2026-10-29","Milton","Weymouth","19:00"],["2026-10-30","O'Bryant","English High","16:00"],["2026-10-30","Everett","Lynn Classical","17:00"],["2026-10-30","Leominster","Grafton","18:00"],["2026-10-30","Northeast Metro RVT","Greater Lowell Tech","18:00"],["2026-10-30","Winchester","Belmont","18:00"],["2026-10-30","Shawsheen Valley Tech","Greater Lawrence Tech","18:00"],["2026-10-30","Putnam Vo-Tech","Taconic","18:00"],["2026-10-30","Norwell","Randolph","18:00"],["2026-10-29","Springfield Int'l Charter","HS of Commerce","18:00"],["2026-10-30","Lexington","Arlington","18:00"],["2026-10-30","Dennis-Yarmouth","Falmouth","18:00"],["2026-10-30","Malden Catholic","Xaverian Brothers","18:00"],["2026-10-30","East Boston","Tech Boston Academy","18:00"],["2026-10-30","North High","Worcester Tech","18:00"],["2026-10-30","Monument Mountain","Pathfinder RVT","18:00"],["2026-10-30","Bishop Feehan","La Salle Academy (R.I.)","18:00"],["2026-10-30","Saint John's","Boston College High","18:00"],["2026-10-30","Hull","Carver","18:00"],["2026-10-30","Cape Cod RVT","Atlantis Charter","18:00"],["2026-10-30","Gardner","Tyngsborough","18:00"],["2026-10-30","Barnstable","Bridgewater-Raynham","18:00"],["2026-10-30","Ashland","Norwood","18:00"],["2026-10-30","Hopkinton","Westwood","18:00"],["2026-10-30","Oliver Ames","Canton","18:00"],["2026-10-30","Malden","Somerville","18:00"],["2026-10-30","Medfield","Holliston","18:00"],["2026-10-30","Seekonk","West Bridgewater","18:00"],["2026-10-30","Franklin","Taunton","18:00"],["2026-10-30","Chelmsford","Lawrence","18:00"],["2026-10-30","North Andover","Lowell","18:00"],["2026-10-30","Needham","Framingham","18:00"],["2026-10-30","St. John's Prep","Catholic Memorial","18:00"],["2026-10-30","Millis","Dover-Sherborn","18:00"],["2026-10-30","Whittier RVT","Revere","18:00"],["2026-10-30","David Prouty","Abby Kelley Foster","18:00"],["2026-10-30","Sandwich","Nauset Regional","18:00"],["2026-10-30","Amesbury","Hamilton-Wenham","18:00"],["2026-10-30","Concord-Carlisle","Wayland","18:00"],["2026-10-30","Hingham","Silver Lake Regional","18:00"],["2026-10-30","Brookline","Wellesley","18:00"],["2026-10-30","Burlington","Wakefield Memorial","18:00"],["2026-10-30","Mansfield","King Philip Regional","18:00"],["2026-10-30","Duxbury","Plymouth North","18:00"],["2026-10-30","St. Mary's","Norton","18:00"],["2026-10-30","Reading Memorial","Woburn Memorial","18:00"],["2026-10-30","Wachusett Regional","Algonquin","18:00"],["2026-10-30","Joseph Case","Sharon","18:00"],["2026-10-30","Manchester Essex","Pentucket Regional","18:00"],["2026-10-30","Montachusett RVT","Nashoba Regional","18:00"],["2026-10-30","Holbrook","Monomoy","18:00"],["2026-10-30","Marshfield","Whitman-Hanson Reg.","18:00"],["2026-10-30","Newton North","Braintree","18:00"],["2026-10-30","Attleboro","Milford","18:00"],["2026-10-30","Medway","Bellingham","18:00"],["2026-10-30","Bishop Stang","Cardinal Spellman","18:00"],["2026-10-30","St. Bernard's","Oxford","18:30"],["2026-10-30","Shrewsbury","Westborough","18:30"],["2026-10-30","Lunenburg","Leicester","18:30"],["2026-10-30","Melrose","Stoneham","18:30"],["2026-10-30","Brockton","Durfee","18:30"],["2026-10-30","Keefe Tech","Southbridge","18:30"],["2026-10-30","Apponequet Regional","Dighton-Rehoboth","18:30"],["2026-10-30","North Reading","Essex North Shore","18:30"],["2026-10-30","Natick","Walpole","18:30"],["2026-10-30","Fairhaven","Greater New Bedford","18:30"],["2026-10-30","Lincoln-Sudbury","Cambridge Rindge & Lat.","18:30"],["2026-10-30","Nashua North (N.H.)","Dracut","18:30"],["2026-10-30","Stoughton","Wareham","18:30"],["2026-10-30","Boston Latin Academy","Brighton","18:30"],["2026-10-30","Cohasset","Mashpee","18:30"],["2026-10-30","Lynnfield","Newburyport","18:30"],["2026-10-30","Old Rochester Regional","Somerset Berkley Reg.","18:30"],["2026-10-29","McCann Tech","Belchertown","19:00"],["2026-10-30","Doherty Memorial","Tantasqua Regional","19:00"],["2026-10-30","Waltham","Boston Latin","19:00"],["2026-10-30","Agawam","Wahconah Regional","19:00"],["2026-10-30","KIPP Academy Lynn Coll.","Lowell Catholic","19:00"],["2026-10-30","Athol","Greenfield","19:00"],["2026-10-30","Methuen","Billerica Memorial","19:00"],["2026-10-30","Minnechaug","Longmeadow","19:00"],["2026-10-30","Acton-Boxborough","Bedford","19:00"],["2026-10-30","Blackstone Valley RVT","Assabet Valley RVT","19:00"],["2026-10-30","Maynard","Hudson","19:00"],["2026-10-30","Masconomet Regional","Marblehead","19:00"],["2026-10-30","Andover","Tewksbury Memorial","19:00"],["2026-10-30","Arlington Catholic","Bishop Fenwick","19:00"],["2026-10-30","South High Community","Auburn","19:00"],["2026-10-30","Saugus","Swampscott","19:00"],["2026-10-30","Chicopee","Northampton","19:00"],["2026-10-30","Millbury","Northbridge","19:00"],["2026-10-30","Marlborough","Shepherd Hill Regional","19:00"],["2026-10-30","Diman RVT","Bristol-Plymouth RVT","19:00"],["2026-10-30","Springfield Central","West Springfield","19:00"],["2026-10-30","Easthampton","South Hadley","19:00"],["2026-10-30","Newton South","Westford Academy","19:00"],["2026-10-30","Weston","Fitchburg","19:00"],["2026-10-30","Southeastern RVT","Old Colony RVT","19:00"],["2026-10-30","Bay Path RVT","Uxbridge","19:00"],["2026-10-30","East Longmeadow","Westfield","19:00"],["2026-10-30","Quabbin Regional","Groton-Dunstable","19:00"],["2026-10-30","North Attleborough","Foxborough","19:00"],["2026-10-30","East Bridgewater","Abington","19:00"],["2026-10-30","Scituate","Hanover","19:00"],["2026-10-30","Danvers","Peabody Veterans","19:00"],["2026-10-30","Bartlett","Narragansett Regional","19:00"],["2026-10-30","Middleborough","Rockland","19:00"],["2026-10-30","Murdock","Ayer Shirley","19:00"],["2026-10-30","Watertown","Wilmington","19:00"],["2026-10-30","Mahar Regional","Franklin County Tech","19:00"],["2026-10-30","New Bedford","Dartmouth","19:00"],["2026-10-30","Ludlow","Frontier Regional","19:00"],["2026-10-30","West Boylston","Oakmont Regional","19:00"],["2026-10-30","Plymouth South","North Quincy","19:00"],["2026-10-30","Amherst-Pelham Reg.","Chicopee Comp.","19:00"],["2026-10-30","Nashoba Valley Tech","Lynn Vo-Tech","19:30"],["2026-10-31","Gloucester","Beverly","11:00"],["2026-10-31","Blackstone-Millville","Burncoat","12:00"],["2026-10-31","Clinton","Nipmuc Regional","12:00"],["2026-10-31","Martha's Vineyard Reg.","Nantucket","15:00"]];
function wkKey(r){return pairKey([r[0],r[1],r[2],null,null,0])}
const WEEK8_KEYS=new Set(WEEK8.map(wkKey));
// "Edit" on an entered score jumps to its Week 8 card and focuses the first score box.
function focusFixture(key){
 document.querySelector('[data-side-tab=week8]').click();
 if(![...el('fixtureList').querySelectorAll('[data-fixture]')].some(c=>c.dataset.fixture===key)){el('weekSearch').value='';const r=WEEK8.find(x=>wkKey(x)===key);weekDiv=DIV[r[1]]||DIV[r[2]];renderWeek8()}
 const card=[...el('fixtureList').querySelectorAll('[data-fixture]')].find(c=>c.dataset.fixture===key);if(!card)return;
 card.scrollIntoView({behavior:'smooth',block:'center'});card.querySelector('[data-side=a]').focus({preventScroll:true});
}
function wkScore(r){return edits.find(g=>pairKey(g)===wkKey(r))||source.get(wkKey(r))}
function wkGames(){const q=(el('weekSearch')?.value||'').trim().toLowerCase();return WEEK8.filter(r=>(DIV[r[1]]===weekDiv||DIV[r[2]]===weekDiv)&&(!q||(r[1]+' '+r[2]).toLowerCase().includes(q))).sort((a,b)=>a[0].localeCompare(b[0])||a[3].localeCompare(b[3])||a[1].localeCompare(b[1]))}
function wkTime(t){let [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
// Scores are estimated locally from official baseline ratings and actual 2026 team scoring.
// This is a transparent ratings model, NOT an online generative AI prediction service.
const PRED_STORE='miaa-week8-auto-picks-2026-v1';
let predictedKeys=new Set();
try{const arr=JSON.parse(localStorage.getItem(PRED_STORE)||'[]');if(Array.isArray(arr))predictedKeys=new Set(arr.filter(x=>typeof x==='string'&&!isPublishedWeek8Key(x)));}catch{}
const seasonPoints={},seasonMargins={};
for(const g of DATA.games){if(g[3]===null||g[4]===null||!validScore(g[3])||!validScore(g[4])||g[5])continue;
 for(const [team,opp,scored,allowed] of [[g[1],g[2],g[3],g[4]],[g[2],g[1],g[4],g[3]]]){
 const stat=seasonPoints[team]||(seasonPoints[team]={games:0,scored:0,allowed:0});
 stat.games++;stat.scored+=scored;stat.allowed+=allowed;
 const m=seasonMargins[team]||(seasonMargins[team]=new Map());m.set(opp,[...(m.get(opp)||[]),scored-allowed]);
 }}
function originalRating(team){return OFF[team]?OFF[team][1]:BASE.teams[team]?BASE.teams[team].raw+offset:0;}
// Common-opponent comparison: how A did against shared opponents minus how B did against them.
// A previous meeting between the two teams counts double. Margins clipped at ±28 so one blowout can't dominate.
function commonOpponents(a,b){
 const ma=seasonMargins[a],mb=seasonMargins[b];if(!ma||!mb)return {n:0,edge:0};
 const avg=xs=>xs.reduce((s,x)=>s+x,0)/xs.length,clip=x=>Math.max(-28,Math.min(28,x));
 let n=0,edge=0;
 for(const [opp,xs] of ma){if(opp===b||!mb.has(opp))continue;edge+=clip(avg(xs))-clip(avg(mb.get(opp)));n++}
 if(ma.has(b)){edge+=2*clip(avg(ma.get(b)));n+=2}
 return {n,edge:n?edge/n:0};
}
function estimateGameScore(r){
 const a=r[1],b=r[2],aa=seasonPoints[a],bb=seasonPoints[b];
 const avg=(s,k)=>s&&s.games?s[k]/s.games:21;
 const scoringA=.60*avg(aa,'scored')+.40*avg(bb,'allowed');
 const scoringB=.60*avg(bb,'scored')+.40*avg(aa,'allowed');
 const gap=originalRating(a)-originalRating(b);
 // Baseline team scoring establishes total points, with relative strength anchoring margin.
 const total=Math.max(14,Math.min(85,scoringA+scoringB));
 const form=scoringA-scoringB;
 // Weights from a walk-forward backtest on 2026 weeks 3–7 (each week predicted from prior weeks only):
 // 76.8% winners and 6.45 avg capped-margin error, vs 76.2% and 6.96 for the previous .75·gap+.25·form.
 const common=commonOpponents(a,b),w=.3*common.n/(common.n+2);
 const margin=Math.max(-35,Math.min(35,(1-w)*(1.25*gap+.8*form)+w*common.edge));
 let sa=Math.max(0,Math.round((total+margin)/2)),sb=Math.max(0,Math.round((total-margin)/2));
 // High-school football can have ties during regulation but a finished matchup normally has a winner.
 if(sa===sb){if(gap>=0)sa+=1;else sb+=1;}
 return [sa,sb];
}
// Returns how many games were filled in.
function predictAllWeek8(){
 const scored=unscoredWeek8();
 if(!scored.length){toast('Every Week 8 game already has a score. Clear scores to generate more.');return 0}
 for(const r of scored){const [sa,sb]=estimateGameScore(r);edits.push([r[0],r[1],r[2],sa,sb,0]);predictedKeys.add(wkKey(r))}
 save();toast('Estimated '+scored.length+' games across all divisions. Manual scores preserved.');
 return scored.length;
}
function clearAllPredictions(){
 if(!predictedKeys.size)return;
 const count=predictedKeys.size;
 edits=edits.filter(g=>!predictedKeys.has(pairKey(g)));
 predictedKeys.clear();save();toast('Removed '+count+' predicted game scores. Manual scores kept.');
}
function wkTeamData(name){
 const m=MODEL.teams[name], div=DIV[name];
 // Out-of-state opponents have only their games versus MA schools in our ledger.
 const record=div&&m?rec(m):'—';
 const rating=div&&m?signed(m.rating,2):'—';
 return `<span class="fixture-data" data-meta-team="${esc(name)}"><span class="fixture-rec">${record}</span><span class="fixture-div">${div?'D'+div:'Non-MA'}</span><span class="fixture-rate">${rating}</span></span>`;
}
function renderWeek8(){
 const filters=el('weekFilters');if(!filters)return;
 filters.innerHTML=[1,2,3,4,5,6,7,8].map(d=>`<button type="button" data-wdiv="${d}" class="weekFilter ${weekDiv===d?'selected':''}">D${d}</button>`).join('');
 const games=wkGames();
 const line=(side,name)=>`<div class="fixtureline" data-line="${side}"><div class="fixtureteam"><button type="button" class="fixture-team-link" data-team="${esc(name)}" title="View ${esc(name)}"><span class="fixture-name">${esc(name)}</span></button>${wkTeamData(name)}</div><div class="score-actions"><input class="fixture-score" data-side="${side}" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Score for ${esc(name)}" placeholder="–"><button type="button" class="max-win" data-max="${side}" title="Set ${esc(name)} to win 14–0">MAX</button></div></div>`;
 el('fixtureList').innerHTML=games.length?games.map(r=>{
 const [date,a,b,time]=r;
 return `<article class="fixture" data-fixture="${esc(wkKey(r))}">
   <div class="fixturetop"><span class="fixture-date">${date==='2026-10-29'?'Thu':date==='2026-10-30'?'Fri':'Sat'} Oct ${Number(date.slice(-2))}, ${wkTime(time)}</span><div class="fixture-meta"><span class="fixtureStatus"></span><button type="button" class="fixtureClear" data-clear="${esc(wkKey(r))}" title="Remove score" aria-label="Remove score">×</button></div></div>
   ${line('a',a)}${line('b',b)}
 </article>`;
 }).join(''):'<div class="empty">No matchups match your search.</div>';
 updateWeek8States();
}
function updateWeek8States(){
 const list=el('fixtureList');if(!list)return;let n=0;
 for(const card of list.querySelectorAll('[data-fixture]')){
 const k=card.dataset.fixture,entered=edits.find(g=>pairKey(g)===k),base=source.get(k), g=entered||base;
 const locked=LOCKED_KEYS.has(k),has=!!(g&&g[3]!==null&&g[4]!==null),pred=!!entered&&predictedKeys.has(k);if(has)n++;
 const lab=card.querySelector('.fixtureStatus');lab.textContent=locked?'🔒 Final':entered?(pred?'Prediction':'Scenario'):has?'Final':'';lab.classList.toggle('saved',!!entered&&!pred);lab.classList.toggle('pred',pred);lab.classList.toggle('locked',locked);lab.classList.remove('warn');
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
 card.querySelector('.fixtureClear').disabled=locked||!entered;
 }
 el('weekMeta').textContent=`${n} of ${wkGames().length} matchups scored`;el('clearPredictions').disabled=!predictedKeys.size;
}
 // First-visit chooser: predict every Week 8 game, or enter scores by hand. Dismissal is remembered per browser.
const INTRO_KEY='miaa-intro-seen-v1';
const BASELINE_DATE=new Date(DATA.date+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
function unscoredWeek8(){const done=new Set(edits.map(g=>pairKey(g)));return WEEK8.filter(r=>!done.has(wkKey(r))&&!(source.has(wkKey(r))&&source.get(wkKey(r))[3]!==null))}
function scrollToEl(node){node.scrollIntoView({behavior:reduceMotion.matches?'auto':'smooth',block:'start'})}
function openIntro(){const d=el('intro');if(d.open||typeof d.showModal!=='function')return;
 const n=unscoredWeek8().length;el('introCount').textContent=n?`the ${n} Week 8 ${n===1?'game':'games'} that ${n===1?'has':'have'} no score yet`:'Week 8';d.showModal()}
// Shows the Week 8 list and puts the cursor in the first empty score box.
function jumpToWeek8(){if(activePage!=='rankings')switchPage('rankings');document.querySelector('[data-side-tab=week8]').click();
 const open=[...el('fixtureList').querySelectorAll('.fixture-score')].find(x=>!x.value);
 scrollToEl(el('week8View'));if(open)setTimeout(()=>open.focus({preventScroll:true}),350)}
 function initWeek8(){
 el('weekJump').onclick=jumpToWeek8;
 el('heroPredict').addEventListener('click',predictAllWeek8);el('heroReset').addEventListener('click',reset);
 el('openIntro').addEventListener('click',openIntro);
 el('introDate').textContent=`Official rankings as of ${BASELINE_DATE}`;
 el('intro').addEventListener('close',()=>{try{localStorage.setItem(INTRO_KEY,'1')}catch{}});
 // Close on a backdrop click only: the press and release must both land outside the dialog box,
 // so scrollbar drags and text selections that end on the dialog don't dismiss it.
 const outside=e=>{const r=el('intro').getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom};
 let pressedOutside=false;
 el('intro').addEventListener('pointerdown',e=>{pressedOutside=e.target===el('intro')&&outside(e)});
 el('intro').addEventListener('click',e=>{
   if(e.target===el('intro')){if(pressedOutside&&outside(e))el('intro').close();return}
   const b=e.target.closest('[data-intro]');if(!b)return;el('intro').close();
   if(b.dataset.intro==='predict'){if(activePage!=='rankings')switchPage('rankings');document.querySelector('[data-side-tab=week8]').click();if(predictAllWeek8())scrollToEl(document.querySelector('.wrap'))}
   else if(b.dataset.intro==='enter')jumpToWeek8();
 });
 let seen=false;try{seen=localStorage.getItem(INTRO_KEY)==='1'}catch{}
 if(!seen&&!edits.length)openIntro();
 const tabs=document.querySelector('.sideTabs');tabs.addEventListener('click',e=>{const b=e.target.closest('[data-side-tab]');if(!b)return;const name=b.dataset.sideTab;tabs.querySelectorAll('.sideTab').forEach(x=>x.classList.toggle('selected',x===b));for(const n of ['week8','changes'])el(n+'View').classList.toggle('hidden',name!==n)});
 el('predictWeek8').addEventListener('click',predictAllWeek8);el('clearPredictions').addEventListener('click',clearAllPredictions);
 el('weekSearch').addEventListener('input',renderWeek8);
 el('weekFilters').addEventListener('click',e=>{const btn=e.target.closest('[data-wdiv]');if(!btn)return;weekDiv=Number(btn.dataset.wdiv);selectedDiv=weekDiv;renderRankings();renderWeek8()});
 el('fixtureList').addEventListener('input',e=>{
   const inp=e.target.closest('.fixture-score');if(!inp)return;
   let card=inp.closest('[data-fixture]');if(LOCKED_KEYS.has(card.dataset.fixture))return;let a=card.querySelector('[data-side=a]').value.trim(),b=card.querySelector('[data-side=b]').value.trim();
   if((a&&!/^\d{1,3}$/.test(a))||(b&&!/^\d{1,3}$/.test(b))){const st=card.querySelector('.fixtureStatus');st.textContent='Numbers only';st.classList.add('warn');return}
   if(!a||!b){const st=card.querySelector('.fixtureStatus');st.textContent='Enter both scores';st.classList.add('warn');return}
   const r=WEEK8.find(r=>wkKey(r)===card.dataset.fixture);if(!r)return;
   const g=[r[0],r[1],r[2],Number(a),Number(b),0];
   const prev=edits.find(x=>pairKey(x)===card.dataset.fixture);if(prev&&prev[3]===g[3]&&prev[4]===g[4])return;
   edits=edits.filter(x=>pairKey(x)!==card.dataset.fixture);edits.push(g);predictedKeys.delete(card.dataset.fixture);save();
 });
 el('fixtureList').addEventListener('click',e=>{
   const teamButton=e.target.closest('.fixture-team-link');
   if(teamButton){showTeam(teamButton.dataset.team);return;}
   const maxBtn=e.target.closest('[data-max]');
   if(maxBtn){const card=maxBtn.closest('[data-fixture]'),r=WEEK8.find(x=>wkKey(x)===card.dataset.fixture);if(!r||LOCKED_KEYS.has(card.dataset.fixture))return;
     const scoreA=maxBtn.dataset.max==='a'?14:0,scoreB=maxBtn.dataset.max==='b'?14:0;
     edits=edits.filter(g=>pairKey(g)!==card.dataset.fixture);
     edits.push([r[0],r[1],r[2],scoreA,scoreB,0]);predictedKeys.delete(card.dataset.fixture);
     card.querySelector('[data-side=a]').value=scoreA;card.querySelector('[data-side=b]').value=scoreB;save();return;
   }
   const btn=e.target.closest('[data-clear]');if(!btn||LOCKED_KEYS.has(btn.dataset.clear))return;
   edits=edits.filter(g=>pairKey(g)!==btn.dataset.clear);predictedKeys.delete(btn.dataset.clear);save();
   const card=btn.closest('[data-fixture]');card.querySelectorAll('.fixture-score').forEach(x=>x.value='');updateWeek8States();
 });
 // Score inputs keep focus while the calculated records and ratings refresh.
 renderWeek8();
}

init();
initWeek8();


