import { Activity, ArrowRight, Sparkles, ShieldCheck, Brain, FileText, Clock, Target, MessageSquare, FolderOpen, BarChart3, CheckCircle2, Stethoscope } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface LandingPageProps {
  onGetStarted: () => void;
  onExploreDemo: () => void;
  onGoToApp?: () => void;
}

export function LandingPage({ onGetStarted, onExploreDemo, onGoToApp }: LandingPageProps) {
  const { state, dispatch } = useApp();

  const handleDemo = () => {
    dispatch({ type: 'LOGIN', mode: 'demo' });
    onExploreDemo();
  };

  const steps = [
    { num: '01', title: 'Add Your Health Information', desc: 'Enter your basic health details, vitals, conditions, and lifestyle information.' },
    { num: '02', title: 'Upload or Organize Records', desc: 'Upload medical reports, lab results, prescriptions, and other health documents.' },
    { num: '03', title: 'Let AI Understand Your Information', desc: 'Our AI analyzes your actual data — extracting, validating, and explaining your results.' },
    { num: '04', title: 'Get Personalized Insights', desc: 'Receive data-driven insights, trend analysis, and questions to discuss with your doctor.' },
    { num: '05', title: 'Manage Your Healthcare Journey', desc: 'Track medications, set reminders, monitor goals, and visualize your health timeline.' },
  ];

  const capabilities = [
    { icon: MessageSquare, title: 'AI Health Copilot', desc: 'Ask questions about your health data and get explanations in plain language.' },
    { icon: FolderOpen, title: 'Health Record Organization', desc: 'Organize medical reports, prescriptions, lab results, and doctor notes in one place.' },
    { icon: FileText, title: 'Medical Report Understanding', desc: 'AI explains your lab results, highlights out-of-range values, and suggests questions for your doctor.' },
    { icon: Clock, title: 'Health Timeline', desc: 'See your complete healthcare journey in chronological order.' },
    { icon: BarChart3, title: 'Personalized Insights', desc: 'Data-driven insights based on your actual health information, not generic advice.' },
    { icon: Target, title: 'Goals & Reminders', desc: 'Set health goals, track progress, and never miss a medication or appointment.' },
  ];

  return (
    <div className="min-h-screen bg-white text-navy-800">
      {/* Navigation Header */}
      <nav className="sticky top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center shadow-sm">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-extrabold text-navy-900 text-lg">HealthPilot AI</span>
          </div>
          <div className="flex items-center gap-3">
            {state.isAuthenticated && onGoToApp && (
              <button
                onClick={onGoToApp}
                className="text-xs sm:text-sm font-semibold px-3.5 py-1.5 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors shadow-sm cursor-pointer"
              >
                Go to Dashboard
              </button>
            )}
            <button
              onClick={onGetStarted}
              className="text-sm font-medium text-navy-600 hover:text-teal-600 transition-colors px-3 py-1.5 cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={handleDemo}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-slate-200 text-navy-700 hover:border-teal-400 hover:text-teal-700 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/60 via-white to-white pointer-events-none" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-teal-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 left-0 w-72 h-72 bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 mb-6">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-700">AI-Powered Personal Health Copilot</span>
              </div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-navy-950 leading-[1.15] tracking-tight">
                Your Health,
                <br />
                <span className="text-teal-600">Understood.</span>{' '}
                <span className="text-teal-600">Organized.</span>
                <br />
                <span className="text-teal-600">Managed.</span>
              </h1>
              <p className="mt-6 text-lg text-navy-600 leading-relaxed max-w-xl">
                An AI-powered personal health copilot that brings your health information together, helps you understand it, and supports you throughout your healthcare journey.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3.5">
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-md shadow-teal-700/20 cursor-pointer text-base"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
                <button
                  onClick={handleDemo}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-300 text-navy-700 rounded-xl font-semibold hover:border-teal-400 hover:text-teal-700 transition-all shadow-sm hover:shadow cursor-pointer text-base"
                >
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span>Explore Demo</span>
                </button>
              </div>
            </div>

            {/* Product Preview Card */}
            <div className="relative">
              <div className="bg-white rounded-3xl shadow-xl border border-slate-200/90 p-6 transition-all duration-300 hover:shadow-2xl">
                <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
                  <div>
                    <p className="text-xs font-semibold text-teal-700 uppercase tracking-wider">HealthPilot AI Overview</p>
                    <h3 className="font-heading font-bold text-navy-900 text-lg">Biometric Health Dashboard</h3>
                  </div>
                  <div className="px-2.5 py-1 bg-teal-50 border border-teal-200 rounded-full text-xs font-semibold text-teal-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-teal-600" />
                    AI Active
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {[
                    { label: 'Weight', value: '64.5 kg', note: 'Normal' },
                    { label: 'Blood Pressure', value: '118/76', note: 'Optimal' },
                    { label: 'Sleep Score', value: '7.8h', note: 'Restful' },
                  ].map((c) => (
                    <div key={c.label} className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
                      <p className="text-[11px] font-medium text-navy-400">{c.label}</p>
                      <p className="font-heading font-bold text-navy-900 text-base mt-0.5">{c.value}</p>
                      <p className="text-[10px] font-medium text-emerald-600 mt-0.5">● {c.note}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl p-4 mb-4 border border-teal-100">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Brain className="w-4 h-4 text-teal-600" />
                    <p className="text-xs font-bold text-teal-900 uppercase tracking-wider">AI Clinical Insights Summary</p>
                  </div>
                  <p className="text-xs text-navy-700 leading-relaxed">
                    "Your cardiovascular vitals are in optimal balance. Lab panel biomarkers and scheduled medications are indexed and ready for your next doctor checkup."
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2 text-xs font-medium text-navy-600">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Prescriptions & lab reports organized</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-navy-600">
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    <span>ABDM / ABHA Digital Records linked</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-navy-900">How It Works</h2>
            <p className="mt-3 text-navy-500">Five simple steps to take control of your health information</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {steps.map((step) => (
              <div key={step.num} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow transition-all">
                <div className="text-2xl font-black text-teal-400 mb-2">{step.num}</div>
                <h3 className="font-heading font-bold text-navy-900 mb-2 text-base">{step.title}</h3>
                <p className="text-xs text-navy-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl font-bold text-navy-900">Core Capabilities</h2>
            <p className="mt-3 text-navy-500">Everything you need to manage your healthcare journey</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((cap) => (
              <div key={cap.title} className="group bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-teal-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4 group-hover:bg-teal-600 group-hover:text-white transition-colors">
                  <cap.icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-navy-900 mb-2 text-base">{cap.title}</h3>
                <p className="text-xs text-navy-500 leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20 px-6 bg-navy-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-heading text-3xl font-bold mb-4">Trust & Safety</h2>
          <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto mb-8 text-sm">
            HealthPilot AI helps you understand and organize your health information. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-8 text-left">
            <div className="bg-navy-800/80 rounded-xl p-5 border border-navy-700">
              <Stethoscope className="w-6 h-6 text-teal-400 mb-2" />
              <p className="text-xs text-slate-300 font-medium">Not a replacement for professional medical advice</p>
            </div>
            <div className="bg-navy-800/80 rounded-xl p-5 border border-navy-700">
              <ShieldCheck className="w-6 h-6 text-teal-400 mb-2" />
              <p className="text-xs text-slate-300 font-medium">You control your data — review, export, or delete anytime</p>
            </div>
            <div className="bg-navy-800/80 rounded-xl p-5 border border-navy-700">
              <Brain className="w-6 h-6 text-teal-400 mb-2" />
              <p className="text-xs text-slate-300 font-medium">AI explanations based on your actual data, not guesses</p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-3xl font-bold text-navy-900 mb-4">Take Control of Your Health Information</h2>
          <p className="text-navy-500 mb-8 text-sm">Start your journey with HealthPilot AI today, or explore our demo to see it in action.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onGetStarted}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold hover:from-teal-700 hover:to-teal-800 transition-all shadow-md shadow-teal-700/20 cursor-pointer"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDemo}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-300 text-navy-700 rounded-xl font-semibold hover:border-teal-400 hover:text-teal-700 transition-all shadow-sm cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-teal-600" />
              Explore Demo
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 px-6 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-bold text-navy-800 text-sm">HealthPilot AI</span>
          </div>
          <p className="text-xs text-navy-400 text-center sm:text-right">
            HealthPilot AI provides health information and organization tools. It does not replace professional medical advice, diagnosis, or treatment.
          </p>
        </div>
      </footer>
    </div>
  );
}
