/* Existing operational contents in the retained meeting UI. Local examples only. */
(() => {
 'use strict';
 const D=window.D,E=v=>D.esc(v??''),all=Object.keys(D.roles);
 const name=id=>D.state.people.find(p=>p.id===id)?.name||id;
 const person=id=>D.state.people.find(p=>p.id===id);
 const head=(title,text,action='')=>`<header class="page-head"><div><p class="eyebrow">KYD ERP · 流程示例</p><h1>${E(title)}</h1><p class="lede">${E(text)}</p></div>${action}</header>`;
 const btn=(label,action,id='',primary=false)=>`<button class="btn${primary?' primary':''}" data-action="${action}" data-id="${E(id)}">${label}</button>`;
 const link=(label,view,params={})=>`<a class="btn" href="#${new URLSearchParams({view,...params})}">${label}</a>`;
 const boundary=()=>'<p class="notice">本頁操作保存在此瀏覽器的流程示例，不修改原名冊、正式單據或權限。</p>';
 const history=rows=>`<section class="card space-top"><h2>處理紀錄</h2><div class="timeline">${rows.map(x=>`<article><strong>${E(x.text)}</strong><p class="mini">${E(x.at)} · ${E(x.actor)}</p></article>`).join('')||'<p class="muted">尚無處理紀錄</p>'}</div></section>`;
 const log=(r,text)=>{r.history??=[];r.history.push({at:D.today,actor:D.actor.name,text});D.log(text)};
 const canManage=()=>['hrmanager','manager','admin'].includes(D.role);
 const scoped=r=>r.company===D.company;
 const managesDepartment=r=>D.role==='admin'||D.role==='hrmanager'&&['行政部','人事行政部'].includes(r.department)||D.role==='manager'&&r.department==='工程部';
 const taskVisible=r=>scoped(r)&&(['admin','ceo','chairman'].includes(D.role)||r.creator===D.actor.id||r.assignee===D.actor.id||managesDepartment(r));
 const labels={draft:'申請草稿',review:'待主管複核',approval:'待 CEO 核准',approved:'待指派',working:'執行中',inspection:'待驗收',accepted:'已驗收',returned:'退回補充'};
 function seed(s){
  s.adminTasks??=[{id:'TASK-001',company:'KYD',department:'行政部',title:'整理跨部門交接清單（示例）',creator:'h01',assignee:'e01',due:'2026-11-20',status:'working',milestones:[{id:'M1',title:'整理現有文件與缺件',due:'2026-11-10',done:false},{id:'M2',title:'確認接手人及交接結果',due:'2026-11-20',done:false}],note:'已核准的行政交辦；與工程專案分開。',reports:[],history:[{at:'2026-11-03',actor:'示例主管',text:'示例已完成申請核准並指派，尚待員工回報。'}]}];
  s.partners??=[{id:'V-001',company:'KYD',kind:'vendors',name:'星禾材料商（示例）',contact:'示例窗口',category:'工程材料',note:'照明改善採購供應商；未提供真實聯絡資料。'},{id:'V-002',company:'ZEUS',kind:'vendors',name:'雲杉用品商（示例）',contact:'示例窗口',category:'公共耗材',note:'公共區域耗材供應商。'}];
  s.commonFiles??=[];
 }
 function taskActions(r){
  if(!taskVisible(r))return[];
  if(['draft','returned'].includes(r.status))return r.creator===D.actor.id?['edit','submit']:[];
  if(r.status==='review')return canManage()&&r.creator!==D.actor.id?['review','return']:[];
  if(r.status==='approval')return D.role==='ceo'&&r.creator!==D.actor.id&&r.reviewer!==D.actor.id?['approve','return']:[];
  if(r.status==='approved')return canManage()?['assign']:[];
  if(r.status==='working')return r.assignee===D.actor.id?['update','complete']:[];
  if(r.status==='inspection')return canManage()&&r.assignee!==D.actor.id&&r.reports.at(-1)?.actorId!==D.actor.id?['accept','revise']:[];
  return[];
 }
 D.taskActions=taskActions;
 function taskPage(r={}){
  const rows=D.state.adminTasks.filter(taskVisible),item=rows.find(x=>x.id===(r.id||r.detail));
  if(item){const actions={edit:'修改草稿',submit:'送交主管複核',review:'複核通過',approve:'核准交辦',return:'退回補充',assign:'指派工作',update:'回報里程碑',complete:'提交驗收',accept:'驗收通過',revise:'退回改善'};
   return head(item.title,`${item.id} · ${item.company} · ${labels[item.status]}`,link('返回交辦清單','tasks'))+`<section class="card"><div class="row"><h2>${E(name(item.assignee)||'待指派')}</h2>${D.badge(labels[item.status],'blue')}</div><p>完成期限：${E(item.due)} · 提出人：${E(name(item.creator))}</p><p>${E(item.note)}</p><ol class="steps">${['提出申請','主管複核','CEO 核准','指派與執行','獨立驗收'].map(x=>`<li class="step">${x}</li>`).join('')}</ol><div class="action-row">${taskActions(item).map(a=>btn(actions[a],'ret-task-'+a,item.id,!['return','revise','edit'].includes(a))).join('')}</div></section><section class="card space-top"><h2>成果與里程碑</h2>${item.milestones.map(m=>`<div class="row"><div><strong>${E(m.title)}</strong><p class="mini">${E(m.due)}</p></div>${D.badge(m.done?'已回報完成':'待完成',m.done?'green':'neutral')}</div>`).join('')}</section><section class="card space-top"><h2>工作回報與佐證</h2>${item.reports.map(x=>`<article class="task-line"><p>${E(x.note)}</p>${x.url?`<a href="${E(x.url)}" target="_blank" rel="noopener noreferrer">查看成果連結 ↗</a>`:''}<p class="mini">${E(x.actor)} · ${E(x.at)}</p></article>`).join('')||'<p class="muted">尚未回報；提交驗收前須完成全部里程碑。</p>'}</section>${history(item.history)}${boundary()}`;
  }
  return head('專案交辦','申請核准後指派工作，員工回報成果，再由另一位主管驗收。',(D.company===D.actor.company?btn('新增交辦申請','ret-task-new','',true):''))+`<nav class="subnav">${[['all','工作清單'],['mine','我的工作'],['requests','申請進度']].map(([tab,title])=>`<a class="${(r.tab||'all')===tab?'active':''}" href="#view=tasks&tab=${tab}">${title}</a>`).join('')}</nav><div class="grid two">${rows.filter(x=>r.tab==='mine'?x.assignee===D.actor.id:r.tab==='requests'?['draft','review','approval','approved','returned'].includes(x.status):true).map(x=>`<article class="card"><div class="row"><span class="mini">${E(x.id)}</span>${D.badge(labels[x.status],'blue')}</div><h2>${E(x.title)}</h2><p>${E(name(x.assignee)||'待指派')} · ${E(x.due)}</p><p class="muted">成果 ${x.milestones.filter(m=>m.done).length} / ${x.milestones.length}</p>${link('查看與處理','tasks',{id:x.id})}</article>`).join('')||D.empty('目前沒有可見的工作','依公司、指派對象與主管部門顯示。')}</div>${boundary()}`;
 }
 D.register('tasks',{title:'專案交辦',group:'行政人事',roles:all,seed,render:taskPage});
 function taskForm(item){
  D.modal(item?'修改交辦草稿':'新增交辦申請',`<div class="form-grid"><label class="field full">工作名稱<input name="title" value="${E(item?.title)}" maxlength="160" required></label><label class="field">完成期限<input name="due" type="date" value="${E(item?.due||D.today)}" required></label><label class="field full">目的與預期成果<textarea name="note" maxlength="1000" required>${E(item?.note)}</textarea></label></div>`,v=>{
   if(item&&!taskActions(item).includes('edit'))throw Error('此草稿已送審或沒有編輯權限。');
   if(!item&&D.company!==D.actor.company)throw Error('請切回任職公司提出申請。');
   if(!v.title.trim()||!v.note.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(v.due))throw Error('請填寫工作名稱、期限與預期成果。');
   const x=item||{id:'TASK-'+Date.now(),company:D.company,department:person(D.actor.id)?.department||'',creator:D.actor.id,assignee:'',status:'draft',milestones:[],reports:[],history:[]};
   D.mutate(s=>{Object.assign(x,{title:v.title.trim(),due:v.due,note:v.note.trim()});if(!item)s.adminTasks.push(x);log(x,'儲存交辦申請草稿')});D.go('tasks',{id:x.id});
  },'儲存草稿');
 }
 D.on('ret-task-new',()=>{if(D.company!==D.actor.company)throw Error('請切回任職公司提出申請。');taskForm()});
 for(const action of ['edit','submit','review','approve','return','assign','update','complete','accept','revise'])D.on('ret-task-'+action,el=>{
  const x=D.state.adminTasks.find(x=>x.id===el.dataset.id);if(!x||!taskActions(x).includes(action))throw Error('這一步不在目前身分的可操作範圍。');
  if(action==='edit'){taskForm(x);return}
  const candidates=D.state.people.filter(p=>p.company===x.company&&p.active&&(p.department===x.department||D.role==='hrmanager'&&['行政部','人事行政部'].includes(p.department)));
  let fields=action==='assign'?`<label class="field">負責員工${D.select('assignee',candidates.map(p=>[p.id,`${p.name} · ${p.title}`]),x.assignee)}</label><label class="field">里程碑（每行一項）<textarea name="milestones" required placeholder="整理文件\n確認交接">${E(x.milestones.map(m=>m.title).join('\n'))}</textarea></label>`:action==='update'?`<fieldset><legend>已完成的成果</legend>${x.milestones.map(m=>`<label class="row"><span>${E(m.title)}</span><input type="checkbox" name="done_${E(m.id)}" ${m.done?'checked':''}></label>`).join('')}</fieldset><label class="field">成果連結（選填）<input name="url" type="url" placeholder="https://..."></label>`:'';
  fields+=`<label class="field">處理說明<textarea name="note" maxlength="1000" required></textarea></label>`;
  D.modal(({submit:'送交主管複核',review:'複核通過',approve:'核准交辦',return:'退回補充',assign:'指派工作',update:'回報成果',complete:'提交驗收',accept:'驗收通過',revise:'退回改善'})[action],fields,v=>{
   if(!taskActions(x).includes(action))throw Error('狀態或身分已變更，請重新開啟。');
   if(!v.note.trim())throw Error('請填寫處理說明。');
   if(action==='assign'&&!candidates.some(p=>p.id===v.assignee))throw Error('請選同公司與部門的在職員工。');
   const milestones=action==='assign'?v.milestones.split('\n').map(t=>t.trim()).filter(Boolean):[];
   if(action==='assign'&&(!milestones.length||milestones.length>30))throw Error('請填寫 1 至 30 個里程碑。');
   if(action==='update'&&v.url&&!/^https:\/\/[^\s]+$/i.test(v.url))throw Error('成果連結須使用 HTTPS。');
   if(action==='complete'&&(!x.milestones.length||x.milestones.some(m=>!m.done)))throw Error('全部里程碑完成後才能提交驗收。');
   D.mutate(()=>{
    if(action==='submit'){x.status='review';delete x.reviewer}
    if(action==='review'){x.status='approval';x.reviewer=D.actor.id}
    if(action==='approve')x.status='approved';if(action==='return')x.status='returned';
    if(action==='assign'){x.assignee=v.assignee;x.milestones=milestones.map((title,i)=>({id:'M'+(i+1),title,due:x.due,done:false}));x.status='working'}
    if(action==='update'){x.milestones.forEach(m=>m.done=!!v['done_'+m.id]);x.reports.push({at:D.today,actor:D.actor.name,actorId:D.actor.id,note:v.note,url:v.url||''})}
    if(action==='complete')x.status='inspection';if(action==='accept')x.status='accepted';if(action==='revise')x.status='working';
    log(x,`${({submit:'送出申請',review:'複核通過',approve:'核准',return:'退回',assign:'指派',update:'回報',complete:'送驗收',accept:'驗收通過',revise:'退回改善'})[action]}：${v.note}`);
   });
  },'確認');
 });
 D.retainedInbox=()=>D.state.adminTasks.filter(taskVisible).filter(x=>taskActions(x).some(a=>a!=='edit')).map(x=>({id:x.id,company:x.company,title:x.title,detail:labels[x.status],view:'tasks',params:{id:x.id},actionLabel:'處理交辦'}));
 D.register('applications',{title:'我的申請',group:'行政人事',roles:all,render(){
  const rows=[...(D.state.leaveRequests||[]).filter(x=>x.employeeId===D.actor.id).map(x=>({...x,title:'假勤申請',view:'leave'})),...(D.state.hrRequests||[]).filter(x=>x.createdBy===D.actor.id).map(x=>({...x,title:x.kind,view:'personnel'})),...D.state.adminTasks.filter(x=>x.creator===D.actor.id).map(x=>({...x,view:'tasks'}))].filter(scoped);
  return head('我的申請','查看自己提出的申請、目前進度與處理紀錄。')+`<div class="grid two">${rows.map(x=>`<article class="card"><h2>${E(x.title)}</h2><p>${E(x.id)} · ${E(x.view==='tasks'?labels[x.status]||x.status:({draft:'草稿',review:'待複核',approval:'待核准',returned:'退回修改',applied:'已生效',approved:x.view==='personnel'?'已核准・待生效':'已核准'})[x.status]||x.status)}</p>${link('查看申請',''+x.view,{id:x.id})}</article>`).join('')||D.empty('目前沒有本人申請')}</div>`;
 }});
 for(const kind of ['vendors','customers'])D.register(kind,{title:kind==='vendors'?'供應商資料':'客戶管理',group:'採購與工程',roles:['manager','finance','ceo','chairman','admin'],render(r={}){
  const rows=D.state.partners.filter(x=>scoped(x)&&x.kind===kind),p=rows.find(x=>x.id===r.id);
  return head(kind==='vendors'?'供應商資料':'客戶管理',kind==='vendors'?'公司、窗口與相關採購集中查看。':'保留公司業務客戶；屋主與租客由 PMS 管理。',p?link('返回清單',kind):['manager','finance','admin'].includes(D.role)?btn('新增資料示例','ret-partner-new',kind,true):'')+(p?`<section class="card"><h2>${E(p.name)}</h2><p>${E(p.company)} · ${E(p.category)}</p><p>聯絡窗口：${E(p.contact)}</p><p>${E(p.note)}</p>${['manager','finance','admin'].includes(D.role)?btn('修改資料','ret-partner-edit',p.id):''}<h3 class="space-top">相關採購</h3>${D.state.purchaseDemo.filter(x=>x.company===p.company&&x.vendor===p.name).map(x=>link(x.title,'procurement',{id:x.id})).join('')||'<p class="muted">尚無連結單據</p>'}</section>`:`<div class="grid two">${rows.map(p=>`<article class="card"><h2>${E(p.name)}</h2><p>${E(p.category)} · ${E(p.contact)}</p>${link('查看資料',kind,{id:p.id})}</article>`).join('')||D.empty('尚未建立資料','不自動補入不明的真實公司或個人。')}</div>`)+boundary();
 }});
 function partnerForm(p,kind){if(!['manager','finance','admin'].includes(D.role))throw Error('目前身分只能查看。');D.modal(p?'修改往來資料':'新增往來資料示例',`<div class="form-grid">${[['name','名稱'],['category','分類'],['contact','聯絡窗口']].map(([k,t])=>`<label class="field">${t}<input name="${k}" value="${E(p?.[k])}" maxlength="160" required></label>`).join('')}<label class="field full">備註<textarea name="note" maxlength="600">${E(p?.note)}</textarea></label></div>`,v=>{if(!['manager','finance','admin'].includes(D.role)||p&&!scoped(p))throw Error('身分或公司已改變。');if(!v.name.trim())throw Error('請填名稱。');D.mutate(s=>{if(p)Object.assign(p,v);else s.partners.push({...v,id:'PARTY-'+Date.now(),company:D.company,kind});D.log('更新往來資料示例')})})}
 D.on('ret-partner-new',el=>{if(!['vendors','customers'].includes(el.dataset.id))throw Error('類型不正確。');partnerForm(null,el.dataset.id)});
 D.on('ret-partner-edit',el=>{const p=D.state.partners.find(x=>x.id===el.dataset.id&&scoped(x));if(!p)throw Error('找不到資料。');partnerForm(p,p.kind)});
 D.register('files',{title:'文件管理',group:'採購與工程',roles:all,render(){const projects=D.allowed('engineering')?(D.state.engineeringProjects||[]).filter(p=>D.engineeringProjectVisible?D.engineeringProjectVisible(p):scoped(p)&&(D.role!=='employee'||p.work.some(w=>w.assigneeId===D.actor.id))):[];return head('文件管理','依來源找文件；最新版與歷史版本一起保留。')+`<div class="grid two"><article class="card"><h2>員工證件與合約</h2><p>勞動合約、護照、工作許可、簽證與續辦紀錄。</p>${link('查看證件與合約','documents')}</article>${projects.flatMap(p=>p.documents.map(d=>`<article class="card"><span class="eyebrow">${E(p.name)} · ${E(d.category)}</span><h2>${E(d.name)}</h2><p>${E(d.versions[0].version)} · ${E(d.versions[0].change)}</p>${link('查看版本與內容','engineering',{id:p.id,tab:'files'})}</article>`)).join('')}</div>${boundary()}`}});
 // Keep purchasing's review/approval flow, restore a general item editor and new requests.
 const procurement=D.modules.procurement,procurementRender=procurement.render;
 procurement.render=r=>{const html=procurementRender(r);return !r.id&&['manager','admin'].includes(D.role)?`<div class="toolbar">${btn('新增採購申請','ret-purchase-new','',true)}${link('供應商資料','vendors')}</div>`+html:html};
 function purchaseLine(x={},i=0){return `<fieldset data-purchase-line="${i}"><legend>採購品項</legend><div class="form-grid"><label class="field full">品名<input name="itemName${i}" value="${E(x.name)}" maxlength="160" required></label><label class="field">數量<input type="number" name="itemQty${i}" value="${x.qty??1}" min="0.001" step="0.001" required></label><label class="field">單價 USD<input type="number" name="itemPrice${i}" value="${x.unit??''}" min="0.01" step="0.01" required></label></div>${btn('移除此品項','ret-purchase-remove')}</fieldset>`}
 function purchaseForm(p){
  const company=D.company;
  const allowed=()=>['manager','admin'].includes(D.role)&&D.company===company&&(!p||scoped(p)&&['draft','returned'].includes(p.status));
  if(!allowed())throw Error('目前只能查看此採購。');
  const suppliers=D.state.partners.filter(x=>x.kind==='vendors'&&x.company===company);
  D.modal(p?'修改採購草稿':'新增採購申請',`<div class="form-grid"><label class="field full">採購用途<input name="title" value="${E(p?.title)}" maxlength="160" required></label><label class="field full">供應商<input name="vendor" value="${E(p?.vendor)}" list="ret-vendors" maxlength="160" required><datalist id="ret-vendors">${suppliers.map(x=>`<option value="${E(x.name)}"></option>`).join('')}</datalist></label></div><div data-purchase-lines>${(p?.items||[{}]).map(purchaseLine).join('')}</div>${btn('新增品項','ret-purchase-add')}<label class="field space-top">備註<textarea name="note" maxlength="1000">${E(p?.note)}</textarea></label>`,(v,form)=>{
   if(!allowed())throw Error('身分、公司或單據狀態已變更。');
   const indexes=form?.querySelectorAll?Array.from(form.querySelectorAll('[data-purchase-line]')).map(x=>x.dataset.purchaseLine):Object.keys(v).filter(k=>/^itemName\d+$/.test(k)).map(k=>k.slice(8));
   if(!indexes.length||indexes.length>30||!v.title.trim()||!v.vendor.trim())throw Error('請填寫用途、供應商與 1 至 30 個品項。');
   const items=indexes.map(i=>({name:String(v['itemName'+i]||'').trim(),qty:Number(v['itemQty'+i]),unit:Number(v['itemPrice'+i])}));
   if(items.some(x=>!x.name||!Number.isFinite(x.qty)||x.qty<=0||!Number.isFinite(x.unit)||x.unit<=0||x.qty*x.unit>100000000))throw Error('品名不能空白，數量與單價須為有效正數。');
   const row=p||{id:'PO-'+Date.now(),company,requester:D.actor.name,requesterId:D.actor.id,status:'draft',history:[]};
   D.mutate(s=>{Object.assign(row,{title:v.title.trim(),vendor:v.vendor.trim(),items,note:v.note||''});if(!p)s.purchaseDemo.push(row);row.history.push({at:D.today,actor:D.actor.name,action:'儲存採購草稿',note:'保留完整品項與金額'});D.log('儲存採購示例 '+row.id)});D.go('procurement',{id:row.id});
  },'儲存草稿');
 }
 D.on('ret-purchase-new',()=>purchaseForm());
 D.on('purchase-edit',el=>{const p=D.state.purchaseDemo.find(x=>x.id===el.dataset.id);if(!p)throw Error('找不到採購。');purchaseForm(p)});
 D.on('ret-purchase-add',()=>{const wrap=document.querySelector('[data-purchase-lines]'),rows=Array.from(wrap?.querySelectorAll('[data-purchase-line]')||[]);if(!wrap)return;if(rows.length>=30)throw Error('最多 30 個品項。');wrap.insertAdjacentHTML('beforeend',purchaseLine({},Math.max(-1,...rows.map(x=>Number(x.dataset.purchaseLine)))+1))});
 D.on('ret-purchase-remove',el=>{const row=el.closest('[data-purchase-line]');if(row?.parentElement.querySelectorAll('[data-purchase-line]').length<=1)throw Error('至少保留一個品項。');row?.remove()});
 // Original training was a planned module, so keep its actual scope without inventing approvals.
 const training=D.modules.training;training.roles=all;
 training.render=()=>head('培訓與獎懲','保留原本的六項內容，制度與作業流程仍待確認。')+`<div class="grid three">${['課程','出席','證照','表揚','違紀','申覆'].map(x=>`<article class="card"><h2>${x}</h2>${D.badge('待確認啟用','amber')}<p class="muted">資料格式、建立人與核准規則尚未定案。</p></article>`).join('')}</div>`;
 // Preserve the existing rights-impact demonstration; expose the remaining original setting sections.
 const access=D.modules.access,accessRender=access.render;
 access.title='報表與設定';access.render=r=>{const tab=r.tab||'impact';const tabs=[['impact','職務權限影響'],['audit','操作紀錄'],['pending','待確認規則']];const nav=`<nav class="subnav">${tabs.map(([id,t])=>`<a class="${tab===id?'active':''}" href="#view=access&tab=${id}">${t}</a>`).join('')}</nav>`;return nav+(tab==='impact'?accessRender(r):tab==='audit'?head('操作紀錄','此瀏覽器的示例操作；不包含任何正式帳號的私人操作紀錄。')+history(D.state.audit.map(x=>({at:x.at,actor:x.actor,text:x.text}))):head('待確認規則','保留未定案的公司制度與授權，不替客戶預設。')+`<section class="card"><p>公司 × 功能 × 查看／新增／複核／核准／設定，分別授權；代理須有期限。</p><p>待確認：實際主管關係、簽核層級、證件提醒、薪酬社保公式、會計期初資料與 PMS 串接。</p>${link('記錄討論結果','discussion')}</section>`)};
})();
