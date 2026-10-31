// Admin-only trigger for .github/workflows/sync-arbiter.yml.
//   POST /api/sync        {key}            starts a sync
//   GET  /api/sync        x-admin-key      status of the latest sync run
// Vercel environment variables:
//   ADMIN_SYNC_KEY  the passphrase admins type into the site
//   GITHUB_TOKEN    fine-grained token for this repository with Actions: read and write
//   GITHUB_REPO     optional, defaults to newtonfb/MIAA
'use strict';
const crypto=require('node:crypto');
const WORKFLOW='sync-arbiter.yml';

function keyMatches(given){
  const expected=process.env.ADMIN_SYNC_KEY||'';
  if(!expected||typeof given!=='string'||!given)return false;
  // Compare digests so the check takes the same time whatever the key's length or content.
  const a=crypto.createHash('sha256').update(given).digest(),b=crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a,b);
}
async function github(path,init={}){
  const repo=process.env.GITHUB_REPO||'newtonfb/MIAA';
  return fetch(`https://api.github.com/repos/${repo}${path}`,{...init,headers:{
    Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',
    Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,'User-Agent':'miaa-rankings-sync',...(init.headers||{})}});
}

module.exports=async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!process.env.ADMIN_SYNC_KEY||!process.env.GITHUB_TOKEN){
    return res.status(503).json({error:'Sync is not set up yet. Add ADMIN_SYNC_KEY and GITHUB_TOKEN in the Vercel project settings.'});
  }
  const key=req.method==='POST'?(req.body&&req.body.key):req.headers['x-admin-key'];
  if(!keyMatches(key))return res.status(401).json({error:'That admin key is not correct.'});

  if(req.method==='POST'){
    const r=await github(`/actions/workflows/${WORKFLOW}/dispatches`,{method:'POST',body:JSON.stringify({ref:'main'})});
    if(r.status!==204)return res.status(502).json({error:`GitHub refused to start the sync (${r.status}). Check that GITHUB_TOKEN can run Actions on this repository.`});
    return res.status(202).json({started:new Date().toISOString()});
  }
  if(req.method==='GET'){
    const r=await github(`/actions/workflows/${WORKFLOW}/runs?per_page=1&event=workflow_dispatch`);
    if(!r.ok)return res.status(502).json({error:`GitHub status check failed (${r.status}).`});
    const run=(await r.json()).workflow_runs?.[0];
    return res.status(200).json(run?{status:run.status,conclusion:run.conclusion,created:run.created_at,updated:run.updated_at,url:run.html_url}:{status:'none'});
  }
  res.setHeader('Allow','GET, POST');
  return res.status(405).json({error:'Method not allowed'});
};
