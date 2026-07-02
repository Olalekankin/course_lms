const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseId:     { type: String, required: true, unique: true },
  slug:         { type: String, default: '' },
  title:        { type: String, required: true },
  description:  { type: String, required: true },
  difficulty:   { type: String, default: '' },
  estimatedDuration: { type: String, default: '' },
  prerequisites: [{ type: String }],
  learningObjectives: [{ type: String }],
  totalModules: { type: Number, default: 0 },
  totalLessons: { type: Number, default: 0 },
});

module.exports = mongoose.model('Course', courseSchema);
