/* Configurable meeting examples. Never reads or writes formal personnel/payroll. */
(()=>{'use strict';
 const D=window.D,E=D.esc.bind(D),pending=x=>['review','approval'].includes(x.status);
 const types={annual:'年假',special:'特別假（家庭事件）',maternity:'產假',sick:'病假',personal:'事假',unpaid:'無薪假'};
 const kindNames={leave:'請假',cancel:'銷假',overtime:'加班',field:'外勤'};
 const editors=()=>['hrmanager','admin'].includes(D.role);
 const cross=()=>['ceo','chairman','admin'].includes(D.role);
 const inCompany=c=>c===D.company&&(cross()||c===D.actor.company);
 const person=id=>D.state.people.find(p=>p.id===id);
 const roleForId=id=>Object.keys(D.roles).find(r=>D.roles[r].id===id);
 const approverRoles=['hrmanager','manager','ceo','chairman'];
 const store=()=>D.state.leaveRuleSettings;
 const validMonth=s=>/^\d{4}-(0[1-9]|1[0-2])$/.test(s||'');
 const monthIndex=s=>Number(s.slice(0,4))*12+Number(s.slice(5,7))-1;
 const round=n=>Math.round((n+Number.EPSILON)*100)/100;
 function seed(s){
  s.leaveRuleSettings??={version:1,policies:{},routes:[],accounts:{},adjustments:[],customTypes:[],history:[]};
  const st=s.leaveRuleSettings;
  for(const c of ['KYD','ZEUS'])st.policies[c]??={monthlyDays:1.5,hoursPerDay:8,accruedThrough:D.dateAdd(D.today.slice(0,7)+'-01',-1).slice(0,7),reservePending:true,note:'示例：每月 1.5 天、每日 8 小時；正式起算、結轉及計薪規則待核定。'};
  for(const p of s.people)st.accounts[p.company+':'+p.id]??={startMonth:D.today.slice(0,4)+'-01',openingHours:0};
  for(const t of st.customTypes)types[t.id]=t.name;
 }
 function typeOptions(company){return Object.fromEntries(Object.entries(types).filter(([id])=>!id.startsWith('custom_')||store().customTypes.some(t=>t.id===id&&t.company===company)));}
 function defaultStages(role){return role==='hrmanager'?['ceo','chairman']:role==='ceo'?['hrmanager','chairman']:['hrmanager','ceo'];}
 function route(x){
  seed(D.state);const role=roleForId(x.employeeId),department=person(x.employeeId)?.department||'';
  const matches=store().routes.filter(r=>r.company===x.company&&r.kind===x.kind&&(!r.department||r.department===department)&&(!r.applicantRole||r.applicantRole===role));
  matches.sort((a,b)=>(!!b.department*2+!!b.applicantRole)-(!!a.department*2+!!a.applicantRole));
  const r=matches[0];if(r&&!r.enabled)throw Error('這類申請的簽核路線尚未啟用。');
  const stages=(r?r.stages:defaultStages(role)).slice();
  if(stages.length<1||stages.length>3||new Set(stages).size!==stages.length||stages.some(k=>!approverRoles.includes(k)||!D.roles[k]||D.roles[k].id===x.employeeId))throw Error('請設定一至三位彼此獨立、且不是申請人的簽核人。');
  return {stages,ruleId:r?.id||'illustrative-default',revision:r?.revision||1};
 }
 function stages(x){return x.routeStages?.length?x.routeStages:[x.reviewer,x.approver].filter(Boolean);}
 function index(x){return Number.isInteger(x.routeIndex)?x.routeIndex:(x.status==='approval'?Math.max(0,stages(x).length-1):0);}
 function current(x){return pending(x)?stages(x)[index(x)]:null;}
 function teamVisible(id,c){const p=person(id),me=person(D.actor.id);return inCompany(c)&&(id===D.actor.id||['hr','hrmanager','ceo','chairman','admin'].includes(D.role)||D.role==='manager'&&p?.department&&p.department===me?.department);}
 function visible(x){return !!x&&inCompany(x.company)&&(x.employeeId===D.actor.id||!['draft','withdrawn'].includes(x.status)&&(stages(x).includes(D.role)||teamVisible(x.employeeId,x.company)));}
 function actions(x){
  if(!visible(x))return [];
  if(x.employeeId===D.actor.id)return ['draft','returned'].includes(x.status)?['edit','submit','withdraw']:pending(x)?['withdraw']:x.status==='approved'&&x.kind==='leave'?['cancel']:[];
  if(pending(x)&&current(x)===D.role&&!x.stageDecisions?.some(d=>d.actorId===D.actor.id))return [index(x)===stages(x).length-1?'approve':'review','return'];
  return [];
 }
 function balance(employeeId,company,excludeId=''){
  seed(D.state);const p=store().policies[company],a=store().accounts[company+':'+employeeId];
  if(!p||!a)return {configured:false,allocation:0,used:0,pending:0,available:0,opening:0,accrual:0,adjustment:0};
  const months=Math.max(0,monthIndex(p.accruedThrough)-monthIndex(a.startMonth)+1),accrual=round(months*p.monthlyDays*p.hoursPerDay);
  const adjustment=round(store().adjustments.filter(x=>x.company===company&&x.employeeId===employeeId).reduce((n,x)=>n+x.hours,0));
  const rows=(D.state.leaveRequests||[]).filter(x=>x.id!==excludeId&&x.company===company&&x.employeeId===employeeId&&x.kind==='leave'&&x.leaveType==='annual'&&(x.startDate||x.date||'').slice(0,4)===a.startMonth.slice(0,4));
  const used=round(rows.filter(x=>x.status==='approved').reduce((n,x)=>n+effectiveHours(x),0));
  const reserved=round(rows.filter(pending).reduce((n,x)=>n+Number(x.hours||0),0));
  const allocation=round(a.openingHours+accrual+adjustment);
  return {configured:true,allocation,opening:a.openingHours,accrual,adjustment,months,used,pending:reserved,available:round(allocation-used-(p.reservePending?reserved:0)),policy:p};
 }
 function capacity(x){if(x.kind==='leave'&&x.leaveType==='annual'){const a=store().accounts[x.company+':'+x.employeeId];if(!a||(x.startDate||x.date||'').slice(0,4)!==a.startMonth.slice(0,4)||(x.endDate||x.date||'').slice(0,4)!==a.startMonth.slice(0,4))throw Error('跨年年假請分開申請，並先確認對應年度額度。');}if(x.kind==='leave'&&x.leaveType==='annual'&&Number(x.hours)>balance(x.employeeId,x.company,x.id).available)throw Error('年假餘額不足，請調整時數或自行選擇其他適用假別；不會自動更改假別。');}
 function original(x){return D.state.leaveRequests.find(p=>p.id===x.cancelOf&&p.company===x.company&&p.employeeId===x.employeeId&&p.kind==='leave');}
 function interval(x){return {start:(x.startDate||x.date)+'T'+(x.startTime||'00:00'),end:(x.endDate||x.date)+'T'+(x.endTime||'23:59')};}
 function effectiveHours(x){return x.status==='cancelled'?0:Math.max(0,round(Number(x.hours||0)-Number(x.cancelledHours||0)));}
 function effectiveSegments(x){
  let parts=[interval(x)];if(x.status==='cancelled')return [];
  for(const cut of x.cancelledSegments||[])parts=parts.flatMap(p=>cut.start>=p.end||cut.end<=p.start?[p]:[{start:p.start,end:cut.start},{start:cut.end,end:p.end}].filter(a=>a.start<a.end&&a.start>=p.start&&a.end<=p.end));
  return parts;
 }
 function overlapping(x,start,end){return effectiveSegments(x).some(p=>p.start<end&&p.end>start);}
 function validateCancellation(x){
  const old=original(x);if(!old||old.status!=='approved'||!effectiveHours(old))throw Error('請選擇本人仍有未銷時數的已核准請假。');
  if(D.state.leaveRequests.some(p=>p.id!==x.id&&p.cancelOf===x.cancelOf&&pending(p)))throw Error('原請假已有處理中的銷假申請，請先完成或撤回。');
  const total=effectiveHours(old),part=interval(x),hours=Number(x.hours);
  if(!Number.isFinite(hours)||hours<=0||hours>total)throw Error('銷假時數不可超過原請假尚未銷回的時數。');
  if(x.cancelMode==='partial'){
   if(!effectiveSegments(old).some(p=>part.start>=p.start&&part.end<=p.end&&part.end>part.start))throw Error('銷假期間須位於原請假尚未銷回的期間內。');
   if(hours!==(Date.parse(part.end+':00Z')-Date.parse(part.start+':00Z'))/3600000)throw Error('部分銷假請填寫相同長度的實際未休時段與時數；休息時間請分開處理。');
   if(hours>=total)throw Error('銷回全部剩餘時數時，請選擇全部銷假。');
  }else if(hours!==total)throw Error('原請假剩餘時數已變更，請重新開啟銷假申請。');
  return old;
 }
 function assertOpenPeriod(x){
  const start=(x.startDate||x.date||'').slice(0,7),end=(x.endDate||x.date||'').slice(0,7);
  if((D.state.attendanceDemo?.periods||[]).some(p=>p.company===x.company&&['review','locked'].includes(p.status)&&p.month>=start&&p.month<=end))throw Error('這個月份已送審或鎖定，請先重新開啟月結，再調整假勤。');
 }
 function coversShift(row,shift){
  if(!shift?.start||!shift?.end)return false;
  const start=row.date+'T'+shift.start,end=(shift.overnight?D.dateAdd(row.date,1):row.date)+'T'+shift.end;
  return (D.state.leaveRequests||[]).some(x=>x.company===row.company&&x.employeeId===row.employeeId&&x.kind==='leave'&&x.status==='approved'&&effectiveSegments(x).some(p=>p.start<=start&&p.end>=end));
 }
 function validateDraft(x){
  if(!Number.isFinite(Number(x.hours))||Number(x.hours)<=0)throw Error('申請時數須大於零。');
  const start=Date.parse((x.startDate||x.date)+'T'+(x.startTime||'00:00')+':00Z'),end=Date.parse((x.endDate||x.date)+'T'+(x.endTime||'23:59')+':00Z');
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||Number(x.hours)>(end-start)/3600000)throw Error('請核對申請期間與時數。');
  if(!String(x.reason||'').trim()||!String(x.handover||'').trim())throw Error('請填寫事由與交接安排。');
  if(x.kind==='leave'&&!typeOptions(x.company)[x.leaveType])throw Error('請選擇有效假別。');
  if(x.evidenceUrl){try{if(new URL(x.evidenceUrl).protocol!=='https:')throw Error();}catch{throw Error('佐證連結須使用 HTTPS。');}}
 }
 function history(x,action,note){x.history??=[];x.history.push({at:D.today,actor:D.actor.name,actorId:D.actor.id,action,note});D.log(x.id+' '+action);}
 function assertNoOverlap(x){
  if(x.kind!=='leave')return;
  const start=r=>(r.startDate||r.date)+'T'+(r.startTime||'00:00'),end=r=>(r.endDate||r.date)+'T'+(r.endTime||'23:59');
  if(D.state.leaveRequests.some(r=>r.id!==x.id&&r.company===x.company&&r.employeeId===x.employeeId&&r.kind==='leave'&&['review','approval','approved'].includes(r.status)&&overlapping(r,start(x),end(x))))throw Error('請假期間重疊：同一時段已有待審或已核准請假，請先修改、撤回或銷假。');
 }
 function transition(id,action,note=''){
  const x=D.state.leaveRequests.find(r=>r.id===id);if(!x||!actions(x).includes(action))throw Error('目前身分或公司不能執行這一步。');
  if(['submit','review','approve','withdraw'].includes(action))assertOpenPeriod(x);
  if(action==='return'&&!String(note).trim())throw Error('請填寫退回原因。');
  let chosen;
  if(action==='submit'){validateDraft(x);chosen=route(x);assertNoOverlap(x);capacity(x);}
  if(['review','approve'].includes(action)){validateDraft(x);assertNoOverlap(x);capacity(x);}
  if(x.kind==='cancel'&&['submit','review','approve'].includes(action)){
   validateCancellation(x);
  }
  D.mutate(()=>{
   if(action==='submit'){
    if(x.routeStages)x.routeHistory=[...(x.routeHistory||[]),{stages:x.routeStages,decisions:x.stageDecisions||[],ruleId:x.routeRuleId}];
    Object.assign(x,{routeStages:chosen.stages,routeRuleId:chosen.ruleId,routeRevision:chosen.revision,routeIndex:0,stageDecisions:[],reviewer:chosen.stages[0],approver:chosen.stages.at(-1),status:chosen.stages.length===1?'approval':'review'});delete x.reviewedBy;delete x.approvedBy;
   }
   if(['review','approve'].includes(action)){
    x.stageDecisions??=[];x.stageDecisions.push({index:index(x),actorId:D.actor.id,role:D.role,at:D.today,note});
    if(action==='review'){x.reviewedBy=D.actor.id;x.routeIndex=index(x)+1;x.status=x.routeIndex===stages(x).length-1?'approval':'review';}
    else{x.status='approved';x.approvedBy=D.actor.id;if(x.kind==='cancel'){const old=original(x),cuts=x.cancelMode==='partial'?[interval(x)]:effectiveSegments(old);old.cancelledHours=round(Number(old.cancelledHours||0)+Number(x.hours));old.cancelledSegments=[...(old.cancelledSegments||[]),...cuts];old.cancelledBy=x.id;if(effectiveHours(old)===0)old.status='cancelled';history(old,'已核准'+(x.cancelMode==='partial'?'部分':'全部')+'銷假',x.id+' · '+x.hours+' 小時');}}
   }
   if(action==='return')x.status='returned';if(action==='withdraw')x.status='withdrawn';
   history(x,({submit:'送出申請',review:'複核通過，移交下一層',approve:'核准',return:'退回修改',withdraw:'撤回申請'})[action],note);
  });return x;
 }
 function saveRoute(v){
  if(!editors()||!inCompany(D.company))throw Error('請由本公司人資主管或管理員設定。');
  if(!kindNames[v.kind]||v.applicantRole&&!D.roles[v.applicantRole])throw Error('申請類型或角色不正確。');
  const levels=Number(v.levels);if(!Number.isInteger(levels)||levels<1||levels>3)throw Error('請設定一至三層。');
  const list=[v.stage1,v.stage2,v.stage3].slice(0,levels);
  if(list.some(x=>!approverRoles.includes(x))||new Set(list).size!==list.length||v.applicantRole&&list.includes(v.applicantRole))throw Error('簽核人須彼此獨立，且不能包含申請人。');
  const department=String(v.department||'').trim();if(department&&!D.state.people.some(p=>p.company===D.company&&p.department===department))throw Error('請選擇本公司的部門。');
  let x=store().routes.find(r=>r.company===D.company&&r.kind===v.kind&&r.department===department&&r.applicantRole===(v.applicantRole||''));
  D.mutate(()=>{if(!x){x={id:'LR-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),company:D.company,kind:v.kind,department,applicantRole:v.applicantRole||'',revision:0};store().routes.push(x);}store().history.push({at:D.today,actor:D.actor.id,action:'設定簽核路線',before:structuredClone(x)});Object.assign(x,{stages:list,enabled:v.enabled!=='no',revision:x.revision+1});D.log('更新假勤簽核路線；已送出申請保留原簽核路線。');});return x;
 }
 function savePolicy(v){
  if(!editors()||!inCompany(D.company))throw Error('請由本公司人資主管或管理員設定。');
  const monthlyDays=Number(v.monthlyDays),hoursPerDay=Number(v.hoursPerDay);
  if(!Number.isFinite(monthlyDays)||monthlyDays<0||monthlyDays>31||!Number.isFinite(hoursPerDay)||hoursPerDay<=0||hoursPerDay>24||!validMonth(v.accruedThrough)||v.accruedThrough>D.today.slice(0,7))throw Error('請核對累計天數、每日時數及計算截止月份。');
  if(!String(v.note||'').trim())throw Error('請填寫設定依據。');
  for(const p of D.state.people.filter(p=>p.company===D.company)){const b=balance(p.id,D.company),a=store().accounts[D.company+':'+p.id],months=Math.max(0,monthIndex(v.accruedThrough)-monthIndex(a.startMonth)+1);if(round(b.opening+months*monthlyDays*hoursPerDay+b.adjustment-b.used-(v.reservePending!=='no'?b.pending:0))<0)throw Error('新規則會使員工可用額度為負數，請先核對申請與額度。');}
  D.mutate(()=>{const old=store().policies[D.company];store().history.push({at:D.today,actor:D.actor.id,company:D.company,action:'更新年假規則',before:structuredClone(old)});Object.assign(old,{monthlyDays,hoursPerDay,accruedThrough:v.accruedThrough,reservePending:v.reservePending!=='no',note:v.note.trim()});D.log('更新年假示例計算規則');});
 }
 function adjust(v){
  if(!editors()||!inCompany(D.company)||!person(v.employeeId)||person(v.employeeId).company!==D.company)throw Error('只能調整本公司的員工額度。');
  const hours=Number(v.hours);if(!Number.isFinite(hours)||hours===0||Math.abs(hours)>10000||!String(v.reason||'').trim())throw Error('請填寫有效的調整時數與原因。');
  if(balance(v.employeeId,D.company).available+hours<0)throw Error('調整後可用餘額不可為負數。');
  D.mutate(()=>{store().adjustments.push({id:'LA-'+Date.now(),company:D.company,employeeId:v.employeeId,hours,reason:v.reason.trim(),at:D.today,actor:D.actor.name});D.log('登記年假額度調整');});
 }
 const button=(text,action)=>`<button class="btn" data-action="${action}">${E(text)}</button>`;
 function balanceHTML(){const b=balance(D.actor.id,D.company);return `<section class="card"><h2>我的年假餘額</h2><div class="grid four">${[['累計額度',b.allocation],['已核准使用',b.used],['申請中預留',b.pending],['目前可用',b.available]].map(([t,n])=>`<div class="stat"><small>${t}</small><strong>${n}h</strong></div>`).join('')}</div><p class="mini">計算截止月份：${E(b.policy?.accruedThrough||'未設定')} · 每月 ${b.policy?.monthlyDays||0} 天 · 每日 ${b.policy?.hoursPerDay||0} 小時</p><p>期初 ${b.opening}h ＋ 累計 ${b.accrual}h ＋ 調整 ${b.adjustment}h。核准銷假後恢復額度。</p>${b.available<0?'<p class="notice amber">目前額度需要核對；不足額申請無法送出或核准。</p>':''}</section><section class="card space-top"><h2>額度調整紀錄</h2>${store().adjustments.filter(x=>x.employeeId===D.actor.id&&x.company===D.company).map(x=>`<p>${E(x.at)} · ${x.hours}h · ${E(x.reason)}</p>`).join('')||'<p class="muted">尚無額度調整。</p>'}</section>`;}
 function policyHTML(){
  if(!editors()||!inCompany(D.company))return D.empty('目前身分無法設定假勤規則');
  seed(D.state);const p=store().policies[D.company];
  return `<section class="card"><div class="row"><h2>年假計算</h2>${button('設定年假規則','lr-policy')}${button('調整員工額度','lr-adjust')}</div><p>每月 ${p.monthlyDays} 天 · 每日 ${p.hoursPerDay} 小時 · 計算至 ${E(p.accruedThrough)}</p><p>${E(p.note)}</p></section><section class="card space-top"><div class="row"><h2>一至三層簽核</h2>${button('設定簽核路線','lr-route')}</div><p class="mini">依公司、申請類型、部門及申請人角色設定。已送出申請保留原路線。</p><div class="table-wrap"><table><thead><tr><th>類型</th><th>部門／角色</th><th>處理順序</th><th>狀態</th></tr></thead><tbody>${store().routes.filter(x=>x.company===D.company).map(x=>`<tr><td>${kindNames[x.kind]}</td><td>${E(x.department||'全部部門')} / ${E(D.roles[x.applicantRole]?.label||'全部角色')}</td><td>${x.stages.map(r=>E(D.roles[r].label)).join(' → ')}</td><td>${x.enabled?'已啟用':'未啟用'}</td></tr>`).join('')}</tbody></table></div><p class="mini">未另設的情境沿用目前兩層示例；正式准假表仍以董總核定為準。</p></section><section class="card space-top"><div class="row"><h2>假別與適用規則</h2>${button('新增公司假別','lr-type')}</div><p>${Object.values(typeOptions(D.company)).map(E).join(' · ')}</p><p class="mini">年假、家庭事件特別假、產假與病假分開管理；事假及無薪假依公司制度。國定假日與每週休息日屬班表日曆，不當作請假扣除。</p><p class="mini">額度、薪資、佐證及適用條件仍須按正式制度設定，這裡不自動計薪。</p><a href="https://natlex.ilo.org/dyn/natlex2/natlex2/files/download/46560/KHM46560.pdf" target="_blank" rel="noopener noreferrer">柬埔寨勞動法參考（第 71、166–171、182 條）</a></section>`;
 }
 function guarded(title,body,fn){const actor=D.actor.id,c=D.company;D.modal(title,body,v=>{if(actor!==D.actor.id||c!==D.company)throw Error('身分或公司已變更，請重新開啟。');return fn(v);});}
 D.on('lr-policy',()=>{if(!editors())throw Error('目前身分不能設定。');const p=store().policies[D.company];guarded('設定年假規則',`<div class="form-grid"><label class="field">每月累計天數<input name="monthlyDays" type="number" min="0" max="31" step="0.5" value="${p.monthlyDays}" required></label><label class="field">每日換算時數<input name="hoursPerDay" type="number" min="0.5" max="24" step="0.5" value="${p.hoursPerDay}" required></label><label class="field">計算截止月份<input name="accruedThrough" type="month" value="${p.accruedThrough}" required></label><label class="field">待審是否預留額度${D.select('reservePending',[['yes','預留'],['no','核准才扣額度']],p.reservePending?'yes':'no')}</label><label class="field full">設定依據<textarea name="note" required>${E(p.note)}</textarea></label></div>`,savePolicy);});
 D.on('lr-adjust',()=>{if(!editors())throw Error('目前身分不能調整。');guarded('調整員工額度',`<div class="form-grid"><label class="field">員工${D.select('employeeId',D.state.people.filter(p=>p.company===D.company&&p.active).map(p=>[p.id,p.name]))}</label><label class="field">調整時數（可正負）<input type="number" step="0.5" name="hours" required></label><label class="field full">調整原因<textarea name="reason" required></textarea></label></div>`,adjust);});
 D.on('lr-route',()=>{if(!editors())throw Error('目前身分不能設定。');const depts=[...new Set(D.state.people.filter(p=>p.company===D.company).map(p=>p.department))];guarded('設定簽核路線',`<div class="form-grid"><label class="field">申請類型${D.select('kind',Object.entries(kindNames),'leave')}</label><label class="field">部門${D.select('department',[['','全部部門'],...depts.map(d=>[d,d])],'',false)}</label><label class="field">申請人角色${D.select('applicantRole',[['','全部角色'],...Object.entries(D.roles).map(([k,a])=>[k,a.label])],'',false)}</label><label class="field">簽核層數${D.select('levels',[[1,'一層'],[2,'兩層'],[3,'三層']],2)}</label>${[1,2,3].map((n)=>`<label class="field">第 ${n} 層${D.select('stage'+n,approverRoles.map(k=>[k,D.roles[k].label]),['manager','hrmanager','ceo'][n-1])}</label>`).join('')}<label class="field">狀態${D.select('enabled',[['yes','已啟用'],['no','未啟用']],'yes')}</label></div><p class="mini">只使用所選層數；最後一層核准，其餘層複核。不能自審或重複簽核。</p>`,saveRoute);});
 D.on('lr-type',()=>{if(!editors())throw Error('目前身分不能設定。');guarded('新增公司假別','<label class="field">假別名稱<input name="name" maxlength="40" required></label>',v=>{if(!editors()||!v.name?.trim())throw Error('請填寫假別名稱。');const name=v.name.trim();if(Object.values(types).includes(name))throw Error('已有同名假別。');D.mutate(()=>{const id='custom_'+Date.now();store().customTypes.push({id,name,company:D.company});types[id]=name;D.log('新增公司假別');});});});
 D.leaveRules={effectiveHours,effectiveSegments,overlapping,validateCancellation,types,typeOptions,assertOpenPeriod,coversShift,seed,route,stages,current,actions,visible,teamVisible,balance,transition,validateDraft,saveRoute,savePolicy,adjust,balanceHTML,policyHTML,canEdit:editors,
  routeFor:role=>{const s=defaultStages(role);return {reviewer:s[0],approver:s.at(-1)};},
  stepsHTML:x=>`<ol class="steps"><li class="step">填寫申請</li>${stages(x).map((r,i)=>`<li class="step ${pending(x)&&index(x)===i?'active':''}">${E(D.roles[r]?.label||r)} · ${i===stages(x).length-1?'核准':'複核'}</li>`).join('')}<li class="step">核准結果</li></ol>`,
  extraFields:x=>`${D.localAttachments?.field(x.attachments)||''}<label class="field full">佐證連結（選填）<input name="evidenceUrl" type="url" value="${E(x.evidenceUrl||'')}" placeholder="https://"></label>`};
})();
