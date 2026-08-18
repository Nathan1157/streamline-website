const STREAMLINE_API="https://api.streamlinebusinessos.com";

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
      }catch(err){
        status.className="form-note form-error";
        status.textContent=err?.message||"We could not send the request automatically. Please try again in a moment.";
      }finally{button.disabled=false;button.textContent="Request consultation";}
    });
  });
});
