import { useState, useEffect } from 'react';
import { AppProvider, useApp } from '@/context/AppContext';
import { RouterProvider, useRouter } from '@/context/RouterContext';
import { ToastProvider } from '@/components/Toast';
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

type AppView = 'landing' | 'auth' | 'onboarding' | 'app' | 'reset';

function AppContent() {
  const { state } = useApp();
  const { page, navigate } = useRouter();
  const [view, setView] = useState<AppView>(() => {
    try {
      const lastUser = localStorage.getItem('healthpilot_last_user_id');
      if (lastUser) {
        const raw = localStorage.getItem(`healthpilot_user_${lastUser}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.isAuthenticated) return 'app';
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
    }
  }, [state.isAuthenticated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'true') {
      setView('reset');
    }
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
