/* Offline, synthetic exhibition preview. No model or remote service is called. */
(()=>{'use strict';
 const D=window.D,E=D.esc.bind(D),roles=['chairman','ceo','admin'];
 const marker='預覽 · 演示資料';
 const n=v=>Number.isFinite(Number(v))?Number(v):0;
 const fmt=v=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(n(v));
 const usd=v=>D.money(n(v));
 const allowed=()=>roles.includes(D.role)&&D.company==='SFM';
 const route=(view,params={})=>'#'+new URLSearchParams({view,...params}).toString();
 const link=(label,view,params={})=>`<a class="btn ai-preview-source" href="${E(route(view,params))}">${E(label)} <span aria-hidden="true">↗</span></a>`;
 function seed(s){
  if(!s.aiPreview||s.aiPreview.version!==1)s.aiPreview={version:1,company:'SFM',question:'orders',tasks:[]};
  if(!Array.isArray(s.aiPreview.tasks))s.aiPreview.tasks=[];
  // Separate quotation evidence: this is not an invoice, an approved purchase or a payment.
  s.aiPreview.priceChecks??=[{id:'PRICE-SFM-001',company:'SFM',number:'核價示範單 Q-1127-01',item:'包裝緩衝內襯',unit:'箱',quantity:80,currency:'USD',baselineUnitPriceUsd:12,currentUnitPriceUsd:15,baselineDate:'2026-11-20',currentDate:'2026-11-27',supplier:'青禾包材（虛構）',specification:'同規格緩衝內襯，每箱 100 片',sourceRoute:'ai-insights',sourceId:'PRICE-SFM-001'}];
 }
 function summary(){
  const s=D.factoryPreview?.summary?.();
  return s?.company==='SFM'?{...s,priceChecks:data().priceChecks.filter(p=>p.company==='SFM')}:null;
 }
 function data(){seed(D.state);return D.state.aiPreview;}
 function priceCheck(s){
  return (s.priceChecks||[]).filter(p=>n(p.quantity)>0&&n(p.baselineUnitPriceUsd)>0&&n(p.currentUnitPriceUsd)>n(p.baselineUnitPriceUsd))
   .sort((a,b)=>(n(b.currentUnitPriceUsd)-n(b.baselineUnitPriceUsd))*n(b.quantity)-(n(a.currentUnitPriceUsd)-n(a.baselineUnitPriceUsd))*n(a.quantity))[0]||null;
 }
 function priceAmounts(p){
  if(!p)return {baseline:0,current:0,extra:0,percent:0};
  const baseline=Math.round(n(p.baselineUnitPriceUsd)*100),current=Math.round(n(p.currentUnitPriceUsd)*100);
  return {baseline:baseline/100,current:current/100,extra:Math.round((current-baseline)*n(p.quantity))/100,percent:baseline?(current-baseline)/baseline*100:0};
 }
 function insights(s){
  const delays=s.delayOrders||[],order=delays[0],p=priceCheck(s),price=priceAmounts(p),extra=n(s.overtimeHours)-n(s.overtimeBaselineHours);
  return [
   {id:'orders',tag:'交期',title:'訂單延誤風險',active:delays.length>0,
    metric:delays.length,unit:'筆需關注',
    evidence:order?`${order.number||order.id} · 交期 ${order.dueDate} · 預計 ${order.etaDate} · 尚欠良品 ${fmt(order.remainingGood)} 件`:'目前訂單沒有預計逾期；報工與庫存變動後會重新比對。',
    reason:order?.reason||'以訂單交期與目前預計完成日比對。',
    recommendation:order?'請工廠主管核對延誤原因與生產安排，確認處理日期，再回覆可交貨時間。':'維持每日報工，核對物料餘量與下個交貨日。',
    taskTitle:order?'核對交期與生產安排安排':'核對下一批交貨安排',owner:'工廠主管',source:{view:'factory-orders',params:order?{id:order.id}:{}}},
   {id:'payment',tag:'付款',title:'付款單價異常',active:!!p,
    metric:p?`+${fmt(price.percent)}%`:'—',unit:p?'高於比較單價':'沒有待核對價差',
    evidence:p?`${p.number||p.id} · ${p.item} · ${fmt(p.quantity)} ${p.unit||'件'} · 比較單價 ${usd(price.baseline)} → 本次 ${usd(price.current)}`:'目前沒有單價高於比較基準的示範單據。',
    reason:p?`相同數量下，差額為 ${usd(price.extra)}；這是核價提醒，不代表錯帳或已付款。`:'需具備相同品項、單位與幣別，才進行單價比較。',
    recommendation:p?'請財務核對規格、數量與報價版本，取得說明後再決定是否付款。':'付款前依單據核對品項、單價與收款對象。',
    taskTitle:'核對本次付款單價',owner:'財務專員',source:p?{view:p.sourceRoute||'factory',params:p.sourceId?{id:p.sourceId}:{}}:{view:'factory',params:{}}},
   {id:'overtime',tag:'人力',title:'加班時數異常',active:extra>0,
    metric:`${extra>0?'+':''}${fmt(extra)}`,unit:'小時／較本週排定',
    evidence:`本週已記錄 ${fmt(s.overtimeHours)} 小時 · 本週排定 ${fmt(s.overtimeBaselineHours)} 小時`,
    reason:extra>0?'加班增加是待核對訊號，需一起查看產量、缺勤與排班。':'本週加班未高於本週排定；不據此判定人力是否充足。',
    recommendation:'請工廠主管核對各班組工作量，確認是否需要調班或處理重工。',
    taskTitle:'核對班組加班與工作量',owner:'工廠主管',source:{view:'factory',params:{section:'overtime'}}}
  ];
 }
 function getTask(id){return data().tasks.find(t=>t.company==='SFM'&&t.date===D.today&&t.insightId===id);}
 function createTask(id){
  if(!allowed())throw Error('請使用暹光製造示範廠的管理角色。');
  const s=summary();if(!s)throw Error('請先載入工廠示範資料。');
  const insight=insights(s).find(i=>i.id===id);if(!insight)throw Error('找不到這項洞察。');
  const existing=getTask(id);if(existing)return existing;
  // An immutable evidence snapshot is retained; closing a task never changes source records.
  const task={id:`AI-${D.today.replaceAll('-','')}-${id.toUpperCase()}`,company:'SFM',date:D.today,insightId:id,
   title:insight.taskTitle,ownerRole:insight.owner,status:'open',evidence:insight.evidence,
   recommendation:insight.recommendation,source:insight.source,createdBy:D.actor.id,result:''};
  data().tasks.push(task);D.save();return task;
 }
 function closeTask(id,result){
  if(!allowed())throw Error('目前角色無法記錄跟進結果。');
  const t=data().tasks.find(t=>t.id===id&&t.company==='SFM');
  if(!t||t.status!=='open')throw Error('這項待辦已完成或不存在。');
  if(!String(result||'').trim())throw Error('請填寫跟進結果。');
  t.status='done';t.result=String(result).trim().slice(0,1200);t.completedBy=D.actor.id;t.completedOn=D.today;D.save();return t;
 }
 function bars(title,rows,unit=''){
  const max=Math.max(1,...rows.map(r=>n(r.value)));
  return `<figure class="ai-preview-chart"><figcaption>${E(title)}</figcaption><div class="ai-preview-bars">${rows.map(r=>`<div class="ai-preview-bar-row"><div class="ai-preview-bar-label"><span>${E(r.label)}</span><strong>${E(r.display||fmt(r.value))}${unit?` <small>${E(unit)}</small>`:''}</strong></div><div class="ai-preview-bar-track" aria-hidden="true"><span class="${r.tone==='muted'?'is-comparison':''}" style="width:${Math.max(0,Math.min(100,n(r.value)/max*100))}%"></span></div></div>`).join('')}</div></figure>`;
 }
 function question(s,id){
  const delays=s.delayOrders||[],p=priceCheck(s),a=priceAmounts(p),teams=s.overtimeByTeam||[];
  if(id==='payment')return `<h3>先核對價差，再決定付款</h3><p>${p?`${E(p.number||p.id)} 的 ${E(p.item)}，本次單價 ${E(usd(a.current))}，比較單價 ${E(usd(a.baseline))}。${E(fmt(p.quantity))} ${E(p.unit||'件')}的差額為 <strong>${E(usd(a.extra))}</strong>。`:'目前沒有高於比較基準的單據。'}</p><p class="ai-preview-answer-note">規格或報價有變更，也可能造成價差；先查證，不自動拒付。</p>${p?bars('相同品項的單價比較',[{label:'比較單價',value:a.baseline,display:usd(a.baseline),tone:'muted'},{label:'本次單價',value:a.current,display:usd(a.current)}]):D.empty('尚無可比較單價')}`;
  if(id==='overtime')return `<h3>把增加的工時，對回班組</h3><p>本週已記錄 <strong>${E(fmt(s.overtimeHours))} 小時</strong>，本週排定 ${E(fmt(s.overtimeBaselineHours))} 小時，差額 ${E(fmt(n(s.overtimeHours)-n(s.overtimeBaselineHours)))} 小時。先核對增加的班組，再看產量與排班。</p><p class="ai-preview-answer-note">依本週排定加班時數比較；不代表加班違規，也不自動影響薪資。</p>${bars('各班組加班時數',teams.flatMap(t=>[{label:`${t.team} · 本週排定`,value:t.baselineHours,tone:'muted'},{label:`${t.team} · 已記錄`,value:t.hours}]),'小時')}`;
  return `<h3>先處理可能影響交貨的訂單</h3><p>${delays.length?`目前有 <strong>${delays.length} 筆</strong>預計晚於交期。先核對 ${E(delays.map(o=>o.number||o.id).join('、'))} 的物料與生產安排。`:'目前沒有預計晚於交期的訂單。繼續記錄報工，系統會依最新數據更新提醒。'}</p><p class="ai-preview-answer-note">良品完成量與交期分開看；有進度，不代表一定準時交貨。</p>${bars('各訂單良品完成率',(s.orders||[]).map(o=>({label:o.number||o.id,value:o.progressPercent,display:`${fmt(o.progressPercent)}%`})))}<p class="ai-preview-chart-foot">完成率＝良品完成量 ÷ 訂單數量。</p>`;
 }
 function daily(s){
  const yesterday=s.daily?.yesterday,today=s.daily?.today,items=insights(s),active=items.filter(i=>i.active).length;
  const narrative=`${yesterday&&n(yesterday.reportsCount)>0?`昨天已登記 ${fmt(yesterday.goodOutput)} 件良品、${fmt(yesterday.defects)} 件不良品`:'昨天尚未登記報工'}；${today&&n(today.reportsCount)>0?`今天已回報 ${fmt(today.goodOutput)} 件良品`:'今天尚未登記報工'}。${items[0].active?`目前有 ${items[0].metric} 筆訂單預計延誤，建議先由工廠主管確認處理進度與交期` : items[1].active?'今天先請財務核對報價差額，再確認各班組的加班安排':'今天先核對排班與工作量，再持續更新報工'}。`;
  return `<section class="ai-preview-brief"><div class="ai-preview-brief-heading"><span class="ai-preview-kicker">今日經營簡報</span><h2>今日經營簡報</h2><span class="ai-preview-date">${E(s.asOf||D.today)}</span></div><p class="ai-preview-narrative">${E(narrative)}</p><div class="ai-preview-brief-grid"><div><span class="ai-preview-subheading">昨天做了什麼</span><strong>${yesterday?`${E(fmt(yesterday.goodOutput))} <small>件良品</small>`:'—'}</strong><p>${yesterday?`${E(yesterday.date)} · ${E(fmt(yesterday.reportsCount))} 筆報工 · 不良 ${E(fmt(yesterday.defects))} 件`:'尚無昨日報工紀錄，不推算昨日產量。'}</p></div><div><span class="ai-preview-subheading">今天進到哪裡</span><strong>${today?`${E(fmt(today.goodOutput))} <small>件良品</small>`:'—'}</strong><p>${today?`${E(today.date)} · ${E(fmt(today.reportsCount))} 筆報工 · 不良 ${E(fmt(today.defects))} 件`:'尚無當日報工明細。'}</p></div><div><span class="ai-preview-subheading">今天先看什麼</span><strong>${active} <small>項需核對</small></strong><p>交期、付款單價、加班；每項都能回到資料來源。</p></div></div></section>`;
 }
 function card(i){
  const t=getTask(i.id);
  return `<article class="ai-preview-insight ${i.active?'has-alert':''}" data-ai-insight="${E(i.id)}"><div class="ai-preview-card-top"><span class="ai-preview-tag">${E(i.tag)}</span><span class="ai-preview-signal ${i.active?'':'is-normal'}">${i.active?'待核對':'持續關注'}</span></div><h2 data-i18n-ui>${E(i.title)}</h2><div class="ai-preview-metric">${E(i.metric)}<small>${E(i.unit)}</small></div><div class="ai-preview-evidence"><span>資料依據</span><p data-i18n-ui>${E(i.evidence)}</p><p class="ai-preview-explanation">${E(i.reason)}</p></div><div class="ai-preview-recommendation"><span>建議下一步</span><p data-i18n-ui>${E(i.recommendation)}</p></div><div class="ai-preview-card-actions">${link('核對來源',i.source.view,i.source.params)}<button class="btn primary" data-action="ai-preview-create-task" data-id="${E(i.id)}" ${t?'disabled':''}>${t?(t.status==='done'?'已完成跟進':'已建立待辦'):'建立跟進待辦'}</button></div>${t?`<p class="ai-preview-task-status" role="status">${E(t.id)} · ${t.status==='done'?'已記錄結果':'待處理'} · <a href="#view=ai-insights&focus=tasks">查看跟進清單 ↓</a></p>`:''}</article>`;
 }
 function taskPanel(){
  const tasks=data().tasks.filter(t=>t.company==='SFM');
  return `<section class="ai-preview-tasks" id="ai-preview-tasks"><div class="ai-preview-section-heading"><div><span class="ai-preview-kicker">跟進清單</span><h2>跟進清單</h2></div><span class="ai-preview-count">${tasks.filter(t=>t.status==='open').length} 項待處理</span></div><p class="ai-preview-section-note">此頁建立的示範待辦保留在本瀏覽器，未通知其他人；完成跟進不會改寫訂單或付款。</p>${tasks.length?tasks.map(t=>`<article class="ai-preview-task"><div><span class="ai-preview-task-id">${E(t.id)}</span><h3 data-i18n-ui>${E(t.title)}</h3><p>建議交由：${E(t.ownerRole)} · ${E(t.date)}</p><p class="ai-preview-task-evidence" data-i18n-ui>${E(t.evidence)}</p>${t.result?`<p class="ai-preview-task-result"><strong>跟進結果</strong> ${E(t.result)}</p>`:''}</div><div class="ai-preview-task-actions"><span class="ai-preview-signal ${t.status==='done'?'is-normal':''}">${t.status==='done'?'已完成跟進':'待處理'}</span>${link('核對來源',t.source.view,t.source.params)}${t.status==='open'?`<button class="btn" data-action="ai-preview-close-task" data-id="${E(t.id)}">記錄跟進結果</button>`:''}</div></article>`).join(''):D.empty('還沒有跟進待辦','從上方洞察選一項，建立後可在這裡接續處理。')}</section>`;
 }
 function priceSource(p){
  const a=priceAmounts(p);
  return `<div class="ai-preview"><header class="ai-preview-header"><div><span class="ai-preview-marker">${marker}</span><h1>付款核價資料</h1><p>${E(p.number)} · ${E(p.supplier)}</p></div>${link('返回 AI 洞察','ai-insights')}</header><section class="ai-preview-questions"><h2>${E(p.item)}</h2><p>${E(p.specification)}</p><p class="ai-preview-section-note">獨立虛構報價案例，用來示範付款前的核價；沒有建立真實採購、應付帳款或付款。</p><div class="ai-preview-brief-grid"><div><span class="ai-preview-subheading">比較報價</span><strong>${E(usd(a.baseline))}<small>／${E(p.unit)}</small></strong><p>${E(p.baselineDate)}</p></div><div><span class="ai-preview-subheading">本次報價</span><strong>${E(usd(a.current))}<small>／${E(p.unit)}</small></strong><p>${E(p.currentDate)}</p></div><div><span class="ai-preview-subheading">本次數量</span><strong>${E(fmt(p.quantity))}<small> ${E(p.unit)}</small></strong><p>${E(p.currency)} · 相同規格與包裝單位</p></div></div>${bars('單價對照',[{label:'比較報價',value:a.baseline,display:usd(a.baseline),tone:'muted'},{label:'本次報價',value:a.current,display:usd(a.current)}])}<div class="ai-preview-evidence"><p>本次總額：${E(usd(a.current*n(p.quantity)))}；按比較單價計算：${E(usd(a.baseline*n(p.quantity)))}。</p><p><strong>差額 ${E(usd(a.extra))} · 單價增加 ${E(fmt(a.percent))}%</strong></p><p class="ai-preview-explanation">差額＝（本次單價 − 比較單價）× 數量。比較結果是待查證訊號，不代表報價有誤。</p></div></section></div>`;
 }
 function render(r={}){
  if(!allowed())return D.empty('此預覽使用暹光製造示範廠資料','請切回暹光製造示範廠，使用董事長、CEO 或管理員角色。');
  const s=summary();if(!s)return D.empty('工廠示範資料尚未載入','請先開啟工廠總覽，再查看 AI 洞察。');
  const price=s.priceChecks.find(p=>p.id===r.id);if(price)return priceSource(price);
  const selected=['orders','payment','overtime'].includes(data().question)?data().question:'orders';
  return `<div class="ai-preview"><header class="ai-preview-header"><div><span class="ai-preview-marker">${marker}</span><h1>AI 洞察</h1><p>先看需要注意的事，再把下一步交辦清楚。</p></div>${link('返回工廠總覽','factory')}</header><p class="ai-preview-disclosure">依示範資料呈現預設分析，未啟用即時 AI 判讀。</p>${daily(s)}<div class="ai-preview-insights">${insights(s).map(card).join('')}</div><section class="ai-preview-questions"><div class="ai-preview-section-heading"><div><span class="ai-preview-kicker">詢問經營問題</span><h2>選一個問題，看重點與數字</h2></div><span class="ai-preview-subtle">預設問答</span></div><div class="ai-preview-question-buttons" role="group" aria-label="預設經營問題">${[['orders','哪些訂單可能趕不上？'],['payment','付款前先核對哪一筆？'],['overtime','加班增加在哪個班組？']].map(([id,label])=>`<button class="ai-preview-question ${id===selected?'is-selected':''}" aria-pressed="${id===selected}" data-action="ai-preview-question" data-id="${id}">${E(label)}</button>`).join('')}</div><div class="ai-preview-answer" aria-live="polite" data-ai-answer="${selected}">${question(s,selected)}</div></section>${taskPanel()}</div>`;
 }
 function teaser(){
  const s=summary();if(!s)return '';
  const count=insights(s).filter(i=>i.active).length;
  return `<section class="ai-preview-home"><div><span class="ai-preview-marker">${marker}</span><h2>今天，先看這 ${count} 項</h2><p>交期、付款單價、加班。看資料依據，一步建立跟進待辦。</p></div><a class="btn primary" href="#view=ai-insights">開啟 AI 洞察 <span aria-hidden="true">→</span></a></section>`;
 }
 D.register('ai-insights',{title:'AI 洞察',group:'總覽',roles,seed,render,afterRender(r){if(r.focus==='tasks')document.querySelector('#ai-preview-tasks')?.scrollIntoView?.({block:'start'});}});
 const oldHome=D.modules.home?.render;
 if(oldHome)D.modules.home.render=function(r={}){const html=oldHome.call(this,r);return allowed()&&r.dashboard!=='work'?teaser()+html:html;};
 D.on('ai-preview-question',el=>{if(!allowed()||!['orders','payment','overtime'].includes(el.dataset.id))return;data().question=el.dataset.id;D.save();D.render();});
 D.on('ai-preview-create-task',el=>{const t=createTask(el.dataset.id);D.render();D.toast(`${t.id} · 已加入本頁跟進清單`);});
 D.on('ai-preview-close-task',el=>{
  if(!allowed())return;const t=data().tasks.find(t=>t.id===el.dataset.id&&t.company==='SFM'&&t.status==='open');if(!t)return;
  D.modal('記錄跟進結果',`<p data-i18n-ui><strong>${E(t.title)}</strong></p><p class="muted" data-i18n-ui>${E(t.evidence)}</p><label class="field">跟進結果<textarea name="result" maxlength="1200" required placeholder="例如：已向工廠主管核對補料日期，待更新交貨安排。"></textarea></label><p class="mini">僅記錄示範待辦結果，不更動來源單據。</p>`,v=>{closeTask(t.id,v.result);D.render();D.toast('已記錄跟進結果。');},'完成跟進');
 });
 D.aiPreview={summary,insights,priceAmounts,createTask,closeTask,render};
})();
