const ACCOUNT_API="https://api.streamlinebusinessos.com";
const tokenKey="streamline_customer_access";
const refreshKey="streamline_customer_refresh";

function money(v,c="USD"){if(v===null||v===undefined||v==="")return "—";return new Intl.NumberFormat("en-US",{style:"currency",currency:c}).format(Number(v)||0)}
function date(v){if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?"—":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"})}
function esc(v){return String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]))}
function labelStatus(v){return String(v||"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())||"—"}

async function api(path,opts={}){
  const headers={"Content-Type":"application/json",...(opts.headers||{})};
  const token=sessionStorage.getItem(tokenKey);if(token)headers.Authorization=`Bearer ${token}`;
  let r=await fetch(`${ACCOUNT_API}${path}`,{...opts,headers});
  if(r.status===401&&sessionStorage.getItem(refreshKey)){
    const rr=await fetch(`${ACCOUNT_API}/api/v1/auth/refresh`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken:sessionStorage.getItem(refreshKey)})});
    if(rr.ok){const t=await rr.json();sessionStorage.setItem(tokenKey,t.accessToken);sessionStorage.setItem(refreshKey,t.refreshToken);headers.Authorization=`Bearer ${t.accessToken}`;r=await fetch(`${ACCOUNT_API}${path}`,{...opts,headers});}
  }
  let data={};try{data=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(data?.error?.message||data?.message||`Request failed (${r.status})`),{status:r.status});
  return data;
}

async function logout(){
  const refreshToken=sessionStorage.getItem(refreshKey);
  sessionStorage.removeItem(tokenKey);sessionStorage.removeItem(refreshKey);
  if(refreshToken){try{await fetch(`${ACCOUNT_API}/api/v1/auth/logout`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({refreshToken})})}catch{}}
  location.href="/account/login/";
}

function renderEmpty(text){return `<div class="account-empty">${esc(text)}</div>`}
function renderOverview(d){
  document.querySelector("[data-business-name]").textContent=d.customer.businessName||"My Streamline";
  document.querySelector("[data-account-email]").textContent=d.account.email||"";
  document.querySelector("[data-software-count]").textContent=d.software.length;
  document.querySelector("[data-license-count]").textContent=d.licenses.filter(x=>x.status==="active").length;
  document.querySelector("[data-device-count]").textContent=d.devices.filter(x=>x.status==="active").length;
  document.querySelector("[data-customer-status]").textContent=labelStatus(d.customer.status);
  document.querySelector("[data-customer-since]").textContent=`Customer since ${date(d.customer.customerSince)}`;

  const products=document.querySelector("[data-products]");
  products.innerHTML=d.software.length?d.software.map(p=>`<article class="account-product-card"><div class="account-product-top"><div><span class="account-pill">${esc(p.ownership==="granted"?"Owned":"Purchased")}</span><h3>${esc(p.name)}</h3></div>${p.currentVersion?`<span class="account-version">v${esc(p.currentVersion)}</span>`:""}</div><div class="account-product-meta"><span>${p.purchasedAt?`Purchased ${date(p.purchasedAt)}`:"Included with your account"}</span>${p.amountPaid!==null?`<strong>${money(p.amountPaid)}</strong>`:""}</div>${p.productId==="streamline.properties"?`<div class="account-product-actions"><a class="btn btn-primary account-download" href="/properties/setup/">Open Properties</a>${p.downloadUrl?`<a class="btn btn-light account-download" href="${esc(p.downloadUrl)}">Download Desktop</a>`:""}</div>`:(p.downloadUrl?`<a class="btn btn-primary account-download" href="${esc(p.downloadUrl)}">Download</a>`:`<span class="account-muted-action">Download not published yet</span>`)}</article>`).join(""):renderEmpty("No software purchases are attached to this account yet.");

  const licenses=document.querySelector("[data-licenses]");
  licenses.innerHTML=d.licenses.length?d.licenses.map(l=>`<div class="account-list-row"><div><strong>${esc(l.productName)}</strong><span>${labelStatus(l.type)} · Issued ${date(l.issuedAt)}</span></div><div class="account-list-side"><span class="account-status ${l.status==='active'?'good':''}">${labelStatus(l.status)}</span><small>${l.activeDevices}/${l.maxDevices} devices</small></div></div>`).join(""):renderEmpty("No separate license records are attached yet.");

  const devices=document.querySelector("[data-devices]");
  devices.innerHTML=d.devices.length?d.devices.map(x=>`<div class="account-list-row"><div><strong>${esc(x.name||"Core device")}</strong><span>${esc(x.platform||"Windows")}${x.appVersion?` · Core ${esc(x.appVersion)}`:""}</span></div><div class="account-list-side"><span class="account-status ${x.status==='active'?'good':''}">${labelStatus(x.status)}</span><small>${x.lastSeenAt?`Seen ${date(x.lastSeenAt)}`:`Registered ${date(x.registeredAt)}`}</small></div></div>`).join(""):renderEmpty("No Core devices are currently registered.");

  const sub=d.billing.subscription;const subBox=document.querySelector("[data-subscription]");
  if(sub){subBox.innerHTML=`<div class="account-billing-big"><strong>${money(sub.monthlyPrice,sub.currency)}</strong><span>per month</span></div><div class="account-detail-list"><div><span>Status</span><strong>${labelStatus(sub.status)}</strong></div><div><span>Next renewal</span><strong>${date(sub.renewsAt)}</strong></div><div><span>Payment</span><strong>${labelStatus(sub.paymentStatus)}</strong></div>${sub.paymentMethod?`<div><span>Payment method</span><strong>${esc(sub.paymentMethod.brand||"Card")} •••• ${esc(sub.paymentMethod.last4)}</strong></div>`:""}</div>`;if(sub.hasBillingPortal)document.querySelector("[data-manage-billing]").hidden=false}
  else subBox.innerHTML=renderEmpty("No recurring Streamline services are active on this account.");

  const payments=[...(d.billing.purchases||[]).map(x=>({...x,kind:"Purchase"})),...(d.billing.subscriptionPayments||[]).map(x=>({...x,kind:"Subscription",currency:"USD"}))].sort((a,b)=>new Date(b.paidAt||0)-new Date(a.paidAt||0));
  document.querySelector("[data-payments]").innerHTML=payments.length?payments.map(x=>`<div class="account-list-row"><div><strong>${esc(x.kind)}${x.quoteNumber?` · ${esc(x.quoteNumber)}`:""}</strong><span>${date(x.paidAt)}</span></div><div class="account-list-side"><strong>${money(x.amount,x.currency||"USD")}</strong><small>${labelStatus(x.status)}</small></div></div>`).join(""):renderEmpty("No payment history is available yet.");

  document.querySelector("[data-profile]").innerHTML=`<div class="account-detail-list account-detail-grid"><div><span>Account name</span><strong>${esc(d.account.fullName||"—")}</strong></div><div><span>Login email</span><strong>${esc(d.account.email||"—")}</strong></div><div><span>Business</span><strong>${esc(d.customer.businessName||"—")}</strong></div><div><span>Business email</span><strong>${esc(d.customer.email||"—")}</strong></div><div><span>Phone</span><strong>${esc(d.customer.phone||"—")}</strong></div><div><span>Account created</span><strong>${date(d.account.createdAt)}</strong></div></div>`;
}

document.addEventListener("DOMContentLoaded",()=>{
  const form=document.querySelector("#account-login-form");
  if(form){
    if(sessionStorage.getItem(tokenKey)){location.replace("/account/");return}
    form.addEventListener("submit",async e=>{e.preventDefault();const status=form.querySelector("[data-status]");const btn=form.querySelector("button[type=submit]");const fd=new FormData(form);status.textContent="Signing in…";status.className="account-form-status";btn.disabled=true;try{const d=await api("/api/v1/auth/core-account/login",{method:"POST",body:JSON.stringify({email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||"")})});sessionStorage.setItem(tokenKey,d.accessToken);sessionStorage.setItem(refreshKey,d.refreshToken);location.href="/account/"}catch(err){status.textContent=err.message||"Unable to sign in.";status.className="account-form-status error"}finally{btn.disabled=false}});return;
  }
  const dashboard=document.querySelector("[data-dashboard]");if(!dashboard)return;
  if(!sessionStorage.getItem(tokenKey)&&!sessionStorage.getItem(refreshKey)){location.replace("/account/login/");return}
  document.querySelector("[data-logout]")?.addEventListener("click",logout);
  document.querySelector("[data-manage-billing]")?.addEventListener("click",async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="Opening…";try{const d=await api("/api/v1/customer-portal/billing/portal-session",{method:"POST",body:"{}"});location.href=d.portalUrl}catch(err){alert(err.message||"Billing could not be opened.");b.disabled=false;b.textContent="Manage billing"}});
  api("/api/v1/customer-portal/overview").then(d=>{document.querySelector("[data-loading]").hidden=true;dashboard.hidden=false;renderOverview(d)}).catch(err=>{document.querySelector("[data-loading]").hidden=true;if(err.status===401){logout();return}const box=document.querySelector("[data-error]");box.hidden=false;box.textContent=err.message||"Your account could not be loaded."});
});
