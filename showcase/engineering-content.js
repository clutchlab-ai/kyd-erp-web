/* Preserve the native engineering workspace; add original change-record contents only. */
(()=>{
 'use strict';
 const D=window.D,E=v=>D.esc(v??''),module=D.modules.engineering,original=module.render,previousSeed=module.seed;
 const engineer=()=>D.state.people.find(p=>p.id===D.actor.id)?.active!==false&&D.state.people.find(p=>p.id===D.actor.id)?.profile==='engineering_assistant';
 const visible=p=>!!p&&p.company===D.company&&(['ceo','chairman','admin'].includes(D.role)||D.company===D.actor.company)&&(['manager','ceo','chairman','admin'].includes(D.role)||D.role==='employee'&&engineer()&&p.work.some(w=>w.assigneeId===D.actor.id));
 const manages=p=>visible(p)&&['manager','admin'].includes(D.role);
 const project=id=>(D.state.engineeringProjects||[]).find(p=>p.id===id);
 const records=()=>D.state.engineeringChanges||[];
 const label=phase=>phase==='withdrawn'?'已撤回':'提出待評估';
 const button=(text,action,id,extra='')=>`<button type="button" class="btn" data-action="${action}" data-id="${E(id)}" ${extra}>${text}</button>`;
 const snapshot=r=>({title:r.title,reason:r.reason,impactCents:r.impactCents,impactDays:r.impactDays,phase:r.phase,notes:r.notes});
 function seed(s){previousSeed?.(s);s.engineeringChanges??=[];}
 function saveChange(projectId,values,id='',revision=null){
  const p=project(projectId),old=id?records().find(r=>r.id===id&&r.projectId===projectId):null;
  if(!manages(p))throw Error('只有本工程的主管可登記或修改變更。');
  if(id&&!old)throw Error('找不到這筆工程變更。');
  if(old&&old.revision!==revision)throw Error('變更內容已更新，請重新開啟。');
  const title=String(values.title||'').trim(),reason=String(values.reason||'').trim(),notes=String(values.notes||'').trim(),amount=String(values.impactAmount??'').trim(),impactDays=Number(values.impactDays);
  if(!title||title.length>160||!reason||reason.length>2000||notes.length>2000)throw Error('請填寫變更主旨與原因，並確認字數。');
  if(!/^-?\d{1,10}(?:\.\d{1,2})?$/.test(amount)||Math.abs(Number(amount))>1000000000)throw Error('費用影響須為有效金額，最多兩位小數；減少可填負數。');
  if(String(values.impactDays??'').trim()===''||!Number.isInteger(impactDays)||Math.abs(impactDays)>3650)throw Error('工期影響須為 -3650 至 3650 的整數天數。');
  if(!['proposed','withdrawn'].includes(values.phase))throw Error('工程變更只登記提出或撤回，不會直接核准預算。');
  const impactCents=Math.round(Number(amount)*100),before=old?snapshot(old):null;
  const r=old||{id:`EC-${Date.now()}-${records().length+1}`,projectId,company:p.company,createdBy:D.actor.id,createdAt:D.today,revision:0,history:[]};
  D.mutate(()=>{Object.assign(r,{title,reason,notes,impactCents,impactDays,phase:values.phase});r.revision++;r.history.push({at:D.today,actor:D.actor.name,revision:r.revision,before,after:snapshot(r)});if(!old)records().push(r);D.log(`${p.name}：${old?'更新':'登記'}工程變更 ${title}`)});
  return r;
 }
 function history(r){return `<details class="space-top"><summary>變更版本與處理紀錄 (${r.history.length})</summary><div class="timeline">${r.history.map(h=>`<article><strong>V${E(h.revision)} · ${E(h.actor)}</strong><p class="mini">${E(h.at)}</p><p>${E(h.after.title)} · ${E(label(h.after.phase))}</p><p>${E(h.after.reason)}</p><p>費用影響 ${E(D.money(h.after.impactCents/100))} · 工期 ${E(h.after.impactDays)} 天</p>${h.before?`<p class="mini">保留前版：${E(h.before.title)} · ${E(label(h.before.phase))} · ${E(D.money(h.before.impactCents/100))} · ${E(h.before.impactDays)} 天</p>`:''}</article>`).join('')}</div></details>`;}
 function content(p){const rows=records().filter(r=>r.projectId===p.id&&r.company===p.company);return `<section class="card"><div class="row"><div><h2>工程變更</h2><p class="muted">先記錄變更原因、費用及工期影響，保留每次修正內容。</p></div>${manages(p)?button('登記變更','engineering-change-new',p.id):''}</div><p class="notice blue">費用影響只登記提供的金額，不自動修改原預算表、核准預算、會計入帳或付款。驗收在工作項目內處理。</p></section><div class="grid two space-top">${rows.map(r=>`<article class="card"><div class="row"><span class="mini">${E(r.id)} · V${E(r.revision)}</span>${D.badge(label(r.phase),r.phase==='withdrawn'?'neutral':'amber')}</div><h3>${E(r.title)}</h3><p>${E(r.reason)}</p><div class="grid two"><div><small>費用影響</small><p><strong>${E(D.money(r.impactCents/100))}</strong></p></div><div><small>工期影響</small><p><strong>${E(r.impactDays)} 天</strong></p></div></div>${r.notes?`<p>${E(r.notes)}</p>`:''}<div class="action-row">${manages(p)?button('修改／撤回','engineering-change-edit',r.id):''}</div>${history(r)}</article>`).join('')||D.empty('尚未登記工程變更','由工程主管登記；不以歷史操作訊息代替變更內容。')}</div>`;}
 module.seed=seed;
 module.render=(params={})=>{
  const normalized={...params,id:params.id||params.detail,tab:({change:'changes',progress:'work',cost:'budget'})[params.tab]||params.tab};
  if(!normalized.id&&!normalized.tab){const rows=(D.state.engineeringProjects||[]).filter(visible);return `<header class="page-head"><div><p class="eyebrow">採購與工程</p><h1>工程與專案</h1><p class="lede">工作進度、文件版本、預算與變更紀錄。</p></div>${['manager','admin'].includes(D.role)?button('新增工程專案','engineering-project-new',''):''}</header><div class="grid two">${rows.map(p=>`<section class="card"><div class="row"><h2>${E(p.name)}</h2>${D.badge(p.work.length&&p.work.every(w=>w.status==='accepted')?'全部工作已驗收':'執行中','blue')}</div><p>${E(p.company)} · ${E(p.site)}</p><p>${p.work.length} 項工作 · ${p.work.filter(w=>w.status==='inspection').length} 項待驗收</p><p class="mini">${p.work.map(w=>E(w.title)).join(' · ')}</p><a class="btn" href="#view=engineering&id=${E(p.id)}&tab=work">開啟專案</a></section>`).join('')||D.empty('目前沒有可查看的工程','請確認公司與專案指派範圍。')}</div>`;}

  const candidates=(D.state.engineeringProjects||[]).filter(visible),p=candidates.find(p=>p.id===normalized.id)||(!normalized.id?candidates[0]:null);
  if(!p)return normalized.id?`<header class="page-head"><h1>工程與專案</h1></header>${D.empty('這個工程不在可見範圍','請返回工程清單查看已指派的項目。')}`:original.call(module,normalized);
  let html=original.call(module,{...normalized,id:p.id});
  const toolbar=`<div class="toolbar"><a class="btn" href="#view=engineering">返回工程清單</a>${manages(p)&&(!normalized.tab||normalized.tab==='work')?button('新增工作','engineering-work-new',p.id):''}</div>`;
  html=toolbar+html;
  const start=html.indexOf('<nav class="subnav">'),end=start>=0?html.indexOf('</nav>',start):-1;
  if(end<0)return html;
  const nav=button('工程變更','project-tab',p.id,`data-tab="changes"${normalized.tab==='changes'?' aria-current="page"':''}`).replace('class="btn"',`class="btn${normalized.tab==='changes'?' primary':''}"`);
  const prefix=html.slice(0,end)+nav+'</nav>';
  return normalized.tab==='changes'?prefix+content(p):prefix+html.slice(end+6);
 };
 function edit(projectId,id=''){
  const p=project(projectId),r=id?records().find(r=>r.id===id&&r.projectId===projectId):null;
  if(!manages(p)||id&&!r)throw Error('無法修改這個工程的變更。');
  const revision=r?.revision;
  D.modal(r?'修改工程變更':'登記工程變更',`<p>${E(p.name)} · ${E(p.company)}</p><div class="form-grid"><label class="field full">變更主旨<input name="title" value="${E(r?.title)}" maxlength="160" required></label><label class="field full">變更原因<textarea name="reason" maxlength="2000" required>${E(r?.reason)}</textarea></label><label class="field">費用影響（USD）<input name="impactAmount" type="number" step="0.01" min="-1000000000" max="1000000000" value="${r?r.impactCents/100:''}" required></label><label class="field">工期影響（天）<input name="impactDays" type="number" step="1" min="-3650" max="3650" value="${r?E(r.impactDays):''}" required></label><label class="field">登記狀態${D.select('phase',[['proposed','提出待評估'],['withdrawn','已撤回']],r?.phase||'proposed')}</label><label class="field full">補充說明<textarea name="notes" maxlength="2000">${E(r?.notes)}</textarea></label></div><p class="notice">金額由提供人確認；此處不重做工程估價，不改原預算版本。0 表示無影響，負數表示減少。</p>`,v=>{saveChange(projectId,v,id,revision);D.go('engineering',{id:projectId,tab:'changes'})},'儲存變更紀錄');
 }
 D.on('engineering-change-new',el=>edit(el.dataset.id));
 D.on('engineering-change-edit',el=>{const r=records().find(r=>r.id===el.dataset.id);if(!r)throw Error('找不到變更。');edit(r.projectId,r.id)});
 const validDay=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 D.on('engineering-project-new',()=>{
  if(!['manager','admin'].includes(D.role)||D.role!=='admin'&&D.company!==D.actor.company)throw Error('請由本公司的工程主管建立專案。');
  const actor=D.actor.id,company=D.company;
  D.modal('新增工程專案',`<div class="form-grid"><label class="field full">專案名稱<input name="name" required maxlength="160"></label><label class="field full">場址／工作地點<input name="site" required maxlength="160"></label></div>`,v=>{
   if(D.actor.id!==actor||D.company!==company||!['manager','admin'].includes(D.role))throw Error('身分或公司已變更。');if(!v.name?.trim()||!v.site?.trim())throw Error('請填寫專案名稱與場址。');
   const p={id:'ENG-'+Date.now()+'-'+D.state.engineeringProjects.length,company,name:v.name.trim(),site:v.site.trim(),managerId:actor,work:[],documents:[],budget:{provided:false,total:0,version:'尚未提供',author:'待提供',date:D.today,rows:[]},history:[{at:D.today,actor:D.actor.name,text:'建立工程專案'}]};
   D.mutate(()=>{D.state.engineeringProjects.push(p);D.log('建立工程專案 '+p.name)});D.go('engineering',{id:p.id,tab:'work'});
  },'建立專案');
 });
 D.on('engineering-work-new',el=>{
  const p=project(el.dataset.id),actor=D.actor.id,company=D.company;if(!manages(p))throw Error('只有本工程的主管可指派工作。');
  const candidates=D.state.people.filter(x=>x.company===company&&x.active!==false&&['engineering_assistant','manager','technical'].includes(x.profile));
  D.modal('新增工程工作',`<div class="form-grid"><label class="field full">工作名稱<input name="title" maxlength="160" required></label><label class="field">承辦人${D.select('assigneeId',[['','請選擇'],...candidates.map(x=>[x.id,x.name+' · '+x.title])],'')}</label><label class="field">完成期限<input name="due" type="date" value="${D.today}" required></label><label class="field full">檢核點（每行一項）<textarea name="checkpoints" required maxlength="2000"></textarea></label><label class="field full">工作說明<textarea name="note" required maxlength="1000"></textarea></label></div>`,v=>{
   if(D.actor.id!==actor||D.company!==company||!manages(p))throw Error('身分或公司已變更。');
   const checks=String(v.checkpoints||'').split('\n').map(x=>x.trim()).filter(Boolean);if(!v.title?.trim()||!v.note?.trim()||!validDay(v.due)||!checks.length||checks.length>30||!candidates.some(x=>x.id===v.assigneeId&&x.active!==false&&x.company===company))throw Error('請填寫工作、有效日期、工程承辦人及 1 至 30 項檢核點。');
   const w={id:'EW-'+Date.now()+'-'+p.work.length,title:v.title.trim(),assigneeId:v.assigneeId,due:v.due,progress:0,status:'working',note:v.note.trim(),checkpoints:checks.map(label=>({label,done:false})),reports:[],inspections:[]};
   D.mutate(()=>{p.work.push(w);p.history.unshift({at:D.today,actor:D.actor.name,text:'新增並指派工作：'+w.title});D.log('指派工程工作 '+w.title)});D.go('engineering',{id:p.id,tab:'work',work:w.id});
  },'指派工作');
 });
 D.engineeringProjectVisible=visible;
 D.engineeringContentAPI={saveChange};
})();
