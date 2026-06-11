const express  = require('express');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const UserData = require('../models/UserData');
const router   = express.Router();

// ─── Helper: generate a JWT token for a user ─────────────────
// The token encodes the user's ID and expires in 30 days.
// The frontend stores this and sends it with every future request.
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// Creates a new user account
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Please fill in all fields' });
  }

  try {
    // Check if email is already taken
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Create the user — password is hashed automatically by the pre-save hook in User.js
    const user = await User.create({ name, email, password });

    // Create an empty UserData document for this user
    await UserData.create({ user: user._id });

    res.status(201).json({
      message: 'Account created successfully',
      token: generateToken(user._id),
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        goal:  user.goal,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// Validates credentials and returns a JWT
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please enter your email and password' });
  }

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'No account found with this email' });
    }

    // Compare the entered password against the stored hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    res.json({
      message: 'Login successful',
      token: generateToken(user._id),
      user: {
        id:     user._id,
        name:   user.name,
        email:  user.email,
        goal:   user.goal,
        streak: user.streak,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
