// ════════════════════════════════════════════════════
// api.js — single fetch wrapper for talking to the backend
// ════════════════════════════════════════════════════

const API = '/api'; // relative path — works since the backend serves this frontend too

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(API + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
