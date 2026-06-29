import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Code2, Server, LogOut, ChevronRight, CheckCircle2, Layers } from 'lucide-react';
import { fetchStart, fetchCoursesSuccess, fetchFailure } from '../store/courseSlice';
import { logout } from '../store/authSlice';
import { apiRequest } from '../utils/api';

const COURSE_META = {
  'frontend-interview-mastery-course': {
    icon: Code2,
    gradient: 'from-violet-500 to-indigo-600',
    glow: 'shadow-violet-200',
    badge: 'Frontend',
    badgeColor: 'bg-violet-100 text-violet-700',
    ring: 'ring-violet-200',
  },
  'backend-interview-mastery-course': {
    icon: Server,
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-200',
    badge: 'Backend',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-200',
  },
};

export default function Dashboard() {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector(s => s.auth);
  const { courses, loading, error } = useSelector(s => s.course);

  useEffect(() => {
    const load = async () => {
      dispatch(fetchStart());
      try {
        const data = await apiRequest('/courses');
        dispatch(fetchCoursesSuccess(data));
      } catch (err) {
        dispatch(fetchFailure(err.message || 'Failed to load courses'));
      }
    };
    load();
  }, [dispatch]);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleOpenCourse = (courseId) => {
    navigate(`/course/${courseId}`);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-indigo/20 border-t-accent-indigo rounded-full animate-spin" />
          <p className="text-sm text-light-400 font-medium animate-pulse">Loading courses…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light-50 font-sans pb-16 animate-fadeIn">
      {/* ── Header ── */}
      <header className="bg-white border-b border-light-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-light-900 tracking-tight leading-tight">Interview Mastery</h1>
              <p className="text-xs text-light-500 font-medium">Your Learning Hub</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-light-900">Hello, {user?.name}</span>
              <span className="text-xs text-light-400 font-medium">Choose your course</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-light-500 hover:text-red-500 hover:bg-light-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">

        {/* Hero text */}
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-light-900 mb-3 tracking-tight">
            Which course are you tackling?
          </h2>
          <p className="text-light-500 max-w-lg mx-auto leading-relaxed">
            Pick a course below to view the full curriculum, track your progress, and continue where you left off.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Course Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courses.map(course => {
            const meta = COURSE_META[course.courseId] || {
              icon: Layers,
              gradient: 'from-gray-500 to-gray-700',
              glow: 'shadow-gray-200',
              badge: 'Course',
              badgeColor: 'bg-gray-100 text-gray-700',
              ring: 'ring-gray-200',
            };
            const Icon = meta.icon;
            const pct  = course.userProgress?.percentComplete ?? 0;
            const done = course.userProgress?.completedLessons ?? 0;
            const hasStarted = done > 0;

            return (
              <div
                key={course.courseId}
                onClick={() => handleOpenCourse(course.courseId)}
                className={`
                  group relative bg-white rounded-2xl border border-light-200 p-7 flex flex-col
                  cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300
                  ring-2 ring-transparent hover:${meta.ring}
                `}
              >
                {/* Top glow blob */}
                <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full bg-gradient-to-br ${meta.gradient} opacity-10 blur-2xl pointer-events-none`} />

                {/* Icon + Badge */}
                <div className="flex items-start justify-between mb-6">
                  <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${meta.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${meta.badgeColor}`}>
                    {meta.badge}
                  </span>
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-extrabold text-light-900 mb-2 leading-snug group-hover:text-indigo-700 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-light-500 leading-relaxed mb-6 flex-1">
                  {course.description}
                </p>

                {/* Stats row */}
                <div className="flex gap-4 mb-5 text-xs font-semibold text-light-500">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    {course.totalModules} Modules
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    {course.totalLessons} Lessons
                  </span>
                  {hasStarted && (
                    <span className="flex items-center gap-1.5 text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {done} Completed
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-5">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs font-semibold text-light-600">Progress</span>
                    <span className="text-xs font-bold text-light-800">{pct}%</span>
                  </div>
                  <div className="h-2 w-full bg-light-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${meta.gradient} transition-all duration-700 ease-out rounded-full`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  className={`
                    w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2
                    bg-gradient-to-r ${meta.gradient} text-white shadow-md
                    hover:opacity-90 active:scale-[0.98] transition-all duration-200
                  `}
                >
                  {hasStarted ? 'Continue Learning' : 'Start Learning'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
