/* Authenticated, read-only view of the existing ERP roster.
 * Real rows stay in this closure, never in the saved demonstration state.
 * Simulated roles are never sent to the server or used to authorize a read.
 */
(()=>{
 'use strict';
 const D=window.D, E=value=>D.esc(value??'');
 const API='https://mfbgmzvrxuzkrurpttki.supabase.co/functions/v1/erp-workspace-api/';
 const SESSION_KEY='kyd_erp_workspace_github_session_v1';
 const FORMAL='https://clutchlab-ai.github.io/kyd-erp-web/';
 const LIVE_MODULES=new Set(['home','people','attendance','personal','performance','payroll','documents','changes','training','projects','applications','settings','finance','procurement','pms','engineering','customers','vendors','files','approvals','overview','my-payroll']);
 const KEYS=['id','employeeNumber','companyCode','displayName','nativeName','englishName','department','position','status','joined','resigned','managerId','serviceProjects','revision','sourceType','sourceSheet','sourceRow'];
 let token='',generation=0,enabled=false,busy=false,manuallyHidden=false,payrollGeneration=0;
 let payrollData={status:'idle',rows:[],error:'',company:''};
 let data={status:'disconnected',session:null,people:[],company:'',query:'',employment:'',error:'',updatedAt:null};
 const originalDocuments=D.modules.documents.render;
 const onPublishedHost=()=>location.protocol==='https:'&&location.hostname==='clutchlab-ai.github.io';
 const savedToken=()=>{try{return sessionStorage.getItem(SESSION_KEY)||''}catch{return ''}};
 const rememberToken=value=>{try{sessionStorage.setItem(SESSION_KEY,value)}catch{}}
 const removeToken=value=>{try{if(sessionStorage.getItem(SESSION_KEY)===value)sessionStorage.removeItem(SESSION_KEY)}catch{}};
 const refreshUI=()=>D.render();
 const roleLabel=role=>({owner:'系統管理員',employee:'員工',hr:'人資',finance:'財務',manager:'主管',executive:'經營主管'})[role]||'已授權帳號';
 const companyName=code=>data.session?.companies.find(c=>c.code===code)?.name||code||'未提供';
 const button=(label,action,primary=false)=>`<button type="button" class="btn${primary?' primary':''}" data-action="${action}">${label}</button>`;
 function clear(status='disconnected',error=''){
  ++payrollGeneration;payrollData={status:'idle',rows:[],error:'',company:''};
  data={...data,status,session:null,people:[],error,updatedAt:null};
 }
 function cleanPeople(rows,companies){
  const scope=new Set(companies.map(c=>c.code));
  return rows.filter(p=>p&&typeof p==='object'&&scope.has(p.companyCode)).map(p=>{
   const out=Object.fromEntries(KEYS.filter(k=>Object.hasOwn(p,k)).map(k=>[k,structuredClone(p[k])]));
   if(p.documents&&typeof p.documents==='object'&&!Array.isArray(p.documents))out.documents=Object.fromEntries(['employmentContract','cv','confidentiality'].filter(k=>Object.hasOwn(p.documents,k)).map(k=>[k,p.documents[k]]));
   return out;
  });
 }
 async function call(endpoint,currentToken,body){
  // This adapter deliberately has no general write method.
  if(!['session','people','payroll','login'].includes(endpoint)||(endpoint==='login')!==!!body)throw Error('不支援此操作。');
  const headers={};if(currentToken)headers.Authorization='Bearer '+currentToken;
  if(body)headers['Content-Type']='application/json';
  const response=await fetch(API+endpoint,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',headers,...(body?{body:JSON.stringify(body)}:{})});
  let value;try{value=await response.json()}catch{throw Error('無法讀取 ERP 回應，請稍後重新整理。')}
  if(!response.ok){const error=Error(value.error||'無法讀取 ERP 資料。');error.status=response.status;throw error;}
  return value;
 }
 function sessionView(value){
  if(!value?.user?.id||!Array.isArray(value.companies))throw Error('ERP 登入資料不完整，請重新登入。');
  const modules=Array.isArray(value.access?.modules)?[...new Set(value.access.modules.filter(id=>typeof id==='string'&&LIVE_MODULES.has(id)))]:null;
  return {user:{id:value.user.id,employee_id:value.user.employee_id,display_name:value.user.display_name,role:value.user.role},access:{modules},companies:value.companies.filter(c=>c&&typeof c.code==='string').map(c=>({code:c.code,name:c.name||c.code})),source:value.source?{name:String(value.source.source||'').split('/').pop(),asOf:value.source.asOf||''}:null};
 }
 async function load(currentToken=token||savedToken()){
  if(!onPublishedHost())throw Error('請在已上線的 ERP 頁面讀取真實資料。');
  manuallyHidden=false;
  if(!currentToken){enabled=false;token='';clear();refreshUI();return false;}
  const id=++generation;enabled=true;busy=true;token=currentToken;
  clear('loading');refreshUI();
  try{
   const session=sessionView(await call('session',currentToken));
   if(id!==generation)return false;
   const result=await call('people',currentToken);
   if(id!==generation)return false;
   if(!Array.isArray(result.rows))throw Error('名冊資料格式不完整，請重新整理。');
   const people=cleanPeople(result.rows,session.companies);
   data={...data,status:'connected',session,people,company:data.company&&session.companies.some(c=>c.code===data.company)?data.company:'',error:'',updatedAt:new Date().toISOString()};
   refreshUI();return true;
  }catch(error){
   if(id!==generation)return false;
   const rejected=error.status===401||error.status===403;
   if(rejected){removeToken(currentToken);token='';enabled=false;}
   clear(rejected?'disconnected':'error',error.message);refreshUI();throw error;
  }finally{if(id===generation)busy=false;}
 }
 function disconnect(){++generation;busy=false;enabled=false;manuallyHidden=true;token='';clear();D.closeModal();refreshUI();D.toast('已隱藏本頁的真實資料；原 ERP 登入與資料未更動。');}
 async function login(email,password){
  if(!onPublishedHost())throw Error('請在已上線的 ERP 頁面登入。');
  const id=++generation;enabled=false;busy=true;manuallyHidden=false;token='';clear('loading');refreshUI();
  try{
   const result=await call('login','',{username:String(email).trim(),password});
   if(id!==generation)return false;
   if(typeof result.token!=='string'||!result.token)throw Error('ERP 登入未完成，請再試一次。');
   token=result.token;rememberToken(token);busy=false;
   return await load(token);
  }catch(error){
   if(id===generation){clear('error',error.message);refreshUI();}
   throw error;
  }finally{if(id===generation)busy=false;}
 }
 function loginDialog(){
  if(!onPublishedHost()){D.modal('沿用原 ERP 資料',`<p>真實名冊需透過原 ERP 登入與權限讀取。請在已上線的頁面登入。</p><a class="btn primary" href="${FORMAL}demo/#view=people" target="_blank" rel="noopener noreferrer">開啟線上員工與組織</a>`,null);return;}
  D.modal('使用原 ERP 帳號登入',`<p class="muted">使用原本的 email 與密碼。這裡只讀取該帳號可見的既有名冊，不更改員工資料。</p><div class="form-grid"><label class="field full">Email<input type="email" name="email" autocomplete="username" autocapitalize="none" required maxlength="254"></label><label class="field full">密碼<input type="password" name="password" autocomplete="current-password" required maxlength="256"></label></div>`,async(values,form)=>{
   const password=values.password;if(form.elements?.password)form.elements.password.value='';
   const connected=await login(values.email,password);if(!connected)return false;
   D.toast('已讀取原 ERP 授權範圍內的真實資料。');return true;
  },'登入並讀取名冊');
 }
 D.isLiveView=(view,params={})=>['people','salary','my-payroll'].includes(view)||view==='documents'&&params.source!=='example';
 D.liveRosterInfo=()=>({connected:data.status==='connected',loading:data.status==='loading',employeeCount:data.status==='connected'?data.people.length:null,companies:data.session?.companies.map(c=>({...c,count:data.people.filter(p=>p.companyCode===c.code).length}))||[],accountLabel:data.session?`${data.session.user.display_name||'ERP 帳號'} · ${roleLabel(data.session.user.role)}`:'',error:data.error||''});
 D.liveRead=D.liveRosterInfo;
 D.liveAllowedModules=()=>{const modules=data.session?.access.modules;return data.status==='connected'&&Array.isArray(modules)?[...modules]:null;};
 // Embedded original modules share this tab's sessionStorage. Only an actual
 // changed session is reloaded; navigation signals must not create a load loop.
 D.refreshLiveSession=async()=>{
  if(!onPublishedHost())return false;
  const current=savedToken();
  if(!current){const changed=busy||enabled||token||data.status!=='disconnected'||data.session||data.people.length;++generation;busy=false;enabled=false;token='';clear();if(changed)refreshUI();return false;}
  if(manuallyHidden)return false;
  if(current===token&&(busy||data.status==='connected'))return data.status==='connected';
  return load(current);
 };
 D.livePanel=(view='people')=>{
  const back=`${FORMAL}#view=${({documents:'documents',salary:'payroll','my-payroll':'my-payroll'})[view]||'people'}`;
  const connected=data.status==='connected';
  const canRestore=onPublishedHost()&&savedToken();
  return `<section class="card live-source"><div class="row"><div><p class="eyebrow">原 ERP · 既有真實資料 · 唯讀</p><h2>${connected?E(data.session.user.display_name||'已登入 ERP 帳號'):manuallyHidden?'已隱藏本頁真實資料':data.status==='loading'?'正在讀取原有名冊':data.status==='error'?'暫時無法載入員工':'此分頁尚未登入，還沒載入員工'}</h2><p class="muted">${connected?`${E(roleLabel(data.session.user.role))} · 依實際登入帳號授權讀取；展示身分切換不會增加權限。`:manuallyHidden?`原 ERP 的員工資料仍然保留。${canRestore?'按「重新顯示員工」即可重新讀取。':'需要查看時，可使用原 ERP 帳號重新登入。'}`:'請在此頁使用原 ERP 的 email 與密碼登入，即可載入原有員工、公司、部門與職務。另一個分頁的登入不會自動帶入此頁。'}</p></div>${D.badge(connected?'已連接真實資料':data.status==='loading'?'正在讀取':manuallyHidden?'本頁已隱藏':data.status==='error'?'載入失敗':'此分頁尚未登入',connected?'green':'blue')}</div><div class="action-row">${connected?button('重新讀取','live-refresh')+button('隱藏本頁真實資料','live-disconnect'):manuallyHidden&&canRestore?button('重新顯示員工','live-refresh',true):button('使用 ERP 帳號登入','live-login',true)+(canRestore?button('讀取既有登入','live-refresh'):'')}<a class="btn" href="${back}">開啟原 ERP（同分頁）</a></div>${data.error?`<p class="notice amber" role="alert">${E(data.error)}；本頁沒有繼續顯示舊資料。</p>`:''}</section>`;
 };
 function blocked(view){return D.livePanel(view)+(data.status==='loading'?D.empty('正在讀取原 ERP 資料','這裡顯示實際帳號可見的內容，與示例角色分開。'):manuallyHidden?D.empty('真實資料已在本頁隱藏','原 ERP 的登入及員工資料未更動。'):D.empty('登入後查看既有資料','名冊沒有被刪除或換成假資料。示例流程會另外標示。'));}
 function sourceFoot(){return `<p class="muted space-top">資料來源：${E(data.session?.source?.name||'原 ERP 名冊')}${data.session?.source?.asOf?' · 名冊日期 '+E(data.session.source.asOf):''}。個別異動以 ERP 內已保存資料為準。<br>本頁只讀取；不更改任職公司、薪資歸屬、資料或權限。</p>`;}
 const filtered=()=>data.people.filter(p=>(!data.company||p.companyCode===data.company)&&(!data.employment||p.status===data.employment)&&(!data.query||[p.displayName,p.englishName,p.nativeName,p.employeeNumber,p.id,p.department,p.position].some(v=>String(v??'').toLocaleLowerCase().includes(data.query.toLocaleLowerCase()))));
 const number=p=>p.employeeNumber||'未提供';
 function filters(){const statuses=[...new Set(data.people.map(p=>p.status).filter(Boolean))];return `<form class="live-filters form-grid" data-live-filters><label class="field">實際授權公司${D.select('company',[['','全部授權公司'],...data.session.companies.map(c=>[c.code,c.name])],data.company,false)}</label><label class="field">任職狀態${D.select('employment',[['','全部狀態'],...statuses.map(s=>[s,s])],data.employment,false)}</label><label class="field full">搜尋姓名、員工編號、部門<input name="query" type="search" value="${E(data.query)}" autocomplete="off"></label><div class="action-row"><button type="submit" class="btn primary">套用篩選</button><button type="button" class="btn" data-action="live-clear-filters">清除篩選</button></div></form>`;}
 function detail(p){const manager=data.people.find(x=>x.id===p.managerId);const values=[['員工編號',number(p)],['任職／薪資公司',companyName(p.companyCode)],['姓名',p.nativeName||p.displayName],['英文姓名',p.englishName],['部門',p.department],['職務',p.position],['到職日期',p.joined],['離職日期',p.resigned],['直屬主管',manager?.displayName||p.managerId||'待設定'],['支援項目',Array.isArray(p.serviceProjects)?p.serviceProjects.join(' / '):'']];return `<div class="page-head"><div><p class="eyebrow">員工與組織 · 真實資料</p><h1>${E(p.displayName)}</h1><p class="lede">${E(number(p))} · ${E(companyName(p.companyCode))}</p></div><a class="btn" href="#view=people">返回員工清單</a></div>${D.livePanel('people')}<section class="card"><div class="row"><h2>原有任職資料</h2>${D.badge(p.status||'未提供',p.status==='在職'?'green':'neutral')}</div><dl class="live-details grid two">${values.map(([label,value])=>`<div><dt>${label}</dt><dd>${E(value||'未提供')}</dd></div>`).join('')}</dl><p class="notice">支援不同項目，不會自動改變任職公司或由哪家公司發薪。</p>${p.sourceSheet?`<p class="muted">原始工作表：${E(p.sourceSheet)}${p.sourceRow?' · 第 '+E(p.sourceRow)+' 列':''}${p.revision?' · 版本 '+E(p.revision):''}</p>`:''}</section>${sourceFoot()}`;}
 function people(params={}){
  const heading='<div class="page-head"><div><p class="eyebrow">行政人事 · 原 ERP 真實資料</p><h1>員工與組織</h1><p class="lede">沿用原本名冊、公司、部門與職務。此頁不混入流程示例中的假員工。</p></div></div>';
  if(data.status!=='connected')return heading+blocked('people');
  if(params.id){const p=data.people.find(p=>p.id===params.id);return p?detail(p):heading+D.livePanel('people')+D.empty('這位員工不在可見名冊內','請返回清單，或由管理員確認實際帳號授權。')+'<a class="btn" href="#view=people">返回清單</a>';}
  const rows=filtered(),active=rows.filter(p=>p.status==='在職').length;
  return heading+D.livePanel('people')+`<section class="card space-top">${filters()}</section><div class="grid three space-top"><div class="stat"><small>符合篩選的真實員工</small><strong>${rows.length}</strong></div><div class="stat"><small>在職</small><strong>${active}</strong></div><div class="stat"><small>已授權公司</small><strong>${data.session.companies.length}</strong><p>依原 ERP 帳號授權</p></div></div>${rows.length?`<section class="card table-wrap live-roster-desktop space-top"><table><thead><tr><th>員工</th><th>任職／薪資公司</th><th>部門</th><th>職務</th><th>支援項目</th><th>狀態</th><th></th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${E(p.displayName)}</strong><div class="muted">${E(number(p))}</div></td><td>${E(companyName(p.companyCode))}</td><td>${E(p.department||'未提供')}</td><td>${E(p.position||'未提供')}</td><td>${E(Array.isArray(p.serviceProjects)&&p.serviceProjects.length?p.serviceProjects.join(' / '):'待設定')}</td><td>${D.badge(p.status||'未提供',p.status==='在職'?'green':'neutral')}</td><td><a class="btn" href="#view=people&id=${encodeURIComponent(p.id)}">查看</a></td></tr>`).join('')}</tbody></table></section><div class="live-roster-mobile">${rows.map(p=>`<article class="card"><div class="row"><h3>${E(p.displayName)}</h3>${D.badge(p.status||'未提供',p.status==='在職'?'green':'neutral')}</div><p class="muted">${E(number(p))} · ${E(companyName(p.companyCode))}</p><p>${E(p.department||'部門未提供')} · ${E(p.position||'職務未提供')}</p><a class="btn" href="#view=people&id=${encodeURIComponent(p.id)}">查看任職資料</a></article>`).join('')}</div>`:D.empty('沒有符合篩選的員工','可調整公司、狀態或搜尋字詞；沒有自動補入假員工。')}${sourceFoot()}`;
 }
 const documentColumns=[['employmentContract','勞動合約'],['passport','護照'],['workPermit','工作許可'],['visa','簽證'],['confidentiality','保密協議'],['cv','履歷（原資料）']];
 function flag(doc,key){if(!Object.hasOwn(doc,key)||doc[key]===null||doc[key]==='')return D.badge('未提供','neutral');if(doc[key]===true)return D.badge('已確認有資料','green');if(doc[key]===false)return D.badge('待核對','amber');return `<span>${E(doc[key])}</span>`;}
 function documentValue(doc,key){return ['passport','workPermit','visa'].includes(key)?D.badge('尚未提供','neutral'):flag(doc,key);}
 function documents(params={}){
  const tabs=`<nav class="subnav"><a class="${params.source==='example'?'':'active'}" href="#view=documents">原有員工文件</a><a class="${params.source==='example'?'active':''}" href="#view=documents&source=example">證件期限與續辦示例</a></nav>`;
  if(params.source==='example')return tabs+`<div class="notice amber"><strong>以下是獨立流程示例。</strong>人物、證件與到期日都是假資料；跟進操作不會修改原名冊。<a href="#view=documents">返回原有員工文件 →</a></div>`+originalDocuments(params);
  const heading='<div class="page-head"><div><p class="eyebrow">行政人事</p><h1>證件與合約</h1><p class="lede">勞動合約、護照、工作許可、簽證與保密協議，依員工集中查看。</p></div><a class="btn primary" href="#view=documents&source=example">查看證件期限與續辦示例</a></div>';
  const workflow=`<section class="card"><div class="row"><div><h2>證件期限與續辦</h2><p class="muted">查看有效期限 → 跟進補件或續辦 → 收到新證件後更新期限。</p></div></div><div class="action-row">${documentColumns.filter(([key])=>key!=='cv').map(([,label])=>D.badge(label,'blue')).join('')}</div><p class="muted">原有文件註記保留在下方。到期提醒、續辦狀態與跟進紀錄可在示例中操作；尚未提供的真實證件與期限維持空缺。</p></section>`;
  if(data.status!=='connected')return heading+tabs+workflow+blocked('documents');
  const rows=filtered().filter(p=>p.documents);
  return heading+tabs+workflow+D.livePanel('documents')+`<section class="card space-top">${filters()}</section><div class="notice blue">以下是原名冊的文件註記，不代表已上傳檔案或已核對有效期限。護照、工作許可與簽證資料尚未提供，不用示例內容補入。</div>${rows.length?`<section class="card table-wrap live-roster-desktop"><table><thead><tr><th>員工／公司</th>${documentColumns.map(([,title])=>`<th>${title}</th>`).join('')}<th>有效期限</th></tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${E(p.displayName)}</strong><div class="muted">${E(companyName(p.companyCode))}</div></td>${documentColumns.map(([key])=>`<td>${documentValue(p.documents,key)}</td>`).join('')}<td>尚未提供</td></tr>`).join('')}</tbody></table></section><div class="live-roster-mobile">${rows.map(p=>`<article class="card"><h3>${E(p.displayName)}</h3><p class="muted">${E(companyName(p.companyCode))}</p>${documentColumns.map(([key,title])=>`<div class="row"><strong>${title}</strong>${documentValue(p.documents,key)}</div>`).join('')}<p class="notice">證件有效期限：尚未提供。</p></article>`).join('')}</div>`:D.empty('目前沒有可查看的文件註記','可能尚未提供，或此帳號沒有文件查看權限；不以示例資料代替。')}${sourceFoot()}`;
 }
 const hasPayrollAccess=()=>data.session?.access.modules?.includes('payroll')===true;
 const hasOwnPayroll=()=>!!data.session?.user.employee_id;
 const salaryVisible=()=>data.status!=='connected'||hasPayrollAccess()||hasOwnPayroll();
 function cleanPayroll(rows){
  const scope=new Set(data.session.companies.map(c=>c.code)),full=hasPayrollAccess(),ownId=data.session.user.employee_id;
  const keys=['id','employeeNumber','companyCode','displayName','department','position','status'];
  return rows.filter(p=>p&&typeof p==='object'&&scope.has(p.companyCode)&&(full||p.id===ownId)).map(p=>{
   const out=Object.fromEntries(keys.filter(k=>Object.hasOwn(p,k)).map(k=>[k,String(p[k]??'')]));
   for(const key of ['basicSalary','allowance','serviceCharge'])out[key]=typeof p[key]==='number'&&Number.isFinite(p[key])?p[key]:null;
   return out;
  });
 }
 async function loadPayroll(){
  if(!onPublishedHost()||data.status!=='connected'||(!hasPayrollAccess()&&!hasOwnPayroll()))return false;
  const currentToken=token,sessionGeneration=generation;
  if(savedToken()!==currentToken){void D.refreshLiveSession();return false;}
  const id=++payrollGeneration;
  payrollData={...payrollData,status:'loading',rows:[],error:''};
  try{
   const result=await call('payroll',currentToken);
   if(id!==payrollGeneration||sessionGeneration!==generation||data.status!=='connected'||currentToken!==token)return false;
   if(!Array.isArray(result.rows))throw Error('薪資資料格式不完整，請重新讀取。');
   payrollData={...payrollData,status:'connected',rows:cleanPayroll(result.rows),error:''};
   refreshUI();return true;
  }catch(error){
   if(id!==payrollGeneration||sessionGeneration!==generation)return false;
   payrollData={...payrollData,status:'error',rows:[],error:error.message};refreshUI();return false;
  }
 }
 const salaryValue=value=>value===null?'<span class="muted">未提供</span>':E(D.money(value));
 function salary(params={},ownOnly=false){
  const full=hasPayrollAccess()&&!ownOnly,ownId=data.session?.user.employee_id;
  const heading=`<div class="page-head"><div><p class="eyebrow">行政人事 · 原 ERP 真實資料</p><h1>${ownOnly||!full&&ownId?'我的薪資資料':'薪酬與社保'}</h1><p class="lede">依任職／薪資公司查看原有薪資基礎資料。支援其他項目不會改變發薪公司。</p></div></div>`;
  if(data.status!=='connected')return heading+blocked(ownOnly?'my-payroll':'salary');
  if(!hasPayrollAccess()&&!hasOwnPayroll()||ownOnly&&!ownId)return heading+D.empty('此帳號沒有薪資查看權限','依實際登入帳號授權顯示；切換示例身分不會取得薪資權限。');
  const tabs=hasPayrollAccess()&&ownId?`<nav class="subnav"><a href="#view=salary" class="${ownOnly?'':'active'}">授權公司薪資</a><a href="#view=my-payroll" class="${ownOnly?'active':''}">我的薪資資料</a></nav>`:'';
  const account=`<section class="card"><div class="row"><div><strong>${E(data.session.user.display_name||'已登入 ERP 帳號')}</strong><p class="muted">${full?'只顯示原 ERP 授權查看的員工薪資。':'只顯示實際登入帳號所綁定員工的薪資。'}</p></div>${button('重新讀取','live-payroll-refresh')}</div></section>`;
  if(payrollData.status==='idle')void loadPayroll();
  if(payrollData.status==='loading')return heading+tabs+account+D.empty('正在讀取原有薪資資料','不使用展示身分或假金額替代。');
  if(payrollData.status==='error')return heading+tabs+account+D.empty('暫時無法讀取薪資',E(payrollData.error));
  const visible=payrollData.rows.filter(p=>p.status==='在職'&&(full||p.id===ownId)),codes=[...new Set(visible.map(p=>p.companyCode))];
  const rows=visible.filter(p=>!full||!payrollData.company||p.companyCode===payrollData.company);
  const filters=full?`<form class="form-grid live-filters" data-live-payroll-filters><label class="field">薪資歸屬公司${D.select('company',[['','全部已授權薪資公司'],...codes.map(code=>[code,companyName(code)])],payrollData.company,false)}</label><div class="action-row"><button type="submit" class="btn primary">查看</button></div></form>`:'';
  const note='<div class="notice blue">這是名冊中的薪資基礎資料，尚未計算考勤、扣款、稅金、社保與實發薪資。服務費獨立列示，尚未併入計薪；此頁不會計薪或發薪。</div>';
  const columns=[['basicSalary','基本薪資'],['allowance','津貼'],['serviceCharge','服務費']];
  return heading+tabs+account+(filters?`<section class="card space-top">${filters}</section>`:'')+`<div class="grid three space-top"><div class="stat"><small>在職員工</small><strong>${rows.length}</strong></div><div class="stat"><small>基本薪資待補</small><strong>${rows.filter(p=>p.basicSalary===null).length}</strong></div><div class="stat"><small>薪資歸屬公司</small><strong>${new Set(rows.map(p=>p.companyCode)).size}</strong></div></div>`+note+(rows.length?`<section class="card table-wrap live-roster-desktop"><table><thead><tr><th>員工</th><th>薪資歸屬公司</th><th>職務</th>${columns.map(([,title])=>`<th>${title}</th>`).join('')}</tr></thead><tbody>${rows.map(p=>`<tr><td><strong>${E(p.displayName)}</strong><div class="muted">${E(p.employeeNumber||'未提供')}</div></td><td>${E(companyName(p.companyCode))}</td><td>${E(p.position||'未提供')}</td>${columns.map(([key])=>`<td>${salaryValue(p[key])}</td>`).join('')}</tr>`).join('')}</tbody></table></section><div class="live-roster-mobile">${rows.map(p=>`<article class="card"><h2>${E(p.displayName)}</h2><p class="muted">${E(companyName(p.companyCode))} · ${E(p.position||'職務未提供')}</p>${columns.map(([key,title])=>`<div class="row"><strong>${title}</strong><span>${salaryValue(p[key])}</span></div>`).join('')}</article>`).join('')}</div>`:D.empty('目前沒有可查看的在職薪資資料','可能尚未提供，或此帳號沒有對應員工／公司的薪資權限。'))+sourceFoot();
 }
 D.modules.salary={...D.modules.salary,pending:false,roles:Object.keys(D.roles),canView:salaryVisible,render:params=>salary(params)};
 D.register('my-payroll',{title:'我的薪資資料',group:'行政人事',nav:false,roles:Object.keys(D.roles),canView:()=>data.status!=='connected'||hasOwnPayroll(),render:params=>salary(params,true)});
 D.on('live-payroll-refresh',()=>load(token||savedToken()).catch(error=>D.toast(error.message)));
 document.addEventListener('submit',event=>{
  const form=event.target.closest?.('[data-live-payroll-filters]');if(!form)return;
  event.preventDefault();const values=Object.fromEntries(new FormData(form));
  payrollData.company=payrollData.rows.some(p=>p.companyCode===values.company)?values.company:'';refreshUI();
 });
 D.modules.people.render=people;D.modules.people.roles=Object.keys(D.roles);D.modules.people.canView=()=>true;
 D.modules.documents.render=documents;D.modules.documents.roles=Object.keys(D.roles);D.modules.documents.canView=()=>true;
 D.on('live-login',loginDialog);
 D.on('live-refresh',()=>load(token||savedToken()).catch(error=>D.toast(error.message)));
 D.on('live-disconnect',disconnect);
 D.on('live-clear-filters',()=>{data.company='';data.query='';data.employment='';refreshUI();});
 document.addEventListener('submit',event=>{
  const form=event.target.closest?.('[data-live-filters]');if(!form)return;
  event.preventDefault();const values=Object.fromEntries(new FormData(form));
  data.company=data.session?.companies.some(c=>c.code===values.company)?values.company:'';
  data.query=String(values.query||'').trim();data.employment=String(values.employment||'');refreshUI();
 });
 const priorBoot=D.boot.bind(D);
 D.boot=function(){
  priorBoot();
  if(onPublishedHost()&&savedToken())void load(savedToken()).catch(()=>{});
  const revalidate=()=>{if(enabled&&!busy&&document.visibilityState!=='hidden')void load(token||savedToken()).catch(()=>{});};
  window.addEventListener('focus',revalidate);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')revalidate();});
  // A same-tab visit to the original ERP shares sessionStorage. A BFCache
  // restore keeps this closure, so adopt the newly saved session explicitly.
  window.addEventListener('pageshow',event=>{
   if(!event.persisted||!onPublishedHost()||manuallyHidden)return;
   const current=savedToken();
   if(!current){++generation;busy=false;enabled=false;token='';clear();refreshUI();return;}
   if(busy&&current===token)return;
   void load(current).catch(()=>{});
  });
  // Revalidate visible real-data panels, including revoked or expired sessions.
  setInterval(()=>{if(D.isLiveView(D.route().view,D.route()))revalidate();},60000);
 };
})();
