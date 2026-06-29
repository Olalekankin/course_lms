const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionId:   { type: String, required: true, unique: true },
  lessonId:     { type: String, required: true },
  courseId:     { type: String, required: true },
  order:        { type: Number, required: true },
  type:         {
    type: String,
    enum: ['single-choice', 'multi-choice', 'short-answer'],
    required: true,
  },
  questionText: { type: String, required: true },
  options:      [{ type: String }],   // empty array for short-answer questions
});

questionSchema.index({ lessonId: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);
