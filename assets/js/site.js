const STREAMLINE_API="https://api.streamlinebusinessos.com";

function showConsultationThankYou(){
  const existing=document.querySelector("[data-consult-thankyou]");
  if(existing)existing.remove();
  const overlay=document.createElement("div");
  overlay.className="consult-thankyou-overlay";
  overlay.setAttribute("data-consult-thankyou","");
  overlay.innerHTML=`<div class="consult-thankyou-modal" role="dialog" aria-modal="true" aria-labelledby="consult-thankyou-title"><button type="button" class="consult-thankyou-close" aria-label="Close">×</button><div class="consult-thankyou-check">✓</div><h2 id="consult-thankyou-title">Thank you!</h2><p>Your consultation request has been submitted. We’ll reach out soon.</p><button type="button" class="btn btn-primary consult-thankyou-done">Done</button></div>`;
  const close=()=>{overlay.classList.add("closing");setTimeout(()=>overlay.remove(),160)};
  overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
  overlay.querySelector(".consult-thankyou-close").addEventListener("click",close);
  overlay.querySelector(".consult-thankyou-done").addEventListener("click",close);
  document.body.appendChild(overlay);
  requestAnimationFrame(()=>overlay.classList.add("open"));
  overlay.querySelector(".consult-thankyou-done").focus();
}

document.addEventListener("DOMContentLoaded",()=>{
  const page=document.body.dataset.page||"";
  document.querySelectorAll("[data-nav]").forEach(a=>{if(a.dataset.nav===page)a.classList.add("active")});
  const menu=document.querySelector(".menu-btn"),mobile=document.querySelector(".mobile-menu");
  if(menu&&mobile)menu.addEventListener("click",()=>{mobile.style.display=mobile.style.display==="block"?"none":"block"});
  const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("show")}),{threshold:.08});
  document.querySelectorAll(".reveal").forEach(el=>obs.observe(el));
  document.querySelectorAll(".faq-q").forEach(btn=>btn.addEventListener("click",()=>btn.closest(".faq-item").classList.toggle("open")));

  const phone=document.querySelector('[data-consultation-form] input[name="phone"]');
  if(phone)phone.addEventListener("input",()=>{
    const d=phone.value.replace(/\D/g,"").slice(0,10);
    phone.value=d.length>6?`(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}`:d.length>3?`(${d.slice(0,3)}) ${d.slice(3)}`:d.length?`(${d}`:"";
  });

  document.querySelectorAll("form[data-consultation-form]").forEach(form=>{
    form.addEventListener("submit",async e=>{
      e.preventDefault();
      const status=form.querySelector("[data-form-status]"),button=form.querySelector("[data-consult-submit]");
      if(!form.reportValidity())return;
      const f=new FormData(form);
      const body={
        name:String(f.get("name")||"").trim(),business:String(f.get("business")||"").trim(),email:String(f.get("email")||"").trim(),phone:String(f.get("phone")||"").trim(),
        businessAddress:String(f.get("businessAddress")||"").trim(),businessCity:String(f.get("businessCity")||"").trim(),businessState:String(f.get("businessState")||"").trim().toUpperCase(),businessPostalCode:String(f.get("businessPostalCode")||"").trim(),
        products:[String(f.get("product")||"").trim()].filter(Boolean),source:String(f.get("source")||"Website").trim(),message:String(f.get("message")||"").trim(),page:location.href,submittedAt:new Date().toISOString(),website:String(f.get("website")||"")
      };
      button.disabled=true;button.textContent="Sending…";status.className="form-note";status.textContent="Sending your request securely to Streamline Systems…";
      try{
        const r=await fetch(`${STREAMLINE_API}/api/v1/public/consultations`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
        let data={};try{data=await r.json()}catch{}
        if(!r.ok)throw new Error(data?.error?.message||data?.message||`Request failed (${r.status})`);
        form.reset();
        status.className="form-note form-success";
        status.textContent="Request received. Thank you — Streamline Systems will follow up to schedule your consultation.";
        showConsultationThankYou();
      }catch(err){
        status.className="form-note form-error";
        status.textContent=err?.message||"We could not send the request automatically. Please try again in a moment.";
      }finally{button.disabled=false;button.textContent="Request consultation";}
    });
  });
});
