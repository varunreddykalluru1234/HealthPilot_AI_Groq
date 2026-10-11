import { ShieldCheck, Lock, Eye, Trash2, Download, Brain, AlertCircle, Check, FileText, User } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export function PrivacyPage() {
  const principles = [
    { icon: Lock, title: 'You Control Your Information', desc: 'Your health data belongs to you. You can review, edit, export, or delete it at any time from the Settings page.' },
    { icon: Brain, title: 'AI Explanations From Your Data', desc: 'AI-generated insights and explanations are based on the information you provide. The AI does not invent medical values or fabricate health history.' },
    { icon: Eye, title: 'Review Uploaded Information', desc: 'You can review and verify all extracted information before it is saved. The app never silently changes values from your uploaded documents.' },
    { icon: Trash2, title: 'Delete Records Anytime', desc: 'You can delete individual records or all your data at once. Deletion is permanent and cannot be undone.' },
    { icon: Download, title: 'Export Your Information', desc: 'Export all your health data as a JSON file at any time from Settings > Data Management.' },
    { icon: FileText, title: 'Transparent Data Sources', desc: 'Every AI insight shows its data sources, so you always know where the information came from.' },
  ];

  const notClaimed = [
    'HIPAA compliance',
    'GDPR compliance',
    'Medical certification',
    'Clinical accuracy',
    'Diagnostic capability',
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Privacy & Safety" subtitle="How your health information is handled" icon={<ShieldCheck className="w-5 h-5" />} />

      {/* Important notice */}
      <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
        <CardBody>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-navy-800 mb-2">Important Notice</h3>
              <p className="text-sm text-navy-600 leading-relaxed">
                HealthPilot AI provides health information and organization tools. It does not replace professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Principles */}
      <div className="grid sm:grid-cols-2 gap-4">
        {principles.map((p) => (
          <Card key={p.title} className="p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                <p.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-sm mb-1">{p.title}</h3>
                <p className="text-xs text-navy-500 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* What HealthPilot does NOT do */}
      <Card>
        <CardHeader title="What HealthPilot AI Does NOT Do" icon={<AlertCircle className="w-5 h-5" />} />
        <CardBody>
          <div className="space-y-2">
            {[
              'Diagnose diseases or medical conditions',
              'Prescribe medication',
              'Tell you to stop or start medication',
              'Invent medical results or symptoms',
              'Replace consultation with a healthcare professional',
              'Store data on external servers without your knowledge',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-red-50">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{item}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Not claimed */}
      <Card>
        <CardHeader title="Compliance & Certifications" icon={<ShieldCheck className="w-5 h-5" />} />
        <CardBody>
          <p className="text-sm text-navy-500 mb-4">HealthPilot AI does NOT claim the following:</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {notClaimed.map((item) => (
              <div key={item} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-slate-500">—</span>
                </div>
                <p className="text-sm text-navy-500">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">These items are listed for transparency. If any of these are implemented and verified in the future, they will be clearly communicated here.</p>
          </div>
        </CardBody>
      </Card>

      {/* Data types */}
      <Card>
        <CardHeader title="What Data We Store" icon={<FileText className="w-5 h-5" />} />
        <CardBody>
          <div className="space-y-2">
            {[
              { label: 'Profile information', desc: 'Name, age, vitals, conditions, allergies, medications' },
              { label: 'Health measurements', desc: 'Weight, blood pressure, heart rate, sleep, activity entries' },
              { label: 'Medical reports', desc: 'Uploaded reports with extracted and verified results' },
              { label: 'Medications & reminders', desc: 'Your medication schedule and reminder settings' },
              { label: 'Health goals', desc: 'Your personal goals and progress tracking' },
              { label: 'AI conversations', desc: 'Your chat history with the AI Health Copilot' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
                <Check className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-navy-700">{item.label}</p>
                  <p className="text-xs text-navy-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <Badge variant="teal" icon={<User className="w-3 h-3" />}>Stored locally in your browser</Badge>
          </div>
        </CardBody>
      </Card>

      {/* Safety guidelines */}
      <Card className="bg-navy-800 text-white">
        <CardBody>
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-teal-400" /> Safety Guidelines</h3>
          <ul className="space-y-2">
            {[
              'Always consult a qualified healthcare professional for medical decisions',
              'Do not use HealthPilot AI as a substitute for professional medical advice',
              'Verify all extracted information against your original documents',
              'Keep your account credentials secure',
              'Export your data regularly as a backup',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-navy-200">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0 mt-1.5" />
                {item}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
