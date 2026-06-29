import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { BookOpen, ArrowLeft, CheckCircle2, PlayCircle, Circle, AlertCircle } from 'lucide-react';
import { fetchStart, fetchFailure, fetchModuleSuccess } from '../store/courseSlice';
import { apiRequest } from '../utils/api';

const DIFFICULTY_STYLES = {
  Beginner:          'bg-emerald-50 text-emerald-700 border-emerald-100',
  Intermediate:      'bg-amber-50 text-amber-700 border-amber-100',
  Advanced:          'bg-red-50 text-red-700 border-red-100',
  'Interview Mastery': 'bg-violet-50 text-violet-700 border-violet-100',
};

export default function ModuleDetail() {
  const { courseId, moduleId } = useParams();
  const navigate  = useNavigate();
  const dispatch  = useDispatch();
  const { activeModule, loading, error } = useSelector(s => s.course);

  useEffect(() => {
    const load = async () => {
      dispatch(fetchStart());
      try {
        const data = await apiRequest(`/courses/${courseId}/modules/${moduleId}`);
        dispatch(fetchModuleSuccess(data));
      } catch (err) {
        dispatch(fetchFailure(err.message || 'Failed to load module'));
      }
    };
    load();
  }, [dispatch, courseId, moduleId]);

  const handleLessonClick = (lesson) => {
    navigate(`/lesson/${lesson.lessonId}`);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-indigo/20 border-t-accent-indigo rounded-full animate-spin" />
          <p className="text-sm text-light-400 font-medium animate-pulse">Loading module…</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-50 p-6">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button onClick={() => navigate(`/course/${courseId}`)} className="text-indigo-600 font-semibold underline underline-offset-2">
          Back to Course
        </button>
      </div>
    );
  }
  if (!activeModule) return null;

  const { name, description, order, moduleStatus, lessons } = activeModule;
  const completedCount = lessons.filter(l => l.isCompleted).length;
  const takenCount     = lessons.filter(l => l.isTestTaken && !l.isCompleted).length;
  const totalCount     = lessons.length;

  return (
    <div className="min-h-screen bg-light-50 font-sans pb-16 animate-fadeIn">

      {/* ── Header ── */}
      <header className="bg-white border-b border-light-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/course/${courseId}`)}
            className="p-2 rounded-lg hover:bg-light-100 text-light-500 hover:text-light-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow text-white font-extrabold text-sm">
              {order}
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-light-400 uppercase tracking-wider">Module {order}</span>
              <h1 className="font-bold text-light-900 tracking-tight leading-tight truncate">{name}</h1>
            </div>
          </div>
          <span className="hidden sm:inline-flex text-xs font-semibold text-light-500 bg-light-100 px-3 py-1.5 rounded-full">
            {completedCount}/{totalCount} done
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* ── Module Hero ── */}
        <div className="bg-white rounded-2xl border border-light-200 p-7 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-40 h-40 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-light-500 leading-relaxed mb-5 max-w-2xl">{description}</p>
            {/* Progress bar */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs font-semibold text-light-600">Module Progress</span>
                <span className="text-xs font-bold text-indigo-600">{completedCount} / {totalCount} lessons</span>
              </div>
              <div className="h-2.5 w-full bg-light-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-700 rounded-full"
                  style={{ width: totalCount > 0 ? `${Math.round((completedCount / totalCount) * 100)}%` : '0%' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── Lessons heading ── */}
        <div className="flex items-center gap-2 mb-5">
          <BookOpen className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-extrabold text-light-900">Lessons</h2>
        </div>

        {/* ── Lesson Cards Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lessons.map((lesson) => {
            const diffClass = DIFFICULTY_STYLES[lesson.difficulty] || 'bg-light-100 text-light-600 border-light-200';

            return (
              <div
                key={lesson.lessonId}
                onClick={() => handleLessonClick(lesson)}
                className={`
                  relative bg-white rounded-2xl border p-5 flex flex-col cursor-pointer
                  transition-all duration-200 group
                  ${lesson.isCompleted
                    ? 'border-emerald-200 hover:shadow-md hover:shadow-emerald-50 hover:-translate-y-0.5'
                    : lesson.isTestTaken
                      ? 'border-amber-200 hover:shadow-md hover:shadow-amber-50 hover:-translate-y-0.5'
                      : lesson.isNext
                        ? 'border-indigo-300 ring-2 ring-indigo-100 hover:shadow-lg hover:shadow-indigo-50 hover:-translate-y-1'
                        : 'border-light-200 hover:border-light-300 hover:shadow-md hover:-translate-y-0.5'
                  }
                `}
              >
                {/* Status icon + lesson number */}
                <div className="flex items-start justify-between mb-3">
                  <span className="text-xs font-bold text-light-400 tracking-wider">
                    Lesson {lesson.number}
                  </span>
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center shadow-sm
                    ${lesson.isCompleted ? 'bg-emerald-500' : lesson.isTestTaken ? 'bg-amber-400' : lesson.isNext ? 'bg-indigo-600' : 'bg-light-100'}`}>
                    {lesson.isCompleted
                      ? <CheckCircle2 className="h-4 w-4 text-white" />
                      : lesson.isTestTaken
                        ? <AlertCircle className="h-4 w-4 text-white" />
                        : lesson.isNext
                          ? <PlayCircle className="h-4 w-4 text-white" />
                          : <Circle className="h-3.5 w-3.5 text-light-400" />
                    }
                  </div>
                </div>

                {/* Title */}
                <h4 className={`text-sm font-bold mb-2 leading-snug
                  ${lesson.isNext ? 'text-indigo-800' : 'text-light-900'} group-hover:text-indigo-700 transition-colors`}>
                  {lesson.title}
                </h4>

                {/* Objective */}
                <p className="text-xs text-light-500 leading-relaxed line-clamp-2 mb-4 flex-1">
                  {lesson.objective}
                </p>

                {/* Footer badges */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${diffClass}`}>
                    {lesson.difficulty}
                  </span>
                  {lesson.isTestTaken && !lesson.isCompleted && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                      ✗ Attempted
                    </span>
                  )}
                  {lesson.isNext && !lesson.isTestTaken && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 animate-pulse">
                      Up Next
                    </span>
                  )}
                  {lesson.isCompleted && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      ✓ Done
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
