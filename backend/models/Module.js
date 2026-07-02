const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
  moduleId:    { type: String, required: true },
  courseId:    { type: String, required: true },
  order:       { type: Number, required: true },   // 1-based position within course
  name:        { type: String, required: true },
  slug:        { type: String, default: '' },
  description: { type: String, default: '' },
  estimatedDuration: { type: String, default: '' },
  lessonIds:   [{ type: String }],                 // ordered lesson IDs for progress calc
});

moduleSchema.index({ courseId: 1, order: 1 });
moduleSchema.index({ moduleId: 1, courseId: 1 }, { unique: true });

module.exports = mongoose.model('Module', moduleSchema);
