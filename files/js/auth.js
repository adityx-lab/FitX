// ════════════════════════════════════════════════════
// auth.js — login, signup, logout, session persistence
// ════════════════════════════════════════════════════

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  const btn   = document.getElementById('login-btn');
  errEl.style.display = 'none';

  if (!email || !pass) { showError(errEl, 'Please enter email and password.'); return; }

  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled  = true;

  try {
    const data = await api('POST', '/auth/login', { email, password: pass });
    saveSession(data);
    loadAppScreen();
  } catch (e) {
    showError(errEl, e.message);
  } finally {
    btn.innerHTML = 'Log In';
    btn.disabled  = false;
  }
}

async function doSignup() {
  const name  = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const pass  = document.getElementById('signup-pass').value;
  const pass2 = document.getElementById('signup-pass2').value;
  const errEl = document.getElementById('signup-error');
  const btn   = document.getElementById('signup-btn');
  errEl.style.display = 'none';

  if (!name || !email || !pass) { showError(errEl, 'Please fill in all fields.'); return; }
  if (pass.length < 6)          { showError(errEl, 'Password must be at least 6 characters.'); return; }
  if (pass !== pass2)           { showError(errEl, 'Passwords do not match.'); return; }

  btn.innerHTML = '<span class="loader"></span>';
  btn.disabled  = true;

  try {
    const data = await api('POST', '/auth/register', { name, email, password: pass });
    saveSession(data);
    loadAppScreen();
  } catch (e) {
    showError(errEl, e.message);
  } finally {
    btn.innerHTML = 'Create Account';
    btn.disabled  = false;
  }
}

function doLogout() {
  stopCamera();
  token    = null;
  userData = null;
  Storage.clearToken();
  Storage.clearUser();
  go('screen-login');
}

function saveSession(data) {
  token    = data.token;
  userData = data.user;
  Storage.setToken(token);
  Storage.setUser(userData);
}

function loadAppScreen() {
  go('screen-app');
  showTab('home');
}
