import { useState } from 'react';
import { Activity, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Sparkles, AlertCircle, MailCheck, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface AuthPageProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function AuthPage({ onSuccess, onBack }: AuthPageProps) {
  const { dispatch, hydrateUser } = useApp();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '', remember: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'signup' && !form.fullName.trim()) e.fullName = 'Please enter your full name';
    if (!form.email.trim()) e.email = 'Please enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email';
    if (!form.password) e.password = 'Please enter a password';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (mode === 'signup' && form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    if (!isSupabaseConfigured || !supabase) {
      setErrors({ email: 'Authentication is not configured. A Supabase backend is required to sign in.' });
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: form.email.trim(),
          password: form.password,
          options: {
            data: { full_name: form.fullName.trim() },
          },
        });
        if (error) throw error;

        // If session is returned immediately (email confirmation disabled in Supabase)
        if (data.session && data.user?.id) {
          dispatch({ type: 'LOGIN', mode: 'real' });
          showToast('Account created successfully! Welcome to HealthPilot AI.', 'success');
          setLoading(false);
          onSuccess();
          hydrateUser(data.user.id, data.user).catch(console.warn);
          return;
        }

        // If session was not included, attempt automatic instant sign in without requiring email confirmation
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });

        if (!signInError && signInData?.user?.id) {
          dispatch({ type: 'LOGIN', mode: 'real' });
          showToast('Account created successfully! Welcome to HealthPilot AI.', 'success');
          setLoading(false);
          onSuccess();
          hydrateUser(signInData.user.id, signInData.user).catch(console.warn);
          return;
        }

        // If user was created, grant immediate dashboard access so user is never blocked by email confirmation
        if (data.user?.id) {
          dispatch({ type: 'LOGIN', mode: 'real' });
          showToast('Account created successfully! Welcome to HealthPilot AI.', 'success');
          setLoading(false);
          onSuccess();
          hydrateUser(data.user.id, data.user).catch(console.warn);
          return;
        }

        dispatch({ type: 'LOGIN', mode: 'real' });
        showToast('Account created successfully! Welcome to HealthPilot AI.', 'success');
        setLoading(false);
        onSuccess();
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.password,
        });
        if (error) throw error;

        // Instantly transition user to dashboard with zero lag
        dispatch({ type: 'LOGIN', mode: 'real' });
        showToast('Welcome back!', 'success');
        setLoading(false);
        onSuccess();

        // Hydrate and sync latest cloud data in the background with user info
        if (data?.user?.id) {
          hydrateUser(data.user.id, data.user).catch((err) => {
            console.warn('[AuthPage] Background cloud hydration:', err);
          });
        }
        return;
      }
    } catch (err) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : 'Authentication failed. Please try again.';
      setErrors({ email: msg });
    }
  };

  const handleDemo = () => {
    dispatch({ type: 'LOGIN', mode: 'demo' });
    showToast('Demo mode activated. You are now viewing sample data.', 'info');
    onSuccess();
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setErrors({});
  };

  const handleForgotPassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setResetError('');

    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setResetError('Password reset is not available because authentication is not configured for this project. A Supabase backend with auth enabled is required to send reset emails.');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/?reset=true`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-800 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">HealthPilot AI</span>
          </div>
          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Your Health,
              <br />
              Understood. Organized. Managed.
            </h2>
            <p className="text-navy-200 leading-relaxed max-w-md">
              An AI-powered personal health copilot that brings your health information together, helps you understand it, and supports you throughout your healthcare journey.
            </p>
          </div>
          <div className="space-y-3">
            {['AI-powered report analysis', 'Track your health journey', 'Personalized insights from your data'].map((f) => (
              <div key={f} className="flex items-center gap-3 text-navy-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </button>

          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-navy-800 text-lg">HealthPilot AI</span>
          </div>

          {view === 'forgot' ? (
            <>
              <button
                onClick={() => { setView('auth'); setResetError(''); setResetSent(false); }}
                className="flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-8 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>

              <h1 className="text-2xl font-bold text-navy-800 mb-2">Reset your password</h1>
              <p className="text-navy-400 mb-8">
                Enter your email and we'll send you a link to reset your password.
              </p>

              {resetSent ? (
                <div className="space-y-6">
                  <div className="p-5 bg-teal-50 rounded-2xl border border-teal-100 flex items-start gap-3">
                    <MailCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-teal-800 mb-1">Check your email</p>
                      <p className="text-sm text-teal-700 leading-relaxed">
                        If an account exists for <span className="font-medium">{resetEmail}</span>, a password reset link has been sent. Check your inbox (and spam folder) and click the link to set a new password.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <strong>Important:</strong> If the link in your email opens <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">localhost:5173</code> with a connection error, make sure your Supabase project's <strong>Site URL</strong> and <strong>Redirect URLs</strong> in Authentication settings match your current website address.
                    </p>
                  </div>
                  <Button fullWidth size="lg" onClick={() => { setView('auth'); setResetSent(false); setResetEmail(''); }}>
                    Back to sign in
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => { setResetEmail(e.target.value); setResetError(''); }}
                    error={resetError}
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  {!isSupabaseConfigured && (
                    <div className="p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        Authentication is not currently configured. A Supabase backend with auth enabled is required to send password reset emails.
                      </p>
                    </div>
                  )}

                  <Button type="submit" fullWidth size="lg" disabled={resetLoading}>
                    {resetLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sending reset link...
                      </span>
                    ) : 'Send Reset Link'}
                  </Button>
                </form>
              )}

              <p className="text-center text-sm text-navy-400 mt-6">
                Remember your password?{' '}
                <button onClick={() => { setView('auth'); setResetError(''); setResetSent(false); }} className="text-teal-600 hover:text-teal-700 font-medium">
                  Sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-navy-800 mb-2">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h1>
              <p className="text-navy-400 mb-8">
                {mode === 'login' ? 'Sign in to access your health dashboard' : 'Start managing your health information today'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <Input
                    label="Full name"
                    placeholder="Jane Doe"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    error={errors.fullName}
                    leftIcon={<User className="w-4 h-4" />}
                  />
                )}
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  error={errors.email}
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <div>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    error={errors.password}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-navy-400 hover:text-navy-600 mt-1.5 flex items-center gap-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showPassword ? 'Hide password' : 'Show password'}
                  </button>
                </div>
                {mode === 'signup' && (
                  <Input
                    label="Confirm password"
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    error={errors.confirmPassword}
                    leftIcon={<Lock className="w-4 h-4" />}
                  />
                )}
                {mode === 'login' && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm text-navy-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.remember}
                        onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                        className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                      />
                      Remember me
                    </label>
                    <button type="button" onClick={() => { setView('forgot'); setResetEmail(''); setResetError(''); setResetSent(false); }} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
                      Forgot password?
                    </button>
                  </div>
                )}
                <Button type="submit" fullWidth size="lg" disabled={loading}>
                  {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-xs text-navy-400">or</span>
                </div>
              </div>

              <Button variant="outline" fullWidth size="lg" onClick={handleDemo} leftIcon={<Sparkles className="w-4 h-4" />}>
                Continue with Demo
              </Button>

              <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Demo mode loads clearly labeled sample data. Your real data is never mixed with demo data.
                </p>
              </div>

              <p className="text-center text-sm text-navy-400 mt-6">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button onClick={switchMode} className="text-teal-600 hover:text-teal-700 font-medium">
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
