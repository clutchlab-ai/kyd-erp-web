/* Display-only translations for the meeting workspace. No network or business-state writes. */
(()=>{
 'use strict';
 const D=window.D,KEY='wharton-cibif-locale-v2',LANGS=['zh-Hans','zh-Hant','en','km'];
 const names={'zh-Hans':'简体中文','zh-Hant':'繁體中文',en:'English',km:'ខ្មែរ'};
 const normalize=value=>value==='zh'?'zh-Hant':LANGS.includes(value)?value:'zh-Hans';
 let language='zh-Hans';try{language=normalize(localStorage.getItem(KEY));}catch{}
 const toSimplified=window.OpenCC.Converter({from:'tw',to:'cn'});
 // Display terminology only: persisted records and submitted option values stay unchanged.
 const mainland=source=>toSimplified(String(source))
  .replace(/示范资料/g,'演示数据').replace(/资料/g,'数据')
  .replace(/请款/g,'付款申请').replace(/签核|核准/g,'审批').replace(/假勤申请/g,'请假申请')
  .replace(/设定/g,'设置').replace(/合约/g,'合同').replace(/传票/g,'凭证').replace(/零用金/g,'备用金')
  .replace(/汇入/g,'导入').replace(/开启/g,'打开').replace(/讯号/g,'信号').replace(/即时/g,'实时')
  .replace(/预设/g,'预置').replace(/重工/g,'返工').replace(/人资/g,'人事')
  .replace(/帐/g,'账').replace(/纪录/g,'记录').replace(/模组/g,'模块').replace(/储存/g,'保存')
  .replace(/新增/g,'添加').replace(/建立/g,'创建').replace(/专案/g,'项目').replace(/资讯/g,'信息')
  .replace(/营运/g,'运营').replace(/串接/g,'对接').replace(/档案/g,'文件');
 const textSources=new WeakMap(),attributeSources=new WeakMap(),explicitProtected=new Set();
 const exact=new Map(),actionExact=new Map(),templates=[],nameValues=new Set(),freeValues=new Set();
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
  exact.clear();actionExact.clear();templates.length=0;
  for(const [zh,en,km] of rows(window.SFM_I18N))if(zh&&en&&km){exact.set(zh,{en,km});exact.set(mainland(zh),{en,km});}
  for(const [zh,en,km] of rows(window.SFM_I18N_TEMPLATES)){
   if(!zh||!en||!km)continue;
   const parts=[],keys=[],ui=[],numeric=[];let cursor=0;const pattern=/\{([A-Za-z_]\w*|\d+)(:ui|:num)?\}/g;let m;
   while((m=pattern.exec(zh))){parts.push(regexEscape(zh.slice(cursor,m.index)),m[2]===':num'?'([+-]?[0-9]+(?:[.,][0-9]+)*)':'([\\s\\S]*?)');keys.push(m[1]);ui.push(m[2]===':ui');numeric.push(m[2]===':num');cursor=m.index+m[0].length;}
   if(!keys.length){exact.set(zh,{en,km});continue;}
   parts.push(regexEscape(zh.slice(cursor)));
   // Require literal UI context; an all-placeholder entry must never match user data.
   const literal=zh.replace(pattern,'').replace(/[\s·:：/／→—,，.。()%％\[\]（）-]/g,'');
   if(literal.length<(numeric.every(Boolean)?1:2))continue;
   templates.push({zh,en,km,keys,ui,regex:new RegExp('^'+parts.join('')+'$'),literalLength:zh.length-keys.length*4});
  }
  for(const [zh,en,km] of rows(window.SFM_I18N_ACTIONS))if(zh&&en&&km){actionExact.set(zh,{en,km});actionExact.set(mainland(zh),{en,km});}
  templates.sort((a,b)=>b.literalLength-a.literalLength);
  exact.set('重新演示',{en:'Restart demo',km:'កំណត់គំរូឡើងវិញ'});
 }
 const dataKeys=/^(?:name|employeeName|requester|vendor|contact|label|location|site|instructor|title|note|notes|reason|target|description|evidence|answer|comment|comments|remark|remarks|handover|change|summary|url|filename|fileName|email|address|phone|passport|number|documentNumber)$/;
 const identityKeys=/^(?:name|employeeName|requester|vendor|companyName|legalName|display_name|displayName|fullName|full_name)$/;
 // Read-only workflow snapshots retain their original fixture provenance. Only the
 // same seed record and unchanged field value may translate; new user rows never match.
 function fixtureSourcePath(path){
  const appliedTitle=path.match(/^(personnelContent\.rows\.[^.]+)\.(before|after)\.title$/);
  if(appliedTitle){const source=appliedTitle[1]+'.data.position';return appliedTitle[2]==='after'&&Object.hasOwn(window.SFM_I18N_FIXTURE_BASELINE||{},source)?source:appliedTitle[1]+'.baseline.title';}
  return path.replace(/^(kpiPlans\.[^.]+)\.confirmation\.goals\./,'$1.goals.')
   .replace(/^(personnelContent\.rows\.[^.]+)\.(?:submittedVersion|approvedVersion)\.(reason|data\..+)$/,'$1.$2')
   .replace(/^(hrRequests\.[^.]+)\.(?:approvedVersion|approvalHistory\.[^.]+\.version)\.reason$/,'$1.reason');
 }
 function collectProtected(){
  nameValues.clear();freeValues.clear();
  const visited=new WeakSet(),generatedFixtures=new Map();
  // Configured shift, account and material labels are UI vocabulary, not personal identities.
  const semanticField=path=>/^(?:attendanceDemo\.shifts\.[^.]+|accountingContents\.books\.[^.]+\.accounts\.[^.]+|factoryPreview\.materials\.[^.]+|factoryPreview\.reports\.[^.]+\.materials\.[^.]+)\.name$/.test(path)||/^(?:people|personnelContent\.profiles)\.[^.]+\.title$/.test(path);
  function scan(value,key='',depth=0,path=''){
   if(depth>12||value==null)return;
   if(typeof value==='string'){const sourcePath=fixtureSourcePath(path),knownFixture=window.SFM_I18N_FIXTURE_BASELINE?.[sourcePath]===value||generatedFixtures.get(sourcePath)===value;if(!semanticField(path)&&!knownFixture){if(identityKeys.test(key)&&value.trim())nameValues.add(value.trim());if(dataKeys.test(key)&&value.trim())freeValues.add(value.trim());}return;}
   if(typeof value!=='object'||visited.has(value))return;visited.add(value);
   // Forms mark only untouched built-in reason/note defaults, never arbitrary user text.
   for(const field of ['reason','note'])if(typeof value[field]==='string'&&value._fixtureDefaults?.[field]===value[field])generatedFixtures.set(path+'.'+field,value[field]);
   if(Array.isArray(value))value.forEach((v,i)=>scan(v,key,depth+1,path+'.'+(v&&typeof v==='object'&&typeof v.id==='string'?'@'+encodeURIComponent(v.id):i)));else for(const [k,v] of Object.entries(value))if(k!=='_fixtureDefaults')scan(v,k,depth+1,path?path+'.'+k:k);
  }
  scan(D.state);for(const p of Object.values(D.roles||{}))if(p.name)nameValues.add(p.name);
  for(const value of explicitProtected){nameValues.add(value);freeValues.add(value);}
 }
 const protectedValue=(value,free=false)=>nameValues.has(value)||explicitProtected.has(value)||(free&&freeValues.has(value));
 function translate(source,{free=false,depth=0,context=''}={}){
  const raw=String(source??'');if(language==='zh-Hans')return mainland(raw);if(language==='zh-Hant'||!raw.trim()||depth>4)return raw;
  const value=raw.trim(),prefix=raw.slice(0,raw.indexOf(value)),suffix=raw.slice(raw.indexOf(value)+value.length);
  if(protectedValue(value,free))return raw;
  const match=(context==='action'&&actionExact.get(value))||exact.get(value);if(match)return prefix+match[language]+suffix;
  if(value.length<=5000)for(const template of templates){
   const found=template.regex.exec(value);if(!found)continue;
   const args={};template.keys.forEach((key,i)=>args[key]=translate(found[i+1],{free:!template.ui[i],depth:depth+1}));
   return prefix+template[language].replace(/\{([A-Za-z_]\w*|\d+)(?::ui|:num)?\}/g,(full,key)=>Object.hasOwn(args,key)?args[key]:full)+suffix;
  }
  // Navigation/checklist symbols decorate complete labels; preserve symbols while translating labels.
  const arrow=value.match(/^([←→↑↓✓○·・]\s+)([\s\S]+)$|^([\s\S]+?)(\s+[←→↑↓✓○])$/);
  if(arrow){const label=arrow[2]||arrow[3],translated=translate(label,{free,depth:depth+1});if(translated!==label)return prefix+(arrow[1]||'')+translated+(arrow[4]||'')+suffix;}
  // A known UI label can precede a stored record title; keep the title data-protected.
  const labelled=value.match(/^([^：:\n]+)([：:]\s*)([\s\S]+)$/);
  if(labelled&&exact.has(labelled[1])&&!protectedValue(labelled[1]))return prefix+translate(labelled[1],{depth:depth+1})+labelled[2]+translate(labelled[3],{free:true,depth:depth+1})+suffix;
  // A colon can be its own label prefix after an adjacent element. Keep it intact.
  const colon=value.match(/^([：:]\s*)(\S[\s\S]*)$/);
  if(colon){const tail=translate(colon[2],{free,depth:depth+1});if(tail!==colon[2])return prefix+colon[1]+tail+suffix;}
  // These delimiters join independently rendered labels/names. Never replace words inside prose.
  // Split outer composition first, so a title containing its own separator still
  // gets an exact lookup (for example a goal title followed by its date range).
  for(const separator of [/(\s+·\s+)/,/(\s*・\s*)/,/(\s+→\s+)/,/(\s*｜\s*)/,/(\s+\/\s+)/,/(\n)/]){
   const pieces=value.split(separator);
   if(pieces.length>1){const output=pieces.map((part,i)=>i%2?part:translate(part,{free,depth:depth+1})).join('');if(output!==value)return prefix+output+suffix;}
  }
  return raw;
 }
 function isIgnored(el){return !el||!!el.closest('script,style,noscript,textarea,input,[contenteditable]:not([contenteditable="false"]),[data-i18n-ignore],[translate="no"],.i18n-control')||(language!=='zh-Hans'&&!!el?.closest('.phone-avatar,svg'));}
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
  const el=node.parentElement;if(!node.nodeValue?.trim())return;
  // Chinese role initials are decorative. Other languages use a neutral marker;
  // the adjacent full role label supplies the translated, accessible identity.
  if(el?.closest('.phone-avatar')){el.closest('.phone-avatar').setAttribute('aria-hidden','true');const current=node.nodeValue,source=sourceFor(textSources,node,current),next=language==='zh-Hans'?mainland(source):language==='zh-Hant'?source:/[\u3400-\u9fff]/.test(source)?'●':source;textSources.set(node,{source,last:next});if(current!==next)node.nodeValue=next;return;}
  if(isIgnored(el))return;
  const current=node.nodeValue,source=sourceFor(textSources,node,current),next=translate(source,{free:isData(el),context:el.closest('button,#modal-title')?'action':''});
  textSources.set(node,{source,last:next});if(current!==next)node.nodeValue=next;
 }
 function applyAttributes(el){
  if(el.matches('script,style,noscript,[data-i18n-ignore],[translate="no"],.i18n-control')||el.closest('.i18n-control,[data-i18n-ignore],[translate="no"]'))return;
  let saved=attributeSources.get(el);if(!saved){saved=new Map();attributeSources.set(el,saved);}
  for(const attr of translatedAttributes){
   if(!el.hasAttribute(attr))continue;if(attr==='label'&&!['OPTION','OPTGROUP'].includes(el.tagName))continue;
   const current=el.getAttribute(attr),prev=saved.get(attr),source=prev&&current===prev.last?prev.source:current,next=translate(source,{context:el.matches('button')?'action':''});
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
 D.t=(value,options)=>translate(value,options);
 document.addEventListener('change',event=>{if(!event.target?.matches?.('select[data-ui-language]'))return;event.stopPropagation();setLanguage(event.target.value);},true);
 window.addEventListener('storage',event=>{if(event.key===KEY){language=normalize(event.newValue);apply();}});
 // Wrap the outermost renderers after mobile-shell, leaving business objects and inputs untouched.
 for(const method of ['render','modal','toast'])if(typeof D[method]==='function'){
  const previous=D[method].bind(D);D[method]=function(...args){const result=previous(...args);apply();return result;};
 }
 loadCatalogs();if(typeof MutationObserver==='function')observer=new MutationObserver(schedule);apply();
})();
