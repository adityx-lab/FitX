// ════════════════════════════════════════════════════
// app.js — global app state + startup
// Loaded first so every other module can rely on these
// shared variables already existing in scope.
// ════════════════════════════════════════════════════

// ── Auth / profile state ──────────────────────────
let token    = Storage.getToken();
let userData = Storage.getUser();

// ── Workout / nutrition state ─────────────────────
let exercises   = [];
let meals       = [];
let selectedDay = 'Monday';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

// ── Camera / Pose state ───────────────────────────
let cameraStream   = null;
let poseDetector   = null;
let analyzeLoop    = null;
let poseHistory    = [];
let lastFeedback   = Date.now();

// ── AI Coach state ────────────────────────────────
let chatHistory = [];
let chatInit    = false;

// ── Training-data collection state ────────────────
let isLabeling      = false;
let trainingRows    = [];
let lastLogTime     = 0;
const LOG_INTERVAL_MS = 200; // throttled — ~5 samples/sec

// ── Init on page load ─────────────────────────────
window.addEventListener('load', () => {
  if (token && userData) {
    loadAppScreen();
  } else {
    go('screen-login');
  }
});
