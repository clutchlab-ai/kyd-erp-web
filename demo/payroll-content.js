/* Native payroll walkthrough. Every amount/person below is a local example. */
(()=>{
 'use strict';
 const D=window.D,E=v=>D.esc(v??''),all=Object.keys(D.roles);
 const states={draft:'計薪草稿',returned:'退回補充',review:'待複核',approval:'待核准',approved:'待確認薪資單',finalized:'薪資單已確認'};
 const money=c=>D.money(Number(c||0)/100),person=id=>D.state.people.find(p=>p.id===id);
 const full=()=>['finance','ceo','chairman','admin'].includes(D.role),writer=()=>['finance','admin'].includes(D.role);
 const safeMonth=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m||'');
 const href=(view,p={})=>'#'+new URLSearchParams({view,source:'example',...p});
 const link=(label,view='salary',p={})=>`<a class="btn" href="${href(view,p)}">${label}</a>`;
 const btn=(label,action,id='',primary=false)=>`<button class="btn${primary?' primary':''}" data-action="pay-${action}" data-id="${E(id)}">${label}</button>`;
 const head=(title,text,actions='')=>`<header class="page-head"><div><p class="eyebrow">行政人事</p><h1>${E(title)}</h1><p class="lede">${E(text)}</p></div><div class="action-row">${actions}</div></header>`;
 const note=()=>'<p class="mini">社保與扣款按已填金額核對；確認薪資單與付款分開辦理。</p>';
 const history=r=>`<section class="card space-top"><h2>處理紀錄</h2><div class="timeline">${r.history.map(x=>`<article><strong>${E(x.text)}</strong><p class="mini">${E(x.at)} · ${E(x.actor)}</p></article>`).join('')}</div></section>`;
 const gross=r=>r.basic+r.allowance+r.overtime;
 const deductions=r=>r.leaveDeduction+r.employeeInsurance+r.otherDeduction;
 const net=r=>gross(r)-deductions(r);
 const total=(b,fn)=>b.rows.reduce((s,r)=>s+fn(r),0);
 function audit(r,text){r.revision=(r.revision||0)+1;r.history.push({at:D.today,actor:D.actor.name,actorId:D.actor.id,text});D.log(text)}
 const value=(v,label)=>{if(String(v).trim()===''||!/^\d+(\.\d{1,2})?$/.test(String(v))||Number(v)>1000000)throw Error(label+'需為有效非負金額，最多兩位小數。');return Math.round(Number(v)*100)};
 function snapshot(setting){const p=person(setting.employeeId);return {employeeId:p.id,name:p.name,company:p.company,department:p.department,title:p.title,basic:setting.basic,allowance:setting.allowance,overtime:0,leaveDeduction:0,employeeInsurance:setting.employeeInsurance,employerInsurance:setting.employerInsurance,otherDeduction:0,note:'手動金額示例；未連動正式考勤。'}}
 function seed(s){
  if(!s.payrollExample){
   const settings=s.people.map((p,i)=>({employeeId:p.id,company:p.company,basic:(700+i*100)*100,allowance:5000,employeeInsurance:1000,employerInsurance:2000,revision:0,note:'示例金額，非真實薪資。'}));
   s.payrollExample={settings,batches:[],insurance:[]};
   for(const company of [...new Set(settings.map(x=>x.company))]){
    const rows=settings.filter(x=>x.company===company).map(snapshot);
    s.payrollExample.batches.push({id:'PAY-'+company+'-202610',company,month:'2026-10',status:'finalized',creatorId:'f01',reviewerId:'x01',approverId:'x02',rows:structuredClone(rows),revision:0,history:[{at:'2026-11-02',actor:'已完成流程示例',text:'十月示例已複核、核准並確認薪資單；不代表已轉帳。'}]});
    s.payrollExample.batches.push({id:'PAY-'+company+'-202611',company,month:'2026-11',status:'draft',creatorId:'f01',rows:structuredClone(rows),revision:0,history:[{at:D.today,actor:'財務示例',text:'十一月計薪草稿，可調整項目再送交複核。'}]});
   }
  }
 }
 const priorSeed=D.modules.salary?.seed;
 D.modules.salary.seed=s=>{priorSeed?.(s);seed(s)};
 const batches=()=>D.state.payrollExample.batches;
 function requireBatch(id){const b=batches().find(x=>x.id===id);if(!b||b.company!==D.company||!full())throw Error('無法查看此公司的薪資批次。');return b}
 function actions(b){
  if(!full()||b.company!==D.company)return[];
  if(['draft','returned'].includes(b.status))return writer()&&(b.status==='draft'||(b.submittedBy||b.creatorId)===D.actor.id)?['edit','submit']:[];
  if(b.status==='review'&&D.role==='ceo'&&![b.creatorId,b.submittedBy].includes(D.actor.id))return ['review','return'];
  if(b.status==='approval'&&D.role==='chairman'&&![b.creatorId,b.submittedBy,b.reviewerId].includes(D.actor.id))return ['approve','return'];
  if(b.status==='approved'&&writer())return ['finalize'];
  return [];
 }
 D.payrollExampleActions=actions;
 function payslip(b,row,own=false){
  const lines=[['基本薪資',row.basic],['津貼',row.allowance],['加班金額（手動）',row.overtime],['假勤扣款（手動）',-row.leaveDeduction],['員工社保（手動）',-row.employeeInsurance],['其他扣款',-row.otherDeduction]];
  return head(own?'我的薪資單':'薪資單預覽',`${b.month} · ${row.name} · ${b.company}`,own?link('返回我的薪資單','my-payroll'):link('返回計薪批次','salary',{id:b.id}))+`<section class="card"><div class="row"><div><h2>${E(row.name)}</h2><p>${E(row.department)} · ${E(row.title)}</p><p>薪資歸屬公司：${E(b.company)}</p></div>${D.badge(states[b.status],b.status==='finalized'?'green':'blue')}</div>${lines.map(([label,amount])=>`<div class="row"><span>${label}</span><strong>${money(amount)}</strong></div>`).join('')}<div class="row space-top"><h2>示例實發合計</h2><h2>${money(net(row))}</h2></div><p class="mini">公司社保負擔 ${money(row.employerInsurance)}，不從員工薪資扣除。</p><p>${E(row.note)}</p><p class="notice">${b.status==='finalized'?'薪資單已確認；尚無銀行付款紀錄。':'本頁為草稿預覽，尚未確認給員工查看。'}</p></section>`+note();
 }
 function renderOwn(r={}){
  const own=batches().filter(b=>b.company===D.actor.company&&b.status==='finalized'&&b.rows.some(x=>x.employeeId===D.actor.id));
  const b=own.find(b=>b.id===r.id),row=b?.rows.find(x=>x.employeeId===D.actor.id);
  if(r.id&&!b)return head('我的薪資單','只顯示本人的已確認示例薪資單。',link('返回我的薪資單','my-payroll'))+D.empty('找不到可查看的薪資單');
  if(b&&row)return payslip(b,row,true);
  return head('我的薪資單',`${D.actor.name} · 任職／發薪公司 ${D.actor.company}。支援其他項目不會改變薪資歸屬。`)+`<div class="grid two">${own.map(b=>{const row=b.rows.find(x=>x.employeeId===D.actor.id);return `<article class="card"><div class="row"><h2>${E(b.month)}</h2>${D.badge('已確認','green')}</div><p>${E(b.company)} · ${E(row.name)}</p><div class="metric">${money(net(row))}</div><p class="mini">示例實發合計・未執行付款</p>${link('查看薪資明細','my-payroll',{id:b.id})}</article>`}).join('')||D.empty('尚無已確認薪資單','財務完成當月批次後，本人的薪資單會出現在這裡。')}</div>`+note();
 }
 const tabDefs=[['batches','計薪批次'],['settings','薪資設定'],['slips','薪資單'],['insurance','社保紀錄']];
 function nav(tab){return `<nav class="subnav">${tabDefs.map(([id,label])=>`<a class="${tab===id?'active':''}" href="${href('salary',{tab:id})}">${label}</a>`).join('')}<a href="${href('my-payroll')}">我的薪資單</a></nav>`}
 function batchPage(b){
  const labels={submit:'送交 CEO 複核',review:'複核通過',approve:'核准批次',return:'退回補充',finalize:'確認薪資單'};
  return head(`${b.month} 計薪批次`,`${b.company} · ${b.id}`,link('返回計薪批次清單'))+`<section class="card"><div class="row"><h2>${b.rows.length} 位示例員工</h2>${D.badge(states[b.status],b.status==='finalized'?'green':'blue')}</div><ol class="steps">${['財務編製','CEO 複核','董事長核准','財務確認薪資單'].map(t=>`<li class="step">${t}</li>`).join('')}</ol><div class="grid three"><div class="stat"><small>應發合計</small><strong>${money(total(b,gross))}</strong></div><div class="stat"><small>扣款合計</small><strong>${money(total(b,deductions))}</strong></div><div class="stat"><small>示例實發合計</small><strong>${money(total(b,net))}</strong></div></div><div class="action-row space-top">${actions(b).filter(a=>a!=='edit').map(a=>btn(labels[a],a,b.id,a!=='return')).join('')}</div><p class="mini">核准後由財務確認薪資單；轉帳另行辦理。</p></section><section class="card space-top table-wrap"><table><thead><tr><th>示例員工</th><th>應發</th><th>扣款</th><th>實發</th><th>操作</th></tr></thead><tbody>${b.rows.map(row=>`<tr><td><strong>${E(row.name)}</strong><p class="mini">${E(row.department)}</p></td><td>${money(gross(row))}</td><td>${money(deductions(row))}</td><td>${money(net(row))}</td><td>${actions(b).includes('edit')?btn('調整項目','row',b.id+'|'+row.employeeId):''}${link('薪資單','salary',{id:b.id,employee:row.employeeId})}</td></tr>`).join('')}</tbody></table></section>`+history(b)+note();
 }
 function render(r={}){
  if(!full())return renderOwn(r);
  if(r.id){const b=batches().find(x=>x.id===r.id&&x.company===D.company);if(!b)return head('薪酬與社保','依所選公司查看。',link('返回計薪清單'))+D.empty('找不到此公司可查看的批次');if(r.employee){const row=b.rows.find(x=>x.employeeId===r.employee);return row?payslip(b,row):head('薪資單','此員工不在目前公司的批次內。',link('返回計薪批次','salary',{id:b.id}))+D.empty('找不到此批次的員工')}return batchPage(b)}
  const tab=tabDefs.some(([id])=>id===r.tab)?r.tab:'batches',company=D.company,rows=batches().filter(x=>x.company===company),month=safeMonth(r.month)?r.month:'2026-10';
  let content='';
  if(tab==='batches')content=`<div class="action-row">${writer()?btn('新增計薪批次','new','',true):''}</div><div class="grid two space-top">${rows.filter(x=>!r.month||x.month===r.month).sort((a,b)=>b.month.localeCompare(a.month)).map(b=>`<article class="card"><div class="row"><h2>${E(b.month)} · ${E(company)}</h2>${D.badge(states[b.status],b.status==='finalized'?'green':'blue')}</div><p>${b.rows.length} 位員工 · 示例實發 ${money(total(b,net))}</p>${link('查看與處理','salary',{id:b.id})}</article>`).join('')||D.empty('此月份沒有計薪批次')}</div>`;
  if(tab==='settings')content=`<section class="card"><h2>薪資組成</h2><p class="muted">調整後用於下一次建立批次；已建立的批次保留當時的金額。</p><div class="table-wrap"><table><thead><tr><th>示例員工</th><th>基本薪資</th><th>津貼</th><th>員工／公司社保</th><th></th></tr></thead><tbody>${D.state.payrollExample.settings.filter(s=>s.company===company).map(s=>`<tr><td>${E(person(s.employeeId)?.name)}</td><td>${money(s.basic)}</td><td>${money(s.allowance)}</td><td>${money(s.employeeInsurance)} / ${money(s.employerInsurance)}</td><td>${writer()?btn('調整設定','setting',s.employeeId):D.badge('可查看')}</td></tr>`).join('')}</tbody></table></div></section>`;
  if(tab==='slips')content=`<div class="toolbar"><strong>月份：${E(month)}</strong>${btn('切換月份','month','slips')}</div><div class="grid two">${rows.filter(b=>b.status==='finalized'&&b.month===month).flatMap(b=>b.rows.map(row=>`<article class="card"><h2>${E(row.name)}</h2><p>${E(b.month)} · ${E(company)}</p><strong>${money(net(row))}</strong><p>已確認薪資單・未執行付款</p>${link('查看明細','salary',{id:b.id,employee:row.employeeId})}</article>`)).join('')||D.empty('此月份尚無已確認薪資單','完成批次複核、核准與確認後會出現在這裡。')}</div>`;
  if(tab==='insurance')content=`<div class="toolbar"><strong>月份：${E(month)}</strong>${btn('切換月份','month','insurance')}</div><div class="stack">${rows.filter(b=>b.status==='finalized'&&b.month===month).map(b=>{const receipt=D.state.payrollExample.insurance.find(x=>x.batchId===b.id);return `<section class="card"><div class="row"><h2>${E(b.month)} · ${E(company)}</h2>${D.badge(receipt?'已有示例紀錄':'待登記',receipt?'green':'amber')}</div><p>員工負擔 ${money(total(b,r=>r.employeeInsurance))} · 公司負擔 ${money(total(b,r=>r.employerInsurance))}</p><p class="muted">金額來自已確認批次，不套用未確認的法定費率。</p>${receipt?`<p>登記日期：${E(receipt.date)} · 參考編號：${E(receipt.reference)}</p><p>${E(receipt.note)}</p>`:writer()?btn('登記繳納紀錄示例','insurance',b.id,true):''}<details class="space-top"><summary>查看員工負擔明細</summary>${b.rows.map(row=>`<div class="row"><span>${E(row.name)}</span><span>員工 ${money(row.employeeInsurance)} / 公司 ${money(row.employerInsurance)}</span></div>`).join('')}</details><p class="mini">保存繳納參考紀錄；申報與付款另行辦理。</p></section>`}).join('')||D.empty('此月份沒有可核對的社保紀錄','先確認該月薪資批次。')}</div>`;
  return head('薪酬與社保',`${company}：設定薪資 → 編製批次 → 複核核准 → 查看薪資單與社保紀錄。`)+nav(tab)+content+note();
 }
 D.renderPayrollExample=render;D.renderOwnPayrollExample=renderOwn;
 D.modules.salary.render=render;D.modules.salary.pending=false;D.modules.salary.roles=all;
 D.register('my-payroll',{title:'我的薪資單',group:'行政人事',nav:false,roles:all,render:renderOwn});
 D.payrollDemoInbox=()=>full()?batches().filter(b=>b.company===D.company&&(actions(b).some(a=>['review','approve','finalize'].includes(a))||b.status==='returned'&&actions(b).includes('edit'))).map(b=>({id:b.id,company:b.company,title:b.month+' 計薪批次',detail:states[b.status],view:'salary',params:{source:'example',id:b.id},status:b.status,actionLabel:b.status==='returned'?'補充計薪項目':'處理薪資批次'})):[];
 D.payrollResults=()=>batches().filter(b=>b.company===D.company&&b.status==='finalized'&&b.company===D.actor.company&&b.rows.some(r=>r.employeeId===D.actor.id)).map(b=>({id:'slip-'+b.id,company:b.company,title:b.month+' 薪資單已確認',detail:'可查看本人的薪資明細；確認薪資單不代表已轉帳。',view:'my-payroll',params:{source:'example',id:b.id},status:b.status,actionLabel:'查看我的薪資單'}));
 D.on('pay-month',el=>{const tab=el.dataset.id;D.modal('選擇月份','<label class="field">月份<input name="month" type="month" value="2026-10" required></label>',v=>{if(!safeMonth(v.month))throw Error('請填寫有效月份。');D.go('salary',{source:'example',tab,month:v.month})},'查看')});
 D.on('pay-new',()=>{
  if(!writer())throw Error('請由財務或管理員建立示例批次。');const company=D.company,actor=D.actor.id;
  D.modal('新增計薪批次',`<p>公司：${E(company)}。從目前薪資設定建立獨立草稿。</p><label class="field">計薪月份<input name="month" type="month" value="2026-12" required></label>`,v=>{
   if(!writer()||company!==D.company||actor!==D.actor.id)throw Error('身分或公司已變更，請重新開啟。');
   if(!safeMonth(v.month))throw Error('請填寫有效月份。');if(batches().some(b=>b.company===company&&b.month===v.month))throw Error('此公司與月份已經有計薪批次。');
   const rows=D.state.payrollExample.settings.filter(s=>s.company===company&&person(s.employeeId)?.active&&person(s.employeeId)?.company===company).map(snapshot);if(!rows.length)throw Error('此公司沒有可計薪的示例員工。');
   const b={id:'PAY-'+company+'-'+v.month.replace('-',''),company,month:v.month,status:'draft',creatorId:D.actor.id,revision:0,rows,history:[]};D.mutate(()=>{batches().push(b);audit(b,'建立計薪草稿')});D.go('salary',{source:'example',id:b.id});
  },'建立草稿');
 });
 const fields=(row,keys)=>`<div class="form-grid">${keys.map(([key,label])=>`<label class="field">${label} USD<input type="number" name="${key}" min="0" max="1000000" step="0.01" value="${(row[key]/100).toFixed(2)}" required></label>`).join('')}<label class="field full">備註<textarea name="note" maxlength="600">${E(row.note)}</textarea></label></div>`;
 D.on('pay-setting',el=>{
  if(!writer())throw Error('目前身分無法修改薪資設定。');const company=D.company,actor=D.actor.id,s=D.state.payrollExample.settings.find(s=>s.employeeId===el.dataset.id&&s.company===company);if(!s)throw Error('找不到此公司的薪資設定。');const revision=s.revision||0;
  const keys=[['basic','基本薪資'],['allowance','津貼'],['employeeInsurance','員工社保（手動）'],['employerInsurance','公司社保（手動）']];
  D.modal('調整示例薪資設定',`<p>${E(person(s.employeeId)?.name)} · ${E(company)}</p>`+fields(s,keys),v=>{if(!writer()||D.company!==company||D.actor.id!==actor||s.revision!==revision)throw Error('身分、公司或資料已改變。');const next=Object.fromEntries(keys.map(([key,label])=>[key,value(v[key],label)]));if(next.employeeInsurance>next.basic+next.allowance)throw Error('員工負擔不能高於應發金額。');D.mutate(()=>{Object.assign(s,next,{note:v.note,revision:revision+1});D.log('調整示例薪資設定')})});
 });
 D.on('pay-row',el=>{
  const [id,employeeId]=el.dataset.id.split('|'),b=requireBatch(id),row=b.rows.find(x=>x.employeeId===employeeId),actor=D.actor.id,revision=b.revision;
  if(!row||!actions(b).includes('edit'))throw Error('此批次不能修改。');
  const keys=[['basic','基本薪資'],['allowance','津貼'],['overtime','加班金額（手動）'],['leaveDeduction','假勤扣款（手動）'],['employeeInsurance','員工社保（手動）'],['employerInsurance','公司社保（手動）'],['otherDeduction','其他扣款']];
  D.modal('調整當月計薪項目',`<p>${E(row.name)} · ${E(b.month)}</p>`+fields(row,keys),v=>{if(D.actor.id!==actor||!actions(b).includes('edit')||b.revision!==revision)throw Error('身分、公司或資料已改變。');const next=Object.fromEntries(keys.map(([key,label])=>[key,value(v[key],label)]));if(net(next)<0)throw Error('扣款不能高於應發金額。');D.mutate(()=>{Object.assign(row,next,{note:v.note});audit(b,'調整 '+row.name+' 的示例計薪項目')})});
 });
 for(const action of ['submit','review','approve','return','finalize'])D.on('pay-'+action,el=>{
  const b=requireBatch(el.dataset.id);if(!actions(b).includes(action))throw Error('不是目前身分可執行的步驟。');const actor=D.actor.id,revision=b.revision;
  const labels={submit:'送交複核',review:'複核通過',approve:'核准批次',return:'退回補充',finalize:'確認薪資單'};
  D.modal(labels[action],`<p>${E(b.month)} · ${E(b.company)} · ${b.rows.length} 位員工 · ${money(total(b,net))}</p><label class="field">${action==='return'?'退回原因':'核對說明'}<textarea name="note" maxlength="600" ${action==='return'?'required':''}></textarea></label>${action==='finalize'?'<p class="notice">確認後員工可看本人的示例薪資單；這一步不會付款。</p>':''}`,v=>{
   if(actor!==D.actor.id||!actions(b).includes(action)||revision!==b.revision)throw Error('身分、公司或狀態已改變，請重新開啟。');
   if(action==='return'&&!v.note?.trim())throw Error('請填寫退回原因。');
   if(action==='submit'&&b.rows.some(row=>net(row)<0))throw Error('請先核對每位員工的計薪項目。');
   D.mutate(()=>{if(action==='submit'){b.submittedBy=actor;b.status='review';delete b.reviewerId;delete b.approverId}if(action==='review'){b.status='approval';b.reviewerId=actor}if(action==='approve'){b.status='approved';b.approverId=actor}if(action==='return')b.status='returned';if(action==='finalize')b.status='finalized';audit(b,labels[action]+(v.note?'：'+v.note:''))});
  },labels[action]);
 });
 D.on('pay-insurance',el=>{
  const b=requireBatch(el.dataset.id),actor=D.actor.id;
  if(!writer()||b.status!=='finalized'||D.state.payrollExample.insurance.some(x=>x.batchId===b.id))throw Error('目前不能登記這筆紀錄。');
  D.modal('登記社保繳納紀錄示例',`<p>${E(b.month)} · ${E(b.company)}，保存憑證參考資訊。</p><div class="form-grid"><label class="field">登記日期<input name="date" type="date" value="${D.today}" required></label><label class="field">參考編號<input name="reference" maxlength="100" required placeholder="示例收據編號"></label><label class="field full">備註<textarea name="note" maxlength="600"></textarea></label></div>`,v=>{
   if(!writer()||actor!==D.actor.id||D.company!==b.company||b.status!=='finalized'||D.state.payrollExample.insurance.some(x=>x.batchId===b.id))throw Error('身分、公司或紀錄已改變。');
   const parsed=new Date(v.date+'T12:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(v.date)||!Number.isFinite(+parsed)||parsed.toISOString().slice(0,10)!==v.date||v.date>D.today||!v.reference?.trim())throw Error('請填寫有效日期（不晚於示例今天）與參考編號。');
   D.mutate(()=>{D.state.payrollExample.insurance.push({batchId:b.id,company:b.company,date:v.date,reference:v.reference.trim(),note:v.note,actorId:actor});audit(b,'登記社保示例紀錄；未付款')});
  },'儲存紀錄');
 });
})();
