const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getCoursesList,
  getCourseOverview,
  getModuleDetail,
  startModule,
  getLessonDetail,
  getLessonQuestions,
  submitQuiz,
} = require('../controllers/courseController');

// All course routes are protected
router.use(authMiddleware);

// ─── Lesson routes FIRST — must come before /:courseId to avoid "lessons"
// being treated as a courseId param ─────────────────────────────────────────
router.get('/lessons/:lessonId',              getLessonDetail);
router.get('/lessons/:lessonId/questions',    getLessonQuestions);
router.post('/lessons/:lessonId/submit',      submitQuiz);

// ─── Course routes ────────────────────────────────────────────────────────
router.get('/',                                      getCoursesList);
router.get('/:courseId',                             getCourseOverview);

// ─── Module routes ────────────────────────────────────────────────────────
router.post('/:courseId/modules/:moduleId/start',    startModule);
router.get('/:courseId/modules/:moduleId',           getModuleDetail);

module.exports = router;
