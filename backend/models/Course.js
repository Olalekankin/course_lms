const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId:     { type: String, required: true, unique: true },
  title:        { type: String, required: true },
  description:  { type: String, required: true },
  totalModules: { type: Number, default: 0 },
  totalLessons: { type: Number, default: 0 },
});

module.exports = mongoose.model('Course', courseSchema);
