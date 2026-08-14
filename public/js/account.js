(function () {
  'use strict';

  const money = (n) => `$${Number(n).toFixed(2)}`;
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  async function loadOrders() {
    const wrap = document.getElementById('order-list');
    const user = Session.getUser();
    if (!user) {
      wrap.innerHTML = `<div class="account-card">Please <a href="/login.html">sign in</a> to see your order history.</div>`;
      return;
    }
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

  document.addEventListener('DOMContentLoaded', loadOrders);
})();
