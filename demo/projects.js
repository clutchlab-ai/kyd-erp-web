/* Isolated meeting demo. Synthetic project records; no file or production API access. */
(function () {
  'use strict';
  const E = value => D.esc(value);
  const person = id => D.state.people.find(p => p.id === id);
  const name = id => person(id)?.name || id;
  const projects = () => D.state.engineeringProjects || [];
  const statusText = {working:'進行中',inspection:'待主管驗收',accepted:'已驗收',returned:'退回改善'};
  const isEngineer = () => person(D.actor.id)?.active !== false && person(D.actor.id)?.profile === 'engineering_assistant';
  const mayRead = p => !!p && p.company === D.state.company && (['ceo','chairman','admin'].includes(D.role)||D.company===D.actor.company) && (
    ['admin','manager','ceo','chairman'].includes(D.role) ||
    (D.role === 'employee' && isEngineer() && p.work.some(w => w.assigneeId === D.actor.id))
  );
  const mayManage = p => mayRead(p) && ['manager','admin'].includes(D.role);
  const mayUpdate = (p,w) => !!w && mayRead(p) && (mayManage(p) || (D.role === 'employee' && w.assigneeId === D.actor.id));
  const mayInspect = (p,w) => !!w && w.status === 'inspection' && mayManage(p) && w.assigneeId !== D.actor.id && !!w.reports.at(-1)?.actorId && w.reports.at(-1).actorId !== D.actor.id;
  const find = id => projects().find(p => p.id === id);
  const event = (p,text) => { p.history.unshift({at:D.today,actor:D.actor.name,text}); D.log(text); };
  const button = (label,action,id,extra='',primary=false) => `<button type="button" class="btn${primary?' primary':''}" data-action="${action}" data-id="${E(id)}" ${extra}>${E(label)}</button>`;
  const tone = w => w.status === 'accepted' ? 'green' : w.status === 'inspection' ? 'blue' : D.daysUntil(w.due) < 0 ? 'red' : 'amber';
  const status = w => D.badge(statusText[w.status],tone(w));
  const due = w => w.status === 'accepted' ? '已完成驗收' : D.daysUntil(w.due) < 0 ? `逾期 ${Math.abs(D.daysUntil(w.due))} 天` : D.daysUntil(w.due) === 0 ? '今天到期' : `${D.daysUntil(w.due)} 天後到期`;

  function seed(s) {
    if (s.engineeringProjects) return;
    s.engineeringProjects = [{id:'ENG-001',company:'KYD',name:'示例工程｜共享辦公區改善',site:'示例大樓 12 樓',managerId:'m01',start:'2026-10-20',end:'2026-11-18',
      work:[
        {id:'EW-01',title:'機電圖面核對與現場複測',assigneeId:'e01',due:'2026-11-03',progress:60,status:'working',note:'尚有兩處插座位置需與設計圖核對。',checkpoints:[{label:'核對設計圖最新版本',done:true},{label:'完成現場尺寸複測',done:true},{label:'確認插座與管線位置',done:false}],reports:[],inspections:[]},
        {id:'EW-02',title:'隔間工程完成與驗收',assigneeId:'e01',due:'2026-11-05',progress:100,status:'inspection',note:'隔間與門框完成，等待主管查驗尺寸及收邊。',checkpoints:[{label:'隔間尺寸確認',done:true},{label:'門框固定完成',done:true},{label:'收邊完成',done:true}],reports:[{at:'2026-11-03',actorId:'e01',actor:person('e01')?.name||'員工示例',note:'已完成施工，提出驗收。'}],inspections:[]},
        {id:'EW-03',title:'照明設備安裝',assigneeId:'m01',due:'2026-11-10',progress:20,status:'working',note:'燈具已確認型號，等候進場。',checkpoints:[{label:'確認燈具型號',done:true},{label:'完成安裝',done:false},{label:'通電測試',done:false}],reports:[],inspections:[]},
        {id:'EW-04',title:'既有設備盤點',assigneeId:'e01',due:'2026-10-30',progress:100,status:'accepted',note:'盤點完成，保留原始紀錄。',checkpoints:[{label:'盤點清單核對',done:true}],reports:[{at:'2026-10-29',actorId:'e01',actor:person('e01')?.name||'員工示例',note:'完成清點。'}],inspections:[{at:'2026-10-30',actorId:'m01',actor:person('m01')?.name||'工程主管示例',result:'accepted',note:'與現場設備一致，通過驗收。'}]}
      ],
      documents:[
        {id:'EF-01',category:'基地原圖',name:'12 樓原始平面圖',versions:[{version:'V1',date:'2026-10-20',author:'示例工程團隊',change:'建立原始圖面，作為現況比對依據。',content:'現況：辦公區、會議區、走道與既有機電點位。'}]},
        {id:'EF-02',category:'設計圖',name:'辦公區配置與機電點位圖',versions:[{version:'V2',date:'2026-11-02',author:'示例設計團隊',change:'依現場複測調整東側插座位置；取代 V1。',content:'本版重點：東側插座移動 30 公分；會議區座位配置不變。'},{version:'V1',date:'2026-10-25',author:'示例設計團隊',change:'第一版設計配置。',content:'初版配置：東側插座依原尺寸預留，尚未完成現場複測。'}]},
        {id:'EF-03',category:'結構圖',name:'隔間固定與結構檢核圖',versions:[{version:'V1',date:'2026-10-26',author:'示例結構團隊',change:'新增隔間固定方式與結構檢核標記。',content:'本版重點：隔間固定節點、禁止鑽孔區域與查驗位置。'}]}
      ],
      budget:{version:'V2',date:'2026-11-01',author:'示例預算顧問',total:72000,rows:[['隔間與收邊',20000],['機電與照明',28000],['材料與設備',16000],['其他已編列費用',8000]]},
      history:[{at:'2026-11-03',actor:'示例工程主管',text:'隔間工程已回報完成，等待驗收。'},{at:'2026-11-02',actor:'示例設計團隊',text:'設計圖更新為 V2，V1 留存供追溯。'}]
    }];
  }

  function workCard(p,w) {
    const own = w.assigneeId === D.actor.id;
    return `<article class="card stack"><div class="row"><h3>${E(w.title)}</h3>${status(w)}</div><p class="muted">${E(name(w.assigneeId))}${own?' · 我的工作':''} · 預定 ${E(w.due)} · ${E(due(w))}</p><progress class="progress" value="${w.progress}" max="100" aria-label="工作進度">${w.progress}%</progress><p><strong>${w.progress}%</strong> · ${E(w.note)}</p><div class="stack">${w.checkpoints.map(c=>`<div>${c.done?'✓':'○'} ${E(c.label)}</div>`).join('')}</div><div class="action-row">${mayUpdate(p,w)&&w.status!=='accepted'?button(w.status==='inspection'?'查看回報':'更新進度','project-work',p.id,`data-work="${w.id}"`,true):button('查看紀錄','project-work',p.id,`data-work="${w.id}"`)}${mayInspect(p,w)?button('驗收／退回','project-inspect',p.id,`data-work="${w.id}"`,true):''}</div>${mayManage(p)&&w.status!=='accepted'&&(w.assigneeId===D.actor.id||w.reports.at(-1)?.actorId===D.actor.id)?'<p class="notice amber">這項工作由你承辦或回報，需另一位主管驗收。</p>':''}${w.inspections.length?`<p class="mini">最近驗收：${E(w.inspections.at(-1).actor)} · ${E(w.inspections.at(-1).at)} · ${E(w.inspections.at(-1).note)}</p>`:''}</article>`;
  }
  function render(params={}) {
    const rows = projects().filter(mayRead);
    if (!rows.length) return `<header class="page-head"><div><p class="eyebrow">工程與採購</p><h1>工程與專案</h1><p class="lede">工作進度、最新文件與驗收紀錄，集中在同一個專案。</p></div></header>${D.empty('目前沒有可查看的工程',D.role==='employee'&&!isEngineer()?'此員工目前是行政職務。先完成「人事異動」示例，改為工程助理後，才可查看指派給他的工程。':'目前公司或身分沒有指派的工程；可切換工程主管查看示例。')}`;
    const p=rows.find(x=>x.id===params.id)||rows[0], tab=params.tab||'work', progress=(p.work.length?Math.round(p.work.reduce((sum,w)=>sum+w.progress,0)/p.work.length):0);
    const tabs=[['work','工作進度'],['files','相關文件'],['budget','預算與費用'],['history','變更紀錄']];
    let html=`<header class="page-head"><div><p class="eyebrow">工程與採購 / 工程與專案</p><h1>${E(p.name)}</h1><p class="lede">${E(p.company)} · ${E(p.site)} · 工程主管 ${E(name(p.managerId))}</p></div></header><section class="grid three"><div class="card stat"><span class="muted">工作進度</span><strong>${progress}%</strong><span class="mini">依各項工作回報概況</span></div><div class="card stat"><span class="muted">需跟進</span><strong>${p.work.filter(w=>w.status!=='accepted'&&D.daysUntil(w.due)<0).length} 項逾期</strong><span class="mini">到期提醒顯示在工作首頁</span></div><div class="card stat"><span class="muted">等待驗收</span><strong>${p.work.filter(w=>w.status==='inspection').length} 項</strong><span class="mini">通過後保留回報與驗收紀錄</span></div></section><nav class="subnav">${tabs.map(([id,label])=>`<button class="btn${tab===id?' primary':''}" data-action="project-tab" data-id="${p.id}" data-tab="${id}">${label}</button>`).join('')}</nav>`;
    if(tab==='files') html+=`<section class="card"><h2>大家查看同一個最新版本</h2><p class="muted">按圖面分類；新版取代舊版的顯示位置，舊版與修改說明仍保留。以下為文字示例，並非實際圖檔。</p></section><div class="grid three">${p.documents.map(d=>`<article class="card stack"><span class="eyebrow">${E(d.category)}</span><h3>${E(d.name)}</h3>${D.badge('最新版 '+d.versions[0].version,'blue')}<p>${E(d.versions[0].change)}</p><p class="mini">${E(d.versions[0].date)} · ${E(d.versions[0].author)}</p><div class="action-row">${button('查看最新版','project-file',p.id,`data-file="${d.id}" data-version="0"`,true)}${button('版本紀錄','project-versions',p.id,`data-file="${d.id}"`)}${mayManage(p)?button('登記新版示例','project-new-version',p.id,`data-file="${d.id}"`):''}</div></article>`).join('')}</div>`;
    else if(tab==='budget'&&p.budget.provided===false)html+=`<section class="card"><h2>工程預算</h2><p>尚未提供預算表；目前沒有已確認金額。</p></section>`;
    else if(tab==='budget') html+=`<section class="card stack"><h2>查看既有預算表</h2><p>預算由原編製人員提供。這裡集中查看最新版與來源，不重新建立工程估價算法。</p><div class="row"><div><p class="eyebrow">${E(p.budget.author)} · ${E(p.budget.date)} · ${E(p.budget.version)}</p><div class="metric"><strong>${D.money(p.budget.total)}</strong></div><p class="mini">整份表內的預算總額示例，非已付款金額。</p></div>${button('打開預算表','project-budget',p.id,'',true)}</div></section>`;
    else if(tab==='history') html+=`<section class="card"><h2>誰在什麼時候改了什麼</h2><div class="timeline">${p.history.map(h=>`<article><strong>${E(h.text)}</strong><p class="mini">${E(h.at)} · ${E(h.actor)}</p></article>`).join('')}</div></section>`;
    else html+=`${params.work?`<p><a href="#view=engineering&id=${E(p.id)}&tab=work">← 返回全部工作</a></p>`:''}<div class="grid two">${p.work.filter(w=>!params.work||w.id===params.work).map(w=>workCard(p,w)).join('')||D.empty(params.work?'這項工作不存在':'尚未建立工作','由工程主管新增工作並指派承辦人。')}</div>`;
    return html;
  }
  function lookup(el) { const p=find(el.dataset.id);if(!p||!mayRead(p))throw Error('目前身分無法查看此工程。');return p; }
  function workModal(el) {
    const p=lookup(el),w=p.work.find(x=>x.id===el.dataset.work);if(!w)throw Error('找不到工作項目。');
    const editable=mayUpdate(p,w)&&!['inspection','accepted'].includes(w.status);
    const history=[...w.reports.map(r=>({...r,label:'工作回報'})),...w.inspections.map(r=>({...r,label:r.result==='accepted'?'驗收通過':'退回改善'}))];
    const record=`<h3>回報與驗收紀錄</h3>${history.length?history.map(r=>`<p><strong>${E(r.label)}</strong> · ${E(r.at)} · ${E(r.actor)}<br>${E(r.note)}</p>`).join(''):'<p class="muted">尚無完成回報。</p>'}`;
    const body=`<p>${status(w)} · ${E(name(w.assigneeId))} · 預定 ${E(w.due)}</p>${editable?`<div class="form-grid"><label class="field">完成進度（%）<input name="progress" type="number" min="0" max="100" value="${w.progress}" required></label>${mayManage(p)?`<label class="field">預定完成日<input name="due" type="date" value="${w.due}" required></label>`:''}</div><h3>檢核點</h3>${w.checkpoints.map((c,i)=>`<label class="row"><input name="check${i}" type="checkbox" ${c.done?'checked':''}>${E(c.label)}</label>`).join('')}<label class="field">進度說明<textarea name="note" required maxlength="500">${E(w.note)}</textarea></label><label class="field">這次操作<select name="mode"><option value="save">只更新進度</option value="submit">回報完成，交主管驗收</option></select></label><p class="mini">完成回報需達 100% 並完成全部檢核點。承辦人或回報人不能自行驗收；需另一位主管驗收。</p>`:`<p>${E(w.note)}</p>`}${record}`;
    D.modal(w.title,body,editable?(v,form)=>{
      if(!mayUpdate(p,w)||['inspection','accepted'].includes(w.status))throw Error('這項工作目前不能修改。');
      if(!String(v.note||'').trim())throw Error('請填寫進度說明。');
      if(mayManage(p)&&(!/^\d{4}-\d{2}-\d{2}$/.test(v.due||'')||Number.isNaN(Date.parse(v.due+'T00:00:00Z'))||new Date(v.due+'T00:00:00Z').toISOString().slice(0,10)!==v.due))throw Error('請填寫有效的完成日期。');
      if(!['save','submit'].includes(v.mode))throw Error('請選擇更新進度或提交驗收。');
      const progress=Number(v.progress);if(!Number.isFinite(progress)||progress<0||progress>100)throw Error('請填 0 至 100 的進度。');
      const checked=w.checkpoints.map((_,i)=>form.elements['check'+i].checked);
      if(v.mode==='submit'&&(progress!==100||checked.some(x=>!x)))throw Error('先完成全部檢核點，並將進度更新為 100%。');
      D.mutate(()=>{w.progress=progress;w.note=String(v.note).trim();if(mayManage(p))w.due=v.due;w.checkpoints.forEach((c,i)=>c.done=checked[i]);if(v.mode==='submit'){w.status='inspection';w.reports.push({at:D.today,actorId:D.actor.id,actor:D.actor.name,note:w.note});}else if(w.status==='returned')w.status='working';event(p,`${w.title}：${v.mode==='submit'?'完成回報，交工程主管驗收':'進度更新為 '+progress+'%'}`);});
    }:null, '儲存進度');
  }
  D.register('engineering',{title:'工程與專案',group:'採購與工程',canView:role=>['manager','ceo','chairman','admin'].includes(role)||(role==='employee'&&isEngineer()),roles:['employee','manager','ceo','chairman','admin'],seed,render});
  D.on('project-tab',el=>D.go('engineering',{id:el.dataset.id,tab:el.dataset.tab}));
  D.on('project-work',workModal);
  D.on('project-inspect',el=>{
    const p=lookup(el),w=p.work.find(x=>x.id===el.dataset.work);if(!mayInspect(p,w))throw Error('只有另一位主管可以驗收；承辦人或回報人不能自行驗收。');
    D.modal('工作驗收',`<h3>${E(w.title)}</h3><p>${E(w.note)}</p><label class="field">驗收結果<select name="result"><option value="accepted">驗收通過</option><option value="returned">退回改善</option></select></label><label class="field">驗收依據／改善事項<textarea name="note" maxlength="500" required></textarea></label><p class="mini">會保存驗收人、結果與說明；原工作與回報不刪除。</p>`,v=>{if(!mayInspect(p,w))throw Error('需另一位主管驗收，或工作狀態已改變。');if(!['accepted','returned'].includes(v.result))throw Error('請選擇驗收通過或退回改善。');if(!v.note?.trim())throw Error('請填寫驗收依據或改善事項。');D.mutate(()=>{w.status=v.result;w.inspections.push({at:D.today,actorId:D.actor.id,actor:D.actor.name,result:v.result,note:v.note});event(p,`${w.title}：${v.result==='accepted'?'驗收通過':'退回改善'}。${v.note}`);});},'確認驗收');
  });
  D.on('project-file',el=>{
    const p=lookup(el),doc=p.documents.find(x=>x.id===el.dataset.file),v=doc?.versions[Number(el.dataset.version||0)];if(!v)throw Error('找不到文件版本。');
    D.modal(`${doc.category}｜${doc.name}`,`<div class="notice blue">示例文件內容，並非實際上傳的圖檔。</div><p>${D.badge(v.version,Number(el.dataset.version||0)===0?'blue':'neutral')} · ${E(v.date)} · ${E(v.author)}</p><h3>本版內容</h3><p>${E(v.content)}</p><h3>修改說明</h3><p>${E(v.change)}</p>`,null);
  });
  D.on('project-versions',el=>{
    const p=lookup(el),doc=p.documents.find(x=>x.id===el.dataset.file);if(!doc)throw Error('找不到文件。');
    D.modal(doc.name+'｜版本紀錄',`<p class="muted">最新版優先顯示；舊版保留供比較。</p><div class="timeline">${doc.versions.map((v,i)=>`<article><strong>${E(v.version)}${i===0?' · 最新版':''}</strong><p>${E(v.change)}</p><p class="mini">${E(v.date)} · ${E(v.author)}</p>${button('查看這一版','project-file',p.id,`data-file="${doc.id}" data-version="${i}"`)}</article>`).join('')}</div>`,null);
  });
  D.on('project-new-version',el=>{
    const p=lookup(el),doc=p.documents.find(x=>x.id===el.dataset.file);if(!mayManage(p)||!doc)throw Error('只有工程主管可以登記新版。');
    D.modal('登記新版示例',`<p>${E(doc.name)} · 目前 ${E(doc.versions[0].version)}</p><label class="field">版本名稱<input name="version" value="V${doc.versions.length+1}" maxlength="24" required></label><label class="field">修改摘要<textarea name="change" maxlength="300" required></textarea></label><label class="field">示例內容<textarea name="content" maxlength="600" required></textarea></label><p class="mini">此操作只新增本機示例紀錄，不會上傳任何檔案。</p>`,v=>{if(!mayManage(p))throw Error('身分已改變。');if(doc.versions.some(x=>x.version===v.version.trim()))throw Error('這個版本名稱已經存在。');D.mutate(()=>{doc.versions.unshift({version:v.version.trim(),date:D.today,author:D.actor.name,change:v.change,content:v.content});event(p,`${doc.category}「${doc.name}」新增 ${v.version}：${v.change}`);});},'建立新版示例');
  });
  D.on('project-budget',el=>{
    const p=lookup(el),b=p.budget;D.modal('工程預算表｜'+b.version,`<p class="notice blue">示例既有預算表。僅呈現編製人提供的金額，不執行估價、付款或會計入帳。</p><p>${E(b.author)} · ${E(b.date)}</p><div class="table-wrap"><table><thead><tr><th>預算項目</th><th>USD</th></tr></thead><tbody>${b.rows.map(([title,amount])=>`<tr><td>${E(title)}</td><td>${D.money(amount)}</td></tr>`).join('')}<tr><th>原表列示總額</th><th>${D.money(b.total)}</th></tr></tbody></table></div>`,null);
  });
  D.projectInbox = (role=D.role) => {
    if(!['manager','employee','admin'].includes(role))return [];
    return projects().filter(mayRead).flatMap(p=>p.work.filter(w=>mayInspect(p,w)||['working','returned'].includes(w.status)&&mayUpdate(p,w)&&(w.assigneeId===D.actor.id||w.status==='returned'||D.daysUntil(w.due)<=2)).map(w=>({id:w.id,company:p.company,title:w.title,detail:`${statusText[w.status]} · ${due(w)} · ${name(w.assigneeId)}`,view:'engineering',params:{id:p.id,tab:'work',work:w.id},actionLabel:mayInspect(p,w)?'驗收工作':w.status==='returned'?'回報改善':'更新工作',status:w.status})));
  };
  D.projectResults=()=>projects().filter(mayRead).flatMap(p=>p.work.filter(w=>w.status==='accepted'&&w.assigneeId===D.actor.id).map(w=>({id:w.id,company:p.company,title:w.title,detail:'工作已通過驗收，回報與驗收紀錄已保留。',view:'engineering',params:{id:p.id,tab:'work',work:w.id},status:w.status,actionLabel:'查看驗收結果'})));

})();
