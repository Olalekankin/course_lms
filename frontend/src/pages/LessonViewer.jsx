import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import confetti from 'canvas-confetti';
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, PlayCircle } from 'lucide-react';
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

  useEffect(() => {
    const fetchLessonDetails = async () => {
      dispatch(fetchLessonStart());
      try {
        const data = await apiRequest(`/courses/lessons/${id}`);
        dispatch(fetchLessonSuccess(data.lesson));
        
        // Reset answers when loading a new lesson
        setAnswers({});
        setValidationError('');
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

  const handleQuizSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');
    
    // Check if all questions are answered
    if (activeLesson && activeLesson.questions) {
      const unanswered = activeLesson.questions.some(q => {
        const ans = answers[q.id];
        if (q.type === 'multi-choice') return !ans || ans.length === 0;
        return !ans || String(ans).trim() === '';
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
        currentUnlockedLesson: data.userProgress.currentUnlockedLesson
      }));

      if (data.passed) {
        // Trigger micro-animation for success
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

  if (loading && !activeLesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-50">
        <div className="w-12 h-12 border-4 border-accent-indigo/20 border-t-accent-indigo rounded-full animate-spin"></div>
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
    <div className="min-h-screen bg-light-50 flex flex-col lg:flex-row overflow-hidden">
      
      {/* LEFT COLUMN: Lesson Content (Markdown) */}
      <div className="w-full lg:w-3/5 lg:h-screen lg:overflow-y-auto border-r border-light-200 bg-white">
        
        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-light-200 px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-light-500 hover:text-light-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
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
            components={{
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

        </div>
      </div>

      {/* RIGHT COLUMN: Interview Challenge Quiz */}
      <div className="w-full lg:w-2/5 lg:h-screen lg:overflow-y-auto bg-light-50">
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

            {activeLesson.questions?.map((q, index) => (
              <div key={q.id} className="bg-white rounded-2xl border border-light-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                
                <h3 className="text-base font-semibold text-light-900 mb-4 flex gap-3">
                  <span className="text-accent-indigo">{index + 1}.</span> 
                  {/* Render inline code snippets inside question text if needed, handled simply here as text for v1, or could use another Markdown renderer */}
                  <span>{q.questionText}</span>
                </h3>

                <div className="space-y-3">
                  {q.type === 'single-choice' && q.options?.map((opt, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-light-200 hover:bg-light-50 cursor-pointer transition-colors group">
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <input
                          type="radio"
                          name={q.id}
                          className="peer sr-only"
                          checked={answers[q.id] === i}
                          onChange={() => handleOptionChange(q.id, i, false)}
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
                  ))}

                  {q.type === 'multi-choice' && q.options?.map((opt, i) => (
                    <label key={i} className="flex items-start gap-3 p-3 rounded-xl border border-light-200 hover:bg-light-50 cursor-pointer transition-colors group">
                      <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={(answers[q.id] || []).includes(i)}
                          onChange={() => handleOptionChange(q.id, i, true)}
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
                  ))}

                  {q.type === 'short-answer' && (
                    <input
                      type="text"
                      className="w-full px-4 py-3 rounded-xl border border-light-200 bg-light-50 text-light-900 text-sm font-medium focus:outline-none focus:border-accent-indigo focus:ring-2 focus:ring-accent-indigo/20 transition-all"
                      placeholder="Type your answer here..."
                      value={answers[q.id] || ''}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      disabled={quizResult?.passed}
                    />
                  )}
                </div>

                {/* Feedback Section for this specific question after submit */}
                {quizResult && quizResult.results && (
                  <div className={`mt-4 p-4 rounded-xl border ${quizResult.results[q.id].isCorrect ? 'bg-accent-emerald/5 border-accent-emerald/20' : 'bg-accent-rose/5 border-accent-rose/20'}`}>
                    <div className="flex items-start gap-2">
                      {quizResult.results[q.id].isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-accent-emerald shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-accent-rose shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-bold mb-1 ${quizResult.results[q.id].isCorrect ? 'text-accent-emerald' : 'text-accent-rose'}`}>
                          {quizResult.results[q.id].isCorrect ? 'Correct!' : 'Incorrect'}
                        </p>
                        <p className="text-sm text-light-700">
                          <span className="font-semibold block mb-1">Explanation:</span>
                          <ReactMarkdown className="prose prose-sm prose-slate">
                            {quizResult.results[q.id].explanation}
                          </ReactMarkdown>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Submit / Action Area */}
            {!quizResult?.passed ? (
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
              <div className="bg-white rounded-2xl border border-accent-emerald/30 p-6 text-center shadow-lg shadow-accent-emerald/5">
                <div className="mx-auto h-12 w-12 rounded-full bg-accent-emerald/10 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-6 w-6 text-accent-emerald" />
                </div>
                <h3 className="text-lg font-bold text-light-900 mb-2">Challenge Passed!</h3>
                <p className="text-sm text-light-500 mb-6">You've unlocked the next lesson.</p>
                
                {quizResult.nextLessonId ? (
                  <Link
                    to={`/lesson/${quizResult.nextLessonId}`}
                    className="w-full inline-flex py-3.5 px-4 rounded-xl text-white font-semibold text-sm bg-accent-emerald hover:bg-emerald-600 shadow-md shadow-accent-emerald/20 transition-all items-center justify-center gap-2"
                  >
                    Continue to Next Lesson
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    to="/"
                    className="w-full inline-flex py-3.5 px-4 rounded-xl text-white font-semibold text-sm bg-accent-emerald hover:bg-emerald-600 shadow-md shadow-accent-emerald/20 transition-all items-center justify-center gap-2"
                  >
                    Return to Dashboard
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
            
            {quizResult && !quizResult.passed && (
               <div className="text-center text-sm font-medium text-accent-rose">
                 You didn't pass this time. Review the explanations above and try again!
               </div>
            )}
            
          </form>

        </div>
      </div>
      
    </div>
  );
}
