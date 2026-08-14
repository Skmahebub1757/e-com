(function () {
  'use strict';

  const CART_KEY = 'gs_cart';
  const money = (n) => `$${Number(n).toFixed(2)}`;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }
  function updateCartBadge() {
    const cart = loadCart();
    const count = cart.reduce((n, i) => n + i.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
  }

  const detailEl = document.getElementById('product-detail');
  const params = new URLSearchParams(window.location.search);
  const productId = Number(params.get('id'));

  async function loadProduct() {
    if (!productId) {
      detailEl.innerHTML = `<p class="error-state">No product specified. <a href="/index.html">Back to catalog</a></p>`;
      return;
    }
    try {
      const res = await fetch(`/api/products/${productId}`);
      if (res.status === 404) {
        detailEl.innerHTML = `<p class="error-state">That item isn't in the catalog anymore. <a href="/index.html">Back to catalog</a></p>`;
        return;
      }
      if (!res.ok) throw new Error('Request failed');
      const product = await res.json();
      renderProduct(product);
    } catch (err) {
      detailEl.innerHTML = `<p class="error-state">Couldn't load this item. (${escapeHtml(err.message)})</p>`;
    }
  }

  function renderProduct(p) {
    document.title = `${p.name} — The General Store`;
    const outOfStock = p.stock <= 0;
    const cart = loadCart();
    const inCart = cart.find((i) => i.id === p.id);
    const alreadyInCart = inCart ? inCart.quantity : 0;
    const maxQty = Math.max(0, p.stock - alreadyInCart);

    detailEl.innerHTML = `
      <div class="product-page__layout">
        <div class="product-page__image">
          <img src="${escapeHtml(p.image_url || '')}" alt="${escapeHtml(p.name)}" />
        </div>
        <div class="product-page__info">
          <span class="product-card__tag">${escapeHtml(p.category)}</span>
          <h1>${escapeHtml(p.name)}</h1>
          <span class="product-card__sku">${escapeHtml(p.sku)}</span>
          <p class="product-page__desc">${escapeHtml(p.description || 'No description provided.')}</p>
          <div class="product-page__price">${money(p.price)}</div>
          <div class="product-page__stock ${outOfStock ? 'is-out' : ''}">
            ${outOfStock ? 'Out of stock' : `${p.stock} in stock`}
            ${alreadyInCart ? ` \u2014 ${alreadyInCart} already in your ticket` : ''}
          </div>

          <div class="product-page__actions" id="actions">
            ${outOfStock ? `
              <button class="btn btn--primary" disabled>Sold out</button>
            ` : maxQty === 0 ? `
              <p class="field-hint">You already have all the stock we have in your ticket.</p>
              <a href="/index.html?openCart=1" class="btn btn--secondary">View your ticket</a>
            ` : `
              <label class="field field--inline">
                <span>Quantity</span>
                <input type="number" id="qty-input" min="1" max="${maxQty}" value="1" />
              </label>
              <button class="btn btn--primary" id="add-to-cart-btn">Add to cart</button>
            `}
          </div>

          <p class="form-success" id="add-success"></p>
          <p class="form-error" id="add-error"></p>
        </div>
      </div>
    `;

    const addBtn = document.getElementById('add-to-cart-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const qtyInput = document.getElementById('qty-input');
        const requested = Math.max(1, Math.min(maxQty, parseInt(qtyInput.value, 10) || 1));
        addToCart(p, requested);
      });
    }
  }

  function addToCart(product, quantity) {
    const cart = loadCart();
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ id: product.id, name: product.name, price: Number(product.price), quantity });
    }
    saveCart(cart);
    updateCartBadge();

    document.getElementById('add-error').textContent = '';

    // Re-render so the quantity cap and "already in cart" note reflect the update
    renderProduct(product);
    document.getElementById('add-success').innerHTML =
      `Added ${quantity} \u00d7 ${escapeHtml(product.name)} to your ticket. <a href="/index.html?openCart=1">View cart &amp; checkout</a>`;
  }

  updateCartBadge();
  loadProduct();
})();
