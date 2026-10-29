// Lógica de Gastos del hogar (Supabase). Las credenciales están en js/config.js
(function(){
var S={payments:[]};
var sb=supabase.createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_ANON_KEY);
var DEFAULTS=["Luz","Agua","Gas","Internet","Teléfono","Cable / TV","Predial","Tenencia / Vehicular","Expensas / Mantenimiento","Seguro"];
var tab="venc",q="",fSvc="",hFrom="",hTo="",rYear=String(new Date().getFullYear()),editId=null,started=false;
var $=function(s){return document.querySelector(s)};
var money=function(n){return "$"+Number(n).toLocaleString("es",{minimumFractionDigits:2,maximumFractionDigits:2})};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})};
var find=function(id){return S.payments.find(function(p){return p.id===id})};
function ymd(d){var x=new Date(d);return new Date(x.getTime()-x.getTimezoneOffset()*60000).toISOString().slice(0,10)}
function parse(s){var p=s.split("-");return new Date(+p[0],+p[1]-1,+p[2])}
function fdate(s){return (typeof s==="string"?parse(s):s).toLocaleDateString("es",{day:"numeric",month:"short",year:"numeric"})}
function norm(x){return (x||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")}
function toast(t){var d=document.createElement("div");d.className="toast";d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove()},2200)}
function msg(e){return (e&&e.message)||"Error inesperado"}
function ck(r){if(r.error)throw r.error;return r}
function uniq(a){var m={};a.forEach(function(x){x=(x||"").trim();if(x&&!m[x.toLowerCase()])m[x.toLowerCase()]=x});return Object.keys(m).map(function(k){return m[k]}).sort(function(a,b){return a.localeCompare(b,"es")})}
function opts(a,sel){return a.map(function(x){return '<option'+(x.toLowerCase()===(sel||"").toLowerCase()?' selected':'')+'>'+esc(x)+'</option>'}).join("")}
function svcNames(){return uniq(S.payments.map(function(p){return p.service}))}

// Próximo vencimiento: el día indicado del mes siguiente al pago
function dueDate(p){var d=parse(p.date),y=d.getFullYear(),m=d.getMonth()+1,last=new Date(y,m+1,0).getDate();return new Date(y,m,Math.min(p.dueDay,last))}
function today0(){var t=new Date();return new Date(t.getFullYear(),t.getMonth(),t.getDate())}
function upcoming(){
  var latest={};
  S.payments.forEach(function(p){var k=p.service.toLowerCase();if(!latest[k]||p.date>latest[k].date)latest[k]=p});
  var t=today0();
  return Object.keys(latest).map(function(k){var p=latest[k],d=dueDate(p);return {p:p,due:d,days:Math.round((d-t)/864e5)}}).sort(function(a,b){return a.days-b.days});
}
function dueTxt(n){return n<0?"Vencido hace "+(-n)+(n===-1?" día":" días"):n===0?"Vence hoy":n===1?"Vence mañana":"En "+n+" días"}
function qd(n){return n<0?"zero":(n<=3?"low":"")}

function render(){
  document.querySelectorAll("[data-tab]").forEach(function(b){b.setAttribute("aria-selected",b.dataset.tab===tab)});
  var cr=$("#crumb");if(cr){var inMain=MAIN.indexOf(tab)>-1;cr.textContent=inMain?"":tabLabel(tab);cr.style.display=inMain?"none":""}
  var v=$("#view");
  if(tab==="venc")v.innerHTML=venc();else if(tab==="hist")v.innerHTML=hist();else v.innerHTML=res();
  var s=$("#search");if(s){s.value=q;s.oninput=function(){q=s.value;var pos=s.selectionStart;render();var n=$("#search");n.focus();n.setSelectionRange(pos,pos)}}
}

/* ---------- Vencimientos ---------- */
function venc(){
  var t=today0(),tm=0,ty=0;
  S.payments.forEach(function(p){var d=parse(p.date);if(d.getFullYear()===t.getFullYear()){ty+=p.amount;if(d.getMonth()===t.getMonth())tm+=p.amount}});
  var up=upcoming(),soon=up.filter(function(i){return i.days<=3});
  var h='<div class="stats"><div class="stat"><b>'+money(tm)+'</b><span>Pagado este mes</span></div><div class="stat"><b>'+money(ty)+'</b><span>Pagado este año</span></div><div class="stat"><b>'+up.length+'</b><span>Servicios</span></div><div class="stat"><b>'+soon.length+'</b><span>Vencidos o por vencer</span></div></div>';
  soon.forEach(function(i){h+='<div class="alert'+(i.days<0?' late':'')+'">'+(i.days<0?"⚠ ":"🔔 ")+esc(i.p.service)+": "+dueTxt(i.days).toLowerCase()+" ("+fdate(i.due)+")</div>"});
  h+='<div class="row" style="margin-top:6px"><button class="btn primary" data-a="new" style="flex:1">Nuevo pago</button><button class="btn" data-a="refresh">Actualizar</button></div>';
  if(!up.length)h+='<div class="empty">Todavía no registraste pagos. Toca «Nuevo pago» para empezar.</div>';
  up.forEach(function(i){
    h+='<div class="card"><div class="item"><div><div class="name">'+esc(i.p.service)+'</div><div class="meta">Vence el '+fdate(i.due)+'</div><div class="meta">Último pago: '+money(i.p.amount)+' · '+fdate(i.p.date)+'</div></div><div class="qty wide '+qd(i.days)+'">'+dueTxt(i.days)+'</div></div>'+
    '<div class="actions"><button class="btn sm primary" data-a="payfor" data-id="'+i.p.id+'">Registrar pago de este mes</button></div></div>';
  });
  return h;
}

/* ---------- Pagos (historial) ---------- */
function inRange(day){return !(hFrom&&day<hFrom)&&!(hTo&&day>hTo)}
function filtered(){
  var words=norm(q).split(/\s+/).filter(Boolean);
  return S.payments.filter(function(p){
    var hay=norm(p.service+" "+p.desc);
    if(!words.every(function(w){return hay.indexOf(w)>-1}))return false;
    if(fSvc&&p.service.toLowerCase()!==fSvc.toLowerCase())return false;
    return inRange(p.date);
  });
}
function hist(){
  var list=filtered(),tot=0;list.forEach(function(p){tot+=p.amount});
  var h='<div class="row"><input id="search" type="search" placeholder="Buscar por servicio o descripción" aria-label="Buscar pago"><button class="btn primary" data-a="new">Nuevo pago</button></div>';
  h+='<div class="row" style="flex-wrap:wrap"><select id="fsvc" aria-label="Filtrar por servicio" style="flex:1;min-width:130px"><option value="">Todos los servicios</option>'+opts(svcNames(),fSvc)+'</select>'+
     '<input id="hfrom" type="date" aria-label="Desde" value="'+hFrom+'" style="flex:1;min-width:130px"><input id="hto" type="date" aria-label="Hasta" value="'+hTo+'" style="flex:1;min-width:130px"></div>';
  h+='<div class="row" style="align-items:center"><button class="chip" data-a="hrange" data-v="month">Este mes</button><button class="chip" data-a="hrange" data-v="year">Este año</button>'+((hFrom||hTo||fSvc||q)?'<button class="btn sm" data-a="hclear">Limpiar filtros</button>':'')+'<span class="meta" style="margin-left:auto">'+list.length+' pagos · '+money(tot)+'</span></div>';
  if(!list.length)h+='<div class="empty">'+(S.payments.length?"Ningún pago coincide con los filtros.":"Todavía no registraste pagos.")+'</div>';
  list.forEach(function(p){
    h+='<div class="card sale"><div class="top"><span>'+esc(p.service)+'</span><span>'+money(p.amount)+'</span></div><div class="meta">'+(p.desc?esc(p.desc)+' · ':'')+'Pagado el '+fdate(p.date)+' · vence el día '+p.dueDay+'</div>'+
    '<div class="actions"><button class="btn sm" data-a="edit" data-id="'+p.id+'">Editar</button><button class="btn sm danger" data-a="del" data-id="'+p.id+'">Eliminar</button></div></div>';
  });
  return h;
}

/* ---------- Resumen ---------- */
function res(){
  var years=uniq(S.payments.map(function(p){return p.date.slice(0,4)}).concat([String(new Date().getFullYear())])).sort().reverse();
  var list=S.payments.filter(function(p){return p.date.slice(0,4)===rYear}),tot=0,bySvc={},byMon=[];
  for(var i=0;i<12;i++)byMon.push(0);
  list.forEach(function(p){tot+=p.amount;var k=p.service;bySvc[k]=(bySvc[k]||0)+p.amount;byMon[+p.date.slice(5,7)-1]+=p.amount});
  var svc=Object.keys(bySvc).sort(function(a,b){return bySvc[b]-bySvc[a]});
  var MES=["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  var mx=Math.max.apply(null,byMon.concat([1]));
  var h='<div class="row" style="align-items:center"><select id="ryear" aria-label="Año" style="flex:1">'+opts(years,rYear)+'</select><div class="stat" style="flex:1"><b>'+money(tot)+'</b><span>Total del año</span></div></div>';
  h+='<div class="card"><h2>Por servicio</h2>'+(svc.length?svc.map(function(k){return '<div class="line"><span>'+esc(k)+'</span><b>'+money(bySvc[k])+'</b></div>'}).join(""):'<div class="meta">Sin pagos en este año.</div>')+'</div>';
  h+='<div class="card"><h2>Por mes</h2>'+MES.map(function(m,i){return '<div style="padding:6px 0"><div class="line" style="border:0;padding:0"><span>'+m+'</span><b>'+money(byMon[i])+'</b></div><div class="bar"><i style="width:'+Math.round(byMon[i]/mx*100)+'%"></i></div></div>'}).join("")+'</div>';
  return h;
}

/* ---------- Carga, menú y sesión ---------- */
async function load(){
  var r=await sb.from("payments").select("*").order("paid_date",{ascending:false}).limit(2000);
  ck(r);
  S.payments=r.data.map(function(x){return {id:x.id,service:x.service,desc:x.description||"",amount:Number(x.amount),date:x.paid_date,dueDay:x.due_day}});
  var dl=$("#svcs");if(dl)dl.innerHTML=uniq(DEFAULTS.concat(S.payments.map(function(p){return p.service}))).map(function(b){return '<option value="'+esc(b)+'">'}).join("");
  render();
}
var sub=null,tm=null;
function soon(){clearTimeout(tm);tm=setTimeout(function(){load().catch(function(e){toast(msg(e))})},300)}
function listen(){if(sub)return;sub=sb.channel("cambios");sub.on("postgres_changes",{event:"*",schema:"public",table:"payments"},soon);sub.subscribe()}
var TABS=[["venc","Vencimientos"],["hist","Pagos"],["res","Resumen"]];
var MAIN=["venc","hist","res"];
function tabLabel(k){var t=TABS.filter(function(x){return x[0]===k})[0];return t?t[1]:""}
function buildMenus(){
  $("#mainnav").innerHTML=MAIN.map(function(k){return '<button role="tab" data-tab="'+k+'" aria-selected="'+(tab===k)+'">'+tabLabel(k)+'</button>'}).join("");
  $("#menulist").innerHTML=TABS.map(function(t){return '<button class="menuitem" data-tab="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+t[1]+'</button>'}).join("");
}
function openMenu(){$("#drawer").classList.add("open");$("#scrim").classList.add("open");$("#menubtn").setAttribute("aria-expanded","true");$("#menuclose").focus()}
function closeMenu(){
  var d=$("#drawer");if(!d.classList.contains("open"))return;
  d.classList.remove("open");$("#scrim").classList.remove("open");
  var b=$("#menubtn");b.setAttribute("aria-expanded","false");b.focus();
}
$("#menubtn").onclick=openMenu;$("#menuclose").onclick=closeMenu;$("#scrim").onclick=closeMenu;
document.addEventListener("keydown",function(e){if(e.key==="Escape")closeMenu()});
async function start(session){
  if(!session){sb.removeAllChannels();sub=null;S={payments:[]};$("#app").hidden=true;$("#auth").hidden=false;started=false;closeMenu();return}
  $("#auth").hidden=true;$("#app").hidden=false;
  if(!started){tab="venc";started=true}
  buildMenus();
  $("#sync").textContent=session.user.email;
  listen();
  try{await load()}catch(e){toast(msg(e))}
}
sb.auth.onAuthStateChange(function(ev,session){setTimeout(function(){start(session)},0)});
$("#aform").addEventListener("submit",async function(e){
  e.preventDefault();$("#aerr").textContent="";
  var r=await sb.auth.signInWithPassword({email:$("#aemail").value.trim(),password:$("#apass").value});
  if(r.error)$("#aerr").textContent="Correo o contraseña incorrectos";
});
$("#logout").onclick=function(){closeMenu();sb.auth.signOut()};

/* ---------- Eventos ---------- */
document.addEventListener("change",function(e){
  if(e.target.id==="fsvc"){fSvc=e.target.value;render()}
  else if(e.target.id==="hfrom"){hFrom=e.target.value;render()}
  else if(e.target.id==="hto"){hTo=e.target.value;render()}
  else if(e.target.id==="ryear"){rYear=e.target.value;render()}
});
function openForm(title,p){
  $("#ptitle").textContent=title;$("#pform").reset();
  $("#psvc").value=p&&p.service||"";$("#pdesc").value=p&&p.desc||"";$("#pamt").value=p&&p.amount!=null?p.amount:"";
  $("#pdate").value=p&&p.date||ymd(Date.now());$("#pdue").value=p&&p.dueDay||"";
  $("#pdlg").showModal();
}
document.addEventListener("click",async function(e){
  var t=e.target.closest("[data-tab],[data-a]");if(!t)return;
  if(t.dataset.tab){closeMenu();tab=t.dataset.tab;q="";fSvc="";hFrom="";hTo="";render();return}
  var a=t.dataset.a,id=t.dataset.id,p=id&&find(id);
  try{
    if(a==="new"){editId=null;openForm("Nuevo pago",null)}
    else if(a==="payfor"&&p){editId=null;openForm("Pago de "+p.service,{service:p.service,desc:"",amount:p.amount,date:ymd(Date.now()),dueDay:p.dueDay})}
    else if(a==="edit"&&p){editId=id;openForm("Editar pago",p)}
    else if(a==="del"&&p){if(confirm("¿Eliminar el pago de «"+p.service+"» del "+fdate(p.date)+"?")){ck(await sb.from("payments").delete().eq("id",id));await load()}}
    else if(a==="refresh"){await load();toast("Datos actualizados")}
    else if(a==="hrange"){var td=ymd(Date.now());hTo=td;hFrom=t.dataset.v==="month"?td.slice(0,8)+"01":td.slice(0,5)+"01-01";render()}
    else if(a==="hclear"){hFrom="";hTo="";fSvc="";q="";render()}
  }catch(err){toast(msg(err));load().catch(function(){})}
});
$("#pform").addEventListener("submit",async function(e){
  if(e.submitter&&e.submitter.value!=="ok")return;
  var d={service:$("#psvc").value.trim(),description:$("#pdesc").value.trim(),amount:parseFloat($("#pamt").value),paid_date:$("#pdate").value,due_day:parseInt($("#pdue").value,10)};
  if(!d.service||!(d.amount>=0)||!d.paid_date||!(d.due_day>=1&&d.due_day<=31))return;
  try{
    if(editId)ck(await sb.from("payments").update(d).eq("id",editId));else ck(await sb.from("payments").insert(d));
    await load();toast("Pago registrado: "+money(d.amount));
  }catch(err){toast(msg(err))}
});
})();
