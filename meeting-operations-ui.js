function documentExpiryHome(){
 const id=state.session?.user.employee_id;
 const rows=(state.attachments?.documents||[]).filter(d=>d.employeeId===id&&['expired','soon','awaiting'].includes(documentState(d).key));
 return rows.length?`<section class="notice"><div><strong>${L('我的證件提醒','My document reminders','ការរំលឹកឯកសាររបស់ខ្ញុំ')} · ${rows.length}</strong><p>${rows.map(d=>esc(d.type)+' · '+documentState(d).label).join(' / ')}</p></div><a class="button" href="${href('documents')}">${L('查看文件與期限','View documents and dates','មើលឯកសារ និងកាលបរិច្ឆេទ')}</a></section>`:'';
}
// Shared desktop/mobile controls for the confirmed November 12 workflow changes.
function scheduleMonth(){const value=route().month;return /^\d{4}-(0[1-9]|1[0-2])$/.test(value||'')?value:attData().day.slice(0,7)}
function departmentTone(name){let h=0;for(const c of name||'')h=(h*31+c.charCodeAt(0))>>>0;return h%6}
function scheduleCalendar(){
 const a=attData(),month=scheduleMonth(),department=route().department||'',days=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
 const staff=a.people.filter(p=>!state.company||p.company===state.company),departments=[...new Set(staff.map(p=>p.department||''))].sort();
 const rows=scoped(a.schedules).filter(r=>r.status!=='cancelled'&&r.date.startsWith(month)&&(!department||(attPerson(r.employeeId)?.department||'')===department));
 const leaves=scoped(a.leaves||[]).filter(r=>!department||(attPerson(r.employeeId)?.department||'')===department);
 const personLabel=id=>{const p=attPerson(id);return `<strong>${esc(p?.name||id)}</strong><small>${esc(p?.department||L('部門未設定','Department not set','មិនទាន់កំណត់ផ្នែក'))}</small>`};
 const offset=(new Date(month+'-01T12:00:00Z').getUTCDay()+6)%7;
 let cells=Array.from({length:offset},()=>'<div class="schedule-day blank" aria-hidden="true"></div>');
 for(let d=1;d<=days;d++){
  const date=month+'-'+String(d).padStart(2,'0'),start=Date.parse(date+'T00:00:00+07:00'),end=start+86400000;
  const dayRows=rows.filter(r=>r.date===date),dayLeave=leaves.filter(r=>r.start<end&&r.end>start);
  cells.push(`<section class="schedule-day ${date===a.day?'today':''}"><h3><time datetime="${date}">${d}</time><small>${dayRows.length} ${L('班','shifts','វេន')}</small></h3>${dayRows.map(r=>`<article class="schedule-person dept-tone-${departmentTone(attPerson(r.employeeId)?.department)}">${personLabel(r.employeeId)}<span>${esc(r.shift.start)}–${esc(r.shift.end)}${r.shift.overnight?' +1':''}</span><small>${esc(r.shift.name)} · ${attStatus(r.status)}</small><small>${esc(companyName(r.company))} · ${esc(r.siteName)}</small><div class="button-row">${attScheduleActions(r)}</div></article>`).join('')}${dayLeave.map(r=>`<article class="schedule-person leave">${personLabel(r.employeeId)}<span>${L('已核准請假','Approved leave','ច្បាប់ឈប់បានអនុម័ត')}</span><small>${new Date(Math.max(start,r.start)).toLocaleTimeString('en-GB',{timeZone:'Asia/Phnom_Penh',hour:'2-digit',minute:'2-digit'})}–${r.end>=end?'24:00':new Date(r.end).toLocaleTimeString('en-GB',{timeZone:'Asia/Phnom_Penh',hour:'2-digit',minute:'2-digit'})}</small></article>`).join('')}${!dayRows.length&&!dayLeave.length?`<p class="muted">${L('未排班','No shifts','គ្មានវេន')}</p>`:''}</section>`);
 }
 return `<div class="toolbar"><label>${L('月份','Month','ខែ')}<input type="month" id="schedule-month" value="${month}"></label><label>${t('部門')}<select id="schedule-department"><option value="">${L('全部部門','All departments','គ្រប់ផ្នែក')}</option>${departments.filter(Boolean).map(v=>`<option value="${esc(v)}" ${v===department?'selected':''}>${esc(v)}</option>`).join('')}</select></label><span class="count">${rows.length} ${L('筆班次','shifts','វេន')}</span></div><p class="help">${L('姓名下方直接顯示部門；已核准請假另列。手機可左右滑動班表。','Departments appear below names; approved leave is shown separately. Swipe the schedule horizontally on a phone.','ផ្នែកបង្ហាញក្រោមឈ្មោះ និងច្បាប់ឈប់ដែលបានអនុម័តបង្ហាញដាច់ដោយឡែក។ អូសកាលវិភាគលើទូរស័ព្ទ។')}</p><div class="schedule-scroll" tabindex="0" aria-label="${L('每月可視化班表','Monthly visual schedule','កាលវិភាគប្រចាំខែ')}"><div class="schedule-week">${['一','二','三','四','五','六','日'].map((v,i)=>`<b>${L('週'+v,['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],['ចន្ទ','អង្គារ','ពុធ','ព្រហស្បតិ៍','សុក្រ','សៅរ៍','អាទិត្យ'][i])}</b>`).join('')}</div><div class="schedule-month">${cells.join('')}</div></div>`;
}
function initializeMeetingOperationsUI(){
 Object.assign(words,{'假期涵蓋時段':['Leave coverage intervals','រយៈពេលច្បាប់ឈប់បានអនុម័ត'],'報銷申請':['Expense claim','សំណើសងចំណាយ'],'零用金申請':['Petty cash request','សំណើសាច់ប្រាក់តូច'],'用途／費用說明':['Purpose / expense details','គោលបំណង / ព័ត៌មានចំណាយ']});
 const applications=myApplications;
 myApplications=function(){return `<div class="button-row personal-request-buttons">${['expense','pettycash'].filter(canCreate).map(k=>button(kindLabel[k],'new-record',`data-kind="${k}"`)).join('')}</div>`+applications()};
 const accounting=renderAccounting;
 renderAccounting=function(){return (wfFinanceAvailable()?`<section class="notice info"><div><strong>${L('已核准費用申請','Approved expense requests','សំណើចំណាយបានអនុម័ត')} · ${wfFinanceRows().length}</strong><p>${L('查看員工請款與零用金原單，再依公司流程處理款項。','Review employee claims and petty cash requests before handling payment under company procedures.','ពិនិត្យសំណើចំណាយ និងសាច់ប្រាក់តូច មុនដំណើរការទូទាត់តាមនីតិវិធីក្រុមហ៊ុន។')}</p></div><a href="${href('approvals',{tab:'finance'})}">${L('前往財務核對','Open finance review','ទៅការផ្ទៀងផ្ទាត់ហិរញ្ញវត្ថុ')} →</a></section>`:'')+accounting()};
 const scheduleList=attSchedules;
 attSchedules=function(){const mode=route().layout||'calendar';return `<div class="tabs"><a class="${mode==='calendar'?'active':''}" href="${href('attendance',{...route(),tab:'schedule',layout:'calendar'})}">${L('月曆班表','Calendar','ប្រតិទិន')}</a><a class="${mode==='list'?'active':''}" href="${href('attendance',{...route(),tab:'schedule',layout:'list'})}">${L('清單與班別','List & shifts','បញ្ជី និងវេន')}</a></div>`+(mode==='list'?scheduleList():`<div class="button-row">${attData().access.create?attButton('新增班別','shift')+attButton('安排班表','schedule','',true):''}</div>`+scheduleCalendar())};
 document.addEventListener('change',e=>{if(!['schedule-month','schedule-department'].includes(e.target.id))return;const r={...route(),tab:'schedule'};r[e.target.id==='schedule-month'?'month':'department']=e.target.value;location.hash=new URLSearchParams(r).toString()});
 // Refresh only list/home screens while no input or camera session is active.
 // Draft forms keep their contents; every write still checks the server revision.
 let updating=false;
 setInterval(async()=>{if(updating||!state.session||document.visibilityState!=='visible'||document.querySelector('dialog[open]')||document.querySelector('.content form')||document.activeElement?.matches('input,select,textarea,[contenteditable]')||attendanceCapture?.stream||attendanceBusy)return;if(!['home','approvals','applications','projects','training','documents'].includes(route().view||'home'))return;updating=true;try{await refresh()}finally{updating=false}},45000);
}
