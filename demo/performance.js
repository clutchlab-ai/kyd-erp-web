/* Synthetic KPI discussion flow, separate from the authenticated production application. */
(function () {
  'use strict';
  const E = value => D.esc(value);
  const names = id => D.state.people.find(p=>p.id===id)?.name || id;
  const plans = () => D.state.kpiPlans || [];
  const labels={draft:'目標草稿',goals_review:'待 CEO 確認目標',active:'目標已確認',second_review:'待 CEO 評核',completed:'兩層評核完成'};
  const stages=['主管訂目標','CEO 確認目標','主管評分','CEO 評核','查看結果'];
  const step={draft:0,goals_review:1,active:2,second_review:3,completed:4};
  const visible=p=>p.company===D.state.company&&(['manager','ceo','chairman','admin'].includes(D.role)||(D.role==='employee'&&p.employeeId===D.actor.id));
  const manager=()=>D.role==='manager';
  const ceo=()=>D.role==='ceo';
  const find=id=>plans().find(p=>p.id===id);
  const button=(label,action,id,primary=false)=>`<button type="button" class="btn${primary?' primary':''}" data-action="${action}" data-id="${E(id)}">${E(label)}</button>`;
  const sumWeight=p=>p.goals.reduce((s,g)=>s+g.weight,0);
  const weighted=(p,scores)=>Math.round(p.goals.reduce((s,g,i)=>s+Number(scores[i])*g.weight/100,0)*100)/100;
  const next=p=>({draft:'工程主管設定工作目標與比重，再送 CEO 確認。',goals_review:'切換 CEO，確認目標或退回主管修改。',active:'工程主管依每項實際成果評分，送 CEO 評核。',second_review:'切換 CEO，提供第二層評分與評語。',completed:'員工可查看兩層分數；不會因此自動調薪。'})[p.status];
  const log=(p,text)=>{p.history.push({at:D.today,actor:D.actor.name,text});D.log(text);};
  function seed(s){
    if (s.kpiPlans) return;
    s.kpiPolicy={configured:false,managerWeight:null,ceoWeight:null};
    s.kpiPlans=[{id:'KPI-001',company:'KYD',employeeId:'e01',managerId:'m01',title:'工作品質與協作｜示例考核',period:'2026 年 11 月',status:'draft',goals:[
      {id:'KG-1',category:'重要工作',title:'完成指定工作的檢核與回報',target:'依期限完成 3 項工作，每項附上檢核結果與待解決事項。',weight:50},
      {id:'KG-2',category:'例行工作',title:'維護文件最新版',target:'每週核對文件版本，發現差異時記錄來源與修改說明。',weight:30},
      {id:'KG-3',category:'專案工作',title:'完成跨部門交接',target:'列出交接項目、接手人與完成日，並取得接手人確認。',weight:20}
    ],first:null,second:null,policy:null,history:[{at:'2026-11-04',actor:'示例工程主管',text:'建立示例目標草稿，尚未正式確認。'}]}];
  }
  function scoreBlock(p,review,label){
    return `<article class="card"><h2>${E(label)}</h2>${review?`<div class="metric"><strong>${weighted(p,review.scores)} <span class="mini">／100</span></strong></div><p>${E(review.note)}</p><p class="mini">${E(review.actor)} · ${E(review.at)}</p>`:'<p class="muted">尚未評分</p>'}</article>`;
  }
  function render(params={}){
    const rows=plans().filter(visible);
    if(!rows.length)return `<header class="page-head"><div><p class="eyebrow">行政人事</p><h1>考核管理</h1></div></header>${D.empty('目前沒有可查看的考核','員工只查看自己的考核；主管與經營者查看授權公司的進度。')}`;
    const p=rows.find(x=>x.id===params.id)||rows[0];
    let actions='';if(manager()&&p.status==='draft')actions=button('編輯目標','kpi-edit',p.id)+button('送 CEO 確認','kpi-submit',p.id,true);
    if(ceo()&&p.status==='goals_review')actions=button('退回修改','kpi-return',p.id)+button('確認目標','kpi-confirm',p.id,true);
    if(manager()&&p.status==='active')actions=button('填寫主管評分','kpi-first',p.id,true);
    if(ceo()&&p.status==='second_review')actions=button('填寫 CEO 評核','kpi-second',p.id,true);
    const combined=p.first&&p.second&&p.policy?Math.round((weighted(p,p.first.scores)*p.policy.managerWeight+weighted(p,p.second.scores)*p.policy.ceoWeight))/100:null;
    return `<header class="page-head"><div><p class="eyebrow">行政人事 / 考核管理</p><h1>${E(p.title)}</h1><p class="lede">${E(names(p.employeeId))} · ${E(p.period)} · ${E(p.company)}</p></div></header><div class="steps">${stages.map((s,i)=>`<div class="step ${i<step[p.status]?'done':i===step[p.status]?'active':''}">${E(s)}</div>`).join('')}</div><section class="card stack"><div class="row">${D.badge(labels[p.status],p.status==='completed'?'green':'blue')}<span class="mini">主管訂目標 → 上層確認 → 兩層評分</span></div><p>${E(next(p))}</p><div class="action-row">${actions}</div></section><div class="grid three">${p.goals.map((g,i)=>`<article class="card stack"><p class="eyebrow">${E(g.category)} · 比重 ${g.weight}%</p><h3>${E(g.title)}</h3><p>${E(g.target)}</p>${p.first?`<p class="mini">主管評分 ${p.first.scores[i]} / 100${p.second?' · CEO '+p.second.scores[i]+' / 100':''}</p>`:''}</article>`).join('')}</div><div class="grid two">${scoreBlock(p,p.first,'第一層：主管評分')}${scoreBlock(p,p.second,'第二層：CEO 評核')}</div><section class="card stack"><div class="row"><h2>兩層分數怎麼合成</h2>${ceo()&&p.status==='draft'?button('設定示例比重','kpi-policy',p.id):''}</div>${p.policy?`<p>主管 ${p.policy.managerWeight}% ＋ CEO ${p.policy.ceoWeight}%。這份考核確認目標時已固定比重。</p>`:D.state.kpiPolicy.configured&&p.status==='draft'||D.state.kpiPolicy.configured&&p.status==='goals_review'?`<p>待確認的示例比重：主管 ${D.state.kpiPolicy.managerWeight}% ＋ CEO ${D.state.kpiPolicy.ceoWeight}%。確認目標後固定。</p>`:'<p>尚未設定合成比重。兩層分數會分開保留，不擅自預設 50／50。</p>'}${combined!==null?`<div class="metric"><strong>${combined.toFixed(2)} <span class="mini">／100 · 合成總分</span></strong></div>`:''}<p class="mini">比重只用於本示例。正式考核週期、等第與薪酬影響仍需確認；完成評核不自動調薪。</p></section><details class="card"><summary>查看處理紀錄</summary><div class="timeline">${p.history.map(h=>`<article><strong>${E(h.text)}</strong><p class="mini">${E(h.at)} · ${E(h.actor)}</p></article>`).join('')}</div></details>`;
  }
  function read(el){const p=find(el.dataset.id);if(!p||!visible(p))throw Error('無法查看這份考核。');return p;}
  function check(p,status,allowed){if(p.status!==status||!allowed)throw Error('請使用目前步驟的負責身分操作。');}
  D.register('performance',{title:'考核管理',group:'行政人事',roles:['employee','manager','ceo','chairman','admin'],seed,render});
  D.on('kpi-edit',el=>{const p=read(el);check(p,'draft',manager());D.modal('設定考核目標',`<p>先講清楚要完成什麼，再確認每項比重。合計須為 100%。</p>${p.goals.map((g,i)=>`<fieldset><legend>${E(g.category)}</legend><label class="field">目標名稱<input name="title${i}" value="${E(g.title)}" maxlength="100" required></label><label class="field">如何判斷完成<textarea name="target${i}" required maxlength="400">${E(g.target)}</textarea></label><label class="field">目標比重（%）<input name="weight${i}" type="number" value="${g.weight}" min="1" max="100" step="1" required></label></fieldset>`).join('')}`,v=>{check(p,'draft',manager());const weights=p.goals.map((_,i)=>Number(v['weight'+i]));if(weights.some(w=>!Number.isInteger(w)||w<=0)||weights.reduce((a,b)=>a+b,0)!==100)throw Error('各項比重須為正整數，合計 100%。');D.mutate(()=>{p.goals.forEach((g,i)=>Object.assign(g,{title:v['title'+i],target:v['target'+i],weight:weights[i]}));log(p,'主管更新目標與各項比重。');});},'儲存目標');});
  D.on('kpi-submit',el=>{const p=read(el);check(p,'draft',manager());D.modal('送 CEO 確認目標',`<p>${E(names(p.employeeId))} · ${p.goals.length} 項目標 · 比重合計 ${sumWeight(p)}%</p><p>送出後鎖定目標，CEO 的首頁會出現待確認事項。</p>`,()=>{check(p,'draft',manager());if(sumWeight(p)!==100)throw Error('目標比重必須合計 100%。');D.mutate(()=>{p.status='goals_review';log(p,'主管送出目標，等待 CEO 確認。');});},'送出');});
  D.on('kpi-return',el=>{const p=read(el);check(p,'goals_review',ceo());D.modal('退回目標',`<label class="field">需要補充什麼<textarea name="note" required maxlength="400"></textarea></label>`,v=>{check(p,'goals_review',ceo());D.mutate(()=>{p.status='draft';log(p,'CEO 退回目標：'+v.note);});},'退回主管');});
  D.on('kpi-confirm',el=>{const p=read(el);check(p,'goals_review',ceo());D.modal('確認考核目標',`<p>確認這 ${p.goals.length} 項目標與比重後，主管才能填寫評分。</p><p>${D.state.kpiPolicy.configured?`此示例採主管 ${D.state.kpiPolicy.managerWeight}% ＋ CEO ${D.state.kpiPolicy.ceoWeight}%。`:'未設定合成比重，這次保留兩層分數，不產生合成總分。'}</p>`,()=>{check(p,'goals_review',ceo());D.mutate(()=>{p.status='active';p.policy=D.state.kpiPolicy.configured?{managerWeight:D.state.kpiPolicy.managerWeight,ceoWeight:D.state.kpiPolicy.ceoWeight}:null;log(p,'CEO 確認目標，交主管按成果評分。');});},'確認目標');});
  D.on('kpi-policy',el=>{const p=read(el);check(p,'draft',ceo());D.modal('設定示例合成比重',`<div class="notice amber">這是展示用的規則選擇，並非已核定的公司制度。</div><div class="form-grid"><label class="field">主管占比（%）<input name="managerWeight" type="number" min="1" max="99" step="1" value="${D.state.kpiPolicy.managerWeight??''}" required></label><label class="field">CEO 占比（%）<input name="ceoWeight" type="number" min="1" max="99" step="1" value="${D.state.kpiPolicy.ceoWeight??''}" required></label></div><p class="mini">兩者合計須為 100%。目標確認後固定，不回改已確認的考核。</p>`,v=>{check(p,'draft',ceo());const a=Number(v.managerWeight),b=Number(v.ceoWeight);if(!Number.isInteger(a)||!Number.isInteger(b)||a<1||b<1||a+b!==100)throw Error('請填正整數，合計 100%。');D.mutate(()=>{D.state.kpiPolicy={configured:true,managerWeight:a,ceoWeight:b};log(p,`設定示例合成規則：主管 ${a}%、CEO ${b}%。`);});},'套用示例比重');});
  function score(el,second){const p=read(el);check(p,second?'second_review':'active',second?ceo():manager());D.modal(second?'CEO 第二層評核':'主管第一層評分',`${p.goals.map((g,i)=>`<fieldset><legend>${E(g.title)} · ${g.weight}%</legend><p>${E(g.target)}</p>${second?`<p class="mini">主管分數：${p.first.scores[i]} / 100</p>`:''}<label class="field">分數（0–100）<input name="score${i}" type="number" min="0" max="100" step="1" required></label></fieldset>`).join('')}<label class="field">實際成果與評語<textarea name="note" required maxlength="600" placeholder="說明實際完成情況與評分依據"></textarea></label>`,v=>{check(p,second?'second_review':'active',second?ceo():manager());const scores=p.goals.map((_,i)=>Number(v['score'+i]));if(scores.some(s=>!Number.isFinite(s)||s<0||s>100))throw Error('每項分數須介於 0 至 100。');D.mutate(()=>{p[second?'second':'first']={scores,note:v.note,actor:D.actor.name,at:D.today};p.status=second?'completed':'second_review';log(p,second?'CEO 完成第二層評核，員工可查看結果。':'主管送出第一層評分，等待 CEO 評核。');});},second?'完成評核':'送 CEO 評核');}
  D.on('kpi-first',el=>score(el,false));D.on('kpi-second',el=>score(el,true));
  D.kpiInbox=role=>plans().filter(visible).filter(p=>(['manager'].includes(role)&&['draft','active'].includes(p.status))||(role==='ceo'&&['goals_review','second_review'].includes(p.status))).filter(p=>p.status!=='completed').map(p=>({id:p.id,company:p.company,title:`${names(p.employeeId)}｜${labels[p.status]}`,detail:next(p),view:'performance',params:{id:p.id},actionLabel:p.status==='draft'?'設定目標':p.status==='active'?'前往評分':p.status==='goals_review'?'確認目標':'前往評核',status:p.status}));
})();
