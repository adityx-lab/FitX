const express  = require('express');
const User     = require('../models/User');
const UserData = require('../models/UserData');
const { protect } = require('../middleware/auth');
const router   = express.Router();

router.use(protect);

// GET /api/profile — get logged-in user's profile
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const data = await UserData.findOne({ user: req.user._id });

    res.json({
      name:          user.name,
      email:         user.email,
      goal:          user.goal,
      streak:        user.streak,
      totalMeals:    data ? data.meals.length : 0,
      totalExercises:data ? data.exercises.length : 0,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// PATCH /api/profile — update goal or streak
router.patch('/', async (req, res) => {
  const { goal, streak } = req.body;

  try {
    const updates = {};
    if (goal   !== undefined) updates.goal   = goal;
    if (streak !== undefined) updates.streak = streak;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true }
    ).select('-password');

    res.json({ goal: user.goal, streak: user.streak });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

// DELETE /api/profile — delete account and all data
router.delete('/', async (req, res) => {
  try {
    await UserData.findOneAndDelete({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: 'Account and all data deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete account' });
  }
});

module.exports = router;
