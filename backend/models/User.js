const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true },
  name:         { type: String, required: true },
  email:        { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },

  // lessonIds that have had a passing quiz submission
  completedLessons: [{ type: String }],

  // lessonIds where the quiz was taken (submitted), regardless of pass/fail
  takenTests: [{ type: String }],

  // courseId → current unlocked lessonId (kept for backward compat with existing logic)
  currentUnlockedLessons: {
    type: Map,
    of: String,
    default: {},
  },

  // courseId → array of moduleIds that user has explicitly started via "Start Module"
  startedModules: {
    type: Map,
    of: [String],
    default: {},
  },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
