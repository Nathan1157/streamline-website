(() => {
  'use strict';

  const BASE = 'https://api.streamlinebusinessos.com/api/v1';
  const $ = (selector) => document.querySelector(selector);

  let token = sessionStorage.getItem('streamlineHqWebToken') || '';
  let user = null;

  // Strip any legacy query/hash data from older login builds immediately.
  // This prevents a Login ID/PIN from remaining in browser history if an old
  // version ever submitted the form with query parameters.
  if (window.location.search || window.location.hash) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  function showError(element, message) {
    if (!element) return;
    element.style.display = 'block';
    element.textContent = message;
  }

  function clearError(element) {
    if (!element) return;
    element.style.display = 'none';
    element.textContent = '';
  }

  function logout() {
    token = '';
    user = null;
    sessionStorage.removeItem('streamlineHqWebToken');
    sessionStorage.removeItem('streamlineHqWebUser');

    const dashboard = $('#dashboard-view');
    const loginView = $('#login-view');
    if (dashboard) dashboard.classList.remove('active');
    if (loginView) loginView.style.display = 'block';
  }

  async function api(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    let response;
    try {
      response = await fetch(`${BASE}${path}`, {
        ...options,
        headers,
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin'
      });
    } catch (networkError) {
      throw new Error('Unable to reach Streamline Cloud. Check your connection and try again.');
    }

    const payload = await response.json().catch(() => ({}));

    if (response.status === 401 && path !== '/hq-auth/login') {
      logout();
      throw new Error(payload?.error?.message || 'Your HQ session expired. Sign in again.');
    }

    if (!response.ok || payload.ok === false) {
      throw new Error(payload?.error?.message || `Cloud request failed (${response.status}).`);
    }

    return payload;
  }

  async function login(loginId, pin) {
    const payload = await api('/hq-auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginId, pin })
    });

    if (!payload.accessToken || !payload.user) {
      throw new Error('Streamline Cloud did not return a valid HQ session.');
    }

    token = payload.accessToken;
    user = payload.user;

    // Session storage keeps the token out of the URL and clears when the
    // browser session ends. The PIN itself is never stored.
    sessionStorage.setItem('streamlineHqWebToken', token);
    sessionStorage.setItem('streamlineHqWebUser', JSON.stringify(user));

    await openDashboard();
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  function leadElement(lead) {
    const element = document.createElement('div');
    element.className = 'lead-row';
    element.innerHTML = `
      <div class="lead-name">
        <strong>${escapeHtml(lead.business_name || lead.contact_name || 'Unnamed lead')}</strong>
        <span>${escapeHtml(lead.contact_name || '')}</span>
      </div>
      <div class="lead-cell">
        ${escapeHtml(lead.email || '—')}
        <span>${escapeHtml(lead.phone || '')}</span>
      </div>
      <div class="lead-cell">
        ${formatDate(lead.consultation_at || lead.created_at)}
        <span>${escapeHtml(lead.source || '')}</span>
      </div>
      <div class="lead-cell">${lead.assigned_user_id ? 'Assigned' : 'Unassigned'}</div>
      <div><span class="status-pill">${escapeHtml(lead.status || 'new')}</span></div>
    `;
    return element;
  }

  function renderLeads(leads) {
    const list = $('#lead-list');
    if (!list) return;
    list.innerHTML = '';

    if (!Array.isArray(leads) || leads.length === 0) {
      list.innerHTML = '<div class="empty-state">No leads to show.</div>';
      return;
    }

    leads.forEach((lead) => list.appendChild(leadElement(lead)));
  }

  async function loadDashboard() {
    clearError($('#dashboard-error'));

    try {
      const payload = await api('/hq/web-dashboard');
      const dashboard = payload.dashboard || {};
      const isManager = Boolean(dashboard.manager);

      $('#kpi-a-label').textContent = isManager ? 'New web leads' : 'My leads today';
      $('#kpi-a').textContent = isManager
        ? (dashboard.newWebLeads?.length || 0)
        : (dashboard.todayLeads?.length || 0);

      $('#kpi-b-label').textContent = isManager ? "Today's team leads" : 'My open leads';
      $('#kpi-b').textContent = isManager
        ? (dashboard.todayLeads?.length || 0)
        : (dashboard.openLeads || 0);

      $('#kpi-c-label').textContent = isManager ? 'Open team leads' : 'My total leads';
      $('#kpi-c').textContent = dashboard.openLeads || 0;

      $('#lead-title').textContent = isManager ? 'Team leads' : "Today's leads";
      $('#lead-subtitle').textContent = isManager
        ? 'Management view · all accessible leads'
        : 'Only leads assigned to you';

      renderLeads(isManager ? (dashboard.leads || []) : (dashboard.todayLeads || []));
    } catch (error) {
      showError($('#dashboard-error'), error.message);
    }
  }

  async function openDashboard() {
    try {
      if (!user) {
        const storedUser = sessionStorage.getItem('streamlineHqWebUser');
        if (storedUser) {
          try {
            user = JSON.parse(storedUser);
          } catch (_) {
            sessionStorage.removeItem('streamlineHqWebUser');
          }
        }
      }

      if (!user) {
        const payload = await api('/hq-auth/me');
        user = payload.user;
      }

      const loginView = $('#login-view');
      const dashboardView = $('#dashboard-view');
      if (loginView) loginView.style.display = 'none';
      if (dashboardView) dashboardView.classList.add('active');

      const greeting = $('#admin-greeting');
      if (greeting) {
        greeting.textContent = `${user.displayName || user.loginId} · ${user.role || 'staff'}`;
      }

      await loadDashboard();
    } catch (error) {
      logout();
      showError($('#login-error'), error.message);
    }
  }

  const loginForm = $('#login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearError($('#login-error'));

      const loginInput = $('#hq-login-id');
      const pinInput = $('#hq-pin');
      const submitButton = $('#login-submit');

      const loginId = String(loginInput?.value || '').trim();
      const pin = String(pinInput?.value || '');

      // Clear the PIN from the DOM before any network response is received.
      if (pinInput) pinInput.value = '';

      if (!loginId || !/^\d{4}$/.test(pin)) {
        showError($('#login-error'), 'Enter your HQ Login ID and 4-digit PIN.');
        return;
      }

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Signing in…';
      }

      try {
        await login(loginId, pin);
      } catch (error) {
        showError($('#login-error'), error.message);
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Sign in';
        }
      }
    });
  }

  $('#logout-btn')?.addEventListener('click', logout);
  $('#refresh-btn')?.addEventListener('click', loadDashboard);

  if (token) openDashboard();
})();
