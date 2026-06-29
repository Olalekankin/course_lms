import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import confetti from 'canvas-confetti';
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, AlertCircle, PlayCircle } from 'lucide-react';
import { 
  fetchLessonStart, fetchLessonSuccess, fetchLessonFailure, 
  submitQuizStart, submitQuizSuccess, submitQuizFailure, clearQuizResult 
} from '../store/courseSlice';
import { updateProgress } from '../store/authSlice';
import { apiRequest } from '../utils/api';

export default function LessonViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { activeLesson, quizResult, loading, error } = useSelector((state) => state.course);
  
  // Quiz state
  const [answers, setAnswers] = useState({});
  const [validationError, setValidationError] = useState('');
  const [showQuiz, setShowQuiz] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  useEffect(() => {
    const fetchLessonDetails = async () => {
      dispatch(fetchLessonStart());
      try {
        const data = await apiRequest(`/courses/lessons/${id}`);
        dispatch(fetchLessonSuccess(data));
        
        // Reset answers when loading a new lesson
        setAnswers({});
        setValidationError('');
        setShowQuiz(false);
      } catch (err) {
        dispatch(fetchLessonFailure(err.message || 'Failed to load lesson'));
      }
    };

    fetchLessonDetails();
    
    // Cleanup quiz results when leaving
    return () => {
      dispatch(clearQuizResult());
    };
  }, [id, dispatch]);

  const handleOptionChange = (questionId, value, isMulti) => {
    if (isMulti) {
      setAnswers(prev => {
        const current = prev[questionId] || [];
        if (current.includes(value)) {
          return { ...prev, [questionId]: current.filter(v => v !== value) };
        } else {
          return { ...prev, [questionId]: [...current, value] };
        }
      });
    } else {
      setAnswers(prev => ({ ...prev, [questionId]: value }));
    }
  };

  const handleTextChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleTakeChallenge = async () => {
    if (!questions) {
      try {
        setQuestionsLoading(true);
        const data = await apiRequest(`/courses/lessons/${id}/questions`);
        setQuestions(data.questions);
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setQuestionsLoading(false);
      }
    }
    setShowQuiz(true);
  };

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    // Check if all questions are answered
    if (questions) {
      const unanswered = questions.some(q => {
        // Support both old (id) and new (questionId) field names
        const key = q.questionId || q.id;
        const ans = answers[key];
        if (q.type === 'multi-choice') return !Array.isArray(ans) || ans.length === 0;
        if (q.type === 'single-choice') return ans === undefined || ans === null;
        return typeof ans !== 'string' || ans.trim() === '';
      });
      
      if (unanswered) {
        setValidationError('Please answer all questions before submitting.');
        return;
      }
    }

    dispatch(submitQuizStart());
    try {
      const data = await apiRequest(`/courses/lessons/${id}/submit`, 'POST', { answers });
      dispatch(submitQuizSuccess(data));
      
      // Update global auth user state to reflect new completed lessons and unlock status
      dispatch(updateProgress({
        completedLessons: data.userProgress.completedLessons,
        currentUnlockedLessons: data.userProgress.currentUnlockedLessons
      }));

      if (data.passed) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#7c3aed', '#4f46e5', '#10b981']
        });
      }
    } catch (err) {
      dispatch(submitQuizFailure(err.message || 'Failed to submit quiz'));
    }
  };

  // Show spinner on EVERY load (including lesson-to-lesson nav),
  // so old lesson never flickers through while new one is fetching.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent-indigo/20 border-t-accent-indigo rounded-full animate-spin" />
          <p className="text-sm text-light-400 font-medium animate-pulse">Loading lesson…</p>
        </div>
      </div>
    );
  }

  if (error && !activeLesson) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-light-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-light-200 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-accent-rose mx-auto mb-4" />
          <h2 className="text-xl font-bold text-light-900 mb-2">Access Denied</h2>
          <p className="text-light-500 mb-6">{error}</p>
          <Link to="/" className="px-5 py-2.5 bg-gradient-primary text-white font-semibold rounded-xl inline-flex items-center gap-2 hover:opacity-95 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!activeLesson) return null;

  return (
    <div className="min-h-screen bg-light-50 flex flex-col lg:flex-row overflow-hidden animate-fadeIn">
      
      {/* LEFT COLUMN: Lesson Content (Markdown) */}
      <div
        key={activeLesson.lessonId}
        className={`w-full ${showQuiz ? 'lg:w-3/5 border-r' : 'lg:w-full'} lg:h-screen lg:overflow-y-auto border-light-200 bg-white transition-all duration-300 ease-in-out`}
      >
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-light-200 px-6 py-4 flex items-center justify-between">
          <Link to={activeLesson?.moduleId && activeLesson?.courseId ? `/course/${activeLesson.courseId}/module/${activeLesson.moduleId}` : '/'} className="inline-flex items-center gap-2 text-sm font-semibold text-light-500 hover:text-light-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Module
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent-violet tracking-wider uppercase">Lesson {activeLesson.number}</span>
          </div>
        </div>

        {/* Markdown Content */}
        <div className="p-6 sm:p-10 lg:p-12 max-w-3xl mx-auto prose prose-slate prose-headings:font-bold prose-h1:text-3xl prose-h1:text-light-900 prose-h2:text-2xl prose-a:text-accent-violet hover:prose-a:text-accent-indigo focus:outline-none">
          
          <div className="mb-8">
            <h1 className="mb-4 leading-tight">{activeLesson.title}</h1>
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-light-100 text-light-700">
                {activeLesson.difficulty}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-accent-violet/10 text-accent-violet">
                Freq: {activeLesson.frequency}
              </span>
            </div>
          </div>

          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // ── Tables ────────────────────────────────────────────────
              table({node, ...props}) {
                return (
                  <div className="overflow-x-auto my-6 rounded-xl border border-light-200 shadow-sm">
                    <table {...props} className="min-w-full text-sm" />
                  </div>
                );
              },
              thead({node, ...props}) {
                return <thead {...props} className="bg-indigo-50 text-indigo-900" />;
              },
              tbody({node, ...props}) {
                return <tbody {...props} className="divide-y divide-light-100" />;
              },
              tr({node, ...props}) {
                return <tr {...props} className="even:bg-light-50/60 hover:bg-indigo-50/40 transition-colors" />;
              },
              th({node, ...props}) {
                return <th {...props} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-indigo-700 whitespace-nowrap" />;
              },
              td({node, ...props}) {
                return <td {...props} className="px-4 py-3 text-light-700 font-medium align-top" />;
              },
              // ── Code blocks ───────────────────────────────────────────
              hr({node, ...props}) {
                return <hr {...props} className="my-1.5 border-light-200" />;
              },
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <div className="rounded-xl overflow-hidden shadow-sm my-6 border border-light-200">
                    <SyntaxHighlighter
                      {...props}
                      children={String(children).replace(/\n$/, '')}
                      style={oneLight}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '1.5rem', background: '#f8fafc', fontSize: '0.9rem' }}
                    />
                  </div>
                ) : (
                  <code {...props} className={`${className} bg-light-100 text-accent-violet px-1.5 py-0.5 rounded-md text-sm font-mono`}>
                    {children}
                  </code>
                )
              }
            }}
          >
            {activeLesson.content}
          </ReactMarkdown>
          
          {!showQuiz && (
            <div className="mt-12 text-center">
              <button
                onClick={handleTakeChallenge}
                disabled={questionsLoading}
                className="px-8 py-4 bg-gradient-primary text-white font-bold rounded-xl shadow-lg shadow-accent-violet/20 hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto"
              >
                {questionsLoading ? 'Loading Challenge...' : (
                  <>
                    <PlayCircle className="h-5 w-5" />
                    Take Interview Challenge
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QUIZ PANEL — bottom-sheet on mobile/tablet, side column on desktop */}
      {showQuiz && (
      <>
        {/* Backdrop — mobile/tablet only */}
        <div className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm quiz-backdrop" />

        <div className="
          quiz-sheet
          fixed bottom-0 left-0 right-0 z-50 h-[92dvh] rounded-t-3xl overflow-y-auto
          lg:static lg:z-auto lg:h-screen lg:rounded-none lg:overflow-y-auto
          lg:w-2/5
          bg-white lg:bg-light-50
          border-t border-light-200
          shadow-[0_-8px_40px_rgba(0,0,0,0.18)] lg:shadow-none
        ">
          {/* Drag handle — mobile only */}
          <div className="lg:hidden sticky top-0 bg-white z-10 flex justify-center pt-3 pb-2">
            <div className="w-10 h-1.5 rounded-full bg-light-200" />
          </div>

        <div className="p-6 sm:p-10 lg:p-12">
          
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-light-200 shadow-sm mb-4">
              <PlayCircle className="h-4 w-4 text-accent-indigo" />
              <span className="text-xs font-bold text-light-900 tracking-wide">INTERVIEW CHALLENGE</span>
            </div>
            <h2 className="text-2xl font-bold text-light-900 mb-2">Test your knowledge</h2>
            <p className="text-light-500 text-sm">Pass this challenge to unlock the next lesson.</p>
          </div>

          <form onSubmit={handleQuizSubmit} className="space-y-8">
            
            {validationError && (
              <div className="bg-accent-rose/5 border border-accent-rose/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-accent-rose shrink-0 mt-0.5" />
                <span className="text-sm text-accent-rose font-medium">{validationError}</span>
              </div>
            )}

            {questions?.map((q, index) => (
              <div key={q.questionId || q.id} className="bg-white rounded-2xl border border-light-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                
                <h3 className="text-base font-semibold text-light-900 mb-4 flex gap-3">
                  <span className="text-accent-indigo">{index + 1}.</span> 
                  <span>{q.questionText}</span>
                </h3>
                
                {q.codeBlock && (
                  <div className="rounded-xl overflow-hidden shadow-sm mb-6 border border-light-200">
                    <SyntaxHighlighter
                      language="javascript"
                      style={oneLight}
                      PreTag="div"
                      customStyle={{ margin: 0, padding: '1.25rem', background: '#f8fafc', fontSize: '0.9rem' }}
                    >
                      {q.codeBlock}
                    </SyntaxHighlighter>
                  </div>
                )}

                <div className="space-y-3">
                  {q.type === 'single-choice' && q.options?.map((opt, i) => {
                    const qKey = q.questionId || q.id;
                    return (
                    <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-light-200 hover:bg-light-50 cursor-pointer transition-colors group">
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <input
                          type="radio"
                          name={qKey}
                          className="peer sr-only"
                          checked={answers[qKey] === i}
                          onChange={() => handleOptionChange(qKey, i, false)}
                          disabled={quizResult?.passed}
                        />
                        <div className="h-5 w-5 rounded-full border-2 border-light-300 peer-checked:border-accent-indigo peer-checked:bg-accent-indigo transition-colors flex items-center justify-center">
                           <div className="h-2 w-2 rounded-full bg-white scale-0 peer-checked:scale-100 transition-transform"></div>
                        </div>
                      </div>
                      <span className="text-sm text-light-700 font-medium group-hover:text-light-900 transition-colors">
                        {opt}
                      </span>
                    </label>
                  )})}

                  {q.type === 'multi-choice' && q.options?.map((opt, i) => {
                    const qKey = q.questionId || q.id;
                    return (
                    <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-light-200 hover:bg-light-50 cursor-pointer transition-colors group">
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={(answers[qKey] || []).includes(i)}
                          onChange={() => handleOptionChange(qKey, i, true)}
                          disabled={quizResult?.passed}
                        />
                        <div className="h-5 w-5 rounded-md border-2 border-light-300 peer-checked:border-accent-indigo peer-checked:bg-accent-indigo transition-colors flex items-center justify-center">
                          <svg className="w-3 h-3 text-white scale-0 peer-checked:scale-100 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <span className="text-sm text-light-700 font-medium group-hover:text-light-900 transition-colors">
                        {opt}
                      </span>
                    </label>
                  )})}

                  {q.type === 'short-answer' && (() => {
                    const qKey = q.questionId || q.id;
                    return (
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-light-200 bg-light-50 text-light-900 text-sm font-medium focus:outline-none focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/20 transition-all"
                      placeholder="Type your answer here..."
                      value={answers[qKey] || ''}
                      onChange={(e) => handleTextChange(qKey, e.target.value)}
                      disabled={quizResult?.passed}
                    />
                  )})()}
                </div>

                {/* Feedback Section for this specific question after submit */}
                {quizResult && quizResult.results && quizResult.results[q.questionId || q.id] && (
                  <div className={`mt-4 p-4 rounded-xl border ${quizResult.results[q.questionId || q.id].correct ? 'bg-accent-emerald/5 border-accent-emerald/20' : 'bg-accent-rose/5 border-accent-rose/20'}`}>
                    <div className="flex items-start gap-2">
                      {quizResult.results[q.questionId || q.id].correct ? (
                        <CheckCircle2 className="h-5 w-5 text-accent-emerald shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-accent-rose shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-bold mb-1 ${quizResult.results[q.questionId || q.id].correct ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                          {quizResult.results[q.questionId || q.id].correct ? 'Correct!' : 'Incorrect'}
                        </p>
                        
                        <div className="text-sm text-light-700 mb-2">
                          <span className="font-semibold block mb-1">Correct Answer:</span>
                          <div className="font-medium bg-white px-3 py-2 rounded-lg border border-light-200 inline-block">
                            {q.type === 'short-answer' 
                              ? quizResult.results[q.questionId || q.id].correctAnswers.join(' / ') 
                              : quizResult.results[q.questionId || q.id].correctAnswers.map(idx => q.options[idx]).join(', ')}
                          </div>
                        </div>

                        <div className="text-sm text-light-700">
                          <span className="font-semibold block mb-1">Explanation:</span>
                          <div className="prose prose-sm prose-slate">
                            <ReactMarkdown>
                              {quizResult.results[q.questionId || q.id].explanation || ''}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Submit / Action Area */}
            {!quizResult ? (
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-white font-bold text-sm bg-gradient-primary hover:opacity-95 shadow-md shadow-accent-violet/20 hover:shadow-lg hover:shadow-accent-violet/25 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Submit Challenge'
                )}
              </button>
            ) : (
              <div className={`bg-white rounded-2xl border p-6 text-center shadow-lg ${quizResult.passed ? 'border-accent-emerald/30 shadow-accent-emerald/5' : 'border-light-200'}`}>
                <div className={`mx-auto h-12 w-12 rounded-full flex items-center justify-center mb-4 ${quizResult.passed ? 'bg-accent-emerald/10' : 'bg-light-100'}`}>
                  {quizResult.passed ? <CheckCircle2 className="h-6 w-6 text-accent-emerald" /> : <AlertCircle className="h-6 w-6 text-accent-rose" />}
                </div>
                
                <h3 className="text-lg font-bold text-light-900 mb-2">
                  {quizResult.passed ? 'Challenge Passed!' : 'Challenge Completed'}
                </h3>
                
                <p className="text-2xl font-black text-accent-indigo mb-2">
                  {Object.values(quizResult.results).filter(r => r.correct).length} / {questions?.length}
                </p>

                <p className={`text-sm mb-6 ${quizResult.passed ? 'text-light-500' : 'text-accent-rose font-medium'}`}>
                  {quizResult.passed ? "You've unlocked the next lesson." : "You didn't pass this time, but you can still review the explanations and move forward."}
                </p>
                
                {quizResult.nextLessonId ? (
                  <Link
                    to={`/lesson/${quizResult.nextLessonId}`}
                    className={`w-full inline-flex py-3.5 px-4 rounded-xl text-white font-semibold text-sm transition-all items-center justify-center gap-2 ${quizResult.passed ? 'bg-accent-emerald hover:bg-emerald-600 shadow-md shadow-accent-emerald/20' : 'bg-accent-indigo hover:bg-indigo-600 shadow-md shadow-accent-indigo/20'}`}
                  >
                    Continue to Next Lesson
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className={`w-full inline-flex py-3.5 px-4 rounded-xl text-white font-semibold text-sm transition-all items-center justify-center gap-2 ${quizResult.passed ? 'bg-accent-emerald hover:bg-emerald-600 shadow-md shadow-accent-emerald/20' : 'bg-accent-indigo hover:bg-indigo-600 shadow-md shadow-accent-indigo/20'}`}
                  >
                    Return to Dashboard
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
            
          </form>

        </div>
      </div>
      </>
      )}
      
    </div>
  );
}
