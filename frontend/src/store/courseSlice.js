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

      if (action.payload.passed && state.activeLesson) {
        // Mark lesson completed in activeModule lesson list
        if (state.activeModule) {
          const lesson = state.activeModule.lessons.find(
            l => l.lessonId === state.activeLesson.lessonId
          );
          if (lesson) {
            lesson.isCompleted = true;
            lesson.isNext = false;
          }
          // Set next lesson as isNext
          const nextId = action.payload.nextLessonId;
          if (nextId) {
            const next = state.activeModule.lessons.find(l => l.lessonId === nextId);
            if (next) next.isNext = true;
          }
          // Update module status if module is now complete
          if (action.payload.isModuleComplete) {
            state.activeModule.moduleStatus = 'completed';
          }
        }

        // Unlock next module in syllabus if applicable
        if (action.payload.isModuleComplete && action.payload.nextModuleUnlockable) {
          if (state.activeCourse && state.activeCourse.syllabus) {
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
