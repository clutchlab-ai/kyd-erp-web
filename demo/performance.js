/* Native meeting UI: complete KPI contents, isolated from formal employee records and APIs. */
(function () {
  'use strict';
  const E = value => D.esc(value);
  const names = id => D.state.people.find(p=>p.id===id)?.name || id;
  const plans = () => D.state.kpiPlans || [];
  const labels={draft:'目標草稿',goals_review:'待 CEO 確認目標',active:'目標已確認',review_returned:'評分待補充',second_review:'待 CEO 評核',completed:'兩層評核完成',void:'已作廢'};
  const stages=['主管訂目標','CEO 確認目標','主管評分','CEO 評核','查看結果'];
  const step={draft:0,goals_review:1,active:2,review_returned:2,second_review:3,completed:4,void:-1};
  const categories=['重要工作','例行工作','專案工作'];
  const inCompany=()=>['ceo','chairman','admin'].includes(D.role)||!D.actor.company||D.actor.company===D.company;
  const visible=p=>inCompany()&&p.company===D.company&&(['ceo','chairman','admin'].includes(D.role)||D.role==='manager'&&p.managerId===D.actor.id||p.employeeId===D.actor.id);
  const manager=()=>D.role==='manager';
  const ceo=()=>D.role==='ceo';
  const canManage=p=>visible(p)&&manager()&&p.managerId===D.actor.id&&p.employeeId!==D.actor.id;
  const canReview=p=>visible(p)&&ceo()&&(p.secondManagerId||'x01')===D.actor.id&&p.managerId!==D.actor.id&&p.employeeId!==D.actor.id;
  const find=id=>plans().find(p=>p.id===id);
  const button=(label,action,id='',primary=false)=>`<button type="button" class="btn${primary?' primary':''}" data-action="${action}" data-id="${E(id)}">${E(label)}</button>`;
  const sumWeight=p=>Math.round(p.goals.reduce((s,g)=>s+Number(g.weight),0)*100)/100;
  const max=p=>Number(p.scoreMax)||100;
  const weighted=(p,scores)=>Math.round(p.goals.reduce((s,g,i)=>s+Number(scores[i])*g.weight/100,0)*100)/100;
  const period=p=>p.start&&p.end?`${p.start} → ${p.end}`:p.period;
  const href=(params={})=>'#'+new URLSearchParams({view:'performance',...params});
  const policy=company=>D.state.kpiPolicies?.[company]||{configured:false,managerWeight:null,ceoWeight:null};
  const next=p=>({draft:'主管設定工作目標、期間、評分尺度與比重，再送上層確認。',goals_review:'CEO 核對目標、期間及比重；需要補充可退回主管。',active:'主管依每項實際成果與依據評分，再交 CEO 評核。',review_returned:'主管依退回原因補充成果與評分依據，再次送出。',second_review:'CEO 核對成果，提供第二層評分與評語；可退回補充。',completed:'員工可查看兩層分數與紀錄；完成評核不會自動調薪。',void:'此份草稿已作廢，目標與處理紀錄仍保留。'})[p.status];
  const log=(p,text)=>{p.history.push({at:D.today,actor:D.actor.name,text});D.log(text);};
  const actionable=p=>canManage(p)&&['draft','active','review_returned'].includes(p.status)||canReview(p)&&['goals_review','second_review'].includes(p.status);
  const scopeNotice=()=>'';
  function seed(s){
    if(!s.kpiPlans){
      s.kpiPolicy={configured:false,managerWeight:null,ceoWeight:null};
      s.kpiPlans=[{id:'KPI-001',company:'KYD',employeeId:'e01',managerId:'m01',secondManagerId:'x01',title:'工作品質與協作｜示例考核',period:'2026 年 11 月',start:'2026-11-01',end:'2026-11-30',scoreMax:100,status:'draft',goals:[
        {id:'KG-1',category:'重要工作',title:'完成指定工作的檢核與回報',target:'依期限完成 3 項工作，每項附上檢核結果與待解決事項。',weight:50},
        {id:'KG-2',category:'例行工作',title:'維護文件最新版',target:'每週核對文件版本，發現差異時記錄來源與修改說明。',weight:30},
        {id:'KG-3',category:'專案工作',title:'完成跨部門交接',target:'列出交接項目、接手人與完成日，並取得接手人確認。',weight:20}
      ],first:null,second:null,policy:null,history:[{at:'2026-11-04',actor:'示例工程主管',text:'建立示例目標草稿，尚未正式確認。'}]}];
    }
    // Add only missing schema fields: keep every saved goal, score, policy snapshot and history entry.
    if(!s.kpiPolicies)s.kpiPolicies={KYD:{...(s.kpiPolicy||{configured:false,managerWeight:null,ceoWeight:null})}};
    if(!s.kpiPolicy)s.kpiPolicy={configured:false,managerWeight:null,ceoWeight:null};
    for(const p of s.kpiPlans){p.scoreMax??=100;p.secondManagerId??='x01';p.history??=[];p.goalReturned??=p.status==='draft'&&p.history.at(-1)?.text?.startsWith('CEO 退回目標：')||false;}
  }
  function tabs(active='plans',rows=[]){return `<nav class="subnav">${[['plans','考核清單'],['todo',`待我處理 (${rows.filter(actionable).length})`],['policy','合成規則']].map(([key,label])=>`<a class="${active===key?'active':''}" href="${href(key==='plans'?{}:{tab:key})}">${label}</a>`).join('')}</nav>`;}
  function policyText(p){return p?.configured?`主管 ${p.managerWeight}% ＋ CEO ${p.ceoWeight}%`:'尚未設定合成比重，兩層分數分開保留。';}
  function renderPolicy(rows){const v=policy(D.company);return `<header class="page-head"><div><p class="eyebrow">行政人事 / 考核管理</p><h1>考核合成規則</h1><p class="lede">${E(D.company)} · 確認目標時固定比重，之後修改不影響舊考核。</p></div></header>${tabs('policy',rows)}${scopeNotice()}<section class="card stack"><h2>兩層分數怎麼合成</h2><p>${E(policyText(v))}</p>${ceo()?button('設定合成比重','kpi-policy','',true):''}<p class="mini">不同公司分別設定。實際考核週期、評分尺度、等第與薪酬影響仍待確認，不自動調薪。</p></section>`;}
  function render(params={}){
    const rows=plans().filter(visible),id=params.id||params.detail;
    if(id){const p=rows.find(p=>p.id===id);return p?renderDetail(p):`<header class="page-head"><h1>考核管理</h1></header><p><a href="${href()}">← 返回考核清單</a></p>${D.empty('無法查看這份考核','請從自己的考核清單開啟。')}`;}
    if(params.tab==='policy')return renderPolicy(rows);
    const list=params.tab==='todo'?rows.filter(actionable):rows;
    return `<header class="page-head"><div><p class="eyebrow">行政人事</p><h1>考核管理</h1><p class="lede">先訂目標，再確認；兩層主管分別評核，員工查看結果。</p></div>${manager()?button('新增考核','kpi-new','',true):''}</header>${tabs(params.tab==='todo'?'todo':'plans',rows)}${scopeNotice()}<div class="grid three">${[['全部考核',rows.length],['待我處理',rows.filter(actionable).length],['已完成',rows.filter(p=>p.status==='completed').length]].map(([label,value])=>`<article class="card stat"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div><div class="grid two space-top">${list.map(p=>`<article class="card stack"><div class="row">${D.badge(labels[p.status],p.status==='completed'?'green':p.status==='void'?'neutral':'blue')}<span class="mini">${E(p.company)}</span></div><h2>${E(p.title)}</h2><p>${E(names(p.employeeId))} · ${E(period(p))}</p><p class="mini">${p.goals.length} 項目標 · 每項滿分 ${max(p)}<br>直屬主管：${E(names(p.managerId))} → 上層主管：${E(names(p.secondManagerId||'x01'))}</p><div class="action-row">${entryButton(p)}<a class="btn" href="${href({id:p.id})}">${p.status==='completed'?'查看考核結果':'查看目標與評核'}</a></div></article>`).join('')}</div>${!list.length?D.empty(params.tab==='todo'?'目前沒有待處理考核':'目前沒有可查看的考核','只列出此公司與目前身分可查看的考核。'):''}<p class="mini space-top">${E(policyText(policy(D.company)))}</p>`;
  }
  function entryButton(p){
    if(canManage(p)&&p.status==='draft')return button(p.goalReturned?'補充並重送目標':'填寫目標','kpi-edit',p.id,true);
    if(canManage(p)&&['active','review_returned'].includes(p.status))return button('填寫主管評分','kpi-first',p.id,true);
    if(canReview(p)&&p.status==='goals_review')return button('確認目標','kpi-confirm',p.id,true);
    if(canReview(p)&&p.status==='second_review')return button('填寫 CEO 評核','kpi-second',p.id,true);
    return '';
  }
  function handoff(p){
    const nextId=['draft','active','review_returned'].includes(p.status)?p.managerId:['goals_review','second_review'].includes(p.status)?p.secondManagerId:p.status==='completed'?p.employeeId:null;
    const role=Object.entries(D.roles||{}).find(([,a])=>a.id===nextId)?.[0];
    return nextId?`<div class="row"><span class="mini">${p.status==='completed'?'結果收件人':'目前處理人'}：${E(names(nextId))}</span>${role&&role!==D.role?`<button class="btn" data-action="switch-role" data-role="${E(role)}" data-view="performance" data-id="${E(p.id)}">${E(names(nextId))}的工作台</button>`:''}</div>`:'';
  }
  function scoreBlock(p,review,label){return `<article class="card stack"><h2>${E(label)}</h2>${review?`<div class="metric"><strong>${weighted(p,review.scores)} <span class="mini">／${max(p)}</span></strong></div>${p.goals.map((g,i)=>`<div class="task-line"><strong>${E(g.title)} · ${E(review.scores[i])} / ${max(p)}</strong><p>${E(review.evidence?.[i]||'舊示例未分項記錄依據，保留原評語。')}</p></div>`).join('')}<p>${E(review.note)}</p><p class="mini">${E(review.actor)} · ${E(review.at)}</p>`:'<p class="muted">尚未評分</p>'}</article>`;}
  function renderDetail(p){
    let actions='';
    if(canManage(p)&&p.status==='draft')actions=button('編輯目標','kpi-edit',p.id)+button('作廢草稿','kpi-void',p.id)+button('送 CEO 確認','kpi-submit',p.id,true);
    if(canReview(p)&&p.status==='goals_review')actions=button('退回修改','kpi-return',p.id)+button('確認目標','kpi-confirm',p.id,true);
    if(canManage(p)&&['active','review_returned'].includes(p.status))actions=button('填寫主管評分','kpi-first',p.id,true);
    if(canReview(p)&&p.status==='second_review')actions=button('退回補充評分','kpi-review-return',p.id)+button('填寫 CEO 評核','kpi-second',p.id,true);
    const combined=p.first&&p.second&&p.policy?Math.round(weighted(p,p.first.scores)*p.policy.managerWeight+weighted(p,p.second.scores)*p.policy.ceoWeight)/100:null;
    return `<p><a href="${href()}">← 返回考核清單</a></p><header class="page-head"><div><p class="eyebrow">行政人事 / 考核管理</p><h1>${E(p.title)}</h1><p class="lede">${E(names(p.employeeId))} · ${E(period(p))} · ${E(p.company)}</p></div></header>${scopeNotice()}<div class="steps">${stages.map((s,i)=>`<div class="step ${i<step[p.status]?'done':i===step[p.status]?'active':''}">${E(s)}</div>`).join('')}</div><section class="card stack"><div class="row">${D.badge(labels[p.status],p.status==='completed'?'green':'blue')}<span class="mini">每項滿分 ${max(p)} · 目標比重合計 ${sumWeight(p)}%</span></div>${handoff(p)}${p.goalReturned||p.status==='review_returned'?`<p class="notice amber">${E(p.history.at(-1)?.text||'請補充後重送')}</p>`:''}<p class="mini">直屬主管：${E(names(p.managerId))} → 上層主管：${E(names(p.secondManagerId||'x01'))}</p><div class="action-row">${actions}</div></section><h2 class="space-top">工作目標</h2><div class="grid three">${p.goals.map(g=>`<article class="card stack"><p class="eyebrow">${E(g.category)} · 比重 ${g.weight}%</p><h3>${E(g.title)}</h3><p>${E(g.target)}</p></article>`).join('')}</div><div class="grid two">${scoreBlock(p,p.first,'第一層：主管評分')}${scoreBlock(p,p.second,'第二層：CEO 評核')}</div><section class="card stack"><div class="row"><h2>考核結果與合成比重</h2>${ceo()&&p.status==='draft'?button('設定合成比重','kpi-policy',p.id):''}</div>${p.policy?`<p>主管 ${p.policy.managerWeight}% ＋ CEO ${p.policy.ceoWeight}%。確認目標時已固定。</p>`:`<p>${E(['draft','goals_review'].includes(p.status)?policyText(policy(p.company)):'確認目標時尚未設定合成比重，這份考核保留兩層分數。')}</p>`}${combined!==null?`<div class="metric"><strong>${combined.toFixed(2)} <span class="mini">／${max(p)} · 合成總分</span></strong></div>`:''}<p class="mini">兩層評分分別保存；考核結果不會自動調薪。</p></section>${p.reviewHistory?.length?`<details class="card"><summary>查看補充前的評分 (${p.reviewHistory.length})</summary>${p.reviewHistory.map(r=>scoreBlock(p,r,r.level===1?'主管先前評分':'CEO 先前評分')).join('')}</details>`:''}<details class="card"><summary>查看處理紀錄 (${p.history.length})</summary><div class="timeline">${p.history.map(h=>`<article><strong>${E(h.text)}</strong><p class="mini">${E(h.at)} · ${E(h.actor)}</p></article>`).join('')}</div></details>`;
  }
  function read(el){const p=find(el.dataset.id);if(!p||!visible(p))throw Error('無法查看這份考核。');return p;}
  function check(p,status,allowed){if(!(Array.isArray(status)?status.includes(p.status):p.status===status)||!allowed)throw Error('請使用目前步驟的負責身分操作。');}
  const text=(v,label,maxLength)=>{const out=String(v??'').trim();if(!out||out.length>maxLength)throw Error(`請填寫${label}（最多 ${maxLength} 字）。`);return out;};
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
  function goalRow(g={},i=0){return `<fieldset data-kpi-goal="${i}" data-goal-id="${E(g.id||'')}"><legend>工作目標 ${i+1}</legend><div class="form-grid"><label class="field">工作類別${D.select('category'+i,categories.map(c=>[c,c]),g.category||categories[0])}</label><label class="field">比重（%）<input name="weight${i}" type="number" value="${g.weight??''}" min="0.01" max="100" step="0.01" required></label></div><label class="field">目標名稱<input name="title${i}" value="${E(g.title||'')}" maxlength="120" required></label><label class="field">要完成什麼／如何判斷<textarea name="target${i}" maxlength="400" required>${E(g.target||'')}</textarea></label><button class="btn" type="button" data-action="kpi-remove-goal">移除此目標</button></fieldset>`;}
  function goalForm(p){
    if(p)check(p,'draft',canManage(p));else if(!manager()||!inCompany())throw Error('由任職公司的直屬主管建立考核。');
    const company=D.company,actor=D.actor.id,subjects=D.state.people.filter(s=>s.company===company&&s.active!==false&&s.id!==D.actor.id&&['administrative_assistant','engineering_assistant','technical','employee'].includes(s.profile));
    if(!p&&!subjects.length)throw Error('此公司目前沒有可選的示例員工。');
    const eligible=subjects.map(s=>[s.id,s.name]);
    D.modal(p?'編輯考核目標':'新增考核',`${scopeNotice()}${p?`<p>考核員工：${E(names(p.employeeId))}</p>`:`<label class="field">考核員工${D.select('employeeId',eligible,'')}</label>`}<label class="field">考核名稱<input name="planTitle" value="${E(p?.title||'')}" maxlength="120" required></label><div class="form-grid"><label class="field">期間開始<input name="start" type="date" value="${E(p?.start||'')}" required></label><label class="field">期間結束<input name="end" type="date" value="${E(p?.end||'')}" required></label><label class="field">每項滿分<input name="scoreMax" type="number" min="1" max="10000" step="0.01" value="${p?max(p):''}" required></label></div><p class="mini">期間與滿分由本份考核決定，不預設月考核或百分制。目標比重合計須為 100%。</p><div data-kpi-goals>${(p?.goals||[{}]).map(goalRow).join('')}</div>${button('新增目標','kpi-add-goal')}`, (v,form)=>{
      if(company!==D.company||actor!==D.actor.id)throw Error('身分或公司範圍已改變，請重新開啟。');
      if(p)check(p,'draft',canManage(p));else if(!manager()||!inCompany())throw Error('由任職公司的直屬主管建立考核。');
      const employeeId=p?.employeeId||v.employeeId;if(!p&&!subjects.some(s=>s.id===employeeId))throw Error('請選擇此公司可考核的員工。');
      const start=String(v.start||''),end=String(v.end||''),scoreMax=Number(v.scoreMax),title=text(v.planTitle,'考核名稱',120);
      if(!date(start)||!date(end)||start>end)throw Error('請填寫有效的考核起訖日期，結束不可早於開始。');
      if(!Number.isFinite(scoreMax)||scoreMax<1||scoreMax>10000)throw Error('每項滿分須介於 1 至 10000。');
      const indices=form?.querySelectorAll?Array.from(form.querySelectorAll('[data-kpi-goal]')).map(r=>Number(r.dataset.kpiGoal)):Object.keys(v).filter(k=>/^title\d+$/.test(k)).map(k=>Number(k.slice(5))).sort((a,b)=>a-b);
      if(!indices.length||indices.length>20)throw Error('請保留 1 至 20 項目標。');
      const goals=indices.map(i=>{const weight=Number(v['weight'+i]),category=v['category'+i];if(!categories.includes(category))throw Error('請選擇工作類別。');if(!Number.isFinite(weight)||weight<=0||weight>100)throw Error('各項比重須大於 0，且不超過 100%。');return {id:p?.goals[i]?.id||`KG-${Date.now()}-${i}`,category,title:text(v['title'+i],'目標名稱',120),target:text(v['target'+i],'判斷依據',400),weight};});
      if(Math.abs(goals.reduce((s,g)=>s+g.weight,0)-100)>0.00001)throw Error('目標比重必須合計 100%。');
      let record=p;
      D.mutate(()=>{if(!record){record={id:`KPI-${Date.now()}-${plans().length+1}`,company,employeeId,managerId:D.actor.id,secondManagerId:'x01',status:'draft',first:null,second:null,policy:null,history:[]};plans().push(record);}Object.assign(record,{title,start,end,period:`${start} → ${end}`,scoreMax,goals});log(record,p?'主管更新目標、期間、滿分與各項比重。':'主管建立考核草稿。');});D.go('performance',{id:record.id});
    },'儲存目標草稿');
  }
  D.register('performance',{title:'考核管理',group:'行政人事',roles:['employee','hr','hrmanager','manager','finance','ceo','chairman','admin'],seed,render});
  D.on('kpi-new',()=>goalForm());D.on('kpi-edit',el=>goalForm(read(el)));
  D.on('kpi-add-goal',()=>{const wrap=document.querySelector('[data-kpi-goals]'),rows=Array.from(wrap?.querySelectorAll('[data-kpi-goal]')||[]);if(!wrap)return;if(rows.length>=20)throw Error('最多 20 項目標。');const index=Math.max(-1,...rows.map(r=>Number(r.dataset.kpiGoal)))+1;wrap.insertAdjacentHTML('beforeend',goalRow({},index));});
  D.on('kpi-remove-goal',el=>{const row=el.closest('[data-kpi-goal]');if(row?.parentElement.querySelectorAll('[data-kpi-goal]').length<=1)throw Error('至少保留一項目標。');row?.remove();});
  D.on('kpi-submit',el=>{const p=read(el);check(p,'draft',canManage(p));D.modal('送 CEO 確認目標',`<p>${E(names(p.employeeId))} · ${p.goals.length} 項目標 · 比重 ${sumWeight(p)}%</p><p>${E(period(p))} · 每項滿分 ${max(p)}</p><p>送出後鎖定目標，CEO 的首頁會出現待確認事項。</p>`,()=>{check(p,'draft',canManage(p));if(sumWeight(p)!==100)throw Error('目標比重必須合計 100%。');D.mutate(()=>{p.status='goals_review';p.goalReturned=false;log(p,'主管送出目標、期間與評分尺度，等待 CEO 確認。');});},'送出');});
  function returnPlan(el,assessment){const p=read(el);check(p,assessment?'second_review':'goals_review',canReview(p));D.modal(assessment?'退回補充評分':'退回目標',`<label class="field">需要補充什麼<textarea name="note" required maxlength="400"></textarea></label>`,v=>{check(p,assessment?'second_review':'goals_review',canReview(p));const note=text(v.note,'退回原因',400);D.mutate(()=>{p.status=assessment?'review_returned':'draft';if(!assessment)p.goalReturned=true;log(p,(assessment?'CEO 退回評分：':'CEO 退回目標：')+note);});},'退回主管');}
  D.on('kpi-return',el=>returnPlan(el,false));D.on('kpi-review-return',el=>returnPlan(el,true));
  D.on('kpi-confirm',el=>{const p=read(el);check(p,'goals_review',canReview(p));D.modal('確認考核目標',`<p>確認這 ${p.goals.length} 項目標、期間與每項滿分 ${max(p)} 後，主管才能填寫評分。</p><p>${E(policyText(policy(p.company)))}</p>`,()=>{check(p,'goals_review',canReview(p));const rule=policy(p.company);D.mutate(()=>{p.status='active';p.policy=rule.configured?{managerWeight:rule.managerWeight,ceoWeight:rule.ceoWeight}:null;log(p,'CEO 確認目標、期間及滿分，交主管按成果評分。');});},'確認目標');});
  D.on('kpi-policy',el=>{const p=el.dataset.id?read(el):null,company=p?.company||D.company;if(!ceo())throw Error('由 CEO 設定合成比重。');if(p)check(p,'draft',canReview(p));const rule=policy(company);D.modal('設定合成比重',`<p>${E(company)}</p><div class="form-grid"><label class="field">主管占比（%）<input name="managerWeight" type="number" min="1" max="99" step="1" value="${rule.managerWeight??''}" required></label><label class="field">CEO 占比（%）<input name="ceoWeight" type="number" min="1" max="99" step="1" value="${rule.ceoWeight??''}" required></label></div><p class="mini">兩者合計須為 100%。僅套用於之後確認目標的考核，不回改已確認的比重。</p>`,v=>{if(!ceo()||company!==D.company)throw Error('身分或公司已改變，請重新設定。');if(p)check(p,'draft',canReview(p));const a=Number(v.managerWeight),b=Number(v.ceoWeight);if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a+b!==100)throw Error('請填正整數，合計 100%。');D.mutate(()=>{const rule={configured:true,managerWeight:a,ceoWeight:b};D.state.kpiPolicies[company]=rule;D.state.kpiPolicy={...rule};if(p)log(p,`設定示例合成規則：主管 ${a}%、CEO ${b}%。`);else D.log(`${company} 設定示例合成規則：主管 ${a}%、CEO ${b}%。`);});},'儲存比重');});
  D.on('kpi-void',el=>{const p=read(el);check(p,'draft',canManage(p));D.modal('作廢考核草稿',`<p>保留目標與紀錄，作廢後不能送審。</p><label class="field">作廢原因<textarea name="note" maxlength="400" required></textarea></label>`,v=>{check(p,'draft',canManage(p));const note=text(v.note,'作廢原因',400);D.mutate(()=>{p.status='void';log(p,'主管作廢草稿：'+note);});},'作廢草稿');});
  function score(el,second){const p=read(el),states=second?'second_review':['active','review_returned'];check(p,states,second?canReview(p):canManage(p));const prior=p[second?'second':'first'];D.modal(second?'CEO 第二層評核':'主管第一層評分',`${p.goals.map((g,i)=>`<fieldset><legend>${E(g.title)} · ${g.weight}%</legend><p>${E(g.target)}</p>${second?`<p class="mini">主管分數：${p.first.scores[i]} / ${max(p)}</p>`:''}<label class="field">分數（0–${max(p)}）<input name="score${i}" type="number" min="0" max="${max(p)}" step="0.01" value="${prior?.scores[i]??''}" required></label><label class="field">實際成果／評分依據<textarea name="evidence${i}" maxlength="400" required>${E(prior?.evidence?.[i]||'')}</textarea></label></fieldset>`).join('')}<label class="field">本層整體評語<textarea name="note" required maxlength="600">${E(prior?.note||'')}</textarea></label>`,v=>{check(p,states,second?canReview(p):canManage(p));const scores=p.goals.map((_,i)=>Number(v['score'+i]));if(scores.some((s,i)=>String(v['score'+i]??'').trim()===''||!Number.isFinite(s)||s<0||s>max(p)))throw Error(`每項分數須介於 0 至 ${max(p)}。`);const note=text(v.note,'整體評語',600);const evidence=p.goals.map((_,i)=>text(v['evidence'+i]??note,'各項成果與評分依據',400));D.mutate(()=>{if(prior){p.reviewHistory??=[];p.reviewHistory.push({level:second?2:1,...prior});}p[second?'second':'first']={scores,evidence,note,actor:D.actor.name,at:D.today};p.status=second?'completed':'second_review';log(p,second?'CEO 完成第二層評核，員工可查看結果。':'主管送出第一層評分與成果依據，等待 CEO 評核。');});},second?'完成評核':'送 CEO 評核');}
  D.on('kpi-first',el=>score(el,false));D.on('kpi-second',el=>score(el,true));
  D.kpiInbox=role=>plans().filter(visible).filter(p=>(role==='manager'&&canManage(p)&&['draft','active','review_returned'].includes(p.status))||(role==='ceo'&&canReview(p)&&['goals_review','second_review'].includes(p.status))).map(p=>({id:p.id,company:p.company,title:`${names(p.employeeId)}｜${labels[p.status]}`,detail:next(p),view:'performance',params:{id:p.id},actionLabel:p.status==='draft'?(p.goalReturned?'修改後重送':'設定目標'):['active','review_returned'].includes(p.status)?'前往評分':p.status==='goals_review'?'確認目標':'前往評核',status:p.goalReturned&&p.status==='draft'?'returned':p.status}));
  D.kpiResults=()=>plans().filter(visible).filter(p=>p.status==='completed'&&[p.employeeId,p.managerId,p.secondManagerId].includes(D.actor.id)).map(p=>({id:p.id,company:p.company,title:names(p.employeeId)+' · 考核已完成',detail:p.title+' · '+period(p),view:'performance',params:{id:p.id},status:p.status,actionLabel:'查看考核結果'}));
})();
