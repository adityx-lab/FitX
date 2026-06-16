const express      = require('express');
const crypto       = require('crypto');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');
const User         = require('../models/User');
const UserData     = require('../models/UserData');
const router       = express.Router();

// ─── Helper: generate a JWT token for a user ─────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// ─── Helper: send password reset email via Gmail ──────────────
// Uses Gmail SMTP with an App Password (not your real Gmail password).
// To set this up: Google Account → Security → 2-Step Verification → App Passwords
// Generate an App Password for "Mail" and put it in EMAIL_PASS in your .env
const sendResetEmail = async (toEmail, userName, resetToken) => {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,  // your Gmail address
      pass: process.env.EMAIL_PASS,  // Gmail App Password (not your real password)
    },
  });

  // The reset link points to the frontend with the token as a query param
  // In production this would be your deployed URL; for local dev it's localhost
  const resetUrl = `${process.env.FRONTEND_URL || 'http://127.0.0.1:3000/files/fitx-frontend.html'}?reset=${resetToken}`;

  const mailOptions = {
    from: `"FitX App" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: '🔐 Reset your FitX password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9fafb; border-radius: 12px;">
        <h1 style="color: #4CAF50; font-size: 36px; margin: 0 0 4px;">FitX</h1>
        <p style="color: #6b7280; margin: 0 0 24px; font-size: 13px;">Your smart fitness companion</p>

        <h2 style="font-size: 20px; color: #1a1a1a; margin-bottom: 12px;">Hi ${userName} 👋</h2>
        <p style="color: #374151; line-height: 1.6;">
          We received a request to reset your FitX password. Click the button below to choose a new one.
          This link will expire in <strong>30 minutes</strong>.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}"
            style="background: #4CAF50; color: white; padding: 14px 32px; border-radius: 8px;
                   text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
            Reset My Password
          </a>
        </div>

        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">
          Or copy and paste this link into your browser:<br>
          <a href="${resetUrl}" style="color: #4CAF50; word-break: break-all;">${resetUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          If you didn't request a password reset, you can safely ignore this email.
          Your password will not change.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
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

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password
// Sends a password reset email to the user's registered address.
// ─────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Please enter your email address' });
  }

  // Always return this — never reveal whether an email is registered
  const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.json({ message: genericMessage });
    }

    // Generate a random token, store only its SHA-256 hash in the DB
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken   = hashedToken;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // expires in 30 minutes
    await user.save({ validateBeforeSave: false });

    // Send the raw token in the reset email (only the hash lives in DB)
    try {
      console.log('📧 Attempting to send reset email to:', user.email);
      await sendResetEmail(user.email, user.name, rawToken);
      console.log('✅ Reset email sent successfully to:', user.email);
      return res.json({ message: genericMessage });
    } catch (emailErr) {
      // If email sending fails, clear the token so it can't be used
      console.error('❌ Email send failed:', emailErr.message);
      console.error('❌ Full error:', emailErr);
      user.resetPasswordToken   = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({
        message: 'Failed to send reset email. Please check your email configuration.',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during password reset request' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password/:token
// Resets the password using a valid (non-expired) reset token.
// ─────────────────────────────────────────────────────────────
router.post('/reset-password/:token', async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  if (!password) {
    return res.status(400).json({ message: 'Please enter a new password' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    // Setting `password` triggers the pre-save hashing hook in User.js
    user.password = password;
    user.resetPasswordToken   = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({
      message: 'Password has been reset successfully. You can now log in.',
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
    res.status(500).json({ message: 'Server error during password reset' });
  }
});

module.exports = router;