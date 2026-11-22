/* Read the company's six-sheet XLSX locally. Formulas are never executed. */
(function (global) {
  'use strict';
  const normalize = s => String(s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const key = s => normalize(s).replace(/[ _-]/g, '');
  const fail = s => { throw new Error(s); };
  const xml = text => {
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) fail('Excel XML 含不支援的內容。');
    const d = new DOMParser().parseFromString(text, 'application/xml');
    if (d.querySelector('parsererror')) fail('Excel XML 格式損壞。');
    return d;
  };
  const elements = (d, n) => Array.from(d.getElementsByTagNameNS('*', n));
  const value = (s, r) => s.cells[r]?.value ?? '';
  function num(s, r) {
    const c = s.cells[r];
    if (!c || c.value === '' || c.value == null || c.formula != null) return null;
    if (!/^-?\d+(?:\.\d+)?$/.test(String(c.value))) return null;
    return String(c.value);
  }
  function categoryType(category) {
    const c = normalize(category);
    if (c === 'income') return 'revenue';
    if (c === 'cost' || c === 'expenses') return 'expense';
    if (c.includes('asset') || c.includes('asst')) return 'asset';
    if (c.includes('liabil')) return 'liability';
    if (c === 'capital' || c === 'equity') return 'equity';
    fail('科目分類尚未對應：' + category);
  }
  function groupOf(category, name, type) {
    const c = normalize(category), n = normalize(name);
    if (type === 'revenue') return 'revenue';
    if (type === 'expense') return c === 'cost' ? 'cost' : /^(interest|tax expense)$/.test(n) ? 'finance_cost' : 'operating_expense';
    if (type === 'asset') return /non[- ]current/.test(c) ? 'noncurrent_assets' : 'current_assets';
    if (type === 'liability') return /non[- ]current/.test(c) ? 'noncurrent_liabilities' : 'current_liabilities';
    return 'equity';
  }
  function cashGroup(name, type, category) {
    const n = normalize(name);
    if (type === 'asset' && (/^(cash|bank)[- ]/.test(n) || n === 'petty cash')) return 'cash';
    // Only propose operating working-capital items. Other classifications need finance review.
    if (type === 'asset' && /^(ar-|input vat$|inventory-|prepaid expenses$)/.test(n)) return 'working_capital';
    if (type === 'liability' && /^(ap-|output vat$|accured |accrued |temporary payment received$|security deposit received$|transfer holder deposit$|access card deposit received$)/.test(n)) return 'working_capital';
    return 'unclassified';
  }
  function fromSheets(sheets, sourceName, options = {}) {
    const find = n => sheets.find(s => key(s.name) === key(n)) || fail('缺少工作表：' + n);
    const journal = find('Journal'), chart = find('Account Name_Trial Balance');
    const prior = find('Balance Sheet_prior year');
    find('PL Statement'); find('Balance Sheet_current year'); find('Cash Flow');
    const errors = [], warnings = [];
    if (normalize(value(journal, 'B6')) !== 'date' || normalize(value(journal, 'C6')) !== 'voucher number' || normalize(value(journal, 'D6')) !== 'account') fail('Journal 欄位與公司範本不同，請先核對第 6 列。');
    if (normalize(value(chart, 'B5')) !== 'account name') fail('科目表欄位與公司範本不同，請先核對第 5 列。');
    let category = '';
    const accounts = [], names = new Map();
    for (let r = 6; r <= chart.maxRow; r++) {
      if (value(chart, 'A' + r)) category = String(value(chart, 'A' + r)).trim();
      const name = String(value(chart, 'B' + r)).trim();
      if (!name || !value(chart, 'C' + r) && !category) continue;
      let type;
      try { type = categoryType(category); } catch (e) { errors.push({sheet: chart.name, row: r, message: e.message}); continue; }
      if (names.has(normalize(name))) { errors.push({sheet: chart.name, row: r, message: '科目名稱重複：' + name}); continue; }
      const normal = ['revenue', 'liability', 'equity'].includes(type) || /accumulated depreciation/i.test(name) ? 'credit' : 'debit';
      const a = {code: 'TPL-' + String(r).padStart(4, '0'), name, nameZh: String(value(chart, 'C' + r)).trim(), type, normal, category, reportGroup: groupOf(category, name, type), cashFlowGroup: cashGroup(name, type, category), sourceCell: chart.name + '!B' + r};
      accounts.push(a); names.set(normalize(name), a);
    }
    if (!accounts.length || accounts.length > 500) fail('科目表需有 1 至 500 個科目。');
    // Find opening references from the template's Journal formulas; no cached totals are imported.
    const references = new Map();
    const openingRows = new Set();
    for (let r = 7; r <= journal.maxRow; r++) {
      const a = names.get(normalize(value(journal, 'D' + r)));
      const isOpening = normalize(value(journal, 'C' + r)) === 'prior year';
      if (!isOpening) continue;
      openingRows.add(r);
      if (!a) continue;
      for (const col of ['J', 'K']) {
        const f = journal.cells[col + r]?.formula || '';
        const m = f.match(/^=?(-?)'Balance Sheet_prior year'!\$?([CG])\$?(\d+)$/i);
        if (m) references.set(a.code, {ref: m[2] + m[3], negate: m[1] === '-'});
      }
    }
    // Recover names omitted by the original Journal opening block without reading subtotal rows.
    for (let r = 1; r <= prior.maxRow; r++) for (const [labelCol, amountCol] of [['A', 'C'], ['E', 'G']]) {
      const a = names.get(normalize(value(prior, labelCol + r)));
      if (a && normalize(a.name) === 'prior period earnings' && accounts.some(x => normalize(x.name) === 'retained earnings' && references.has(x.code))) continue;
      if (a && !references.has(a.code) && prior.cells[amountCol + r]?.formula == null) references.set(a.code, {ref: amountCol + r, negate: a.normal === 'credit' && a.type === 'asset'});
    }
    const openingValues = {}, openingFields = accounts.filter(a => ['asset', 'liability', 'equity'].includes(a.type)).map(a => {
      const mapping = references.get(a.code), ref = mapping?.ref;
      let v = ref ? num(prior, ref) : null;
      if (v !== null && mapping.negate) v = v.startsWith('-') ? v.slice(1) : '-' + v;
      if (ref && prior.cells[ref]?.formula == null && value(prior, ref) !== '' && v === null) errors.push({sheet: prior.name, row: Number(ref.replace(/\D/g, '')), message: '前期餘額不是有效數字：' + ref});
      // The template retained-earnings subtotal is a sum of two manually entered balances.
      if (v === null && ref && prior.cells[ref]?.formula) {
        const m = prior.cells[ref].formula.match(/^(?:SUM\(|SUBTOTAL\(9,)([A-Z]+)(\d+):\1(\d+)\)$/i);
        if (m && Number(m[3]) - Number(m[2]) <= 10) {
          const inputs = [];
          for (let row = +m[2]; row <= +m[3]; row++) inputs.push(num(prior, m[1] + row));
          if (inputs.every(x => x !== null)) {
            const digits = Math.max(...inputs.map(x => (x.split('.')[1] || '').length));
            const sum = inputs.reduce((sum, x) => { const neg = x.startsWith('-'); const [a, b = ''] = x.replace(/^-/, '').split('.'); return sum + (neg ? -1n : 1n) * BigInt(a + b.padEnd(digits, '0')); }, 0n);
            const signed = sum < 0n ? '-' : '', raw = String(sum < 0n ? -sum : sum).padStart(digits + 1, '0');
            v = signed + (digits ? raw.slice(0, -digits) + '.' + raw.slice(-digits) : raw);
          }
        }
      }
      if (v !== null) openingValues[a.code] = v;
      return {id: a.code, accountCode: a.code, label: a.nameZh || a.name, normal: a.normal, sourceCell: ref ? prior.name + '!' + ref : '', required: true};
    });
    const groups = new Map();
    for (let r = 7; r <= journal.maxRow; r++) {
      if (openingRows.has(r)) continue;
      const d = num(journal, 'J' + r), c = num(journal, 'K' + r);
      if (['J', 'K'].some(col => journal.cells[col + r]?.formula == null && value(journal, col + r) !== '' && num(journal, col + r) === null)) { errors.push({sheet: journal.name, row: r, message: '借貸金額包含非數字內容，請核對後再匯入。'}); continue; }
      const hasFormula = ['J', 'K'].some(col => journal.cells[col + r]?.formula != null);
      const hasContent = ['B', 'C', 'D', 'F', 'G', 'H', 'L', 'M'].some(col => value(journal, col + r) !== '');
      if (hasFormula && hasContent) { errors.push({sheet: journal.name, row: r, message: '借貸金額含公式，請先核對並轉成確定金額。'}); continue; }
      if (d === null && c === null) {
        if (hasContent && String(value(journal, 'D' + r)).trim()) errors.push({sheet: journal.name, row: r, message: '已填寫科目但沒有借貸金額。'});
        continue;
      }
      if (Number(d || 0) === 0 && Number(c || 0) === 0 && !hasContent) continue;
      const voucher = String(value(journal, 'C' + r)).trim(), account = names.get(normalize(value(journal, 'D' + r)));
      if (!voucher || !account) { errors.push({sheet: journal.name, row: r, message: !voucher ? '請填寫傳票號碼。' : '科目不在科目表內。'}); continue; }
      const rawDate = value(journal, 'B' + r);
      let date = String(rawDate);
      if (/^\d+(?:\.\d+)?$/.test(date)) date = new Date(Date.UTC(1899, 11, 30) + Number(date) * 86400000).toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) { errors.push({sheet: journal.name, row: r, message: '傳票日期無效。'}); continue; }
      if (!groups.has(voucher)) groups.set(voucher, {voucher, date, kind: 'general', reference: voucher, description: String(value(journal, 'H' + r) || voucher), lines: []});
      const entry = groups.get(voucher);
      if (entry.date !== date) errors.push({sheet: journal.name, row: r, message: '同一傳票有不同日期，請核對。'});
      entry.lines.push({accountCode: account.code, description: String(value(journal, 'H' + r)), debit: d ?? '0', credit: c ?? '0', counterparty: String(value(journal, 'F' + r)), unitNo: String(value(journal, 'G' + r)), originalDescription: String(value(journal, 'I' + r)), invoiceNo: String(value(journal, 'L' + r)), reference: String(value(journal, 'M' + r)), remarks: String(value(journal, 'N' + r)), adjustmentNote: String(value(journal, 'O' + r)), note: String(value(journal, 'P' + r)), sourceRow: r});
    }
    if (groups.size > 50 || Array.from(groups.values()).reduce((n, e) => n + e.lines.length, 0) > 1000) errors.push({message: '每批最多 50 張傳票、1,000 筆分錄，請分批匯入。'});
    warnings.push('報表由已入帳資料重新計算，不沿用 Excel 的固定列數與快取結果。');
    warnings.push('現金流分類為待核對草稿；未分類與非現金交易需由財務核對。');
    if (Object.keys(openingValues).length < openingFields.length) warnings.push('期初空白保留為未填，不會當成零或自動入帳。');
    return {template: {id: 'kyd-journal-fs-v1', version: 1, company: options.company || '', sourceName, accounts, openingFields}, journals: Array.from(groups.values()), openingValues, warnings, errors, sheets: sheets.map(s => s.name)};
  }
  async function read(file, options = {}) {
    if (!file || !/\.xlsx$/i.test(file.name) || file.size > 8 * 1024 * 1024) fail('請選擇 8 MB 以下的 .xlsx 檔案。');
    if (!global.JSZip) fail('Excel 讀取元件尚未載入，請重新整理。');
    const zip = await global.JSZip.loadAsync(await file.arrayBuffer());
    const files = Object.values(zip.files);
    if (files.length > 2000 || files.reduce((n, f) => n + (f._data?.uncompressedSize || 0), 0) > 64 * 1024 * 1024) fail('Excel 解壓後過大，請縮小檔案再匯入。');
    if (files.some(f => /vbaProject|externalLinks/i.test(f.name))) fail('請使用不含巨集或外部連結的 Excel。');
    async function get(path, optional = false) { const f = zip.file(path); if (!f) { if (optional) return null; fail('Excel 缺少必要資料：' + path); } return xml(await f.async('string')); }
    const workbook = await get('xl/workbook.xml');
    if (['1', 'true'].includes(elements(workbook, 'workbookPr')[0]?.getAttribute('date1904'))) fail('此檔使用 1904 日期系統，請另存為一般 1900 日期系統後匯入。');
    const relations = await get('xl/_rels/workbook.xml.rels'), shared = await get('xl/sharedStrings.xml', true);
    const strings = shared ? elements(shared, 'si').map(si => elements(si, 't').map(t => t.textContent).join('')) : [];
    const targets = new Map(elements(relations, 'Relationship').filter(r => r.getAttribute('TargetMode') !== 'External').map(r => [r.getAttribute('Id'), r.getAttribute('Target')]));
    const sheets = []; let count = 0;
    for (const sh of elements(workbook, 'sheet')) {
      const rel = sh.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id'), target = targets.get(rel);
      if (!target || target.includes('..')) fail('Excel 工作表路徑無效。');
      const root = await get(target.startsWith('/') ? target.slice(1) : 'xl/' + target), cells = Object.create(null);
      let maxRow = 0;
      for (const c of elements(root, 'c')) {
        if (++count > 250000) fail('Excel 儲存格過多，請移除空白格式後重試。');
        const ref = c.getAttribute('r'); if (!/^[A-Z]{1,3}\d{1,7}$/.test(ref)) continue;
        const type = c.getAttribute('t'), f = elements(c, 'f')[0];
        let v = elements(c, 'v')[0]?.textContent ?? '';
        if (type === 's') v = strings[+v] ?? '';
        if (type === 'inlineStr') v = elements(c, 't').map(t => t.textContent).join('');
        if (v !== '' || f) { cells[ref] = {value: v, formula: f ? f.textContent : null}; maxRow = Math.max(maxRow, +ref.replace(/\D/g, '')); }
      }
      sheets.push({name: sh.getAttribute('name'), cells, maxRow});
    }
    return fromSheets(sheets, file.name, options);
  }
  global.KYDWorkbookReader = {read, fromSheets};
})(globalThis);
