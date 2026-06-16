const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─── Schema ──────────────────────────────────────────────────
// This defines exactly what shape a "User" document has in MongoDB.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,           // No two users can share an email
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    goal: {
      type: String,
      default: 'Get fit',
    },
    streak: {
      type: Number,
      default: 0,
    },
    // ─── Password reset fields ───────────────────────────────
    // Used by the "Forgot Password" flow. A random token is generated,
    // hashed, and stored here with an expiry. The unhashed token is sent
    // to the user (via email or returned directly in dev mode).
    resetPasswordToken: {
      type: String,
      default: undefined,
    },
    resetPasswordExpires: {
      type: Date,
      default: undefined,
    },
  },
  {
    timestamps: true,         // Adds createdAt and updatedAt automatically
  }
);

// ─── Pre-save hook: hash password before storing ─────────────
// This runs automatically every time a user is saved.
// It scrambles the password so the real password is NEVER stored.
userSchema.pre('save', async function (next) {
  // Only hash if the password field was actually changed
  if (!this.isModified('password')) return next();

  // 10 = "salt rounds" — how many times to scramble (higher = safer but slower)
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Method: compare entered password to the stored hash ─────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
