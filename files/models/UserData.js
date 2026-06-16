const mongoose = require('mongoose');

// ─── Exercise sub-schema ──────────────────────────────────────
const exerciseSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  sets:    { type: Number, default: 3 },
  reps:    { type: Number, default: 10 },
  weight:  { type: Number, default: 0 },   // in kg
  day:     { type: String, required: true }, // e.g. "Monday"
  done:    { type: Boolean, default: false },
});

// ─── Meal sub-schema ─────────────────────────────────────────
const mealSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  calories: { type: Number, required: true },
  protein:  { type: Number, default: 0 },
  carbs:    { type: Number, default: 0 },
  fat:      { type: Number, default: 0 },
  type:     {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    default: 'snack',
  },
  date: {
    type: String,   // stored as "YYYY-MM-DD" so we can filter by day
    default: () => new Date().toISOString().split('T')[0],
  },
});

// ─── Main UserData schema ─────────────────────────────────────
// One document per user. Contains ALL their workouts and meals.
const userDataSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,  // Links to the User document
      ref: 'User',
      required: true,
      unique: true,   // Each user has exactly one UserData document
    },
    exercises: [exerciseSchema],
    meals:     [mealSchema],
    calorieGoal: {
      type: Number,
      default: 2000,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserData', userDataSchema);
