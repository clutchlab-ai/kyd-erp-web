/* Native administrative report/settings examples; never import or modify actual employees. */
(()=>{
 'use strict';
 const D=window.D,E=x=>D.esc(x??''),module=D.modules.access,previous=module.render,oldSeed=module.seed;
 const editors=()=>['hrmanager','admin'].includes(D.role),reporters=()=>['hr','hrmanager','manager','ceo','chairman','admin'].includes(D.role);
 const head=(title,description)=>`<header class="page-head"><div><p class="eyebrow">行政人事</p><h1>${title}</h1><p class="lede">${description}</p></div></header>`;
 const link=(label,view,params={})=>`<a class="btn" href="#${new URLSearchParams({view,...params})}">${label}</a>`;
 const button=(label,action,primary=false)=>`<button class="btn${primary?' primary':''}" data-action="${action}">${label}</button>`;
 const people=()=>D.state.people.filter(p=>p.company===D.company&&(!['employee','manager'].includes(D.role)||p.id===D.actor.id||D.role==='manager'&&p.department==='工程部'));
 module.seed=s=>{oldSeed?.(s);s.adminDemoSettings??={documentReminderDays:30,followupDays:7,note:'證件於到期前提醒，人資記錄跟進進度。',history:[]};};
 const tabs=[['reports','人力報表'],['policy','提醒設定'],['rights','角色與權限'],['import','匯入預覽'],['impact','職務權限影響'],['audit','操作紀錄'],['pending','待確認規則']];
 function reports(){
  const rows=people(),departments=[...new Set(rows.map(p=>p.department))];
  return head('人力報表','依公司、部門查看在職人數與人員分布。')+`<div class="grid three"><div class="stat"><small>${E(D.company)} · 在職</small><strong>${rows.filter(p=>p.active).length}</strong></div><div class="stat"><small>部門</small><strong>${departments.length}</strong></div><div class="stat"><small>可查看人員</small><strong>${rows.length}</strong></div></div><section class="card table-wrap space-top"><table><thead><tr><th>部門</th><th>在職人數</th><th>職務</th></tr></thead><tbody>${departments.map(dep=>`<tr><td>${E(dep)}</td><td>${rows.filter(p=>p.department===dep&&p.active).length}</td><td>${E([...new Set(rows.filter(p=>p.department===dep).map(p=>p.title))].join('、'))}</td></tr>`).join('')}</tbody></table></section><div class="grid three space-top">${[['attendance','考勤與月結','查看打卡、異常與月結結果。'],['documents','證件到期','查看紅色到期提醒與跟進紀錄。'],['personnel','人事異動','查看異動、審核與生效進度。']].filter(([id])=>D.allowed(id)).map(([id,title,text])=>`<article class="card"><h2>${title}</h2><p>${text}</p>${link('查看內容',id)}</article>`).join('')}</div>`;
 }
 function policy(){const s=D.state.adminDemoSettings;return head('提醒設定','設定證件到期提醒與後續跟進時間。')+`<section class="card"><div class="row"><h2>證件與合約提醒</h2>${editors()?button('修改提醒設定','admin-policy',true):D.badge('可查看')}</div><dl class="grid two"><div><dt>即將到期</dt><dd>到期前 ${s.documentReminderDays} 天</dd></div><div><dt>預設下次跟進</dt><dd>${s.followupDays} 天後</dd></div></dl><p>${E(s.note)}</p>${link('證件與合約','documents')}</section><p class="notice">站內通知已啟用；Email／手機推播尚未啟用。</p>`;}
 const roleScopes={employee:'本人資料與已指派工作',hr:'所屬公司人事作業',hrmanager:'所屬公司人事複核',manager:'所屬公司工程與團隊工作',finance:'所屬公司財務與薪酬',ceo:'選定公司管理資訊及核准',chairman:'選定公司經營資訊及核准',admin:'功能與操作流程檢查'};
 function rights(){return head('角色與權限','角色的可見資料與可執行工作分別管理。')+`<section class="card table-wrap"><table><thead><tr><th>角色</th><th>資料範圍</th><th>狀態</th></tr></thead><tbody>${Object.entries(D.roles).map(([role,p])=>`<tr><td><strong>${E(p.label)}</strong></td><td>${E(roleScopes[role])}</td><td>${D.badge(role===D.role?'目前角色':'已設定',role===D.role?'blue':'neutral')}</td></tr>`).join('')}</tbody></table></section>`;}
 function imports(){return head('匯入預覽','對應員工資料欄位，檢查公司與必填資料。')+`<section class="card"><h2>員工資料欄位對應</h2><p>示例欄位：員工代號、姓名、公司、部門、職務。</p>${reporters()?button('欄位對應','admin-import',true):''}<p class="muted">目前提供 2 筆範例資料預覽；確認匯入尚未啟用。</p></section>`;}
 module.render=(r={})=>{
  const wanted=r.tab||'reports',tab=!reporters()&&!['impact','audit','pending'].includes(wanted)?'impact':wanted;
  if(['impact','audit','pending'].includes(tab))return nav(tab)+previous({...r,tab}).replace(/<nav class="subnav">[\s\S]*?<\/nav>/,'');
  return nav(tab)+({reports,policy,rights,import:imports}[tab]||reports)();
 };
 function nav(active){return `<nav class="subnav" aria-label="報表與設定">${tabs.filter(([id])=>reporters()||['impact','audit','pending'].includes(id)).map(([id,title])=>`<a class="${active===id?'active':''}" href="#view=access&tab=${id}">${title}</a>`).join('')}</nav>`;}
 D.on('admin-policy',()=>{
  if(!editors())throw Error('請切換人資主管或系統管理員。');const s=D.state.adminDemoSettings;
  D.modal('修改提醒設定',`<div class="form-grid"><label class="field">到期前幾天提醒<input type="number" min="1" max="365" step="1" name="days" value="${s.documentReminderDays}" required></label><label class="field">預設幾天後跟進<input type="number" min="1" max="90" step="1" name="followup" value="${s.followupDays}" required></label><label class="field full">討論備註<textarea name="note" maxlength="500">${E(s.note)}</textarea></label></div>`,v=>{
   if(!editors())throw Error('目前角色不能修改設定。');const days=Number(v.days),followup=Number(v.followup);
   if(!Number.isInteger(days)||days<1||days>365||!Number.isInteger(followup)||followup<1||followup>90)throw Error('請填寫有效的整數天數。');
   D.mutate(()=>{s.history.push({at:D.today,actor:D.actor.name,previousDays:s.documentReminderDays,previousFollowup:s.followupDays});Object.assign(s,{documentReminderDays:days,followupDays:followup,note:String(v.note||'').slice(0,500)});D.log('更新示例證件提醒設定');});
  },'儲存設定');
 });
 D.on('admin-import',()=>{
  if(!reporters())throw Error('目前角色不能預覽匯入。');
  const fields=[['id','員工代號'],['name','姓名'],['company','公司'],['department','部門'],['title','職務']];
  D.modal('1. 對應匯入欄位',`<p>使用內建的 2 筆假資料，確認實際匯入前的操作。</p><div class="form-grid">${fields.map(([id,label])=>`<label class="field">${label}${D.select(id,fields,id)}</label>`).join('')}</div>`,v=>{
   if(!reporters())throw Error('目前角色不能預覽匯入。');
   const mapped=fields.map(([id])=>v[id]);if(new Set(mapped).size!==fields.length||mapped.some(id=>!fields.some(([key])=>key===id)))throw Error('每個來源欄位只能對應一次。');
   const sample=[{id:'EXAMPLE-A',name:'示例員工甲',company:D.company,department:'行政部',title:'行政助理'},{id:'EXAMPLE-B',name:'示例員工乙',company:D.company,department:'工程部',title:'工程助理'}];
   const invalid=sample.some(row=>!['KYD','ZEUS'].includes(row[v.company]));
   D.modal('2. 檢查匯入預覽',`<div class="table-wrap"><table><thead><tr>${fields.map(([,label])=>`<th>${label}</th>`).join('')}</tr></thead><tbody>${sample.map(row=>`<tr>${fields.map(([id])=>`<td>${E(row[v[id]])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="notice ${invalid?'amber':'blue'}">${invalid?'公司欄位無法辨識，請返回重新對應。':'2 筆示例欄位可辨識。確認後只記錄本次預覽結果，不匯入員工。'}</p>`,invalid?null:()=>{if(!reporters())throw Error('目前角色不能確認預覽。');D.log('完成 2 筆內建員工匯入示例預覽（未匯入）');D.save();D.render();D.toast('預覽完成；既有名冊未變更。');},'完成預覽');return false;
  },'預覽資料');
 });
})();
