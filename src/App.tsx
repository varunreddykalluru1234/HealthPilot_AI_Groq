import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { AppProvider, useApp } from '@/context/AppContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { ToastProvider, useToast } from '@/components/Toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { CopilotPage } from '@/pages/CopilotPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { RecordsPage } from '@/pages/RecordsPage';
import { AbhaPage } from '@/pages/AbhaPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { ReportAnalysisPage } from '@/pages/ReportAnalysisPage';
import { ReportComparisonPage } from '@/pages/ReportComparisonPage';
import { TimelinePage } from '@/pages/TimelinePage';
import { MedicationsPage } from '@/pages/MedicationsPage';
import { RemindersPage } from '@/pages/RemindersPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { InsightsPage } from '@/pages/InsightsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { AuthPage } from '@/pages/AuthPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { LanguageProvider } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';

type AppView = 'landing' | 'auth' | 'onboarding' | 'app' | 'reset';

function AppContent() {
  const { state, isLoading } = useApp();
  const { page, navigate } = useRouter();
  const { showToast } = useToast();
  const [view, setView] = useState<AppView>(() => {
    try {
      const lastUser = localStorage.getItem('healthpilot_last_user_id');
      if (lastUser) {
        const raw = localStorage.getItem(`healthpilot_user_${lastUser}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.isAuthenticated && parsed?.mode !== 'demo') return 'app';
        }
      }
    } catch {
      // ignore
    }
    return 'landing';
  });

  useEffect(() => {
    if (state.isAuthenticated && view === 'landing') {
      setView('app');
    } else if (!state.isAuthenticated && view === 'app') {
      setView('landing');
    }
  }, [state.isAuthenticated, view]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;

    if (params.get('reset') === 'true' || hash.includes('type=recovery') || hash.includes('recovery')) {
      setView('reset');
      return;
    }

    if (params.get('confirmed') === 'true' || hash.includes('type=signup') || hash.includes('type=email_change')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('reset');
      }
    });
    return () => { subscription.unsubscribe(); };
  }, []);

  if (view === 'reset') {
    return <ResetPasswordPage onBack={() => { setView('landing'); window.history.replaceState({}, '', window.location.pathname); }} />;
  }

  if (view === 'auth') {
    return (
      <AuthPage
        onSuccess={() => {
          setView('app');
          navigate('dashboard');
        }}
        onBack={() => setView('landing')}
      />
    );
  }

  if (view === 'landing') {
    return (
      <LandingPage
        onGetStarted={() => setView('auth')}
        onExploreDemo={() => {
          setView('app');
          navigate('dashboard');
        }}
        onGoToApp={() => setView('app')}
      />
    );
  }

  if (view === 'app' && isLoading && state.isAuthenticated && state.mode !== 'demo' && !state.profile && (!state.records || state.records.length === 0)) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 gap-4 p-4 animate-fade-in">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg shadow-teal-600/20 animate-pulse">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-navy-800">Loading your health data...</p>
          <p className="text-xs text-navy-400 mt-1">HealthPilot AI is syncing your health records</p>
        </div>
        <button
          onClick={() => setView('landing')}
          className="text-xs text-teal-700 hover:text-teal-800 font-medium underline mt-2 cursor-pointer"
        >
          Return to homepage
        </button>
      </div>
    );
  }

  if (state.isAuthenticated && state.isOnboarded) {
    const renderPage = () => {
      switch (page) {
        case 'dashboard': return <DashboardPage />;
        case 'copilot': return <CopilotPage />;
        case 'profile': return <ProfilePage />;
        case 'records': return <RecordsPage />;
        case 'abha': return <AbhaPage />;
        case 'reports': return <ReportsPage />;
        case 'report-analysis': return <ReportAnalysisPage />;
        case 'report-comparison': return <ReportComparisonPage />;
        case 'timeline': return <TimelinePage />;
        case 'medications': return <MedicationsPage />;
        case 'reminders': return <RemindersPage />;
        case 'goals': return <GoalsPage />;
        case 'insights': return <InsightsPage />;
        case 'settings': return <SettingsPage />;
        case 'privacy': return <PrivacyPage />;
        default: return <DashboardPage />;
      }
    };
    return <AppLayout onGoHome={() => setView('landing')}>{renderPage()}</AppLayout>;
  }

  if (state.isAuthenticated && !state.isOnboarded) {
    return <OnboardingPage onComplete={() => navigate('dashboard')} />;
  }

  return (
    <LandingPage
      onGetStarted={() => setView('auth')}
      onExploreDemo={() => {
        setView('app');
        navigate('dashboard');
      }}
      onGoToApp={() => setView('app')}
    />
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <LanguageProvider>
          <RouterProvider>
            <AppContent />
          </RouterProvider>
        </LanguageProvider>
      </AppProvider>
    </ToastProvider>
  );
}
