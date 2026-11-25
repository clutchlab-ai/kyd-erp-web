/* Offline exhibition fixtures. No network, payroll, purchasing or accounting posting. */
(()=>{'use strict';
 const D=window.D,E=D.esc.bind(D),COMPANY='SFM',VERSION=2;
 const viewers=['factorymanager','teamlead','ceo','chairman','admin'],writers=['factorymanager','teamlead','admin'];
 D.roles.factorymanager={id:'fm01',name:'周景程',label:'工廠主管',company:COMPANY};
 D.roles.teamlead={id:'tl01',name:'唐允成',label:'班組長',company:COMPANY};
 const round=n=>Math.round((Number(n)+Number.EPSILON)*1000)/1000;
 const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:1}).format(Number(n)||0);
 const sum=(rows,key)=>round(rows.reduce((n,x)=>n+(Number(x[key])||0),0));
 const link=(text,view,params={},primary=false)=>`<a class="btn ${primary?'primary':''}" href="#${new URLSearchParams({view,...params})}">${E(text)}</a>`;
 const preview=()=>'<span class="factory-preview-label">預覽 · 演示資料</span>';
 const canWrite=()=>writers.includes(D.role)&&D.company===COMPANY;
 function seed(state){
  for(const role of ['factorymanager','teamlead']){const p=D.roles[role];if(!state.people.some(x=>x.id===p.id))state.people.push({id:p.id,name:p.name,company:COMPANY,department:'製造部',title:p.label,profile:role,active:true});}
  if([1,VERSION].includes(state.factoryPreview?.version)){const f=state.factoryPreview;if(!Array.isArray(f.dailySnapshots))f.dailySnapshots=[{date:'2026-11-26',goodOutput:480,grossOutput:500,defects:20,reportsCount:2,plannedOutput:500}];if(!Number.isFinite(f.dailyPlan))f.dailyPlan=500;if(f.version===1){const abs=f.materials.find(m=>m.id==='MAT-ABS');if(abs)abs.safetyStock=300;}f.version=VERSION;return;}
  state.factoryPreview={version:VERSION,company:COMPANY,orders:[
   {id:'FO-2701',number:'SO-202611-0271',product:'工業風扇外殼',customer:'晨嶼設備（虛構）',line:'一號成型線',team:'成型一班',quantity:1200,goodOutput:780,grossOutput:800,defects:20,dueDate:'2026-11-29',baseEta:'2026-11-29',shipped:false,bom:[{materialId:'MAT-ABS',perGross:1}],note:'良品完成品檢後安排出貨。'},
   {id:'FO-2702',number:'SO-202611-0272',product:'控制器外殼',customer:'橋禾機電（虛構）',line:'二號加工線',team:'加工二班',quantity:800,goodOutput:700,grossOutput:710,defects:10,dueDate:'2026-11-28',baseEta:'2026-11-29',baseReason:'二號線設備保養，生產安排落後一天',shipped:false,bom:[{materialId:'MAT-ALU',perGross:0.5}],note:'設備保養完成後續接加工。'},
   {id:'FO-2703',number:'SO-202611-0273',product:'包裝配件組',customer:'青杉電器（虛構）',line:'包裝線',team:'包裝班',quantity:500,goodOutput:500,grossOutput:510,defects:10,dueDate:'2026-11-27',baseEta:'2026-11-27',shipped:true,bom:[{materialId:'MAT-BOX',perGross:1}],note:'已完成品檢及出貨。'}
  ],materials:[
   {id:'MAT-ABS',name:'ABS 粒料',unit:'kg',quantity:422,safetyStock:300,dailyUsage:120,unitCostUsd:2.4,leadDays:2,location:'原料倉 A-01'},
   {id:'MAT-ALU',name:'鋁合金板材',unit:'kg',quantity:150,safetyStock:60,dailyUsage:35,unitCostUsd:3.2,leadDays:2,location:'原料倉 B-02'},
   {id:'MAT-BOX',name:'包裝紙箱',unit:'箱',quantity:120,safetyStock:20,dailyUsage:30,unitCostUsd:1.2,leadDays:1,location:'包材倉 C-01'}
  ],dailyPlan:500,dailySnapshots:[{date:'2026-11-26',goodOutput:480,grossOutput:500,defects:20,reportsCount:2,plannedOutput:500}],reports:[],movements:[
   {id:'FM-OPEN-ABS',materialId:'MAT-ABS',date:'2026-11-26',kind:'opening',quantity:422,balance:422,reference:'展示期初庫存',actor:'周景程'},
   {id:'FM-OPEN-ALU',materialId:'MAT-ALU',date:'2026-11-26',kind:'opening',quantity:150,balance:150,reference:'展示期初庫存',actor:'周景程'},
   {id:'FM-OPEN-BOX',materialId:'MAT-BOX',date:'2026-11-26',kind:'opening',quantity:120,balance:120,reference:'展示期初庫存',actor:'周景程'}
  ],overtime:[{team:'成型一班',hours:24,baselineHours:16},{team:'加工二班',hours:12,baselineHours:10},{team:'包裝班',hours:6,baselineHours:4}]};
 }
 const data=()=>{seed(D.state);return D.state.factoryPreview;};
 function requireScope(write=false){if(D.company!==COMPANY||!viewers.includes(D.role)||write&&!writers.includes(D.role))throw Error('目前身分或公司無法執行這項操作。');return data();}
 function inventory(){
  if(D.company!==COMPANY||!viewers.includes(D.role))return [];
  const f=data();return f.materials.map(m=>{
   const using=f.orders.filter(o=>!o.shipped&&o.goodOutput<o.quantity&&o.bom.some(b=>b.materialId===m.id));
   const requiredQuantity=round(using.reduce((n,o)=>n+(o.quantity-o.goodOutput)*o.bom.find(b=>b.materialId===m.id).perGross,0));
   const shortageQty=round(Math.max(0,requiredQuantity-m.quantity)),reorderQty=round(Math.max(shortageQty,m.safetyStock-m.quantity,0));
   return {...m,materialId:m.id,requiredQuantity,shortageQty,reorderQty,daysCover:round(m.quantity/m.dailyUsage),valueUsd:round(m.quantity*m.unitCostUsd),affectedOrderIds:shortageQty>0?using.map(o=>o.id):[],status:shortageQty>0?'shortage':m.quantity<m.safetyStock?'low':'normal'};
  });
 }
 function orders(){
  if(D.company!==COMPANY||!viewers.includes(D.role))return [];
  const stock=inventory();return data().orders.map(o=>{
   const shortage=stock.filter(m=>m.affectedOrderIds.includes(o.id)),remainingGood=Math.max(0,o.quantity-o.goodOutput);
   let etaDate=o.baseEta,reason=o.baseReason||'';
   if(shortage.length){const latest=D.dateAdd(o.dueDate,Math.max(...shortage.map(m=>m.leadDays)));if(latest>etaDate)etaDate=latest;reason=shortage.map(m=>`${m.name} 尚缺 ${num(m.shortageQty)} ${m.unit}`).join('；')+'，補料後需重新確認交期';}
   const status=o.shipped?'completed':etaDate>o.dueDate?'delay':remainingGood===0?'ready':'on_track';
   return {...o,remainingGood,progressPercent:round(o.goodOutput/o.quantity*100),etaDate,status,reason,shortageMaterialIds:shortage.map(m=>m.id)};
  });
 }
 function summary(){
  const os=orders(),ms=inventory(),f=data(),visible=D.company===COMPANY&&viewers.includes(D.role),rs=visible?f.reports:[],ot=visible?f.overtime:[];
  const plannedOutput=sum(os,'quantity'),goodOutput=sum(os,'goodOutput'),onTimeOrders=os.filter(o=>o.etaDate<=o.dueDate).length;
  const daily=date=>{const rows=rs.filter(r=>r.date===date),base=visible?f.dailySnapshots.find(x=>x.date===date):null,goodOutput=round((base?.goodOutput||0)+sum(rows,'goodOutput')),plannedOutput=visible?(base?.plannedOutput||f.dailyPlan):0;return {date,goodOutput,grossOutput:round((base?.grossOutput||0)+sum(rows,'grossOutput')),defects:round((base?.defects||0)+sum(rows,'defects')),reportsCount:(base?.reportsCount||0)+rows.length,plannedOutput,attainmentPercent:plannedOutput?round(goodOutput/plannedOutput*100):0};};
  return {company:D.company,asOf:D.today,totalOrders:os.length,openOrders:os.filter(o=>!o.shipped).length,plannedOutput,goodOutput,grossOutput:sum(os,'grossOutput'),defects:sum(os,'defects'),attainmentPercent:plannedOutput?round(goodOutput/plannedOutput*100):0,onTimeOrders,onTimeRate:os.length?round(onTimeOrders/os.length*100):0,shortageCount:ms.filter(m=>m.status!=='normal').length,shortages:ms.filter(m=>m.status!=='normal'),inventoryValueUsd:sum(ms,'valueUsd'),overtimeHours:sum(ot,'hours'),overtimeBaselineHours:sum(ot,'baselineHours'),overtimeByTeam:ot.map(t=>({...t,deltaPercent:t.baselineHours?round((t.hours/t.baselineHours-1)*100):0})),delayOrders:os.filter(o=>o.status==='delay'),orders:os,reportsCount:rs.length,lastReportId:rs.at(-1)?.id||null,daily:{yesterday:daily(D.dateAdd(D.today,-1)),today:daily(D.today)}};
 }
 function integer(v,label,positive=false){if(String(v??'').trim()===''||!Number.isSafeInteger(Number(v))||Number(v)<(positive?1:0))throw Error(label+'須為'+(positive?'大於零的':'非負')+'整數。');return Number(v);}
 function dateValid(date){return /^\d{4}-\d{2}-\d{2}$/.test(date)&&!Number.isNaN(Date.parse(date+'T12:00:00Z'))&&new Date(date+'T12:00:00Z').toISOString().slice(0,10)===date;}
 function submitReport(input){
  const f=requireScope(true),o=f.orders.find(x=>x.id===input.orderId),grossOutput=integer(input.grossOutput,'本次總產出',true),defects=integer(input.defects,'不良品');
  if(!o||o.shipped)throw Error('請選擇未出貨的訂單。');
  if(defects>grossOutput)throw Error('不良品不可大於總產出。');
  const date=String(input.date||''),shift=String(input.shift||''),id=String(input.reportId||'');
  if(!dateValid(date)||date>D.today)throw Error('請填寫有效日期，且不可晚於展示日期。');
  if(date<D.today)throw Error('過往報工已彙總，請使用今日生產日報。');
  if(!['day','evening'].includes(shift))throw Error('請選擇班別。');
  if(!/^FR-[A-Za-z0-9_-]{1,100}$/.test(id))throw Error('報工識別碼無效，請重新開啟報工頁面。');
  if(f.reports.some(r=>r.id===id||r.orderId===o.id&&r.date===date&&r.shift===shift))throw Error('此訂單在同一天、同一班別已報工，請勿重複提交。');
  const goodOutput=grossOutput-defects,remaining=o.quantity-o.goodOutput;
  if(goodOutput>remaining)throw Error(`良品不可超過訂單剩餘 ${num(remaining)} 件。`);
  const materials=o.bom.map(b=>{const m=f.materials.find(x=>x.id===b.materialId);if(!m)throw Error('此訂單缺少物料設定。');const quantity=round(grossOutput*b.perGross);if(quantity>m.quantity)throw Error(`${m.name} 庫存只有 ${num(m.quantity)} ${m.unit}，不足本次領用 ${num(quantity)} ${m.unit}。`);return {materialId:m.id,name:m.name,quantity,unit:m.unit};});
  const report={id,orderId:o.id,date,shift,grossOutput,defects,goodOutput,company:COMPANY,actorId:D.actor.id,actor:D.actor.name,note:String(input.note||'').trim().slice(0,300),materials};
  o.grossOutput+=grossOutput;o.defects+=defects;o.goodOutput+=goodOutput;
  for(const usage of materials){const m=f.materials.find(x=>x.id===usage.materialId);m.quantity=round(m.quantity-usage.quantity);f.movements.push({id:id+'-'+m.id,materialId:m.id,date,kind:'production',quantity:-usage.quantity,balance:m.quantity,reference:id,orderId:o.id,actor:D.actor.name});}
  f.reports.push(report);D.log(`生產報工 ${o.number}：總產出 ${grossOutput} 件、不良 ${defects} 件、良品 ${goodOutput} 件`);D.save();return {...report};
 }
 function receiveMaterial(input){
  const f=requireScope();if(!['factorymanager','admin'].includes(D.role))throw Error('只有工廠主管可登記到料。');
  const m=f.materials.find(x=>x.id===input.materialId),quantity=Number(input.quantity);
  if(!m||String(input.quantity??'').trim()===''||!Number.isFinite(quantity)||quantity<=0||quantity>1e6||round(quantity)!==quantity)throw Error('到料數量須大於零，最多三位小數。');
  const reference=String(input.reference||'').trim();if(!reference||reference.length>60)throw Error('請填寫到料單號（60 字內）。');
  if(f.movements.some(x=>x.kind==='receipt'&&x.materialId===m.id&&x.reference===reference))throw Error('此物料的到料單號已登記。');
  m.quantity=round(m.quantity+quantity);f.movements.push({id:'FM-R-'+f.movements.length+'-'+m.id,materialId:m.id,date:D.today,kind:'receipt',quantity,balance:m.quantity,reference,actor:D.actor.name});D.log(`到料 ${m.name}：${quantity} ${m.unit}（${reference}）`);D.save();return {...m};
 }
 const statusLabel=o=>({completed:'已出貨',ready:'待出貨',delay:'交期風險',on_track:'進度正常'})[o.status];
 const statusTone=o=>o.status==='delay'?'red':o.status==='ready'?'amber':'green';
 function heading(title,subtitle){return `<header class="page-head factory-head"><div>${preview()}<h1>${E(title)}</h1><p class="lede">${E(subtitle)}</p></div><span class="factory-asof">暹光製造示範廠 · ${E(D.today)}</span></header>`;}
 function nav(active){return `<nav class="subnav factory-subnav">${[['factory','工廠總覽'],['factory-orders','訂單進度'],['factory-inventory','物料與庫存'],['factory-report','生產日報']].map(([v,t])=>`<a href="#view=${v}" class="${v===active?'active':''}">${t}</a>`).join('')}</nav>`;}
 const noScope=()=>D.empty('這家公司尚無工廠資料','切換至暹光製造示範廠查看。');
 function kpis(s){return `<div class="factory-kpis">${[
  ['今日產量達成率',num(s.daily.today.attainmentPercent)+'%',num(s.daily.today.goodOutput)+' / '+num(s.daily.today.plannedOutput)+' 件良品','factory-report','green'],
  ['預估準時交付',num(s.onTimeRate)+'%',s.onTimeOrders+' / '+s.totalOrders+' 筆訂單','factory-orders',s.delayOrders.length?'amber':'green'],
  ['物料提醒',s.shortageCount+' 項','缺料或低於安全量','factory-inventory',s.shortageCount?'red':'green'],
  ['庫存參考值',D.money(s.inventoryValueUsd),'USD · 示範單價估算','factory-inventory','neutral'],
  ['本週加班',num(s.overtimeHours)+' h','原排定 '+num(s.overtimeBaselineHours)+' h','factory','amber']
 ].map(([label,value,caption,view,tone])=>`<a class="factory-kpi ${tone}" href="#view=${view}"><span>${E(label)}</span><strong>${E(value)}</strong><small>${E(caption)}</small></a>`).join('')}</div>`;}
 function riskList(s){return s.delayOrders.length?s.delayOrders.map(o=>`<article class="factory-risk"><div>${D.badge('交期風險','red')}<strong>${E(o.product)}</strong><p>${E(o.reason||'預估完成日晚於約定交期')}。</p><small>約定 ${E(o.dueDate)} · 預估 ${E(o.etaDate)}</small></div>${link('查看訂單','factory-orders',{id:o.id})}</article>`).join(''):'<p class="notice">目前沒有預估延誤的訂單。</p>';}
 function overview(){
  const s=summary();return heading('工廠總覽','生產、訂單、物料，放在同一個畫面。')+nav('factory')+(D.company!==COMPANY?noScope():`${kpis(s)}<div class="factory-two"><section class="card"><div class="row"><h2>先處理這些事</h2>${D.badge(s.delayOrders.length+' 筆風險',s.delayOrders.length?'red':'green')}</div>${riskList(s)}</section><section class="card"><div class="row"><h2>今日生產</h2>${canWrite()?link('新增報工','factory-report',{order:'FO-2701'},true):link('報工紀錄','factory-report')}</div><div class="factory-today"><strong>${num(s.daily.today.goodOutput)}<small>件良品</small></strong><span>總產出 ${num(s.daily.today.grossOutput)} 件<br>不良 ${num(s.daily.today.defects)} 件 · ${s.daily.today.reportsCount} 筆報工</span></div><p class="mini">今日只計已提交的報工；訂單累計進度另列。</p></section></div><section class="card space-top"><div class="row"><h2>訂單進度</h2>${link('全部訂單','factory-orders')}</div>${s.orders.map(o=>`<a class="factory-order-line" href="#view=factory-orders&id=${E(o.id)}"><div><strong>${E(o.product)}</strong><small>${E(o.number)}</small></div><div><div class="factory-progress"><span style="width:${o.progressPercent}%"></span></div><small>良品 ${num(o.goodOutput)} / ${num(o.quantity)} 件</small></div>${D.badge(statusLabel(o),statusTone(o))}</a>`).join('')}</section><section class="card space-top"><h2>本週加班工時</h2><div class="factory-overtime">${s.overtimeByTeam.map(t=>`<div><span>${E(t.team)}</span><strong>${num(t.hours)} h</strong><small>排定 ${num(t.baselineHours)} h · 增加 ${num(t.deltaPercent)}%</small><div class="factory-progress amber"><span style="width:${Math.min(100,t.hours/30*100)}%"></span></div></div>`).join('')}</div></section>`);
 }
 function orderCard(o,focused=false){
  const ms=inventory(),complete=o.remainingGood===0,steps=[['備料',o.shortageMaterialIds.length?'warning':'done'],['生產',complete?'done':'active'],['品檢',complete?'done':'pending'],['出貨',o.shipped?'done':complete?'active':'pending']];
  return `<article class="card factory-order ${focused?'focused':''}" id="${E(o.id)}"><div class="row"><div><small class="muted">${E(o.number)} · ${E(o.line)}</small><h2>${E(o.product)}</h2></div>${D.badge(statusLabel(o),statusTone(o))}</div><div class="factory-order-stats"><div><small>訂購數量</small><strong>${num(o.quantity)} 件</strong></div><div><small>完成良品</small><strong>${num(o.goodOutput)} 件</strong></div><div><small>剩餘良品</small><strong>${num(o.remainingGood)} 件</strong></div><div><small>累計不良</small><strong>${num(o.defects)} 件</strong></div></div><div class="factory-progress"><span style="width:${o.progressPercent}%"></span></div><p class="mini">累計總產出 ${num(o.grossOutput)} 件 − 不良 ${num(o.defects)} 件 ＝ 良品 ${num(o.goodOutput)} 件</p><ol class="factory-steps">${steps.map(([t,c],i)=>`<li class="${c}"><span>${c==='done'?'✓':i+1}</span><strong>${t}</strong>${c==='warning'?'<small>物料待補</small>':''}</li>`).join('')}</ol><div class="factory-eta ${o.status==='delay'?'risk':''}"><div>約定交期<strong>${E(o.dueDate)}</strong></div><div>預估出貨<strong>${E(o.etaDate)}</strong></div><div>${E(o.reason||o.note)}</div></div>${focused?`<div class="factory-bom"><h3>剩餘生產所需物料</h3>${o.bom.map(b=>{const m=ms.find(x=>x.id===b.materialId);return `<div><strong>${E(m.name)}</strong><span>至少 ${num(o.remainingGood*b.perGross)} ${E(m.unit)}</span><span>目前庫存 ${num(m.quantity)} ${E(m.unit)}</span>${link('物料明細','factory-inventory',{id:m.id})}</div>`;}).join('')}<p class="mini">每件總產出按用料表扣庫存；不良品也會耗料。剩餘需求以全為良品估算，尚未加計未來損耗。</p></div>`:''}<div class="action-row space-top">${focused?link('返回訂單清單','factory-orders'):link('訂單明細','factory-orders',{id:o.id})}${canWrite()&&!o.shipped&&o.remainingGood>0?link('生產報工','factory-report',{order:o.id},true):''}${o.shortageMaterialIds.length?link('處理缺料','factory-inventory',{id:o.shortageMaterialIds[0]}):''}</div></article>`;
 }
 function orderPage(r){const rows=orders(),focused=rows.find(o=>o.id===r.id);return heading('訂單進度','看交期、看剩餘數量，再安排下一班。')+nav('factory-orders')+(D.company!==COMPANY?noScope():r.id&&!focused?D.empty('找不到這筆訂單'):focused?orderCard(focused,true):`<div class="factory-order-list">${rows.map(o=>orderCard(o)).join('')}</div>`);}
 function materialCard(m,focused=false){return `<article class="card factory-material ${focused?'focused':''}"><div class="row"><div><small class="muted">${E(m.id)} · ${E(m.location)}</small><h2>${E(m.name)}</h2></div>${D.badge(m.status==='shortage'?'生產缺料':m.status==='low'?'低於安全量':'庫存正常',m.status==='shortage'?'red':m.status==='low'?'amber':'green')}</div><div class="factory-stock"><strong>${num(m.quantity)}<small>${E(m.unit)}</small></strong><span>安全庫存 ${num(m.safetyStock)} ${E(m.unit)}<br>約可用 ${num(m.daysCover)} 天</span></div><div class="factory-progress ${m.status==='normal'?'':'amber'}"><span style="width:${Math.min(100,m.quantity/Math.max(m.requiredQuantity,m.safetyStock,1)*100)}%"></span></div><div class="factory-material-facts"><span>剩餘訂單需求 <b>${num(m.requiredQuantity)} ${E(m.unit)}</b></span><span>單位參考成本 <b>${D.money(m.unitCostUsd)} / ${E(m.unit)}</b></span><span>庫存參考值 <b>${D.money(m.valueUsd)}</b></span></div>${m.shortageQty?`<p class="notice amber">完成剩餘訂單至少還缺 ${num(m.shortageQty)} ${E(m.unit)}。</p>`:''}${m.quantity<m.safetyStock?`<p class="notice amber">低於安全庫存 ${num(m.safetyStock-m.quantity)} ${E(m.unit)}。</p>`:''}${focused?`<p class="mini">可用天數依每日 ${num(m.dailyUsage)} ${E(m.unit)} 的示範用量估算。庫存參考值不代表已入帳或已付款。</p>`:''}<div class="action-row">${focused?link('返回物料清單','factory-inventory'):link('出入庫紀錄','factory-inventory',{id:m.id})}${['factorymanager','admin'].includes(D.role)?`<button class="btn primary" data-action="factory-receive" data-id="${E(m.id)}">登記到料</button>`:''}</div></article>`;}
 function inventoryPage(r){
  const rows=inventory(),m=rows.find(x=>x.id===r.id),f=data();return heading('物料與庫存','報工後扣除用料，缺料與訂單風險一起更新。')+nav('factory-inventory')+(D.company!==COMPANY?noScope():r.id&&!m?D.empty('找不到這項物料'):m?`${materialCard(m,true)}<section class="card space-top"><h2>出入庫紀錄</h2><div class="factory-movements">${f.movements.filter(x=>x.materialId===m.id).slice().reverse().map(x=>`<article><div><strong>${x.kind==='production'?'生產領用':x.kind==='receipt'?'到料入庫':'期初庫存'}</strong><small>${E(x.date)} · ${E(x.actor)}</small><small>${E(x.reference)}</small></div><div class="${x.quantity<0?'factory-minus':'factory-plus'}"><strong>${x.quantity>0?'+':''}${num(x.quantity)} ${E(m.unit)}</strong><small>餘額 ${num(x.balance)} ${E(m.unit)}</small></div></article>`).join('')}</div></section>`:`<div class="factory-material-grid">${rows.map(x=>materialCard(x)).join('')}</div>`);
 }
 const reportId=()=>`FR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
 function reportReceipt(report){const o=orders().find(x=>x.id===report.orderId);return `<section class="card factory-receipt"><div class="row"><h2>報工已保存</h2>${D.badge('已更新','green')}</div><p>${E(o?.product||report.orderId)} · ${E(report.date)} · ${report.shift==='day'?'早班':'晚班'}</p><div class="factory-result-grid"><div><small>總產出</small><strong>${num(report.grossOutput)} 件</strong></div><div><small>不良品</small><strong>${num(report.defects)} 件</strong></div><div><small>本次良品</small><strong>${num(report.goodOutput)} 件</strong></div></div><p>訂單良品進度：${num(o?.goodOutput)} / ${num(o?.quantity)} 件</p>${report.materials.map(m=>`<p>已領用 ${E(m.name)} ${num(m.quantity)} ${E(m.unit)}</p>`).join('')}${o?.status==='delay'?`<p class="notice amber">${E(o.reason)}。董事長首頁的交期風險已更新。</p>`:''}<div class="action-row">${link('查看訂單','factory-orders',{id:report.orderId},true)}${link('查看庫存','factory-inventory',{id:report.materials[0]?.materialId||''})}${link('返回報工','factory-report')}</div></section>`;}
 function reportPage(r){
  const f=data(),rows=orders(),open=rows.filter(o=>!o.shipped&&o.remainingGood>0),o=open.find(x=>x.id===r.order)||open[0],receipt=f.reports.find(x=>x.id===r.report),grossDefault=Math.min(200,o?.remainingGood||0),defectDefault=Math.floor(grossDefault*0.05);
  let body='';if(D.company!==COMPANY)body=noScope();else if(r.report)body=receipt?reportReceipt(receipt):D.empty('找不到這筆報工');else{
   if(canWrite()&&o)body=`<section class="card factory-report-card"><h2>新增生產報工</h2><form data-factory-report data-company="${E(D.company)}" data-actor="${E(D.actor.id)}"><input type="hidden" name="reportId" value="${reportId()}"><div class="form-grid"><label class="field factory-full">訂單${D.select('orderId',open.map(x=>[x.id,x.product+' · '+x.number]),o.id)}</label><label class="field">報工日期<input type="date" name="date" value="${E(D.today)}" min="${E(D.today)}" max="${E(D.today)}" required></label><label class="field">班別${D.select('shift',[['day','早班'],['evening','晚班']],'day')}</label><label class="field">本次總產出（件）<input type="number" inputmode="numeric" min="1" step="1" name="grossOutput" value="${grossDefault}" required></label><label class="field">其中不良品（件）<input type="number" inputmode="numeric" min="0" step="1" name="defects" value="${defectDefault}" required></label></div><div class="factory-good-preview"><span>本次完成良品</span><strong data-factory-good>${grossDefault-defectDefault} 件</strong><small>總產出 − 不良品</small></div><div data-factory-report-context>${reportContext(o,grossDefault)}</div><label class="field">備註（選填）<textarea name="note" rows="2" maxlength="300" placeholder="填寫現場異常或交接事項"></textarea></label><p class="factory-form-error" role="alert" data-factory-error></p><button class="btn primary factory-submit" type="submit">提交報工</button></form></section>`;
   else if(canWrite())body=D.empty('目前沒有待生產的訂單');
   body+=`<section class="card space-top"><h2>報工紀錄</h2>${f.reports.length?f.reports.slice().reverse().map(x=>`<a class="factory-report-row" href="#view=factory-report&report=${E(x.id)}"><div><strong>${E(rows.find(o=>o.id===x.orderId)?.product||x.orderId)}</strong><small>${E(x.date)} · ${x.shift==='day'?'早班':'晚班'} · ${E(x.actor)}</small></div><div><strong>${num(x.goodOutput)} 件良品</strong><small>總產出 ${num(x.grossOutput)} · 不良 ${num(x.defects)}</small></div></a>`).join(''):D.empty('今日尚未報工','班組長提交後，這裡顯示每一筆生產紀錄。')}</section>`;
  }
  return heading('生產日報','填總產出與不良數，訂單和庫存一起更新。')+nav('factory-report')+body;
 }
 function reportContext(o,gross){if(!o)return '';const f=data();return `<div class="factory-report-context"><span>訂單尚需 <strong>${num(o.remainingGood)} 件良品</strong></span>${o.bom.map(b=>{const m=f.materials.find(x=>x.id===b.materialId);return `<span>本次將領用 <strong>${E(m.name)} ${num(gross*b.perGross)} ${E(m.unit)}</strong> · 庫存 ${num(m.quantity)} ${E(m.unit)}</span>`;}).join('')}</div>`;}
 document.addEventListener('input',event=>{const form=event.target.closest?.('[data-factory-report]');if(!form)return;const gross=Number(form.elements.grossOutput.value),defects=Number(form.elements.defects.value),good=gross-defects,o=orders().find(x=>x.id===form.elements.orderId.value);form.querySelector('[data-factory-good]').textContent=Number.isSafeInteger(good)&&good>=0?num(good)+' 件':'請核對數量';form.querySelector('[data-factory-report-context]').innerHTML=reportContext(o,Number.isFinite(gross)&&gross>=0?gross:0);});
 document.addEventListener('submit',event=>{const form=event.target.closest?.('[data-factory-report]');if(!form)return;event.preventDefault();const error=form.querySelector('[data-factory-error]');if(form.dataset.busy==='1')return;try{if(form.dataset.actor!==D.actor.id||form.dataset.company!==D.company)throw Error('身分或公司已變更，請重新開啟報工頁面。');form.dataset.busy='1';const result=submitReport(Object.fromEntries(new FormData(form)));D.go('factory-report',{report:result.id});D.render();D.toast('報工已保存，訂單與庫存已更新。');}catch(err){error.textContent=err.message;delete form.dataset.busy;}});
 D.on('factory-receive',el=>{const m=inventory().find(x=>x.id===el.dataset.id),actor=D.actor.id,company=D.company;if(!m||!['factorymanager','admin'].includes(D.role))throw Error('目前身分無法登記到料。');D.modal('登記到料',`<p><strong>${E(m.name)}</strong> · 目前 ${num(m.quantity)} ${E(m.unit)}</p><div class="form-grid"><label class="field">到料數量（${E(m.unit)}）<input name="quantity" type="number" min="0.001" step="0.001" value="${Math.max(m.reorderQty,100)}" required></label><label class="field">到料單號<input name="reference" maxlength="60" required placeholder="例如 GR-20261127-01"></label></div>`,v=>{if(actor!==D.actor.id||company!==D.company)throw Error('身分或公司已變更，請重新操作。');receiveMaterial({...v,materialId:m.id});D.render();D.toast('到料已登記，庫存與交期風險已更新。');},'確認入庫');});
 for(const [id,title,render] of [['factory','工廠總覽',overview],['factory-orders','訂單進度',orderPage],['factory-inventory','物料與庫存',inventoryPage],['factory-report','生產日報',reportPage]])D.register(id,{title,group:'工廠管理',canView:role=>viewers.includes(role),seed:id==='factory'?seed:undefined,render});
 function homePanel(){const s=summary();return `<section class="factory-home"><div class="row"><div><h2>工廠營運</h2></div>${link('工廠總覽','factory',{},true)}</div>${kpis(s)}<div class="card factory-home-risks"><div class="row"><h3>需要留意的訂單</h3>${link('所有訂單','factory-orders')}</div>${riskList(s)}</div></section>`;}
 if(D.modules.home){if(Array.isArray(D.modules.home.roles))D.modules.home.roles=[...new Set([...D.modules.home.roles,'factorymanager','teamlead'])];const original=D.modules.home.render;D.modules.home.render=r=>['factorymanager','teamlead'].includes(D.role)?overview():['chairman','ceo','admin'].includes(D.role)&&D.company===COMPANY?homePanel()+original(r):original(r);}
 // Public read contract: quantities are pieces except inventory units; USD values are fixture estimates.
 // daily totals combine explicit historical snapshots and submitted reports; snapshots are already included in cumulative order fixtures.
 D.factoryPreview={seed,summary,orders,inventory,submitReport,receiveMaterial};
})();
