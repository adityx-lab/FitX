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

// PUT /api/profile/change-password — change password for logged-in user
router.put('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Please provide your current and new password' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  try {
    // req.user was fetched with .select('-password') by the auth middleware,
    // so we need to re-fetch the user including the password hash to compare.
    const user = await User.findById(req.user._id);

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password' });
    }

    // Setting `password` triggers the pre-save hashing hook in User.js
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to change password' });
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
