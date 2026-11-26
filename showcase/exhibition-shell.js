/* Offline exhibition controls; isolated from every production workspace. */
(()=>{'use strict';const D=window.D;
const banner=document.querySelector('.demo-banner');
if(banner){const b=document.createElement('button');b.type='button';b.className='banner-button';b.dataset.action='reset';b.textContent='重新演示';banner.append(b);if(/^https?:$/.test(location.protocol)){const a=document.createElement('a');a.className='banner-button';a.href='Wharton_ERP_离线展示版.html';a.download='Wharton_ERP_离线展示版.html';a.textContent='下載離線版';banner.append(a);}}
D.showcaseBuild='2026-11-26.3';
})();
