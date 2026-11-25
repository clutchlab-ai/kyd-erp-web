/* Exhibition fixtures authored for this package. All names, amounts and records are fictional. */
(()=>{'use strict';const D=window.D;
D.register('showcase-fixtures',{title:'展示資料',nav:false,canView:()=>false,roles:[],seed(s){
 if(s.showcaseFixturesVersion===1)return;
 s.showcaseFixturesVersion=1;
 s.showcase={brand:'Wharton Insight AI',date:'2026-11-27',country:'Cambodia',synthetic:true,companies:[{id:'SFM',name:'暹光製造示範廠',english:'SENGUANG Manufacturing',currency:'USD',sites:['暹光一廠','暹光二廠']},{id:'SMC',name:'暹光材料示範公司',english:'Senguang Materials Demo',currency:'USD',sites:['材料加工示範廠']}]};
 // Fresh fictional prices, not imported from any business ledger.
 s.purchaseDemo=[
 {id:'PO-001',company:'SFM',title:'產線照明改善材料',vendor:'森立工業材料（虛構）',requester:'顧承安',requesterId:'m01',items:[{name:'防塵 LED 工作燈',qty:16,unit:38},{name:'耐熱線材組',qty:4,unit:27}],status:'draft',note:'一廠包裝線照明改善；所有數字均為展示設定。',history:[]},
 {id:'PO-002',company:'SMC',title:'加工區補充用品',vendor:'禾川耗材（虛構）',requester:'余思遠',requesterId:'e02',items:[{name:'防護手套組',qty:24,unit:3.5}],status:'approved',note:'展示案例，已核准不代表已付款。',history:[]},
 {id:'PO-003',company:'SFM',title:'包裝箱備料',vendor:'森立工業材料（虛構）',requester:'顧承安',requesterId:'m01',items:[{name:'五層瓦楞紙箱',qty:250,unit:1.2}],status:'approved',note:'虛構備料，待到貨驗收。',history:[]},
 {id:'PO-004',company:'SFM',title:'品檢工作桌',vendor:'禾川耗材（虛構）',requester:'顧承安',requesterId:'m01',items:[{name:'品檢工作桌',qty:3,unit:185}],status:'review',submittedBy:'m01',note:'展示案例，等待財務複核。',history:[{at:D.today,actor:'顧承安',actorId:'m01',action:'送交財務複核',note:'確認數量與單價。'}]}
 ];
 s.partners=[{id:'V-001',company:'SFM',kind:'vendors',name:'森立工業材料（虛構）',contact:'展示聯絡窗口 A',category:'工業材料',note:'虛構供應商，沒有真實聯絡方式。'},{id:'V-002',company:'SMC',kind:'vendors',name:'禾川耗材（虛構）',contact:'展示聯絡窗口 B',category:'生產耗材',note:'虛構供應商。'},{id:'V-003',company:'SFM',kind:'vendors',name:'禾川耗材（虛構）',contact:'展示聯絡窗口 B',category:'廠區設備',note:'虛構供應商。'}];
 s.financeDemo=[
 ['JV-001','SFM','品檢設備購入',925,'1500','1000','2026-11-24'],
 ['JV-002','SFM','成品銷售收入',6840,'1000','4000','2026-11-25'],
 ['JV-003','SMC','材料銷售收入',2375,'1000','4000','2026-11-25'],
 ['JV-004','SFM','產線耗材費用',462,'5000','1000','2026-11-26'],
 ['JV-005','SFM','成品包裝出貨收入',4180,'1000','4000','2026-11-27'],
 ['JV-006','SFM','廠區設備維護費',318,'5000','1000','2026-11-27']
 ].map(([id,company,title,amount,debit,credit,date])=>({id,company,title,amount,date,status:'posted',native:true,creatorId:'f01',reviewerId:'x01',approverId:'x02',account:'展示平衡分錄',reference:'SYNTHETIC-EXHIBITION',lines:[{code:debit,debit:amount*100,credit:0},{code:credit,debit:0,credit:amount*100}],history:[{at:date,actor:'展示資料建立',text:'預置虛構已入帳案例，未執行付款。'}]}));
 for(const book of Object.values(s.accountingContents?.books||{})){for(const a of book.accounts){if(a.code==='4000')a.name='產品銷售收入';if(a.code==='5000')a.name='製造及營運費用';}}
 const p=s.engineeringProjects?.[0];if(p){p.name='包裝產線工作區改善';p.site='暹光一廠 A 棟';p.budget={version:'V2',date:'2026-11-25',author:'示範工程團隊',total:12600,rows:[['工作區隔間',3100],['機電與照明',4300],['材料與設備',3900],['驗收與其他費用',1300]]};}
 s.employeePayments=[{id:'REQ-EXPO-001',company:'SFM',employeeId:'x01',kind:'payment',currency:'USD',title:'一廠安全標示製作費',amount:286,payee:'森立工業材料（虛構）',note:'全為虛構數字。廠區安全標示已核對，請董事長核准；核准不代表付款。',status:'approval',reviewer:'finance',approver:'chairman',reviewedBy:'f01',history:[{at:'2026-11-26',actor:'陸知行',text:'送出申請',note:'安全標示製作費用。'},{at:'2026-11-27',actor:'林映辰',text:'複核通過',note:'展示單據與金額相符，交董事長核准。'}]}];
 const employeeAnnual=s.leaveRequests?.find(r=>r.id==='LD-employee-approved');if(employeeAnnual){employeeAnnual.startDate=employeeAnnual.endDate=employeeAnnual.date='2026-10-30';const cancellation=s.leaveRequests.find(r=>r.cancelOf===employeeAnnual.id);if(cancellation)cancellation.startDate=cancellation.endDate=cancellation.date='2026-10-30';}
 // Deliberately leave 27 November 13:00–17:00 free for the exhibition leave demonstration.
 for(const r of s.leaveRequests||[]){if(r.employeeId==='e01'&&['review','approval','approved'].includes(r.status)&&r.startDate<='2026-11-27'&&r.endDate>='2026-11-27'){r.startDate=r.endDate=r.date='2026-11-25';}}
}});
})();
