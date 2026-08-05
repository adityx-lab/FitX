// ════════════════════════════════════════════════════
// utils.js — small shared UI helpers used across modules
// ════════════════════════════════════════════════════

function showError(el, msg) { el.textContent = msg; el.style.display = 'block'; }

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}
