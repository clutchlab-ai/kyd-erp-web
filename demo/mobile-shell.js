/* Phone presentation and shared form protection over the same isolated workflows. */
(()=>{
 'use strict';
 const D=window.D,E=v=>D.esc(v??''),mq=window.matchMedia?.('(max-width: 760px)');
 const forced=document.body.dataset.mobileEntry==='true';
 D.mobileActive=forced||!!mq?.matches;
 D.mobileDirty=false;
 let pendingDiscard=null,editingHash=null;
 const icons={home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',approvals:'<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M9 2h6v4H9zM8 11h8M8 16h5"/>',modules:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',notifications:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',back:'<path d="m15 5-7 7 7 7"/>',next:'<path d="m9 5 7 7-7 7"/>'};
 const icon=name=>`<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.modules}</svg>`;
 const avatar=role=>({employee:'員',hr:'人',hrmanager:'主',manager:'工',finance:'財',ceo:'總',chairman:'董',admin:'管'})[role]||'人';
 const badge=n=>n?`<span class="phone-count">${n>99?'99+':n}</span>`:'';
 const unread=()=>D.notifications?.().filter(n=>n.unread).length||0;
 const groups=['總覽','行政人事','採購與工程','財務會計','外部系統'];
 const navTo=(view,params={})=>{if(!D.allowed(view)){D.toast('目前角色無法使用此模組。');return;}D.closeModal();const before=location.hash;D.go(view,params);if(before===location.hash)D.render();};
 D.mobileConfirmDiscard=function(action){
  if(D.mobileDirty&&document.querySelector('#modal')?.open){pendingDiscard=action;document.querySelector('#mobile-discard')?.showModal();return false;}
  action();return true;
 };
 D.mobileSelectRole=function(role){
  if(!Object.hasOwn(D.roles,role))return;
  return D.mobileConfirmDiscard(()=>{D.setRole(role);navTo('home');});
 };
 D.mobileReturnRoute=function(r=D.route()){
  if(!D.modules[r.view])return {view:'home'};
  const next={view:r.view};
  for(const k of ['tab','source','company','month','kind','status','filter','period'])if(r[k]!==undefined)next[k]=r[k];
  if(r.view==='engineering'&&r.work&&r.id)return {...next,id:r.id};
  if(r.id||r.detail||r.work||r.notificationDoc)return next;
  if(r.tab||r.kind||r.status||r.filter){delete next.tab;delete next.kind;delete next.status;delete next.filter;return next;}
  return {view:'home'};
 };
 function rolePicker(){
  D.modal('切換示例角色',`<div class="phone-role-grid">${Object.entries(D.roles).map(([key,p])=>`<button class="phone-role-card ${D.role===key?'selected':''}" data-action="mobile-role-select" data-role="${key}" aria-pressed="${D.role===key}"><span class="phone-avatar role-${key}">${avatar(key)}</span><strong>${E(p.label)}</strong><span>${E(p.name)}</span>${D.role===key?'<small>目前角色</small>':''}</button>`).join('')}</div><p class="phone-sheet-note">切換後進入該角色首頁；已儲存的申請與處理紀錄會保留。</p>`);
  document.querySelector('#modal')?.classList.add('phone-role-sheet');
 }
 function modules(){
  const visible=Object.values(D.modules).filter(m=>m.nav!==false&&D.allowed(m.id)&&!['home','notifications'].includes(m.id));
  D.modal('工作模組',`<div class="phone-module-groups">${groups.map(g=>{const items=visible.filter(m=>m.group===g);return items.length?`<section><h3>${g}</h3>${items.map(m=>`<button class="phone-module-row" data-action="mobile-nav" data-view="${m.id}"><span>${E(m.title)}</span>${icon('next')}</button>`).join('')}</section>`:''}).join('')}</div>`);
 }
 function header(){
  const r=D.route(),title=D.modules[r.view]?.title||'工作首頁',count=unread();
  const el=document.querySelector('#phone-header');if(!el)return;
  el.innerHTML=`<div class="phone-topline"><button class="phone-icon" data-action="mobile-back" aria-label="返回上層" ${r.view==='home'?'disabled':''}>${icon('back')}</button><div class="phone-title"><small>KYD ERP</small><strong>${E(title)}</strong></div><button class="phone-icon" data-action="notifications" aria-label="通知，${count} 則未讀">${icon('notifications')}${badge(count)}</button></div><div class="phone-identity"><button class="phone-person" data-action="mobile-role-picker" aria-label="切換角色，目前${E(D.actor.label)} ${E(D.actor.name)}"><span class="phone-avatar role-${D.role}">${avatar(D.role)}</span><span><strong>${E(D.actor.name)}</strong><small>${E(D.actor.label)}</small></span><span class="phone-switch-label">切換 ▾</span></button><button class="phone-company" data-action="mobile-company" ${['ceo','chairman','admin'].includes(D.role)?'':'disabled'} aria-label="查看公司 ${E(D.company)}">${E(D.company)}${['ceo','chairman','admin'].includes(D.role)?' ▾':''}</button></div>`;
  const bar=document.querySelector('#phone-navigation');if(!bar)return;
  bar.innerHTML=[['home','首頁','mobile-nav'],['approvals','待辦','mobile-nav'],['modules','模組','mobile-modules'],['notifications','通知','mobile-nav']].map(([id,label,action])=>`<button data-action="${action}" data-view="${id}" class="${r.view===id?'active':''}" ${r.view===id?'aria-current="page"':''}><span class="phone-nav-icon">${icon(id)}${id==='notifications'?badge(count):id==='approvals'?badge(D.inbox().length):''}</span><span>${label}</span></button>`).join('');
 }
 function phoneHome(){
  const tasks=D.inbox(),notes=D.notifications?.()||[],urgent=notes.filter(n=>n.kind==='document'),executive=['ceo','chairman'].includes(D.role);
  const roster=D.liveRosterInfo?.(),projects=(D.state.engineeringProjects||[]).filter(p=>p.company===D.company),posted=(D.state.financeDemo||[]).filter(p=>p.company===D.company&&p.status==='posted');
  const overview=executive?`<section class="phone-section phone-operations"><div class="section-title"><h2>公司概況</h2></div><div class="grid two"><a class="phone-operation" href="#view=people"><span>員工名冊</span><strong>${roster?.connected?E(roster.employeeCount):'—'}</strong><small>${roster?.connected?'查看員工與組織':'登入原系統後讀取名冊'}</small></a><a class="phone-operation" href="#view=engineering"><span>工程專案</span><strong>${projects.length}</strong><small>工作進度與驗收</small></a><a class="phone-operation" href="#view=performance&tab=results"><span>考核結果</span><strong>${(D.state.kpiPlans||[]).filter(p=>p.company===D.company&&p.status==='completed').length}</strong><small>查看已完成考核</small></a><a class="phone-operation" href="#view=accounting&tab=reports"><span>已入帳憑證</span><strong>${posted.length}</strong><small>查看財務報表</small></a></div></section>`:'';
  const shortcuts=[['leave','假勤申請','假'],['attendance','排班考勤','勤'],['personnel','人事異動','異'],['performance','考核管理','考'],['documents','證件合約','證'],['engineering','工程專案','工'],['procurement','採購作業','採'],['accounting','財務會計','財'],['salary','薪酬社保','薪'],['tasks','專案交辦','任']].filter(([v])=>D.allowed(v)).slice(0,8);
  return `<header class="phone-home-heading"><p>${E(D.company)} · ${D.today}</p><h1>${executive?'營運總覽':'今天的工作'}</h1></header><div class="phone-overview"><button data-action="mobile-nav" data-view="approvals"><span>待我處理</span><strong>${tasks.length}</strong><small>開啟待辦 ${icon('next')}</small></button><button data-action="mobile-nav" data-view="notifications"><span>未讀通知</span><strong>${notes.filter(n=>n.unread).length}</strong><small>查看提醒 ${icon('next')}</small></button></div>${urgent.length?`<section class="phone-alert"><span class="phone-alert-mark">!</span><div><strong>${E(urgent[0].title)}</strong><p>${urgent.length>1?'另有 '+(urgent.length-1)+' 筆證件提醒':'請確認續辦進度'}</p></div><button class="phone-icon" data-action="notification-open" data-id="${E(urgent[0].id)}" aria-label="開啟證件提醒">${icon('next')}</button></section>`:''}${overview}<section class="phone-section"><div class="section-title"><h2>我的待辦</h2><button class="text-button" data-action="mobile-nav" data-view="approvals">全部 ${tasks.length} 筆</button></div>${tasks.length?tasks.slice(0,4).map(x=>`<article class="phone-task"><div><h3>${E(x.title)}</h3><p>${E(x.detail||x.subtitle||'')}</p></div><button class="btn primary" data-action="mobile-nav" data-view="${E(x.view)}" data-params="${E(JSON.stringify(x.params||{id:x.id||''}))}">${E(x.actionLabel||'處理')}</button></article>`).join(''):D.empty('目前沒有待辦')}</section><section class="phone-section"><div class="section-title"><h2>常用功能</h2><button class="text-button" data-action="mobile-modules">全部模組</button></div><div class="phone-shortcuts">${shortcuts.map(([view,label,short])=>`<button data-action="mobile-nav" data-view="${view}"><span>${short}</span><strong>${label}</strong></button>`).join('')}</div></section>`;
 }
 const home=D.modules.home,oldHome=home?.render;
 if(home)home.render=function(...args){
  if(!D.mobileActive)return oldHome.apply(this,args);
  if(D.managementOverview&&['ceo','chairman','admin'].includes(D.role)){
   if(['management','deng'].includes(args[0]?.dashboard))return oldHome.apply(this,args);
   return '<div class="action-row"><a class="btn" href="#view=home&dashboard=management">管理總覽</a><a class="btn" href="#view=home&dashboard=deng">鄧總專屬 Dashboard</a></div>'+phoneHome();
  }
  return phoneHome();
 };
 const oldRender=D.render.bind(D);D.render=function(...args){document.body.classList.toggle('mobile-mode',D.mobileActive);const out=oldRender(...args);header();D.mobileTables?.();return out;};
 const oldModal=D.modal.bind(D);D.modal=function(...args){D.mobileDirty=false;oldModal(...args);editingHash=typeof args[2]==='function'?location.hash:null;document.querySelector('#modal')?.classList.toggle('phone-edit-dialog',D.mobileActive&&typeof args[2]==='function');D.mobileTables?.();};
 // Desktop role changes use the same unsaved-form guard as the phone picker.
 const oldSetRole=D.setRole.bind(D);D.setRole=function(role){
  const result=D.mobileConfirmDiscard(()=>oldSetRole(role));
  if(!result){const select=document.querySelector('#role-switch');if(select)select.value=D.role;}
  return result;
 };
 const oldClose=D.closeModal.bind(D);D.closeModal=function(){D.mobileDirty=false;editingHash=null;document.querySelector('#modal')?.classList.remove('phone-role-sheet','phone-edit-dialog');return oldClose();};
 D.on('mobile-role-picker',()=>D.mobileConfirmDiscard(rolePicker));
 D.on('mobile-role-select',el=>D.mobileSelectRole(el.dataset.role));
 D.on('mobile-nav',el=>D.mobileConfirmDiscard(()=>navTo(el.dataset.view,el.dataset.params?JSON.parse(el.dataset.params):{})));
 D.on('mobile-modules',()=>D.mobileConfirmDiscard(modules));
 D.on('mobile-back',()=>D.mobileConfirmDiscard(()=>{const {view,...params}=D.mobileReturnRoute();navTo(D.allowed(view)?view:'home',params);}));
 D.on('close-modal',()=>D.mobileConfirmDiscard(()=>D.closeModal()));
 D.on('mobile-discard-cancel',()=>{pendingDiscard=null;document.querySelector('#mobile-discard')?.close();});
 D.on('mobile-discard-confirm',()=>{const action=pendingDiscard;pendingDiscard=null;document.querySelector('#mobile-discard')?.close();D.mobileDirty=false;action?.();});
 D.on('mobile-company',()=>{if(!['ceo','chairman','admin'].includes(D.role))return;D.mobileConfirmDiscard(()=>D.modal('查看公司',`<div class="stack">${['KYD','ZEUS'].map(c=>`<button class="btn ${c===D.company?'primary':''}" data-action="mobile-company-select" data-company="${c}">${c==='KYD'?'KYD':'Zeus Property Management'}</button>`).join('')}</div>`));});
 D.on('mobile-company-select',el=>{if(!['ceo','chairman','admin'].includes(D.role)||!['KYD','ZEUS'].includes(el.dataset.company))return;D.state.company=el.dataset.company;D.save();navTo('home');D.render();});
 document.querySelector('#modal-form')?.addEventListener('input',()=>{if(editingHash!==null&&document.querySelector('#modal')?.open)D.mobileDirty=true;});
 document.querySelector('#modal-form')?.addEventListener('change',()=>{if(editingHash!==null&&document.querySelector('#modal')?.open)D.mobileDirty=true;});
 document.querySelector('#modal')?.addEventListener('cancel',event=>{event.preventDefault();D.mobileConfirmDiscard(()=>D.closeModal());});
 document.querySelector('#mobile-discard')?.addEventListener('cancel',()=>{pendingDiscard=null;});
 // Registered before core.boot's hash listener, so browser Back cannot close an edited form first.
 window.addEventListener('hashchange',event=>{
  if(!D.mobileDirty||!document.querySelector('#modal')?.open)return;
  event.stopImmediatePropagation();
  const destination=location.hash,origin=editingHash??(event.oldURL?new URL(event.oldURL).hash:'#view=home');
  if(destination===origin)return;
  history.replaceState(history.state,'',origin||'#view=home');
  D.mobileConfirmDiscard(()=>{D.closeModal();location.hash=destination;});
 });
 document.querySelector('#modal-form')?.addEventListener('click',event=>{
  if(editingHash!==null&&event.target.closest?.('[data-action="kpi-add-goal"], [data-action="kpi-remove-goal"]'))D.mobileDirty=true;
 });
 window.addEventListener('beforeunload',event=>{
  if(D.mobileDirty&&document.querySelector('#modal')?.open){event.preventDefault();event.returnValue='';}
 });
 mq?.addEventListener?.('change',()=>{D.mobileActive=forced||mq.matches;D.render();});
})();
