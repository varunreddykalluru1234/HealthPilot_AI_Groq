import { useState, useEffect } from 'react';
import { Activity, Lock, Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface ResetPasswordPageProps {
  onBack: () => void;
}

export function ResetPasswordPage({ onBack }: ResetPasswordPageProps) {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client) {
      setCheckingSession(false);
      return;
    }

    const hash = window.location.hash;
    const search = window.location.search;
    const hasRecoveryTokens =
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      search.includes('code=') ||
      search.includes('type=recovery') ||
      search.includes('reset=true');

    // 1. Listen for Supabase recovery auth state change
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED'))) {
        setSessionReady(true);
        setCheckingSession(false);
      }
    });

    // 2. Poll/check session with retries to allow async URL token exchange
    let attempts = 0;
    let isCancelled = false;

    const verifySession = async () => {
      try {
        const { data } = await client.auth.getSession();
        if (data?.session) {
          if (!isCancelled) {
            setSessionReady(true);
            setCheckingSession(false);
          }
          return;
        }
      } catch {
        // ignore and retry if tokens are present
      }

      attempts++;
      if (attempts < 6 && hasRecoveryTokens && !isCancelled) {
        setTimeout(verifySession, 500);
      } else if (!isCancelled) {
        // Final check: if user already has an active session
        const { data } = await client.auth.getSession();
        setSessionReady(Boolean(data?.session));
        setCheckingSession(false);
      }
    };

    verifySession();

    return () => {
      isCancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const validate = (): boolean => {
    if (!password) {
      setError('Please enter a new password.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleReset = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');

    if (!validate()) return;

    if (!isSupabaseConfigured || !supabase) {
      setError('Authentication is not configured. A Supabase backend is required to reset your password.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess(true);
      showToast('Password updated successfully. You can now sign in with your new password.', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password. The reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const configError = !isSupabaseConfigured;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-navy-800 text-lg">HealthPilot AI</span>
        </div>

        {success ? (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-800 mb-2">Password updated</h1>
              <p className="text-sm text-navy-400">
                Your password has been changed successfully. You can now sign in with your new password.
              </p>
            </div>
            <Button fullWidth size="lg" onClick={onBack}>
              Back to sign in
            </Button>
          </div>
        ) : checkingSession ? (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <p className="text-sm text-navy-400">Verifying your reset link...</p>
          </div>
        ) : configError ? (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 space-y-6">
            <div className="p-4 bg-amber-50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 mb-1">Authentication not configured</p>
                <p className="text-xs text-amber-700">
                  A Supabase backend with auth enabled is required to reset your password. Please contact the site administrator.
                </p>
              </div>
            </div>
            <Button fullWidth size="lg" onClick={onBack}>
              Back to home
            </Button>
          </div>
        ) : !sessionReady ? (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 space-y-6">
            <div className="p-4 bg-red-50 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-1">Reset link expired or invalid</p>
                <p className="text-xs text-red-700">
                  This password reset link may have expired or already been used. Please request a new reset link.
                </p>
              </div>
            </div>
            <Button fullWidth size="lg" onClick={onBack}>
              Back to home
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-8 space-y-6">
            <div>
              <button onClick={onBack} className="flex items-center gap-2 text-sm text-navy-400 hover:text-navy-600 mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to home
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <KeyRound className="w-5 h-5" />
                </div>
                <h1 className="text-xl font-bold text-navy-800">Set a new password</h1>
              </div>
              <p className="text-sm text-navy-400">
                Enter your new password below. Make sure it's at least 6 characters.
              </p>
            </div>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <Input
                  label="New password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  error={error}
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
              <Input
                label="Confirm new password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                leftIcon={<Lock className="w-4 h-4" />}
              />

              <Button type="submit" fullWidth size="lg" disabled={loading}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Updating password...
                  </span>
                ) : 'Update Password'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
