/* Restore existing ERP modules in-place. The original application owns its
 * authentication, company permissions, forms and persistence. No records or
 * credentials are copied into the demonstration state or sent by postMessage. */
(()=>{
 'use strict';
 const D=window.D,E=D.esc.bind(D);
 const definitions=[
  ['home','home','工作首頁','總覽',true],
  ['overview','overview','經營總覽','總覽',false],
  ['approvals','approvals','申請與簽核','總覽',true],
  ['applications','applications','我的申請','總覽',false],
  ['people','people','員工與組織','行政人事',false],
  ['attendance','attendance','排班與考勤','行政人事',false],
  ['leave','personal','假勤申請','行政人事',true],
  ['performance','performance','考核管理','行政人事',true],
  ['salary','payroll','薪酬與社保','行政人事',false],
  ['my-payroll','my-payroll','我的薪資資料','行政人事',false],
  ['documents','documents','證件與合約','行政人事',true],
  ['personnel','changes','人事異動','行政人事',true],
  ['training','training','培訓與獎懲','行政人事',false],
  ['tasks','projects','專案交辦','行政人事',false],
  ['access','settings','報表與設定','行政人事',true],
  ['procurement','procurement','採購管理','採購與工程',true],
  ['engineering','engineering','工程與專案','採購與工程',true],
  ['customers','customers','客戶管理','採購與工程',false],
  ['vendors','vendors','供應商資料','採購與工程',false],
  ['files','files','文件管理','採購與工程',false],
  ['accounting','finance','財務會計','財務會計',true]
 ];
 const byDemo=new Map(definitions.map(x=>[x[0],x]));
 const byOriginal=new Map(definitions.map(x=>[x[1],x[0]]));
 const routeKeys=['view','tab','detail','company','from','to','month','report','dashboard','filter','department','status','parent'];
 const allowedViews=new Set([...byOriginal.keys(),'pms']);
 let frame=null,frameRoute='',lastAuth=null,frameReady=false,desiredRoute=null,pendingNavigation='';
 function cleanRoute(route){
  if(!route||typeof route!=='object'||!allowedViews.has(route.view))return null;
  const result={};for(const key of routeKeys){if(!Object.hasOwn(route,key)||route[key]==='')continue;if(typeof route[key]!=='string'||route[key].length>200||/[\u0000-\u001f\u007f]/.test(route[key]))return null;result[key]=route[key];}
  return result;
 }
 function keyOf(route){return new URLSearchParams(Object.keys(route).sort().map(k=>[k,route[k]])).toString();}
 function originalRoute(r){const def=byDemo.get(r.view);return cleanRoute({...r,view:def[1]});}
 function exampleMode(r=D.route()){return r.source==='example'&&D.hasExamples.has(r.view);}
 D.hasExamples=new Set(definitions.filter(x=>x[4]).map(x=>x[0]));
 const previousLive=D.isLiveView;
 D.isLiveView=(view,params={})=>byDemo.has(view)?!exampleMode({view,...params}):!!previousLive?.(view,params);
 function actualVisible(actual){const list=D.liveAllowedModules?.();return list===null||list===undefined||list.includes(actual);}
 function tabs(r){const def=byDemo.get(r.view);return `<section class="original-module-heading"><div><strong>${E(def[2])}</strong><span>${exampleMode(r)?'獨立示例 · 不變更原本資料':'原有功能與已保存資料 · 依原帳號權限操作'}</span></div><nav class="module-source-tabs" aria-label="${E(def[2])}資料模式"><a href="#view=${E(r.view)}" class="${exampleMode(r)?'':'active'}" ${exampleMode(r)?'':'aria-current="page"'}>原有功能</a>${def[4]?`<a href="#view=${E(r.view)}&source=example" class="${exampleMode(r)?'active':''}" ${exampleMode(r)?'aria-current="page"':''}>新增流程示例</a>`:''}</nav></section>`;}
 for(const [id,actual,title,group,hasExample]of definitions){
  const old=D.modules[id],exampleRender=old?.render,exampleAllowed=old?.canView,exampleRoles=old?.roles;
  if(!old)D.register(id,{title,group,roles:Object.keys(D.roles),render:()=>''});
  const m=D.modules[id];m.title=title;m.group=group;m.pending=id==='training';
  const canExample=role=>exampleAllowed?exampleAllowed(role):role==='admin'||!exampleRoles||exampleRoles.includes(role);
  m.canView=role=>exampleMode()?hasExample?(D.route().view===id||canExample(role)):actualVisible(actual):actualVisible(actual);
  m.render=params=>hasExample&&params.source==='example'?tabs(params)+(canExample(D.role)?(exampleRender?exampleRender.call(m,params):''):`<section class="card"><h2>選擇流程示範角色</h2><p>請使用上方「流程示範角色」，切換這項流程的經辦人或主管。示例不會修改原本資料。</p></section>`):'';
 }
 // Keep this node alive during roster revalidation and same-module navigation:
 // replacing an iframe would discard an unfinished original ERP form.
 D.renderExistingModule=function(r){
  document.body.classList.toggle('original-module-view',byDemo.has(r.view)&&!exampleMode(r));
  if(!byDemo.has(r.view)||exampleMode(r)){frame=null;frameRoute='';lastAuth=null;frameReady=false;desiredRoute=null;pendingNavigation='';return false;}
  const target=originalRoute(r)||{view:byDemo.get(r.view)[1]},routeKey=keyOf(target),main=document.querySelector('#main');desiredRoute=target;
  if(frame&&frame.isConnected){
   document.querySelector('#original-module-heading').innerHTML=tabs(r);
   if(frameReady&&frameRoute!==routeKey&&pendingNavigation!==routeKey){pendingNavigation=routeKey;frame.contentWindow.postMessage({type:'kyd:module',action:'navigate',route:target,replace:true},location.origin);}
  }else{
   const src='../?embed=meeting#'+new URLSearchParams(target);
   main.innerHTML=`<div id="original-module-heading">${tabs(r)}</div><div class="original-module-frame-wrap"><iframe id="original-module-frame" class="original-module-frame" title="${E(byDemo.get(r.view)[2])} · 原有系統" src="${E(src)}" allow="camera 'self'; geolocation 'self'"></iframe></div><p class="original-module-help">這是原本的完整操作頁，資料與儲存流程沿用原系統。<a id="original-module-full-page" href="../#${E(new URLSearchParams(target).toString())}">以完整頁面開啟 →</a></p>`;
   frame=document.querySelector('#original-module-frame');frameRoute=routeKey;lastAuth=null;frameReady=false;pendingNavigation='';
  }
  document.querySelector('#original-module-full-page').href='../#'+new URLSearchParams(target);frame.title=byDemo.get(r.view)[2]+' · 原有系統';document.title=byDemo.get(r.view)[2]+' · KYD ERP';return true;
 };
 window.addEventListener('message',event=>{
  if(!frame||event.origin!==location.origin||event.source!==frame.contentWindow||event.data?.type!=='kyd:module')return;
  const msg=event.data;if(!['ready','route','resize'].includes(msg.event))return;
  if(msg.event!=='resize'){
   const childRoute=cleanRoute(msg.route);if(!childRoute)return;
   const childKey=keyOf(childRoute);if(msg.event==='ready'){
    frameReady=true;
    if(desiredRoute&&keyOf(desiredRoute)!==childKey){pendingNavigation=keyOf(desiredRoute);frame.contentWindow.postMessage({type:'kyd:module',action:'navigate',route:desiredRoute,replace:true},location.origin);return;}
   }
   if(pendingNavigation&&childKey!==pendingNavigation)return;
   pendingNavigation='';frameRoute=childKey;desiredRoute=childRoute;
   const authChanged=typeof msg.authenticated==='boolean'&&msg.authenticated!==lastAuth;if(authChanged)lastAuth=msg.authenticated;
   const demoView=byOriginal.get(childRoute.view);
   if(!demoView){if(childRoute.view==='pms')D.go('pms');return;} // Keep the confirmed external PMS entry.
   const parentRoute={...childRoute,view:demoView};
   history.replaceState(null,'','#'+new URLSearchParams(parentRoute));
   document.querySelector('#original-module-heading').innerHTML=tabs(parentRoute);
   document.querySelector('#original-module-full-page').href='../#'+new URLSearchParams(childRoute);
   frame.title=byDemo.get(demoView)[2]+' · 原有系統';document.title=byDemo.get(demoView)[2]+' · KYD ERP';D.renderNav();
   if(authChanged)void D.refreshLiveSession?.();
  }
 });
 // Existing example links remain in the example until the user selects the
 // explicit original-function tab. Business actions retain their own guards.
 document.addEventListener('click',event=>{
  const a=event.target.closest?.('#main a[href^="#view="]');if(!a||!exampleMode()||a.closest?.('.module-source-tabs'))return;
  const dest=Object.fromEntries(new URLSearchParams(a.getAttribute('href').slice(1)));
  if(D.hasExamples.has(dest.view)&&!dest.source){event.preventDefault();D.go(dest.view,{...dest,source:'example'});}
 });
})();
