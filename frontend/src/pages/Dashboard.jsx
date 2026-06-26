import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Lock, PlayCircle, ChevronDown, ChevronUp, LogOut } from 'lucide-react';
import { fetchCourseStart, fetchCourseSuccess, fetchCourseFailure } from '../store/courseSlice';
import { logout } from '../store/authSlice';
import { apiRequest } from '../utils/api';

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { courseInfo, lessons, loading, error } = useSelector((state) => state.course);

  // Accordion state: keep track of which module is expanded (e.g. "1", "2")
  const [expandedModules, setExpandedModules] = useState({});

  useEffect(() => {
    const fetchCourse = async () => {
      dispatch(fetchCourseStart());
      try {
        const data = await apiRequest('/courses');
        // The API returns the whole structure including modules and a flat list of parsed lessons
        dispatch(fetchCourseSuccess(data));
        
        // Auto-expand the first module by default if available
        if (data.modules && data.modules.length > 0) {
          setExpandedModules({ [data.modules[0].id]: true });
        }
      } catch (err) {
        dispatch(fetchCourseFailure(err.message || 'Failed to load course'));
      }
    };

    fetchCourse();
  }, [dispatch]);

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleId]: !prev[moduleId]
    }));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const handleLessonClick = (lesson) => {
    if (lesson.isUnlocked || lesson.isCompleted) {
      navigate(`/lesson/${lesson.id}`);
    }
  };

  if (loading && !courseInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-50">
        <div className="w-12 h-12 border-4 border-accent-indigo/20 border-t-accent-indigo rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-50 text-light-700 p-6">
        <p className="text-accent-rose mb-4 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-white rounded-lg shadow border border-light-200">
          Try Again
        </button>
      </div>
    );
  }

  if (!courseInfo) return null;

  // Calculate overall progress
  const totalLessons = lessons.length;
  const completedCount = user?.completedLessons?.length || 0;
  const progressPercentage = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-light-50 font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b border-light-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-light-900 tracking-tight leading-tight">Interview Mastery</h1>
              <p className="text-xs text-light-500 font-medium">Frontend Edition</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-semibold text-light-900">Hello, {user?.name}</span>
              <span className="text-xs text-accent-indigo font-medium">{progressPercentage}% Completed</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-light-500 hover:text-accent-rose hover:bg-light-100 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        
        {/* Course Hero & Progress */}
        <div className="bg-white rounded-2xl border border-light-200 p-8 mb-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-indigo/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-light-900 mb-2">{courseInfo.title}</h2>
            <p className="text-light-500 max-w-2xl mb-8 leading-relaxed">
              {courseInfo.description}
            </p>
            
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-semibold text-light-700">Course Progress</span>
                <span className="text-sm font-bold text-accent-indigo">{completedCount} / {totalLessons} Lessons</span>
              </div>
              <div className="h-3 w-full bg-light-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-primary transition-all duration-1000 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Accordion */}
        <div className="space-y-6">
          {courseInfo.modules.map((module, index) => {
            const isExpanded = expandedModules[module.id];
            const moduleLessons = lessons.filter(l => l.moduleId === module.id);
            const moduleCompleted = moduleLessons.filter(l => l.isCompleted).length;
            
            return (
              <div key={module.id} className="bg-white rounded-2xl border border-light-200 overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
                
                {/* Accordion Header */}
                <button 
                  onClick={() => toggleModule(module.id)}
                  className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-light-50 transition-colors text-left"
                >
                  <div className="flex-1 pr-4">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-xs font-bold text-accent-violet tracking-wider uppercase">Module {index + 1}</span>
                      <span className="text-xs font-semibold text-light-500 bg-light-100 px-2.5 py-0.5 rounded-full">
                        {moduleCompleted}/{moduleLessons.length} done
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-light-900">{module.name}</h3>
                  </div>
                  <div className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-light-100 text-light-500">
                    {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </button>

                {/* Accordion Body */}
                <div 
                  className={`border-t border-light-100 transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-100 max-h-[2000px]' : 'opacity-0 max-h-0 overflow-hidden'}`}
                >
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-light-50/50">
                    {moduleLessons.map((lesson) => {
                      const isLocked = !lesson.isUnlocked && !lesson.isCompleted;
                      const statusColor = lesson.isCompleted 
                        ? 'bg-accent-emerald text-white' 
                        : (lesson.isUnlocked ? 'bg-accent-indigo text-white' : 'bg-light-200 text-light-500');

                      return (
                        <div 
                          key={lesson.id}
                          onClick={() => handleLessonClick(lesson)}
                          className={`
                            relative p-5 rounded-xl border flex flex-col h-full bg-white transition-all duration-200
                            ${isLocked ? 'border-light-200 opacity-75 cursor-not-allowed grayscale-[20%]' : 'border-light-200 hover:border-accent-violet/30 hover:shadow-lg hover:shadow-accent-violet/5 hover:-translate-y-1 cursor-pointer hover-lift'}
                          `}
                        >
                          {/* Locked Overlay for interaction block (visual only) */}
                          {isLocked && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-xl z-10 flex items-center justify-center pointer-events-none">
                              <div className="bg-white/90 p-3 rounded-full shadow-sm">
                                <Lock className="h-5 w-5 text-light-400" />
                              </div>
                            </div>
                          )}

                          <div className="flex items-start justify-between mb-3 relative z-20">
                            <span className="text-xs font-bold text-light-500 tracking-wider">Lesson {lesson.number}</span>
                            <div className={`h-6 w-6 rounded-full flex items-center justify-center shadow-sm ${statusColor}`}>
                              {lesson.isCompleted ? (
                                <CheckCircle className="h-3.5 w-3.5" />
                              ) : (
                                isLocked ? <Lock className="h-3 w-3" /> : <PlayCircle className="h-3.5 w-3.5" />
                              )}
                            </div>
                          </div>
                          
                          <h4 className="text-md font-bold text-light-900 mb-2 relative z-20 leading-tight">
                            {lesson.title}
                          </h4>
                          
                          <p className="text-sm text-light-500 line-clamp-2 mt-auto relative z-20">
                            {lesson.objective}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
