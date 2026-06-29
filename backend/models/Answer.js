const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  questionId:     { type: String, required: true, unique: true },
  lessonId:       { type: String, required: true },
  courseId:       { type: String, required: true },
  // For choice questions: array of option indices (numbers)
  // For short-answer: array of accepted answer strings
  correctAnswers: { type: mongoose.Schema.Types.Mixed, required: true },
  explanation:    { type: String, default: '' },
});

answerSchema.index({ lessonId: 1 });

module.exports = mongoose.model('Answer', answerSchema);
