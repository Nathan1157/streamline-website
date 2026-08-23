const PROPERTIES_API="https://api.streamlinebusinessos.com";
const propsAccessKey="streamline_properties_access";
const propsRefreshKey="streamline_properties_refresh";
const tenantAccessKey="streamline_tenant_access";
const tenantRefreshKey="streamline_tenant_refresh";
const customerAccessKey="streamline_customer_access";

function escp(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function propsStatus(el,msg,bad=false){if(!el)return;el.textContent=msg;el.className=`account-form-status${bad?" error":""}`}
async function jsonRequest(path,{method="GET",body=null,token=null}={}){
  const headers={"Content-Type":"application/json"};if(token)headers.Authorization=`Bearer ${token}`;
  const r=await fetch(`${PROPERTIES_API}${path}`,{method,headers,body});let d={};try{d=await r.json()}catch{}
  if(!r.ok)throw Object.assign(new Error(d?.error?.message||d?.message||`Request failed (${r.status})`),{status:r.status,code:d?.error?.code});return d;
}
async function propertiesRequest(path,opts={},tenant=false){
  const accessKey=tenant?tenantAccessKey:propsAccessKey,refreshKey=tenant?tenantRefreshKey:propsRefreshKey;
  let token=sessionStorage.getItem(accessKey);
  try{return await jsonRequest(path,{...opts,token})}catch(err){
    const refresh=sessionStorage.getItem(refreshKey);if(err.status!==401||!refresh)throw err;
    const r=await jsonRequest("/api/v1/properties/auth/refresh",{method:"POST",body:JSON.stringify({refreshToken:refresh})});
    sessionStorage.setItem(accessKey,r.accessToken);sessionStorage.setItem(refreshKey,r.refreshToken);
    return jsonRequest(path,{...opts,token:r.accessToken});
  }
}
async function propertiesLogout(tenant=false){
  const accessKey=tenant?tenantAccessKey:propsAccessKey,refreshKey=tenant?tenantRefreshKey:propsRefreshKey,refresh=sessionStorage.getItem(refreshKey);
  sessionStorage.removeItem(accessKey);sessionStorage.removeItem(refreshKey);
  if(refresh){try{await jsonRequest("/api/v1/properties/auth/logout",{method:"POST",body:JSON.stringify({refreshToken:refresh})})}catch{}}
  location.href=tenant?"/tenant/login/":"/properties/login/";
}

document.addEventListener("DOMContentLoaded",()=>{
  const landlordLogin=document.querySelector("#properties-login-form");
  if(landlordLogin){
    if(sessionStorage.getItem(propsAccessKey)){location.replace("/properties/");return}
    landlordLogin.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(landlordLogin),status=landlordLogin.querySelector("[data-status]"),btn=landlordLogin.querySelector("button[type=submit]");propsStatus(status,"Signing in…");btn.disabled=true;try{const d=await jsonRequest("/api/v1/properties/auth/landlord/login",{method:"POST",body:JSON.stringify({email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||"")})});sessionStorage.setItem(propsAccessKey,d.accessToken);sessionStorage.setItem(propsRefreshKey,d.refreshToken);location.href="/properties/"}catch(err){propsStatus(status,err.message||"Unable to sign in.",true)}finally{btn.disabled=false}});return;
  }
  const setup=document.querySelector("#properties-setup-form");
  if(setup){
    const customerToken=sessionStorage.getItem(customerAccessKey);if(!customerToken){location.replace("/account/login/");return}
    setup.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(setup),status=setup.querySelector("[data-status]"),btn=setup.querySelector("button[type=submit]");propsStatus(status,"Creating Properties owner account…");btn.disabled=true;try{const d=await jsonRequest("/api/v1/properties/auth/bootstrap-owner",{method:"POST",token:customerToken,body:JSON.stringify({displayName:String(fd.get("displayName")||"").trim(),email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||"")})});sessionStorage.setItem(propsAccessKey,d.accessToken);sessionStorage.setItem(propsRefreshKey,d.refreshToken);location.href="/properties/"}catch(err){if(err.code==="PROPERTIES_ALREADY_CONFIGURED"){location.href="/properties/login/";return}propsStatus(status,err.message||"Unable to create the Properties account.",true)}finally{btn.disabled=false}});return;
  }
  const tenantLogin=document.querySelector("#tenant-login-form");
  if(tenantLogin){
    if(sessionStorage.getItem(tenantAccessKey)){location.replace("/tenant/");return}
    tenantLogin.addEventListener("submit",async e=>{e.preventDefault();const fd=new FormData(tenantLogin),status=tenantLogin.querySelector("[data-status]"),btn=tenantLogin.querySelector("button[type=submit]");propsStatus(status,"Signing in…");btn.disabled=true;try{const d=await jsonRequest("/api/v1/properties/auth/tenant/login",{method:"POST",body:JSON.stringify({email:String(fd.get("email")||"").trim(),password:String(fd.get("password")||"")})});sessionStorage.setItem(tenantAccessKey,d.accessToken);sessionStorage.setItem(tenantRefreshKey,d.refreshToken);location.href="/tenant/"}catch(err){propsStatus(status,err.message||"Unable to sign in.",true)}finally{btn.disabled=false}});return;
  }
  const landlordDash=document.querySelector("[data-properties-dashboard]");
  if(landlordDash){
    if(!sessionStorage.getItem(propsAccessKey)&&!sessionStorage.getItem(propsRefreshKey)){location.replace("/properties/login/");return}
    document.querySelector("[data-properties-logout]")?.addEventListener("click",()=>propertiesLogout(false));
    propertiesRequest("/api/v1/properties/auth/landlord/me").then(d=>{document.querySelector("[data-props-loading]").hidden=true;landlordDash.hidden=false;document.querySelector("[data-props-org]").textContent=d.organization.displayName||"Properties";document.querySelector("[data-props-user]").textContent=d.user.displayName||d.user.email;document.querySelector("[data-props-role]").textContent=String(d.user.role||"").replaceAll("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}).catch(err=>{if(err.status===401){propertiesLogout(false);return}const box=document.querySelector("[data-props-error]");box.hidden=false;box.textContent=err.message});return;
  }
  const tenantDash=document.querySelector("[data-tenant-dashboard]");
  if(tenantDash){
    if(!sessionStorage.getItem(tenantAccessKey)&&!sessionStorage.getItem(tenantRefreshKey)){location.replace("/tenant/login/");return}
    document.querySelector("[data-tenant-logout]")?.addEventListener("click",()=>propertiesLogout(true));
    propertiesRequest("/api/v1/properties/auth/tenant/me",{},true).then(d=>{document.querySelector("[data-tenant-loading]").hidden=true;tenantDash.hidden=false;document.querySelector("[data-tenant-name]").textContent=d.user.displayName||d.user.email;document.querySelector("[data-tenant-org]").textContent=d.organization.displayName||"Property Management"}).catch(err=>{if(err.status===401){propertiesLogout(true);return}const box=document.querySelector("[data-tenant-error]");box.hidden=false;box.textContent=err.message});
  }
});
