
document.addEventListener("DOMContentLoaded",()=>{
  const page=document.body.dataset.page||"";
  document.querySelectorAll("[data-nav]").forEach(a=>{
    if(a.dataset.nav===page)a.classList.add("active");
  });
  const menu=document.querySelector(".menu-btn");
  const mobile=document.querySelector(".mobile-menu");
  if(menu&&mobile){
    menu.addEventListener("click",()=>{mobile.style.display=mobile.style.display==="block"?"none":"block"});
  }
  const obs=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add("show")});
  },{threshold:.08});
  document.querySelectorAll(".reveal").forEach(el=>obs.observe(el));
  document.querySelectorAll(".faq-q").forEach(btn=>{
    btn.addEventListener("click",()=>btn.closest(".faq-item").classList.toggle("open"));
  });
  document.querySelectorAll("form[data-static-form]").forEach(form=>{
    form.addEventListener("submit",(e)=>{
      e.preventDefault();
      const status=form.querySelector("[data-form-status]");
      if(status) status.textContent="Static preview only — this form is ready to connect to your existing backend after approval.";
    });
  });
});

window.addEventListener("scroll",()=>{
  const h=document.querySelector(".site-header");
  if(h) h.style.boxShadow=window.scrollY>18
    ?"0 12px 34px rgba(34,56,37,.09)"
    :"0 10px 28px rgba(34,56,37,.045)";
});
