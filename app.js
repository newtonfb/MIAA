

'use strict';
const KEY='miaa-scenario-lab-2026-oct27-v1';
const DIV=DATA.divisions, OFF=DATA.officialD8;
const TEAMS=[...new Set(DATA.games.flatMap(g=>[g[1],g[2]]))].sort((a,b)=>a.localeCompare(b));
const IND=Object.fromEntries(TEAMS.map((t,i)=>[t,i]));
const divTeams=Object.fromEntries(Array.from({length:8},(_,i)=>[i+1,Object.keys(DIV).filter(x=>DIV[x]===i+1)]));
const source=new Map(DATA.games.map(g=>[pairKey(g),g]));
let edits=[];
try{const s=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(s))edits=s.filter(g=>Array.isArray(g)&&g.length===6&&TEAMS.includes(g[1])&&TEAMS.includes(g[2]));}catch{}
let selectedDiv=0, activePage='rankings', selectedTeam=Object.keys(DIV).sort((a,b)=>a.localeCompare(b))[0], weekDiv=0;
function pairKey(g){return g[0]+'|'+[g[1],g[2]].sort().join('|')}
function validScore(n){return n===null||(Number.isInteger(n)&&n>=0&&n<=999)}
function fmt(n,d=4){return Number.isFinite(n)?n.toFixed(d):'—'}
function signed(n,d=4){return Number.isFinite(n)?(n>0?'+':'')+n.toFixed(d):'—'}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const el=id=>document.getElementById(id);
let alertTimer;
function toast(s){const x=el('alert');x.textContent=s;x.classList.add('show');clearTimeout(alertTimer);alertTimer=setTimeout(()=>x.classList.remove('show'),3000)}
function records(){const m=new Map(source);for(const g of edits)m.set(pairKey(g),g);return [...m.values()]}
function compute(games){const N=TEAMS.length, degrees=new Float64Array(N), sums=new Float64Array(N), sumsAll=new Float64Array(N), countAll=new Int32Array(N), forfeitLosses=new Int32Array(N), ws=new Int32Array(N),ls=new Int32Array(N),ties=new Int32Array(N),neighbors=Array.from({length:N},()=>[]),played=[];
for(const g of games){const [date,a,b,sa,sb,f]=g;if(sa===null||sb===null||!validScore(sa)||!validScore(sb))continue;const ai=IND[a],bi=IND[b];if(ai===undefined||bi===undefined)continue;const m=Math.max(-14,Math.min(14,sa-sb));countAll[ai]++;countAll[bi]++;sumsAll[ai]+=m;sumsAll[bi]-=m;if(sa>sb){ws[ai]++;ls[bi]++}else if(sa<sb){ws[bi]++;ls[ai]++}else{ties[ai]++;ties[bi]++}played.push(g);if(f){if(sa<sb)forfeitLosses[ai]++;else if(sb<sa)forfeitLosses[bi]++;}
if(!f){degrees[ai]++;degrees[bi]++;sums[ai]+=m;sums[bi]-=m;neighbors[ai].push(bi);neighbors[bi].push(ai)}}
const ratings=new Float64Array(N),next=new Float64Array(N),mean=new Float64Array(N);let totalDegree=0;for(let i=0;i<N;i++){totalDegree+=degrees[i];mean[i]=degrees[i]>0?sums[i]/degrees[i]:0}
let iter=0,maxDelta=0;for(iter=0;iter<1000;iter++){let total=0;for(let i=0;i<N;i++){if(!degrees[i]){next[i]=0;continue}let opp=0;for(let k=0;k<neighbors[i].length;k++)opp+=ratings[neighbors[i][k]];next[i]=.35*ratings[i]+.65*(mean[i]+opp/degrees[i]);total+=next[i]*degrees[i]}
const shift=total/totalDegree;maxDelta=0;for(let i=0;i<N;i++){if(degrees[i])next[i]-=shift;maxDelta=Math.max(maxDelta,Math.abs(next[i]-ratings[i]));ratings[i]=next[i]}if(maxDelta<0.0001)break}
const out={};for(let i=0;i<N;i++){const own=countAll[i]?sumsAll[i]/countAll[i]:0;const opp=ratings[i]-mean[i];const adjOwn=degrees[i]?mean[i]:own;const adjusted=adjOwn+opp;out[TEAMS[i]]={team:TEAMS[i],division:DIV[TEAMS[i]]||null,w:ws[i],l:ls[i],ties:ties[i],gp:countAll[i],mov:own,opp,raw:own+opp,adjusted,rating:own+opp,nonforfeit:degrees[i],forfeitLosses:forfeitLosses[i]}}
return {teams:out,iter,played:played.length,convergence:maxDelta}}

const BASE=compute(DATA.games);
const offset=Object.keys(OFF).reduce((s,t)=>s+OFF[t][1]-BASE.teams[t].raw,0)/Object.keys(OFF).length;
function derive(m){for(const [t,v] of Object.entries(m.teams)){const b=BASE.teams[t];const anchor=OFF[t]?OFF[t][1]:b.raw+offset;v.rating=anchor+(v.raw-b.raw);v.change=v.rating-anchor}return m}
let MODEL=derive(compute(records()));
function standings(d){return divTeams[d].map(t=>MODEL.teams[t]).sort((a,b)=>b.rating-a.rating||a.team.localeCompare(b.team)).map((v,i)=>({...v,rank:i+1,eligible:v.w>=3&&v.gp-v.forfeitLosses>=7}))}
function listAll(){const divRanks={};for(let d=1;d<=8;d++){divRanks[d]=Object.fromEntries(standings(d).map(t=>[t.team,t.rank]));}
return Object.keys(DIV).map(t=>({...MODEL.teams[t],divisionRank:divRanks[DIV[t]][t],eligible:MODEL.teams[t].w>=3&&MODEL.teams[t].gp-MODEL.teams[t].forfeitLosses>=7})).sort((a,b)=>b.rating-a.rating||a.team.localeCompare(b.team)).map((x,i)=>({...x,rank:i+1}));}
function recalc(){MODEL=derive(compute(records()));renderRankings();renderEdits();if(activePage==='team')renderTeam();updateWeek8States();}
function save(){try{localStorage.setItem(KEY,JSON.stringify(edits));localStorage.setItem(PRED_STORE,JSON.stringify([...predictedKeys]))}catch{}recalc()}
const PRESETS=[['2026-10-30','Mahar Regional','Franklin County Tech'],['2026-10-29','Ware','Lee'],['2026-10-30','Wareham','Stoughton'],['2026-10-30','Frontier Regional','Ludlow']];
function renderDivisionTabs(){el('divisions').innerHTML=[0,1,2,3,4,5,6,7,8].map(d=>`<button class="division ${selectedDiv===d?'selected':''}" data-div="${d}">${d===0?'All divisions':`D${d} <span style="font-weight:500;color:inherit;opacity:.65">${divTeams[d].length}</span>`}</button>`).join('')}

/* School logos: published MIAA school directory, never algorithm-generated mascot art. */
const FIXED_LOGOS={
 'Abington':'https://www.miaa.net/sites/default/files/logos/abingtonhs_logo_small.jpg',
 'Mahar Regional':''
};
const LOGO_STORE='miaa-football-official-logos-v7';
let SCHOOL_LOGOS={...FIXED_LOGOS};
try{const cache=JSON.parse(localStorage.getItem(LOGO_STORE)||'{}');if(cache&&typeof cache==='object')for(const [team,url] of Object.entries(cache)){if(DIV[team]&&/^https:\/\/(www\.miaa\.net|miaa\.net)\/sites\/default\/files\//.test(url))SCHOOL_LOGOS[team]=url}}catch{}
function teamMark(name){const tag=String(name||'').replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();const url=SCHOOL_LOGOS[name]||'';return `<span class="schoolmark${url?' has-logo':''}" data-schoolmark="${esc(name)}" aria-hidden="true"><img alt="" loading="lazy" ${url?`src="${esc(url)}"`:''}/><span class="schoolmark-fallback">${esc(tag||'—')}</span></span>`}
function refreshMarks(){for(const el of document.querySelectorAll('[data-schoolmark]')){const name=el.dataset.schoolmark,url=SCHOOL_LOGOS[name];const img=el.querySelector('img');if(url){if(img.getAttribute('src')!==url)img.setAttribute('src',url);el.classList.add('has-logo')}else{el.classList.remove('has-logo');img.removeAttribute('src')}}}
document.addEventListener('error',e=>{const el=e.target;if(el&&el.tagName==='IMG'&&el.closest('.schoolmark'))el.closest('.schoolmark').classList.remove('has-logo')},true);
const _logoWords=name=>String(name||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9 ]/g,' ').replace(/\b(?:high|middle|school|schools|regional|reg|memorial|jr|sr|the)\b/g,' ').replace(/\btechnical\b/g,'tech').replace(/\bvocational\b/g,'voc').replace(/\s+/g,' ').trim();
const _logoAliases={'Mahar Regional':'mahar','Franklin County Tech':'franklin county tech','Lynn Vo-Tech':'lynn voc','McCann Tech':'mccann','Nashoba Valley Tech':'nashoba valley tech','Smith Vo-Tech':'smith voc','Pathfinder RVT':'pathfinder','Cape Cod RVT':'cape cod','KIPP Academy Lynn Coll.':'kipp academy lynn','Upper Cape Cod RVT':'upper cape cod','Old Colony RVT':'old colony','Springfield Int\'l Charter':'springfield international charter','Ayer Shirley':'ayer shirley','Abby Kelley Foster':'abby kelley foster'};
function logoTeamMatch(school){const label=_logoWords(school);if(!label)return '';const candidates=[];for(const team of Object.keys(DIV)){
 const t=_logoAliases[team]||_logoWords(team);
 if(!t)continue;
 let v=0;
 if(t===label)v=1;
 else if(label.startsWith(t+' ')||t.startsWith(label+' '))v=Math.min(t.length,label.length)>=6?.95:0;
 else if(label.includes(' '+t+' ')||label.endsWith(' '+t))v=t.length>5?.91:0;
 else {const tt=t.split(' '),ss=label.split(' '),overlap=tt.filter(x=>ss.includes(x));if(overlap.length>=2&&overlap.length===tt.length)v=.80+(Math.min(tt.length,ss.length)/Math.max(tt.length,ss.length))*.15}
 if(v>.75)candidates.push([team,v]);
 }
 candidates.sort((a,b)=>b[1]-a[1]);return candidates.length&&candidates[0][1]>=.80&&(!candidates[1]||candidates[0][1]===1&&candidates[1][1]<1||candidates[0][1]-candidates[1][1]>=.055)?candidates[0][0]:'';
}
async function loadSchoolLogos(){
 // Small cached batches avoid one large crawl and keep the user-facing rankings responsive.
 let discovered=0;
 for(let start=0;start<72;start+=8){
  try{const r=await fetch(`/api/school-logos?start=${start}`,{cache:'force-cache'});if(!r.ok)break;const d=await r.json();if(!Array.isArray(d.schools))break;
   let changed=false;for(const item of d.schools){const team=logoTeamMatch(item.name);if(team&&item.url&&!SCHOOL_LOGOS[team]&&/^https:\/\/(www\.miaa\.net|miaa\.net)\/sites\/default\/files\//.test(item.url)){SCHOOL_LOGOS[team]=item.url;changed=true;discovered++}}
   if(changed){refreshMarks();try{localStorage.setItem(LOGO_STORE,JSON.stringify(Object.fromEntries(Object.entries(SCHOOL_LOGOS).filter(([,v])=>v.includes('miaa.net/sites/default/files/')))))}catch{}}
  }catch{break}
  await new Promise(ok=>setTimeout(ok,80));
 }
}

function renderRankings(){renderDivisionTabs();const all=selectedDiv===0;let rows=all?listAll():standings(selectedDiv);const q=el('rankingSearch').value.trim().toLowerCase();if(q)rows=rows.filter(t=>t.team.toLowerCase().includes(q)||(all&&String(t.division)===q));
 el('tableMeta').textContent=`${rows.length} ${rows.length===1?'team':'teams'} shown · ${all?'statewide table':`Division ${selectedDiv} rankings`}`;
 el('rankingsBody').innerHTML=rows.length?rows.map((r,i)=>`<tr class="${!all&&r.rank===17?'cutline':''} ${!all&&r.rank<=16?'playoff-zone':''}"><td class="num rank">${r.rank}</td><td><span class="tag">D${r.division}</span>${all?`<div class="subrank">#${r.divisionRank} in D${r.division}</div>`:''}</td><td><button class="team-button" data-team="${esc(r.team)}">${teamMark(r.team)}${esc(r.team)}</button></td><td>${r.w}–${r.l}${r.ties?'–'+r.ties:''}</td><td class="num">${signed(r.mov)}</td><td class="num">${signed(r.opp)}</td><td class="num rate ${r.rating>=0?'rating-positive':'rating-negative'}">${signed(r.rating)}</td><td class="num delta ${r.change>0.00001?'pos':r.change<-.00001?'neg':''}">${Math.abs(r.change)<0.00001?'—':signed(r.change)}</td></tr>`).join(''):'<tr><td colspan="8" class="empty">No teams match your search.</td></tr>';
 el('mobileRankingsBody').innerHTML=rows.length?rows.map(r=>`<div class="mobileRankRow ${(!all&&r.rank===17)?'cutline':''} ${!all&&r.rank<=16?'playoff-zone':''}"><div class="mobileRankTop"><span class="mobileRankNumber">${r.rank}</span><button class="mobileRankTeam" data-team="${esc(r.team)}">${teamMark(r.team)}<span>${esc(r.team)}</span></button><strong class="mobileRankRating ${r.rating>=0?'rating-positive':'rating-negative'}">${signed(r.rating)}</strong></div><div class="mobileRankInfo"><span>D${r.division}${all?' · #'+r.divisionRank:''}</span><span>${r.w}–${r.l}${r.ties?'–'+r.ties:''}</span><span>MOV ${signed(r.mov)}</span></div><div class="mobileRankInfo secondary"><span>Opp. ${signed(r.opp)}</span><span>Change <b class="${r.change>0.00001?'pos':r.change<-.00001?'neg':''}">${Math.abs(r.change)<0.00001?'—':signed(r.change)}</b></span></div></div>`).join(''):'<div class="empty">No teams match your search.</div>';
 refreshMarks();
 el('tableFootText').textContent=all?'Statewide ranking by model rating · click any team to see its games.':'Rank #17 begins below the top-16 cutoff. Eligibility also requires 3 wins and 7 games.';
 el('scenarioBadge').classList.toggle('is-active',edits.length>0);el('scenarioBadge').innerHTML=edits.length?`<strong>${edits.length} scenario ${edits.length===1?'change':'changes'} active</strong> · rankings recalculated`:'October 27 score baseline · no scenarios';
 el('headlineSub').textContent=all?'All 262 teams, ranked together. Select a division or enter a score to test an outcome.':`All ${divTeams[selectedDiv].length} Division ${selectedDiv} teams. Every score still recalculates the statewide ratings.`;
}
function renderPresets(){el('presets').innerHTML=PRESETS.map((p,i)=>`<button class="preset" data-preset="${i}"><b>${esc(p[1])} <span>vs.</span> ${esc(p[2])}</b><span>${p[0].slice(5)} →</span></button>`).join('')}
function fillGame(g){el('gameDate').value=g[0];el('gameA').value=g[1];el('gameB').value=g[2];el('scoreA').value=g[3]??'';el('scoreB').value=g[4]??'';switchPage('rankings');el('scoreA').focus()}
function clearGame(){el('gameDate').value='2026-10-30';el('gameA').value='';el('gameB').value='';el('scoreA').value='';el('scoreB').value=''}
function addGame(){const date=el('gameDate').value,a=el('gameA').value.trim(),b=el('gameB').value.trim(),sa=el('scoreA').value.trim(),sb=el('scoreB').value.trim();if(!/^2026-\d\d-\d\d$/.test(date)){toast('Select a date in 2026.');return}if(!TEAMS.includes(a)||!TEAMS.includes(b)||a===b){toast('Choose two different teams from the list.');return}if(sa===''||sb===''){toast('Enter both scores.');return}const x=Number(sa),y=Number(sb);if(!validScore(x)||!validScore(y)){toast('Scores must be whole numbers from 0 to 999.');return}const g=[date,a,b,x,y,0],key=pairKey(g);const old=source.get(key);if(old&&old[5])g[5]=old[5];edits=edits.filter(row=>pairKey(row)!==key);edits.push(g);predictedKeys.delete(key);save();toast('Result applied. All eight divisions recalculated.');}
function renderEdits(){el('editCount').textContent=`(${edits.length})`;el('editSub').textContent=edits.length?'Local to this browser':'No changes applied';el('editList').innerHTML=edits.length?edits.slice().sort((a,b)=>b[0].localeCompare(a[0])).map(g=>`<div class="editrow"><div><strong>${esc(g[1])} ${g[3]}–${g[4]} ${esc(g[2])}</strong><br><small>${g[0].slice(5)}</small></div><div><button class="bttn sml" data-load="${esc(pairKey(g))}">Edit</button> <button class="bttn sml danger" data-remove="${esc(pairKey(g))}">×</button></div></div>`).join(''):'<div class="note" style="padding:14px 16px">No simulated results. Select a matchup or enter one above.</div>'}
function showTeam(name){selectedTeam=name;el('teamSearch').value=name;el('teamSelect').value=name;switchPage('team')}
function renderTeam(){const x=MODEL.teams[selectedTeam];if(!x){el('teamDetails').innerHTML='<div class="empty">Choose a team to view its schedule.</div>';return}const myGames=records().filter(g=>g[1]===selectedTeam||g[2]===selectedTeam).sort((a,b)=>a[0].localeCompare(b[0]));const curRank=x.division?standings(x.division).find(r=>r.team===selectedTeam).rank:null;
 el('teamDetails').innerHTML=`<div class="details"><div class="detailsHead"><div><div class="eyebrow">${x.division?'Division '+x.division:'Out-of-state opponent'}${curRank?' · Rank #'+curRank:''}</div><div class="detailsName">${teamMark(x.team)}<h3>${esc(x.team)}</h3></div><p>${x.w}–${x.l}${x.ties?'–'+x.ties:''} · ${x.gp} games${x.division?' · D'+x.division:''}</p></div><button class="bttn" id="returnRankings">← Rankings</button></div><div class="metrics"><div class="metric"><small>Power rating</small><b>${signed(x.rating,2)}</b></div><div class="metric"><small>Avg. margin</small><b>${signed(x.mov,2)}</b></div><div class="metric"><small>Opponent rating</small><b>${signed(x.opp,2)}</b></div><div class="metric"><small>Scenario change</small><b>${signed(x.change,2)}</b></div></div><h3 style="font-size:14px">Schedule & results</h3><div class="table-scroll"><table class="gameTable"><thead><tr><th>Date</th><th>Opponent</th><th>Score</th><th>Margin (capped)</th><th>Opponent rating</th></tr></thead><tbody>${myGames.map(g=>{const own=g[1]===selectedTeam,opp=own?g[2]:g[1],my=own?g[3]:g[4],their=own?g[4]:g[3],margin=my===null?'—':signed(Math.max(-14,Math.min(14,my-their)),0);return `<tr><td>${g[0].slice(5)}</td><td><button class="team-button" data-team="${esc(opp)}">${esc(opp)}</button></td><td>${my===null?'Unplayed':my+'–'+their}</td><td>${margin}</td><td>${signed(MODEL.teams[opp]?.rating,2)}</td></tr>`}).join('')}</tbody></table></div></div>`;refreshMarks();}
function switchPage(page){activePage=page;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('hidden',e.id!==page+'Page'));document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('selected',e.dataset.page===page));if(page==='team')renderTeam()}
function reset(){if(edits.length&&!confirm('Remove all scenario changes?'))return;edits=[];predictedKeys.clear();save();toast('Returned to the October 27 baseline')}
function init(){loadSchoolLogos().catch(()=>{});el('teamsList').innerHTML=TEAMS.map(t=>`<option value="${esc(t)}"></option>`).join('');renderPresets();renderRankings();renderEdits();el('teamSearch').value=selectedTeam;el('teamSelect').innerHTML=Object.keys(DIV).sort((a,b)=>a.localeCompare(b)).map(t=>`<option value="${esc(t)}">${esc(t)} (D${DIV[t]})</option>`).join('');el('teamSelect').value=selectedTeam;
 document.querySelector('.navigation').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)switchPage(b.dataset.page)});
 el('divisions').addEventListener('click',e=>{const b=e.target.closest('[data-div]');if(b){selectedDiv=Number(b.dataset.div);weekDiv=selectedDiv;renderRankings();renderWeek8()}});el('rankingSearch').oninput=renderRankings;el('resetSearch').onclick=()=>{el('rankingSearch').value='';renderRankings()};
 el('rankingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)showTeam(b.dataset.team)});
 el('mobileRankingsBody').addEventListener('click',e=>{const b=e.target.closest('[data-team]');if(b)showTeam(b.dataset.team)});
 el('presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(!b)return;const p=PRESETS[Number(b.dataset.preset)];const existing=edits.find(x=>pairKey(x)===pairKey([...p,0,0,0]));fillGame(existing||[...p,null,null,0])});
 el('addGame').onclick=addGame;el('resetEntry').onclick=clearGame;el('resetAll').onclick=reset;
 el('editList').addEventListener('click',e=>{const remove=e.target.closest('[data-remove]');const load=e.target.closest('[data-load]');if(remove){edits=edits.filter(g=>pairKey(g)!==remove.dataset.remove);predictedKeys.delete(remove.dataset.remove);save();toast('Scenario removed')}else if(load){const g=edits.find(g=>pairKey(g)===load.dataset.load);if(g)fillGame(g)}});
 el('openTeam').onclick=()=>{const t=el('teamSearch').value.trim();if(!TEAMS.includes(t)){toast('Choose a listed team');return}showTeam(t)};el('teamSelect').addEventListener('change',e=>{if(TEAMS.includes(e.target.value))showTeam(e.target.value)});el('teamSearch').addEventListener('change',e=>{const t=e.target.value.trim();if(TEAMS.includes(t))showTeam(t)});el('teamSearch').addEventListener('keydown',e=>{if(e.key==='Enter')el('openTeam').click()});
 el('teamDetails').addEventListener('click',e=>{if(e.target.closest('#returnRankings'))switchPage('rankings');const t=e.target.closest('[data-team]');if(t)showTeam(t.dataset.team)});
}

const WEEK8=[["2026-10-29","Lee","Ware","18:00"],["2026-10-29","Hoosac Valley","Holyoke","18:00"],["2026-10-29","Quaboag Regional","Smith Vo-Tech","18:00"],["2026-10-29","Lynn English","Medford","18:00"],["2026-10-29","Chelsea","Minuteman Regional","18:00"],["2026-10-29","Upper Cape Cod RVT","South Shore Vo-Tech","18:00"],["2026-10-29","Winthrop","Salem","18:30"],["2026-10-29","Cathedral","Archbishop Williams","19:00"],["2026-10-29","Haverhill","Central Catholic","19:00"],["2026-10-29","Quincy","Pembroke","19:00"],["2026-10-29","Blue Hills RVT","Tri-County RVT","19:00"],["2026-10-29","Milton","Weymouth","19:00"],["2026-10-30","O'Bryant","English High","16:00"],["2026-10-30","Everett","Lynn Classical","17:00"],["2026-10-30","Leominster","Grafton","18:00"],["2026-10-30","Northeast Metro RVT","Greater Lowell Tech","18:00"],["2026-10-30","Winchester","Belmont","18:00"],["2026-10-30","Shawsheen Valley Tech","Greater Lawrence Tech","18:00"],["2026-10-30","Putnam Vo-Tech","Taconic","18:00"],["2026-10-30","Norwell","Randolph","18:00"],["2026-10-30","Springfield Int'l Charter","HS of Commerce","18:00"],["2026-10-30","Lexington","Arlington","18:00"],["2026-10-30","Dennis-Yarmouth","Falmouth","18:00"],["2026-10-30","Malden Catholic","Xaverian Brothers","18:00"],["2026-10-30","East Boston","Tech Boston Academy","18:00"],["2026-10-30","North High","Worcester Tech","18:00"],["2026-10-30","Monument Mountain","Pathfinder RVT","18:00"],["2026-10-30","Bishop Feehan","La Salle Academy (R.I.)","18:00"],["2026-10-30","Saint John's","Boston College High","18:00"],["2026-10-30","Hull","Carver","18:00"],["2026-10-30","Cape Cod RVT","Atlantis Charter","18:00"],["2026-10-30","Gardner","Tyngsborough","18:00"],["2026-10-30","Barnstable","Bridgewater-Raynham","18:00"],["2026-10-30","Ashland","Norwood","18:00"],["2026-10-30","Hopkinton","Westwood","18:00"],["2026-10-30","Oliver Ames","Canton","18:00"],["2026-10-30","Malden","Somerville","18:00"],["2026-10-30","Medfield","Holliston","18:00"],["2026-10-30","Seekonk","West Bridgewater","18:00"],["2026-10-30","Franklin","Taunton","18:00"],["2026-10-30","Chelmsford","Lawrence","18:00"],["2026-10-30","North Andover","Lowell","18:00"],["2026-10-30","Needham","Framingham","18:00"],["2026-10-30","St. John's Prep","Catholic Memorial","18:00"],["2026-10-30","Millis","Dover-Sherborn","18:00"],["2026-10-30","Whittier RVT","Revere","18:00"],["2026-10-30","David Prouty","Abby Kelley Foster","18:00"],["2026-10-30","Sandwich","Nauset Regional","18:00"],["2026-10-30","Amesbury","Hamilton-Wenham","18:00"],["2026-10-30","Concord-Carlisle","Wayland","18:00"],["2026-10-30","Hingham","Silver Lake Regional","18:00"],["2026-10-30","Brookline","Wellesley","18:00"],["2026-10-30","Burlington","Wakefield Memorial","18:00"],["2026-10-30","Mansfield","King Philip Regional","18:00"],["2026-10-30","Duxbury","Plymouth North","18:00"],["2026-10-30","St. Mary's","Norton","18:00"],["2026-10-30","Reading Memorial","Woburn Memorial","18:00"],["2026-10-30","Wachusett Regional","Algonquin","18:00"],["2026-10-30","Joseph Case","Sharon","18:00"],["2026-10-30","Manchester Essex","Pentucket Regional","18:00"],["2026-10-30","Montachusett RVT","Nashoba Regional","18:00"],["2026-10-30","Holbrook","Monomoy","18:00"],["2026-10-30","Marshfield","Whitman-Hanson Reg.","18:00"],["2026-10-30","Newton North","Braintree","18:00"],["2026-10-30","Attleboro","Milford","18:00"],["2026-10-30","Medway","Bellingham","18:00"],["2026-10-30","Bishop Stang","Cardinal Spellman","18:00"],["2026-10-30","St. Bernard's","Oxford","18:30"],["2026-10-30","Shrewsbury","Westborough","18:30"],["2026-10-30","Lunenburg","Leicester","18:30"],["2026-10-30","Melrose","Stoneham","18:30"],["2026-10-30","Brockton","Durfee","18:30"],["2026-10-30","Keefe Tech","Southbridge","18:30"],["2026-10-30","Apponequet Regional","Dighton-Rehoboth","18:30"],["2026-10-30","North Reading","Essex North Shore","18:30"],["2026-10-30","Natick","Walpole","18:30"],["2026-10-30","Fairhaven","Greater New Bedford","18:30"],["2026-10-30","Lincoln-Sudbury","Cambridge Rindge & Lat.","18:30"],["2026-10-30","Nashua North (N.H.)","Dracut","18:30"],["2026-10-30","Stoughton","Wareham","18:30"],["2026-10-30","Boston Latin Academy","Brighton","18:30"],["2026-10-30","Cohasset","Mashpee","18:30"],["2026-10-30","Lynnfield","Newburyport","18:30"],["2026-10-30","Old Rochester Regional","Somerset Berkley Reg.","18:30"],["2026-10-30","McCann Tech","Belchertown","19:00"],["2026-10-30","Doherty Memorial","Tantasqua Regional","19:00"],["2026-10-30","Waltham","Boston Latin","19:00"],["2026-10-30","Agawam","Wahconah Regional","19:00"],["2026-10-30","KIPP Academy Lynn Coll.","Lowell Catholic","19:00"],["2026-10-30","Athol","Greenfield","19:00"],["2026-10-30","Methuen","Billerica Memorial","19:00"],["2026-10-30","Minnechaug","Longmeadow","19:00"],["2026-10-30","Acton-Boxborough","Bedford","19:00"],["2026-10-30","Blackstone Valley RVT","Assabet Valley RVT","19:00"],["2026-10-30","Maynard","Hudson","19:00"],["2026-10-30","Masconomet Regional","Marblehead","19:00"],["2026-10-30","Andover","Tewksbury Memorial","19:00"],["2026-10-30","Arlington Catholic","Bishop Fenwick","19:00"],["2026-10-30","South High Community","Auburn","19:00"],["2026-10-30","Saugus","Swampscott","19:00"],["2026-10-30","Chicopee","Northampton","19:00"],["2026-10-30","Millbury","Northbridge","19:00"],["2026-10-30","Marlborough","Shepherd Hill Regional","19:00"],["2026-10-30","Diman RVT","Bristol-Plymouth RVT","19:00"],["2026-10-30","Springfield Central","West Springfield","19:00"],["2026-10-30","Easthampton","South Hadley","19:00"],["2026-10-30","Newton South","Westford Academy","19:00"],["2026-10-30","Weston","Fitchburg","19:00"],["2026-10-30","Southeastern RVT","Old Colony RVT","19:00"],["2026-10-30","Bay Path RVT","Uxbridge","19:00"],["2026-10-30","East Longmeadow","Westfield","19:00"],["2026-10-30","Quabbin Regional","Groton-Dunstable","19:00"],["2026-10-30","North Attleborough","Foxborough","19:00"],["2026-10-30","East Bridgewater","Abington","19:00"],["2026-10-30","Scituate","Hanover","19:00"],["2026-10-30","Danvers","Peabody Veterans","19:00"],["2026-10-30","Bartlett","Narragansett Regional","19:00"],["2026-10-30","Middleborough","Rockland","19:00"],["2026-10-30","Murdock","Ayer Shirley","19:00"],["2026-10-30","Watertown","Wilmington","19:00"],["2026-10-30","Mahar Regional","Franklin County Tech","19:00"],["2026-10-30","New Bedford","Dartmouth","19:00"],["2026-10-30","Ludlow","Frontier Regional","19:00"],["2026-10-30","West Boylston","Oakmont Regional","19:00"],["2026-10-30","Plymouth South","North Quincy","19:00"],["2026-10-30","Amherst-Pelham Reg.","Chicopee Comp.","19:00"],["2026-10-30","Nashoba Valley Tech","Lynn Vo-Tech","19:30"],["2026-10-31","Gloucester","Beverly","11:00"],["2026-10-31","Blackstone-Millville","Burncoat","12:00"],["2026-10-31","Clinton","Nipmuc Regional","12:00"],["2026-10-31","Martha's Vineyard Reg.","Nantucket","15:00"]];
function wkKey(r){return pairKey([r[0],r[1],r[2],null,null,0])}
function wkScore(r){return edits.find(g=>pairKey(g)===wkKey(r))||source.get(wkKey(r))}
function wkGames(){const q=(el('weekSearch')?.value||'').trim().toLowerCase();return WEEK8.filter(r=>(weekDiv===0||DIV[r[1]]===weekDiv||DIV[r[2]]===weekDiv)&&(!q||(r[1]+' '+r[2]).toLowerCase().includes(q))).sort((a,b)=>a[0].localeCompare(b[0])||a[3].localeCompare(b[3])||a[1].localeCompare(b[1]))}
function wkTime(t){let [h,m]=t.split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`}
// Scores are estimated locally from official baseline ratings and actual 2026 team scoring.
// This is a transparent ratings model, NOT an online generative AI prediction service.
const PRED_STORE='miaa-week8-auto-picks-2026-v1';
let predictedKeys=new Set();
try{const arr=JSON.parse(localStorage.getItem(PRED_STORE)||'[]');if(Array.isArray(arr))predictedKeys=new Set(arr.filter(x=>typeof x==='string'));}catch{}
const seasonPoints={};
for(const g of DATA.games){if(g[3]===null||g[4]===null||!validScore(g[3])||!validScore(g[4])||g[5])continue;
 for(const [team,scored,allowed] of [[g[1],g[3],g[4]],[g[2],g[4],g[3]]]){
 const stat=seasonPoints[team]||(seasonPoints[team]={games:0,scored:0,allowed:0});
 stat.games++;stat.scored+=scored;stat.allowed+=allowed;
 }}
function originalRating(team){return OFF[team]?OFF[team][1]:BASE.teams[team]?BASE.teams[team].raw+offset:0;}
function estimateGameScore(r){
 const a=r[1],b=r[2],aa=seasonPoints[a],bb=seasonPoints[b];
 const avg=(s,k)=>s&&s.games?s[k]/s.games:21;
 const scoringA=.60*avg(aa,'scored')+.40*avg(bb,'allowed');
 const scoringB=.60*avg(bb,'scored')+.40*avg(aa,'allowed');
 const gap=originalRating(a)-originalRating(b);
 // Baseline team scoring establishes total points, with relative strength anchoring margin.
 const total=Math.max(14,Math.min(85,scoringA+scoringB));
 const form=scoringA-scoringB;
 const margin=Math.max(-35,Math.min(35,.75*gap+.25*form));
 let sa=Math.max(0,Math.round((total+margin)/2)),sb=Math.max(0,Math.round((total-margin)/2));
 // High-school football can have ties during regulation but a finished matchup normally has a winner.
 if(sa===sb){if(gap>=0)sa+=1;else sb+=1;}
 return [sa,sb];
}
function predictAllWeek8(){
 const done=new Set(edits.map(g=>pairKey(g)));
 const scored=WEEK8.filter(r=>!done.has(wkKey(r))&&!(source.has(wkKey(r))&&source.get(wkKey(r))[3]!==null));
 if(!scored.length){toast('Every Week 8 game already has a score. Clear scores to generate more.');return}
 for(const r of scored){const [sa,sb]=estimateGameScore(r);edits.push([r[0],r[1],r[2],sa,sb,0]);predictedKeys.add(wkKey(r))}
 save();toast('Estimated '+scored.length+' games across all divisions. Manual scores preserved.');
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
 const record=div&&m?`${m.w}–${m.l}${m.ties?'–'+m.ties:''}`:'—';
 const rating=div&&m?signed(m.rating):'—';
 return `<span class="fixture-data" data-meta-team="${esc(name)}"><span class="fixture-rec">${record}</span><span class="fixture-div">${div?'D'+div:'—'}</span><span class="fixture-rate">${rating}</span></span>`;
}
function renderWeek8(){
 const filters=el('weekFilters');if(!filters)return;
 filters.innerHTML=[0,1,2,3,4,5,6,7,8].map(d=>`<button type="button" data-wdiv="${d}" class="weekFilter ${weekDiv===d?'selected':''}">${d===0?'All':`D${d}`}</button>`).join('');
 const games=wkGames();el('weekMeta').textContent=`${games.length} matchups · ${games.filter(r=>{const g=wkScore(r);return g&&validScore(g[3])&&validScore(g[4])&&g[3]!==null&&g[4]!==null}).length} scores entered`;
 el('fixtureList').innerHTML=games.map(r=>{
 const [date,a,b,time]=r, k=wkKey(r),g=wkScore(r),has=!!(g&&g[3]!==null&&g[4]!==null);
 const edited=edits.some(x=>pairKey(x)===k),status=edited?(predictedKeys.has(k)?'Model prediction':'Scenario applied'):has?'Final score':'Not entered';
 return `<div class="fixture ${edited?'fixture-edited':''}" data-fixture="${esc(k)}">
   <div class="fixturetop"><span class="fixture-date">${date==='2026-10-29'?'THU':date==='2026-10-30'?'FRI':'SAT'} · OCT ${date.slice(-2)} · ${wkTime(time)}</span><span class="fixture-cols"><span>W–L</span><span>DIV</span><span>RATING</span></span><span class="fixture-pts-heading">PTS / MAX</span></div>
   <div class="fixtureline"><div class="fixtureteam"><span class="place">A</span><button type="button" class="fixture-team-link" data-team="${esc(a)}" title="View ${esc(a)} team details">${teamMark(a)}${esc(a)}</button></div>${wkTeamData(a)}<div class="score-actions"><input class="fixture-score" data-side="a" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Score for ${esc(a)}" value="${has?g[3]:''}" placeholder="—"><button type="button" class="max-win" data-max="a" title="Set ${esc(a)} to win 14–0">MAX</button></div></div>
   <div class="fixtureline"><div class="fixtureteam"><span class="place">B</span><button type="button" class="fixture-team-link" data-team="${esc(b)}" title="View ${esc(b)} team details">${teamMark(b)}${esc(b)}</button></div>${wkTeamData(b)}<div class="score-actions"><input class="fixture-score" data-side="b" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" aria-label="Score for ${esc(b)}" value="${has?g[4]:''}" placeholder="—"><button type="button" class="max-win" data-max="b" title="Set ${esc(b)} to win 14–0">MAX</button></div></div>
   <div class="fixturebottom ${has?'has-score':''}"><span class="fixtureStatus ${edited?'saved':''}">${status}</span><button type="button" class="fixtureClear" data-clear="${esc(k)}" ${edited?'':'disabled'}>Remove score</button></div>
 </div>`;
 }).join('');el('clearPredictions').disabled=!predictedKeys.size;refreshMarks();
}
function updateWeek8States(){
 const list=el('fixtureList');if(!list)return;let n=0;
 for(const card of list.querySelectorAll('[data-fixture]')){
 const entered=edits.find(g=>pairKey(g)===card.dataset.fixture),base=source.get(card.dataset.fixture), g=entered||base;
 const has=!!(g&&g[3]!==null&&g[4]!==null);if(has)n++;
 const lab=card.querySelector('.fixtureStatus');lab.textContent=entered?(predictedKeys.has(card.dataset.fixture)?'Model prediction':'Scenario entered'):has?'Final':'Not entered';lab.classList.toggle('saved',!!entered);
 for(const [side,index] of [['a',3],['b',4]]){const input=card.querySelector(`[data-side=${side}]`);if(input!==document.activeElement){const target=has?String(g[index]):'';if(input.value!==target)input.value=target;}}
 card.classList.toggle('fixture-edited',!!entered);
 card.querySelector('.fixturebottom').classList.toggle('has-score',!!has);
 // Never replace the score inputs: the user may be in the middle of typing.
 for(const row of card.querySelectorAll('[data-meta-team]')){
   const name=row.dataset.metaTeam, m=MODEL.teams[name], div=DIV[name];
   row.querySelector('.fixture-rec').textContent=div&&m?`${m.w}–${m.l}${m.ties?'–'+m.ties:''}`:'—';
   row.querySelector('.fixture-div').textContent=div?'D'+div:'—';
   row.querySelector('.fixture-rate').textContent=div&&m?signed(m.rating):'—';
 }
 card.querySelector('.fixtureClear').disabled=!entered;
 }
 el('weekMeta').textContent=`${wkGames().length} matchups · ${n} scores entered`;el('clearPredictions').disabled=!predictedKeys.size;
}
 function initWeek8(){
 el('weekJump').onclick=()=>{document.querySelector('[data-side-tab=week8]').click();el('week8View').scrollIntoView({behavior:'auto',block:'start'})};
 const tabs=document.querySelector('.sideTabs');tabs.addEventListener('click',e=>{const b=e.target.closest('[data-side-tab]');if(!b)return;const name=b.dataset.sideTab;tabs.querySelectorAll('.sideTab').forEach(x=>x.classList.toggle('selected',x===b));for(const n of ['week8','custom','changes'])el(n+'View').classList.toggle('hidden',name!==n)});
 el('predictWeek8').addEventListener('click',predictAllWeek8);el('clearPredictions').addEventListener('click',clearAllPredictions);
 el('weekSearch').addEventListener('input',renderWeek8);
 el('weekFilters').addEventListener('click',e=>{const btn=e.target.closest('[data-wdiv]');if(!btn)return;weekDiv=Number(btn.dataset.wdiv);selectedDiv=weekDiv;renderRankings();renderWeek8()});
 el('fixtureList').addEventListener('input',e=>{
   const inp=e.target.closest('.fixture-score');if(!inp)return;
   let card=inp.closest('[data-fixture]');let a=card.querySelector('[data-side=a]').value.trim(),b=card.querySelector('[data-side=b]').value.trim();
   if((a&&!/^\d{1,3}$/.test(a))||(b&&!/^\d{1,3}$/.test(b))){card.querySelector('.fixtureStatus').textContent='Whole-number scores only';return}
   if(!a||!b){card.querySelector('.fixtureStatus').textContent='Enter both scores';return}
   const r=WEEK8.find(r=>wkKey(r)===card.dataset.fixture);if(!r)return;
   const g=[r[0],r[1],r[2],Number(a),Number(b),0];
   const prev=edits.find(x=>pairKey(x)===card.dataset.fixture);if(prev&&prev[3]===g[3]&&prev[4]===g[4])return;
   edits=edits.filter(x=>pairKey(x)!==card.dataset.fixture);edits.push(g);predictedKeys.delete(card.dataset.fixture);save();
 });
 el('fixtureList').addEventListener('click',e=>{
   const teamButton=e.target.closest('.fixture-team-link');
   if(teamButton){showTeam(teamButton.dataset.team);return;}
   const maxBtn=e.target.closest('[data-max]');
   if(maxBtn){const card=maxBtn.closest('[data-fixture]'),r=WEEK8.find(x=>wkKey(x)===card.dataset.fixture);if(!r)return;
     const scoreA=maxBtn.dataset.max==='a'?14:0,scoreB=maxBtn.dataset.max==='b'?14:0;
     edits=edits.filter(g=>pairKey(g)!==card.dataset.fixture);
     edits.push([r[0],r[1],r[2],scoreA,scoreB,0]);predictedKeys.delete(card.dataset.fixture);
     card.querySelector('[data-side=a]').value=scoreA;card.querySelector('[data-side=b]').value=scoreB;save();return;
   }
   const btn=e.target.closest('[data-clear]');if(!btn)return;
   edits=edits.filter(g=>pairKey(g)!==btn.dataset.clear);predictedKeys.delete(btn.dataset.clear);save();
   const card=btn.closest('[data-fixture]');card.querySelectorAll('.fixture-score').forEach(x=>x.value='');updateWeek8States();
 });
 // Score inputs keep focus while the calculated records and ratings refresh.
 renderWeek8();
}

init();
initWeek8();


