require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const Course   = require('../models/Course');
const Module   = require('../models/Module');
const Lesson   = require('../models/Lesson');
const Question = require('../models/Question');
const Answer   = require('../models/Answer');

const frontendData = require('../data/courseData.json');
const backendData  = require('../data/courseData_backend.json');

function asArray(data) {
  return Array.isArray(data) ? data : [data];
}

function slugify(value, fallback) {
  const source = String(value || fallback || '').trim().toLowerCase();
  return source
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || String(fallback || 'item');
}

function getCourseId(courseData) {
  return String(courseData.courseId || courseData.slug || slugify(courseData.title, 'course'));
}

function getModuleOrder(mod, index) {
  return Number(mod.moduleNumber || mod.order || index + 1);
}

function getModuleId(mod, index) {
  return String(mod.id || mod.moduleId || mod.slug || getModuleOrder(mod, index));
}

function getLessonNumber(lesson) {
  return String(lesson.number || `${lesson.moduleNumber || 1}.${lesson.lessonNumber || 1}`);
}

function getLessonOrder(lesson, fallbackIndex) {
  const lessonNumberPart = Number(getLessonNumber(lesson).split('.')[1]);
  return Number(lesson.lessonNumber || lessonNumberPart || fallbackIndex + 1);
}

function getLessonId(lesson, courseId) {
  return String(
    lesson.id ||
    lesson.lessonId ||
    `${courseId}_${lesson.slug || `lesson-${getLessonNumber(lesson).replace('.', '-')}`}`
  );
}

function getLessonModuleId(lesson, courseData) {
  if (lesson.moduleId) return String(lesson.moduleId);

  const moduleIndex = (courseData.modules || []).findIndex(mod =>
    Number(mod.moduleNumber) === Number(lesson.moduleNumber)
  );

  if (moduleIndex >= 0) {
    return getModuleId(courseData.modules[moduleIndex], moduleIndex);
  }

  return String(lesson.moduleNumber || 1);
}

async function seedCourse(courseData) {
  const courseId = getCourseId(courseData);
  const rawModules = courseData.modules || [];
  const rawLessons = courseData.lessons || [];

  console.log(`\n[Seed] Processing: ${courseData.title}`);

  const lessonsByModule = {};
  for (const lesson of rawLessons) {
    const moduleId = getLessonModuleId(lesson, courseData);
    if (!lessonsByModule[moduleId]) lessonsByModule[moduleId] = [];
    lessonsByModule[moduleId].push(lesson);
  }

  for (const moduleId of Object.keys(lessonsByModule)) {
    lessonsByModule[moduleId].sort((a, b) => getLessonOrder(a, 0) - getLessonOrder(b, 0));
  }

  const totalModules = rawModules.length;
  const totalLessons = rawLessons.length;

  await Course.findOneAndUpdate(
    { courseId },
    {
      courseId,
      slug: courseData.slug || '',
      title: courseData.title,
      description: courseData.description,
      difficulty: courseData.difficulty || '',
      estimatedDuration: courseData.estimatedDuration || '',
      prerequisites: courseData.prerequisites || [],
      learningObjectives: courseData.learningObjectives || [],
      totalModules,
      totalLessons,
    },
    { upsert: true, new: true }
  );
  console.log(`  Course upserted (${totalModules} modules, ${totalLessons} lessons)`);

  for (let i = 0; i < rawModules.length; i++) {
    const mod = rawModules[i];
    const moduleId = getModuleId(mod, i);
    const moduleLessons = lessonsByModule[moduleId] || [];
    const lessonIds = moduleLessons.map(lesson => getLessonId(lesson, courseId));

    await Module.findOneAndUpdate(
      { moduleId, courseId },
      {
        moduleId,
        courseId,
        order: getModuleOrder(mod, i),
        name: mod.name || mod.title,
        slug: mod.slug || '',
        description: mod.description || '',
        estimatedDuration: mod.estimatedDuration || '',
        lessonIds,
      },
      { upsert: true, new: true }
    );
  }
  console.log(`  ${rawModules.length} modules upserted`);

  let lessonCount = 0;
  let questionCount = 0;

  for (let mi = 0; mi < rawModules.length; mi++) {
    const mod = rawModules[mi];
    const moduleId = getModuleId(mod, mi);
    const moduleLessons = lessonsByModule[moduleId] || [];

    for (let li = 0; li < moduleLessons.length; li++) {
      const lesson = moduleLessons[li];
      const lessonId = getLessonId(lesson, courseId);

      await Lesson.findOneAndUpdate(
        { lessonId },
        {
          lessonId,
          moduleId,
          courseId,
          number: getLessonNumber(lesson),
          title: lesson.title,
          slug: lesson.slug || '',
          objective: lesson.objective || lesson.description || '',
          difficulty: lesson.difficulty || 'Beginner',
          frequency: lesson.frequency || lesson.interviewFrequency || 'High',
          estimatedDuration: lesson.estimatedDuration || '',
          thumbnailUrl: lesson.thumbnailUrl || '',
          orderInModule: getLessonOrder(lesson, li),
          content: lesson.content || lesson.lessonMarkdown || '',
          lessonMarkdown: lesson.lessonMarkdown || lesson.content || '',
          questionsMarkdown: lesson.questionsMarkdown || '',
          answersMarkdown: lesson.answersMarkdown || '',
        },
        { upsert: true, new: true }
      );
      lessonCount++;

      const questions = lesson.questions || [];
      if (questions.length === 0) {
        await Question.deleteMany({ lessonId });
        await Answer.deleteMany({ lessonId });
        continue;
      }

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

  console.log(`  ${lessonCount} lessons upserted`);
  console.log(`  ${questionCount} questions + answers upserted`);
}

async function main() {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'interview_lms' });
  console.log('[Seed] Connected\n');

  for (const course of [...asArray(frontendData), ...asArray(backendData)]) {
    await seedCourse(course);
  }

  console.log('\n[Seed] All done. Course data is live in MongoDB.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[Seed] Fatal error:', err);
  process.exit(1);
});
