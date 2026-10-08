const YEAR=2026;
const STORAGE_KEY="yearlyExpenseTracker2026";
const CATEGORIES=[
  ["essential","Essential expenses"],
  ["medical","Medical expense"],
  ["groceries","Groceries"],
  ["dairy","Dairy & Drinks"],
  ["fruits","Fruits & Vegetables"],
  ["devotional","Devotional"],
  ["misc","Miscellaneous"]
];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];

function blankMonth(){
  return {fund:0, expenses:{essential:0,medical:0,groceries:0,dairy:0,fruits:0,devotional:0,misc:0}, entries:[]};
}
function loadData(){
  let d;
  try{d=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null")}catch(e){d=null}
  if(!d||!Array.isArray(d.months)||d.months.length!==12){
    d={year:YEAR,months:MONTHS.map(()=>blankMonth()),oldRecords:[]};
  }
  if(!Array.isArray(d.oldRecords)) d.oldRecords=[];
  d.months.forEach(m=>{
    if(!m.expenses)m.expenses=blankMonth().expenses;
    CATEGORIES.forEach(([k])=>m.expenses[k]=Number(m.expenses[k])||0);
    m.fund=Number(m.fund)||0;
    if(!Array.isArray(m.entries))m.entries=[];
  });
  return d;
}
let data=loadData(), currentMonth=0;

const money=n=>"₹"+Math.round(Number(n)||0).toLocaleString("en-IN");
const totalMonth=m=>CATEGORIES.reduce((s,[k])=>s+(Number(m.expenses[k])||0),0);
const totalFund=()=>data.months.reduce((s,m)=>s+m.fund,0);
const totalSpent=()=>data.months.reduce((s,m)=>s+totalMonth(m),0);
function save(){localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}

function renderAll(){renderHome();renderMonths();renderSummary();renderAnalytics();renderOldRecords();}
function renderHome(){
  const fund=totalFund(), spent=totalSpent(), bal=fund-spent;
  document.getElementById("homeBalance").textContent=money(bal);
  document.getElementById("homeBalance").className=bal<0?"negative":"";
  document.getElementById("homeBalanceText").textContent=bal>=0?"Current balance across the year.":"Expenses are currently above fund received.";
  document.getElementById("homeFund").textContent=money(fund);
  document.getElementById("homeSpent").textContent=money(spent);
  document.getElementById("homeMonths").innerHTML=MONTHS.map((name,i)=>monthCardHTML(name,data.months[i])).join("");
  document.querySelectorAll("#homeMonths .month-card").forEach(c=>c.onclick=()=>openMonth(+c.dataset.month));
}
function monthCardHTML(name,m,i){
  const spent=totalMonth(m),bal=m.fund-spent,pct=m.fund?Math.min(100,spent/m.fund*100):0;
  return `<div class="month-card" data-month="${i??MONTHS.indexOf(name)}">
    <div class="month-top"><span class="month-name">${name}</span><span class="month-balance ${bal<0?"negative":"positive"}">${money(bal)}</span></div>
    <div class="month-meta">
      <div><span>Fund</span><strong>${money(m.fund)}</strong></div>
      <div><span>Spent</span><strong>${money(spent)}</strong></div>
      <div><span>Entries</span><strong>${m.entries.length}</strong></div>
    </div>
    <div class="progress"><i style="width:${pct}%"></i></div>
  </div>`;
}
function renderMonths(){
  document.getElementById("monthCards").innerHTML=MONTHS.map((name,i)=>monthCardHTML(name,data.months[i],i)).join("");
  document.querySelectorAll("#monthCards .month-card").forEach(c=>c.onclick=()=>openMonth(+c.dataset.month));
}
function renderSummary(){
  const fund=totalFund(),spent=totalSpent();
  document.getElementById("summaryFund").textContent=money(fund);
  document.getElementById("summarySpent").textContent=money(spent);
  const b=document.getElementById("summaryBalance");b.textContent=money(fund-spent);b.className=fund-spent<0?"negative":"positive";
  document.getElementById("categoryTotals").innerHTML=CATEGORIES.map(([k,label])=>{
    const n=data.months.reduce((s,m)=>s+(m.expenses[k]||0),0);
    return `<div class="category-total"><span>${label}</span><strong>${money(n)}</strong></div>`;
  }).join("");
}

function enteredMonths(){return data.months.filter(m=>m.fund>0||totalMonth(m)>0||m.entries.length);}
function averageOther(monthIndex,categoryKey){
  const vals=data.months.filter((m,i)=>i!==monthIndex&&(m.fund>0||totalMonth(m)>0||m.entries.length))
    .map(m=>categoryKey==="total"?totalMonth(m):m.expenses[categoryKey]||0);
  if(!vals.length)return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}
function renderAnalytics(){
  const box=document.getElementById("analyticsContent"), months=enteredMonths();
  if(!months.length){box.innerHTML='<div class="empty">Add a few monthly entries and your comparative analytics will appear here.</div>';return;}
  let html="";
  data.months.forEach((m,i)=>{
    if(!(m.fund>0||totalMonth(m)>0||m.entries.length))return;
    const spent=totalMonth(m),avg=averageOther(i,"total");
    if(avg!==null&&spent>avg*1.25&&spent>avg+500){
      const tag=spent>avg*1.5?"alert":"watch";
      html+=`<div class="insight"><span class="tag ${tag}">MONTH SPIKE</span><h3>${MONTHS[i]} spending is above your usual level</h3><p>${money(spent)} spent versus an average of ${money(avg)} in your other entered months. ${m.fund-spent>=0?"Still good to go if your overall year-end balance remains comfortable.":"This month is currently in deficit, so later months may need to compensate."}</p></div>`;
    }else if(avg!==null&&spent<avg*.8){
      html+=`<div class="insight"><span class="tag good">LOWER MONTH</span><h3>${MONTHS[i]} is below your usual spending</h3><p>${money(spent)} spent versus an average of ${money(avg)} in your other entered months. No fixed spending target is being assumed.</p></div>`;
    }
    CATEGORIES.forEach(([k,label])=>{
      const v=m.expenses[k]||0,a=averageOther(i,k);
      if(a!==null&&v>a*1.5&&v>a+300){
        const oneOff=(m.entries.filter(e=>e.category===k).length<=2);
        html+=`<div class="insight"><span class="tag watch">CATEGORY SPIKE</span><h3>${label} in ${MONTHS[i]} is higher than your usual level</h3><p>${money(v)} versus an average of ${money(a)} in your other entered months. ${k==="medical"||k==="essential"?"This is not automatically a problem; it may simply reflect a necessary one-off expense.":oneOff?"It may be a one-off spike rather than a recurring pattern.":"Keep an eye on it if similar spikes continue."}</p></div>`;
      }
    });
  });
  const fund=totalFund(),spent=totalSpent(),bal=fund-spent;
  const remaining=12-enteredMonths().length;
  if(bal>=0){
    html+=`<div class="insight"><span class="tag good">YEAR STATUS</span><h3>Your entered months are currently in surplus</h3><p>You have ${money(bal)} left after ${money(spent)} of expenditure against ${money(fund)} received. ${remaining?remaining+" month(s) are not yet entered.":"All months have entries."}</p></div>`;
  }else{
    html+=`<div class="insight"><span class="tag alert">YEAR STATUS</span><h3>Your current entered spending is above fund received</h3><p>The running balance is ${money(bal)}. As more months are entered, the picture can change.</p></div>`;
  }
  box.innerHTML=html||'<div class="empty">No unusual patterns yet. Your entered months are being used as the comparison baseline.</div>';
}


function renderOldRecords(){
  const list=document.getElementById("oldRecordsList");
  const records=data.oldRecords.slice().sort((a,b)=>b.year-a.year);
  if(!records.length){
    list.innerHTML='<div class="empty">No old-year records yet.</div>'; return;
  }
  list.innerHTML=records.map(r=>`<div class="old-record">
    <div class="old-record-top"><span class="old-record-year">${r.year}</span>
    <span class="old-record-balance ${r.balance<0?"negative":"positive"}">${money(r.balance)}</span></div>
    <div class="old-record-meta">
      <div><span>Total in</span><strong>${money(r.in)}</strong></div>
      <div><span>Total out</span><strong>${money(r.out)}</strong></div>
      <div><span>Balance</span><strong>${money(r.balance)}</strong></div>
    </div>
    <div class="old-actions">
      <button data-edit-old="${r.year}">Edit</button>
      <button data-delete-old="${r.year}">Delete</button>
    </div>
  </div>`).join("");
  list.querySelectorAll("[data-edit-old]").forEach(b=>b.onclick=()=>openOldRecord(+b.dataset.editOld));
  list.querySelectorAll("[data-delete-old]").forEach(b=>b.onclick=()=>{
    const y=+b.dataset.deleteOld;
    if(confirm(`Delete the ${y} old record?`)){data.oldRecords=data.oldRecords.filter(r=>r.year!==y);save();renderOldRecords();}
  });
}
let editingOldYear=null;
const oldModal=document.getElementById("oldModal");
function openOldRecord(year=null){
  editingOldYear=year;
  const r=year===null?null:data.oldRecords.find(x=>x.year===year);
  document.getElementById("oldModalTitle").textContent=r?"Edit old record":"Add old record";
  document.getElementById("oldYearInput").value=r?r.year:"";
  document.getElementById("oldInInput").value=r?r.in:"";
  document.getElementById("oldOutInput").value=r?r.out:"";
  oldModal.classList.remove("hidden");
}
function closeOldRecord(){oldModal.classList.add("hidden")}
document.getElementById("addOldRecordBtn").onclick=()=>openOldRecord();
document.getElementById("closeOldModal").onclick=closeOldRecord;
oldModal.querySelector(".modal-backdrop").onclick=closeOldRecord;
document.getElementById("saveOldBtn").onclick=()=>{
  const year=Number(document.getElementById("oldYearInput").value);
  const inn=Math.max(0,Number(document.getElementById("oldInInput").value)||0);
  const out=Math.max(0,Number(document.getElementById("oldOutInput").value)||0);
  if(!year||year<1900||year>2099){alert("Please enter a valid year.");return;}
  const duplicate=data.oldRecords.some(r=>r.year===year && r.year!==editingOldYear);
  if(duplicate){alert("A record for that year already exists.");return;}
  const record={year,in:inn,out:out,balance:inn-out};
  const idx=data.oldRecords.findIndex(r=>r.year===editingOldYear);
  if(editingOldYear!==null && idx>=0)data.oldRecords[idx]=record;
  else data.oldRecords.push(record);
  save();closeOldRecord();renderOldRecords();
};

const modal=document.getElementById("modal");
const fundInput=document.getElementById("fundInput"), categoryInput=document.getElementById("categoryInput"), expenseInput=document.getElementById("expenseInput");
categoryInput.innerHTML=CATEGORIES.map(([k,l])=>`<option value="${k}">${l}</option>`).join("");

function openMonth(i){
  currentMonth=i;
  const m=data.months[i];
  document.getElementById("modalTitle").textContent=MONTHS[i];
  fundInput.value=m.fund||"";
  expenseInput.value="";
  renderModal();
  modal.classList.remove("hidden");
}
function closeModal(){modal.classList.add("hidden")}
function renderModal(){
  const m=data.months[currentMonth],spent=totalMonth(m);
  document.getElementById("entryCount").textContent=`${m.entries.length} ${m.entries.length===1?"entry":"entries"}`;
  document.getElementById("runningTotals").innerHTML=CATEGORIES.map(([k,l])=>`<div class="running-item"><span>${l}</span><strong>${money(m.expenses[k])}</strong></div>`).join("");
  document.getElementById("liveTotal").textContent=money(spent);
  document.getElementById("liveBalance").textContent=money(m.fund-spent);
  document.getElementById("liveBalance").className=m.fund-spent<0?"negative":"positive";
  const list=document.getElementById("entryList");
  list.innerHTML=m.entries.length?m.entries.slice().reverse().map((e,ri)=>{
    const realIndex=m.entries.length-1-ri;
    return `<div class="entry-row"><div><strong>${e.label}</strong><br><small>${money(e.amount)}</small></div><button class="delete-entry" data-entry="${realIndex}">Delete</button></div>`;
  }).join(""):'<div class="empty">No expense entries yet.</div>';
  list.querySelectorAll(".delete-entry").forEach(b=>b.onclick=()=>{
    const idx=+b.dataset.entry,e=m.entries[idx];
    m.expenses[e.category]=Math.max(0,(m.expenses[e.category]||0)-e.amount);
    m.entries.splice(idx,1); save(); renderModal(); renderAll();
  });
}
document.getElementById("addExpenseBtn").onclick=()=>{
  const amount=Number(expenseInput.value);
  if(!amount||amount<0)return;
  const key=categoryInput.value,label=CATEGORIES.find(x=>x[0]===key)[1];
  const m=data.months[currentMonth];
  m.expenses[key]=(m.expenses[key]||0)+amount;
  m.entries.push({category:key,label,amount,time:new Date().toISOString()});
  expenseInput.value="";
  save();renderModal();renderAll();
};
fundInput.addEventListener("input",()=>{
  data.months[currentMonth].fund=Math.max(0,Number(fundInput.value)||0);
  save();renderModal();renderAll();
});
document.getElementById("saveMonthBtn").onclick=()=>{save();closeModal();renderAll()};
document.getElementById("closeModal").onclick=closeModal;
document.querySelector(".modal-backdrop").onclick=closeModal;
document.getElementById("resetBtn").onclick=()=>{
  if(confirm("Reset all 2026 expense data? This cannot be undone.")){
    data={year:YEAR,months:MONTHS.map(()=>blankMonth()),oldRecords:[]};save();renderAll();
  }
};
document.querySelectorAll(".nav-btn").forEach(btn=>btn.onclick=()=>{
  document.querySelectorAll(".nav-btn").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));
  btn.classList.add("active");document.getElementById(btn.dataset.page).classList.add("active");
  window.scrollTo(0,0);
});
renderAll();

const DEFAULT_PASSWORD="1234";
const PASSWORD_KEY="expenseTrackerPassword";
function getAppPassword(){return localStorage.getItem(PASSWORD_KEY)||DEFAULT_PASSWORD;}
const lockScreen=document.getElementById("lockScreen");
const passwordInput=document.getElementById("passwordInput");
const passwordError=document.getElementById("passwordError");
function unlockApp(){
  if(passwordInput.value===getAppPassword()){
    lockScreen.classList.add("hidden");
    sessionStorage.setItem("expenseTrackerUnlocked","1");
    passwordError.textContent="";
    passwordInput.value="";
  }else{
    passwordError.textContent="Incorrect password.";
    passwordInput.value="";
    passwordInput.focus();
  }
}
document.getElementById("unlockBtn").onclick=unlockApp;
passwordInput.addEventListener("keydown",e=>{if(e.key==="Enter")unlockApp()});
if(sessionStorage.getItem("expenseTrackerUnlocked")==="1") lockScreen.classList.add("hidden");
passwordInput.focus();

const passwordModal=document.getElementById("passwordModal");
document.getElementById("changePasswordBtn").onclick=()=>{
  document.getElementById("currentPasswordInput").value="";
  document.getElementById("newPasswordInput").value="";
  document.getElementById("confirmPasswordInput").value="";
  document.getElementById("changePasswordError").textContent="";
  passwordModal.classList.remove("hidden");
};
function closePasswordModal(){passwordModal.classList.add("hidden")}
document.getElementById("closePasswordModal").onclick=closePasswordModal;
passwordModal.querySelector(".modal-backdrop").onclick=closePasswordModal;
document.getElementById("savePasswordBtn").onclick=()=>{
  const current=document.getElementById("currentPasswordInput").value;
  const next=document.getElementById("newPasswordInput").value;
  const confirmNext=document.getElementById("confirmPasswordInput").value;
  const err=document.getElementById("changePasswordError");
  if(current!==getAppPassword()){err.textContent="Current password is incorrect.";return;}
  if(next.length<4){err.textContent="Use at least 4 characters.";return;}
  if(next!==confirmNext){err.textContent="New passwords do not match.";return;}
  localStorage.setItem(PASSWORD_KEY,next);
  err.textContent="";
  closePasswordModal();
  alert("Password changed successfully.");
};

// ---------------- BACKUP & RESTORE ----------------
function backupData(){
  try{
    const payload={
      app:"Expense Tracker 2026",
      version:5,
      exportedAt:new Date().toISOString(),
      data:data
    };
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url;
    a.download=`Expense_Tracker_2026_Backup_${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }catch(e){
    alert("Backup could not be created.");
  }
}
function restoreDataFromFile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const payload=JSON.parse(reader.result);
      const restored=payload&&payload.data?payload.data:payload;
      if(!restored||!Array.isArray(restored.months)||restored.months.length!==12){
        throw new Error("Invalid backup");
      }
      if(!confirm("Restore this backup? Your current 2026 expense data will be replaced."))return;
      data=restored;
      if(!Array.isArray(data.oldRecords))data.oldRecords=[];
      data.months.forEach(m=>{
        if(!m.expenses)m.expenses=blankMonth().expenses;
        CATEGORIES.forEach(([k])=>m.expenses[k]=Number(m.expenses[k])||0);
        m.fund=Number(m.fund)||0;
        if(!Array.isArray(m.entries))m.entries=[];
      });
      save();
      renderAll();
      alert("Backup restored successfully.");
    }catch(e){
      alert("That file is not a valid Expense Tracker backup.");
    }
  };
  reader.readAsText(file);
}
document.getElementById("backupBtn").onclick=backupData;
document.getElementById("restoreBtn").onclick=()=>document.getElementById("restoreFileInput").click();
document.getElementById("restoreFileInput").addEventListener("change",e=>{
  restoreDataFromFile(e.target.files[0]);
  e.target.value="";
});
