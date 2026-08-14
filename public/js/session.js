// ===== Shared account/session helpers, used by every page =====
(function (window) {
  'use strict';

  const TOKEN_KEY = 'gs_token';
  const USER_KEY = 'gs_user';

  const Session = {
    getToken() { return localStorage.getItem(TOKEN_KEY); },
    getUser() {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    },
    setSession(token, user) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear() {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    isLoggedIn() { return !!this.getToken(); },
    isSeller() { return this.getUser()?.role === 'seller'; },
  };

  async function apiRequest(path, { method = 'GET', body, auth = false } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = Session.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  // Renders the "Sign in" / "Hi, Name" account link that appears in the awning
  // on every page. Each page just needs an element with id="account-slot".
  function renderAccountSlot() {
    const el = document.getElementById('account-slot');
    if (!el) return;
    const user = Session.getUser();
    if (!user) {
      el.innerHTML = `<a class="account-link" href="/login.html">Sign in</a>`;
      return;
    }
    const dashboardHref = user.role === 'seller' ? '/seller-dashboard.html' : '/account.html';
    const dashboardLabel = user.role === 'seller' ? 'My Shop' : 'My Orders';
    el.innerHTML = `
      <a class="account-link" href="${dashboardHref}">${dashboardLabel}</a>
      <a class="account-link" href="#" id="signout-link">Sign out</a>`;
    document.getElementById('signout-link').addEventListener('click', (e) => {
      e.preventDefault();
      Session.clear();
      window.location.href = '/index.html';
    });
  }

  window.Session = Session;
  window.apiRequest = apiRequest;
  document.addEventListener('DOMContentLoaded', renderAccountSlot);
})(window);
