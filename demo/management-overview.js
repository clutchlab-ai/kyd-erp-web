/* Meeting management views. Aggregate existing local workflow records; never mutate live roster. */
(()=>{'use strict';
 const D=window.D,E=D.esc.bind(D),LR=D.leaveRules;
 const team=()=>['hr','hrmanager','manager','ceo','chairman','admin'].includes(D.role);
 const executive=()=>['ceo','chairman','admin'].includes(D.role);
 const people=()=>D.state.people.filter(p=>p.active!==false&&LR.teamVisible(p.id,p.company));
 const who=id=>D.state.people.find(p=>p.id===id);
 const link=(text,view,params={})=>`<a class="btn" href="#${new URLSearchParams({view,...params})}">${E(text)}</a>`;
 const head=(title,desc)=>`<header class="page-head"><div><p class="eyebrow">${E(D.company)}</p><h1>${E(title)}</h1><p class="lede">${E(desc)}</p></div></header>`;
 const monthOf=r=>/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month||'')?r.month:D.today.slice(0,7);
 const bounds=m=>[m+'-01',D.dateAdd(new Date(Date.UTC(Number(m.slice(0,4)),Number(m.slice(5,7)),1)).toISOString().slice(0,10),-1)];
 const inRange=(date,start,end)=>date>=start&&date<=end;
 const overlaps=(x,start,end)=>(x.startDate||x.date)<=end&&(x.endDate||x.date)>=start;
 const round=n=>Math.round(n*100)/100;
 const mins=t=>{const [h,m]=String(t).split(':').map(Number);return h*60+m;};
 const num=n=>round(Number(n)||0);
 const absent=x=>x.kind==='leave'&&x.status==='approved';
 const navAttendance=tab=>`<nav class="subnav">${[['calendar','可視化班表'],['summary','全員假勤總表'],['clock','打卡'],['schedule','班表清單'],['exchanges','換代班'],['months','月結核對']].filter(([k])=>k!=='summary'||team()).map(([k,t])=>`<a class="${tab===k?'active':''}" href="#view=attendance&tab=${k}">${t}</a>`).join('')}</nav>`;
 function filteredPeople(r){return people().filter(p=>!r.department||p.department===r.department);}
 function filters(view,tab,r,withMonth=true){return `<form class="overview-filters" data-overview-filter data-view="${view}" data-tab="${tab}">${withMonth?`<label class="field">月份<input type="month" name="month" value="${monthOf(r)}" required></label>`:''}<label class="field">部門${D.select('department',[['','全部授權部門'],...[...new Set(people().map(p=>p.department))].map(d=>[d,d])],r.department||'',false)}</label><button class="btn primary" type="submit">套用篩選</button></form>`;}
 document.addEventListener('submit',event=>{const form=event.target.closest?.('[data-overview-filter]');if(!form)return;event.preventDefault();const v=Object.fromEntries(new FormData(form));D.go(form.dataset.view,{tab:form.dataset.tab,...v});});
 function workHours(id,c,start,end){
  const a=D.state.attendanceDemo;let hours=0,incomplete=0,scheduled=0;
  for(const row of a.schedules.filter(x=>x.employeeId===id&&x.company===c&&x.status==='published'&&inRange(x.date,start,end))){
   const shift=a.shifts.find(x=>x.id===row.shiftId&&x.company===c);if(!shift)continue;
   const scheduledMinutes=mins(shift.end)-mins(shift.start)+(shift.overnight?1440:0)-Number(shift.breakMinutes||0);scheduled+=Math.max(0,scheduledMinutes)/60;
   if(row.date>D.today)continue;
   const ins=a.punches.filter(x=>x.employeeId===id&&x.company===c&&x.date===row.date&&x.type==='in');
   const outs=a.punches.filter(x=>x.employeeId===id&&x.company===c&&x.date===(shift.overnight?D.dateAdd(row.date,1):row.date)&&x.type==='out');
   if(ins.length!==1||outs.length!==1){if(!LR.coversShift(row,shift))incomplete++;continue;}
   const duration=mins(outs[0].time)-mins(ins[0].time)+(shift.overnight?1440:0)-Number(shift.breakMinutes||0);
   if(!Number.isFinite(duration)||duration<0||duration>1440){incomplete++;continue;}hours+=duration/60;
  }
  return {hours:round(hours),incomplete,scheduled:round(scheduled)};
 }
 function summaryRows(r){const m=monthOf(r),[start,end]=bounds(m);return filteredPeople(r).map(p=>{
  const requests=D.state.leaveRequests.filter(x=>x.employeeId===p.id&&x.company===p.company&&overlaps(x,start,end)&&!['draft','withdrawn','returned'].includes(x.status));
  const partial=requests.filter(x=>(x.startDate||x.date)<start||(x.endDate||x.date)>end);
  const complete=requests.filter(x=>!partial.includes(x));
  const sum=(kind,status)=>round(complete.filter(x=>x.kind===kind&&(Array.isArray(status)?status.includes(x.status):x.status===status)).reduce((n,x)=>n+Number(x.hours||0),0));
  return {p,requests,partial,work:workHours(p.id,p.company,start,end),balance:LR.balance(p.id,p.company),leave:sum('leave','approved'),pending:sum('leave',['review','approval']),overtime:sum('overtime','approved'),cancelled:sum('leave','cancelled')};
 });}
 function summary(r){
  if(!team())return D.empty('目前身分無法查看全員總表');
  const rows=summaryRows(r),selected=r.employeeId?rows.filter(x=>x.p.id===r.employeeId):rows;
  const table=selected.map(x=>`<tr><td><strong>${E(x.p.name)}</strong><br><small>${E(x.p.department)}</small></td><td>${x.work.scheduled}h</td><td>${x.work.hours}h${x.work.incomplete?`<br>${D.badge(x.work.incomplete+' 筆待核對','amber')}`:''}</td><td>${x.leave}h</td><td>${x.pending}h</td><td>${x.overtime}h</td><td>${x.cancelled}h</td><td>${x.balance.available}h</td><td>${x.partial.length?D.badge('跨月待拆分','amber'):''}${link('來源明細','attendance',{tab:'summary',month:monthOf(r),employeeId:x.p.id})}</td></tr>`).join('');
  const sources=r.employeeId&&selected.length?`<section class="card space-top"><h2>${E(selected[0].p.name)} · 來源申請</h2>${selected[0].requests.map(x=>`<div class="inbox-row"><div><strong>${E(x.startDate||x.date)} → ${E(x.endDate||x.date)}</strong><p>${E(LR.types[x.leaveType]||({overtime:'加班',field:'外勤',cancel:'銷假'})[x.kind]||x.kind)} · ${num(x.hours)}h · ${E(({approved:'已核准',review:'待複核',approval:'待核准',cancelled:'已銷假'})[x.status]||x.status)}</p></div>${link('申請明細','leave',{id:x.id})}</div>`).join('')||D.empty('本月沒有假勤申請')}${link('返回全員總表','attendance',{tab:'summary',month:monthOf(r)})}</section>`:'';
  return head('全員假勤與工時','按公司、部門及月份核對；申請核准、銷假與補卡後自動更新。')+navAttendance('summary')+filters('attendance','summary',r)+`<section class="card table-wrap"><table><thead><tr>${['員工／部門','排定工時','打卡參考工時','核准請假','待審請假','核准加班','已銷假','目前年假可用','來源'].map(t=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${table}</tbody></table>${rows.length?'':D.empty('目前範圍沒有員工')}</section><p class="mini">工時以成對打卡扣除班別休息時間計算，缺卡另列；此數字不等同計薪工時。跨月申請完整列入來源，但尚未拆分的時數不併入月合計。</p><p class="mini">年假可用額度依假勤設定的截止月份計算，不是所選月份的歷史餘額。</p>${link('假別與簽核設定','leave',{tab:LR.canEdit()?'policy':'balance'})}${sources}`;
 }
 function calendar(r){
  const m=monthOf(r),[start,end]=bounds(m),ps=filteredPeople(r),ids=new Set(ps.map(p=>p.id)),a=D.state.attendanceDemo;
  const schedules=a.schedules.filter(x=>x.company===D.company&&ids.has(x.employeeId)&&x.status!=='cancelled'&&(team()||x.status==='published'));
  const leaves=D.state.leaveRequests.filter(x=>x.company===D.company&&ids.has(x.employeeId)&&absent(x));
  const day=/^\d{4}-\d{2}-\d{2}$/.test(r.day||'')&&r.day>=start&&r.day<=end?r.day:D.today.startsWith(m)?D.today:start;
  const first=D.dateAdd(start,-((new Date(start+'T12:00:00Z').getUTCDay()+6)%7));
  const days=Array.from({length:Math.ceil((((new Date(start+'T12:00:00Z').getUTCDay()+6)%7)+Number(end.slice(8)))/7)*7},(_,i)=>D.dateAdd(first,i));
  const published=d=>schedules.filter(x=>x.date===d&&x.status==='published');
  const onLeave=d=>leaves.filter(x=>overlaps(x,d,d));
  const staffing=a.staffing.filter(x=>x.company===D.company&&(x.status||'published')==='published'&&x.date===day&&(!r.department||x.employees.some(id=>ids.has(id))));
  const grid=`<div class="schedule-calendar" role="group" aria-label="月份班表">${['一','二','三','四','五','六','日'].map(t=>`<span class="calendar-weekday">${t}</span>`).join('')}${days.map(d=>`<a class="calendar-day ${d.startsWith(m)?'':'outside'} ${d===day?'selected':''}" href="#${new URLSearchParams({view:'attendance',tab:'calendar',month:m,day:d,department:r.department||''})}" aria-label="${d} · ${published(d).length} 班 · ${onLeave(d).length} 筆請假"><strong>${Number(d.slice(8))}</strong><small>${published(d).length} 班</small>${onLeave(d).length?`<span class="calendar-leave">${onLeave(d).length} 假</span>`:''}${schedules.some(x=>x.date===d&&['draft','returned'].includes(x.status))?'<span class="calendar-draft">待發布</span>':''}</a>`).join('')}</div>`;
  return head('可視化班表','先選日期，再安排班次或查看請假；班表送交另一位主管發布。')+navAttendance('calendar')+filters('attendance','calendar',r)+`<div class="calendar-layout"><section class="card">${grid}</section><section class="card"><div class="row"><h2>${E(day)}</h2>${['hr','manager'].includes(D.role)&&day>=D.today?`<button class="btn primary" data-action="overview-schedule" data-day="${day}">安排班次</button>`:''}</div><p class="mini">藍色為班次；橙色為請假。請假不會自動刪除班次。</p>${schedules.filter(x=>x.date===day).map(x=>{const shift=a.shifts.find(s=>s.id===x.shiftId),leave=onLeave(day).filter(l=>l.employeeId===x.employeeId);return `<article class="calendar-entry"><strong>${E(who(x.employeeId)?.name)}</strong><p>${E(shift?.name||'未設定')} · ${E(shift?.start)}–${E(shift?.end)} ${D.badge(x.status==='published'?'已發布':x.status==='returned'?'已退回':'待發布',x.status==='published'?'blue':'amber')}</p>${leave.length?'<p class="notice amber">當日有請假，請核對時段與替班安排。</p>':''}${link('班次明細','attendance',{tab:'schedule',id:x.id})}</article>`;}).join('')||'<p class="muted">當日尚無班次。</p>'}<h3>當日請假</h3>${onLeave(day).map(x=>`<article class="calendar-entry leave-entry"><strong>${E(x.employeeName)}</strong><p>${E(LR.types[x.leaveType]||'請假')} · ${E(x.startTime)}–${E(x.endTime)}</p>${link('請假明細','leave',{id:x.id})}</article>`).join('')||'<p class="muted">當日沒有已核准請假。</p>'}${team()?`<h3>崗位人力</h3>${staffing.map(x=>`<p>${E(x.area)} · ${E(x.post)}<br>需求 ${x.required} 人 · 已安排 ${x.employees.length} 人 ${x.employees.length<x.required?D.badge('人力待補','amber'):''}</p>`).join('')||'<p class="muted">尚未設定當日崗位需求。</p>'}${link('安排崗位人力','attendance',{tab:'staffing'})}`:''}</section></div>`;
 }
 D.on('overview-schedule',el=>{
  if(!['hr','manager'].includes(D.role))throw Error('目前身分無法排班。');const actor=D.actor.id,company=D.company,day=el.dataset.day;
  D.modal('安排班次',`<div class="form-grid"><label class="field">員工${D.select('employeeId',people().map(p=>[p.id,p.name]))}</label><label class="field">班別${D.select('shiftId',D.state.attendanceDemo.shifts.filter(x=>x.company===company).map(x=>[x.id,x.name]))}</label><label class="field">日期<input type="date" name="date" min="${D.today}" value="${E(day)}" required></label></div>`,v=>{if(actor!==D.actor.id||company!==D.company||!people().some(p=>p.id===v.employeeId))throw Error('身分或公司範圍已改變。');const x=D.attendanceDemoAPI.saveSchedule(v);D.go('attendance',{tab:'schedule',id:x.id});},'送交主管發布');
 });
 const oldAttendance=D.modules.attendance.render;
 D.modules.attendance.render=r=>{r=r||{};if((!r.tab&&!r.id&&team())||r.tab==='calendar')return calendar(r);if(r.tab==='summary')return summary(r);return oldAttendance(r).replace('</nav>',`<a href="#view=attendance&tab=calendar">可視化班表</a>${team()?'<a href="#view=attendance&tab=summary">全員假勤總表</a>':''}</nav>`);};
 const oldAttendanceAfter=D.modules.attendance.afterRender;
 D.modules.attendance.afterRender=r=>{oldAttendanceAfter?.(r);if(D.mobileActive&&r.tab==='calendar'&&r.day)window.requestAnimationFrame?.(()=>document.querySelector('.calendar-layout>section:last-child')?.scrollIntoView?.({block:'start',behavior:'smooth'}));};
 const oldLeave=D.modules.leave.render;
 D.modules.leave.render=r=>oldLeave(r)+(team()&&!r?.id?`<div class="action-row space-top">${link('全員假勤與工時','attendance',{tab:'summary'})}${link('可視化班表','attendance',{tab:'calendar'})}</div>`:'');
 const docTypes=[['labor','勞動合約'],['passport','護照'],['permit','工作許可'],['visa','簽證'],['nda','保密協議']];
 function documentRows(r){return filteredPeople(r).filter(p=>D.role!=='manager'||p.id===D.actor.id).filter(p=>!r.employeeId||p.id===r.employeeId).map(p=>({p,docs:docTypes.map(([type,label])=>({type,label,doc:D.state.hrDocuments.find(d=>d.company===p.company&&d.employeeId===p.id&&d.type===type&&!d.supersededBy)}))}));}
 function docStatus(d){if(!d)return ['未登錄','amber'];if(!d.expiresOn)return ['已留存','blue'];const days=D.daysUntil(d.expiresOn);return days<0?['已到期','red']:days<=(D.state.adminDemoSettings?.documentReminderDays??30)?['即將到期','amber']:['有效','green'];}
 function docOverview(r){
  if(!team())return D.empty('目前身分無法查看全員總表');
  const rows=documentRows(r),cell=({doc})=>{const [label,tone]=docStatus(doc);return doc?`<button class="doc-link" data-action="hr-doc" data-id="${E(doc.id)}">${D.badge(label,tone)}<br><small>${E(doc.expiresOn||'無固定到期日')}</small><br><small>${E(doc.followups?.at(-1)?.status||'尚無跟進紀錄')}</small></button>`:`${D.badge(label,tone)}<br><small>請核對是否適用</small>`;};
  return head('全員證件總表','列出授權範圍內全部在職人員，缺件、期限與續辦紀錄集中核對。')+`<nav class="subnav"><a class="active" href="#view=documents&tab=overview">全員總表</a><a href="#view=documents&source=example">證件清單與跟進</a><a href="#view=documents&source=real">原有真實資料</a></nav>`+filters('documents','overview',r,false)+`<p class="mini">以下為流程示例。未登錄不代表違規；各證件的適用人員與必備條件仍須核對。</p><section class="card table-wrap"><table><thead><tr><th>員工／部門</th>${docTypes.map(([,t])=>`<th>${t}</th>`).join('')}</tr></thead><tbody>${rows.map(x=>`<tr><td><strong>${E(x.p.name)}</strong><br><small>${E(x.p.department)}</small></td>${x.docs.map(d=>`<td>${cell(d)}</td>`).join('')}</tr>`).join('')}</tbody></table></section>${D.role==='hr'?'<div class="action-row space-top"><button class="btn primary" data-action="hr-doc-new">登錄證件示例</button></div>':''}`;
 }
 const oldDocuments=D.modules.documents.render;
 D.modules.documents.render=r=>r?.tab==='overview'&&r.source!=='real'?docOverview(r):(team()&&r?.source!=='real'?`<div class="action-row space-top">${link('全員證件總表','documents',{tab:'overview'})}</div>`:'')+oldDocuments(r);
 function period(r){const end=/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')&&!Number.isNaN(Date.parse(r.date))&&new Date(r.date+'T00:00:00Z').toISOString().slice(0,10)===r.date?r.date:D.today,mode=['day','week','month'].includes(r.period)?r.period:'month';return {mode,start:mode==='day'?end:mode==='week'?D.dateAdd(end,-6):end.slice(0,7)+'-01',end};}
 function totals(company,start,end){
  const book=D.state.accountingContents?.books?.[company],accounts=book?.accounts||[],vouchers=(D.state.financeDemo||[]).filter(x=>x.company===company&&x.status==='posted'&&inRange(x.date,start,end));
  const categories={};let income=0,expense=0,unmapped=0;
  for(const v of vouchers)for(const l of v.lines||[]){const a=accounts.find(a=>a.code===l.code);if(!a){unmapped++;continue;}if(!['income','expense'].includes(a.type))continue;const amount=a.type==='income'?Number(l.credit||0)-Number(l.debit||0):Number(l.debit||0)-Number(l.credit||0);if(a.type==='income')income+=amount;else expense+=amount;categories[a.code]??={code:a.code,name:a.name,type:a.type,amount:0};categories[a.code].amount+=amount;}
  return {income:round(income/100),expense:round(expense/100),currency:book?.currency||'USD',categories:Object.values(categories).map(x=>({...x,amount:round(x.amount/100)})),count:vouchers.length,unmapped};
 }
 function dashboard(r){
  if(!executive())return D.empty('目前身分無法查看管理總覽');
  const per=period(r),t=totals(D.company,per.start,per.end),ps=people(),projects=(D.state.engineeringProjects||[]).filter(x=>x.company===D.company),kpis=(D.state.kpiPlans||[]).filter(x=>x.company===D.company&&x.status!=='void'&&(x.end||'9999')>=per.start&&(x.start||'0000')<=per.end);
  const overdue=D.state.hrDocuments.filter(x=>x.company===D.company&&x.expiresOn&&x.expiresOn<D.today),leave=D.state.leaveRequests.filter(x=>x.company===D.company&&absent(x)&&overlaps(x,per.start,per.end));
  const title=r.dashboard==='deng'?'鄧總專屬 Dashboard':D.role==='ceo'?'CEO 營運總覽':'管理總覽';
  return head(title,'先看各單位的重要數字、進度與需關注事項，再進入來源核對。')+`<div class="action-row">${link('管理總覽','home',{dashboard:'management'})}${link('鄧總專屬 Dashboard','home',{dashboard:'deng'})}${link('我的工作與申請','home',{dashboard:'work'})}</div><form class="overview-filters" data-management-filter><label class="field">統計週期${D.select('period',[['day','單日'],['week','近七日'],['month','本月']],per.mode)}</label><label class="field">截止日期<input type="date" name="date" value="${E(per.end)}" required></label><input type="hidden" name="dashboard" value="${E(r.dashboard||'management')}"><button class="btn primary" type="submit">更新總覽</button></form><p class="mini">${E(per.start)} — ${E(per.end)} · 本瀏覽器流程示例 · 每次操作後重新彙總</p><div class="grid four">${[['已入帳收入',D.money(t.income)],['已入帳費用',D.money(t.expense)],['在職人員',ps.length],['待我處理',D.inbox().length]].map(([name,value])=>`<section class="card stat"><small>${name}</small><strong>${E(value)}</strong></section>`).join('')}</div><p class="mini">財務只計已入帳傳票的收入／費用科目，以 ${E(t.currency)} 呈現；不等同銀行現金流，也不包含尚未串接的 PMS 代收款。${t.unmapped?'有科目未對應，請財務核對。':''}</p><div class="grid two space-top"><section class="card"><h2>財務大類</h2>${t.categories.map(x=>`<div class="inbox-row"><strong>${E(x.name)}</strong><span>${E(D.money(x.amount))}</span></div>`).join('')||'<p class="muted">此期間尚無已入帳收入或費用。</p>'}${link('核對帳務來源','accounting')}</section><section class="card"><h2>需關注事項</h2><div class="inbox-row"><strong>已到期證件</strong><span>${overdue.length}</span>${link('核對','documents',{tab:'overview'})}</div><div class="inbox-row"><strong>期間請假人數</strong><span>${new Set(leave.map(x=>x.employeeId)).size}</span>${link('核對','attendance',{tab:'calendar',month:per.end.slice(0,7)})}</div><div class="inbox-row"><strong>考核完成</strong><span>${kpis.filter(x=>x.status==='completed').length} / ${kpis.length}</span>${link('考核結果','performance',{tab:'results'})}</div>${link('我的待辦','approvals')}</section></div><section class="card space-top"><h2>各部門近況</h2><div class="table-wrap"><table class="department-matrix"><thead><tr><th>部門</th><th>在職人員</th><th>期間請假人數</th><th>考核完成／總數</th></tr></thead><tbody>${[...new Set(ps.map(x=>x.department))].map(dept=>{const ids=new Set(ps.filter(p=>p.department===dept).map(p=>p.id)),ks=kpis.filter(x=>ids.has(x.employeeId));return `<tr><td>${E(dept)}</td><td>${ids.size}</td><td>${new Set(leave.filter(x=>ids.has(x.employeeId)).map(x=>x.employeeId)).size}</td><td>${ks.filter(x=>x.status==='completed').length} / ${ks.length}</td></tr>`;}).join('')}</tbody></table></div></section><section class="card space-top"><h2>工程進度</h2>${projects.map(p=>`<div class="inbox-row"><strong>${E(p.title||p.name||p.id)}</strong><span>已驗收 ${(p.work||[]).filter(w=>w.status==='accepted').length} / ${(p.work||[]).length} · 逾期 ${(p.work||[]).filter(w=>w.status!=='accepted'&&w.due<D.today).length}</span>${link('工作與里程碑','engineering',{id:p.id})}</div>`).join('')||'<p class="muted">目前公司沒有工程專案。</p>'}</section><section class="card space-top"><h2>各公司已入帳摘要</h2><p class="mini">公司帳分開，切換上方公司即可查看各單位。不同幣別不直接合併。</p>${['KYD','ZEUS'].map(c=>{const s=totals(c,per.start,per.end);return `<div class="inbox-row"><strong>${E(c)}</strong><span>收入 ${E(D.money(s.income))} · 費用 ${E(D.money(s.expense))} · ${E(s.currency)}</span></div>`;}).join('')}</section>`;
 }
 document.addEventListener('submit',e=>{const f=e.target.closest?.('[data-management-filter]');if(!f)return;e.preventDefault();D.go('home',Object.fromEntries(new FormData(f)));});
 const oldHome=D.modules.home.render;
 D.modules.home.render=r=>executive()&&r?.dashboard!=='work'?dashboard(r||{}):oldHome(r)+(team()?`<div class="action-row space-top">${link('全員假勤與工時','attendance',{tab:'summary'})}${link('全員證件總表','documents',{tab:'overview'})}${link('可視化班表','attendance',{tab:'calendar'})}</div>`:'');
 D.managementOverview={summaryRows,workHours,totals,documentRows,period};
})();
