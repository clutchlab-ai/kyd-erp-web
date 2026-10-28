'use strict';
// Presentation helpers preserve original form controls and stored values.
const formWords={
 '更多資料（選填）':['More details (optional)','ព័ត៌មានបន្ថែម (ជាជម្រើស)'],
 '聯絡資料（選填）':['Contact details (optional)','ព័ត៌មានទំនាក់ទំនង (ជាជម្រើស)'],
 '已帶入':['Filled automatically','បានបំពេញដោយស្វ័យប្រវត្តិ'],
 '客戶名稱':['Customer name','ឈ្មោះអតិថិជន'],'供應商名稱':['Supplier name','ឈ្មោះអ្នកផ្គត់ផ្គង់'],
 '採購內容':['Purchase description','បរិយាយការទិញ'],'請假事由':['Reason for leave','មូលហេតុសុំច្បាប់'],
 '交接安排':['Handover arrangements','ការរៀបចំប្រគល់ការងារ'],'跟進內容':['Follow-up notes','ព័ត៌មានតាមដាន'],
 '改善事項':['Required corrections','ចំណុចត្រូវកែលម្អ'],'其他往來對象':['Other counterparty','ភាគីផ្សេងទៀត'],
 '單據名稱':['Record title','ចំណងជើងកំណត់ត្រា'],'金額（USD）':['Amount (USD)','ចំនួនប្រាក់ (USD)'],
 '員工任職公司':['Employee company','ក្រុមហ៊ុននិយោជក'],
 '選定員工後自動帶入任職公司。':['The employer is filled after selecting an employee.','ក្រុមហ៊ុននិយោជកបំពេញបន្ទាប់ពីជ្រើសរើសបុគ្គលិក។'],
 '只開通本人任職公司。':['Access to the employee’s company only.','ចូលបានតែក្រុមហ៊ុននិយោជក។'],
 '請至少選擇一家授權公司。':['Select at least one authorized company.','សូមជ្រើសរើសក្រុមហ៊ុនដែលបានអនុញ្ញាតយ៉ាងតិចមួយ។']
};
function renameFormField(f,name,label){const el=f.elements[name],wrap=el?.closest('label');if(!wrap)return;const first=[...wrap.childNodes].find(n=>n.nodeType===3);if(first)first.textContent=t(label)}
function optionalFormSection(f,names,label='更多資料（選填）'){
 const controls=names.map(n=>f.elements[n]).filter(el=>el&&el.closest('label'));
 if(!controls.length)return;
 const box=document.createElement('details');box.className='form-extra';
 box.innerHTML=`<summary>${esc(t(label))}</summary><div class="form-extra-body"></div>`;
 box.open=controls.some(el=>el.type==='checkbox'?el.checked:!!el.value);
 f.insertBefore(box,f.querySelector('.error'));
 for(const el of controls){const wrap=el.closest('.personnel-picker')||el.closest('label');box.lastElementChild.append(wrap)}
}
function syncCompanyUI(f){
 const el=f.elements.company;if(!el||el.tagName!=='SELECT')return;
 const choices=[...el.options].filter(o=>o.value),project=state.config.projects?.find(p=>p.id===f.elements.project?.value);
 if(!el.value&&choices.length===1)el.value=choices[0].value;
 const fixed=!!(f.dataset.company||f.dataset.id||project||choices.length===1),label=el.closest('label');
 let summary=f.querySelector('[data-company-context]');
 if(!summary){summary=document.createElement('div');summary.dataset.companyContext='';summary.className='form-context';label.before(summary)}
 label.hidden=fixed&&!!el.value;summary.hidden=!label.hidden;
 summary.textContent=`${t(project?'出帳公司':'歸屬公司')} · ${companyName(el.value)}`;
 // Hidden selected controls still submit; immutable company checks stay on the server.
 el.disabled=false;
 const note=f.querySelector('[data-company-note]');if(note)note.hidden=true;
}
function syncSupplierUI(f,changed=false){
 const select=f.elements.supplierId,party=f.elements.party;if(!select||!party)return;
 const vendor=bRecord(select.value);
 if(changed){if(!f.dataset.supplierAuto)f.dataset.manualParty=party.value;party.value=vendor?.data.title||f.dataset.manualParty||'';f.dataset.supplierAuto=vendor?'1':''}
 if(!vendor&&f.dataset.supplierAuto){party.value=f.dataset.manualParty||'';f.dataset.supplierAuto=''}
 const auto=!!vendor&&party.value===vendor.data.title;
 party.closest('label').hidden=auto;
 if(!vendor)renameFormField(f,'party','其他往來對象');
}
function syncAccountUI(f,employeeChanged=false){
 if(f.dataset.form!=='account')return;
 const p=state.people.find(p=>p.id===f.elements.employeeId.value),ordinary=f.elements.role.value==='employee';
 const scopeBox=f.querySelector('fieldset'),summary=f.querySelector('[data-account-company]');
 const roleHelp=f.querySelector('[data-account-role-help]');if(roleHelp)roleHelp.textContent=({employee:L('查看本人資料與申請。','Access own information and requests.','មើលព័ត៌មាន និងសំណើផ្ទាល់ខ្លួន។'),hr:L('管理授權公司的人事資料，不含他人薪資。','Manage authorized HR files, excluding others’ pay.','គ្រប់គ្រងព័ត៌មាន HR ដែលបានអនុញ្ញាត មិនរួមប្រាក់ខែអ្នកផ្សេង។'),finance:L('查看授權公司的薪資與收付款資料。','View payroll and finance for authorized companies.','មើលប្រាក់ខែ និងហិរញ្ញវត្ថុរបស់ក្រុមហ៊ុនដែលបានអនុញ្ញាត។'),manager:L('查看授權公司的員工基本資料與業務。','Access employee basics and authorized business records.','មើលព័ត៌មានមូលដ្ឋានបុគ្គលិក និងអាជីវកម្មដែលបានអនុញ្ញាត។'),executive:L('查看授權公司的營運概況。','View authorized company overviews.','មើលទិដ្ឋភាពក្រុមហ៊ុនដែលបានអនុញ្ញាត។')})[f.elements.role.value]||'';
 if(employeeChanged)for(const el of f.querySelectorAll('[name=scopes]'))el.checked=false;
 scopeBox.hidden=ordinary;summary.hidden=!ordinary;
 summary.textContent=p?`${t('員工任職公司')} · ${companyName(p.companyCode)} — ${t('只開通本人任職公司。')}`:t('選定員工後自動帶入任職公司。');
}
function syncProgressUI(f,changed){
 if(f.dataset.kind!=='engineering_work')return;
 const phase=f.elements.phase,progress=f.elements.progress;
 if(changed==='phase'&&phase.value==='done')progress.value='100';
 else if(changed==='progress'&&Number(progress.value)===100)phase.value='done';
 else if(changed==='progress'&&Number(progress.value)<100&&phase.value==='done')phase.value=Number(progress.value)>0?'working':'not_started';
 else if(changed==='phase'&&phase.value!=='done'&&Number(progress.value)===100)progress.value='0';
}
function enhanceForm(f){
 if(!f||!f.elements)return;Object.assign(words,formWords);
 const kind=f.dataset.kind,type=f.dataset.form;
 if(type==='business'||type==='record'){
  syncCompanyUI(f);
  const labels={engineering:'工程名稱',engineering_work:'工作名稱',engineering_budget:'預算項目',engineering_change:'工程變更',engineering_acceptance:'驗收紀錄',business_document:'文件名稱',customer:'客戶名稱',supplier:'供應商名稱',customer_followup:'單據名稱',purchase:'採購內容',leave:'請假事由',task:'工作內容'};
  if(labels[kind])renameFormField(f,'title',labels[kind]);
  if(f.elements.amount){renameFormField(f,'amount','金額（USD）');for(const h of f.querySelectorAll('.help'))if(h.textContent.trim()==='USD')h.hidden=true}
  if(kind==='leave')renameFormField(f,'notes','交接安排');
  if(kind==='customer_followup'){
   renameFormField(f,'notes','跟進內容');f.elements.notes.required=true;
   // A follow-up note need not be entered twice as both a title and its body.
   f.elements.title.required=false;optionalFormSection(f,['title']);
  }else if(kind==='engineering_acceptance'){
   renameFormField(f,'notes','改善事項');
  }else{
   const extra=['customer','supplier'].includes(kind)?['category','notes']:['notes'];
   if(['purchase','payable'].includes(kind))extra.unshift('engineeringId');
   optionalFormSection(f,extra);
  }
  if(['customer','supplier'].includes(kind))optionalFormSection(f,['contact','phone','email'],'聯絡資料（選填）');
  if(f.dataset.parent){const parent=bRecord(f.dataset.parent);if(parent){const context=document.createElement('div');context.className='form-context';context.textContent=`${t('關聯業務')} · ${parent.data.title}`;f.prepend(context)}}
  if(['purchase','payable'].includes(kind))syncSupplierUI(f);
  for(const picker of f.querySelectorAll('.personnel-picker')){const select=picker.querySelector('select');if(select&&select.options.length===1&&!select.value){const label=select.closest('label').firstChild.textContent;picker.innerHTML=`<input type="hidden" name="${esc(select.name)}" value=""><div class="help">${esc(label)} · ${t('待指定')}</div>`}}
  for(const help of f.querySelectorAll('.personnel-picker .help'))if(!help.textContent.includes(t('原指派不符合目前職務，請重新指定。'))&&f.querySelector(`[name="${help.parentElement.querySelector('select')?.name}"]`)?.options.length>1)help.hidden=true;
 }
 if(type==='account'){
  for(const h of f.querySelectorAll('.help'))h.hidden=true;const roleHelp=document.createElement('p');roleHelp.className='help';roleHelp.dataset.accountRoleHelp='';f.elements.role.closest('label').after(roleHelp);
  const summary=document.createElement('div');summary.dataset.accountCompany='';summary.className='form-context';f.querySelector('fieldset').before(summary);syncAccountUI(f);
 }
 // Native validation must reveal an invalid field inside a collapsed optional section.
 f.addEventListener('invalid',event=>{let box=event.target.closest('details');while(box){box.open=true;box=box.parentElement?.closest('details')}},true);
}
function prepareFormValues(f){
 if(f.dataset.kind==='customer_followup'&&!f.elements.title.value.trim())f.elements.title.value=f.elements.notes.value.trim().split(/\r?\n/)[0].slice(0,160);
 if(f.dataset.form==='account'&&f.elements.role.value!=='employee'&&!f.querySelector('[name=scopes]:checked'))throw new Error(t('請至少選擇一家授權公司。'));
}
document.addEventListener('change',event=>{
 const el=event.target,f=el.closest('form');if(!f)return;
 if(el.name==='company'||el.name==='project')syncCompanyUI(f);
 if(el.name==='supplierId')syncSupplierUI(f,true);
 if(el.name==='role'||el.name==='employeeId')syncAccountUI(f,el.name==='employeeId');
 if(el.name==='phase'||el.name==='progress')syncProgressUI(f,el.name);
});
