
const reveals = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.12 });
reveals.forEach((el) => observer.observe(el));

const glow = document.querySelector('.cursor-glow');
window.addEventListener('pointermove', (e) => {
  if (!glow) return;
  glow.style.left = e.clientX + 'px';
  glow.style.top = e.clientY + 'px';
}, { passive:true });

const nav = document.querySelector('.site-nav');

window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (nav) {
    const t = Math.min(y / 500, 1);
    nav.style.background = `rgba(7,9,10,${0.58 + (t * 0.20)})`;
    nav.style.transform = `translateX(-50%) translateY(${t * -4}px) scale(${1 - t * .012})`;
  }

  document.querySelectorAll('.product-card').forEach((card) => {
    const r = card.getBoundingClientRect();
    const center = innerHeight * .5;
    const d = (r.top + r.height/2 - center) / innerHeight;
    const tilt = Math.max(-1, Math.min(1, d));
    card.style.transform = `translateY(${tilt * -8}px)`;
  });
}, { passive:true });

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior:'smooth', block:'start' });
  });
});
