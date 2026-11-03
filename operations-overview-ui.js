// Progress summaries consume only permission-filtered API responses. No sample KPI values.
function renderOperationsOverview(){
 const current=state.company||'',scope=rows=>(Array.isArray(rows)?rows:[]).filter(x=>!current||x.company===current),companyCodes=values=>(Array.isArray(values)?values:[]).map(c=>typeof c==='string'?c:c.code).filter(c=>!current||c===current);
 const cap=module=>Object.entries(state.session?.access?.capabilities||{}).some(([c,permissions])=>(!current||c===current)&&permissions?.[module]?.includes('view'));
 const link=(view,params={})=>href(view,{...params,...(current?{company:current}:{})});
 const item=(label,value)=>`<div><dt>${esc(label)}</dt><dd><strong>${esc(value)}</strong></dd></div>`;
 const card=(name,rows,url,note='')=>`<article class="card"><h3>${esc(name)}</h3><dl class="details">${rows.map(([label,value])=>item(label,value)).join('')}</dl>${note?`<p class="help">${esc(note)}</p>`:''}<a href="${url}">${L('查看與處理','View and process','មើល និងដំណើរការ')} →</a></article>`;
 const cards=[];
 const hr=state.personnelops||{},changes=scope(hr.rows).filter(r=>r.kind!=='salary'),hrAllowed=Object.entries(hr.capabilities||{}).some(([c,a])=>(!current||c===current)&&a.personnel?.view);
 if(hrAllowed||cap('personnel')||changes.length){
  const configured=scope(hr.routes).some(r=>r.kind!=='salary'&&r.enabled);
  cards.push(card(L('人事異動','Employment changes','ការផ្លាស់ប្តូរបុគ្គលិក'),[[L('待複核／核准','Awaiting review / approval','រង់ចាំពិនិត្យ / អនុម័ត'),changes.filter(r=>['review','approval'].includes(r.status)).length],[L('核准待生效','Approved, awaiting application','អនុម័ត រង់ចាំអនុវត្ត'),changes.filter(r=>r.status==='approved').length]],link('changes'),configured?'':L('簽核路線尚未設定；可先準備草稿。','Approval routes not configured; drafts can be prepared.','មិនទាន់កំណត់លំហូរអនុម័ត អាចរៀបចំព្រាង។')));
 }
 const staffing=state.staffing||{},month=typeof staffing.day==='string'?staffing.day.slice(0,7):'',demands=scope(staffing.demands).filter(d=>!month||d.date?.startsWith(month));
 if(companyCodes(staffing.companies).length||cap('attendance')){
  const pending=demands.filter(d=>['draft','returned','review','approval'].includes(d.status)),gaps=demands.filter(d=>!['void','cancelled'].includes(d.status)&&Number(d.coverage?.gap)>0);
  const configured=scope(staffing.posts).some(p=>p.enabled!==false)&&scope(staffing.areas).some(a=>a.enabled!==false);
  cards.push(card(L('排班與崗位','Staffing and posts','រៀបចំមនុស្ស និងតួនាទី'),[[L('待發布班次','Shifts awaiting publication','វេនរង់ចាំផ្សព្វផ្សាយ'),pending.length],[L('尚未滿員班次','Understaffed shifts','វេនខ្វះបុគ្គលិក'),gaps.length]],link('attendance',{tab:'staffing',...(month?{month}:{})}),configured?(month?L(month+' 月班次','Shifts for '+month,'វេនសម្រាប់ '+month):''):L('工作區或崗位尚未設定。','Work areas or posts not configured.','មិនទាន់កំណត់តំបន់ ឬតួនាទី។')));
 }
 const tasks=state.tasks||{},work=scope(tasks.items),awaitingAssignment=scope(tasks.sources).filter(s=>!s.linked).length;
 if(companyCodes(tasks.companies).length||cap('tasks')||work.length){cards.push(card(L('專案交辦','Administrative tasks','កិច្ចការរដ្ឋបាល'),[[L('執行中／退回改善','In progress / returned','កំពុងអនុវត្ត / ត្រឡប់កែ'),work.filter(x=>['active','returned'].includes(x.status)).length],[L('待主管驗收','Awaiting acceptance','រង់ចាំទទួលយក'),work.filter(x=>x.status==='awaiting_acceptance').length]],link('projects'),awaitingAssignment?L('另有 '+awaitingAssignment+' 項已核准，待安排執行。',awaitingAssignment+' approved requests await assignment.','សំណើអនុម័ត '+awaitingAssignment+' រង់ចាំចាត់តាំង។'):work.length?'':L('尚無已安排的交辦工作。','No tasks assigned yet.','មិនទាន់ចាត់តាំងកិច្ចការ។')))}
 const performance=state.performance||{},plans=scope(performance.plans);
 if(cap('performance')||plans.length||scope(performance.subjects).length){cards.push(card(L('目標與考核','Goals and assessments','គោលដៅ និងវាយតម្លៃ'),[[L('目標待確認','Goals awaiting confirmation','គោលដៅរង់ចាំបញ្ជាក់'),plans.filter(p=>['draft','returned','goals_review'].includes(p.status)).length],[L('評核中','Assessment in progress','កំពុងវាយតម្លៃ'),plans.filter(p=>['active','review_returned','second_review'].includes(p.status)).length],[L('已完成評核','Assessments completed','វាយតម្លៃបានបញ្ចប់'),plans.filter(p=>p.status==='completed').length]],link('performance'),plans.length?L('顯示流程筆數，並非績效分數。','Workflow counts, not performance scores.','ចំនួនលំហូរ មិនមែនពិន្ទុប្រសិទ្ធភាព។'):L('尚未建立考核目標。','Assessment goals not set.','មិនទាន់កំណត់គោលដៅវាយតម្លៃ។')))}
 const accounting=state.accounting||{},financeCompanies=companyCodes(accounting.companies),finance=[];
 for(const company of financeCompanies){
  const book=(accounting.books||[]).find(b=>b.company===company),report=(accounting.reports||[]).find(r=>r.company===company),url=href('finance',{tab:book?.enabled?'reports':'book',company});
  if(!book?.enabled){finance.push(card(companyName(company),[[L('帳套','Accounting book','បញ្ជីគណនេយ្យ'),book?L('已停用','Disabled','បិទ'):L('尚未設定','Not configured','មិនទាន់កំណត់')]],url));continue}
  const valid=report&&report.currency===book.currency&&Number.isInteger(report.precision)&&report.precision>=0&&report.precision<=6&&report.postedCount>0;
  const amount=n=>valid&&Number.isSafeInteger(n)?new Intl.NumberFormat(lang==='zh'?'zh-Hant':lang==='km'?'km':'en',{minimumFractionDigits:report.precision,maximumFractionDigits:report.precision}).format(n/10**report.precision):'—';
  finance.push(card(companyName(company)+' · '+book.currency,[[L('已入帳收入','Posted revenue','ចំណូលបានកត់ត្រា'),amount(report?.profit?.revenue)],[L('已入帳費用','Posted expenses','ចំណាយបានកត់ត្រា'),amount(report?.profit?.expense)],[L('帳面損益','Recorded profit / loss','ចំណេញ / ខាតក្នុងបញ្ជី'),amount(report?.profit?.result)]],url,valid?L(report.start+' 至 '+report.end+'；僅計已入帳傳票。',report.start+' to '+report.end+'; posted vouchers only.',report.start+' ដល់ '+report.end+'; តែប័ណ្ណបានកត់ត្រា។'):L('尚無已入帳報表資料；不以申請金額代替。','No posted report data yet; request amounts are excluded.','មិនទាន់មានរបាយការណ៍កត់ត្រា មិនប្រើចំនួនទឹកប្រាក់សំណើជំនួស។')));
 }
 if(!cards.length&&!finance.length)return '';
 return `<section class="section-gap" aria-label="${L('公司工作進度','Company operations progress','វឌ្ឍនភាពការងារក្រុមហ៊ុន')}"><div class="card-title"><h2>${L('各項工作進度','Operations progress','វឌ្ឍនភាពការងារ')}</h2><span class="sub">${current?esc(companyName(current)):L('目前可查看的公司與資料','Companies and records you can access','ក្រុមហ៊ុន និងទិន្នន័យដែលអ្នកអាចមើល')}</span></div>${cards.length?`<div class="meeting-grid">${cards.join('')}</div>`:''}${finance.length?`<h3 class="section-gap">${L('各公司財務 · 分別列示幣別','Company finances · currencies kept separate','ហិរញ្ញវត្ថុតាមក្រុមហ៊ុន · រូបិយប័ណ្ណដាច់ដោយឡែក')}</h3><div class="meeting-grid">${finance.join('')}</div>`:''}</section>`;
}
