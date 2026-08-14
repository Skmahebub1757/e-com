(function () {
  'use strict';

  const money = (n) => `$${Number(n).toFixed(2)}`;
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  let profile = null;

  async function init() {
    if (!Session.isLoggedIn()) {
      document.getElementById('signin-gate').hidden = false;
      return;
    }

    try {
      profile = await apiRequest('/api/account', { auth: true });
    } catch (err) {
      document.getElementById('signin-gate').hidden = false;
      document.getElementById('signin-gate').textContent = `Could not load your account. ${err.message}`;
      return;
    }

    document.getElementById('account-body').hidden = false;
    document.getElementById('account-sub').textContent =
      profile.role === 'seller'
        ? `Signed in as ${profile.shopName || profile.name} \u2014 manage your profile, password, and shop.`
        : `Signed in as ${profile.name} \u2014 manage your profile, password, and orders.`;

    fillProfileForm();

    if (profile.role === 'seller') {
      document.getElementById('seller-panel').hidden = false;
      loadSellerStats();
    } else {
      document.getElementById('buyer-panel').hidden = false;
      loadOrders();
    }
  }

  function fillProfileForm() {
    document.getElementById('role-badge').textContent = profile.role === 'seller' ? 'Seller' : 'Buyer';
    document.getElementById('role-badge').classList.toggle('role-badge--seller', profile.role === 'seller');

    document.getElementById('p-name').value = profile.name;
    document.getElementById('p-email').value = profile.email;

    const shopField = document.getElementById('p-shop-field');
    if (profile.role === 'seller') {
      shopField.hidden = false;
      shopField.querySelector('input').required = true;
      document.getElementById('p-shop-name').value = profile.shopName || '';
    }

    if (profile.memberSince) {
      const d = new Date(profile.memberSince);
      document.getElementById('member-since').textContent = `Member since ${d.toLocaleDateString()}`;
    }
  }

  // ---------------- Profile form ----------------
  document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    const btn = document.getElementById('profile-submit');
    errorEl.textContent = '';
    successEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Saving\u2026';

    const payload = {
      name: document.getElementById('p-name').value.trim(),
      email: document.getElementById('p-email').value.trim(),
      shopName: profile.role === 'seller' ? document.getElementById('p-shop-name').value.trim() : undefined,
    };

    try {
      const data = await apiRequest('/api/account', { method: 'PUT', auth: true, body: payload });
      // Name/email changed, so the token was re-issued — keep the session in sync.
      Session.setSession(data.token, data.user);
      profile = { ...profile, ...data.user };
      successEl.textContent = 'Profile updated.';
      renderAccountSlot();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Save changes';
    }
  });

  // ---------------- Password form ----------------
  document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('password-error');
    const successEl = document.getElementById('password-success');
    const btn = document.getElementById('password-submit');
    const form = e.target;
    errorEl.textContent = '';
    successEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Updating\u2026';

    const payload = {
      currentPassword: document.getElementById('pw-current').value,
      newPassword: document.getElementById('pw-new').value,
    };

    try {
      await apiRequest('/api/account/password', { method: 'PUT', auth: true, body: payload });
      successEl.textContent = 'Password updated.';
      form.reset();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Update password';
    }
  });

  // ---------------- Seller stats panel ----------------
  async function loadSellerStats() {
    const el = document.getElementById('seller-stats');
    try {
      const listings = await apiRequest('/api/seller/products', { auth: true });
      const totalStock = listings.reduce((sum, l) => sum + l.stock, 0);
      const outOfStock = listings.filter((l) => l.stock === 0).length;
      el.innerHTML = `
        <div class="stat"><span class="stat__value">${listings.length}</span><span class="stat__label">Listings</span></div>
        <div class="stat"><span class="stat__value">${totalStock}</span><span class="stat__label">Units in stock</span></div>
        <div class="stat"><span class="stat__value">${outOfStock}</span><span class="stat__label">Out of stock</span></div>
      `;
    } catch (err) {
      el.innerHTML = `<p class="error-state">Could not load shop stats. ${escapeHtml(err.message)}</p>`;
    }
  }

  // ---------------- Buyer order history ----------------
  async function loadOrders() {
    const wrap = document.getElementById('order-list');
    try {
      const orders = await apiRequest('/api/orders/mine', { auth: true });
      if (orders.length === 0) {
        wrap.innerHTML = `<div class="account-card">No orders yet. <a href="/index.html">Start shopping.</a></div>`;
        return;
      }
      wrap.innerHTML = orders.map((o) => `
        <div class="order-card">
          <div class="order-card__head">
            <span>Order #${o.id} \u2014 ${new Date(o.created_at).toLocaleDateString()}</span>
            <span>${escapeHtml(o.status)}</span>
          </div>
          ${o.items.map((i) => `
            <div class="order-card__row">
              <span>${escapeHtml(i.product_name || 'Item')} &times; ${i.quantity}</span>
              <span>${money(i.unit_price * i.quantity)}</span>
            </div>`).join('')}
          <div class="order-card__row order-card__total">
            <span>Total</span><span>${money(o.total_amount)}</span>
          </div>
        </div>
      `).join('');
    } catch (err) {
      wrap.innerHTML = `<div class="account-card">Could not load your orders. ${escapeHtml(err.message)}</div>`;
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
