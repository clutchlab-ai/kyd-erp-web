/* In-app meeting reminders. Derived only from local examples, never live roster data. */
(() => {
 'use strict';
 const D=window.D, E=v=>D.esc(v??'');
 const staff=()=>['hr','hrmanager','admin'].includes(D.role);
 const scope=()=>JSON.stringify([D.actor.id,D.company]);
 const key=(...parts)=>JSON.stringify(parts);
 const readMap=()=>D.state.notificationReads?.[scope()]||{};
 const sameCompany=x=>x.company===D.company&&(['ceo','chairman','admin'].includes(D.role)||D.company===D.actor.company);
 const bell='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>';
 function documentNotices(){
  const threshold=D.state.adminDemoSettings?.documentReminderDays??30;
  return (D.state.hrDocuments||[]).flatMap(doc=>{
   if(doc.supersededBy||!sameCompany(doc)||!staff()&&doc.employeeId!==D.actor.id)return [];
   const days=doc.expiresOn?D.daysUntil(doc.expiresOn):NaN;
   const due=Number.isFinite(days)&&days<=threshold;
   const follow=doc.followups?.at(-1);
   const overdueFollow=staff()&&follow?.nextOn&&follow.nextOn<=D.today&&follow.status!=='已收到新證件';
   if(!due&&!overdueFollow)return [];
   const stage=due?(days<0?'expired':'soon'):'followup';
   const owner=D.state.people.find(p=>p.id===doc.employeeId)?.name||'示例員工';
   const subject=doc.employeeId===D.actor.id?'你的':owner+'的';
   const status=stage==='expired'?'已到期':stage==='soon'?(days===0?'今天到期':'將於 '+days+' 天後到期'):'需要跟進';
   return [{id:key('document',doc.company,doc.id,doc.expiresOn,stage,stage==='followup'?follow.nextOn:''),kind:'document',documentId:doc.id,company:doc.company,title:subject+doc.label+status,message:(due?'有效至 '+doc.expiresOn+'。':'')+(staff()?'請確認補件與續辦進度。':'請聯絡人資，準備續辦資料。')+(overdueFollow?' 跟進日 '+follow.nextOn+' 已到。':''),label:stage==='expired'?'已到期':stage==='soon'?'即將到期':'待跟進',tone:stage==='expired'?'red':'amber',actionable:true,actionLabel:staff()?'查看並跟進':'查看證件',view:'documents',params:{source:'example',notificationDoc:doc.id},priority:stage==='expired'?0:1}];
  });
 }
 function taskNotices(){
  return D.inbox().filter(x=>D.allowed(x.view)&&(!x.company||sameCompany(x))&&x.status!=='draft'&&!/繼續填寫|儲存草稿/.test(x.actionLabel||'')).map(x=>({
   id:key('task',x.company||D.company,x.view,x.id,x.status||'',x.detail||x.subtitle||'',x.actionLabel||''),kind:'task',company:x.company||D.company,title:x.title,message:x.detail||x.subtitle||'有一筆工作輪到你處理。',label:'待處理',tone:'blue',actionable:true,actionLabel:x.actionLabel||'查看待辦',view:x.view,params:x.params||{id:x.id||''},priority:2
  }));
 }
 function resultNotices(){
  const labels={approved:'已核准',returned:'已退回',cancelled:'已銷假'}, kinds={leave:'請假',cancel:'銷假',overtime:'加班',field:'外勤'},pending=D.inbox();
  return (D.state.leaveRequests||[]).filter(x=>sameCompany(x)&&x.employeeId===D.actor.id&&labels[x.status]&&D.allowed('leave')&&!(x.status==='returned'&&pending.some(n=>n.view==='leave'&&n.id===x.id))).map(x=>({
   id:key('result',x.company,x.id,x.status,x.history?.length||0),kind:'result',company:x.company,title:'你的'+(kinds[x.kind]||'假勤')+'申請'+labels[x.status],message:(x.startDate||x.date||'')+' · '+(x.history?.at(-1)?.note||(x.status==='returned'?'請查看原因，補充後重新送出。':'可查看審核紀錄。')),label:labels[x.status],tone:x.status==='returned'?'amber':'green',actionable:x.status==='returned',actionLabel:x.status==='returned'?'查看並修改':'查看結果',view:'leave',params:{id:x.id},priority:x.status==='returned'?2:3
  }));
 }
 function personnelNotices(){
  if(!D.allowed('personnel'))return [];
  const candidates=[...(D.state.hrRequests||[]).map(r=>({...r,noticeKind:r.kind,noticeHistory:r.events||[]})),...(D.state.personnelContent?.rows||[]).filter(r=>D.personnelContentAPI?.visible(r)).map(r=>({...r,noticeKind:D.personnelContentAPI.kindNames[r.kind],noticeHistory:r.history||[]}))];
  return candidates.filter(r=>sameCompany(r)&&[r.employeeId,r.createdBy].includes(D.actor.id)&&(r.status==='applied'||r.status==='returned'&&r.createdBy!==D.actor.id)).map(r=>({
   id:key('personnel-result',r.company,r.id,r.status,r.noticeHistory.length),kind:'result',company:r.company,title:(r.employeeId===D.actor.id?'你的':'你經辦的')+r.noticeKind+(r.status==='applied'?'已生效':'已退回'),message:r.status==='applied'?'生效日 '+r.effectiveOn+'。查看變更結果與處理紀錄。':'人資會依退回原因補充資料，再重新送審。',label:r.status==='applied'?'已生效':'已退回',tone:r.status==='applied'?'green':'amber',actionable:false,actionLabel:'查看異動結果',view:'personnel',params:{id:r.id},priority:3
  }));
 }
 function workflowResults(){
  const providers=['kpiResults','attendanceResults','businessResults','payrollResults','accountingResults','projectResults','retainedResults','trainingResults'];
  return providers.flatMap(provider=>typeof D[provider]==='function'?(D[provider]()||[]).filter(n=>sameCompany(n)&&D.allowed(n.view)).map(n=>({
   id:key('workflow-result',provider,n.company,n.id,n.status||'',n.version??n.detail??''),kind:'result',company:n.company,title:n.title,message:n.detail||'',label:n.statusLabel||'結果通知',tone:'green',actionable:!!n.actionable,actionLabel:n.actionLabel||'開啟紀錄',view:n.view,params:n.params||{id:n.id},priority:3
  })):[]);
 }
 D.notifications=function(){
  const reads=readMap(),unique=new Map();
  [...documentNotices(),...taskNotices(),...resultNotices(),...personnelNotices(),...workflowResults()].forEach(n=>unique.set(n.id,{...n,unread:!reads[n.id]}));
  return [...unique.values()].sort((a,b)=>a.priority-b.priority||Number(b.unread)-Number(a.unread));
 };
 D.markNotificationsRead=function(ids){
  const allowed=new Set(D.notifications().map(n=>n.id));
  D.state.notificationReads??={};D.state.notificationReads[scope()]??={};
  for(const id of ids)if(allowed.has(id))D.state.notificationReads[scope()][id]=D.today;
  D.save();
 };
 function rows(items,compact=false){
  return items.length?items.map(n=>`<article class="notification-item ${n.unread?'is-unread':''}"><div class="notification-item-head">${D.badge(n.label,n.tone)}<span class="notification-read">${n.unread?'<i aria-hidden="true"></i> 未讀':'已讀'}</span></div><h3>${E(n.title)}</h3><p>${E(n.message)}</p><button class="${compact?'text-button':'btn'}" data-action="notification-open" data-id="${E(n.id)}">${E(n.actionLabel)} <span aria-hidden="true">→</span></button></article>`).join(''):D.empty('目前沒有提醒','後續有到期事項或輪到你處理的申請，會出現在這裡。');
 }
 function filters(active,drawer=false){
  return `<nav class="subnav notification-tabs" aria-label="通知分類">${[['all','全部'],['unread','未讀'],['action','待處理']].map(([v,l])=>drawer?`<button class="btn ${active===v?'primary':''}" data-action="notification-filter" data-filter="${v}" ${active===v?'aria-current="page"':''}>${l}</button>`:`<a href="#view=notifications&filter=${v}" class="${active===v?'active':''}">${l}</a>`).join('')}</nav>`;
 }
 const filtered=(items,filter)=>items.filter(n=>filter==='unread'?n.unread:filter==='action'?n.actionable:true);
 const context=()=>`<p class="notification-context">${E(D.actor.name)} · ${E(D.actor.label)} · ${E(D.company)}<br>流程示例；實際名冊與權限維持原樣。</p>`;
 function allReadButton(items){return `<button class="text-button" data-action="notification-read-all" ${items.some(n=>n.unread)?'':'disabled'}>全部標為已讀</button>`;}
 let drawerFilter='all';
 function drawerBody(){
  const items=D.notifications();
  return context()+`<div class="row"><span class="muted">${items.filter(n=>n.unread).length} 則未讀</span>${allReadButton(items)}</div>`+filters(drawerFilter,true)+`<div class="notification-list">${rows(filtered(items,drawerFilter))}</div><p class="notification-footnote">看過不等於處理完成；證件續期後，到期提醒才會解除。</p><button class="btn notification-all" data-action="notification-center">開啟所有通知</button>`;
 }
 function updateBell(){
  const button=document.querySelector('#notification-bell');if(!button)return;
  const count=D.notifications().filter(n=>n.unread).length;
  button.innerHTML=bell+(count?`<span class="notification-count">${count>99?'99+':count}</span>`:'');
  button.setAttribute?.('aria-label',`通知，${count} 則未讀（流程示例）`);
 }
 D.register('notifications',{title:'我的通知',group:'總覽',nav:false,navParent:'home',roles:Object.keys(D.roles),render(r){
  const items=D.notifications(),filter=['all','unread','action'].includes(r.filter)?r.filter:'all';
  return `<header class="page-head"><div><p class="eyebrow">個人工作 · 流程示例</p><h1>我的通知</h1><p class="lede">證件到期、待審工作與申請結果，在這裡查看。</p></div><a class="btn" href="#view=home">返回工作首頁</a></header><section class="card notification-center">${context()}<div class="row"><strong>${items.filter(n=>n.unread).length} 則未讀 · ${items.filter(n=>n.actionable).length} 件待處理</strong>${allReadButton(items)}</div>${filters(filter)}${rows(filtered(items,filter))}</section><p class="notification-footnote">站內提醒示例以 ${D.today} 為基準，證件預設到期前 ${D.state.adminDemoSettings?.documentReminderDays??30} 天提醒。已讀不會解除待辦；關閉網站後的 Email／手機推播尚未接通。</p>`;
 }});
 const home=D.modules.home;
 if(home){const previous=home.render;home.render=function(...args){
  const html=previous.apply(this,args),items=D.notifications().filter(n=>n.kind==='document'||n.kind==='result'&&n.actionable);
  const block=`<section class="card personal-reminders"><div class="section-title"><div><p class="eyebrow">${E(D.actor.name)} · 流程示例</p><h2>${staff()?'證件與個人提醒':'我的提醒'}</h2></div><a class="btn" href="#view=notifications&filter=action">查看所有通知</a></div><div class="reminder-grid">${rows(items.slice(0,3),true)}</div>${items.length>3?`<p class="muted">還有 ${items.length-3} 則提醒，可在通知中心查看。</p>`:''}</section>`;
  const header=html.match(/^<div class="page-head">[\s\S]*?<\/div><\/div>/)?.[0];
  const at=header?header.length:html.indexOf('</header>')+9;return at<9?block+html:html.slice(0,at)+block+html.slice(at);
 };}
 const originalRender=D.render.bind(D);D.render=function(...args){const result=originalRender(...args);updateBell();return result;};
 const originalClose=D.closeModal.bind(D);D.closeModal=function(){document.querySelector('#modal')?.classList.remove('notification-drawer');return originalClose();};
 D.on('notifications',()=>{drawerFilter='all';D.modal('通知',drawerBody());document.querySelector('#modal').classList.add('notification-drawer');});
 D.on('notification-filter',el=>{drawerFilter=['unread','action'].includes(el.dataset.filter)?el.dataset.filter:'all';document.querySelector('#modal-body').innerHTML=drawerBody();});
 D.on('notification-read-all',()=>{
  const drawer=document.querySelector('#modal')?.classList.contains?.('notification-drawer');
  D.markNotificationsRead(D.notifications().map(n=>n.id));D.render();
  if(drawer)document.querySelector('#modal-body').innerHTML=drawerBody();
  D.toast('已標為已讀；尚未完成的事項仍會保留。');
 });
 D.on('notification-center',()=>{D.closeModal();D.go('notifications');});
 D.on('notification-open',el=>{
  const item=D.notifications().find(n=>n.id===el.dataset.id);
  if(!item||!D.allowed(item.view)){D.closeModal();D.render();D.toast('這則提醒已更新，或不在目前可見範圍。');return;}
  D.markNotificationsRead([item.id]);D.closeModal();const before=location.hash;D.go(item.view,item.params);if(location.hash===before)D.render();else updateBell();
 });
 // Consume the one-shot deep link before opening, so saving a follow-up does not reopen it.
 const documents=D.modules.documents,priorAfter=documents?.afterRender;
 if(documents)documents.afterRender=function(r){
  priorAfter?.call(this,r);if(!r.notificationDoc||r.source==='real')return;
  const next={...r};delete next.notificationDoc;
  history.replaceState(null,'','#'+new URLSearchParams(next));
  const notice=D.notifications().find(n=>n.kind==='document'&&n.documentId===r.notificationDoc);
  if(notice)D.openDemoDocument?.(notice.documentId);else D.toast('這則證件提醒已更新，或不在目前可見範圍。');
 };
})();
