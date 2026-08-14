(function () {
  'use strict';

  const state = {
    products: [],
    category: '',
    cart: loadCart(), // [{ id, name, price, quantity }]
  };

  // ---------------- DOM refs ----------------
  const grid = document.getElementById('product-grid');
  const catNav = document.getElementById('cat-nav');
  const catalogTitle = document.getElementById('catalog-title');
  const catalogCount = document.getElementById('catalog-count');

  const cartToggle = document.getElementById('cart-toggle');
  const cartCount = document.getElementById('cart-count');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartClose = document.getElementById('cart-close');
  const scrim = document.getElementById('scrim');
  const cartItemsEl = document.getElementById('cart-items');
  const cartEmpty = document.getElementById('cart-empty');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTotal = document.getElementById('cart-total');
  const ticketNo = document.getElementById('ticket-no');
  const checkoutBtn = document.getElementById('checkout-btn');

  const modalScrim = document.getElementById('modal-scrim');
  const modal = document.getElementById('checkout-modal');
  const checkoutClose = document.getElementById('checkout-close');
  const checkoutForm = document.getElementById('checkout-form');
  const checkoutSummary = document.getElementById('checkout-summary');
  const checkoutSubmit = document.getElementById('checkout-submit');
  const checkoutError = document.getElementById('checkout-error');
  const formView = document.getElementById('checkout-form-view');
  const successView = document.getElementById('checkout-success-view');
  const successName = document.getElementById('success-name');
  const successOrderId = document.getElementById('success-order-id');
  const successTotal = document.getElementById('success-total');
  const checkoutDone = document.getElementById('checkout-done');

  // ---------------- Cart persistence ----------------
  function loadCart() {
    try {
      const raw = localStorage.getItem('gs_cart');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveCart() {
    localStorage.setItem('gs_cart', JSON.stringify(state.cart));
  }

  // ---------------- Formatting ----------------
  const money = (n) => `$${Number(n).toFixed(2)}`;

  // ---------------- Load products ----------------
  async function loadProducts() {
    grid.innerHTML = `<p class="empty-state">Loading the catalog&hellip;</p>`;
    try {
      const res = await fetch('/api/products');
      if (!res.ok) throw new Error('Request failed');
      state.products = await res.json();
      buildCategoryNav();
      renderGrid();
    } catch (err) {
      grid.innerHTML = `<p class="error-state">Couldn't load products. Is the server running and the database seeded? (${err.message})</p>`;
    }
  }

  function buildCategoryNav() {
    const cats = [...new Set(state.products.map((p) => p.category))].sort();
    catNav.innerHTML = `<button class="cat-nav__btn is-active" data-category="">All Goods</button>` +
      cats.map((c) => `<button class="cat-nav__btn" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');

    catNav.querySelectorAll('.cat-nav__btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.category;
        catNav.querySelectorAll('.cat-nav__btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        renderGrid();
      });
    });
  }

  function renderGrid() {
    const list = state.category
      ? state.products.filter((p) => p.category === state.category)
      : state.products;

    catalogTitle.textContent = state.category ? state.category : 'Full Catalog';
    catalogCount.textContent = `${list.length} item${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
      grid.innerHTML = `<p class="empty-state">Nothing here yet.</p>`;
      return;
    }

    grid.innerHTML = list.map(productCard).join('');

    grid.querySelectorAll('.add-btn').forEach((btn) => {
      btn.addEventListener('click', () => addToCart(Number(btn.dataset.id)));
    });
  }

  function productCard(p) {
    const outOfStock = p.stock <= 0;
    return `
      <article class="product-card">
        <span class="product-card__tag">${escapeHtml(p.category)}</span>
        <img class="product-card__img" src="${escapeHtml(p.image_url || '')}" alt="${escapeHtml(p.name)}" loading="lazy" />
        <div class="product-card__body">
          <span class="product-card__sku">${escapeHtml(p.sku)}</span>
          <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
          <p class="product-card__desc">${escapeHtml(p.description || '')}</p>
          <div class="product-card__footer">
            <span class="product-card__price">${money(p.price)}</span>
            <button class="add-btn" data-id="${p.id}" ${outOfStock ? 'disabled' : ''}>
              ${outOfStock ? 'Sold out' : 'Add to cart'}
            </button>
          </div>
        </div>
      </article>`;
  }

  // ---------------- Cart logic ----------------
  function addToCart(id) {
    const product = state.products.find((p) => p.id === id);
    if (!product) return;
    const existing = state.cart.find((i) => i.id === id);
    if (existing) {
      existing.quantity += 1;
    } else {
      state.cart.push({ id, name: product.name, price: Number(product.price), quantity: 1 });
    }
    saveCart();
    renderCart();
    openCart();
  }

  function updateQty(id, delta) {
    const item = state.cart.find((i) => i.id === id);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart = state.cart.filter((i) => i.id !== id);
    }
    saveCart();
    renderCart();
  }

  function removeItem(id) {
    state.cart = state.cart.filter((i) => i.id !== id);
    saveCart();
    renderCart();
  }

  function cartTotalValue() {
    return state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  function renderCart() {
    const totalItems = state.cart.reduce((n, i) => n + i.quantity, 0);
    cartCount.textContent = totalItems;
    ticketNo.textContent = String(1000 + totalItems).padStart(4, '0');

    if (state.cart.length === 0) {
      cartItemsEl.innerHTML = '';
      cartItemsEl.appendChild(cartEmpty);
      cartEmpty.style.display = 'block';
      checkoutBtn.disabled = true;
    } else {
      checkoutBtn.disabled = false;
      cartItemsEl.innerHTML = state.cart.map((i) => `
        <div class="cart-line">
          <span class="cart-line__name">${escapeHtml(i.name)}</span>
          <span class="cart-line__price">${money(i.price * i.quantity)}</span>
          <div class="cart-line__controls">
            <button class="qty-btn" data-action="dec" data-id="${i.id}" aria-label="Decrease quantity">&minus;</button>
            <span class="cart-line__qty">${i.quantity}</span>
            <button class="qty-btn" data-action="inc" data-id="${i.id}" aria-label="Increase quantity">+</button>
            <button class="remove-btn" data-action="remove" data-id="${i.id}">remove</button>
          </div>
        </div>`).join('');

      cartItemsEl.querySelectorAll('[data-action]').forEach((btn) => {
        const id = Number(btn.dataset.id);
        btn.addEventListener('click', () => {
          if (btn.dataset.action === 'inc') updateQty(id, 1);
          else if (btn.dataset.action === 'dec') updateQty(id, -1);
          else removeItem(id);
        });
      });
    }

    const total = cartTotalValue();
    cartSubtotal.textContent = money(total);
    cartTotal.textContent = money(total);
  }

  // ---------------- Cart drawer open/close ----------------
  function openCart() {
    cartDrawer.classList.add('is-open');
    scrim.classList.add('is-open');
  }
  function closeCart() {
    cartDrawer.classList.remove('is-open');
    scrim.classList.remove('is-open');
  }
  cartToggle.addEventListener('click', openCart);
  cartClose.addEventListener('click', closeCart);
  scrim.addEventListener('click', closeCart);

  // ---------------- Checkout modal ----------------
  function openModal() {
    if (state.cart.length === 0) return;
    checkoutSummary.innerHTML = `<span>${state.cart.reduce((n, i) => n + i.quantity, 0)} item(s)</span><span>${money(cartTotalValue())}</span>`;
    formView.hidden = false;
    successView.hidden = true;
    checkoutError.textContent = '';
    modal.classList.add('is-open');
    modalScrim.classList.add('is-open');
    closeCart();
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modalScrim.classList.remove('is-open');
  }

  checkoutBtn.addEventListener('click', openModal);
  checkoutClose.addEventListener('click', closeModal);
  modalScrim.addEventListener('click', closeModal);
  checkoutDone.addEventListener('click', () => {
    closeModal();
  });

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    checkoutError.textContent = '';
    checkoutSubmit.disabled = true;
    checkoutSubmit.textContent = 'Placing order\u2026';

    const formData = new FormData(checkoutForm);
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      address: formData.get('address'),
      items: state.cart.map((i) => ({ id: i.id, quantity: i.quantity })),
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');

      successName.textContent = payload.name;
      successOrderId.textContent = data.orderId;
      successTotal.textContent = money(data.total);
      formView.hidden = true;
      successView.hidden = false;

      state.cart = [];
      saveCart();
      renderCart();
      checkoutForm.reset();
      await loadProducts(); // refresh stock counts
    } catch (err) {
      checkoutError.textContent = err.message;
    } finally {
      checkoutSubmit.disabled = false;
      checkoutSubmit.textContent = 'Place Order';
    }
  });

  // ---------------- Utils ----------------
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  // ---------------- Init ----------------
  renderCart();
  loadProducts();
})();
