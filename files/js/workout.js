// ════════════════════════════════════════════════════
// workout.js — workout plan tab (day tabs, exercise CRUD)
// ════════════════════════════════════════════════════

async function loadWorkouts() {
  renderDayTabs();
  try {
    exercises = await api('GET', '/data/workouts');
  } catch (e) {
    exercises = Storage.getLocalExercises();
  }
  renderExercises();
}

function renderDayTabs() {
  const wrap = document.getElementById('day-tabs');
  wrap.innerHTML = DAYS.map(d =>
    `<button class="day-tab ${d===selectedDay?'active':''}" onclick="selectDay('${d}')">${d.slice(0,3)}</button>`
  ).join('');
}

function selectDay(day) {
  selectedDay = day;
  renderDayTabs();
  renderExercises();
}

function renderExercises() {
  const list = document.getElementById('exercise-list');
  const dayEx = exercises.filter(e => e.day === selectedDay);

  if (!dayEx.length) {
    list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px 0">No exercises for ${selectedDay} yet. Add one below!</p>`;
    document.getElementById('workout-progress').style.width = '0%';
    return;
  }

  const done = dayEx.filter(e => e.done).length;
  const pct  = Math.round((done / dayEx.length) * 100);
  document.getElementById('workout-progress').style.width = pct + '%';

  list.innerHTML = dayEx.map(ex => `
    <div class="exercise-item ${ex.done ? 'done-item' : ''}">
      <input type="checkbox" ${ex.done ? 'checked' : ''} onchange="toggleExercise('${ex._id || ex.id}')">
      <div class="ex-info">
        <div class="ex-name" style="${ex.done ? 'text-decoration:line-through' : ''}">${ex.name}</div>
        <div class="ex-meta">${ex.sets} sets × ${ex.reps} reps${ex.weight ? ' · ' + ex.weight + 'kg' : ''} · ${ex.day}</div>
      </div>
      <button class="ex-del" onclick="deleteExercise('${ex._id || ex.id}')">🗑</button>
    </div>
  `).join('');
}

function toggleAddForm() {
  document.getElementById('add-exercise-form').classList.toggle('open');
}

async function addExercise() {
  const name   = document.getElementById('ex-name').value.trim();
  const sets   = +document.getElementById('ex-sets').value;
  const reps   = +document.getElementById('ex-reps').value;
  const weight = +document.getElementById('ex-weight').value;

  if (!name) { showToast('Enter an exercise name'); return; }

  try {
    exercises = await api('POST', '/data/workouts', { name, sets, reps, weight, day: selectedDay });
    renderExercises();
    document.getElementById('ex-name').value = '';
    toggleAddForm();
    showToast('Exercise added ✅');
  } catch (e) {
    showToast('Could not save — check backend connection');
  }
}

async function toggleExercise(id) {
  try {
    await api('PATCH', `/data/workouts/${id}/toggle`);
    exercises = await api('GET', '/data/workouts');
    renderExercises();
  } catch (e) { showToast('Error updating exercise'); }
}

async function deleteExercise(id) {
  try {
    await api('DELETE', `/data/workouts/${id}`);
    exercises = exercises.filter(e => (e._id || e.id) !== id);
    renderExercises();
    showToast('Exercise deleted');
  } catch (e) { showToast('Error deleting exercise'); }
}
