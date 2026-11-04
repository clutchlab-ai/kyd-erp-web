/* Display-only translations for the meeting workspace. No network or business-state writes. */
(()=>{
 'use strict';
 const D=window.D,KEY='kyd-demo-locale-v1',LANGS=['zh-Hant','en','km'];
 const names={'zh-Hant':'繁體中文',en:'English',km:'ខ្មែរ'};
 const normalize=value=>value==='zh'?'zh-Hant':LANGS.includes(value)?value:'zh-Hant';
 let language='zh-Hant';try{language=normalize(localStorage.getItem(KEY));}catch{}
 const textSources=new WeakMap(),attributeSources=new WeakMap(),explicitProtected=new Set();
 const exact=new Map(),templates=[],nameValues=new Set(),freeValues=new Set();
 let applying=false,scheduled=false,disposed=false,titleSource='',titleLast='';
 function rows(input,out=[]){
  if(Array.isArray(input)){if(input.length===3&&input.every(x=>typeof x==='string'))out.push(input);else input.forEach(x=>rows(x,out));}
  else if(input&&typeof input==='object'){
   if(typeof input.zh==='string'&&typeof input.en==='string'&&typeof input.km==='string')out.push([input.zh,input.en,input.km]);
   else for(const [key,value] of Object.entries(input)){if(Array.isArray(value)&&value.length===2&&value.every(x=>typeof x==='string'))out.push([key,...value]);else rows(value,out);}
  }
  return out;
 }
 const regexEscape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 function loadCatalogs(){
  exact.clear();templates.length=0;
  for(const [zh,en,km] of rows(window.KYD_I18N))if(zh&&en&&km)exact.set(zh,{en,km});
  for(const [zh,en,km] of rows(window.KYD_I18N_TEMPLATES)){
   if(!zh||!en||!km)continue;
   const parts=[],keys=[],ui=[];let cursor=0;const pattern=/\{([A-Za-z_]\w*|\d+)(:ui)?\}/g;let m;
   while((m=pattern.exec(zh))){parts.push(regexEscape(zh.slice(cursor,m.index)),'([\\s\\S]*?)');keys.push(m[1]);ui.push(!!m[2]);cursor=m.index+m[0].length;}
   if(!keys.length){exact.set(zh,{en,km});continue;}
   parts.push(regexEscape(zh.slice(cursor)));
   // Require literal UI context; an all-placeholder entry must never match user data.
   if(zh.replace(pattern,'').replace(/[\s·:：/／→—,，.。()%％\[\]（）-]/g,'').length<2)continue;
   templates.push({zh,en,km,keys,ui,regex:new RegExp('^'+parts.join('')+'$'),literalLength:zh.length-keys.length*4});
  }
  templates.sort((a,b)=>b.literalLength-a.literalLength);
 }
 const dataKeys=/^(?:name|employeeName|requester|vendor|contact|title|note|notes|reason|target|description|evidence|answer|comment|comments|remark|remarks|handover|change|summary|url|filename|fileName|email|address|phone|passport|number|documentNumber)$/;
 const identityKeys=/^(?:name|employeeName|requester|vendor|companyName|legalName|display_name|displayName|fullName|full_name)$/;
 function collectProtected(){
  nameValues.clear();freeValues.clear();
  const visited=new WeakSet();
  function scan(value,key='',depth=0){
   if(depth>12||value==null)return;
   if(typeof value==='string'){if(identityKeys.test(key)&&value.trim())nameValues.add(value.trim());if(dataKeys.test(key)&&value.trim())freeValues.add(value.trim());return;}
   if(typeof value!=='object'||visited.has(value))return;visited.add(value);
   if(Array.isArray(value))value.forEach(v=>scan(v,key,depth+1));else for(const [k,v] of Object.entries(value))scan(v,k,depth+1);
  }
  scan(D.state);for(const p of Object.values(D.roles||{}))if(p.name)nameValues.add(p.name);
  for(const value of explicitProtected){nameValues.add(value);freeValues.add(value);}
 }
 const protectedValue=(value,free=false)=>nameValues.has(value)||explicitProtected.has(value)||(free&&freeValues.has(value));
 function translate(source,{free=false,depth=0}={}){
  const raw=String(source??'');if(language==='zh-Hant'||!raw.trim()||depth>4)return raw;
  const value=raw.trim(),prefix=raw.slice(0,raw.indexOf(value)),suffix=raw.slice(raw.indexOf(value)+value.length);
  if(protectedValue(value,free))return raw;
  const match=exact.get(value);if(match)return prefix+match[language]+suffix;
  if(value.length<=5000)for(const template of templates){
   const found=template.regex.exec(value);if(!found)continue;
   const args={};template.keys.forEach((key,i)=>args[key]=translate(found[i+1],{free:!template.ui[i],depth:depth+1}));
   return prefix+template[language].replace(/\{([A-Za-z_]\w*|\d+)(?::ui)?\}/g,(full,key)=>Object.hasOwn(args,key)?args[key]:full)+suffix;
  }
  // A colon can be its own label prefix after an adjacent element. Keep it intact.
  const colon=value.match(/^([：:]\s*)(\S[\s\S]*)$/);
  if(colon){const tail=translate(colon[2],{free,depth:depth+1});if(tail!==colon[2])return prefix+colon[1]+tail+suffix;}
  // These delimiters join independently rendered labels/names. Never replace words inside prose.
  const pieces=value.split(/(\s+·\s+|\s*・\s*|\s+→\s+|\s+\/\s+|\n)/);
  if(pieces.length>1){const output=pieces.map((part,i)=>i%2?part:translate(part,{free:false,depth:depth+1})).join('');if(output!==value)return prefix+output+suffix;}
  return raw;
 }
 function isIgnored(el){return !el||!!el.closest('script,style,noscript,textarea,input,[contenteditable]:not([contenteditable="false"]),[data-i18n-ignore],[translate="no"],.i18n-control,.phone-avatar,svg');}
 function isData(el){
  if(el.closest('[data-i18n-ui]'))return false;
  // Record titles are rendered inside page-head; protect exact stored text before UI ancestry.
  if(el.closest('h1,[data-i18n-value]'))return true;
  if(el.closest('button,label,option,optgroup,.badge,.nav-item,.subnav,.page-head,.section-title,.phone-title,.phone-switch-label,.stat,.metric'))return false;
  return !!el.closest('p,td,dd,.notice,.timeline,.phone-person,.phone-role-card,.context-strip,.phone-task,h2,h3,h4');
 }
 function sourceFor(map,node,current){const previous=map.get(node);return previous&&current===previous.last?previous.source:current;}
 const translatedAttributes=['title','aria-label','placeholder','data-mobile-label','label'];
 function applyText(node){
  const el=node.parentElement;if(isIgnored(el)||!node.nodeValue?.trim())return;
  const current=node.nodeValue,source=sourceFor(textSources,node,current),next=translate(source,{free:isData(el)});
  textSources.set(node,{source,last:next});if(current!==next)node.nodeValue=next;
 }
 function applyAttributes(el){
  if(el.matches('script,style,noscript,[data-i18n-ignore],[translate="no"],.i18n-control')||el.closest('.i18n-control,[data-i18n-ignore],[translate="no"]'))return;
  let saved=attributeSources.get(el);if(!saved){saved=new Map();attributeSources.set(el,saved);}
  for(const attr of translatedAttributes){
   if(!el.hasAttribute(attr))continue;if(attr==='label'&&!['OPTION','OPTGROUP'].includes(el.tagName))continue;
   const current=el.getAttribute(attr),prev=saved.get(attr),source=prev&&current===prev.last?prev.source:current,next=translate(source);
   saved.set(attr,{source,last:next});if(next!==current)el.setAttribute(attr,next);
  }
  // An option without value derives its submitted value from its label. Freeze it first.
  if(el.tagName==='OPTION'&&!el.hasAttribute('value'))el.setAttribute('value',el.textContent);
 }
 function createControl(location){
  const wrapper=document.createElement('label');wrapper.className='i18n-control i18n-'+location;wrapper.setAttribute('data-i18n-ignore','');
  const icon=document.createElement('span');icon.className='i18n-globe';icon.setAttribute('aria-hidden','true');icon.textContent='◎';wrapper.append(icon);
  const select=document.createElement('select');select.setAttribute('data-ui-language','');select.setAttribute('aria-label','Language / 語言 / ភាសា');
  for(const value of LANGS){const option=document.createElement('option');option.value=value;option.textContent=names[value];select.append(option);}
  select.value=language;wrapper.append(select);return wrapper;
 }
 function controls(){
  for(const [selector,where] of [['.context-controls','desktop'],['.phone-topline','mobile'],['#modal[open] .modal-heading','modal']]){
   const host=document.querySelector(selector);if(host&&!host.querySelector('.i18n-control')){
    const control=createControl(where);
    if(where==='modal'){const close=host.querySelector('button');close?host.insertBefore(control,close):host.append(control);}else host.append(control);
   }
  }
  for(const select of document.querySelectorAll('select[data-ui-language]'))if(select.value!==language)select.value=language;
 }
 let observer;
 function apply(root=document.body){
  if(disposed||applying||!root)return;applying=true;observer?.disconnect();
  try{
   collectProtected();controls();document.documentElement.lang=language;document.documentElement.setAttribute('data-locale',language);
   if(root.nodeType===3)applyText(root);
   else{
    if(root.nodeType===1)applyAttributes(root);
    const walker=document.createTreeWalker(root,5);let node;
    while((node=walker.nextNode()))node.nodeType===3?applyText(node):applyAttributes(node);
   }
   const current=document.title;if(current!==titleLast)titleSource=current;
   const nextTitle=translate(titleSource);if(current!==nextTitle)document.title=nextTitle;titleLast=nextTitle;
  }finally{applying=false;observe();}
 }
 function schedule(){if(disposed||scheduled||applying)return;scheduled=true;queueMicrotask(()=>{scheduled=false;apply();});}
 function observe(){if(disposed)return;observer?.observe(document.documentElement,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:[...translatedAttributes,'open']});}
 function setLanguage(value){
  const next=normalize(value);language=next;try{localStorage.setItem(KEY,next);}catch{}
  apply();return next;
 }
 D.i18n={get language(){return language},setLanguage,t:translate,apply,reloadCatalogs(){loadCatalogs();apply();},protect(value){if(value!=null&&String(value).trim())explicitProtected.add(String(value).trim());return value;},mark(el){el?.setAttribute?.('data-i18n-ignore','');return el;},languages:{...names},destroy(){disposed=true;observer?.disconnect();}};
 D.t=(value)=>translate(value);
 document.addEventListener('change',event=>{if(!event.target?.matches?.('select[data-ui-language]'))return;event.stopPropagation();setLanguage(event.target.value);},true);
 window.addEventListener('storage',event=>{if(event.key===KEY){language=normalize(event.newValue);apply();}});
 // Wrap the outermost renderers after mobile-shell, leaving business objects and inputs untouched.
 for(const method of ['render','modal','toast'])if(typeof D[method]==='function'){
  const previous=D[method].bind(D);D[method]=function(...args){const result=previous(...args);apply();return result;};
 }
 loadCatalogs();if(typeof MutationObserver==='function')observer=new MutationObserver(schedule);apply();
})();
