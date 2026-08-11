(() => {
  'use strict';

  const BASE = 'https://api.streamlinebusinessos.com/api/v1';
  const $ = (selector) => document.querySelector(selector);
  let token = sessionStorage.getItem('streamlineHqWebToken') || '';
  let user = null;
  let dashboardData = null;
  let activeFilter = 'all';
  let activeLeadId = null;

  if (window.location.search || window.location.hash) window.history.replaceState({}, document.title, window.location.pathname);

  function showError(el, message) { if (!el) return; el.style.display = 'block'; el.textContent = message; }
  function clearError(el) { if (!el) return; el.style.display = 'none'; el.textContent = ''; }
  function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function formatDate(value, includeTime = true) { if (!value) return '—'; const d = new Date(value); if (Number.isNaN(d.getTime())) return '—'; return d.toLocaleString([], includeTime ? {month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'} : {month:'short',day:'numeric',year:'numeric'}); }
  function prettyStatus(value) { return String(value || 'new').replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase()); }
  function isClosedStatus(status) { return ['won','lost','closed','disqualified'].includes(String(status || '').toLowerCase()); }

  async function api(path, options = {}) {
    const headers = {Accept:'application/json', ...(options.body ? {'Content-Type':'application/json'} : {}), ...(token ? {Authorization:`Bearer ${token}`} : {}), ...(options.headers || {})};
    let response;
    try { response = await fetch(`${BASE}${path}`, {...options, headers, cache:'no-store', mode:'cors', credentials:'omit', referrerPolicy:'strict-origin-when-cross-origin'}); }
    catch { throw new Error('Unable to reach Streamline Cloud. Check your connection and try again.'); }
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401 && path !== '/hq-auth/login') { logout(); throw new Error(payload?.error?.message || 'Your HQ session expired. Sign in again.'); }
    if (!response.ok || payload.ok === false) throw new Error(payload?.error?.message || `Cloud request failed (${response.status}).`);
    return payload;
  }

  function logout() {
    token = ''; user = null; dashboardData = null;
    sessionStorage.removeItem('streamlineHqWebToken'); sessionStorage.removeItem('streamlineHqWebUser');
    $('#dashboard-view')?.classList.remove('active'); if ($('#login-view')) $('#login-view').style.display = 'block'; closeLead();
  }

  async function login(loginId, pin) {
    const payload = await api('/hq-auth/login', {method:'POST', body:JSON.stringify({loginId, pin})});
    if (!payload.accessToken || !payload.user) throw new Error('Streamline Cloud did not return a valid HQ session.');
    token = payload.accessToken; user = payload.user;
    sessionStorage.setItem('streamlineHqWebToken', token); sessionStorage.setItem('streamlineHqWebUser', JSON.stringify(user));
    await openDashboard();
  }

  function assigneeName(id) {
    if (!id) return 'Unassigned';
    const match = dashboardData?.assignableUsers?.find(x => String(x.userId) === String(id));
    return match?.displayName || match?.loginId || 'Assigned user';
  }

  function allLeadPool() {
    const d = dashboardData || {};
    const map = new Map();
    [...(d.leads || []), ...(d.todayLeads || []), ...(d.newWebLeads || [])].forEach(l => map.set(String(l.id), l));
    return [...map.values()];
  }

  function filteredLeads() {
    const d = dashboardData || {};
    let rows = allLeadPool();
    const manager = Boolean(d.manager);
    if (!manager) rows = d.todayLeads || [];
    if (activeFilter === 'new-web') rows = manager ? (d.newWebLeads || []) : rows.filter(l => l.source === 'website' && l.status === 'new');
    if (activeFilter === 'today') rows = d.todayLeads || [];
    if (activeFilter === 'unassigned') rows = rows.filter(l => !l.assigned_user_id);
    if (activeFilter === 'open') rows = rows.filter(l => !isClosedStatus(l.status));
    const q = String($('#lead-search')?.value || '').trim().toLowerCase();
    if (q) rows = rows.filter(l => [l.business_name,l.contact_name,l.email,l.phone,l.source,l.status,assigneeName(l.assigned_user_id)].some(v => String(v || '').toLowerCase().includes(q)));
    return rows;
  }

  function leadElement(lead) {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'lead-row'; el.dataset.leadId = lead.id;
    el.innerHTML = `
      <div class="lead-name"><strong>${escapeHtml(lead.business_name || lead.contact_name || 'Unnamed lead')}</strong><span>${escapeHtml(lead.contact_name || 'No contact name')}</span></div>
      <div class="lead-cell"><strong>${escapeHtml(lead.email || lead.phone || 'No contact info')}</strong><span>${escapeHtml(lead.phone || lead.email || '')}</span></div>
      <div class="lead-cell"><strong>${formatDate(lead.consultation_at || lead.created_at)}</strong><span>${escapeHtml(lead.source || 'manual')}</span></div>
      <div class="lead-cell"><strong>${escapeHtml(assigneeName(lead.assigned_user_id))}</strong><span>${lead.assigned_user_id ? 'Assigned' : 'Needs assignment'}</span></div>
      <div><span class="status-pill status-${escapeHtml(String(lead.status || 'new').toLowerCase())}">${escapeHtml(prettyStatus(lead.status))}</span></div>`;
    el.addEventListener('click', () => openLead(lead.id));
    return el;
  }

  function renderLeads() {
    const list = $('#lead-list'); if (!list) return; list.innerHTML = '';
    const leads = filteredLeads();
    if (!leads.length) { list.innerHTML = '<div class="empty-state"><strong>No leads match this view.</strong><span>Try another filter or search.</span></div>'; return; }
    leads.forEach(l => list.appendChild(leadElement(l)));
  }

  async function loadDashboard() {
    clearError($('#dashboard-error'));
    try {
      const payload = await api('/hq/web-dashboard'); dashboardData = payload.dashboard || {};
      const d = dashboardData, manager = Boolean(d.manager);
      $('#kpi-a-label').textContent = manager ? 'New web leads' : 'My leads today';
      $('#kpi-a').textContent = manager ? (d.newWebLeads?.length || 0) : (d.todayLeads?.length || 0);
      $('#kpi-b-label').textContent = manager ? "Today's team leads" : 'My open leads';
      $('#kpi-b').textContent = manager ? (d.todayLeads?.length || 0) : (d.openLeads || 0);
      $('#kpi-c-label').textContent = manager ? 'Open team leads' : 'My total leads'; $('#kpi-c').textContent = d.openLeads || 0;
      $('#lead-title').textContent = manager ? 'Team & web leads' : "Today's leads";
      $('#lead-subtitle').textContent = manager ? 'Click any lead to review details, activity, quotes, and assignment.' : 'Click any lead to review its full details.';
      const select = $('#lead-filter'); if (select) { select.querySelector('option[value="unassigned"]')?.toggleAttribute('hidden', !manager); }
      renderLeads();
      if (activeLeadId && $('#lead-modal')?.classList.contains('open')) await openLead(activeLeadId, true);
    } catch (error) { showError($('#dashboard-error'), error.message); }
  }

  function renderProducts(products) {
    if (!Array.isArray(products) || !products.length) return '<span class="muted">None specified</span>';
    return `<div class="detail-tags">${products.map(p => `<span>${escapeHtml(p)}</span>`).join('')}</div>`;
  }

  function renderTimeline(events) {
    if (!Array.isArray(events) || !events.length) return '<div class="detail-empty">No activity recorded yet.</div>';
    return `<div class="lead-timeline">${events.slice().reverse().map(e => `<div class="timeline-item"><span class="timeline-dot"></span><div><strong>${escapeHtml(prettyStatus(e.event_type || 'update'))}</strong><p>${formatDate(e.created_at)}</p></div></div>`).join('')}</div>`;
  }

  function renderQuotes(quotes) {
    if (!Array.isArray(quotes) || !quotes.length) return '<div class="detail-empty">No quotes created for this lead.</div>';
    return `<div class="quote-mini-list">${quotes.map(q => `<div class="quote-mini"><div><strong>${escapeHtml(q.quote_number || 'Quote')}</strong><span>${formatDate(q.created_at,false)}</span></div><div><strong>$${Number(q.total || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</strong><span class="status-pill">${escapeHtml(prettyStatus(q.status))}</span></div></div>`).join('')}</div>`;
  }

  function assignmentControl(lead) {
    if (!dashboardData?.manager) return `<div class="detail-value">${escapeHtml(assigneeName(lead.assigned_user_id))}</div>`;
    const users = dashboardData.assignableUsers || [];
    return `<div class="assignment-editor"><select id="detail-assignee" class="admin-select"><option value="">Select a team member…</option>${users.map(u => `<option value="${escapeHtml(u.userId)}" ${String(u.userId)===String(lead.assigned_user_id)?'selected':''}>${escapeHtml(u.displayName || u.loginId)}${u.role ? ` · ${escapeHtml(u.role)}` : ''}</option>`).join('')}</select><button id="assign-lead-btn" class="admin-btn primary-small" type="button">${lead.assigned_user_id ? 'Reassign' : 'Assign lead'}</button></div>`;
  }

  async function assignLead(leadId) {
    const userId = $('#detail-assignee')?.value; if (!userId) { showError($('#lead-detail-error'), 'Choose a team member first.'); return; }
    const btn = $('#assign-lead-btn'); if (btn) { btn.disabled = true; btn.textContent = 'Assigning…'; }
    clearError($('#lead-detail-error'));
    try { await api(`/hq/leads/${encodeURIComponent(leadId)}/assign`, {method:'POST', body:JSON.stringify({userId})}); await loadDashboard(); await openLead(leadId, true); }
    catch (e) { showError($('#lead-detail-error'), e.message); }
    finally { if (btn) { btn.disabled = false; btn.textContent = 'Reassign'; } }
  }

  async function openLead(leadId, refresh = false) {
    activeLeadId = leadId; const modal = $('#lead-modal'); if (!modal) return;
    if (!refresh) { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('drawer-open'); $('#lead-detail-body').innerHTML = '<div class="empty-state">Loading lead…</div>'; }
    try {
      const payload = await api(`/hq/leads/${encodeURIComponent(leadId)}`); const lead = payload.lead;
      $('#lead-detail-title').textContent = lead.business_name || lead.contact_name || 'Lead';
      $('#lead-detail-subtitle').textContent = `${lead.contact_name || 'No contact name'} · ${prettyStatus(lead.status)}`;
      $('#lead-detail-body').innerHTML = `
        <div id="lead-detail-error" class="admin-error"></div>
        <div class="detail-actions">${lead.phone ? `<a class="detail-action" href="tel:${escapeHtml(lead.phone)}">Call ${escapeHtml(lead.phone)}</a>`:''}${lead.email ? `<a class="detail-action" href="mailto:${escapeHtml(lead.email)}">Email lead</a>`:''}</div>
        <div class="detail-section"><h3>Contact & business</h3><div class="detail-grid"><div><span>Name</span><strong>${escapeHtml(lead.contact_name || '—')}</strong></div><div><span>Business</span><strong>${escapeHtml(lead.business_name || '—')}</strong></div><div><span>Email</span><strong>${escapeHtml(lead.email || '—')}</strong></div><div><span>Phone</span><strong>${escapeHtml(lead.phone || '—')}</strong></div><div><span>Source</span><strong>${escapeHtml(prettyStatus(lead.source || 'manual'))}</strong></div><div><span>Created</span><strong>${formatDate(lead.created_at)}</strong></div></div></div>
        <div class="detail-section"><h3>Assignment</h3>${assignmentControl(lead)}<div class="detail-grid compact"><div><span>Assigned</span><strong>${formatDate(lead.assigned_at)}</strong></div><div><span>Consultation due</span><strong>${formatDate(lead.consultation_due_at)}</strong></div><div><span>Consultation</span><strong>${formatDate(lead.consultation_at)}</strong></div><div><span>Status</span><strong>${escapeHtml(prettyStatus(lead.status))}</strong></div></div></div>
        <div class="detail-section"><h3>Requested products</h3>${renderProducts(lead.requested_products)}</div>
        <div class="detail-section"><h3>Customer message</h3><div class="detail-message">${lead.message ? escapeHtml(lead.message) : '<span class="muted">No message provided.</span>'}</div></div>
        ${Array.isArray(lead.notes)&&lead.notes.length ? `<div class="detail-section"><h3>Notes</h3><div class="detail-notes">${lead.notes.slice().reverse().map(n=>`<div><p>${escapeHtml(n.text||'')}</p><span>${formatDate(n.at)}</span></div>`).join('')}</div></div>`:''}
        <div class="detail-section"><h3>Quotes</h3>${renderQuotes(payload.quotes)}</div>
        <div class="detail-section"><h3>Activity</h3>${renderTimeline(payload.events)}</div>`;
      $('#assign-lead-btn')?.addEventListener('click', () => assignLead(lead.id));
    } catch (e) { $('#lead-detail-body').innerHTML = `<div class="admin-error" style="display:block">${escapeHtml(e.message)}</div>`; }
  }

  function closeLead() { activeLeadId = null; const modal = $('#lead-modal'); if (modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); } document.body.classList.remove('drawer-open'); }

  async function openDashboard() {
    try {
      if (!user) { const stored = sessionStorage.getItem('streamlineHqWebUser'); if (stored) try { user = JSON.parse(stored); } catch { sessionStorage.removeItem('streamlineHqWebUser'); } }
      if (!user) user = (await api('/hq-auth/me')).user;
      if ($('#login-view')) $('#login-view').style.display = 'none'; $('#dashboard-view')?.classList.add('active');
      if ($('#admin-greeting')) $('#admin-greeting').textContent = `${user.displayName || user.loginId} · ${prettyStatus(user.role || 'staff')}`;
      await loadDashboard();
    } catch (e) { logout(); showError($('#login-error'), e.message); }
  }

  async function submitLogin() {
    clearError($('#login-error')); const loginInput=$('#hq-login-id'), pinInput=$('#hq-pin'), btn=$('#login-submit');
    const loginId=String(loginInput?.value||'').trim(), pin=String(pinInput?.value||''); if (pinInput) pinInput.value='';
    if (!loginId || !/^\d{4}$/.test(pin)) { showError($('#login-error'),'Enter your HQ Login ID and 4-digit PIN.'); return; }
    if (btn) { btn.disabled=true; btn.textContent='Signing in…'; }
    try { await login(loginId,pin); } catch(e) { showError($('#login-error'),e.message); } finally { if(btn){btn.disabled=false;btn.textContent='Sign in securely';} }
  }

  $('#login-submit')?.addEventListener('click', submitLogin);
  ['#hq-login-id','#hq-pin'].forEach(s => $(s)?.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();submitLogin();} }));
  $('#logout-btn')?.addEventListener('click', logout); $('#refresh-btn')?.addEventListener('click', loadDashboard);
  $('#lead-search')?.addEventListener('input', renderLeads);
  $('#lead-filter')?.addEventListener('change', e => { activeFilter=e.target.value; renderLeads(); });
  document.querySelectorAll('.kpi-button').forEach(b => b.addEventListener('click', () => { activeFilter=b.dataset.filter || 'all'; if($('#lead-filter')) $('#lead-filter').value=activeFilter; renderLeads(); $('#lead-list')?.scrollIntoView({behavior:'smooth',block:'start'}); }));
  $('#lead-modal-close')?.addEventListener('click', closeLead); document.querySelector('[data-close-modal]')?.addEventListener('click', closeLead); document.addEventListener('keydown', e => { if(e.key==='Escape') closeLead(); });
  if (token) openDashboard();
})();
