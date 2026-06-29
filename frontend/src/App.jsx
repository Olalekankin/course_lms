import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards';
import Login         from './pages/Login';
import Signup        from './pages/Signup';
import Dashboard     from './pages/Dashboard';
import CourseOverview from './pages/CourseOverview';
import ModuleDetail  from './pages/ModuleDetail';
import LessonViewer  from './pages/LessonViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route
          path="/course/:courseId"
          element={<ProtectedRoute><CourseOverview /></ProtectedRoute>}
        />
        <Route
          path="/course/:courseId/module/:moduleId"
          element={<ProtectedRoute><ModuleDetail /></ProtectedRoute>}
        />
        <Route
          path="/lesson/:id"
          element={<ProtectedRoute><LessonViewer /></ProtectedRoute>}
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
