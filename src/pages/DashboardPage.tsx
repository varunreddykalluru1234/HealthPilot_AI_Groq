import { useMemo, useState } from 'react';
import {
  TrendingDown, TrendingUp, Minus, Calendar, FileText, Pill, Target, MessageSquare,
  Brain, Sparkles, AlertCircle, Activity, Plus, BellRing, FileHeart, ArrowRight,
  ShieldCheck, Heart, Moon, Flame, Scale, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/components/Toast';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { generateHealthSummary } from '@/services/aiService';
import { formatDate, relativeDate, statusColor, uid, nowISO } from '@/utils/helpers';
import type { HealthMeasurement, MeasurementType } from '@/types';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceArea, BarChart, Bar,
} from 'recharts';

const measurementTypes: { value: MeasurementType; label: string; unit: string; needsSecondary?: boolean }[] = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', needsSecondary: true },
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm' },
  { value: 'sleep', label: 'Sleep', unit: 'hours' },
  { value: 'activity', label: 'Activity (steps)', unit: 'steps' },
  { value: 'water', label: 'Water Intake', unit: 'glasses' },
  { value: 'glucose', label: 'Blood Glucose', unit: 'mg/dL' },
  { value: 'temperature', label: 'Temperature', unit: '°C' },
];

export function DashboardPage() {
  const { state, dispatch, isDemo } = useApp();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [measModalOpen, setMeasModalOpen] = useState(false);
  const [measForm, setMeasForm] = useState({ type: 'weight' as MeasurementType, value: '', secondaryValue: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const handleSaveMeasurement = () => {
    const valueNum = parseFloat(measForm.value);
    if (isNaN(valueNum)) {
      showToast('Please enter a valid value.', 'error');
      return;
    }
    const config = measurementTypes.find((t) => t.value === measForm.type)!;
    const measurement: HealthMeasurement = {
      id: uid('meas-'),
      type: measForm.type,
      value: valueNum,
      unit: config.unit,
      secondaryValue: config.needsSecondary && measForm.secondaryValue ? parseFloat(measForm.secondaryValue) : undefined,
      secondaryUnit: config.needsSecondary ? config.unit : undefined,
      date: new Date(measForm.date).toISOString(),
      source: 'user',
      sourceLabel: 'Manual entry',
      notes: measForm.notes || undefined,
      createdAt: nowISO(),
    };
    dispatch({ type: 'ADD_MEASUREMENT', measurement });
    showToast('Measurement recorded.', 'success');
    setMeasModalOpen(false);
    setMeasForm({ type: 'weight', value: '', secondaryValue: '', date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const summary = useMemo(() => generateHealthSummary({
    profile: state.profile,
    measurements: state.measurements,
    reports: state.reports,
    medications: state.medications,
    reminders: state.reminders,
    goals: state.goals,
    isDemo,
  }), [state.profile, state.measurements, state.reports, state.medications, state.reminders, state.goals, isDemo]);

  const latestByType = (type: string): HealthMeasurement | null => {
    const items = state.measurements
      .filter((m) => m.type === type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items[0] ?? null;
  };

  const getTrend = (type: string): { direction: 'up' | 'down' | 'flat'; value: string } | null => {
    const items = state.measurements
      .filter((m) => m.type === type)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (items.length < 2) return null;
    const first = items[0].value;
    const last = items[items.length - 1].value;
    const diff = last - first;
    if (Math.abs(diff) < 0.01) return { direction: 'flat', value: '0' };
    return { direction: diff > 0 ? 'up' : 'down', value: `${Math.abs(diff).toFixed(1)}` };
  };

  const overviewCards = [
    { type: 'weight', label: 'Weight', icon: Scale, color: 'text-teal-600 bg-teal-50', getValue: (m: HealthMeasurement) => `${m.value} ${m.unit}` },
    { type: 'blood_pressure', label: 'Blood Pressure', icon: Heart, color: 'text-rose-600 bg-rose-50', getValue: (m: HealthMeasurement) => `${m.value}/${m.secondaryValue} ${m.unit}` },
    { type: 'heart_rate', label: 'Heart Rate', icon: Activity, color: 'text-amber-600 bg-amber-50', getValue: (m: HealthMeasurement) => `${m.value} ${m.unit}` },
    { type: 'sleep', label: 'Sleep', icon: Moon, color: 'text-indigo-600 bg-indigo-50', getValue: (m: HealthMeasurement) => `${m.value} ${m.unit}` },
    { type: 'activity', label: 'Daily Activity', icon: Flame, color: 'text-orange-600 bg-orange-50', getValue: (m: HealthMeasurement) => `${m.value.toLocaleString()} ${m.unit}` },
  ];

  const pendingReminders = state.reminders.filter((r) => !r.completed).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const todayReminders = pendingReminders.filter((r) => r.date.split('T')[0] === new Date().toISOString().split('T')[0]);
  const upcomingReminders = pendingReminders.filter((r) => r.date.split('T')[0] !== new Date().toISOString().split('T')[0]).slice(0, 4);

  const recentRecords = [...state.records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

  const weightData = state.measurements
    .filter((m) => m.type === 'weight')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m) => ({ date: formatDate(m.date, { month: 'short', day: 'numeric' }), value: m.value }));

  const bpData = state.measurements
    .filter((m) => m.type === 'blood_pressure')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m) => ({ date: formatDate(m.date, { month: 'short', day: 'numeric' }), systolic: m.value, diastolic: m.secondaryValue }));

  const sleepData = state.measurements
    .filter((m) => m.type === 'sleep')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m) => ({ date: formatDate(m.date, { month: 'short', day: 'numeric' }), value: m.value }));

  const activityData = state.measurements
    .filter((m) => m.type === 'activity')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((m) => ({ date: formatDate(m.date, { month: 'short', day: 'numeric' }), value: m.value }));

  const medAdherence = state.medications.length
    ? Math.round(state.medications.reduce((s, m) => s + m.adherence, 0) / state.medications.length)
    : null;

  const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'flat' }) => {
    if (direction === 'up') return <TrendingUp className="w-3.5 h-3.5 text-teal-600" />;
    if (direction === 'down') return <TrendingDown className="w-3.5 h-3.5 text-blue-600" />;
    return <Minus className="w-3.5 h-3.5 text-navy-300" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('profile')}
            className="cursor-pointer hover:opacity-90 transition-opacity flex-shrink-0"
            title="Open Health Profile"
          >
            <UserAvatar
              name={state.profile?.fullName ?? 'User'}
              avatarUrl={state.profile?.avatarUrl}
              size="lg"
              showStatus={true}
            />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-1">
              <h1 className="font-heading text-xl sm:text-2xl font-extrabold text-navy-950 tracking-tight">
                {greeting}, {state.profile?.fullName?.split(' ')[0] ?? 'there'}
              </h1>
              {isDemo && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Demo Profile
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-navy-500 font-medium">Real-time biometric monitoring & clinical copilot intelligence</p>
          </div>
        </div>

        <Button
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setMeasModalOpen(true)}
          className="self-start sm:self-auto cursor-pointer"
        >
          Record Measurement
        </Button>
      </div>

      {/* AI Clinical Summary Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500/10 via-white to-emerald-500/5 p-6 border border-teal-200/80 shadow-card hover:shadow-card-hover transition-all">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-teal-600/20">
            <Brain className="w-6 h-6 stroke-[2]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-navy-950 text-base sm:text-lg">AI Clinical Synthesis Briefing</h3>
                <span className="px-2 py-0.5 rounded-full bg-teal-100/70 text-teal-800 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-teal-600" />
                  Llama 3 • Groq
                </span>
              </div>
            </div>
            <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-line">{summary.content}</p>
            {summary.basedOnData.length > 0 && (
              <div className="mt-4 pt-3.5 border-t border-teal-100/80 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-navy-400">Synthesized from:</span>
                <div className="flex flex-wrap gap-1.5">
                  {summary.basedOnData.map((s, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded-full bg-white border border-teal-200/80 text-teal-800 text-xs font-medium shadow-xs">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ABDM / ABHA Digital Records Quick Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50/70 via-white to-slate-50 border border-teal-100/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-teal-600/20">
            <FileHeart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">ABDM / ABHA Digital Health Identity</span>
              {state.abhaConnection?.isConnected ? (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Linked
                </span>
              ) : (
                <Badge variant="slate">Not Connected</Badge>
              )}
            </div>
            <p className="text-xs text-navy-500 mt-0.5">
              {state.abhaConnection?.isConnected
                ? `Linked ABHA ID: ${state.abhaConnection.abhaId} • ${state.importedAbhaRecordIds?.length || 0} ABDM records imported • FHIR R4 Ready`
                : 'Connect your mock ABHA account to simulate ABDM health records and export standard FHIR JSON.'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('abha')}
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          className="self-end sm:self-auto flex-shrink-0 cursor-pointer"
        >
          {state.abhaConnection?.isConnected ? 'Manage ABHA' : 'Connect ABHA'}
        </Button>
      </div>

      {/* Overview Metric Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-navy-900 text-base">Key Biometric Vitals</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {overviewCards.map((card) => {
            const latest = latestByType(card.type);
            const trend = getTrend(card.type);
            return (
              <Card key={card.type} hover className="p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-card-hover transition-all">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider">{card.label}</p>
                  <div className={`w-7 h-7 rounded-lg ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                {latest ? (
                  <>
                    <p className="font-heading font-bold text-navy-950 text-lg leading-tight">{card.getValue(latest)}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[11px] text-navy-400">{formatDate(latest.date, { month: 'short', day: 'numeric' })}</span>
                      {trend && (
                        <span className="flex items-center gap-0.5 text-[11px] font-medium text-navy-500 ml-auto">
                          <TrendIcon direction={trend.direction} />
                          {trend.value}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-navy-300 mt-2">No data yet</p>
                )}
              </Card>
            );
          })}
          <Card hover className="p-4 rounded-2xl border border-slate-200/80 hover:border-teal-300 hover:shadow-card-hover transition-all">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider">Adherence</p>
              <div className="w-7 h-7 rounded-lg text-emerald-600 bg-emerald-50 flex items-center justify-center">
                <Pill className="w-3.5 h-3.5" />
              </div>
            </div>
            {medAdherence !== null ? (
              <>
                <p className="font-heading font-bold text-navy-950 text-lg leading-tight">{medAdherence}%</p>
                <p className="text-[11px] text-emerald-600 font-medium mt-1.5">{state.medications.length} active med(s)</p>
              </>
            ) : (
              <p className="text-xs text-navy-300 mt-2">No medications</p>
            )}
          </Card>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Tasks */}
        <Card className="lg:col-span-1">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-navy-800">Upcoming Tasks</h3>
            <button onClick={() => navigate('reminders')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">View all</button>
          </div>
          <CardBody className="space-y-2">
            {todayReminders.length === 0 && upcomingReminders.length === 0 ? (
              <EmptyState title="No reminders yet" description="Add reminders for medications, appointments, and health checkups." />
            ) : (
              <>
                {todayReminders.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-navy-400 uppercase tracking-wider mb-2">Today</p>
                    {todayReminders.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${r.type === 'medication' ? 'bg-teal-500' : r.type === 'appointment' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-700 truncate">{r.title}</p>
                          {r.time && <p className="text-xs text-navy-400">{r.time}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {upcomingReminders.length > 0 && (
                  <div className={todayReminders.length > 0 ? 'mt-3 pt-3 border-t border-slate-100' : ''}>
                    <p className="text-xs font-medium text-navy-400 uppercase tracking-wider mb-2">Upcoming</p>
                    {upcomingReminders.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className={`w-2 h-2 rounded-full ${r.type === 'medication' ? 'bg-teal-500' : r.type === 'appointment' ? 'bg-blue-500' : 'bg-amber-500'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-navy-700 truncate">{r.title}</p>
                          <p className="text-xs text-navy-400">{relativeDate(r.date)}{r.time ? ` · ${r.time}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* Recent Records */}
        <Card className="lg:col-span-1">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-navy-800">Recent Records</h3>
            <button onClick={() => navigate('records')} className="text-xs text-teal-600 hover:text-teal-700 font-medium">View all</button>
          </div>
          <CardBody className="space-y-2">
            {recentRecords.length === 0 ? (
              <EmptyState title="No health records yet" description="Upload your first report to begin organizing your healthcare information." />
            ) : (
              recentRecords.map((r) => {
                const sc = statusColor(r.status);
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate('records')}>
                    <FileText className="w-4 h-4 text-navy-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-navy-700 truncate">{r.title}</p>
                      <p className="text-xs text-navy-400">{formatDate(r.date)}</p>
                    </div>
                    <Badge variant={r.status === 'analyzed' ? 'teal' : 'blue'}>{sc.label}</Badge>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <div className="p-5 border-b border-slate-100">
            <h3 className="font-semibold text-navy-800">Quick Actions</h3>
          </div>
          <CardBody className="space-y-2">
            <button onClick={() => navigate('copilot')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div>
              <div><p className="text-sm font-medium text-navy-700">Ask AI Copilot</p><p className="text-xs text-navy-400">Get answers about your health</p></div>
            </button>
            <button onClick={() => navigate('reports')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><FileText className="w-4 h-4" /></div>
              <div><p className="text-sm font-medium text-navy-700">Upload Report</p><p className="text-xs text-navy-400">Analyze a medical report</p></div>
            </button>
            <button onClick={() => navigate('medications')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><Pill className="w-4 h-4" /></div>
              <div><p className="text-sm font-medium text-navy-700">Manage Medications</p><p className="text-xs text-navy-400">Track your prescriptions</p></div>
            </button>
            <button onClick={() => navigate('reminders')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><BellRing className="w-4 h-4" /></div>
              <div><p className="text-sm font-medium text-navy-700">Manage Reminders</p><p className="text-xs text-navy-400">Stay on track with tasks</p></div>
            </button>
            <button onClick={() => navigate('goals')} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-teal-50 transition-colors text-left">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Target className="w-4 h-4" /></div>
              <div><p className="text-sm font-medium text-navy-700">Set Health Goals</p><p className="text-xs text-navy-400">Track your progress</p></div>
            </button>
          </CardBody>
        </Card>
      </div>

      {/* Health Trends */}
      <div>
        <h2 className="font-semibold text-navy-800 mb-3">Health Trends</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {/* Weight */}
          <Card>
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-navy-800">Weight Over Time</h3></div>
            <CardBody>
              {weightData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={weightData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} dot={{ r: 4, fill: '#0d9488' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Not enough data to show a trend" description="Add more weight measurements over time to see a trend chart." />
              )}
            </CardBody>
          </Card>

          {/* Blood Pressure */}
          <Card>
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-navy-800">Blood Pressure Over Time</h3></div>
            <CardBody>
              {bpData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={bpData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Line type="monotone" dataKey="systolic" stroke="#0d9488" strokeWidth={2} dot={{ r: 4, fill: '#0d9488' }} name="Systolic" />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} name="Diastolic" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Not enough data to show a trend" description="Add more blood pressure measurements over time to see a trend chart." />
              )}
            </CardBody>
          </Card>

          {/* Sleep */}
          <Card>
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-navy-800">Sleep Over Time</h3></div>
            <CardBody>
              {sleepData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={sleepData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} domain={['dataMin - 1', 'dataMax + 1']} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: '#6366f1' }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Not enough data to show a trend" description="Add more sleep measurements over time to see a trend chart." />
              )}
            </CardBody>
          </Card>

          {/* Activity */}
          <Card>
            <div className="p-5 border-b border-slate-100"><h3 className="font-semibold text-navy-800">Activity Over Time</h3></div>
            <CardBody>
              {activityData.length >= 2 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                    <Bar dataKey="value" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState title="Not enough data to show a trend" description="Add more activity measurements over time to see a trend chart." />
              )}
            </CardBody>
          </Card>
        </div>
      </div>
      {/* Add Measurement Modal */}
      <Modal
        open={measModalOpen}
        onClose={() => setMeasModalOpen(false)}
        title="Record Measurement"
        subtitle="Log a new health measurement to track your trends over time"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMeasModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMeasurement}>Save Measurement</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Measurement type"
            value={measForm.type}
            onChange={(e) => setMeasForm({ ...measForm, type: e.target.value as MeasurementType, value: '', secondaryValue: '' })}
            options={measurementTypes.map((t) => ({ value: t.value, label: t.label }))}
          />
          {measurementTypes.find((t) => t.value === measForm.type)?.needsSecondary ? (
            <div className="grid grid-cols-2 gap-4">
              <Input label="Systolic value" type="number" placeholder="120" value={measForm.value} onChange={(e) => setMeasForm({ ...measForm, value: e.target.value })} />
              <Input label="Diastolic value" type="number" placeholder="80" value={measForm.secondaryValue} onChange={(e) => setMeasForm({ ...measForm, secondaryValue: e.target.value })} />
            </div>
          ) : (
            <Input label="Value" type="number" placeholder="0" value={measForm.value} onChange={(e) => setMeasForm({ ...measForm, value: e.target.value })} />
          )}
          <Input label="Date" type="date" value={measForm.date} onChange={(e) => setMeasForm({ ...measForm, date: e.target.value })} />
          <Input label="Notes (optional)" placeholder="e.g., Measured after morning walk" value={measForm.notes} onChange={(e) => setMeasForm({ ...measForm, notes: e.target.value })} />
        </div>
      </Modal>
    </div>
  );
}
