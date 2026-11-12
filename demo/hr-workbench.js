/* Operational HR overview for the isolated meeting workspace. No formal-data writes. */
(()=>{'use strict';
 const D=window.D,E=D.esc.bind(D),LR=D.leaveRules,M=D.managementOverview;
 const viewers=['hr','hrmanager','manager','ceo','chairman','admin'];
 const allowed=()=>viewers.includes(D.role);
 const clerks=()=>['hr','hrmanager','manager','admin'].includes(D.role);
 const documentsAllowed=p=>['hr','hrmanager','ceo','chairman','admin'].includes(D.role)||p.id===D.actor.id;
 const month=r=>/^\d{4}-(0[1-9]|1[0-2])$/.test(r?.month||'')?r.month:D.today.slice(0,7);
 const endOf=m=>D.dateAdd(new Date(Date.UTC(+m.slice(0,4),+m.slice(5,7),1)).toISOString().slice(0,10),-1);
 const mi=m=>+m.slice(0,4)*12 + +m.slice(5,7)-1;
 const round=n=>Math.round(n*100)/100;
 const scope=p=>allowed()&&p&&p.active!==false&&LR.teamVisible(p.id,p.company);
 const historyStore=()=>D.state.hrOverviewChecks||[];
 const link=(t,view,params={},cls='btn')=>`<a class="${cls}" href="#${E(new URLSearchParams({view,...params}))}">${E(t)}</a>`;
 const params=r=>({month:month(r),...(r.department?{department:r.department}:{}),...(r.query?{query:r.query}:{}),...(r.filter?{filter:r.filter}:{}),...(r.tab?{tab:r.tab}:{})});
 const back=r=>new URLSearchParams(params(r)).toString();
 const sourceLink=(t,view,v,r)=>link(t,view,{...v,hrBack:back(r)});
 const docTypes=[['labor','勞動合約'],['passport','護照'],['permit','工作許可'],['visa','簽證'],['nda','保密協議']];
 const pending=x=>['review','approval'].includes(x.status);
 function monthlyBalance(p,m){
  const s=D.state.leaveRuleSettings,policy=s.policies[p.company],a=s.accounts[p.company+':'+p.id];
  if(!policy||!a||a.startMonth.slice(0,4)!==m.slice(0,4)||m<a.startMonth)return {configured:false};
  const start=m+'-01',end=endOf(m),year=a.startMonth+'-01',rate=policy.monthlyDays*policy.hoursPerDay,cutoff=mi(policy.accruedThrough);
  const requests=D.state.leaveRequests.filter(x=>x.company===p.company&&x.employeeId===p.id&&x.kind==='leave'&&x.leaveType==='annual'&&(x.startDate||x.date)>=year&&((x.startDate||x.date)<=end)&&(['approved','cancelled'].includes(x.status)||pending(x)));
  const unresolved=requests.filter(x=>(x.startDate||x.date).slice(0,7)!==(x.endDate||x.date).slice(0,7)&&x.status!=='cancelled');
  const safe=requests.filter(x=>!unresolved.includes(x));
  const total=rows=>rows.reduce((n,x)=>n+(x.kind==='leave'&&x.status==='approved'?LR.effectiveHours(x):Number(x.hours||0)),0);
  const adjustments=s.adjustments.filter(x=>x.company===p.company&&x.employeeId===p.id&&x.at>=year&&x.at<=end);
  const opening=round(a.openingHours+Math.max(0,Math.min(mi(m)-1,cutoff)-mi(a.startMonth)+1)*rate+total(adjustments.filter(x=>x.at<start))-total(safe.filter(x=>x.status==='approved'&&(x.endDate||x.date)<start)));
  const accrued=mi(m)<=cutoff?round(rate):0,adjustment=round(total(adjustments.filter(x=>x.at>=start))),used=round(total(safe.filter(x=>x.status==='approved'&&(x.startDate||x.date)>=start))),reserved=round(total(safe.filter(x=>pending(x)&&(x.startDate||x.date)>=start)));
  return {configured:true,opening,accrued,adjustment,used,reserved,closing:round(opening+accrued+adjustment-used),available:round(opening+accrued+adjustment-used-(policy.reservePending?reserved:0)),unresolved:unresolved.length,cutoff:policy.accruedThrough};
 }
 function documentSummary(p){
  if(!documentsAllowed(p))return {visible:false,items:[],expired:0,soon:0,missing:0};
  const items=docTypes.map(([type,label])=>{const d=D.state.hrDocuments.find(x=>x.company===p.company&&x.employeeId===p.id&&x.type===type&&!x.supersededBy),days=d?.expiresOn?D.daysUntil(d.expiresOn):null,status=!d?'missing':days!==null&&days<0?'expired':days!==null&&days<=(D.state.adminDemoSettings?.documentReminderDays??30)?'soon':'valid';return {type,label,doc:d,status};});
  return {visible:true,items,...Object.fromEntries(['expired','soon','missing'].map(status=>[status,items.filter(x=>x.status===status).length]))};
 }
 function fingerprint(row,m){
  const p=row.p,a=D.state.attendanceDemo,s=D.state.leaveRuleSettings;
  return JSON.stringify({month:m,person:{id:p.id,company:p.company,department:p.department,title:p.title,active:p.active},docs:row.docs.items.map(x=>({type:x.type,status:x.status,doc:x.doc})),policy:s.policies[p.company],account:s.accounts[p.company+':'+p.id],adjustments:s.adjustments.filter(x=>x.company===p.company&&x.employeeId===p.id),requests:D.state.leaveRequests.filter(x=>x.company===p.company&&x.employeeId===p.id&&!['draft','withdrawn'].includes(x.status)),shifts:a.shifts.filter(x=>x.company===p.company),schedules:a.schedules.filter(x=>x.company===p.company&&x.employeeId===p.id&&x.date.startsWith(m)),punches:a.punches.filter(x=>x.company===p.company&&x.employeeId===p.id&&x.date>=m+'-01'&&x.date<=D.dateAdd(endOf(m),1)),reminder:D.state.adminDemoSettings?.documentReminderDays??30});
 }
 function rows(r={}){
  if(!allowed())return [];
  const m=month(r);return M.summaryRows({month:m}).filter(x=>scope(x.p)).map(row=>{
   const docs=documentSummary(row.p),ledger=monthlyBalance(row.p,m);
   const issues=[];if(docs.expired)issues.push('證件已到期');if(docs.soon)issues.push('證件即將到期');if(docs.missing)issues.push('證件未登錄');if(row.work.incomplete)issues.push('打卡待核對');if(row.requests.some(pending))issues.push('假勤待審');if(row.partial.length||ledger.unresolved)issues.push('跨月工時待拆分');if(!ledger.configured)issues.push('年度額度未設定');if(ledger.available<0)issues.push('年假餘額待核對');
   const result={...row,docs,ledger,issues,pendingRequests:row.requests.filter(pending).length};result.fingerprint=fingerprint(result,m);
   const check=historyStore().filter(x=>x.company===row.p.company&&x.employeeId===row.p.id&&x.month===m&&x.scope===(docs.visible?'full':'attendance')).at(-1);result.check=check;result.checkStatus=!check?'unchecked':check.fingerprint!==result.fingerprint?'changed':check.result;
   return result;
  });
 }
 function filtered(r){const q=String(r.query||'').trim().toLowerCase();return rows(r).filter(x=>(!r.department||x.p.department===r.department)&&(!q||[x.p.name,x.p.id,x.p.title].some(v=>String(v).toLowerCase().includes(q))));}
 function matches(x,filter){return filter==='issues'?x.issues.length>0:filter==='unchecked'?['unchecked','changed','followup'].includes(x.checkStatus):filter==='checked'?x.checkStatus==='checked':true;}
 const statusLabel={unchecked:'尚未核對',changed:'資料更新，請重核',followup:'待補正',checked:'已核對'};
 function checkBadge(x){return D.badge(statusLabel[x.checkStatus],x.checkStatus==='checked'?'green':x.checkStatus==='unchecked'?'neutral':'amber');}
 function table(r,data){
  const monthly=r.tab==='leave',display=value=>value===undefined?'—':round(value)+'h';
  const headers=monthly?['員工／部門','月初年假','本月新增','本月調整','本月已休年假','本月待審年假','月末年假','核對狀態','操作']:['員工／部門','證件狀況','本月核准請假','打卡參考工時','目前年假可用','核對狀態','操作'];
  return `<section class="card table-wrap hr-control-table ${monthly?'':'hr-native-desktop'}"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${data.map(x=>`<tr><td><strong>${E(x.p.name)}</strong><br><small>${E(x.p.department)} · ${E(x.p.title)}</small></td>${monthly?[x.ledger.opening,x.ledger.accrued,x.ledger.adjustment,x.ledger.used,x.ledger.reserved,x.ledger.closing].map(v=>`<td>${display(v)}${x.ledger.unresolved?'<br><small>跨月待拆分</small>':''}</td>`).join(''):`<td>${!x.docs.visible?'<span class="muted">由人資管理</span>':[['expired','已到期','red'],['soon','即將到期','amber'],['missing','未登錄','amber']].filter(([k])=>x.docs[k]).map(([k,t,tone])=>D.badge(t+' '+x.docs[k],tone)).join(' ')||D.badge('已登錄・期限正常','green')}</td><td>${x.leave}h${x.pendingRequests?`<br><small>待審單據 ${x.pendingRequests}</small>`:''}</td><td>${x.work.hours}h${x.work.incomplete?`<br>${D.badge('待核對 '+x.work.incomplete,'amber')}`:''}</td><td>${x.balance.available}h</td>`}<td>${checkBadge(x)}${x.check?`<br><small>${E(x.check.actorName)}<br>${E(x.check.at.slice(0,10))}</small>`:''}</td><td>${link('核對資料','hr-overview',{...params(r),employeeId:x.p.id})}</td></tr>`).join('')}</tbody></table>${data.length?'':D.empty('此範圍沒有符合條件的人員')}</section>${monthly?'':mobileList(r,data)}`;
 }
 function mobileList(r,data){return `<div class="hr-native-mobile">${data.map(x=>`<article class="card hr-person-card"><div class="row"><h3>${E(x.p.name)}</h3>${checkBadge(x)}</div><p class="mini">${E(x.p.department)} · ${E(x.p.title)}</p><div class="hr-person-alerts">${x.issues.slice(0,3).map(i=>D.badge(i,i==='證件已到期'?'red':'amber')).join(' ')||D.badge('目前無待查項目','green')}</div><div class="hr-person-metrics">${[['核准請假',x.leave+'h'],['打卡參考工時',x.work.hours+'h'],['目前年假可用',x.balance.available+'h']].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><div class="row"><small>${x.pendingRequests?'待審單據 '+x.pendingRequests:''}</small>${link('核對資料','hr-overview',{...params(r),employeeId:x.p.id})}</div></article>`).join('')||D.empty('此範圍沒有符合條件的人員')}</div>`;}
 function detail(r){
  const x=rows(r).find(x=>x.p.id===r.employeeId);if(!x)return D.empty('此員工不在目前授權範圍');
  const badge={expired:['已到期','red'],soon:['即將到期','amber'],missing:['未登錄','amber'],valid:['有效／已留存','green']};
  const history=historyStore().filter(c=>c.company===x.p.company&&c.employeeId===x.p.id&&c.month===month(r)&&c.scope===(x.docs.visible?'full':'attendance'));
  return `<header class="page-head"><div><p class="eyebrow">${E(x.p.company)} · ${E(month(r))}</p><h1>${E(x.p.name)} · 資料核對</h1><p class="lede">${E(x.p.department)} · ${E(x.p.title)}</p></div>${link('返回管理總覽','hr-overview',params(r))}</header><section class="card"><div class="row"><h2>核對狀態</h2>${checkBadge(x)}</div>${x.issues.length?`<p>${x.issues.map(i=>D.badge(i,'amber')).join(' ')}</p>`:'<p>目前沒有系統提示的待查項目。</p>'}<p class="mini">核對紀錄不會代替請假簽核、補卡審核或更新原始資料。</p>${clerks()&&x.p.id!==D.actor.id?`<button class="btn primary" data-action="hr-overview-check" data-id="${E(x.p.id)}" data-month="${month(r)}">登記核對結果</button>`:''}</section><div class="grid two space-top">${x.docs.visible?`<section class="card"><h2>證件與期限</h2>${x.docs.items.map(d=>`<div class="inbox-row"><div><strong>${d.label}</strong><p class="mini">${d.doc?E(d.doc.issuedOn||'未提供')+' → '+E(d.doc.expiresOn||'無固定到期日'):'請核對是否適用並補登資料'}</p></div>${d.doc?`<button class="doc-link" data-action="hr-doc" data-id="${E(d.doc.id)}">${D.badge(...badge[d.status])}</button>`:D.badge(...badge[d.status])}</div>`).join('')}${sourceLink('證件總表與補件','documents',{tab:'overview',employeeId:x.p.id},r)}</section>`:''}<section class="card"><h2>假勤與工時</h2><div class="row"><span>核准請假</span><strong>${x.leave}h</strong></div><div class="row"><span>待審請假</span><strong>${x.pending}h</strong></div><div class="row"><span>排定／打卡參考工時</span><strong>${x.work.scheduled}h / ${x.work.hours}h</strong></div><div class="row"><span>本月核准加班</span><strong>${x.overtime}h</strong></div><div class="action-row space-top">${sourceLink('假勤來源明細','attendance',{tab:'summary',month:month(r),employeeId:x.p.id},r)}${sourceLink('班表與缺卡','attendance',{tab:'records',month:month(r),employeeId:x.p.id},r)}</div></section><section class="card"><h2>本月年假核對</h2>${x.ledger.configured?`<div class="row"><span>月初年假</span><strong>${x.ledger.opening}h</strong></div><div class="row"><span>本月新增／調整</span><strong>${x.ledger.accrued}h / ${x.ledger.adjustment}h</strong></div><div class="row"><span>本月已休／待審</span><strong>${x.ledger.used}h / ${x.ledger.reserved}h</strong></div><div class="row"><span>月末年假（未扣待審）</span><strong>${x.ledger.closing}h</strong></div><p class="mini">依目前核准結果回算，並非當時封存餘額。跨月申請未拆分時，餘額僅供核對。</p>`:D.empty('此年度尚未設定額度')}${LR.canEdit()?sourceLink('額度設定與調整','leave',{tab:'policy'},r):link('每月年假總表','hr-overview',{...params(r),tab:'leave',query:x.p.name})}</section></div><section class="card space-top"><h2>核對歷史</h2><div class="timeline">${history.slice().reverse().map(h=>`<article><strong>${statusLabel[h.result]}</strong><p class="mini">${E(h.actorName)} · ${E(h.at.replace('T',' ').slice(0,16))}</p><p>${E(h.note||'已完成核對')}</p>${h.fingerprint!==x.fingerprint?'<small>此紀錄之後資料已有更新</small>':''}</article>`).join('')||'<p class="muted">尚無核對紀錄。</p>'}</div></section>`;
 }
 function recordCheck(id,m,result,note,expected){
  if(!clerks()||!['checked','followup'].includes(result)||month({month:m})!==m)throw Error('目前身分無法登記核對結果。');
  const x=rows({month:m}).find(x=>x.p.id===id);if(!x||x.p.id===D.actor.id)throw Error('請由授權同事核對此員工資料。');
  if(expected!==x.fingerprint)throw Error('來源資料已更新，請重新開啟核對。');
  const text=String(note||'').trim();if(text.length>1000||(result==='followup'||x.issues.length)&&!text)throw Error('請記錄需補正事項或核對說明。');
  D.mutate(s=>{s.hrOverviewChecks??=[];s.hrOverviewChecks.push({id:'CHK-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),company:D.company,employeeId:id,month:m,scope:x.docs.visible?'full':'attendance',result,note:text,fingerprint:expected,actorId:D.actor.id,actorName:D.actor.name,role:D.role,at:new Date().toISOString()});D.log('登記人事資料核對：'+id+' '+statusLabel[result]);});
 }
 D.on('hr-overview-check',el=>{
  const x=rows({month:el.dataset.month}).find(x=>x.p.id===el.dataset.id);if(!x||!clerks()||x.p.id===D.actor.id)throw Error('目前身分無法登記此員工的核對。');const role=D.role,company=D.company,m=el.dataset.month;
  D.modal('登記核對結果',`<p>${E(x.p.name)} · ${E(m)}</p>${x.issues.length?`<p>${x.issues.map(E).join(' · ')}</p>`:''}<label class="field">核對結果${D.select('result',[['checked','已核對'],['followup','待補正']],x.issues.length?'followup':'checked')}</label><label class="field">核對說明<textarea name="note" maxlength="1000" ${x.issues.length?'required':''}></textarea></label>`,v=>{if(role!==D.role||company!==D.company)throw Error('身分或公司已變更，請重新核對。');recordCheck(x.p.id,m,v.result,v.note,x.fingerprint);});
 });
 function render(r={}){
  if(!allowed())return D.empty('目前身分無法查看管理總表');
  if(r.employeeId)return detail(r);
  const base=filtered(r),shown=base.filter(x=>matches(x,r.filter)),title=D.role==='manager'?'部門管理總覽':'人事管理總覽';
  return `<header class="page-head"><div><p class="eyebrow">${E(D.company)} · ${E(month(r))}</p><h1>${title}</h1><p class="lede">先核對人員與整體狀況，再處理缺件、到期及假勤異常。</p></div>${link('我的工作與申請','home',{dashboard:'work'})}</header><p class="mini">流程示例資料 · 真實員工名冊維持原有資料；本頁的核對不會修改正式紀錄。</p><div class="hr-summary-cards">${[['all','授權範圍人員',base.length],['issues','有待查項目',base.filter(x=>x.issues.length).length],['unchecked','尚待核對／補正',base.filter(x=>matches(x,'unchecked')).length],['checked','已完成核對',base.filter(x=>x.checkStatus==='checked').length]].map(([filter,label,value])=>`<a class="card hr-summary-card ${r.filter===filter||!r.filter&&filter==='all'?'selected':''}" href="#${E(new URLSearchParams({view:'hr-overview',...params(r),filter}))}"><small>${label}</small><strong>${value}</strong><span>查看人員 →</span></a>`).join('')}</div><nav class="subnav"><a href="#${E(new URLSearchParams({view:'hr-overview',...params(r),tab:'all'}))}" class="${r.tab!=='leave'?'active':''}">綜合檢核</a><a href="#${E(new URLSearchParams({view:'hr-overview',...params(r),tab:'leave'}))}" class="${r.tab==='leave'?'active':''}">每月年假總表</a><a href="#view=documents&tab=overview">證件期限總表</a><a href="#view=attendance&tab=calendar">可視化班表</a></nav><form class="overview-filters" data-hr-overview-filter><input type="hidden" name="tab" value="${r.tab==='leave'?'leave':'all'}"><input type="hidden" name="filter" value="${E(['all','issues','unchecked','checked'].includes(r.filter)?r.filter:'all')}"><label class="field">月份<input type="month" name="month" value="${month(r)}" required></label><label class="field">部門${D.select('department',[['','全部授權部門'],...[...new Set(rows(r).map(x=>x.p.department))].map(d=>[d,d])],r.department||'',false)}</label><label class="field">搜尋人員<input name="query" value="${E(r.query||'')}" placeholder="姓名、編號或職務"></label><button class="btn primary" type="submit">套用篩選</button></form>${table(r,shown)}<p class="mini">${r.tab==='leave'?'月末年假＝月初＋本月新增＋調整－本月已休。依目前核准結果回算，不代表歷史封存；跨月未拆分另列待查。':'未登錄證件須先核對是否適用；已核對不會消除仍存在的到期、缺件或待審事項。'}</p><p class="mini">年假新增依已設定的累計截止月；更動來源資料後，核對狀態會自動提醒重新檢查。</p><div class="action-row">${link('待我簽核的單據','approvals')}${link('全員假勤與工時','attendance',{tab:'summary',month:month(r)})}${link('原有員工名冊','people')}</div>`;
 }
 document.addEventListener('submit',e=>{const f=e.target.closest?.('[data-hr-overview-filter]');if(!f)return;e.preventDefault();D.go('hr-overview',Object.fromEntries(new FormData(f)));});
 D.register('hr-overview',{title:'人事管理總覽',group:'總覽',nav:false,navParent:'home',roles:viewers,canView:allowed,render});
 const oldHome=D.modules.home.render;D.modules.home.render=r=>['hr','hrmanager','manager'].includes(D.role)&&r?.dashboard!=='work'?render(r):oldHome(r)+(allowed()?`<div class="action-row space-top">${link('人事管理總覽','hr-overview')}</div>`:'');
 for(const view of ['documents','attendance','leave']){const original=D.modules[view].render;D.modules[view].render=r=>{
  const html=original(r);if(!r?.hrBack||!allowed())return html;const saved=Object.fromEntries(new URLSearchParams(r.hrBack));return `<div class="action-row space-top">${link('返回管理總覽','hr-overview',params(saved))}</div>`+html;
 };}
 const oldReturn=D.mobileReturnRoute;
 if(oldReturn)D.mobileReturnRoute=function(r=D.route()){
  if(r.hrBack&&allowed())return {view:'hr-overview',...params(Object.fromEntries(new URLSearchParams(r.hrBack)))};
  if(r.view==='hr-overview'&&r.employeeId)return {view:'hr-overview',...params(r)};
  return oldReturn(r);
 };
 D.hrOverview={rows,monthlyBalance,recordCheck};
})();
