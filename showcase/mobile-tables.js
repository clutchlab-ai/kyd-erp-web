/* Mobile presentation only. Keep the existing cells/actions and never copy business data. */
(() => {
 'use strict';
 const D=window.D;
 const ownClasses=['mobile-record-table','mobile-pair-table','mobile-scroll-table','mobile-empty-table'];
 const text=element=>(element?.textContent||'').replace(/\s+/g,' ').trim();
 const directCells=row=>Array.from(row.children).filter(cell=>['TD','TH'].includes(cell.tagName));
 const spans=cells=>cells.some(cell=>cell.colSpan>1||cell.rowSpan>1);
 function hint(table,show){
  const wrap=table.closest('.table-wrap')||table.parentElement;
  if(!wrap)return;
  let message=Array.from(wrap.children).find(node=>node.classList?.contains('mobile-table-scroll-hint'));
  const mobile=!!document.body?.classList.contains('mobile-mode');
  if(!show||!mobile){
   if(wrap.getAttribute('data-mobile-scroll-focus')==='1'){wrap.removeAttribute('tabindex');wrap.removeAttribute('data-mobile-scroll-focus');}
   if(wrap.getAttribute('data-mobile-scroll-name')==='1'){wrap.removeAttribute('aria-label');wrap.removeAttribute('data-mobile-scroll-name');}
  }
  if(!show){message?.remove();wrap.classList.remove('mobile-table-scroll-wrap');return;}
  wrap.classList.add('mobile-table-scroll-wrap');
  if(!message){message=document.createElement('p');message.className='mobile-table-scroll-hint';message.textContent='左右滑動，查看完整欄位';wrap.insertBefore(message,table);}
  // One focusable scroll region supports keyboard users as well as touch.
  if(mobile&&!wrap.hasAttribute('tabindex')){wrap.setAttribute('tabindex','0');wrap.setAttribute('data-mobile-scroll-focus','1');}
  if(mobile&&!wrap.hasAttribute('aria-label')){wrap.setAttribute('aria-label','資料表，可左右捲動');wrap.setAttribute('data-mobile-scroll-name','1');}
 }
 function enhance(table){
  // These modules already provide a separate native mobile representation.
  if(table.closest('.docs-desktop,.live-roster-desktop')||table.parentElement?.closest('table'))return;
  table.classList.remove(...ownClasses);
  for(const cell of table.querySelectorAll('[data-mobile-label]'))cell.removeAttribute('data-mobile-label');
  const headerRows=Array.from(table.tHead?.rows||[]);
  const rows=Array.from(table.tBodies).flatMap(body=>Array.from(body.rows));
  const cells=rows.map(directCells);
  const inputs=!!table.querySelector('input,select,textarea,[contenteditable="true"]');
  const nested=!!table.querySelector('table');
  const route=D.route?.()||{};
  const financialReport=table.closest('#main')&&route.view==='accounting'&&route.tab==='reports';

  // Two-column detail sheets use row headers, not a list header.
  if(!headerRows.length&&rows.length&&!inputs&&!nested&&cells.every(row=>row.length===2&&row[0].tagName==='TH'&&row[1].tagName==='TD'&&!spans(row))){
   table.classList.add('mobile-pair-table');hint(table,false);return;
  }
  const headers=headerRows.length===1?directCells(headerRows[0]):[];
  const empty=headers.length&&rows.length===1&&cells[0].length===1&&cells[0][0].colSpan===headers.length&&!inputs;
  if(empty){table.classList.add('mobile-empty-table');hint(table,false);return;}
  const records=!inputs&&!nested&&!financialReport&&headers.length>=2&&headers.length<=7&&headerRows.length===1&&!spans(headers)&&rows.length&&cells.every(row=>row.length===headers.length&&row.every(cell=>cell.tagName==='TD')&&!spans(row))&&(!table.tFoot||!table.tFoot.rows.length);
  if(records){
   table.classList.add('mobile-record-table');
   cells.forEach(row=>row.forEach((cell,index)=>{
    const label=text(headers[index])||(cell.querySelector('button,a')?'操作':'其他資訊');
    cell.setAttribute('data-mobile-label',label);
   }));
   hint(table,false);return;
  }
  // Reports, matrices, total rows and editable grids retain their column relationships.
  table.classList.add('mobile-scroll-table');hint(table,true);
 }
 D.mobileTables=function(){
  for(const table of document.querySelectorAll('#main table, #modal-body table'))enhance(table);
 };
})();
