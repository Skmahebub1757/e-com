(function () {
  'use strict';

  let listings = [];
  let editingId = null;

  const money = (n) => `$${Number(n).toFixed(2)}`;
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str ?? '';
    return div.innerHTML;
  }

  const errorEl = document.getElementById('form-error');
  const successEl = document.getElementById('form-success');
  const form = document.getElementById('listing-form');
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const formMode = document.getElementById('form-mode');
  const body = document.getElementById('listings-body');

  function resetForm() {
    editingId = null;
    form.reset();
    formMode.textContent = 'New listing';
    submitBtn.textContent = 'Save listing';
    cancelBtn.hidden = true;
  }

  function startEdit(id) {
    const item = listings.find((l) => l.id === id);
    if (!item) return;
    editingId = id;
    document.getElementById('f-name').value = item.name;
    document.getElementById('f-category').value = item.category;
    document.getElementById('f-price').value = item.price;
    document.getElementById('f-stock').value = item.stock;
    document.getElementById('f-image').value = item.image_url || '';
    document.getElementById('f-description').value = item.description || '';
    formMode.textContent = `Editing: ${item.name}`;
    submitBtn.textContent = 'Save changes';
    cancelBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteListing(id) {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await apiRequest(`/api/seller/products/${id}`, { method: 'DELETE', auth: true });
      await loadListings();
    } catch (err) {
      alert(err.message);
    }
  }

  async function loadListings() {
    try {
      listings = await apiRequest('/api/seller/products', { auth: true });
      if (listings.length === 0) {
        body.innerHTML = `<tr><td colspan="5">No listings yet \u2014 add your first item.</td></tr>`;
        return;
      }
      body.innerHTML = listings.map((l) => `
        <tr>
          <td>${escapeHtml(l.name)}</td>
          <td>${escapeHtml(l.category)}</td>
          <td>${money(l.price)}</td>
          <td>${l.stock}</td>
          <td>
            <button data-action="edit" data-id="${l.id}">Edit</button>
            <button data-action="delete" data-id="${l.id}" class="danger">Delete</button>
          </td>
        </tr>
      `).join('');

      body.querySelectorAll('[data-action="edit"]').forEach((btn) => {
        btn.addEventListener('click', () => startEdit(Number(btn.dataset.id)));
      });
      body.querySelectorAll('[data-action="delete"]').forEach((btn) => {
        btn.addEventListener('click', () => deleteListing(Number(btn.dataset.id)));
      });
    } catch (err) {
      body.innerHTML = `<tr><td colspan="5">Could not load your listings. ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    successEl.textContent = '';
    submitBtn.disabled = true;

    const payload = {
      name: document.getElementById('f-name').value.trim(),
      category: document.getElementById('f-category').value.trim(),
      price: parseFloat(document.getElementById('f-price').value),
      stock: parseInt(document.getElementById('f-stock').value, 10),
      image_url: document.getElementById('f-image').value.trim(),
      description: document.getElementById('f-description').value.trim(),
    };

    try {
      if (editingId) {
        await apiRequest(`/api/seller/products/${editingId}`, { method: 'PUT', auth: true, body: payload });
        successEl.textContent = 'Listing updated.';
      } else {
        await apiRequest('/api/seller/products', { method: 'POST', auth: true, body: payload });
        successEl.textContent = 'Listing created.';
      }
      resetForm();
      await loadListings();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      submitBtn.disabled = false;
    }
  });

  cancelBtn.addEventListener('click', resetForm);

  document.addEventListener('DOMContentLoaded', () => {
    const user = Session.getUser();
    if (!user || user.role !== 'seller') {
      document.getElementById('seller-gate').hidden = false;
      return;
    }
    document.getElementById('shop-sub').textContent =
      `Signed in as ${user.shopName || user.name} \u2014 manage the listings only you can see and edit.`;
    document.getElementById('dashboard').hidden = false;
    loadListings();
  });
})();
