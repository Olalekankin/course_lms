const Course   = require('../models/Course');
const Module   = require('../models/Module');
const Lesson   = require('../models/Lesson');
const Question = require('../models/Question');
const Answer   = require('../models/Answer');
const User     = require('../models/User');

// ─── Helper: derive moduleStatus for a given module ───────────────────────
function getModuleStatus(mod, user, allModules, courseId) {
  const completedSet = new Set(user.completedLessons || []);
  const startedArr   = (user.startedModules && user.startedModules.get
    ? user.startedModules.get(courseId)
    : user.startedModules?.[courseId]) || [];
  const started = new Set(startedArr);

  // Completed — every lesson in the module is done
  const allDone = mod.lessonIds.length > 0 && mod.lessonIds.every(id => completedSet.has(id));
  if (allDone) return 'completed';

  // Started (in-progress)
  if (started.has(mod.moduleId)) return 'in-progress';

  // Module 1 is always unlocked-not-started if not yet started/completed
  if (mod.order === 1) return 'unlocked-not-started';

  // Check if previous module is 100% complete
  const prevMod = allModules.find(m => m.order === mod.order - 1);
  if (!prevMod) return 'locked';
  const prevDone = prevMod.lessonIds.length > 0 && prevMod.lessonIds.every(id => completedSet.has(id));
  return prevDone ? 'unlocked-not-started' : 'locked';
}

// ─── Helper: count completed lessons in a module ───────────────────────────
function countCompleted(mod, user) {
  const completedSet = new Set(user.completedLessons || []);
  return mod.lessonIds.filter(id => completedSet.has(id)).length;
}

// ─── Endpoint 1: GET /api/courses ─────────────────────────────────────────
async function getCoursesList(req, res) {
  try {
    const user = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const courses = await Course.find({});
    const result = await Promise.all(courses.map(async course => {
      const completedCount = (user.completedLessons || []).filter(lessonId => {
        // We count per-course by checking lesson docs — use cached lessonIds from modules
        return true; // computed below
      }).length;

      // Count lessons belonging to this course that the user completed
      const modules = await Module.find({ courseId: course.courseId });
      const allLessonIds = modules.flatMap(m => m.lessonIds);
      const completed = (user.completedLessons || []).filter(id => allLessonIds.includes(id)).length;
      const pct = allLessonIds.length > 0 ? Math.round((completed / allLessonIds.length) * 100) : 0;

      return {
        courseId:     course.courseId,
        title:        course.title,
        description:  course.description,
        totalModules: course.totalModules,
        totalLessons: course.totalLessons,
        userProgress: {
          completedLessons: completed,
          percentComplete:  pct,
        },
      };
    }));

    res.json(result);
  } catch (err) {
    console.error('[courseController] getCoursesList:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ─── Endpoint 2: GET /api/courses/:courseId ────────────────────────────────
async function getCourseOverview(req, res) {
  try {
    const { courseId } = req.params;
    const user   = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const course = await Course.findOne({ courseId });
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const allModules = await Module.find({ courseId }).sort({ order: 1 });
    const allLessonIds = allModules.flatMap(m => m.lessonIds);
    const completed = (user.completedLessons || []).filter(id => allLessonIds.includes(id)).length;
    const pct = allLessonIds.length > 0 ? Math.round((completed / allLessonIds.length) * 100) : 0;

    // Build syllabus — fetch lesson titles for each module
    const syllabus = await Promise.all(allModules.map(async mod => {
      const lessons = await Lesson.find({ moduleId: mod.moduleId, courseId }).sort({ orderInModule: 1 });
      const moduleStatus = getModuleStatus(mod, user, allModules, courseId);

      return {
        moduleId:               mod.moduleId,
        order:                  mod.order,
        name:                   mod.name,
        description:            mod.description,
        lessonCount:            mod.lessonIds.length,
        lessonTitles:           lessons.map(l => l.title),
        moduleStatus,
        completedLessonsInModule: countCompleted(mod, user),
      };
    }));

    res.json({
      courseId:     course.courseId,
      title:        course.title,
      description:  course.description,
      totalModules: course.totalModules,
      totalLessons: course.totalLessons,
      userProgress: { completedLessons: completed, percentComplete: pct },
      syllabus,
    });
  } catch (err) {
    console.error('[courseController] getCourseOverview:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ─── Endpoint 3: GET /api/courses/:courseId/modules/:moduleId ─────────────
async function getModuleDetail(req, res) {
  try {
    const { courseId, moduleId } = req.params;
    const user = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const allModules = await Module.find({ courseId }).sort({ order: 1 });
    const mod = allModules.find(m => m.moduleId === moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const moduleStatus = getModuleStatus(mod, user, allModules, courseId);
    if (moduleStatus === 'locked') {
      return res.status(403).json({ message: 'This module is locked. Complete the previous module first.' });
    }

    const lessons = await Lesson.find({ moduleId, courseId }).sort({ orderInModule: 1 });
    const completedSet = new Set(user.completedLessons || []);

    // Determine which lesson is "next" (first not completed, in order)
    let foundNext = false;
    const lessonList = lessons.map(l => {
      const isCompleted = completedSet.has(l.lessonId);
      let isNext = false;
      if (!isCompleted && !foundNext) {
        isNext = true;
        foundNext = true;
      }
      return {
        lessonId:    l.lessonId,
        number:      l.number,
        title:       l.title,
        objective:   l.objective,
        difficulty:  l.difficulty,
        frequency:   l.frequency,
        thumbnailUrl: l.thumbnailUrl,
        isCompleted,
        isNext,
      };
    });

    res.json({
      moduleId,
      courseId,
      order:        mod.order,
      name:         mod.name,
      description:  mod.description,
      moduleStatus,
      lessons:      lessonList,
    });
  } catch (err) {
    console.error('[courseController] getModuleDetail:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ─── Endpoint 4: POST /api/courses/:courseId/modules/:moduleId/start ──────
async function startModule(req, res) {
  try {
    const { courseId, moduleId } = req.params;
    const user = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const allModules = await Module.find({ courseId }).sort({ order: 1 });
    const mod = allModules.find(m => m.moduleId === moduleId);
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    // Module 1 can always be started; others require previous module 100% done
    if (mod.order > 1) {
      const prevMod = allModules.find(m => m.order === mod.order - 1);
      if (prevMod) {
        const completedSet = new Set(user.completedLessons || []);
        const prevDone = prevMod.lessonIds.every(id => completedSet.has(id));
        if (!prevDone) {
          return res.status(403).json({ message: 'Complete all lessons in the previous module first.' });
        }
      }
    }

    // Already started — just return current module detail
    const startedArr = (user.startedModules && user.startedModules.get
      ? user.startedModules.get(courseId)
      : user.startedModules?.[courseId]) || [];

    if (!startedArr.includes(moduleId)) {
      // Record start
      if (!user.startedModules) user.startedModules = {};
      const currentStarted = (user.startedModules.get
        ? user.startedModules.get(courseId)
        : user.startedModules[courseId]) || [];

      if (user.startedModules.set) {
        user.startedModules.set(courseId, [...currentStarted, moduleId]);
      } else {
        user.startedModules[courseId] = [...currentStarted, moduleId];
      }
      user.markModified('startedModules');
      await user.save();
    }

    // Return module detail (same as getModuleDetail response)
    const updatedUser = await User.findOne({ userId: req.userId });
    const lessons = await Lesson.find({ moduleId, courseId }).sort({ orderInModule: 1 });
    const completedSet = new Set(updatedUser.completedLessons || []);
    let foundNext = false;
    const lessonList = lessons.map(l => {
      const isCompleted = completedSet.has(l.lessonId);
      let isNext = false;
      if (!isCompleted && !foundNext) { isNext = true; foundNext = true; }
      return {
        lessonId: l.lessonId, number: l.number, title: l.title,
        objective: l.objective, difficulty: l.difficulty, frequency: l.frequency,
        thumbnailUrl: l.thumbnailUrl, isCompleted, isNext,
      };
    });

    res.json({
      moduleId, courseId, order: mod.order, name: mod.name,
      description: mod.description, moduleStatus: 'in-progress', lessons: lessonList,
    });
  } catch (err) {
    console.error('[courseController] startModule:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ─── Endpoint 5: GET /api/courses/lessons/:lessonId ───────────────────────
async function getLessonDetail(req, res) {
  try {
    const { lessonId } = req.params;
    const user = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const lesson = await Lesson.findOne({ lessonId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    // Check that the module has been started
    const startedArr = (user.startedModules && user.startedModules.get
      ? user.startedModules.get(lesson.courseId)
      : user.startedModules?.[lesson.courseId]) || [];
    const moduleStarted = startedArr.includes(lesson.moduleId);

    // Module 1 is auto-accessible even without explicit "start" for backward compat
    const mod = await Module.findOne({ moduleId: lesson.moduleId, courseId: lesson.courseId });
    if (!moduleStarted && mod && mod.order > 1) {
      return res.status(403).json({ message: 'Start this module before accessing its lessons.' });
    }

    res.json({
      lessonId:    lesson.lessonId,
      moduleId:    lesson.moduleId,
      courseId:    lesson.courseId,
      number:      lesson.number,
      title:       lesson.title,
      objective:   lesson.objective,
      difficulty:  lesson.difficulty,
      frequency:   lesson.frequency,
      thumbnailUrl: lesson.thumbnailUrl,
      content:     lesson.content,
    });
  } catch (err) {
    console.error('[courseController] getLessonDetail:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ─── Endpoint 6: GET /api/courses/lessons/:lessonId/questions ─────────────
async function getLessonQuestions(req, res) {
  try {
    const { lessonId } = req.params;
    const user = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const lesson = await Lesson.findOne({ lessonId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const questions = await Question.find({ lessonId }).sort({ order: 1 });

    res.json({
      lessonId,
      questions: questions.map(q => ({
        questionId:   q.questionId,
        order:        q.order,
        type:         q.type,
        questionText: q.questionText,
        options:      q.options,
      })),
    });
  } catch (err) {
    console.error('[courseController] getLessonQuestions:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// ─── Endpoint 7: POST /api/courses/lessons/:lessonId/submit ───────────────
async function submitQuiz(req, res) {
  try {
    const { lessonId } = req.params;
    const { answers } = req.body;

    if (!answers) return res.status(400).json({ message: 'Answers are required' });

    const user = await User.findOne({ userId: req.userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const lesson = await Lesson.findOne({ lessonId });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });

    const mod = await Module.findOne({ moduleId: lesson.moduleId, courseId: lesson.courseId });
    if (!mod) return res.status(404).json({ message: 'Module not found' });

    const completedSet = new Set(user.completedLessons || []);

    // ── Enforce strict lesson order ───────────────────────────────────────
    if (lesson.orderInModule > 1) {
      const prevLessonId = mod.lessonIds[lesson.orderInModule - 2]; // 0-indexed
      if (prevLessonId && !completedSet.has(prevLessonId)) {
        return res.status(403).json({ message: 'Complete the previous lesson first.' });
      }
    }

    // ── Grade answers ─────────────────────────────────────────────────────
    const questions = await Question.find({ lessonId }).sort({ order: 1 });
    const answerDocs = await Answer.find({ lessonId });
    const answerMap  = Object.fromEntries(answerDocs.map(a => [a.questionId, a]));

    let allCorrect = true;
    const results = {};

    for (const q of questions) {
      const ans = answerMap[q.questionId];
      if (!ans) continue;

      const userAnswer = answers[q.questionId];
      let isCorrect = false;

      if (q.type === 'single-choice') {
        isCorrect = Number(userAnswer) === ans.correctAnswers[0];
      } else if (q.type === 'multi-choice') {
        if (Array.isArray(userAnswer)) {
          const sortedUser    = [...userAnswer].map(Number).sort();
          const sortedCorrect = [...ans.correctAnswers].sort();
          isCorrect = sortedUser.length === sortedCorrect.length &&
            sortedUser.every((v, i) => v === sortedCorrect[i]);
        }
      } else if (q.type === 'short-answer') {
        if (typeof userAnswer === 'string') {
          const norm = userAnswer.trim().toLowerCase();
          isCorrect = ans.correctAnswers.some(a => a.trim().toLowerCase() === norm);
        }
      }

      if (!isCorrect) allCorrect = false;

      results[q.questionId] = {
        correct:        isCorrect,
        correctAnswers: ans.correctAnswers,
        explanation:    ans.explanation,
      };
    }

    // ── Update user progress on pass ──────────────────────────────────────
    let nextLessonId         = null;
    let isModuleComplete     = false;
    let nextModuleUnlockable = false;

    if (allCorrect) {
      if (!completedSet.has(lessonId)) {
        user.completedLessons.push(lessonId);
        completedSet.add(lessonId);
      }

      // Determine next lesson within module
      const currentIdx = mod.lessonIds.indexOf(lessonId);
      if (currentIdx >= 0 && currentIdx + 1 < mod.lessonIds.length) {
        nextLessonId = mod.lessonIds[currentIdx + 1];
      }

      // Check if this was the last lesson in the module
      isModuleComplete = mod.lessonIds.every(id => completedSet.has(id));

      // Check if next module exists and is now unlockable
      if (isModuleComplete) {
        const allModules = await Module.find({ courseId: lesson.courseId }).sort({ order: 1 });
        const nextMod    = allModules.find(m => m.order === mod.order + 1);
        nextModuleUnlockable = !!nextMod;
      }

      // Keep currentUnlockedLessons in sync for backward compat
      if (nextLessonId) {
        if (user.currentUnlockedLessons.set) {
          user.currentUnlockedLessons.set(lesson.courseId, nextLessonId);
        } else {
          user.currentUnlockedLessons[lesson.courseId] = nextLessonId;
        }
        user.markModified('currentUnlockedLessons');
      }

      user.markModified('completedLessons');
      await user.save();
    }

    const currentUnlockedLessonsObj = {};
    if (user.currentUnlockedLessons && user.currentUnlockedLessons.forEach) {
      user.currentUnlockedLessons.forEach((v, k) => { currentUnlockedLessonsObj[k] = v; });
    } else {
      Object.assign(currentUnlockedLessonsObj, user.currentUnlockedLessons || {});
    }

    res.json({
      passed:               allCorrect,
      message:              allCorrect
        ? 'Congratulations! You passed the Interview Challenge!'
        : 'Some answers are incorrect. Review the explanations and try again.',
      nextLessonId,
      isModuleComplete,
      nextModuleUnlockable,
      results,
      userProgress: {
        completedLessons:         user.completedLessons,
        currentUnlockedLessons:   currentUnlockedLessonsObj,
      },
    });
  } catch (err) {
    console.error('[courseController] submitQuiz:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  getCoursesList,
  getCourseOverview,
  getModuleDetail,
  startModule,
  getLessonDetail,
  getLessonQuestions,
  submitQuiz,
};
