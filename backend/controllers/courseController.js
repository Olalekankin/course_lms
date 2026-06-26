const { readDb, writeDb } = require('../utils/dbHelper');
const courseData = require('../data/courseData.json');

// Get course modules and lessons index with user lock status
async function getCourses(req, res) {
  try {
    const db = await readDb();
    const user = db.users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { lessons, ...courseInfo } = courseData;
    
    // Process progression status for each lesson
    const mappedLessons = lessons.map((lesson, idx) => {
      const isCompleted = user.completedLessons.includes(lesson.id);
      
      // Unlocked rules:
      // 1. First lesson is always unlocked (idx === 0)
      // 2. Matches user.currentUnlockedLesson
      // 3. Already completed
      // 4. Previous lesson is completed (failsafe)
      const isUnlocked = 
        idx === 0 || 
        lesson.id === user.currentUnlockedLesson || 
        isCompleted ||
        (idx > 0 && user.completedLessons.includes(lessons[idx - 1].id));

      return {
        id: lesson.id,
        moduleId: lesson.moduleId,
        number: lesson.number,
        title: lesson.title,
        objective: lesson.objective,
        difficulty: lesson.difficulty,
        frequency: lesson.frequency,
        thumbnailUrl: lesson.thumbnailUrl,
        isCompleted,
        isUnlocked
      };
    });

    res.json({
      ...courseInfo,
      lessons: mappedLessons
    });
  } catch (error) {
    console.error('[Course Controller] getCourses error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Get specific lesson content and quiz questions (with answers stripped for security)
async function getLessonDetails(req, res) {
  try {
    const { id } = req.params;
    const db = await readDb();
    const user = db.users.find(u => u.id === req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lessons = courseData.lessons;
    const lessonIdx = lessons.findIndex(l => l.id === id);
    if (lessonIdx === -1) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const lesson = lessons[lessonIdx];
    
    // Check if the lesson is actually unlocked
    const isCompleted = user.completedLessons.includes(lesson.id);
    const isUnlocked = 
      lessonIdx === 0 || 
      lesson.id === user.currentUnlockedLesson || 
      isCompleted ||
      (lessonIdx > 0 && user.completedLessons.includes(lessons[lessonIdx - 1].id));

    if (!isUnlocked) {
      return res.status(403).json({ message: 'This lesson is locked. Complete the previous challenges first.' });
    }

    // Strip answers from questions before sending to frontend
    const secureQuestions = lesson.questions.map(q => {
      const { correctAnswers, ...qData } = q;
      return qData;
    });

    res.json({
      id: lesson.id,
      moduleId: lesson.moduleId,
      number: lesson.number,
      title: lesson.title,
      objective: lesson.objective,
      difficulty: lesson.difficulty,
      frequency: lesson.frequency,
      thumbnailUrl: lesson.thumbnailUrl,
      content: lesson.content,
      questions: secureQuestions
    });
  } catch (error) {
    console.error('[Course Controller] getLessonDetails error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Grade quiz answers and unlock the next lesson if all answers are correct
async function submitQuiz(req, res) {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Object: { [questionId]: answerValue }

    if (!answers) {
      return res.status(400).json({ message: 'Answers are required' });
    }

    const db = await readDb();
    const userIndex = db.users.findIndex(u => u.id === req.userId);
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    const user = db.users[userIndex];

    const lessons = courseData.lessons;
    const lessonIdx = lessons.findIndex(l => l.id === id);
    if (lessonIdx === -1) {
      return res.status(404).json({ message: 'Lesson not found' });
    }

    const lesson = lessons[lessonIdx];
    const questions = lesson.questions;

    let allCorrect = true;
    const gradingResults = {};

    for (const q of questions) {
      const userAnswer = answers[q.id];
      let isCorrect = false;

      if (q.type === 'single-choice') {
        // userAnswer is a number (option index)
        isCorrect = Number(userAnswer) === q.correctAnswers[0];
      } else if (q.type === 'multi-choice') {
        // userAnswer is an array of indices
        if (Array.isArray(userAnswer)) {
          const sortedUser = [...userAnswer].map(Number).sort();
          const sortedCorrect = [...q.correctAnswers].sort();
          isCorrect = 
            sortedUser.length === sortedCorrect.length && 
            sortedUser.every((val, index) => val === sortedCorrect[index]);
        }
      } else if (q.type === 'short-answer') {
        // userAnswer is a string
        if (typeof userAnswer === 'string') {
          const userStr = userAnswer.trim().toLowerCase();
          isCorrect = q.correctAnswers.some(ans => ans.trim().toLowerCase() === userStr);
        }
      }

      if (!isCorrect) {
        allCorrect = false;
      }

      gradingResults[q.id] = {
        correct: isCorrect,
        explanation: q.explanation,
        correctAnswers: q.correctAnswers // Return answers so frontend can show correction
      };
    }

    if (allCorrect) {
      // Mark current lesson completed
      if (!user.completedLessons.includes(lesson.id)) {
        user.completedLessons.push(lesson.id);
      }

      // Determine next lesson
      let nextLessonId = null;
      if (lessonIdx + 1 < lessons.length) {
        const nextLesson = lessons[lessonIdx + 1];
        nextLessonId = nextLesson.id;
        user.currentUnlockedLesson = nextLesson.id;
      } else {
        user.currentUnlockedLesson = 'completed';
      }

      db.users[userIndex] = user;
      await writeDb(db);

      res.json({
        passed: true,
        message: 'Congratulations! You passed the Interview Challenge!',
        results: gradingResults,
        nextLessonId
      });
    } else {
      res.json({
        passed: false,
        message: 'Some answers are incorrect. Review the explanations and try again.',
        results: gradingResults
      });
    }
  } catch (error) {
    console.error('[Course Controller] submitQuiz error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getCourses,
  getLessonDetails,
  submitQuiz
};
