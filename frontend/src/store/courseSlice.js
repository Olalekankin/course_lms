import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Home — list of course cards
  courses: [],

  // Course overview + syllabus (CourseOverview page)
  activeCourse: null,

  // Module detail + lesson list (ModuleDetail page)
  activeModule: null,

  // Full lesson content (LessonViewer page)
  activeLesson: null,

  // Quiz result from last submit
  quizResult: null,

  loading: false,
  error: null,
};

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    // ── Generic loading states ────────────────────────────────────────────
    fetchStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // ── Courses list (home) ───────────────────────────────────────────────
    fetchCoursesSuccess: (state, action) => {
      state.loading = false;
      state.courses = action.payload;
    },

    // ── Course overview + syllabus ────────────────────────────────────────
    fetchCourseOverviewSuccess: (state, action) => {
      state.loading = false;
      state.activeCourse = action.payload;
    },

    // ── Module detail ─────────────────────────────────────────────────────
    fetchModuleSuccess: (state, action) => {
      state.loading = false;
      state.activeModule = action.payload;
    },

    // After "Start Module" — updates moduleStatus and merges lesson list
    startModuleSuccess: (state, action) => {
      state.loading = false;
      state.activeModule = action.payload;

      // Also update the corresponding syllabus entry if activeCourse is loaded
      if (state.activeCourse && state.activeCourse.syllabus) {
        const entry = state.activeCourse.syllabus.find(
          m => m.moduleId === action.payload.moduleId
        );
        if (entry) {
          entry.moduleStatus = 'in-progress';
        }
      }
    },

    // ── Lesson content ────────────────────────────────────────────────────
    fetchLessonStart: (state) => {
      state.loading = true;
      state.activeLesson = null;
      state.error = null;
      state.quizResult = null;
    },
    fetchLessonSuccess: (state, action) => {
      state.loading = false;
      state.activeLesson = action.payload;
    },
    fetchLessonFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },

    // ── Quiz ──────────────────────────────────────────────────────────────
    submitQuizStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    submitQuizSuccess: (state, action) => {
      state.loading = false;
      state.quizResult = action.payload;

      if (state.activeLesson && state.activeModule) {
        const lesson = state.activeModule.lessons.find(
          l => l.lessonId === state.activeLesson.lessonId
        );
        if (lesson) {
          // Always mark test as taken (regardless of pass/fail)
          lesson.isTestTaken = true;
          // Only mark completed if passed
          if (action.payload.passed) {
            lesson.isCompleted = true;
            lesson.isNext = false;
          }
        }
        // If passed, set next lesson as isNext
        if (action.payload.passed) {
          const nextId = action.payload.nextLessonId;
          if (nextId) {
            const next = state.activeModule.lessons.find(l => l.lessonId === nextId);
            if (next) next.isNext = true;
          }
        } else if (action.payload.nextLessonId) {
          // On fail: next lesson becomes accessible (isNext) since test was taken
          const nextLesson = state.activeModule.lessons.find(
            l => l.lessonId === action.payload.nextLessonId
          );
          if (nextLesson && !nextLesson.isTestTaken) nextLesson.isNext = true;
        }

        // Module complete when all lessons have had their test taken
        const allTaken = state.activeModule.lessons.every(l => l.isTestTaken);
        if (allTaken) {
          state.activeModule.moduleStatus = 'completed';
        }
      }

      // Unlock next module in syllabus if applicable
      if (action.payload.isModuleComplete && action.payload.nextModuleUnlockable) {
        if (state.activeCourse && state.activeCourse.syllabus && state.activeLesson) {
          const currentModuleId = state.activeLesson.moduleId;
          const currentIdx = state.activeCourse.syllabus.findIndex(
            m => m.moduleId === currentModuleId
          );
          if (currentIdx >= 0) {
            state.activeCourse.syllabus[currentIdx].moduleStatus = 'completed';
          }
          const nextModule = state.activeCourse.syllabus[currentIdx + 1];
          if (nextModule && nextModule.moduleStatus === 'locked') {
            nextModule.moduleStatus = 'unlocked-not-started';
          }
        }
      }
    },
    submitQuizFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearQuizResult: (state) => {
      state.quizResult = null;
    },

    // ── Reset ─────────────────────────────────────────────────────────────
    resetCourseState: (state) => {
      Object.assign(state, initialState);
    },

    // ── Backward-compat aliases (used by existing LessonViewer) ──────────
    fetchCourseStart:   (state) => { state.loading = true; state.error = null; },
    fetchCourseSuccess: (state, action) => {
      // Legacy: dashboard used to call this with { lessons, ...courseInfo }
      state.loading = false;
      state.activeCourse = action.payload;
    },
    fetchCourseFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const {
  fetchStart,
  fetchFailure,
  fetchCoursesSuccess,
  fetchCourseOverviewSuccess,
  fetchModuleSuccess,
  startModuleSuccess,
  fetchLessonStart,
  fetchLessonSuccess,
  fetchLessonFailure,
  submitQuizStart,
  submitQuizSuccess,
  submitQuizFailure,
  clearQuizResult,
  resetCourseState,
  // legacy aliases
  fetchCourseStart,
  fetchCourseSuccess,
  fetchCourseFailure,
} = courseSlice.actions;

export default courseSlice.reducer;
