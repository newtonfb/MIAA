// Independent statewide MIAA power-rating engine; no third-party dependencies.
// The played-game equations form a graph Laplacian:
// degree[i] * rating[i] - sum(opponentRating) = sum(capped margins).
// Conjugate gradient solves that system to high precision rather than stopping a
// slowly converging Jacobi calculation after a fixed number of passes.
// The ratings are defined only up to a common constant, set by the caller's
// dated official MIAA reference. Forfeits are applied AFTER the opponent network.
'use strict';
function calculateRatings(games, teamNames, divisions, marginCap=14) {
  if(!Number.isFinite(marginCap)||marginCap<=0)throw new Error('Invalid sport margin cap');
  const N=teamNames.length, index=new Map(teamNames.map((t,i)=>[t,i]));
  const degrees=new Float64Array(N), rhs=new Float64Array(N);
  const marginSum=new Float64Array(N), count=new Int32Array(N);
  const wins=new Int32Array(N), losses=new Int32Array(N), ties=new Int32Array(N);
  const forfeitedLosses=new Int32Array(N), neighbors=Array.from({length:N},()=>[]);
  let played=0;
  for(const [date,a,b,sa,sb,forfeit] of games) {
    if(!Number.isInteger(sa)||!Number.isInteger(sb)||sa<0||sb<0||sa>999||sb>999) continue;
    const i=index.get(a), j=index.get(b);
    if(i===undefined||j===undefined||i===j) continue;
    const margin=Math.max(-marginCap,Math.min(marginCap,sa-sb));
    played++; count[i]++; count[j]++;
    marginSum[i]+=margin; marginSum[j]-=margin;
    if(sa>sb) { wins[i]++; losses[j]++; }
    else if(sb>sa) { wins[j]++; losses[i]++; }
    else { ties[i]++; ties[j]++; }
    if(forfeit) {
      if(sa>sb) forfeitedLosses[j]++;
      else if(sb>sa) forfeitedLosses[i]++;
      continue;
    }
    degrees[i]++;degrees[j]++;
    rhs[i]+=margin;rhs[j]-=margin;
    neighbors[i].push(j);neighbors[j].push(i);
  }
  const rating=new Float64Array(N), residual=new Float64Array(rhs);
  const z=new Float64Array(N), p=new Float64Array(N), Ap=new Float64Array(N);
  // Jacobi preconditioner. The rank-one term pins the global additive offset.
  let rz=0;
  for(let i=0;i<N;i++){ z[i]=residual[i]/Math.max(1,degrees[i]);p[i]=z[i];rz+=residual[i]*z[i]; }
  let iterations=0, convergence=Math.sqrt(residual.reduce((s,x)=>s+x*x,0));
  for(;iterations<Math.max(1000,10*N)&&convergence>1e-10;iterations++){
    let sumP=0;
    for(let i=0;i<N;i++) sumP+=p[i];
    const anchor=sumP/N;
    for(let i=0;i<N;i++) {
      let v=degrees[i]*p[i]+anchor;
      for(const j of neighbors[i]) v-=p[j];
      Ap[i]=v;
    }
    let pAp=0;
    for(let i=0;i<N;i++) pAp+=p[i]*Ap[i];
    if(!(pAp>0)) break;
    const step=rz/pAp;
    let square=0;
    for(let i=0;i<N;i++) {
      rating[i]+=step*p[i]; residual[i]-=step*Ap[i];
      square+=residual[i]*residual[i];
    }
    convergence=Math.sqrt(square);
    if(convergence<=1e-10) break;
    let nextRz=0;
    for(let i=0;i<N;i++) {
      z[i]=residual[i]/Math.max(1,degrees[i]);
      nextRz+=residual[i]*z[i];
    }
    for(let i=0;i<N;i++) p[i]=z[i]+nextRz/rz*p[i];
    rz=nextRz;
  }
  const teams={};
  for(let i=0;i<N;i++){
    const own=count[i]?marginSum[i]/count[i]:0;
    const playedOwn=degrees[i]?rhs[i]/degrees[i]:0;
    const opponent=degrees[i]?rating[i]-playedOwn:0;
    // The unaffected opponent-use rating is kept separate from the team's
    // displayed rating, whose own margin includes awarded forfeit results.
    teams[teamNames[i]]={
      team:teamNames[i],division:divisions[teamNames[i]]||null,
      w:wins[i],l:losses[i],ties:ties[i],gp:count[i],
      mov:own,opp:opponent,raw:own+opponent,
      adjusted:rating[i],rating:own+opponent,
      nonforfeit:degrees[i],forfeitLosses:forfeitedLosses[i]
    };
  }
  return {teams,iter:iterations,played,convergence};
}
// MIAA's iteration keeps the games-weighted total of adjusted (opponent-use) ratings at zero. Our solver pins a
// different total, so this returns the shift that puts a solution on MIAA's scale. Pass a degree adjustment to leave
// out games MIAA's ledger omits.
function miaaLevel(model,omittedDegree={}){
  let sum=0,games=0;
  for(const v of Object.values(model.teams)){const n=v.nonforfeit-(omittedDegree[v.team]||0);if(n>0){sum+=v.adjusted*n;games+=n}}
  return games?-sum/games:0;
}
if(typeof module!=='undefined' && module.exports) module.exports={calculateRatings,miaaLevel};
