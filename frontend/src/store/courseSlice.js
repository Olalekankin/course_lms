import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  courseInfo: null, // Holds { courseId, title, description, modules }
  lessons: [],     // Array of lesson metadata with isUnlocked/isCompleted status
  activeLesson: null, // Full lesson details (with content, questions)
  quizResult: null, // Results of the last submitted quiz
  loading: false,
  error: null,
};

const courseSlice = createSlice({
  name: 'course',
  initialState,
  reducers: {
    fetchCourseStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchCourseSuccess: (state, action) => {
      state.loading = false;
      const { lessons, ...info } = action.payload;
      state.courseInfo = info;
      state.lessons = lessons;
    },
    fetchCourseFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
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
    submitQuizStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    submitQuizSuccess: (state, action) => {
      state.loading = false;
      state.quizResult = action.payload;
      
      // If the quiz passed, let's immediately mark it completed in local state lessons list
      if (action.payload.passed && state.activeLesson) {
        const lesson = state.lessons.find(l => l.id === state.activeLesson.id);
        if (lesson) {
          lesson.isCompleted = true;
        }
        
        // Also unlock the next lesson in local state lessons list
        const nextId = action.payload.nextLessonId;
        if (nextId) {
          const nextLesson = state.lessons.find(l => l.id === nextId);
          if (nextLesson) {
            nextLesson.isUnlocked = true;
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
    resetCourseState: (state) => {
      state.courseInfo = null;
      state.lessons = [];
      state.activeLesson = null;
      state.quizResult = null;
      state.error = null;
    }
  }
});

export const {
  fetchCourseStart,
  fetchCourseSuccess,
  fetchCourseFailure,
  fetchLessonStart,
  fetchLessonSuccess,
  fetchLessonFailure,
  submitQuizStart,
  submitQuizSuccess,
  submitQuizFailure,
  clearQuizResult,
  resetCourseState
} = courseSlice.actions;

export default courseSlice.reducer;
