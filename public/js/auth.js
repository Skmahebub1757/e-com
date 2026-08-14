(function () {
  'use strict';

  function redirectForUser(user) {
    window.location.href = user.role === 'seller' ? '/seller-dashboard.html' : '/index.html';
  }

  // ---------------- Register page ----------------
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    let selectedRole = 'buyer';
    const roleTabs = document.querySelectorAll('.role-tab');
    const shopField = document.getElementById('shop-name-field');
    const errorEl = document.getElementById('form-error');
    const successEl = document.getElementById('form-success');
    const submitBtn = document.getElementById('submit-btn');

    roleTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        selectedRole = tab.dataset.role;
        roleTabs.forEach((t) => {
          t.classList.toggle('is-active', t === tab);
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        shopField.hidden = selectedRole !== 'seller';
        shopField.querySelector('input').required = selectedRole === 'seller';
        submitBtn.textContent = selectedRole === 'seller' ? 'Create seller account' : 'Create account';
      });
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      successEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account\u2026';

      const formData = new FormData(registerForm);
      const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: selectedRole,
        shopName: formData.get('shopName') || undefined,
      };

      try {
        const data = await apiRequest('/api/auth/register', { method: 'POST', body: payload });
        Session.setSession(data.token, data.user);
        successEl.textContent = 'Account created \u2014 redirecting\u2026';
        setTimeout(() => redirectForUser(data.user), 500);
      } catch (err) {
        errorEl.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.textContent = selectedRole === 'seller' ? 'Create seller account' : 'Create account';
      }
    });
  }

  // ---------------- Login page ----------------
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    const errorEl = document.getElementById('form-error');
    const submitBtn = document.getElementById('submit-btn');

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in\u2026';

      const formData = new FormData(loginForm);
      const payload = { email: formData.get('email'), password: formData.get('password') };

      try {
        const data = await apiRequest('/api/auth/login', { method: 'POST', body: payload });
        Session.setSession(data.token, data.user);
        redirectForUser(data.user);
      } catch (err) {
        errorEl.textContent = err.message;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign in';
      }
    });
  }
})();
