/* Offline exhibition controls; isolated from every production workspace. */
(()=>{'use strict';const D=window.D;
const banner=document.querySelector('.demo-banner');
if(banner){const b=document.createElement('button');b.type='button';b.className='banner-button';b.dataset.action='reset';b.textContent='重新演示';banner.append(b);if(/^https?:$/.test(location.protocol)){const a=document.createElement('a');a.className='banner-button';a.href='Wharton_ERP_离线展示版.html';a.download='Wharton_ERP_离线展示版.html';a.textContent='下載離線版';banner.append(a);}}
D.showcaseBuild='2026-11-25.4';
// A small language note is attached only to preview pages with pending translations.
function localeNote(){document.querySelector('.preview-locale-note')?.remove();if(['en','km'].includes(D.i18n?.language)&&['factory','factory-orders','factory-inventory','factory-report','ai-insights'].includes(D.route().view)){const main=document.querySelector('#main');const note=document.createElement('p');note.className='preview-locale-note';note.setAttribute('data-i18n-ignore','');note.textContent=D.i18n.language==='en'?'This preview is available in Chinese. English and Khmer content is pending.':'ទំព័រមើលជាមុននេះមានជាភាសាចិន។ កំណែភាសាអង់គ្លេស និងភាសាខ្មែរនឹងបន្ថែមនៅពេលក្រោយ។';main?.prepend(note);}}
const render=D.render.bind(D);D.render=function(...args){const r=render(...args);localeNote();return r;};
document.addEventListener('change',event=>{if(event.target?.matches('select[data-ui-language]'))queueMicrotask(localeNote);});
})();
