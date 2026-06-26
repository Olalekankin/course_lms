const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getCourses, getLessonDetails, submitQuiz } = require('../controllers/courseController');

// All course routes are protected and require JWT authorization
router.use(authMiddleware);

router.get('/', getCourses);
router.get('/lessons/:id', getLessonDetails);
router.post('/lessons/:id/submit', submitQuiz);

module.exports = router;
