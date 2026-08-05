// ════════════════════════════════════════════════════
// navigation.js — screen routing (login/signup/app) and
// bottom-nav tab switching within the app screen
// ════════════════════════════════════════════════════

function go(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showTab(tab) {
  ['home','workout','nutrition','coach','form','profile'].forEach(t => {
    document.getElementById('tab-'+t).style.display     = t === tab ? '' : 'none';
    document.getElementById('nav-'+t).classList.toggle('active', t === tab);
  });
  if (tab === 'home')      loadHome();
  if (tab === 'workout')   loadWorkouts();
  if (tab === 'nutrition') loadNutrition();
  if (tab === 'coach')     initChat();
  if (tab === 'profile')   loadProfile();
  if (tab !== 'form')      stopCamera(); // stop camera when leaving
}
