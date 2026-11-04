/* Separate meeting demonstration. Synthetic records only; no network or production access. */
(() => {
  'use strict';
  const D = window.D;
  const E = value => D.esc(value ?? '');
  const TYPES = [['labor', '勞動合約'], ['passport', '護照'], ['permit', '工作許可'], ['visa', '簽證'], ['nda', '保密協議']];
  const PROFILE = {
    administrative_assistant: {label: '行政助理', department: '行政部', title: '行政助理', own: ['自己的出勤與假勤申請', '自己的申請進度', '自己的證件與考核'], business: ['行政交辦：僅查看指派給自己的工作'], denied: ['其他員工的薪資', '工程專案', '採購與財務核准', '帳號與權限設定']},
    engineering_assistant: {label: '工程助理', department: '工程部', title: '工程助理', own: ['自己的出勤與假勤申請', '自己的申請進度', '自己的證件與考核'], business: ['工程：查看指派的專案與最新圖面', '工程：更新自己的工作進度'], denied: ['其他員工的薪資', '工程預算修改與驗收核准', '採購與財務核准', '帳號與權限設定']}
  };
  const roles = ['hr', 'hrmanager', 'manager', 'ceo', 'chairman', 'admin', 'employee'];
  const hrCanEdit = () => D.role === 'hr';
  const allCompanies = () => ['ceo', 'chairman', 'admin'].includes(D.role);
  const person = id => D.state.people.find(p => p.id === id);
  const visibleCompany = company => company === D.state.company && (allCompanies() || company === D.actor.company);
  const btn = (label, action, id, primary = false) => `<button class="btn${primary ? ' primary' : ''}" data-action="${action}" data-id="${E(id)}">${label}</button>`;
  const head = (eyebrow, title, text, actions = '') => `<header class="page-head"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lede">${text}</p></div>${actions ? `<div class="action-row">${actions}</div>` : ''}</header>`;
  const seed = s => {
    if (!s.hrRequests) s.hrRequests = [{id: 'HR-001', employeeId: 'e01', company: 'KYD', kind: '部門／職務調整', fromDepartment: person('e01')?.department || '行政部', fromTitle: person('e01')?.title || '行政助理', fromProfile: 'administrative_assistant', toProfile: 'engineering_assistant', effectiveOn: D.today, reason: '加入工程團隊，負責圖面整理與本人工作進度回報。', status: 'draft', createdBy: 'h01', createdByName: '林雅文', events: [{date: D.today, actor: '林雅文', action: '建立草稿', note: '示例：行政助理調整為工程助理。'}]}];
    if (!s.hrDocuments) {
      const sources = [['e01','KYD'], ['h01','KYD'], ['m01','KYD'], ['e02','ZEUS'], ['f01','KYD'], ['h02','KYD']];
      s.hrDocuments = sources.flatMap(([employeeId, company], i) => TYPES.map(([type, label], j) => ({id: `DOC-${employeeId}-${type}`, employeeId, company, type, label, number: `${['LC','PP','WP','VS','NDA'][j]}-SAMPLE-${i + 1}`, issuedOn: '2026-01-01', expiresOn: type === 'nda' ? '' : i === 0 && type === 'permit' ? '2026-10-20' : i === 0 && type === 'visa' ? '2026-11-20' : i === 2 && type === 'passport' ? '2026-11-28' : '2027-06-30', followups: []})));
    }
    // Add only missing synthetic role examples; never replace existing expiry/follow-up data.
    if (!s.documentContentsV2) {
      for (const p of s.people) for (const [type,label] of TYPES) {
        if (!s.hrDocuments.some(d=>d.employeeId===p.id&&d.type===type)) s.hrDocuments.push({id:`DOC-${p.id}-${type}`,employeeId:p.id,company:p.company,type,label,number:`DEMO-${p.id}-${type}`,issuedOn:'2026-01-01',expiresOn:type==='nda'?'':'2027-06-30',followups:[]});
      }
      s.documentContentsV2=true;
    }
  };
  const profile = key => PROFILE[key] || PROFILE.administrative_assistant;
  D.hrPermissionProfile = key => profile(key);
  const request = id => D.state.hrRequests.find(r => r.id === id);
  const ownRequest = r => D.role !== 'employee' || r.employeeId === D.actor.id;
  const canSeeRequest = r => !!r && visibleCompany(r.company) && ownRequest(r);
  const statusLabel = status => ({draft:'草稿', review:'待人資主管複核', approval:'待 CEO 核准', approved:'已核准・待生效', returned:'退回修改', applied:'已生效'})[status] || status;
  const statusTone = status => status === 'applied' ? 'green' : ['review','approval','approved'].includes(status) ? 'blue' : status === 'returned' ? 'amber' : 'neutral';
  const pendingRole = r => ({draft:'hr',returned:'hr',review:'hrmanager',approval:'ceo',approved:'hr'})[r.status];
  const roleLabel = role => ({hr:'人資專員',hrmanager:'人資主管',ceo:'CEO'})[role] || '—';
  const logEvent = (r, action, note) => {
    r.events.push({date:D.today, actor:D.actor.name, action, note:note || ''});
    D.log(`${r.id} ${action}：${person(r.employeeId)?.name || '示例員工'}`);
  };
  function transition(id, action, note = '') {
    const r = request(id);
    if (!canSeeRequest(r)) throw new Error('這筆異動不在目前身份或公司的可操作範圍。');
    if (action === 'submit') {
      if (D.role !== 'hr' || !['draft','returned'].includes(r.status)) throw new Error('只有人資專員可將草稿或退回的申請送交複核。');
      if (!r.reason.trim() || !PROFILE[r.toProfile]) throw new Error('請先填寫異動原因與目標職務。');
      const p = person(r.employeeId);
      if (!p || !p.active) throw new Error('找不到在職示例員工。');
      r.fromDepartment = p.department; r.fromTitle = p.title;
      r.fromProfile = p.profile === 'engineering_assistant' ? 'engineering_assistant' : 'administrative_assistant';
      if (r.fromProfile === r.toProfile) throw new Error('新職務與目前職務相同，請先修改草稿。');
      r.status = 'review'; r.submittedBy = D.actor.id; delete r.reviewerId; delete r.approverId;
      logEvent(r, '送交人資主管複核', note);
    } else if (action === 'review') {
      if (D.role !== 'hrmanager' || r.status !== 'review' || D.actor.id === r.submittedBy) throw new Error('此步驟由另一位人資主管複核。');
      r.status = 'approval'; r.reviewerId = D.actor.id; logEvent(r,'複核通過，送 CEO 核准',note);
    } else if (action === 'approve') {
      if (D.role !== 'ceo' || r.status !== 'approval' || [r.submittedBy,r.reviewerId].includes(D.actor.id)) throw new Error('此步驟由獨立的 CEO 核准。');
      r.status = 'approved'; r.approverId = D.actor.id; logEvent(r,'核准異動',note);
    } else if (action === 'return') {
      if (!((D.role === 'hrmanager' && r.status === 'review') || (D.role === 'ceo' && r.status === 'approval'))) throw new Error('只有目前關卡的處理人可以退回。');
      if (!note.trim()) throw new Error('請填寫退回原因，讓申請人知道要補什麼。');
      r.status = 'returned'; logEvent(r,'退回人資修改',note);
    } else if (action === 'apply') {
      if (D.role !== 'hr' || r.status !== 'approved') throw new Error('核准後由人資確認生效。');
      if (r.effectiveOn > D.today) throw new Error(`尚未到生效日 ${r.effectiveOn}。示例日期為 ${D.today}。`);
      const p = person(r.employeeId), target = profile(r.toProfile);
      if (!p || p.company !== r.company || p.department !== r.fromDepartment || p.title !== r.fromTitle) throw new Error('員工資料已變更，請重新確認異動內容。');
      r.before = {department:p.department,title:p.title,profile:p.profile,company:p.company};
      p.department = target.department; p.title = target.title; p.profile = r.toProfile;
      r.after = {department:p.department,title:p.title,profile:p.profile,company:p.company};
      r.status = 'applied'; r.appliedOn = D.today; logEvent(r,'異動生效，套用示例部門權限',note);
    } else throw new Error('不支援這項操作。');
    D.save();
    return r;
  }
  D.hrTransition = transition;
  D.hrInbox = (role = D.role) => (D.state.hrRequests || []).filter(r => pendingRole(r) === role && visibleCompany(r.company)).map(r => ({id:r.id,title:`${person(r.employeeId)?.name || '示例員工'}・${r.kind}`,subtitle:`${r.fromTitle} → ${profile(r.toProfile).title}`,view:'personnel',params:{id:r.id},actionLabel:({draft:'繼續填寫',returned:'修改後重送',review:'複核內容',approval:'核准異動',approved:'確認生效'})[r.status],status:statusLabel(r.status)}));
  D.hrTasks = D.hrInbox;
  const impact = r => {
    const old = profile(r.fromProfile), next = profile(r.toProfile);
    return `<div class="grid two"><section class="card"><p class="eyebrow">異動前</p><h3>${E(r.fromDepartment)}・${E(r.fromTitle)}</h3><ul>${old.business.map(v=>`<li>${E(v)}</li>`).join('')}</ul><p class="muted">${E(r.company)} 任職／薪資歸屬</p></section><section class="card"><p class="eyebrow">生效後</p><h3>${E(next.department)}・${E(next.title)}</h3><ul>${next.business.map(v=>`<li>${E(v)}</li>`).join('')}</ul><p class="muted">任職公司維持 ${E(r.company)}，本次不調薪</p></section></div><div class="notice blue"><strong>同時發生什麼？</strong><p>職務與部門更新；舊部門業務權限移除，套用上方新職務的示例權限。自己的出勤、請假、申請與證件仍可使用。</p><p>不會增加薪資查看、預算修改、財務核准或系統管理權限。正式職務權限模板仍需 KYD 確認。</p></div>`;
  };
  function actionButtons(r) {
    const authorized = pendingRole(r) === D.role;
    if (!authorized) return r.status === 'applied' ? `<a class="btn primary" href="#view=access&id=${E(r.id)}">查看權限前後差異</a>` : `<p class="muted">下一步由<strong>${roleLabel(pendingRole(r))}</strong>處理。切換到該身份即可看到待辦。</p>`;
    if (['draft','returned'].includes(r.status)) return btn('修改草稿','hr-edit',r.id)+btn('送交人資主管複核','hr-submit',r.id,true);
    if (r.status === 'review') return btn('退回補充','hr-return',r.id)+btn('複核通過 → CEO','hr-review',r.id,true);
    if (r.status === 'approval') return btn('退回補充','hr-return',r.id)+btn('核准異動','hr-approve',r.id,true);
    if (r.status === 'approved') return btn('確認生效與權限變更','hr-apply',r.id,true);
    return '';
  }
  function detail(r) {
    const index = ({draft:0,returned:0,review:1,approval:2,approved:3,applied:4})[r.status];
    const steps = [['人資填寫','草稿／送審'],['人資主管複核','核對異動內容'],['CEO 核准','確認異動與權限'],['人資確認生效','更新資料與權限']];
    return head('行政人事 / 人事異動', `${E(person(r.employeeId)?.name || '示例員工')} 的職務調整`, `${E(r.id)}・${E(r.company)}・生效日 ${E(r.effectiveOn)}`, `<a class="btn" href="#view=personnel">返回異動清單</a>`)+
      `<section class="card"><div class="row">${D.badge(statusLabel(r.status),statusTone(r.status))}<span class="muted">示例流程，正式簽核人與層級另行確認</span></div><ol class="steps">${steps.map((s,i)=>`<li class="step ${i<index?'done':i===index?'active':''}"><strong>${s[0]}</strong><small>${s[1]}</small></li>`).join('')}</ol><p><strong>異動原因：</strong>${E(r.reason)}</p><div class="action-row">${actionButtons(r)}</div></section><div class="section-title"><h2>核准的是什麼變更？</h2></div>${impact(r)}<section class="card"><h2>處理紀錄</h2><div class="timeline">${r.events.map(e=>`<article><strong>${E(e.action)}</strong><p class="muted">${E(e.date)}・${E(e.actor)}</p>${e.note?`<p>${E(e.note)}</p>`:''}</article>`).join('')}</div></section>`;
  }
  function renderPersonnel(params = {}) {
    const r = params.id && request(params.id);
    if (r && canSeeRequest(r)) return detail(r);
    const rows = (D.state.hrRequests || []).filter(r => canSeeRequest(r));
    return head('行政人事', '人事異動', '從提出異動，到下一位收到待辦，再到生效後資料與權限一起改。', hrCanEdit()?btn('新增異動示例','hr-new','',true):'')+
      `<div class="notice blue"><strong>用一個例子走完：</strong>林小安從行政助理轉為工程助理。依序切換「人資 → 人資主管 → CEO → 人資」，最後切到「員工」查看新畫面。</div>`+
      `<div class="grid two">${rows.map(r=>`<article class="card"><div class="row"><span class="mini">${E(r.id)}</span>${D.badge(statusLabel(r.status),statusTone(r.status))}</div><h2>${E(person(r.employeeId)?.name || '示例員工')}</h2><p>${E(r.fromTitle)} → <strong>${E(profile(r.toProfile).title)}</strong></p><p class="muted">${E(r.company)}・${E(r.effectiveOn)} 生效</p><p>下一步：${r.status==='applied'?'已完成；可檢視變更結果':roleLabel(pendingRole(r))}</p><a class="btn primary" href="#view=personnel&id=${E(r.id)}">${pendingRole(r)===D.role?'處理這筆異動':'查看流程與影響'}</a></article>`).join('') || D.empty('沒有符合目前公司與身份的異動','切換人資身份，可從預先準備的示例開始。')}</div>`;
  }
  function editRequest(id) {
    if (!hrCanEdit()) {D.toast('請切換人資身份建立或修改申請。');return;}
    const r = id ? request(id) : null;
    if (r && (!canSeeRequest(r) || !['draft','returned'].includes(r.status))) {D.toast('送審中的內容不能直接修改。');return;}
    if (D.state.company !== 'KYD') {D.toast('這條演示流程使用 KYD 示例如員工，請先切回 KYD。');return;}
    const p = person('e01');
    D.modal(r?'修改異動草稿':'新增人事異動示例', `<div class="notice blue">演示對象：${E(p?.name || '林小安')}（KYD）。這版先完整展示部門／職務調整，其餘異動類型保留在正式系統。</div><div class="form-grid"><label class="field full">新部門／職務${D.select('toProfile',Object.entries(PROFILE).map(([key,v])=>[key,`${v.department}・${v.title}`]),r?.toProfile || 'engineering_assistant')}</label><label class="field">生效日期<input name="effectiveOn" type="date" required value="${E(r?.effectiveOn || D.today)}"></label><label class="field full">異動原因<textarea name="reason" required maxlength="500" rows="3">${E(r?.reason || '加入工程團隊，負責圖面整理與本人工作進度回報。')}</textarea></label></div><p class="muted">資料與權限要經複核、核准後，才會於生效步驟一起更新。</p>`, values => {
      if (!PROFILE[values.toProfile] || !/^\d{4}-\d{2}-\d{2}$/.test(values.effectiveOn) || !values.reason.trim()) throw new Error('請填寫完整的職務、生效日與原因。');
      if (r) {r.toProfile=values.toProfile;r.effectiveOn=values.effectiveOn;r.reason=values.reason.trim();logEvent(r,'儲存異動草稿','');}
      else {
        const item = {id:`HR-${String(D.state.hrRequests.length+1).padStart(3,'0')}`,employeeId:'e01',company:'KYD',kind:'部門／職務調整',fromDepartment:p.department,fromTitle:p.title,fromProfile:p.profile==='engineering_assistant'?'engineering_assistant':'administrative_assistant',toProfile:values.toProfile,effectiveOn:values.effectiveOn,reason:values.reason.trim(),status:'draft',createdBy:D.actor.id,createdByName:D.actor.name,events:[]};
        D.state.hrRequests.unshift(item); logEvent(item,'建立異動草稿',''); D.save(); D.go('personnel',{id:item.id}); return;
      }
      D.save();D.render();D.toast('草稿已儲存，尚未更動員工資料。');
    }, '儲存草稿');
  }
  function confirmTransition(action,id) {
    const r=request(id); if (!canSeeRequest(r)) {D.toast('無法開啟這筆異動。');return;}
    const labels={submit:'送交人資主管複核',review:'複核通過',approve:'核准異動',apply:'確認異動生效',return:'退回人資補充'};
    const body = action==='apply' ? `${impact(r)}<p><strong>確認後：</strong>${E(person(r.employeeId)?.name)} 會改為 ${E(profile(r.toProfile).title)}。切到員工身份即可驗證工程入口。</p>` : `<p>${E(person(r.employeeId)?.name)}：${E(r.fromTitle)} → <strong>${E(profile(r.toProfile).title)}</strong></p><p class="muted">${action==='approve'?'核准後仍由人資確認生效；此刻尚不改動職務與權限。':action==='return'?'退回後，申請人會看到原因並可修改重送。':'此操作完成後，下一位會在自己的待辦看到這筆異動。'}</p>`;
    D.modal(labels[action], body+`<label class="field full">${action==='return'?'退回原因（必填）':'處理備註（選填）'}<textarea name="note" rows="3" maxlength="500" ${action==='return'?'required':''}></textarea></label>`, values => {transition(id,action,values.note||'');D.render();D.toast(action==='apply'?'已生效：請切換到員工身份查看工程入口。':'已更新流程，下一位待辦已出現。');},labels[action]);
  }
  function documentStatus(doc) {
    if (!doc.expiresOn) return {label:'無固定到期日',tone:'neutral',days:null};
    const days=D.daysUntil(doc.expiresOn);
    return days<0?{label:'已到期',tone:'red',days}:days<=(D.state.adminDemoSettings?.documentReminderDays??30)?{label:'即將到期',tone:'amber',days}:{label:'有效',tone:'green',days};
  }
  const docsVisible = () => (D.state.hrDocuments || []).filter(d => !d.supersededBy && visibleCompany(d.company) && (!['employee','manager','finance'].includes(D.role) || d.employeeId===D.actor.id));
  const documentEditor=()=>['hr','hrmanager','admin'].includes(D.role);
  const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
  function renderDocuments(params={}) {
    const visible=docsVisible(), tab=params.status||'all';
    const docs=visible.filter(d=>tab==='expired'?documentStatus(d).tone==='red':tab==='soon'?documentStatus(d).tone==='amber':tab==='following'?d.followups?.length:true), employeeIds=[...new Set(docs.map(d=>d.employeeId))];
    const expired=docs.filter(d=>documentStatus(d).tone==='red').length, soon=docs.filter(d=>documentStatus(d).tone==='amber').length;
    return head('行政人事', '證件與合約', '查看期限、預覽文件、補登資料，再記錄補件或續辦進度。',documentEditor()?btn('登錄證件示例','hr-doc-new','',true):'')+
      `<nav class="subnav">${[['all','全部證件'],['expired','已到期'],['soon','即將到期'],['following','跟進中']].map(([key,label])=>`<a class="${tab===key?'active':''}" href="#view=documents&source=example&status=${key}">${label}</a>`).join('')}</nav>`+
      `<div class="grid three document-metrics"><section class="card stat"><span>已到期</span><strong>${expired}</strong><small>優先跟進補辦進度</small></section><section class="card stat"><span>即將到期</span><strong>${soon}</strong><small>示例以 ${D.state.adminDemoSettings?.documentReminderDays??30} 天內呈現</small></section><section class="card stat"><span>追蹤中的證件</span><strong>${docs.filter(d=>d.followups?.length).length}</strong><small>每筆保留處理紀錄</small></section></div>`+
      `<div class="table-wrap card docs-desktop"><table><thead><tr><th>員工／公司</th>${TYPES.map(([,v])=>`<th>${v}</th>`).join('')}</tr></thead><tbody>${employeeIds.map(id=>{const p=person(id);return `<tr><td><strong>${E(p?.name||'示例員工')}</strong><br><span class="muted">${E(p?.company)}・${E(p?.title)}</span></td>${TYPES.map(([type])=>{const d=docs.find(x=>x.employeeId===id&&x.type===type);if(!d)return '<td>—</td>';const st=documentStatus(d);return `<td><button class="doc-link" data-action="hr-doc" data-id="${E(d.id)}">${D.badge(st.label,st.tone)}<br><small>${E(d.expiresOn||'已留存')}</small>${d.followups.length?'<br><small>已有跟進紀錄</small>':''}</button></td>`}).join('')}</tr>`}).join('')}</tbody></table></div>`+
      `<div class="docs-mobile">${employeeIds.map(id=>{const p=person(id);return `<article class="card doc-person"><h2>${E(p?.name||'示例員工')}</h2><p class="muted">${E(p?.company)}・${E(p?.title)}</p><div class="doc-mobile-list">${TYPES.map(([type,label])=>{const d=docs.find(x=>x.employeeId===id&&x.type===type);if(!d)return '';const st=documentStatus(d);return `<button class="doc-mobile-row" data-action="hr-doc" data-id="${E(d.id)}" aria-label="${E(p?.name)}的${E(label)}，${E(st.label)}"><span class="doc-mobile-label"><strong>${E(label)}</strong><small>${d.expiresOn?'有效至 '+E(d.expiresOn):'無固定到期日'}${d.followups.length?'・已有跟進紀錄':''}</small></span><span>${D.badge(st.label,st.tone)} <span aria-hidden="true">›</span></span></button>`}).join('')}</div></article>`}).join('')}</div>`+
      (docs.length?'':D.empty('目前沒有符合條件的證件','可切回全部證件，或由人資登錄證件示例。'))+
      `<p class="muted">點選狀態可看期限並記錄跟進。${D.state.adminDemoSettings?.documentReminderDays??30} 天是展示範例；正式提醒天數、對象與通知管道待確認。這裡不會發送 email 或訊息。</p>`;
  }
  function openDoc(id) {
    const doc=docsVisible().find(d=>d.id===id);if(!doc){D.toast('這份證件不在目前可見範圍。');return;}
    const st=documentStatus(doc),p=person(doc.employeeId),editable=documentEditor();
    const top=`<div class="row">${D.badge(st.label,st.tone)}<span>${E(p?.name)}・${E(doc.company)}</span></div><dl><dt>證件類型</dt><dd>${E(doc.label)}</dd><dt>示例編號</dt><dd>${E(doc.number)}</dd><dt>有效期間</dt><dd>${E(doc.issuedOn)} → ${E(doc.expiresOn||'無固定到期日')}</dd></dl><div class="action-row">${btn('預覽示例附件','hr-doc-preview',doc.id)}${editable?btn('修改證件資料','hr-doc-edit',doc.id):''}</div>`;
    const history=`<h3>跟進紀錄</h3>${doc.followups.length?`<div class="timeline">${doc.followups.map(f=>`<article><strong>${E(f.status)}</strong><p>${E(f.note)}</p><small>${E(f.at)}・${E(f.actor)}${f.nextOn?`・下次跟進 ${E(f.nextOn)}`:''}</small></article>`).join('')}</div>`:'<p class="muted">尚未記錄跟進。</p>'}`;
    if(!editable){D.modal(`${doc.label}・${p?.name}`,top+history+`<p class="muted">人資可記錄補件與續辦進度；其他身份只看授權範圍內的內容。</p>`,null);return;}
    D.modal(`${doc.label}・${p?.name}`,top+`<div class="form-grid"><label class="field">跟進狀態${D.select('status',[['已提醒補件','已提醒補件'],['續辦中','續辦中'],['已收到新證件','已收到新證件']],doc.followups.at(-1)?.status||'已提醒補件')}</label><label class="field">下次跟進日期<input name="nextOn" type="date" value="${E(D.dateAdd(D.today,D.state.adminDemoSettings?.followupDays??7))}" required></label><label class="field full">處理內容<textarea name="note" required maxlength="500" rows="3" placeholder="例如：已請員工準備續辦資料，下週確認受理進度。"></textarea></label><label class="field">新到期日（有新證件才填）<input name="newExpiry" type="date"></label></div>${history}<p class="muted">這個按鈕只記錄跟進，不會對外發訊息。續辦中不代表證件已有效；輸入新到期日後才更新狀態。</p>`, values=>{
      if(!documentEditor()||!docsVisible().some(x=>x===doc))throw new Error('目前身分或公司無法修改這份證件。');
      if(!['已提醒補件','續辦中','已收到新證件'].includes(values.status)||!validDate(values.nextOn)||values.nextOn<D.today)throw new Error('請選擇跟進狀態及有效的下次跟進日期。');
      if(!values.note.trim())throw new Error('請填寫處理內容。');
      if(values.newExpiry && (values.status!=='已收到新證件'||!validDate(values.newExpiry)||values.newExpiry<=D.today))throw new Error('確認收到新證件後，才能填寫新的有效到期日。');
      doc.followups.push({at:D.today,actor:D.actor.name,status:values.status,note:values.note.trim(),nextOn:values.nextOn,previousExpiry:doc.expiresOn});
      if(values.newExpiry)doc.expiresOn=values.newExpiry;
      D.log(`記錄 ${p?.name} 的${doc.label}跟進`);D.save();D.render();D.toast('跟進紀錄已儲存；未發送任何外部通知。');
    },'記錄跟進');
  }
  function documentForm(id='') {
    if(!documentEditor())throw new Error('由人資或管理員登錄證件。');
    const doc=id?docsVisible().find(d=>d.id===id):null,company=D.state.company,actor=D.actor.id;
    if(id&&!doc)throw new Error('無法修改其他公司或身份的證件。');
    const candidates=D.state.people.filter(p=>p.company===company&&p.active!==false);
    D.modal(doc?'修改證件資料':'登錄證件示例',`<p class="notice">只保存假資料。同類證件再次登錄會成為新版本，原版本保留在紀錄中。</p><div class="form-grid"><label class="field">示例員工${D.select('employeeId',candidates.map(p=>[p.id,p.name+' · '+p.title]),doc?.employeeId||D.actor.id)}</label><label class="field">證件類型${D.select('type',TYPES,doc?.type||'labor')}</label><label class="field full">示例編號<input name="number" maxlength="100" required value="${E(doc?.number||'DEMO-')}" autocomplete="off"></label><label class="field">簽發日期<input name="issuedOn" type="date" required value="${E(doc?.issuedOn||D.today)}"></label><label class="field">到期日期（無固定期限可留空）<input name="expiresOn" type="date" value="${E(doc?.expiresOn)}"></label><label class="field full">文件備註<textarea name="note" maxlength="600">${E(doc?.note)}</textarea></label></div>`,v=>{
      if(!documentEditor()||D.state.company!==company||D.actor.id!==actor||doc&&!docsVisible().includes(doc))throw new Error('身分或公司已變更，請重新開啟。');
      if(!candidates.some(p=>p.id===v.employeeId)||!TYPES.some(([type])=>type===v.type)||!v.number.trim())throw new Error('請選擇同公司的示例員工、證件類型及編號。');
      if(!validDate(v.issuedOn)||v.expiresOn&&(!validDate(v.expiresOn)||v.expiresOn<v.issuedOn))throw new Error('請填寫有效日期，到期日不能早於簽發日。');
      const previous=D.state.hrDocuments.find(d=>d!==doc&&!d.supersededBy&&d.employeeId===v.employeeId&&d.type===v.type);
      if(doc&&previous)throw new Error('已有此類證件，請維持原類型，或另行登錄新版本。');
      const row=doc||{id:'DOC-NEW-'+Date.now()+'-'+D.state.hrDocuments.length,company,followups:[]};
      if(doc) {row.revisions??=[];row.revisions.push({at:D.today,actor:D.actor.name,number:row.number,issuedOn:row.issuedOn,expiresOn:row.expiresOn});}
      Object.assign(row,{employeeId:v.employeeId,type:v.type,label:TYPES.find(([type])=>type===v.type)[1],number:v.number.trim(),issuedOn:v.issuedOn,expiresOn:v.expiresOn||'',note:v.note||''});
      if(!doc){if(previous){row.revisions=[...(previous.revisions||[]),{at:D.today,actor:D.actor.name,number:previous.number,issuedOn:previous.issuedOn,expiresOn:previous.expiresOn}];row.followups=[...(previous.followups||[])];previous.supersededBy=row.id;}D.state.hrDocuments.push(row);}D.log('登錄證件示例 '+row.id);D.save();D.render();D.toast('示例證件已保存。');
    },'儲存證件');
  }
  function previewDocument(id){
    const doc=docsVisible().find(d=>d.id===id);if(!doc)throw new Error('這份證件不在可見範圍。');
    D.modal('示例附件預覽',`<article class="card"><p class="eyebrow">功能演示文件 · 非正式證件</p><h2>${E(doc.label)}</h2><p>${E(person(doc.employeeId)?.name)} · ${E(doc.company)}</p><p>示例編號：${E(doc.number)}</p><p>簽發：${E(doc.issuedOn)}　有效至：${E(doc.expiresOn||'無固定期限')}</p><hr><p>${E(doc.note||'此頁示範打開附件後的閱讀位置。正式附件需另行上傳及核對。')}</p><p class="notice">這是根據假資料產生的預覽，沒有上傳或下載任何人的真實證件。</p></article>${doc.revisions?.length?`<h3>修改前版本</h3>${doc.revisions.map(r=>`<p>${E(r.at)} · ${E(r.actor)} · ${E(r.number)} · ${E(r.expiresOn||'無固定期限')}</p>`).join('')}` : ''}`,null);
  }
  function renderAccess(params={}) {
    const r=request(params.id)||D.state.hrRequests.find(x=>x.employeeId==='e01'),p=person('e01');
    if(!r || !canSeeRequest(r))return head('行政人事','權限影響','先選擇公司與異動，查看操作會改變什麼。')+D.empty('目前沒有可見的異動','請切換 KYD 與對應身份。');
    const current=profile(p.profile),applied=r.status==='applied';
    return head('行政人事 / 權限影響','職務改了，能做的事也要說清楚',`${E(p.name)}・目前 ${E(p.department)} ${E(p.title)}。職務異動與功能授權一起確認。`)+
      `<section class="card"><div class="row">${D.badge(applied?'已套用新職務權限':'尚未改變權限',applied?'green':'amber')}<a class="btn" href="#view=personnel&id=${E(r.id)}">查看人事異動</a></div><p>${applied?'這筆示例異動已完成，員工的工程入口現在可見。':'送審、複核或核准都不代表已生效。目前仍使用原本權限。'}</p></section>${impact(r)}<section class="card"><h2>目前這位員工可以使用</h2><div class="grid two"><div><h3>自己與目前工作</h3><ul>${[...current.own,...current.business].map(v=>`<li>${E(v)}</li>`).join('')}</ul></div><div><h3>沒有授權的內容</h3><ul>${current.denied.map(v=>`<li>${E(v)}</li>`).join('')}</ul></div></div><p class="muted">公司範圍仍是 KYD。調整部門不代表可以看到 Zeus 員工、財務或專案。</p></section><div class="notice amber"><strong>會議要確認：</strong>請 KYD 提供各部門、職務能看／能做的項目。這裡的工程助理權限只用來說明流程，不代表已替任何真實員工授權。</div>`;
  }
  D.register('documents',{title:'證件與合約',group:'行政人事',roles:['employee','hr','hrmanager','manager','finance','ceo','chairman','admin'],seed,render:renderDocuments});
  D.register('personnel',{title:'人事異動',group:'行政人事',roles,render:renderPersonnel});
  D.register('access',{title:'權限影響',group:'行政人事',roles,render:renderAccess});
  D.on('hr-new',()=>editRequest(''));
  D.on('hr-edit',el=>editRequest(el.dataset.id));
  for(const action of ['submit','review','approve','apply','return'])D.on(`hr-${action}`,el=>confirmTransition(action,el.dataset.id));
  D.on('hr-doc',el=>openDoc(el.dataset.id));
  D.on('hr-doc-new',()=>documentForm());
  D.on('hr-doc-edit',el=>documentForm(el.dataset.id));
  D.on('hr-doc-preview',el=>previewDocument(el.dataset.id));
})();
