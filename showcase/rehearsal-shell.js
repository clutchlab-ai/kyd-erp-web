/* Shared exhibition navigation. Business records and approval rules remain unchanged. */
(()=>{
 'use strict';
 const D=window.D,E=v=>D.esc(v??''),blocked=new Set(['pms']);
 const companyName=code=>(D.state.showcase?.companies||[]).find(c=>c.id===code)?.name||({SFM:'暹光製造示範廠',SMC:'暹光材料示範公司'})[code]||code;
 D.showcaseCompanyName=companyName;
 const allowed=D.allowed.bind(D);D.allowed=id=>!blocked.has(id)&&allowed(id);
 for(const id of blocked)if(D.modules[id])D.modules[id].nav=false;
 if(D.modules.factory)D.modules.factory.navTitle='工廠管理';
 for(const id of ['factory-orders','factory-inventory','factory-report'])if(D.modules[id]){D.modules[id].nav=false;D.modules[id].navParent='factory';}
 if(D.modules['my-payroll'])D.modules['my-payroll'].navParent='salary';
 // Finance already has a single public module and keeps its existing worksheet navigation.
 for(const m of Object.values(D.modules))if(m.group==='財務會計'&&m.id!=='accounting'){m.nav=false;m.navParent='accounting';}
 const attendance=D.modules.attendance;
 if(attendance){const render=attendance.render;attendance.render=function(...args){return render.apply(this,args).replace(/<a\b[^>]*href="#view=attendance&tab=clock"[^>]*>使用正式打卡[^<]*<\/a>/g,'').replace('此頁不開啟 GPS 或相機；定位及拍照請使用正式打卡入口。','離線打卡演示不啟用定位或拍照。');};}
 // Associate app routes with browser-history entries so Back follows the actual origin.
 const historyKey='whartonRehearsalEntry',entries=[];let cursor=-1,serial=0;
 function currentHash(){return location.hash||'#view=home';}
 function stamp(){const state=history.state&&typeof history.state==='object'?history.state:{};const known=entries.findIndex(x=>x.key===state[historyKey]);if(known>=0){cursor=known;entries[cursor].hash=currentHash();return;}entries.splice(cursor+1);const item={key:'entry-'+(++serial),hash:currentHash()};entries.push(item);cursor=entries.length-1;history.replaceState({...state,[historyKey]:item.key},'',item.hash);}
 function usable(hash){const r={view:'home',...Object.fromEntries(new URLSearchParams(hash.replace(/^#/,'')))};return D.allowed(r.view);}
 function prior(){for(let i=cursor-1;i>=0;i--)if(usable(entries[i].hash))return i;return -1;}
 function fallback(){const r=D.route(),base=D.mobileReturnRoute?.(r)||{view:'home'};return D.allowed(base.view)?base:{view:'home'};}
 function back(){D.mobileConfirmDiscard(()=>{D.closeModal();const index=prior();if(index>=0){history.go(index-cursor);return;}const {view,...params}=fallback();D.go(view,params);if(currentHash()==='#view=home')D.render();});}
 D.rehearsalBack=back;
 D.on('rehearsal-back',back);D.on('mobile-back',back);
 D.on('rehearsal-home',()=>D.mobileConfirmDiscard(()=>{D.closeModal();D.go('home');D.render();}));
 window.addEventListener('hashchange',stamp);stamp();
 function navigation(){
  const r=D.route(),m=D.modules[r.view],parent=m?.navParent||r.view;
  const nav=document.createElement('nav');nav.className='rehearsal-route-nav';nav.setAttribute('aria-label','頁面導覽');
  const hasFallback=JSON.stringify(fallback())!==JSON.stringify({view:'home'})||r.view!=='home';
  nav.innerHTML=`<div class="rehearsal-nav-actions"><button type="button" class="btn" data-action="rehearsal-back" ${prior()<0&&!hasFallback?'disabled':''}>← 返回上頁</button><button type="button" class="btn" data-action="rehearsal-home" ${r.view==='home'&&!r.dashboard?'disabled':''}>工作首頁</button></div><div class="rehearsal-breadcrumb"><span>${E(D.modules[parent]?.navTitle||D.modules[parent]?.title||m?.title||'工作首頁')}</span>${parent!==r.view?`<span aria-hidden="true">/</span><strong>${E(m?.title)}</strong>`:''}</div>`;
  document.querySelector('#main')?.prepend(nav);
  const mobileBack=document.querySelector('[data-action="mobile-back"]');if(mobileBack)mobileBack.disabled=prior()<0&&!hasFallback;
 }
 function header(){
  const label=document.querySelector('.workspace-label');if(label)label.innerHTML=`<strong class="rehearsal-company-name">${E(companyName(D.company))}</strong><span class="rehearsal-person">${E(D.actor.name)} · ${E(D.actor.label)}</span>`;
  const context=document.querySelector('#context');if(context){context.hidden=true;context.setAttribute('aria-hidden','true');}
  const company=document.querySelector('.phone-company');if(company){company.textContent=companyName(D.company)+(['ceo','chairman','admin'].includes(D.role)?' ▾':'');company.setAttribute('aria-label','查看公司 '+companyName(D.company));}
  const phoneTitle=document.querySelector('.phone-title small');if(phoneTitle){phoneTitle.textContent=companyName(D.company);phoneTitle.removeAttribute('translate');}
  const bannerHeight=document.body.classList.contains('mobile-mode')?0:document.querySelector('.demo-banner')?.getBoundingClientRect().height||0;
  document.documentElement.style.setProperty('--rehearsal-banner-height',bannerHeight+'px');
  const headerHeight=document.querySelector(D.mobileActive?'#phone-header':'.topbar')?.getBoundingClientRect().height||0;
  document.documentElement.style.setProperty('--rehearsal-header-height',headerHeight+'px');
 }
 const render=D.render.bind(D);D.render=function(...args){const result=render(...args);stamp();header();navigation();if(D.route().view==='ai-insights'&&!D.route().id)document.querySelector('.ai-preview-header a[href="#view=factory"]')?.remove();D.i18n?.apply();return result;};
 // Backdrop dismissal is limited to read-only dialogs. Edit forms keep the existing dirty guard.
 const modal=D.modal.bind(D);D.modal=function(...args){if(typeof args[1]==='string')args[1]=args[1].replace('此頁使用流程資料；定位與相片請在正式打卡入口操作。','離線打卡演示不啟用定位或拍照。');const result=modal(...args);const dialog=document.querySelector('#modal');if(dialog)dialog.dataset.rehearsalEditable=typeof args[2]==='function'?'true':'false';return result;};
 document.querySelector('#modal')?.addEventListener('click',event=>{const dialog=event.currentTarget,rect=dialog.getBoundingClientRect();if(event.target===dialog&&dialog.dataset.rehearsalEditable==='false'&&(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom))D.closeModal();});
 window.addEventListener('resize',header);
})();
