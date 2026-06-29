import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  BookOpen, ArrowLeft, CheckCircle2, Lock, Play, ChevronRight,
  Layers, AlertCircle, Loader2
} from 'lucide-react';
import {
  fetchStart, fetchFailure,
  fetchCourseOverviewSuccess,
  startModuleSuccess,
} from '../store/courseSlice';
import { apiRequest } from '../utils/api';

const STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    labelClass: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
    iconClass: 'text-emerald-500',
    buttonLabel: 'Review',
    buttonClass: 'bg-white border border-light-200 text-light-700 hover:border-indigo-300 hover:text-indigo-700',
    disabled: false,
  },
  'in-progress': {
    label: 'In Progress',
    labelClass: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    icon: Play,
    iconClass: 'text-indigo-500',
    buttonLabel: 'Continue',
    buttonClass: 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md hover:opacity-90',
    disabled: false,
  },
  'unlocked-not-started': {
    label: 'Ready',
    labelClass: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Play,
    iconClass: 'text-amber-500',
    buttonLabel: 'Start Module',
    buttonClass: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md hover:opacity-90',
    disabled: false,
  },
  locked: {
    label: 'Locked',
    labelClass: 'bg-light-100 text-light-500 border-light-200',
    icon: Lock,
    iconClass: 'text-light-400',
    buttonLabel: 'Start Module',
    buttonClass: 'bg-light-100 text-light-400 cursor-not-allowed',
    disabled: true,
  },
};

export default function CourseOverview() {
  const { courseId } = useParams();
  const navigate     = useNavigate();
  const dispatch     = useDispatch();
  const { activeCourse, loading, error } = useSelector(s => s.course);

  const [startingModuleId, setStartingModuleId] = useState(null);
  const [startError, setStartError]             = useState('');

  useEffect(() => {
    const load = async () => {
      dispatch(fetchStart());
      try {
        const data = await apiRequest(`/courses/${courseId}`);
        dispatch(fetchCourseOverviewSuccess(data));
      } catch (err) {
        dispatch(fetchFailure(err.message || 'Failed to load course'));
      }
    };
    load();
  }, [dispatch, courseId]);

  const handleModuleAction = async (mod) => {
    const cfg = STATUS_CONFIG[mod.moduleStatus];
    if (!cfg || cfg.disabled) return;

    if (mod.moduleStatus === 'unlocked-not-started') {
      // Call start endpoint then navigate
      setStartingModuleId(mod.moduleId);
      setStartError('');
      try {
        const data = await apiRequest(`/courses/${courseId}/modules/${mod.moduleId}/start`, 'POST');
        dispatch(startModuleSuccess(data));
        navigate(`/course/${courseId}/module/${mod.moduleId}`);
      } catch (err) {
        setStartError(err.message || 'Failed to start module');
      } finally {
        setStartingModuleId(null);
      }
    } else {
      // in-progress or completed — just navigate
      navigate(`/course/${courseId}/module/${mod.moduleId}`);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-indigo/20 border-t-accent-indigo rounded-full animate-spin" />
          <p className="text-sm text-light-400 font-medium animate-pulse">Loading course…</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-50 p-6">
        <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
        <p className="text-red-600 font-medium mb-4">{error}</p>
        <button onClick={() => navigate('/')} className="text-indigo-600 font-semibold underline underline-offset-2">
          Back to Courses
        </button>
      </div>
    );
  }
  if (!activeCourse) return null;

  const { title, description, totalModules, totalLessons, userProgress, syllabus } = activeCourse;
  const pct = userProgress?.percentComplete ?? 0;

  return (
    <div className="min-h-screen bg-light-50 font-sans pb-16 animate-fadeIn">

      {/* ── Header ── */}
      <header className="bg-white border-b border-light-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-light-100 text-light-500 hover:text-light-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-light-900 tracking-tight truncate">{title}</h1>
              <p className="text-xs text-light-500">{totalModules} Modules · {totalLessons} Lessons</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* ── Course Hero ── */}
        <div className="bg-white rounded-2xl border border-light-200 p-7 mb-8 shadow-sm relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <p className="text-light-500 max-w-2xl mb-6 leading-relaxed">{description}</p>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-light-700">Overall Progress</span>
                <span className="text-sm font-bold text-indigo-600">
                  {userProgress?.completedLessons ?? 0} / {totalLessons} Lessons
                </span>
              </div>
              <div className="h-3 w-full bg-light-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-right text-xs text-light-400 font-semibold mt-1">{pct}% complete</p>
            </div>
          </div>
        </div>

        {/* ── Syllabus Heading ── */}
        <div className="flex items-center gap-2 mb-5">
          <Layers className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-extrabold text-light-900">Course Syllabus</h2>
        </div>

        {/* Start error banner */}
        {startError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
            {startError}
          </div>
        )}

        {/* ── Module Cards ── */}
        <div className="space-y-4">
          {(syllabus || []).map((mod, idx) => {
            const cfg     = STATUS_CONFIG[mod.moduleStatus] || STATUS_CONFIG.locked;
            const Icon    = cfg.icon;
            const isStarting = startingModuleId === mod.moduleId;

            return (
              <div
                key={mod.moduleId}
                className={`bg-white rounded-2xl border border-light-200 shadow-sm overflow-hidden transition-all duration-200
                  ${mod.moduleStatus === 'locked' ? 'opacity-70' : 'hover:shadow-md hover:border-indigo-100'}`}
              >
                {/* Module header row */}
                <div className="p-5 flex items-start gap-4">
                  {/* Order badge */}
                  <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center text-lg font-extrabold
                    ${mod.moduleStatus === 'locked' ? 'bg-light-100 text-light-400' : 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow'}`}>
                    {idx + 1}
                  </div>

                  {/* Module info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-light-400 uppercase tracking-wider">Module {idx + 1}</span>
                      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.labelClass}`}>
                        <Icon className={`h-3 w-3 ${cfg.iconClass}`} />
                        {cfg.label}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-light-900 mb-1">{mod.name}</h3>
                    <p className="text-sm text-light-500 leading-relaxed line-clamp-2">{mod.description}</p>
                  </div>

                  {/* Lesson count + button */}
                  <div className="shrink-0 flex flex-col items-end gap-2 ml-2">
                    <span className="text-xs font-semibold text-light-500">
                      {mod.completedLessonsInModule}/{mod.lessonCount} done
                    </span>
                    <button
                      onClick={() => handleModuleAction(mod)}
                      disabled={cfg.disabled || isStarting}
                      className={`
                        inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200
                        ${cfg.buttonClass}
                        ${cfg.disabled ? '' : 'active:scale-[0.97]'}
                      `}
                    >
                      {isStarting ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting…</>
                      ) : (
                        <>{cfg.buttonLabel} {!cfg.disabled && <ChevronRight className="h-3.5 w-3.5" />}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Lesson title list — collapsible mini-syllabus */}
                {mod.moduleStatus !== 'locked' && mod.lessonTitles?.length > 0 && (
                  <div className="border-t border-light-100 px-5 py-3 bg-light-50/60">
                    <p className="text-[10px] font-bold text-light-400 uppercase tracking-wider mb-2">Lessons</p>
                    <ol className="space-y-1">
                      {mod.lessonTitles.map((title, li) => (
                        <li key={li} className="flex items-center gap-2 text-xs text-light-600 font-medium">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-white border border-light-200 flex items-center justify-center text-[10px] font-bold text-light-500">
                            {li + 1}
                          </span>
                          {title}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
