import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Brain, Database, Trash2, Download, LogOut, AlertTriangle, Sparkles, Globe, FileHeart, Code2, RefreshCw } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { downloadJSON, formatDate } from '@/utils/helpers';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/i18n/translations';
import { generateFhirBundle, downloadFhirBundle } from '@/services/fhirService';

export function SettingsPage() {
  const { state, dispatch, isDemo, syncCloud, hydrateUser, currentUserId } = useApp();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const { uiLang, summaryLang, ocrLang, setUiLang, setSummaryLang, setOcrLang, T } = useLanguage();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const loadPrefs = <T,>(key: string, fallback: T): T => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) as T : fallback;
    } catch { return fallback; }
  };

  const [notifications, setNotifications] = useState(() =>
    loadPrefs('hp-notifications', { medicationReminders: true, appointmentReminders: true, goalUpdates: true, insightsAlerts: true, weeklySummary: false })
  );
  const [aiPrefs, setAiPrefs] = useState(() =>
    loadPrefs('hp-aiPrefs', { detailedExplanations: true, suggestedQuestions: true, generalInfo: true })
  );
  const [privacy, setPrivacy] = useState(() =>
    loadPrefs('hp-privacy', { showDataSources: true, labelDemoData: true })
  );

  useEffect(() => { localStorage.setItem('hp-notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('hp-aiPrefs', JSON.stringify(aiPrefs)); }, [aiPrefs]);
  useEffect(() => { localStorage.setItem('hp-privacy', JSON.stringify(privacy)); }, [privacy]);

  const handleExport = () => {
    const data = {
      profile: state.profile,
      measurements: state.measurements,
      records: state.records,
      reports: state.reports,
      medications: state.medications,
      reminders: state.reminders,
      goals: state.goals,
      timeline: state.timeline,
      insights: state.insights,
      conversations: state.conversations,
      exportedAt: new Date().toISOString(),
    };
    downloadJSON(data, `healthpilot-export-${new Date().toISOString().split('T')[0]}.json`);
    showToast('Health data exported successfully.', 'success');
  };

  const handleDeleteRecords = () => {
    setDeleteOpen(false);
    dispatch({ type: 'RESET' });
    if (state.profile) {
      dispatch({ type: 'LOGIN', mode: state.mode });
      dispatch({ type: 'SET_ONBOARDED', profile: state.profile });
    }
    showToast('All health records have been deleted.', 'success');
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem('healthpilot_last_user_id');
    } catch {
      // ignore
    }
    dispatch({ type: 'LOGOUT' });
    showToast('You have been signed out.', 'info');
    if (supabase) {
      supabase.auth.signOut().catch((err) => {
        console.warn('[SettingsPage] SignOut background:', err);
      });
    }
  };

  const handleDeleteAccount = () => {
    setDeleteAccountOpen(false);
    try {
      localStorage.removeItem('healthpilot_last_user_id');
    } catch {
      // ignore
    }
    dispatch({ type: 'LOGOUT' });
    showToast('Account deleted. All data has been cleared.', 'success');
    if (supabase) {
      supabase.auth.signOut().catch((err) => {
        console.warn('[SettingsPage] SignOut background:', err);
      });
    }
  };

  const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: () => void; label: string; description: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-navy-700">{label}</p>
        <p className="text-xs text-navy-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`relative w-11 h-6 rounded-full transition-all ${checked ? 'bg-teal-600' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${checked ? 'left-5' : 'left-0.5'}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage your account, preferences, and data" icon={<SettingsIcon className="w-5 h-5" />} />

      {isDemo && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <p className="text-sm text-amber-700">You are in Demo Mode. Settings changes are not persisted after sign out.</p>
        </div>
      )}

      {/* Profile Settings */}
      <Card>
        <CardHeader
          title="Profile Settings"
          icon={<User className="w-5 h-5" />}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('profile')} className="cursor-pointer">
              Edit in Profile
            </Button>
          }
        />
        <CardBody>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 mb-4">
            <button
              onClick={() => navigate('profile')}
              className="cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
              title="Change Profile Picture"
            >
              <UserAvatar
                name={state.profile?.fullName ?? 'User'}
                avatarUrl={state.profile?.avatarUrl}
                size="md"
                showStatus={true}
              />
            </button>
            <div className="space-y-0.5">
              <h3 className="font-heading font-bold text-navy-950 text-base">
                {state.profile?.fullName ?? 'Not set'}
              </h3>
              <p className="text-xs text-navy-500">{state.profile?.email ?? 'Not set'}</p>
              <p className="text-[11px] text-teal-700 font-medium pt-0.5">
                Click picture or button to change photo and manage biometric details
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><p className="text-xs text-navy-400 mb-1">Name</p><p className="text-sm font-medium text-navy-700">{state.profile?.fullName ?? 'Not set'}</p></div>
            <div><p className="text-xs text-navy-400 mb-1">Email</p><p className="text-sm font-medium text-navy-700">{state.profile?.email ?? 'Not set'}</p></div>
            <div><p className="text-xs text-navy-400 mb-1">Profile created</p><p className="text-sm font-medium text-navy-700">{state.profile ? formatDate(state.profile.createdAt) : '—'}</p></div>
            <div><p className="text-xs text-navy-400 mb-1">Last updated</p><p className="text-sm font-medium text-navy-700">{state.profile ? formatDate(state.profile.updatedAt) : '—'}</p></div>
          </div>
        </CardBody>
      </Card>

      {/* Language Settings */}
      <Card>
        <CardHeader title={T('settings.language')} subtitle={T('settings.languageSub')} icon={<Globe className="w-5 h-5" />} />
        <CardBody className="space-y-6">

          {/* Interface language */}
          <div>
            <p className="text-sm font-semibold text-navy-700 mb-1">{T('settings.chooseLanguage')}</p>
            <p className="text-xs text-navy-400 mb-3">Changes labels, buttons and menus across the whole app</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setUiLang(lang.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    uiLang === lang.code
                      ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                      : 'border-slate-200 bg-white text-navy-600 hover:border-teal-300 hover:bg-teal-50/50'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{lang.nativeName}</p>
                    <p className="text-[10px] text-navy-400 truncate">{lang.name}</p>
                  </div>
                  {uiLang === lang.code && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* AI Summary language */}
          <div>
            <p className="text-sm font-semibold text-navy-700 mb-1">{T('settings.aiSummaryLang')}</p>
            <p className="text-xs text-navy-400 mb-3">{T('settings.aiSummaryLangDesc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSummaryLang(lang.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    summaryLang === lang.code
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'
                      : 'border-slate-200 bg-white text-navy-600 hover:border-purple-300 hover:bg-purple-50/50'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{lang.nativeName}</p>
                    <p className="text-[10px] text-navy-400 truncate">{lang.name}</p>
                  </div>
                  {summaryLang === lang.code && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* OCR language */}
          <div>
            <p className="text-sm font-semibold text-navy-700 mb-1">{T('settings.ocrLanguage')}</p>
            <p className="text-xs text-navy-400 mb-3">{T('settings.ocrLanguageDesc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setOcrLang(lang.code)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    ocrLang === lang.code
                      ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm'
                      : 'border-slate-200 bg-white text-navy-600 hover:border-amber-300 hover:bg-amber-50/50'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold truncate">{lang.nativeName}</p>
                    <p className="text-[10px] text-navy-400 truncate">{lang.name}</p>
                  </div>
                  {ocrLang === lang.code && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 p-3 bg-amber-50 rounded-xl flex items-start gap-2 border border-amber-100">
              <span className="text-lg">💡</span>
              <p className="text-xs text-amber-700">For bilingual or handwritten prescriptions (e.g. English + Hindi), select the regional language. The OCR engine will recognise both scripts simultaneously.</p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader title="Notification Settings" icon={<Bell className="w-5 h-5" />} />
        <CardBody>
          <Toggle checked={notifications.medicationReminders} onChange={() => setNotifications({ ...notifications, medicationReminders: !notifications.medicationReminders })} label="Medication Reminders" description="Get notified when medications are due" />
          <Toggle checked={notifications.appointmentReminders} onChange={() => setNotifications({ ...notifications, appointmentReminders: !notifications.appointmentReminders })} label="Appointment Reminders" description="Reminders for upcoming appointments" />
          <Toggle checked={notifications.goalUpdates} onChange={() => setNotifications({ ...notifications, goalUpdates: !notifications.goalUpdates })} label="Goal Updates" description="Notifications about goal progress" />
          <Toggle checked={notifications.insightsAlerts} onChange={() => setNotifications({ ...notifications, insightsAlerts: !notifications.insightsAlerts })} label="Insights Alerts" description="Alerts when new insights are generated" />
          <Toggle checked={notifications.weeklySummary} onChange={() => setNotifications({ ...notifications, weeklySummary: !notifications.weeklySummary })} label="Weekly Summary" description="Receive a weekly health summary" />
        </CardBody>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader title="Privacy Settings" icon={<Shield className="w-5 h-5" />} />
        <CardBody>
          <Toggle checked={privacy.showDataSources} onChange={() => setPrivacy({ ...privacy, showDataSources: !privacy.showDataSources })} label="Show Data Sources" description="Display the source of data for each AI insight" />
          <Toggle checked={privacy.labelDemoData} onChange={() => setPrivacy({ ...privacy, labelDemoData: !privacy.labelDemoData })} label="Label Demo Data" description="Clearly mark demo/sample data throughout the app" />
        </CardBody>
      </Card>

      {/* AI Preferences */}
      <Card>
        <CardHeader title="AI Preferences" icon={<Brain className="w-5 h-5" />} />
        <CardBody>
          <Toggle checked={aiPrefs.detailedExplanations} onChange={() => setAiPrefs({ ...aiPrefs, detailedExplanations: !aiPrefs.detailedExplanations })} label="Detailed Explanations" description="Show detailed explanations for medical terms" />
          <Toggle checked={aiPrefs.suggestedQuestions} onChange={() => setAiPrefs({ ...aiPrefs, suggestedQuestions: !aiPrefs.suggestedQuestions })} label="Suggested Questions" description="Generate questions to discuss with your doctor" />
          <Toggle checked={aiPrefs.generalInfo} onChange={() => setAiPrefs({ ...aiPrefs, generalInfo: !aiPrefs.generalInfo })} label="General Information" description="Include general educational context in AI responses" />
          <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-start gap-2">
            <Brain className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">AI mode: {isDemo ? 'Demo AI Mode (mock responses based on demo data)' : 'Standard AI Mode (responses based on your actual data)'}. AI provider can be configured via environment variables.</p>
          </div>
        </CardBody>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader title="Data Management" icon={<Database className="w-5 h-5" />} />
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-teal-50/70 border border-teal-100/90 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-navy-800">Cloud Sync & Multi-Device Backup</p>
              <p className="text-xs text-navy-500 mt-0.5">
                {state.mode === 'real'
                  ? 'Your medical records, vitals, and profile are backed up to the cloud for access across all your devices.'
                  : 'Cloud synchronization is active for registered accounts.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={syncing || state.mode === 'demo'}
              leftIcon={<RefreshCw className={`w-4 h-4 text-teal-600 ${syncing ? 'animate-spin' : ''}`} />}
              onClick={async () => {
                setSyncing(true);
                try {
                  if (currentUserId) {
                    await syncCloud();
                    await hydrateUser(currentUserId);
                    showToast('Cloud sync complete! Your data is up to date across all devices.', 'success');
                  } else {
                    showToast('Please sign in to sync with the cloud.', 'info');
                  }
                } catch {
                  showToast('Cloud sync failed. Please check your internet connection.', 'error');
                } finally {
                  setSyncing(false);
                }
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-navy-700">ABDM & ABHA Digital Identity</p>
              <p className="text-xs text-navy-400 mt-0.5">
                {state.abhaConnection?.isConnected
                  ? `Connected: ${state.abhaConnection.abhaId} (${state.abhaConnection.abhaAddress})`
                  : 'Manage simulated ABHA digital health accounts and records'}
              </p>
            </div>
            <Button size="sm" variant="outline" leftIcon={<FileHeart className="w-4 h-4 text-teal-600" />} onClick={() => navigate('abha')}>
              {state.abhaConnection?.isConnected ? 'Manage ABHA' : 'Connect'}
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-navy-700">Export FHIR R4 JSON</p>
              <p className="text-xs text-navy-400 mt-0.5">Download standardized HL7 FHIR Bundle (ABDM format)</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Code2 className="w-4 h-4 text-teal-600" />}
              onClick={() => {
                const { bundle } = generateFhirBundle(state);
                downloadFhirBundle(bundle);
                showToast('FHIR R4 Bundle downloaded successfully.', 'success');
              }}
            >
              Export FHIR
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-navy-700">Export Health Data</p>
              <p className="text-xs text-navy-400 mt-0.5">Download all your health data as raw JSON</p>
            </div>
            <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={handleExport}>Export</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-700">Delete All Health Records</p>
              <p className="text-xs text-red-500 mt-0.5">Remove all records, reports, and measurements</p>
            </div>
            <Button size="sm" variant="danger" leftIcon={<Trash2 className="w-4 h-4" />} onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        </CardBody>
      </Card>

      {/* Account Settings */}
      <Card>
        <CardHeader title="Account Settings" icon={<User className="w-5 h-5" />} />
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-navy-700">Sign Out</p>
              <p className="text-xs text-navy-400 mt-0.5">Sign out of your account</p>
            </div>
            <Button size="sm" variant="outline" leftIcon={<LogOut className="w-4 h-4" />} onClick={handleSignOut}>Sign Out</Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-red-700">Delete Account</p>
              <p className="text-xs text-red-500 mt-0.5">Permanently delete your account and all data</p>
            </div>
            <Button size="sm" variant="danger" leftIcon={<AlertTriangle className="w-4 h-4" />} onClick={() => setDeleteAccountOpen(true)}>Delete Account</Button>
          </div>
        </CardBody>
      </Card>

      {/* Delete Records Modal */}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete All Health Records?"
        footer={<><Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDeleteRecords}>Delete All Records</Button></>}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This will permanently delete all your health records, reports, measurements, medications, reminders, and goals. This action cannot be undone.</p>
          </div>
          <p className="text-sm text-navy-500">Your profile information will be preserved. Consider exporting your data first.</p>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} title="Delete Account?"
        footer={<><Button variant="ghost" onClick={() => setDeleteAccountOpen(false)}>Cancel</Button><Button variant="danger" onClick={handleDeleteAccount}>Delete Account</Button></>}>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">This will permanently delete your account and all associated data. This action cannot be undone.</p>
          </div>
          <p className="text-sm text-navy-500">Consider exporting your data before deletion.</p>
        </div>
      </Modal>
    </div>
  );
}
