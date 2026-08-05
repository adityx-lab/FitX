// ════════════════════════════════════════════════════
// storage.js — thin wrapper around localStorage
// Keeps all direct localStorage calls in one place so the
// storage strategy (e.g. swapping to IndexedDB) can change
// later without touching every feature module.
// ════════════════════════════════════════════════════

const Storage = {
  getToken()        { return localStorage.getItem('fitx_token') || null; },
  setToken(token)   { localStorage.setItem('fitx_token', token); },
  clearToken()      { localStorage.removeItem('fitx_token'); },

  getUser()         { return JSON.parse(localStorage.getItem('fitx_user') || 'null'); },
  setUser(user)     { localStorage.setItem('fitx_user', JSON.stringify(user)); },
  clearUser()       { localStorage.removeItem('fitx_user'); },

  getLocalExercises()      { return JSON.parse(localStorage.getItem('fitx_exercises_local') || '[]'); },
  setLocalExercises(list)  { localStorage.setItem('fitx_exercises_local', JSON.stringify(list)); }
};
