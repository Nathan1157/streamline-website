const reveals=document.querySelectorAll('.reveal');
reveals.forEach((el,index)=>el.style.setProperty('--reveal-delay',`${Math.min(index%5,4)*70}ms`));
if('IntersectionObserver' in window){const observer=new IntersectionObserver((entries)=>entries.forEach((entry)=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08,rootMargin:'0px 0px -4%'});reveals.forEach(el=>observer.observe(el));}else{reveals.forEach(el=>el.classList.add('visible'));}

const motionOK=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if(motionOK){
 document.querySelectorAll('.product-preview-card,.experience-card,.ownership-card,.feature-card,.catalog-card').forEach(card=>{
  card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--tilt-x',`${(-y*2.2).toFixed(2)}deg`);card.style.setProperty('--tilt-y',`${(x*2.2).toFixed(2)}deg`);});
  card.addEventListener('pointerleave',()=>{card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');});
 });
}
const glow=document.querySelector('.cursor-glow');window.addEventListener('pointermove',(e)=>{if(!glow)return;glow.style.left=e.clientX+'px';glow.style.top=e.clientY+'px';},{passive:true});
const nav=document.querySelector('[data-nav]');window.addEventListener('scroll',()=>{if(nav)nav.classList.toggle('scrolled',window.scrollY>60);},{passive:true});
const menuButton=document.querySelector('[data-menu-button]');const menu=document.querySelector('[data-mobile-menu]');if(menuButton&&menu){menuButton.addEventListener('click',()=>{const open=menu.classList.toggle('open');menuButton.setAttribute('aria-expanded',String(open));});menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.classList.remove('open');menuButton.setAttribute('aria-expanded','false');}));}

const CONSULTATION_ENDPOINT='https://api.streamlinebusinessos.com/api/v1/public/consultations';
const form=document.querySelector('[data-consultation-form]');
if(form){
 const params=new URLSearchParams(location.search);const requested=params.get('product');if(requested){const box=form.querySelector(`input[data-product="${CSS.escape(requested)}"]`);if(box)box.checked=true;}
 form.addEventListener('submit',async(e)=>{
  e.preventDefault();
  const status=form.querySelector('[data-form-status]');
  const submit=form.querySelector('button[type="submit"]');
  if(submit.disabled)return;
  const data=new FormData(form);const products=data.getAll('products');
  const payload={name:String(data.get('name')||'').trim(),business:String(data.get('business')||'').trim(),email:String(data.get('email')||'').trim(),phone:String(data.get('phone')||'').trim(),products,source:String(data.get('source')||'').trim(),message:String(data.get('message')||'').trim(),website:String(data.get('website')||''),submittedAt:new Date().toISOString(),page:location.href};
  submit.disabled=true;status.textContent='Sending…';
  try{
   const res=await fetch(CONSULTATION_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
   let body=null;try{body=await res.json();}catch{}
   if(!res.ok||body?.ok===false)throw new Error(body?.error?.message||'Request failed');
   status.textContent='Request sent. Streamline will follow up directly.';form.reset();
  }catch(err){
   console.error('Consultation submission failed',err);
   status.textContent='We could not send the request automatically. Please try again in a moment.';
  }finally{submit.disabled=false;}
 });
}
