/* Native meeting examples for leave and own requests; never write to the ERP API. */
(() => {
 'use strict';
 const D=window.D,E=v=>D.esc(v??''),all=Object.keys(D.roles);
 const kinds={leave:'請假',cancel:'銷假',overtime:'加班',field:'外勤'};
 const statuses={draft:'草稿',review:'待主管複核',approval:'待核准',approved:'已核准',returned:'退回修改',withdrawn:'已撤回',cancelled:'已銷假'};
 const leaveTypes={annual:'年假',personal:'事假',sick:'病假'};
 const head=(title,text,actions='')=>`<header class="page-head"><div><p class="eyebrow">行政人事</p><h1>${E(title)}</h1><p class="lede">${E(text)}</p></div>${actions}</header>`;
 const btn=(title,action,id='',primary=false)=>`<button class="btn${primary?' primary':''}" data-action="${action}" data-id="${E(id)}">${E(title)}</button>`;
 const link=(title,view,params={})=>`<a class="btn" href="#${new URLSearchParams({view,...params})}">${E(title)}</a>`;
 const boundary='';
 const sameCompany=x=>x.company===D.company&&(['ceo','chairman','admin'].includes(D.role)||D.company===D.actor.company);
 const owned=x=>x.employeeId===D.actor.id;
 const isPending=x=>['review','approval'].includes(x.status);
 const amount=x=>Number(x.hours)||0;
 const roleFor=id=>Object.entries(D.roles).find(([,a])=>a.id===id)?.[0];
 function routeFor(role){
  if(role==='hrmanager')return {reviewer:'ceo',approver:'chairman'};
  if(role==='ceo')return {reviewer:'hrmanager',approver:'chairman'};
  return {reviewer:'hrmanager',approver:'ceo'};
 }
 function normalize(x){
  const route=routeFor(roleFor(x.employeeId));
  x.kind??='leave';x.leaveType??='annual';x.startDate??=x.date||D.today;x.endDate??=x.startDate;
  x.startTime??='09:00';x.endTime??='17:00';x.hours??=8;x.handover??='已整理待辦清單，交接事項待同事確認。';x.location??='';x.project??='';x.history??=[];
  // Older one-step examples retained their records; a new illustrative route applies on resubmission.
  if(!x.flowVersion){x.reviewer=route.reviewer;x.approver=route.approver;x.flowVersion=1;}
  return x;
 }
 function seed(s){
  s.leaveRequests??=[];
  s.leaveRequests.forEach(normalize);
  if(s.leaveExamplesVersion===1)return;
  for(const [role,a] of Object.entries(D.roles)){
   const base={company:a.company,employeeId:a.id,employeeName:a.name,...routeFor(role),flowVersion:1,leaveType:'annual',startTime:'09:00',endTime:'17:00',hours:8,handover:'交接清單已整理。',location:'',project:'',history:[]};
   const samples=[
    {...base,id:'LD-'+role+'-approved',kind:'leave',date:'2026-10-15',startDate:'2026-10-15',endDate:'2026-10-15',reason:'年假安排（示例）',status:'approved',history:[{at:'2026-10-10',actor:'示例核准人',action:'示例已完成複核與核准',note:'供銷假與餘額展示使用。'}]},
    {...base,id:'LD-'+role+'-overtime',kind:'overtime',date:'2026-11-05',startDate:'2026-11-05',endDate:'2026-11-05',startTime:'18:00',endTime:'20:00',hours:2,reason:'月底報表整理（示例）',status:'returned',history:[{at:D.today,actor:'示例主管',action:'退回修改',note:'請補充加班工作內容及預期成果。'}]},
    {...base,id:'LD-'+role+'-field',kind:'field',date:'2026-11-07',startDate:'2026-11-07',endDate:'2026-11-07',startTime:'09:00',endTime:'11:00',hours:2,reason:'現場資料核對（示例）',location:'KY iCenter',project:'現場核對',status:'review',history:[{at:D.today,actor:a.name,action:'示例送交複核',note:'主管可在待辦查看。'}]},
    {...base,id:'LD-'+role+'-cancel',kind:'cancel',date:'2026-10-15',startDate:'2026-10-15',endDate:'2026-10-15',cancelOf:'LD-'+role+'-approved',reason:'原訂個人行程取消，申請銷假（示例）',status:'draft'}
   ];
   samples.forEach(x=>{if(!s.leaveRequests.some(y=>y.id===x.id))s.leaveRequests.push(structuredClone(x))});
  }
  s.leaveExamplesVersion=1;
 }
 function visible(x){return !!x&&sameCompany(x)&&(owned(x)||!['draft','withdrawn'].includes(x.status)&&(x.reviewer===D.role||x.approver===D.role));}
 function actions(x){
  if(!visible(x))return [];
  if(owned(x))return ['draft','returned'].includes(x.status)?['edit','submit','withdraw']:isPending(x)?['withdraw']:x.status==='approved'&&x.kind==='leave'?['cancel']:[];
  if(x.status==='review'&&x.reviewer===D.role)return ['review','return'];
  if(x.status==='approval'&&x.approver===D.role&&x.reviewedBy!==D.actor.id)return ['approve','return'];
  return [];
 }
 function addHistory(x,action,note=''){x.history.push({at:D.today,actor:D.actor.name,actorId:D.actor.id,action,note});D.log(`${x.id} ${action}`);}
 function sourceLeave(x){return D.state.leaveRequests.find(p=>p.id===x.cancelOf&&p.company===x.company&&p.employeeId===x.employeeId&&p.kind==='leave');}
 function validateCancellation(x){
  const original=sourceLeave(x);
  if(!original||original.status!=='approved')throw Error('銷假只能連結自己已核准、尚未銷假的請假。');
  if(D.state.leaveRequests.some(p=>p.id!==x.id&&p.cancelOf===x.cancelOf&&['review','approval','approved'].includes(p.status)))throw Error('這筆請假已有處理中的銷假申請。');
  return original;
 }
 function transition(id,action,note=''){
  const x=D.state.leaveRequests.find(r=>r.id===id);
  if(!x||!actions(x).includes(action))throw Error('目前身分或公司不能執行這一步。');
  if(action==='return'&&!String(note).trim())throw Error('請填寫退回原因。');
  if(x.kind==='cancel'&&['submit','review','approve'].includes(action))validateCancellation(x);
  D.mutate(()=>{
   if(action==='submit'){const route=routeFor(roleFor(x.employeeId));Object.assign(x,route,{status:'review'});delete x.reviewedBy;delete x.approvedBy;}
   if(action==='review'){x.status='approval';x.reviewedBy=D.actor.id;}
   if(action==='approve'){x.status='approved';x.approvedBy=D.actor.id;if(x.kind==='cancel'){const original=sourceLeave(x);original.status='cancelled';original.cancelledBy=x.id;addHistory(original,'已核准銷假',x.id);}}
   if(action==='return')x.status='returned';
   if(action==='withdraw')x.status='withdrawn';
   addHistory(x,({submit:'送交主管複核',review:'複核通過，送交核准',approve:'核准',return:'退回修改',withdraw:'撤回申請'})[action],note);
  });
  return x;
 }
 D.leaveDemoActions=actions;D.leaveDemoTransition=transition;
 function times(v){
  const validDate=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  if(!validDate(v.startDate)||!validDate(v.endDate)||v.endDate<v.startDate)throw Error('請填寫有效的開始與結束日期。');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.startTime||'')||!/^([01]\d|2[0-3]):[0-5]\d$/.test(v.endTime||''))throw Error('請填寫有效的開始與結束時間。');
  const elapsed=(Date.parse(v.endDate+'T'+v.endTime+':00Z')-Date.parse(v.startDate+'T'+v.startTime+':00Z'))/3600000;
  if(elapsed<=0||elapsed>744)throw Error('結束時間須晚於開始時間，單次申請最多 31 天。');
  const hours=Number(v.hours);if(!Number.isFinite(hours)||hours<=0||hours>elapsed||hours>248)throw Error('申請時數須大於零，且不可超過所選期間。');
  return hours;
 }
 function form(kind,item=null,cancelOf=''){
  if(!kinds[kind])throw Error('申請類型不正確。');
  const company=D.company,actor=D.actor.id;
  if(company!==D.actor.company||item&&!actions(item).includes('edit'))throw Error('只能在自己的任職公司填寫本人草稿。');
  const originals=D.state.leaveRequests.filter(x=>sameCompany(x)&&owned(x)&&x.kind==='leave'&&x.status==='approved');
  if(kind==='cancel'&&!originals.length)throw Error('目前沒有可銷假的已核准請假。');
  const value=item||{startDate:D.dateAdd(D.today,1),endDate:D.dateAdd(D.today,1),startTime:kind==='overtime'?'18:00':'09:00',endTime:kind==='overtime'?'20:00':'17:00',hours:kind==='overtime'?2:8,leaveType:'annual',cancelOf:cancelOf||originals[0]?.id};
  const fields=kind==='cancel'?`<label class="field full">要銷假的原申請${D.select('cancelOf',originals.map(x=>[x.id,`${x.startDate} · ${leaveTypes[x.leaveType]||'請假'} · ${x.hours} 小時 · ${x.id}`]),value.cancelOf)}</label><p class="mini">銷回整筆申請，保留原請假與審核紀錄。</p>`:`${kind==='leave'?`<label class="field full">假別${D.select('leaveType',Object.entries(leaveTypes),value.leaveType)}</label>`:''}<label class="field">開始日期<input name="startDate" type="date" value="${E(value.startDate)}" required></label><label class="field">結束日期<input name="endDate" type="date" value="${E(value.endDate)}" required></label><label class="field">開始時間<input name="startTime" type="time" value="${E(value.startTime)}" required></label><label class="field">結束時間<input name="endTime" type="time" value="${E(value.endTime)}" required></label><label class="field">申請時數<input name="hours" type="number" value="${E(value.hours)}" min="0.5" max="248" step="0.5" required></label>${kind==='field'?`<label class="field">外勤地點<input name="location" value="${E(value.location)}" maxlength="160" required></label><label class="field full">工作項目<input name="project" value="${E(value.project)}" maxlength="160" required></label>`:''}`;
  D.modal(`${item?'修改':'新增'}${kinds[kind]}申請`, `<div class="form-grid">${fields}<label class="field full">${kind==='overtime'?'加班工作與預期成果':kind==='field'?'外勤目的':kind==='cancel'?'銷假原因':'請假事由'}<textarea name="reason" maxlength="1000" required>${E(value.reason)}</textarea></label><label class="field full">交接安排<textarea name="handover" maxlength="1000" required>${E(value.handover)}</textarea></label></div><p class="mini">儲存草稿後送交複核。</p>`,v=>{
   if(D.company!==company||D.actor.id!==actor||item&&!actions(item).includes('edit'))throw Error('身分、公司或申請狀態已改變，請重新開啟。');
   if(!String(v.reason||'').trim()||!String(v.handover||'').trim())throw Error('請填寫事由與交接安排。');
   if(kind==='leave'&&!leaveTypes[v.leaveType])throw Error('請選擇假別。');
   if(kind==='field'&&(!String(v.location||'').trim()||!String(v.project||'').trim()))throw Error('請填寫外勤地點與工作項目。');
   const patch={kind,reason:v.reason.trim(),handover:v.handover.trim()};
   if(kind==='cancel'){
    const original=originals.find(x=>x.id===v.cancelOf);if(!original||original.status!=='approved')throw Error('請選擇本人已核准的請假。');
    Object.assign(patch,{cancelOf:original.id,date:original.startDate,startDate:original.startDate,endDate:original.endDate,startTime:original.startTime,endTime:original.endTime,hours:original.hours,leaveType:original.leaveType});
   }else Object.assign(patch,{startDate:v.startDate,endDate:v.endDate,date:v.startDate,startTime:v.startTime,endTime:v.endTime,hours:times(v),leaveType:kind==='leave'?v.leaveType:'',location:kind==='field'?v.location.trim():'',project:kind==='field'?v.project.trim():''});
   const x=item||{id:'REQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,6),company,employeeId:actor,employeeName:D.actor.name,status:'draft',flowVersion:1,...routeFor(D.role),history:[]};
   if(kind==='cancel')validateCancellation({...x,...patch});
   D.mutate(s=>{Object.assign(x,patch);if(!item)s.leaveRequests.push(x);addHistory(x,'儲存草稿');});D.go('leave',{id:x.id});
  },'儲存草稿');
 }
 const actionTitles={edit:'修改內容',submit:'送交主管複核',review:'複核通過',approve:'核准',return:'退回修改',withdraw:'撤回申請',cancel:'申請銷假'};
 for(const a of Object.keys(actionTitles))D.on('leave-demo-'+a,el=>{
  const x=D.state.leaveRequests.find(p=>p.id===el.dataset.id);if(!x||!actions(x).includes(a))throw Error('目前身分或公司不能執行這一步。');
  if(a==='edit')return form(x.kind,x);if(a==='cancel')return form('cancel',null,x.id);
  D.modal(actionTitles[a],`<p>${E(kinds[x.kind])} · ${E(x.employeeName)} · ${E(x.startDate)} · ${E(x.hours)} 小時</p><label class="field">${a==='return'?'退回原因（必填）':'處理備註'}<textarea name="note" maxlength="1000" ${a==='return'?'required':''}></textarea></label>`,v=>transition(x.id,a,v.note||''),'確認');
 });
 D.on('leave-demo-new',el=>form(el.dataset.id));
 // Old action names must not skip the separate review and approval steps.
 for(const old of ['submit','approve','return'])D.on('leave-'+old,el=>{
  const x=D.state.leaveRequests.find(p=>p.id===el.dataset.id),action=old==='approve'?(x?.status==='review'?'review':'approve'):old;
  if(!x||!actions(x).includes(action))throw Error('目前身分或公司不能執行這一步。');
  D.modal(actionTitles[action],`<p>${E(kinds[x.kind])} · ${E(x.employeeName)}</p><label class="field">${old==='return'?'退回原因':'處理備註'}<textarea name="note" ${old==='return'?'required':''}></textarea></label>`,v=>transition(x.id,action,v.note||''),'確認');
 });
 function cards(){return `<div class="grid four">${Object.entries(kinds).map(([k,title])=>`<section class="card"><h3>${title}</h3><p class="mini">${({leave:'填寫假別、期間與交接。',cancel:'連回已核准請假，保留歷史。',overtime:'說明時數、工作與預期成果。',field:'記錄地點、項目與外勤時段。'})[k]}</p>${D.company===D.actor.company?btn('新增'+title,'leave-demo-new',k,true):D.badge('切回任職公司填寫','neutral')}</section>`).join('')}</div>`;}
 function history(x){return `<section class="card space-top"><h2>處理紀錄</h2><div class="timeline">${x.history.map(h=>`<article><strong>${E(h.action)}</strong><p class="mini">${E(h.actor)} · ${E(h.at)}</p><p>${E(h.note)}</p></article>`).join('')||'<p class="muted">草稿尚未送出。</p>'}</div></section>`;}
 function rowCard(x){const direct=actions(x).filter(a=>['edit','submit','review','approve','return'].includes(a));return `<article class="card"><div class="row"><span class="eyebrow">${E(kinds[x.kind])} · ${E(x.id)}</span>${D.badge(statuses[x.status]||x.status,x.status==='approved'?'green':x.status==='returned'?'amber':'blue')}</div><h3>${E(x.employeeName)} · ${x.kind==='leave'?E(leaveTypes[x.leaveType]||'請假'):E(kinds[x.kind])}</h3><p>${E(x.startDate)}${x.endDate!==x.startDate?' — '+E(x.endDate):''} · ${E(x.hours)} 小時</p><p class="muted">${E(x.reason)}</p>${x.status==='returned'?`<p class="notice amber">退回原因：${E(x.history.at(-1)?.note||'請查看處理紀錄並補充內容。')}</p>`:''}<div class="action-row">${direct.map(a=>btn(actionTitles[a],'leave-demo-'+a,x.id,['submit','review','approve'].includes(a))).join('')}${link(['approved','cancelled'].includes(x.status)?'查看核准結果':'申請明細','leave',{id:x.id})}</div></article>`;}
 function detail(x){
  const next=x.status==='review'?x.reviewer:x.status==='approval'?x.approver:null;
  return head(`${kinds[x.kind]}申請`,`${x.id} · ${x.company} · ${x.employeeName}`,link('返回假勤清單','leave'))+`<section class="card"><div class="row"><h2>${E(x.kind==='leave'?leaveTypes[x.leaveType]:kinds[x.kind])}</h2>${D.badge(statuses[x.status],x.status==='approved'?'green':x.status==='returned'?'amber':'blue')}</div><ol class="steps">${['填寫申請','主管複核','核准結果'].map(t=>`<li class="step">${t}</li>`).join('')}</ol><div class="grid two"><p><strong>期間</strong><br>${E(x.startDate)} ${E(x.startTime)} — ${E(x.endDate)} ${E(x.endTime)}</p><p><strong>申請時數</strong><br>${E(x.hours)} 小時</p><p><strong>事由</strong><br>${E(x.reason)}</p><p><strong>交接安排</strong><br>${E(x.handover)}</p>${x.kind==='field'?`<p><strong>外勤地點</strong><br>${E(x.location)}</p><p><strong>工作項目</strong><br>${E(x.project)}</p>`:''}</div>${x.cancelOf?`<p>原請假：${link('查看原申請','leave',{id:x.cancelOf})}</p>`:''}<div class="action-row">${actions(x).map(a=>btn(actionTitles[a],'leave-demo-'+a,x.id,['submit','review','approve'].includes(a))).join('')}</div>${next?`<div class="notice blue">下一步：${E(D.roles[next]?.label)}${D.role!==next?` <button class="btn" data-action="switch-role" data-role="${E(next)}" data-view="leave" data-id="${E(x.id)}">切換查看處理人</button>`:''}</div>`:''}</section>${history(x)}${boundary}`;
 }
 function balances(){
  const rows=D.state.leaveRequests.filter(x=>sameCompany(x)&&owned(x)&&x.kind==='leave'),allocation=96;
  const used=rows.filter(x=>x.leaveType==='annual'&&x.status==='approved').reduce((n,x)=>n+amount(x),0),pending=rows.filter(x=>x.leaveType==='annual'&&isPending(x)).reduce((n,x)=>n+amount(x),0);
  return `<section class="card"><h2>我的年假餘額</h2><p class="muted">年度額度 96 小時；已核准申請計入已用，處理中的申請先預留。</p><div class="grid four"><div class="stat"><small>年度額度</small><strong>${allocation}h</strong></div><div class="stat"><small>已核准使用</small><strong>${used}h</strong></div><div class="stat"><small>申請中預留</small><strong>${pending}h</strong></div><div class="stat"><small>目前可用</small><strong>${Math.max(0,allocation-used-pending)}h</strong></div></div>${allocation-used-pending<0?'<p class="notice amber">申請時數超過目前可用額度，請聯絡人資確認。</p>':''}<p class="mini">核准銷假後，原請假標示「已銷假」，時數退回可用額度。</p></section><div class="section-title"><h2>餘額來源明細</h2></div><div class="grid two">${rows.filter(x=>x.leaveType==='annual'&&['approved','cancelled','review','approval'].includes(x.status)).map(rowCard).join('')||D.empty('尚無年假使用紀錄')}</div>`;
 }
 function renderLeave(r={}){
  const id=r.id||r.detail;if(id){const x=D.state.leaveRequests.find(x=>x.id===id);return visible(x)?detail(x):head('假勤申請','依本人及指定審核範圍查看。',link('返回假勤清單','leave'))+D.empty('此申請不在目前可見範圍');}
  const tab=['all',...Object.keys(kinds),'review','balance'].includes(r.tab)?r.tab:'all';
  const nav=`<nav class="subnav">${[['all','全部申請'],...Object.entries(kinds),['review','待我處理'],['balance','我的餘額']].map(([k,t])=>`<a class="${tab===k?'active':''}" href="#view=leave&tab=${k}">${E(t)}</a>`).join('')}</nav>`;
  const rows=D.state.leaveRequests.filter(visible).filter(x=>tab==='review'?actions(x).some(a=>['review','approve','return'].includes(a)):tab==='all'?owned(x):x.kind===tab&&owned(x));
  return head('假勤申請','選擇申請類型，填寫後送出；主管在自己的待辦複核，再交核准人。')+cards()+nav+(tab==='balance'?balances():`<div class="grid two">${rows.map(rowCard).join('')||D.empty(tab==='review'?'目前沒有待你處理的假勤':'目前沒有這類申請','可從上方新增一筆，儲存草稿後再送交複核。')}</div>`)+boundary;
 }
 const prevLeave=D.modules.leave;
 D.register('leave',{...prevLeave,pending:false,seed,render:renderLeave});
 const previousInbox=D.businessInbox;
 D.leaveDemoInbox=()=>D.state.leaveRequests.filter(visible).filter(x=>actions(x).some(a=>['review','approve'].includes(a))||owned(x)&&x.status==='returned').map(x=>({id:x.id,company:x.company,title:`${x.employeeName} · ${kinds[x.kind]}`,detail:statuses[x.status]+(x.status==='returned'?' · '+(x.history.at(-1)?.note||'請補充內容'):''),view:'leave',params:{id:x.id},status:x.status,actionLabel:x.status==='returned'?'修改後重送':x.status==='review'?'複核申請':'核准申請'}));
 D.businessInbox=role=>(previousInbox?.(role)||[]).filter(x=>x.view!=='leave').concat(D.leaveDemoInbox());
 function applicationRows(){
  const rows=D.state.leaveRequests.filter(x=>sameCompany(x)&&owned(x)).map(x=>({id:x.id,company:x.company,title:kinds[x.kind]+'申請',text:x.reason,status:x.status,view:'leave',params:{id:x.id}}));
  for(const x of D.state.hrRequests||[])if(sameCompany(x)&&x.createdBy===D.actor.id)rows.push({id:x.id,title:x.kind,text:x.reason||x.note||'人事表單與處理紀錄',status:x.status,view:'personnel',params:{id:x.id}});
  for(const x of D.state.personnelContent?.rows||[])if(sameCompany(x)&&x.createdBy===D.actor.id)rows.push({id:x.id,title:({hire:'到職',confirmation:'轉正',transfer:'調動',resignation:'離職',rehire:'復職',salary:'調薪'})[x.kind]+'申請',text:x.reason,status:x.status,view:'personnel',params:{id:x.id}});
  for(const x of D.state.adminTasks||[])if(sameCompany(x)&&x.creator===D.actor.id)rows.push({id:x.id,title:'專案交辦',text:x.title,status:x.status,view:'tasks',params:{id:x.id}});
  for(const [key,title,tab]of [['exchanges','換代班申請','exchanges'],['corrections','補卡申請','corrections']])for(const x of D.state.attendanceDemo?.[key]||[])if(sameCompany(x)&&owned(x))rows.push({id:x.id,title,text:x.reason,status:x.status,view:'attendance',params:{tab,id:x.id}});
  return rows;
 }
 const previousApps=D.modules.applications;
 D.register('applications',{...previousApps,roles:all,pending:false,render(r={}){
  const tab=['all','draft','pending','done','returned'].includes(r.tab)?r.tab:'all';
  const rows=applicationRows().filter(x=>tab==='all'||tab==='draft'&&x.status==='draft'||tab==='pending'&&['review','approval','peer','working','inspection'].includes(x.status)||tab==='returned'&&x.status==='returned'||tab==='done'&&!['draft','review','approval','peer','working','inspection','returned'].includes(x.status));
  const labels={...statuses,peer:'待接班人確認',declined:'接班人婉拒',applied:'已生效',working:'執行中',inspection:'待驗收',accepted:'已驗收'};
  return head('我的申請','從這裡新增申請，追蹤送到誰手上，再點開查看內容與處理紀錄。')+cards()+`<div class="action-row space-top">${link('查看假期餘額','leave',{tab:'balance'})}${link('換代班申請','attendance',{tab:'exchanges'})}${link('補卡申請','attendance',{tab:'corrections'})}${D.allowed('personnel')?link('人事表單','personnel'):''}${D.allowed('tasks')?link('交辦申請','tasks'):''}</div><nav class="subnav">${[['all','全部'],['draft','草稿'],['pending','處理中'],['returned','退回修改'],['done','已有結果']].map(([k,t])=>`<a class="${tab===k?'active':''}" href="#view=applications&tab=${k}">${t}</a>`).join('')}</nav><div class="grid two">${rows.map(x=>`<article class="card"><div class="row"><span class="mini">${E(x.id)}</span>${D.badge(labels[x.status]||x.status,x.status==='returned'?'amber':['approved','applied','accepted'].includes(x.status)?'green':'blue')}</div><h3>${E(x.title)}</h3><p>${E(x.text)}</p>${link('查看內容與簽核',''+x.view,x.params)}</article>`).join('')||D.empty('這個狀態目前沒有申請','上方可新增請假、銷假、加班或外勤，也可進入人事表單。')}</div>${boundary}`;
 }});
})();
