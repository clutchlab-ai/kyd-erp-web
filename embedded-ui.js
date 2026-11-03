/* Reuse the original ERP inside its same-origin meeting workspace.
 * This bridge carries navigation and layout metadata only, never credentials
 * or employee/business payloads. Server permissions remain authoritative.
 */
(()=>{
 'use strict';
 const CHANNEL='kyd:module';
 const views=new Set(['home','people','attendance','personal','performance','payroll','documents','changes','training','projects','applications','settings','finance','procurement','pms','engineering','customers','vendors','files','approvals','overview','my-payroll']);
 const routeKeys=['view','tab','detail','company','from','to','month','report','dashboard','filter','department','status','parent'];
 const aliases={approval:'approvals',project:'engineering',suppliers:'procurement'};
 let parentWindow,origin;
 try{
  if(new URLSearchParams(location.search).get('embed')!=='meeting'||window.parent===window)return;
  parentWindow=window.parent;origin=location.origin;
  const parentURL=new URL(parentWindow.location.href);
  if(parentURL.origin!==origin)return;
  const local=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
  const allowedParent=parentURL.pathname==='/kyd-erp-web/demo/'||parentURL.pathname==='/kyd-erp-web/demo/index.html'||local&&(parentURL.pathname==='/demo/'||parentURL.pathname==='/demo/index.html');
  if(!allowedParent)return;
 }catch{return;}
 document.documentElement.classList.add('kyd-embedded');
 function cleanRoute(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return null;
  const view=aliases[value.view]||value.view||'home';
  if(!views.has(view))return null;
  const out={view};
  for(const key of routeKeys.slice(1)){
   if(!Object.hasOwn(value,key)||value[key]==='')continue;
   if(typeof value[key]!=='string'||value[key].length>200||/[\u0000-\u001f\u007f]/.test(value[key]))return null;
   out[key]=value[key];
  }
  return out;
 }
 const currentRoute=()=>cleanRoute(Object.fromEntries(new URLSearchParams(location.hash.slice(1))))||{view:'home'};
 const height=()=>Math.min(20000,Math.max(240,Math.ceil(document.body?.scrollHeight||0),Math.ceil(document.documentElement.scrollHeight||0)));
 let ready=false,lastAuth=null,lastHeight=0,lastRoute='',scheduled=false;
 function authenticated(){
  if(document.querySelector('#app .layout'))return true;
  if(document.querySelector('#app [data-form="login"]'))return false;
  return null;
 }
 function emit(event,extra={}){parentWindow.postMessage({type:CHANNEL,event,...extra},origin);}
 function emitRoute(event='route'){
  const auth=authenticated();if(auth===null)return;
  const route=currentRoute();lastAuth=auth;lastRoute=JSON.stringify(route);
  emit(event,{route,authenticated:auth,height:height()});
 }
 function measure(){
  scheduled=false;
  const auth=authenticated(),route=JSON.stringify(currentRoute());
  if(auth!==null&&!ready){ready=true;emitRoute('ready');}
  else if(auth!==null&&(auth!==lastAuth||route!==lastRoute))emitRoute();
  const next=height();if(next!==lastHeight){lastHeight=next;emit('resize',{height:next});}
 }
 function schedule(){if(scheduled)return;scheduled=true;window.requestAnimationFrame(measure);}
 window.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==parentWindow||!event.data||event.data.type!==CHANNEL)return;
  if(event.data.action==='resize'){measure();return;}
  if(event.data.action!=='navigate')return;
  const route=cleanRoute(event.data.route);if(!route)return;
  const hash='#'+new URLSearchParams(route).toString();
  if(location.hash===hash){emitRoute();schedule();return;}
  if(event.data.replace===true){history.replaceState(null,'',location.pathname+location.search+hash);window.dispatchEvent(new Event('hashchange'));}
  else location.hash=hash;
 });
 window.addEventListener('hashchange',()=>{emitRoute();schedule();});
 window.addEventListener('resize',schedule);
 window.addEventListener('pageshow',schedule);
 const observer=new MutationObserver(schedule);
 const app=document.querySelector('#app');
 if(app)observer.observe(app,{childList:true,subtree:true});
 const dialog=document.querySelector('#dialog');
 if(dialog)observer.observe(dialog,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});
 if(typeof ResizeObserver==='function'&&document.body)new ResizeObserver(schedule).observe(document.body);
 schedule();
})();
