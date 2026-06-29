require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Course   = require('../models/Course');
const Module   = require('../models/Module');
const Lesson   = require('../models/Lesson');
const Question = require('../models/Question');
const Answer   = require('../models/Answer');

const frontendData = require('../data/courseData.json');
const backendData  = require('../data/courseData_backend.json');

// ─── Normalise module id ───────────────────────────────────────────────────
// Frontend JSON uses "id"; backend JSON uses "id" too but with prefix "backend_N"
function getModuleId(mod) {
  return mod.id || mod.moduleId;
}

async function seedCourse(courseData) {
  const courseId = courseData.courseId;
  const rawModules = courseData.modules;
  const rawLessons = courseData.lessons;

  console.log(`\n[Seed] Processing: ${courseData.title}`);

  // Build ordered list of lessons per module
  const lessonsByModule = {};
  for (const lesson of rawLessons) {
    const mid = lesson.moduleId;
    if (!lessonsByModule[mid]) lessonsByModule[mid] = [];
    lessonsByModule[mid].push(lesson);
  }

  // Sort each module's lessons by their "number" field (e.g. "1.1", "1.2")
  for (const mid of Object.keys(lessonsByModule)) {
    lessonsByModule[mid].sort((a, b) => {
      const [, aN] = a.number.split('.').map(Number);
      const [, bN] = b.number.split('.').map(Number);
      return aN - bN;
    });
  }

  // ── Course document ──────────────────────────────────────────────────────
  const totalModules = rawModules.length;
  const totalLessons = rawLessons.length;

  await Course.findOneAndUpdate(
    { courseId },
    { courseId, title: courseData.title, description: courseData.description, totalModules, totalLessons },
    { upsert: true, new: true }
  );
  console.log(`  ✓ Course upserted (${totalModules} modules, ${totalLessons} lessons)`);

  // ── Module documents ─────────────────────────────────────────────────────
  for (let i = 0; i < rawModules.length; i++) {
    const mod = rawModules[i];
    const moduleId = getModuleId(mod);
    const moduleLessons = lessonsByModule[moduleId] || [];
    const lessonIds = moduleLessons.map(l => l.id);

    await Module.findOneAndUpdate(
      { moduleId, courseId },
      {
        moduleId,
        courseId,
        order: i + 1,
        name: mod.name,
        description: mod.description || '',
        lessonIds,
      },
      { upsert: true, new: true }
    );
  }
  console.log(`  ✓ ${rawModules.length} modules upserted`);

  // ── Lesson, Question & Answer documents ─────────────────────────────────
  let lessonCount = 0;
  let questionCount = 0;

  for (const mod of rawModules) {
    const moduleId = getModuleId(mod);
    const moduleLessons = lessonsByModule[moduleId] || [];

    for (let li = 0; li < moduleLessons.length; li++) {
      const lesson = moduleLessons[li];
      const lessonId = lesson.id;

      await Lesson.findOneAndUpdate(
        { lessonId },
        {
          lessonId,
          moduleId,
          courseId,
          number: lesson.number,
          title: lesson.title,
          objective: lesson.objective || '',
          difficulty: lesson.difficulty || 'Beginner',
          frequency: lesson.frequency || 'High',
          thumbnailUrl: lesson.thumbnailUrl || '',
          orderInModule: li + 1,
          content: lesson.content || '',
        },
        { upsert: true, new: true }
      );
      lessonCount++;

      // Questions & Answers
      const questions = lesson.questions || [];
      for (let qi = 0; qi < questions.length; qi++) {
        const q = questions[qi];

        await Question.findOneAndUpdate(
          { questionId: q.id },
          {
            questionId: q.id,
            lessonId,
            courseId,
            order: qi + 1,
            type: q.type,
            questionText: q.questionText,
            options: q.options || [],
          },
          { upsert: true, new: true }
        );

        await Answer.findOneAndUpdate(
          { questionId: q.id },
          {
            questionId: q.id,
            lessonId,
            courseId,
            correctAnswers: q.correctAnswers,
            explanation: q.explanation || '',
          },
          { upsert: true, new: true }
        );

        questionCount++;
      }
    }
  }

  console.log(`  ✓ ${lessonCount} lessons upserted`);
  console.log(`  ✓ ${questionCount} questions + answers upserted`);
}

async function main() {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'interview_lms' });
  console.log('[Seed] Connected\n');

  await seedCourse(frontendData);
  await seedCourse(backendData);

  console.log('\n[Seed] ✅ All done. Course data is live in MongoDB.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
