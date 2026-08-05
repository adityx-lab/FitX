// ════════════════════════════════════════════════════
// home.js — home tab (greeting, streak, today's stats)
// ════════════════════════════════════════════════════

async function loadHome() {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  document.getElementById('home-greeting').textContent = `${greet}, ${userData?.name?.split(' ')[0] || ''}! 👋`;
  document.getElementById('header-name').textContent   = userData?.name || '';

  try {
    const profile = await api('GET', '/profile');
    document.getElementById('home-goal').textContent  = `Goal: ${profile.goal}`;
    document.getElementById('stat-streak').textContent    = profile.streak;
    document.getElementById('stat-exercises').textContent = profile.totalExercises;

    // Today's meals count
    const mealData = await api('GET', '/data/meals');
    document.getElementById('stat-meals').textContent = mealData.meals.length;
  } catch (e) {
    // If backend not connected, show placeholders
    document.getElementById('home-goal').textContent = `Goal: ${userData?.goal || 'Set a goal'}`;
  }
}
