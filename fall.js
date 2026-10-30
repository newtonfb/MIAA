'use strict';
const $=id=>document.getElementById(id);
const escapeHTML=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(x,d=4)=>Number.isFinite(x)?(x>0?'+':'')+x.toFixed(d):'—';
const SPORT_ORDER=['field-hockey','boys-soccer','girls-soccer','volleyball'];
const ICONS={'field-hockey':'🏑','boys-soccer':'⚽','girls-soccer':'⚽','volleyball':'🏐'};
let sport='field-hockey',division=1,search='',selected='',scenarios=[],base=null,model=null,check=null,names=[],official={},data=null;
let lastModel={};
function games(){return data.games.concat(scenarios)}
function origin(id){return 'miaa-fall-2026-v1:'+id;}
function sortTeams(a,b){return b.rating-a.rating||a.team.localeCompare(b.team)}
function validateModel(){
  const keys=Object.keys(official);
  if(!keys.length)return {max:Infinity,mae:Infinity,rankWrong:[]};
  const offset=keys.reduce((acc,t)=>acc+official[t][1]-base.teams[t].raw,0)/keys.length;
  let maximum=0,total=0;
  for(const t of keys){
    let e=Math.abs(base.teams[t].raw+offset-official[t][1]);
    maximum=Math.max(e,maximum);total+=e;
  }
  const misses=[];
  for(let d=1;d<=Math.max(...Object.values(data.divisions));d++){
    const teams=keys.filter(t=>data.divisions[t]===d).sort((a,b)=>base.teams[b].raw-base.teams[a].raw);
    teams.forEach((t,i)=>{if(official[t][0]!==i+1)misses.push(t)});
  }
  return {max:maximum,mae:total/keys.length,rankWrong:misses};
}
function derive(){
  model=calculateRatings(games(),names,data.divisions,data.cap);
  for(const t of names){
    const prev=base.teams[t];
    model.teams[t].rating=(official[t]?official[t][1]:prev.raw)+model.teams[t].raw-prev.raw;
    model.teams[t].change=model.teams[t].raw-prev.raw;
  }
}
function loadSport(slug){
  if(typeof FALL_DATA==='undefined'||!FALL_DATA.sports?.[slug])return;
  sport=slug;data=FALL_DATA.sports[slug];official=data.official;
  names=[...new Set(data.games.flatMap(g=>[g[1],g[2]]).concat(Object.keys(official)))].sort((a,b)=>a.localeCompare(b));
  try{let p=JSON.parse(localStorage.getItem(origin(slug))||'[]');scenarios=Array.isArray(p)?p.filter(g=>Array.isArray(g)&&g.length===6&&names.includes(g[1])&&names.includes(g[2])&&Number.isInteger(g[3])&&Number.isInteger(g[4])&&!data.games.some(h=>h[0]===g[0]&&[h[1],h[2]].sort().join('|')===[g[1],g[2]].sort().join('|'))):[]}catch{scenarios=[];}
  base=calculateRatings(data.games,names,data.divisions,data.cap);
  check=validateModel();
  derive();
  const choices=Object.keys(data.divisions).sort((a,b)=>a.localeCompare(b));
  const schoolOpts=choices.map(t=>'<option value="'+escapeHTML(t)+'">'+escapeHTML(t)+'</option>').join('');
  $('teamA').innerHTML=schoolOpts;$('teamB').innerHTML=schoolOpts;
  $('teamA').value=choices[0]||'';$('teamB').value=choices[1]||'';
  selected=choices[0]||'';
  document.querySelectorAll('[data-sport]').forEach(el=>{el.classList.toggle('active',el.dataset.sport===sport);el.setAttribute('aria-pressed',el.dataset.sport===sport?'true':'false')});
  const ds=[...new Set(Object.values(data.divisions))].sort((a,b)=>a-b);
  $('division').innerHTML=ds.map(d=>'<option value="'+d+'">Division '+d+'</option>').join('');
  division=ds[0];$('division').value=division;$('search').value='';search='';
  $('sportTitle').textContent=data.title+' Rankings';
  const count=Object.keys(official).length;
  const row=(label,value,note)=>'<div class="stat"><small>'+label+'</small><strong>'+value+'</strong><span>'+note+'</span></div>';
  $('summary').innerHTML=row('SCHOOLS',count,'Published ratings')+row('DIVISIONS',ds.length,'Statewide')+row('COMPLETED',data.games.length,'Reported games')+row('SCORING CAP',data.cap,sport==='volleyball'?'Sets, not points':'Goals per game');
  $('max').textContent='MAX +'+data.cap;
  document.title=data.title+' | MA Power Rankings';
  render();
}
function ranked(){
  return Object.keys(official).filter(t=>data.divisions[t]===division).map(t=>model.teams[t]).sort(sortTeams);
}
function render(){
  if(!data)return;
  const rows=ranked(),q=search.trim().toLowerCase();
  const visible=rows.map((v,i)=>({...v,position:i+1})).filter(r=>r.team.toLowerCase().includes(q));
  $('standings').innerHTML=visible.map(r=>{
    let old=official[r.team][0];let diff=old-r.position;const rec=r.w+'–'+r.l+(r.ties?'–'+r.ties:'');
    return '<button class="team-row '+(r.position<=32?'top32 ':'')+(r.team===selected?'selected':'')+'" type="button" data-team="'+escapeHTML(r.team)+'">'
     +'<span class="place"><span class="position">'+r.position+'</span><span class="team-name" title="'+escapeHTML(r.team)+'">'+escapeHTML(r.team)+'</span>'+(diff&&scenarios.length?'<span class="rank-move">'+(diff>0?'↑':'↓')+Math.abs(diff)+'</span>':'')+'</span>'
     +'<span class="record">'+rec+'</span><span class="number"><b>'+num(r.rating)+'</b>'+(scenarios.length?'<small class="delta '+(r.change<0?'negative':'')+'">'+num(r.change)+'</small>':'')+'</span></button>';
  }).join('')||'<div class="empty">No matching schools.</div>';
  $('rowsCount').textContent=visible.length+' of '+rows.length+' teams · Top 32 shown with green rank numbers; eligibility and play-ins may differ.';
  $('warning').className='notice'+(check.max>0.05||data.unmatchedScoreLines>30?' warn':'');
  const max=Number.isFinite(check.max)?check.max.toFixed(4):'unavailable';
  $('warning').textContent='Model accuracy check: maximum difference '+max+' rating points across '+Object.keys(official).length+' teams; '+check.rankWrong.length+' rank differences. '+(check.max>0.05?'Experimental projection — the game data or special adjustments still need reconciliation.':'Small differences can still affect close playoff rankings.');
  renderScenarios();
  renderTeam();
}
function renderScenarios(){
  $('scenarios').innerHTML=scenarios.length?scenarios.map((g,i)=>'<div class="scenario"><span>'+escapeHTML(g[1])+' '+g[3]+'–'+g[4]+' '+escapeHTML(g[2])+'</span><button type="button" title="Remove" aria-label="Remove simulated game" data-delete="'+i+'">✕</button></div>').join(''):'<div class="fineprint">No scenarios added yet. Official October 30 ratings are displayed.</div>';
}
function renderTeam(){
  if(!selected||!data)return;
  const t=selected,info=model.teams[t],ref=official[t];
  $('teamTitle').textContent=t;
  if(!info){$('teamDetails').innerHTML='No data';return;}
  const metrics=[
    ['Projected rating',num(info.rating)],['Official rating',ref?num(ref[1]):'—'],
    ['Avg. capped margin',num(info.mov)],['Strength of schedule',num(info.rating-info.mov)],
  ];
  const matches=games().filter(g=>g[1]===t||g[2]===t).sort((a,b)=>b[0].localeCompare(a[0]));
  $('teamDetails').innerHTML='<div class="detail-metrics">'+metrics.map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('')+'</div>'
   +'<div class="game-list">'+matches.map(g=>{
     const left=g[1]===t,score=left?g[3]+'–'+g[4]:g[4]+'–'+g[3];
     const opp=left?g[2]:g[1],win=left?g[3]>g[4]:g[4]>g[3],tie=g[3]===g[4];
     const isScenario=scenarios.includes(g);
     return '<div class="game"><span>'+escapeHTML(opp)+' <small>'+g[0].slice(5)+(isScenario?' • scenario':'')+'</small></span><b>'+(tie?'T':win?'W':'L')+' '+score+'</b></div>';
   }).join('')+'</div>';
}
function save(){
  localStorage.setItem(origin(sport),JSON.stringify(scenarios));derive();render();
}
function error(text){
  const el=$('error');el.className='notice warn';el.textContent=text;
}
function boot(){
  if(typeof FALL_DATA==='undefined'||!FALL_DATA.sports){
    error('Fall-sports data has not been imported yet. Football is available from the sport bar.');
    $('sportTitle').textContent='Data unavailable';return;
  }
  document.querySelectorAll('[data-sport]').forEach(b=>b.addEventListener('click',()=>loadSport(b.dataset.sport)));
  $('division').addEventListener('change',e=>{division=Number(e.target.value);selected=ranked()[0]?.team||'';render()});
  $('search').addEventListener('input',e=>{search=e.target.value;render()});
  $('standings').addEventListener('click',e=>{
    const b=e.target.closest('[data-team]');if(b){selected=b.dataset.team;render()}
  });
  $('whatif').addEventListener('submit',e=>{
    e.preventDefault();const a=$('teamA').value,b=$('teamB').value,sa=+$('scoreA').value,sb=+$('scoreB').value;
    if(a===b){error('Choose two different teams.');return;}
    if(!Number.isInteger(sa)||!Number.isInteger(sb)||sa<0||sb<0||sa>99||sb>99){error('Scores must be whole numbers between 0 and 99.');return;}
    if(sport==='volleyball'&&!(sa===3||sb===3)){error('Volleyball uses sets won: one team must win three sets.');return;}
    const same=g=>[g[1],g[2]].sort().join('|')===[a,b].sort().join('|');
    if(scenarios.some(same)){error('That matchup already has a scenario. Remove it first.');return;}
    scenarios.push(['2026-10-31',a,b,sa,sb,0]);
    selected=a;save();
    $('error').className='notice hidden';
  });
  $('max').addEventListener('click',()=>{$('scoreA').value=3;$('scoreB').value=0;});
  $('scenarios').addEventListener('click',e=>{const b=e.target.closest('[data-delete]');if(!b)return;scenarios.splice(Number(b.dataset.delete),1);save()});
  $('reset').addEventListener('click',()=>{if(!scenarios.length)return;scenarios=[];save()});
  loadSport(SPORT_ORDER.includes(location.hash.slice(1))?location.hash.slice(1):SPORT_ORDER[0]);
}
boot();
