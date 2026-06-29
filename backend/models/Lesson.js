const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  lessonId:      { type: String, required: true, unique: true },
  moduleId:      { type: String, required: true },
  courseId:      { type: String, required: true },
  number:        { type: String, required: true },   // e.g. "1.1"
  title:         { type: String, required: true },
  objective:     { type: String, default: '' },
  difficulty:    { type: String, default: 'Beginner' },
  frequency:     { type: String, default: 'High' },
  thumbnailUrl:  { type: String, default: '' },
  orderInModule: { type: Number, required: true },   // 1-based position within module
  content:       { type: String, default: '' },
});

lessonSchema.index({ courseId: 1, moduleId: 1, orderInModule: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
