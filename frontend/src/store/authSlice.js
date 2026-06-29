import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const userJson = localStorage.getItem('user');

const initialState = {
  token: token || null,
  user: userJson ? JSON.parse(userJson) : null,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    authSuccess: (state, action) => {
      state.loading = false;
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    authFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      state.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateProgress: (state, action) => {
      if (state.user) {
        const { completedLessons, takenTests, currentUnlockedLesson, currentUnlockedLessons } = action.payload;
        if (completedLessons !== undefined) state.user.completedLessons = completedLessons;
        if (takenTests !== undefined) state.user.takenTests = takenTests;
        if (currentUnlockedLesson !== undefined) state.user.currentUnlockedLesson = currentUnlockedLesson;
        if (currentUnlockedLessons !== undefined) {
          state.user.currentUnlockedLessons = currentUnlockedLessons;
        }
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    clearError: (state) => {
      state.error = null;
    }
  }
});

export const {
  authStart,
  authSuccess,
  authFailure,
  logout,
  updateProgress,
  clearError
} = authSlice.actions;

export default authSlice.reducer;
