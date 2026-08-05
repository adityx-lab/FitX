// ════════════════════════════════════════════════════
// nutrition.js — nutrition tab (calorie ring, macros, meals)
// ════════════════════════════════════════════════════

async function loadNutrition() {
  try {
    const data = await api('GET', '/data/meals');
    meals = data.meals;
    renderNutrition(data.calorieGoal || 2000);
  } catch (e) {
    meals = [];
    renderNutrition(2000);
  }
}

function renderNutrition(goal) {
  const totalCal = meals.reduce((s, m) => s + m.calories, 0);
  const protein  = meals.reduce((s, m) => s + (m.protein || 0), 0);
  const carbs    = meals.reduce((s, m) => s + (m.carbs || 0), 0);
  const fat      = meals.reduce((s, m) => s + (m.fat || 0), 0);

  // Calorie ring
  const pct = Math.min(totalCal / goal, 1);
  const circ = 289;
  document.getElementById('calorie-arc').style.strokeDashoffset = circ - pct * circ;
  document.getElementById('cal-current').textContent = totalCal;
  document.getElementById('cal-goal-lbl').textContent = `/ ${goal}`;

  // Macros
  document.getElementById('m-protein').textContent = protein + 'g';
  document.getElementById('m-carbs').textContent   = carbs   + 'g';
  document.getElementById('m-fat').textContent     = fat     + 'g';
  document.getElementById('mf-protein').style.width = Math.min(protein/2, 100)+'%';
  document.getElementById('mf-carbs').style.width   = Math.min(carbs/3,   100)+'%';
  document.getElementById('mf-fat').style.width     = Math.min(fat/1.5,   100)+'%';

  // Meals list
  const list = document.getElementById('meal-list');
  if (!meals.length) {
    list.innerHTML = `<p style="color:var(--muted);text-align:center;padding:20px 0">No meals logged today. Add your first one!</p>`;
    return;
  }
  list.innerHTML = meals.map(m => `
    <div class="meal-item">
      <span class="meal-type-badge badge-${m.type}">${m.type}</span>
      <div class="meal-info">
        <div class="meal-name">${m.name}</div>
        <div class="meal-cals">${m.calories} kcal · P:${m.protein||0}g C:${m.carbs||0}g F:${m.fat||0}g</div>
      </div>
      <button class="ex-del" onclick="deleteMeal('${m._id||m.id}')">🗑</button>
    </div>
  `).join('');
}

function toggleMealForm() {
  document.getElementById('add-meal-form').classList.toggle('open');
}

async function addMeal() {
  const name    = document.getElementById('m-name').value.trim();
  const calories= +document.getElementById('m-cals').value;
  const protein = +document.getElementById('m-protein').value;
  const carbs   = +document.getElementById('m-carbs').value;
  const fat     = +document.getElementById('m-fat').value;
  const type    = document.getElementById('m-type').value;

  if (!name || !calories) { showToast('Enter meal name and calories'); return; }

  try {
    await api('POST', '/data/meals', { name, calories, protein, carbs, fat, type });
    await loadNutrition();
    document.getElementById('m-name').value = '';
    document.getElementById('m-cals').value = '';
    toggleMealForm();
    showToast('Meal logged ✅');
  } catch (e) { showToast('Could not save meal'); }
}

async function deleteMeal(id) {
  try {
    await api('DELETE', `/data/meals/${id}`);
    await loadNutrition();
    showToast('Meal deleted');
  } catch (e) { showToast('Error deleting meal'); }
}
