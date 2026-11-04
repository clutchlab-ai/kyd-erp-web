/* Native administrative report/settings examples; never import or modify actual employees. */
(()=>{
 'use strict';
 const D=window.D,E=x=>D.esc(x??''),module=D.modules.access,previous=module.render,oldSeed=module.seed;
 const editors=()=>['hrmanager','admin'].includes(D.role),reporters=()=>['hr','hrmanager','manager','ceo','chairman','admin'].includes(D.role);
 const head=(title,description)=>`<header class="page-head"><div><p class="eyebrow">行政人事 · 功能示範</p><h1>${title}</h1><p class="lede">${description}</p></div></header>`;
 const link=(label,view,params={})=>`<a class="btn" href="#${new URLSearchParams({view,...params})}">${label}</a>`;
 const button=(label,action,primary=false)=>`<button class="btn${primary?' primary':''}" data-action="${action}">${label}</button>`;
 const people=()=>D.state.people.filter(p=>p.company===D.company&&(!['employee','manager'].includes(D.role)||p.id===D.actor.id||D.role==='manager'&&p.department==='工程部'));
 module.seed=s=>{oldSeed?.(s);s.adminDemoSettings??={documentReminderDays:30,followupDays:7,note:'先以這組提醒設定確認操作，正式規則待確認。',history:[]};};
 const tabs=[['reports','人力報表'],['policy','提醒政策'],['rights','角色與權限'],['import','匯入預覽'],['impact','職務權限影響'],['audit','操作紀錄'],['pending','待確認規則']];
 function reports(){
  const rows=people(),departments=[...new Set(rows.map(p=>p.department))];
  return head('人力報表','按公司及部門查看示例人數，從數字繼續查看相關流程。')+`<div class="grid three"><div class="stat"><small>${E(D.company)} · 在職</small><strong>${rows.filter(p=>p.active).length}</strong></div><div class="stat"><small>部門</small><strong>${departments.length}</strong></div><div class="stat"><small>可查看人員</small><strong>${rows.length}</strong></div></div><section class="card table-wrap space-top"><table><thead><tr><th>部門</th><th>在職人數</th><th>示例職務</th></tr></thead><tbody>${departments.map(dep=>`<tr><td>${E(dep)}</td><td>${rows.filter(p=>p.department===dep&&p.active).length}</td><td>${E([...new Set(rows.filter(p=>p.department===dep).map(p=>p.title))].join('、'))}</td></tr>`).join('')}</tbody></table></section><div class="grid three space-top">${[['attendance','考勤與月結','查看打卡、異常與月結結果。'],['documents','證件到期','查看紅色到期提醒與跟進紀錄。'],['personnel','人事異動','查看異動、審核與生效進度。']].filter(([id])=>D.allowed(id)).map(([id,title,text])=>`<article class="card"><h2>${title}</h2><p>${text}</p>${link('查看內容',id)}</article>`).join('')}</div>`;
 }
 function policy(){const s=D.state.adminDemoSettings;return head('提醒政策','調整示例提醒天數，再到證件頁確認顏色與提示。')+`<section class="card"><div class="row"><h2>證件與合約提醒</h2>${editors()?button('修改提醒設定','admin-policy',true):D.badge('可查看')}</div><dl class="grid two"><div><dt>即將到期</dt><dd>到期前 ${s.documentReminderDays} 天</dd></div><div><dt>預設下次跟進</dt><dd>${s.followupDays} 天後</dd></div></dl><p>${E(s.note)}</p>${link('查看證件提醒效果','documents')}</section><p class="notice">用假證件測試顏色及跟進期限。通知對象與管道仍需確認，此處不會對外發訊息。</p>`;}
 const roleScopes={employee:'本人資料與已指派工作',hr:'所屬公司人事作業',hrmanager:'所屬公司人事複核',manager:'所屬公司工程與團隊工作',finance:'所屬公司財務與薪酬',ceo:'選定公司管理資訊及核准',chairman:'選定公司經營資訊及核准',admin:'功能與操作流程檢查'};
 function rights(){return head('角色與權限','點選一個角色，實際查看他能看到的選單與可按的操作。')+`<div class="grid two">${Object.entries(D.roles).map(([role,p])=>`<article class="card"><div class="row"><h2>${E(p.label)}</h2>${D.badge(role===D.role?'目前角色':'示範角色',role===D.role?'blue':'neutral')}</div><p>${E(roleScopes[role])}</p><button class="btn" data-action="switch-role" data-role="${role}" data-view="home">切換成${E(p.label)}</button></article>`).join('')}</div><p class="notice">這裡切換的是流程示範角色；真實帳號的公司及薪資權限仍由原 ERP 管理。</p>`;}
 function imports(){return head('匯入預覽','用示例欄位確認匯入步驟：選擇資料、對應欄位、檢查，再確認結果。')+`<section class="card"><h2>員工資料欄位對應</h2><p>示例欄位：員工代號、姓名、公司、部門、職務。</p>${reporters()?button('開啟欄位對應示例','admin-import',true):''}<p class="muted">此範例只預覽 2 筆虛構資料，不加入已匯入的真實員工名冊。</p></section>`;}
 module.render=(r={})=>{
  const wanted=r.tab||'reports',tab=!reporters()&&!['impact','audit','pending'].includes(wanted)?'impact':wanted;
  if(['impact','audit','pending'].includes(tab))return nav(tab)+previous({...r,tab}).replace(/<nav class="subnav">[\s\S]*?<\/nav>/,'');
  return nav(tab)+({reports,policy,rights,import:imports}[tab]||reports)()+`<p class="muted space-top">功能操作示範 · 各公司的真實員工與資料維持原樣。</p>`;
 };
 function nav(active){return `<nav class="subnav" aria-label="報表與設定">${tabs.filter(([id])=>reporters()||['impact','audit','pending'].includes(id)).map(([id,title])=>`<a class="${active===id?'active':''}" href="#view=access&tab=${id}">${title}</a>`).join('')}</nav>`;}
 D.on('admin-policy',()=>{
  if(!editors())throw Error('請切換人資主管或系統管理員。');const s=D.state.adminDemoSettings;
  D.modal('修改提醒設定',`<div class="form-grid"><label class="field">到期前幾天提醒<input type="number" min="1" max="365" step="1" name="days" value="${s.documentReminderDays}" required></label><label class="field">預設幾天後跟進<input type="number" min="1" max="90" step="1" name="followup" value="${s.followupDays}" required></label><label class="field full">討論備註<textarea name="note" maxlength="500">${E(s.note)}</textarea></label></div>`,v=>{
   if(!editors())throw Error('目前角色不能修改設定。');const days=Number(v.days),followup=Number(v.followup);
   if(!Number.isInteger(days)||days<1||days>365||!Number.isInteger(followup)||followup<1||followup>90)throw Error('請填寫有效的整數天數。');
   D.mutate(()=>{s.history.push({at:D.today,actor:D.actor.name,previousDays:s.documentReminderDays,previousFollowup:s.followupDays});Object.assign(s,{documentReminderDays:days,followupDays:followup,note:String(v.note||'').slice(0,500)});D.log('更新示例證件提醒政策');});
  },'儲存示例設定');
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
