const $ = (id) => document.getElementById(id);
const money = (n) => Number(n || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const thisMonth = () => today().slice(0,7);
const categories = {
  expense: ['Alimentação','Moradia','Água e luz','Transporte','Saúde','Educação','Filhos','Lazer','Compras','Dívidas','Assinaturas','Impostos','Outros'],
  income: ['Salário','Renda extra','Benefícios','Vendas','Reembolso','Investimentos','Outros']
};
const icons = {'Alimentação':'🛒','Moradia':'🏠','Água e luz':'💡','Transporte':'🚗','Saúde':'💊','Educação':'📚','Filhos':'🧸','Lazer':'🎮','Compras':'🛍️','Dívidas':'💳','Assinaturas':'📱','Impostos':'🧾','Salário':'💼','Renda extra':'✨','Benefícios':'🤝','Vendas':'📦','Reembolso':'↩️','Investimentos':'📈','Outros':'•'};
let data = loadData();
let deferredPrompt = null;
function loadData(){ try { const x=JSON.parse(localStorage.getItem('controleFacilData')||'{}'); return {transactions:Array.isArray(x.transactions)?x.transactions:[], bills:Array.isArray(x.bills)?x.bills:[]}; } catch(e){ return {transactions:[],bills:[]}; } }
function save(){ localStorage.setItem('controleFacilData',JSON.stringify(data)); render(); }
function id(){ return `${Date.now()}_${Math.random().toString(36).slice(2,8)}`; }
function monthOf(date){return String(date||'').slice(0,7);}
function escapeHTML(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(message){const t=$('toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600);}
function populateCategories(select,type){select.innerHTML=(categories[type]||categories.expense).map(c=>`<option>${escapeHTML(c)}</option>`).join('');}
function openEntry(type='expense',item=null){
  $('entryForm').reset(); $('entryType').value=type; $('entryId').value=item?.id||'';
  $('formTitle').textContent=item?'Editar movimentação':type==='income'?'Adicionar entrada':'Adicionar despesa';
  $('formEyebrow').textContent=type==='income'?'NOVA ENTRADA':'NOVA DESPESA';
  populateCategories($('category'),type);
  $('date').value=item?.date||today(); $('description').value=item?.description||'';
  $('amount').value=item?.amount??''; $('category').value=item?.category||categories[type][0];
  $('payment').value=item?.payment|| (type==='income'?'Salário':'Pix'); $('notes').value=item?.notes||'';
  $('creditOptions').classList.toggle('hidden',type!=='expense'||$('payment').value!=='Crédito');
  $('cardName').value=item?.cardName||''; $('installments').value=item?.installments||1;
  $('entryDialog').showModal();
}
function openBill(){ $('billForm').reset(); populateCategories($('billCategory'),'expense'); $('billDue').value=today(); $('billDialog').showModal(); }
function render(){
  const month=$('monthFilter').value||thisMonth(); const tx=data.transactions.filter(t=>monthOf(t.date)===month);
  const inc=tx.filter(t=>t.type==='income').reduce((a,t)=>a+Number(t.amount),0);
  const exp=tx.filter(t=>t.type==='expense').reduce((a,t)=>a+Number(t.amount),0);
  $('monthIncome').textContent=money(inc); $('monthExpense').textContent=money(exp); $('monthBalance').textContent=money(inc-exp);
  $('monthBalance').style.color=(inc-exp)<0?'#ffe3df':'white';
  const pending=data.bills.filter(b=>!b.paid).sort((a,b)=>a.due.localeCompare(b.due));
  $('pendingCount').textContent=`${pending.length} pendente${pending.length===1?'':'s'}`;
  $('upcomingBills').innerHTML=pending.length?pending.map(b=>`<div class="bill-row"><div class="item-icon">${icons[b.category]||'🧾'}</div><div class="item-main"><strong>${escapeHTML(b.description)}</strong><small>${escapeHTML(b.category)} • vence ${new Date(b.due+'T12:00:00').toLocaleDateString('pt-BR')}${b.repeat==='monthly'?' • mensal':''}</small></div><div class="item-right"><strong>${money(b.amount)}</strong><small>${b.due<today()?'Vencida':'Pendente'}</small></div><div class="row-buttons"><button class="mini-btn pay" data-paybill="${b.id}">Paga</button><button class="mini-btn delete" data-delbill="${b.id}">×</button></div></div>`).join(''):'<div class="empty">Nenhuma conta futura cadastrada. Toque em “Conta futura” para adicionar.</div>';
  const filter=$('typeFilter').value; const shown=tx.filter(t=>filter==='all'||t.type===filter).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
  $('transactions').innerHTML=shown.length?shown.map(t=>`<div class="transaction-row"><div class="item-icon">${icons[t.category]||'•'}</div><div class="item-main"><strong>${escapeHTML(t.description)}</strong><small>${escapeHTML(t.category)} • ${new Date(t.date+'T12:00:00').toLocaleDateString('pt-BR')} • ${escapeHTML(t.payment||'')}</small>${t.notes?`<small>${escapeHTML(t.notes)}</small>`:''}</div><div class="item-right"><strong class="${t.type==='income'?'amount-income':'amount-expense'}">${t.type==='income'?'+':'−'} ${money(t.amount)}</strong>${t.installmentIndex?`<small>Parcela ${t.installmentIndex}/${t.installmentTotal}</small>`:''}</div><div class="row-buttons"><button class="mini-btn" data-edit="${t.id}">Editar</button><button class="mini-btn delete" data-delete="${t.id}">×</button></div></div>`).join(''):'<div class="empty">Ainda não há movimentações neste mês.</div>';
}
$('entryForm').addEventListener('submit',e=>{
  e.preventDefault(); const type=$('entryType').value, amount=Number($('amount').value);
  if(!Number.isFinite(amount)||amount<=0){toast('Informe um valor maior que zero.');return;}
  const editId=$('entryId').value;
  const base={id:editId||id(),type,description:$('description').value.trim(),amount,date:$('date').value,category:$('category').value,payment:$('payment').value,notes:$('notes').value.trim(),createdAt:Date.now()};
  if(!base.description||!base.date){toast('Preencha a descrição e a data.');return;}
  if(editId){const index=data.transactions.findIndex(t=>t.id===editId);if(index>=0)data.transactions[index]={...data.transactions[index],...base};toast('Movimentação atualizada.');}
  else if(type==='expense'&&base.payment==='Crédito'&&Number($('installments').value)>1){
    const count=Math.min(48,Math.max(1,Number($('installments').value)||1)); const total=Math.round(amount*100); const each=Math.floor(total/count); const remainder=total-each*count; const start=new Date(base.date+'T12:00:00');
    for(let i=0;i<count;i++){const d=new Date(start);d.setMonth(d.getMonth()+i);const date=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;data.transactions.push({...base,id:id(),description:`${base.description} (${i+1}/${count})`,amount:(each+(i===count-1?remainder:0))/100,date,cardName:$('cardName').value.trim(),installmentIndex:i+1,installmentTotal:count,installmentGroup:base.id,createdAt:Date.now()+i});}
    toast(`${count} parcelas adicionadas ao histórico.`);
  }else{data.transactions.push({...base,cardName:$('cardName').value.trim()});toast('Movimentação salva.');}
  $('entryDialog').close();save();
});
$('payment').addEventListener('change',()=>{$('creditOptions').classList.toggle('hidden',!($('entryType').value==='expense'&&$('payment').value==='Crédito'));});
$('entryType').addEventListener('change',()=>{$('creditOptions').classList.toggle('hidden',!($('entryType').value==='expense'&&$('payment').value==='Crédito'));});
$('billForm').addEventListener('submit',e=>{e.preventDefault();const amount=Number($('billAmount').value);if(amount<=0){toast('Informe um valor maior que zero.');return;}data.bills.push({id:id(),description:$('billDescription').value.trim(),amount,due:$('billDue').value,category:$('billCategory').value,payment:$('billPayment').value,repeat:$('billRepeat').value,paid:false});$('billDialog').close();save();toast('Conta futura salva.');});
function payBill(billId){const b=data.bills.find(x=>x.id===billId);if(!b||b.paid)return;if(!confirm(`Registrar "${b.description}" como paga por ${money(b.amount)}?`))return;data.transactions.push({id:id(),type:'expense',description:b.description,amount:b.amount,date:today(),category:b.category,payment:b.payment,notes:'Conta futura marcada como paga',createdAt:Date.now()});if(b.repeat==='monthly'){const d=new Date(b.due+'T12:00:00');d.setMonth(d.getMonth()+1);b.due=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}else data.bills=data.bills.filter(x=>x.id!==billId);save();toast('Pagamento registrado no histórico.');}
document.addEventListener('click',e=>{
 const t=e.target.closest('button');if(!t)return;
 if(t.dataset.paybill)payBill(t.dataset.paybill);
 if(t.dataset.delbill){if(confirm('Excluir esta conta futura?')){data.bills=data.bills.filter(b=>b.id!==t.dataset.delbill);save();}}
 if(t.dataset.delete){const item=data.transactions.find(x=>x.id===t.dataset.delete);if(item&&confirm('Excluir esta movimentação?')){data.transactions=data.transactions.filter(x=>x.id!==item.id);save();}}
 if(t.dataset.edit){const item=data.transactions.find(x=>x.id===t.dataset.edit);if(item)openEntry(item.type,item);}
});
$('addExpenseBtn').onclick=()=>openEntry('expense');$('addIncomeBtn').onclick=()=>openEntry('income');$('addBillBtn').onclick=openBill;$('navExpense').onclick=()=>openEntry('expense');
$('closeDialog').onclick=$('cancelDialog').onclick=()=>$('entryDialog').close();$('closeBillDialog').onclick=$('cancelBillDialog').onclick=()=>$('billDialog').close();
$('monthFilter').value=thisMonth();$('monthFilter').addEventListener('change',render);$('typeFilter').addEventListener('change',render);
$('navHistory').addEventListener('click',()=>setTimeout(()=>$('transactions').scrollIntoView({behavior:'smooth'}),0));
$('exportBtn').onclick=()=>{const blob=new Blob([JSON.stringify({app:'Controle Fácil',version:1,exportedAt:new Date().toISOString(),...data},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`controle-facil-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href);toast('Backup exportado. Guarde o arquivo em local seguro.');};
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const x=JSON.parse(await file.text());if(!Array.isArray(x.transactions)||!Array.isArray(x.bills))throw new Error();if(!confirm('Importar backup? Isso substituirá os dados atuais deste aparelho.'))return;data={transactions:x.transactions,bills:x.bills};save();toast('Backup importado.');}catch(err){alert('Arquivo de backup inválido.');}finally{e.target.value='';}});
$('clearBtn').onclick=()=>{if(confirm('Tem certeza? Todos os registros salvos neste navegador serão apagados. Exporte um backup antes, se quiser guardá-los.')){data={transactions:[],bills:[]};save();toast('Dados apagados.');}};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').classList.remove('hidden');});
$('installBtn').addEventListener('click',async()=>{if(!deferredPrompt){toast('Use o menu do navegador e escolha “Adicionar à tela inicial”.');return;}deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').classList.add('hidden');});
if('serviceWorker' in navigator && location.protocol.startsWith('http'))window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();
