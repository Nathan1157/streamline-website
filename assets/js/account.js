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
  const loginForm=document.querySelector("#account-login-form");
  if(loginForm){
    if(sessionStorage.getItem(tokenKey)){location.replace("/account/");return}
    let challengeId=null,authenticatorRequired=false;
    const creds=loginForm.querySelector('[data-login-step="credentials"]'),verify=loginForm.querySelector('[data-login-step="verify"]'),status=loginForm.querySelector('[data-status]'),authField=loginForm.querySelector('[data-authenticator-field]');
    loginForm.querySelector('[data-login-back]')?.addEventListener('click',()=>{challengeId=null;authenticatorRequired=false;verify.hidden=true;creds.hidden=false;status.textContent='';loginForm.reset()});
    loginForm.addEventListener("submit",async e=>{
      e.preventDefault();status.textContent="";status.className="account-form-status";
      const btn=loginForm.querySelector('button[type="submit"]');btn.disabled=true;
      try{
        const fd=new FormData(loginForm);
        if(!challengeId){
          status.textContent="Checking credentials and sending your verification code…";
          const d=await api("/api/v1/auth/core-account/login",{method:"POST",body:JSON.stringify({email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||"")})});
          challengeId=d.challengeId;authenticatorRequired=!!d.authenticatorRequired;authField.hidden=!authenticatorRequired;authField.querySelector('input').required=authenticatorRequired;creds.hidden=true;verify.hidden=false;status.textContent="Verification code sent.";loginForm.querySelector('[name="verificationCode"]').focus();
        }else{
          status.textContent="Verifying…";
          const payload={challengeId,code:String(fd.get("verificationCode")||"").trim()};if(authenticatorRequired)payload.authenticatorCode=String(fd.get("authenticatorCode")||"").trim();
          const d=await api("/api/v1/auth/core-account/login/verify",{method:"POST",body:JSON.stringify(payload)});sessionStorage.setItem(tokenKey,d.accessToken);sessionStorage.setItem(refreshKey,d.refreshToken);location.href="/account/";
        }
      }catch(err){status.textContent=err.message||"Unable to sign in.";status.className="account-form-status error"}finally{btn.disabled=false}
    });return;
  }

  const resetForm=document.querySelector('#account-reset-form');
  if(resetForm){
    let challengeId=null;const emailStep=resetForm.querySelector('[data-reset-step="email"]'),completeStep=resetForm.querySelector('[data-reset-step="complete"]'),status=resetForm.querySelector('[data-status]');
    resetForm.addEventListener('submit',async e=>{e.preventDefault();status.textContent='';status.className='account-form-status';const btn=resetForm.querySelector('button[type="submit"]');btn.disabled=true;try{const fd=new FormData(resetForm);if(!challengeId){const d=await api('/api/v1/auth/core-account/password-reset/start',{method:'POST',body:JSON.stringify({email:String(fd.get('email')||'').trim()})});challengeId=d.challengeId;emailStep.hidden=true;completeStep.hidden=false;status.textContent='If an active account exists for that email, a reset code has been sent.';resetForm.querySelector('[name="resetCode"]').focus()}else{await api('/api/v1/auth/core-account/password-reset/complete',{method:'POST',body:JSON.stringify({challengeId,code:String(fd.get('resetCode')||'').trim(),password:String(fd.get('newPassword')||'')})});status.textContent='Password updated. Returning to sign in…';status.className='account-form-status';setTimeout(()=>location.href='/account/login/',900)}}catch(err){status.textContent=err.message||'Password could not be reset.';status.className='account-form-status error'}finally{btn.disabled=false}});return;
  }

  const dashboard=document.querySelector("[data-dashboard]");if(!dashboard)return;
  if(!sessionStorage.getItem(tokenKey)&&!sessionStorage.getItem(refreshKey)){location.replace("/account/login/");return}
  document.querySelector("[data-logout]")?.addEventListener("click",logout);
  document.querySelector("[data-manage-billing]")?.addEventListener("click",async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="Opening…";try{const d=await api("/api/v1/customer-portal/billing/portal-session",{method:"POST",body:"{}"});location.href=d.portalUrl}catch(err){alert(err.message||"Billing could not be opened.");b.disabled=false;b.textContent="Manage billing"}});
  api("/api/v1/customer-portal/overview").then(d=>{document.querySelector("[data-loading]").hidden=true;dashboard.hidden=false;renderOverview(d);renderMfa(d.account)}).catch(err=>{document.querySelector("[data-loading]").hidden=true;if(err.status===401){logout();return}const box=document.querySelector("[data-error]");box.hidden=false;box.textContent=err.message||"Your account could not be loaded."});
});

function renderMfa(account){
  const host=document.querySelector('[data-mfa-status]');if(!host)return;const setup=document.querySelector('[data-mfa-setup]');
  if(account?.totpEnabled){host.innerHTML='<p><span class="account-status good">Enabled</span> Authenticator-app verification is active for this account.</p><form data-mfa-disable class="account-form"><label>Current authenticator code<input type="text" name="code" inputmode="numeric" maxlength="6" pattern="\\d{6}" required></label><button class="btn btn-light" type="submit">Disable authenticator</button><p class="account-form-status" data-disable-message></p></form>';host.querySelector('[data-mfa-disable]').addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=form.querySelector('[data-disable-message]'),fd=new FormData(form);try{await api('/api/v1/auth/core-account/totp/disable',{method:'POST',body:JSON.stringify({code:String(fd.get('code')||'').trim()})});location.reload()}catch(err){msg.textContent=err.message;msg.className='account-form-status error'}});return}
  host.innerHTML='<p><span class="account-status">Not enabled</span> Add an authenticator app for an additional verification factor.</p><button class="btn btn-primary" type="button" data-start-mfa>Set up authenticator</button>';
  host.querySelector('[data-start-mfa]').addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Preparing…';try{const d=await api('/api/v1/auth/core-account/totp/setup',{method:'POST',body:'{}'});setup.hidden=false;setup.querySelector('[data-mfa-secret]').textContent=d.secret;setup.scrollIntoView({behavior:'smooth',block:'center'})}catch(err){alert(err.message||'Authenticator setup could not be started.')}finally{b.disabled=false;b.textContent='Set up authenticator'}});
  setup.querySelector('[data-mfa-confirm]')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,msg=form.querySelector('[data-mfa-message]'),fd=new FormData(form);try{await api('/api/v1/auth/core-account/totp/confirm',{method:'POST',body:JSON.stringify({code:String(fd.get('code')||'').trim()})});location.reload()}catch(err){msg.textContent=err.message;msg.className='account-form-status error'}});
}
