// ════════════════════════════════════════════════════
// profile.js — profile tab (stats, goal update, account deletion)
// ════════════════════════════════════════════════════

async function loadProfile() {
  try {
    const p = await api('GET', '/profile');
    const initial = p.name.charAt(0).toUpperCase();
    document.getElementById('profile-avatar').textContent   = initial;
    document.getElementById('profile-name').textContent     = p.name;
    document.getElementById('profile-email').textContent    = p.email || userData?.email || '';
    document.getElementById('ps-streak').textContent        = p.streak;
    document.getElementById('ps-meals').textContent         = p.totalMeals;
    document.getElementById('ps-exercises').textContent     = p.totalExercises;
    document.getElementById('ps-goal').textContent          = p.goal;
    document.getElementById('goal-input').value             = p.goal;
  } catch (e) {
    document.getElementById('profile-name').textContent  = userData?.name || '';
    document.getElementById('profile-email').textContent = userData?.email || '';
  }
}

async function updateGoal() {
  const goal = document.getElementById('goal-input').value.trim();
  if (!goal) return;
  try {
    await api('PATCH', '/profile', { goal });
    if (userData) { userData.goal = goal; Storage.setUser(userData); }
    showToast('Goal updated ✅');
    loadProfile();
  } catch (e) { showToast('Error updating goal'); }
}

async function deleteAccount() {
  if (!confirm('This will permanently delete your account and all data. Are you sure?')) return;
  try {
    await api('DELETE', '/profile');
    doLogout();
    showToast('Account deleted');
  } catch (e) { showToast('Error deleting account'); }
}
