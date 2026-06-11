const express  = require('express');
const UserData = require('../models/UserData');
const { protect } = require('../middleware/auth');
const router   = express.Router();

// ALL routes in this file are protected — you must be logged in
router.use(protect);

// ─────────────────────────────────────────────────────────────
// WORKOUT ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/data/workouts — fetch all exercises for the logged-in user
router.get('/workouts', async (req, res) => {
  try {
    const data = await UserData.findOne({ user: req.user._id });
    res.json(data ? data.exercises : []);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch workouts' });
  }
});

// POST /api/data/workouts — add a new exercise
router.post('/workouts', async (req, res) => {
  const { name, sets, reps, weight, day } = req.body;

  if (!name || !day) {
    return res.status(400).json({ message: 'Exercise name and day are required' });
  }

  try {
    const data = await UserData.findOne({ user: req.user._id });
    data.exercises.push({ name, sets, reps, weight, day });
    await data.save();
    res.status(201).json(data.exercises);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add exercise' });
  }
});

// PATCH /api/data/workouts/:id/toggle — mark exercise as done/undone
router.patch('/workouts/:id/toggle', async (req, res) => {
  try {
    const data = await UserData.findOne({ user: req.user._id });
    const exercise = data.exercises.id(req.params.id);

    if (!exercise) return res.status(404).json({ message: 'Exercise not found' });

    exercise.done = !exercise.done;
    await data.save();
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ message: 'Failed to toggle exercise' });
  }
});

// DELETE /api/data/workouts/:id — delete a specific exercise
router.delete('/workouts/:id', async (req, res) => {
  try {
    const data = await UserData.findOne({ user: req.user._id });
    data.exercises.pull(req.params.id);
    await data.save();
    res.json({ message: 'Exercise deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete exercise' });
  }
});

// ─────────────────────────────────────────────────────────────
// MEAL ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/data/meals?date=YYYY-MM-DD — fetch meals for a specific day
router.get('/meals', async (req, res) => {
  try {
    const data = await UserData.findOne({ user: req.user._id });
    if (!data) return res.json([]);

    // Filter by date if provided, otherwise return today's meals
    const today = new Date().toISOString().split('T')[0];
    const date  = req.query.date || today;
    const meals = data.meals.filter((m) => m.date === date);

    res.json({ meals, calorieGoal: data.calorieGoal });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch meals' });
  }
});

// POST /api/data/meals — log a new meal
router.post('/meals', async (req, res) => {
  const { name, calories, protein, carbs, fat, type } = req.body;

  if (!name || !calories) {
    return res.status(400).json({ message: 'Meal name and calories are required' });
  }

  try {
    const data = await UserData.findOne({ user: req.user._id });
    data.meals.push({ name, calories, protein, carbs, fat, type });
    await data.save();
    res.status(201).json(data.meals);
  } catch (err) {
    res.status(500).json({ message: 'Failed to log meal' });
  }
});

// DELETE /api/data/meals/:id — delete a specific meal
router.delete('/meals/:id', async (req, res) => {
  try {
    const data = await UserData.findOne({ user: req.user._id });
    data.meals.pull(req.params.id);
    await data.save();
    res.json({ message: 'Meal deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete meal' });
  }
});

// PATCH /api/data/calorie-goal — update daily calorie goal
router.patch('/calorie-goal', async (req, res) => {
  const { calorieGoal } = req.body;

  try {
    const data = await UserData.findOneAndUpdate(
      { user: req.user._id },
      { calorieGoal },
      { new: true }
    );
    res.json({ calorieGoal: data.calorieGoal });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update calorie goal' });
  }
});

module.exports = router;
