import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, BookOpen, AlertCircle } from 'lucide-react';
import { authStart, authSuccess, authFailure, clearError } from '../store/authSlice';
import { apiRequest } from '../utils/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  useEffect(() => {
    // Clear any previous auth errors when page loads
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    if (!email || !password) {
      setValidationError('Please fill in all fields.');
      return;
    }

    dispatch(authStart());
    try {
      const data = await apiRequest('/auth/login', 'POST', { email, password });
      dispatch(authSuccess(data));
      navigate('/');
    } catch (err) {
      dispatch(authFailure(err.message || 'Invalid credentials'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-light-50 px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative gradient blur blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[30rem] h-[30rem] rounded-full bg-accent-violet/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[35rem] h-[35rem] rounded-full bg-accent-indigo/5 blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Branding header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-lg shadow-accent-violet/25 transform hover:scale-105 transition-transform duration-300">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-light-900">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-light-500">
            Level up your frontend interview preparation
          </p>
        </div>

        {/* Auth card */}
        <div className="bg-white rounded-2xl border border-light-200 shadow-xl p-8 hover-lift">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error notifications */}
            {(validationError || error) && (
              <div className="bg-accent-rose/5 border border-accent-rose/20 rounded-xl p-4 flex items-start gap-3 animate-pulse">
                <AlertCircle className="h-5 w-5 text-accent-rose shrink-0 mt-0.5" />
                <span className="text-sm text-accent-rose font-medium">
                  {validationError || error}
                </span>
              </div>
            )}

            <div className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-light-500 mb-2">
                  Email Address
                </label>
                <div className="relative rounded-xl border border-light-200 bg-light-50 border-glow-focus transition-all duration-200">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-light-500" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3 bg-transparent text-light-900 placeholder-light-500 focus:outline-none text-sm font-medium rounded-xl"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-light-500 mb-2">
                  Password
                </label>
                <div className="relative rounded-xl border border-light-200 bg-light-50 border-glow-focus transition-all duration-200">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-light-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-11 pr-11 py-3 bg-transparent text-light-900 placeholder-light-500 focus:outline-none text-sm font-medium rounded-xl"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-light-500 hover:text-light-900 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white font-semibold text-sm bg-gradient-primary hover:opacity-95 shadow-md shadow-accent-violet/20 hover:shadow-lg hover:shadow-accent-violet/25 transform active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Card footer */}
          <div className="mt-8 pt-6 border-t border-light-200 text-center">
            <p className="text-sm text-light-500">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-semibold text-accent-violet hover:text-accent-indigo transition-colors"
              >
                Sign up free
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
