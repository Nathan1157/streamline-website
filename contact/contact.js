(()=>{
  'use strict';
  const API='https://api.streamlinebusinessos.com/api/v1/public/consultations';
  const form=document.getElementById('consult-form');
  if(!form)return;
  const status=document.getElementById('form-status');
  const submit=document.getElementById('consult-submit');
  const phone=document.getElementById('consult-phone');
  const state=document.getElementById('business-state');
  const zip=document.getElementById('business-zip');
  const success=document.getElementById('consult-success');
  const close=document.getElementById('consult-success-close');
  const summary=document.getElementById('consult-success-summary');

  const digits=v=>String(v||'').replace(/\D/g,'');
  function formatPhone(v){const d=digits(v).slice(0,10);if(d.length<4)return d.length?`(${d}`:'';if(d.length<7)return `(${d.slice(0,3)}) ${d.slice(3)}`;return `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`}
  phone?.addEventListener('input',()=>{phone.value=formatPhone(phone.value);phone.setCustomValidity('')});
  state?.addEventListener('input',()=>{state.value=state.value.replace(/[^a-z]/gi,'').slice(0,2).toUpperCase();state.setCustomValidity('')});
  zip?.addEventListener('input',()=>{zip.value=zip.value.replace(/[^\d-]/g,'').slice(0,10);zip.setCustomValidity('')});

  function validate(){
    const email=form.elements.email;
    if(!form.checkValidity()){form.reportValidity();return false}
    if(!/^\(\d{3}\) \d{3}-\d{4}$/.test(phone.value)){phone.setCustomValidity('Enter a 10-digit phone number.');phone.reportValidity();return false}
    if(!/^[A-Z]{2}$/.test(state.value)){state.setCustomValidity('Enter a 2-letter state abbreviation.');state.reportValidity();return false}
    if(!/^\d{5}(?:-\d{4})?$/.test(zip.value)){zip.setCustomValidity('Enter a valid 5-digit ZIP code.');zip.reportValidity();return false}
    if(!email.validity.valid){email.reportValidity();return false}
    return true;
  }
  function showSuccess(data){
    summary.innerHTML=`<strong>${escapeHtml(data.business)}</strong><span>${escapeHtml(data.city)}, ${escapeHtml(data.state)} ${escapeHtml(data.zip)}</span>`;
    success.classList.add('open');success.setAttribute('aria-hidden','false');document.body.classList.add('drawer-open');close.focus();
  }
  function hideSuccess(){success.classList.remove('open');success.setAttribute('aria-hidden','true');document.body.classList.remove('drawer-open')}
  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  close?.addEventListener('click',hideSuccess);
  success?.addEventListener('click',e=>{if(e.target===success)hideSuccess()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&success.classList.contains('open'))hideSuccess()});

  form.addEventListener('submit',async e=>{
    e.preventDefault();status.className='form-status';status.textContent='';
    if(!validate())return;
    const fd=new FormData(form),product=String(fd.get('product')||'').trim();
    const body={
      name:String(fd.get('name')||'').trim(),business:String(fd.get('business')||'').trim(),email:String(fd.get('email')||'').trim().toLowerCase(),phone:String(fd.get('phone')||'').trim(),
      businessAddress:String(fd.get('businessAddress')||'').trim(),businessCity:String(fd.get('businessCity')||'').trim(),businessState:String(fd.get('businessState')||'').trim().toUpperCase(),businessPostalCode:String(fd.get('businessPostalCode')||'').trim(),
      products:product?[product]:[],source:'website-contact',message:String(fd.get('message')||'').trim(),page:location.href,submittedAt:new Date().toISOString(),website:String(fd.get('website')||'')
    };
    submit.disabled=true;submit.textContent='Sending securely…';status.textContent='Sending your request…';
    try{
      const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(body),cache:'no-store',mode:'cors',credentials:'omit'});
      const j=await r.json().catch(()=>({}));if(!r.ok||!j.ok)throw new Error(j?.error?.message||'Unable to send request.');
      showSuccess({business:body.business,city:body.businessCity,state:body.businessState,zip:body.businessPostalCode});form.reset();status.textContent='';
    }catch(err){status.className='form-status error';status.textContent=err.message||'Unable to send request. Please call or email Streamline.'}
    finally{submit.disabled=false;submit.textContent='Send consultation request'}
  });
})();
