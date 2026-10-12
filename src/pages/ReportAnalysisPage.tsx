import { useMemo, useState } from 'react';
import {
  Microscope, FileText, Brain, Lightbulb, ChevronRight, ArrowLeft, Sparkles,
  Info, ClipboardList, Stethoscope, Pill, FileHeart, Calendar, User, Building2,
  AlertTriangle, CheckCircle2, Activity,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate, statusColor } from '@/utils/helpers';
import { explainResult } from '@/services/aiService';
import type { DocumentType } from '@/types';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  lab_report:         'Lab Report',
  prescription:       'Prescription',
  discharge_summary:  'Discharge Summary',
  doctor_note:        "Doctor's Note",
  radiology_report:   'Radiology Report',
  vaccination_record: 'Vaccination Record',
  unknown:            'Medical Document',
};

export function ReportAnalysisPage() {
  const { state } = useApp();
  const { params, navigate } = useRouter();
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'overview' | 'labs' | 'medicines' | 'diagnoses' | 'discharge' | 'ai'>('overview');

  const report = useMemo(() => {
    const id = params.reportId;
    return state.reports.find((r) => r.id === id) ?? null;
  }, [state.reports, params.reportId]);

  if (!report) {
    return (
      <div>
        <PageHeader title="Report Analysis" subtitle="Detailed analysis of your medical report" icon={<Microscope className="w-5 h-5" />} />
        <Card>
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No report selected"
            description="Select a report from the Medical Reports page to view its analysis."
            action={<Button size="sm" onClick={() => navigate('reports')}>Go to Reports</Button>}
          />
        </Card>
      </div>
    );
  }

  const selectedResult = report.results.find((r) => r.id === selectedResultId) ?? null;
  const explanation = selectedResult ? explainResult(selectedResult) : null;
  const outsideCount = report.results.filter((r) => r.status === 'outside_range').length;
  const withinCount = report.results.filter((r) => r.status === 'within_range').length;
  const docType = report.documentType ?? 'unknown';
  const docLabel = DOC_TYPE_LABELS[docType];

  const hasLabs = report.results.length > 0;
  const hasMeds = (report.medicines?.length ?? 0) > 0;
  const hasDiagnoses = (report.diagnoses?.length ?? 0) > 0;
  const hasDischarge = !!report.dischargeSummary;
  const hasAI = !!report.aiSummary;

  const sections = [
    { key: 'overview',   label: 'Overview',   show: true },
    { key: 'labs',       label: `Labs (${report.results.length})`,         show: hasLabs },
    { key: 'medicines',  label: `Medicines (${report.medicines?.length ?? 0})`, show: hasMeds },
    { key: 'diagnoses',  label: `Diagnoses (${report.diagnoses?.length ?? 0})`, show: hasDiagnoses },
    { key: 'discharge',  label: 'Discharge',  show: hasDischarge },
    { key: 'ai',         label: 'AI Summary', show: hasAI },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('reports')} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-navy-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-navy-800">{report.title}</h1>
            {report.source === 'demo' && <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Data</Badge>}
            <Badge variant="teal">{docLabel}</Badge>
          </div>
          <p className="text-navy-400 text-sm mt-0.5">
            {formatDate(report.reportDate)}{report.provider ? ` · ${report.provider}` : ''}
          </p>
        </div>
      </div>

      {/* Section navigation */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
        {sections.filter(s => s.show).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setActiveSection(key as typeof activeSection); setSelectedResultId(null); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeSection === key ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400 hover:text-navy-600'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Overview ──────────────────────────────────────────────────── */}
      {activeSection === 'overview' && (
        <Card>
          <CardHeader title="Report Information" icon={<FileText className="w-5 h-5" />} />
          <CardBody>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
              <div>
                <p className="text-xs text-navy-400 mb-1">Document Name</p>
                <p className="text-sm font-medium text-navy-700">{report.title}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400 mb-1">Date</p>
                <p className="text-sm font-medium text-navy-700">{formatDate(report.reportDate)}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400 mb-1">Provider</p>
                <p className="text-sm font-medium text-navy-700">{report.provider || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs text-navy-400 mb-1">Document Type</p>
                <p className="text-sm font-medium text-navy-700">{docLabel}</p>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
              <div className="p-3 bg-teal-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-teal-700">{withinCount}</p>
                <p className="text-xs text-teal-600 mt-0.5">Within range</p>
              </div>
              <div className="p-3 bg-red-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-red-700">{outsideCount}</p>
                <p className="text-xs text-red-600 mt-0.5">Outside range</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-700">{report.medicines?.length ?? 0}</p>
                <p className="text-xs text-blue-600 mt-0.5">Medicines</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-700">{report.diagnoses?.length ?? 0}</p>
                <p className="text-xs text-purple-600 mt-0.5">Diagnoses</p>
              </div>
            </div>

            {/* Quick navigation */}
            <div className="grid sm:grid-cols-2 gap-2 mt-4">
              {hasLabs && (
                <button onClick={() => setActiveSection('labs')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-navy-700">Lab Results</p>
                    <p className="text-xs text-navy-400">{report.results.length} test values extracted</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-300 ml-auto" />
                </button>
              )}
              {hasMeds && (
                <button onClick={() => setActiveSection('medicines')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors">
                  <Pill className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-navy-700">Medicines</p>
                    <p className="text-xs text-navy-400">{report.medicines!.length} medicines & dosages</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-300 ml-auto" />
                </button>
              )}
              {hasDiagnoses && (
                <button onClick={() => setActiveSection('diagnoses')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors">
                  <Stethoscope className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-navy-700">Diagnoses</p>
                    <p className="text-xs text-navy-400">{report.diagnoses!.length} diagnoses recorded</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-300 ml-auto" />
                </button>
              )}
              {hasDischarge && (
                <button onClick={() => setActiveSection('discharge')} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-left transition-colors">
                  <FileHeart className="w-5 h-5 text-rose-600" />
                  <div>
                    <p className="text-sm font-medium text-navy-700">Discharge Summary</p>
                    <p className="text-xs text-navy-400">Admission, discharge, follow-up details</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-navy-300 ml-auto" />
                </button>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── Lab Results ───────────────────────────────────────────────── */}
      {activeSection === 'labs' && (
        <>
          <Card>
            <CardHeader title="Lab Test Results" subtitle="Click any result for a detailed AI explanation" icon={<ClipboardList className="w-5 h-5" />} />
            <CardBody>
              {report.results.length === 0 ? (
                <EmptyState title="No lab results in this report" description="This document does not contain extracted lab test values." />
              ) : (
                <div className="space-y-2">
                  {report.results.map((result) => {
                    const sc = statusColor(result.status);
                    return (
                      <button
                        key={result.id}
                        onClick={() => setSelectedResultId(result.id)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${selectedResultId === result.id ? 'bg-teal-50 border border-teal-200' : 'bg-slate-50 hover:bg-slate-100 border border-transparent'}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-navy-800 text-sm">{result.testName}</p>
                          <p className="text-xs text-navy-400 mt-0.5">{result.unit}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-navy-800">{result.value}</p>
                          <p className="text-xs text-navy-400">Ref: {result.referenceRange || 'N/A'}</p>
                        </div>
                        <Badge variant={result.status === 'within_range' ? 'teal' : result.status === 'outside_range' ? 'red' : 'amber'}>{sc.label}</Badge>
                        <ChevronRight className="w-4 h-4 text-navy-300 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {selectedResult && explanation && (
            <Card className="animate-slide-up">
              <CardHeader title={`AI Explanation: ${selectedResult.testName}`} icon={<Brain className="w-5 h-5" />} />
              <CardBody className="space-y-5">
                <div>
                  <h4 className="text-sm font-semibold text-navy-800 mb-2">Simple Explanation</h4>
                  <p className="text-sm text-navy-600 leading-relaxed">{explanation.simple}</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h4 className="text-sm font-semibold text-navy-800 mb-1">Your Result</h4>
                    <p className="text-2xl font-bold text-navy-800">{selectedResult.value} <span className="text-sm font-normal text-navy-400">{selectedResult.unit}</span></p>
                    <p className="text-xs text-navy-400 mt-1">From your uploaded report</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <h4 className="text-sm font-semibold text-navy-800 mb-1">Reference Information</h4>
                    <p className="text-lg font-semibold text-navy-700">{selectedResult.referenceRange || 'Not provided'}</p>
                    <p className="text-xs text-navy-400 mt-1">{selectedResult.unit}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-navy-800 mb-2 flex items-center gap-1.5"><Info className="w-4 h-4 text-blue-500" /> What This Could Mean</h4>
                  <p className="text-sm text-navy-600 leading-relaxed">{explanation.whatThisCouldMean}</p>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}

      {/* ── Medicines ─────────────────────────────────────────────────── */}
      {activeSection === 'medicines' && (
        <Card>
          <CardHeader title="Medicines & Dosages" subtitle="Extracted from the document — always follow your doctor's instructions" icon={<Pill className="w-5 h-5" />} />
          <CardBody>
            <div className="p-3 bg-blue-50 rounded-xl mb-4">
              <p className="text-xs text-blue-700"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />HealthPilot AI only extracts medicines from your uploaded documents. This is not a prescription. Always follow your healthcare provider's instructions.</p>
            </div>
            {(report.medicines?.length ?? 0) === 0 ? (
              <EmptyState title="No medicines recorded" description="No medicines were extracted from this document." />
            ) : (
              <div className="space-y-3">
                {report.medicines!.map((med) => (
                  <div key={med.id} className="p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h4 className="font-semibold text-navy-800">{med.name}</h4>
                          <Badge variant="blue">{med.dosage}</Badge>
                          {med.userVerified && <Badge variant="teal" icon={<CheckCircle2 className="w-3 h-3" />}>Verified</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-navy-500">
                          <span className="flex items-center gap-1"><Activity className="w-3 h-3" />{med.frequency}</span>
                          {med.duration && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{med.duration}</span>}
                        </div>
                        {med.instructions && (
                          <p className="text-xs text-navy-400 mt-2 italic">{med.instructions}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Diagnoses ─────────────────────────────────────────────────── */}
      {activeSection === 'diagnoses' && (
        <Card>
          <CardHeader title="Diagnoses" subtitle="Extracted from the document" icon={<Stethoscope className="w-5 h-5" />} />
          <CardBody>
            <div className="p-3 bg-amber-50 rounded-xl mb-4">
              <p className="text-xs text-amber-700"><AlertTriangle className="w-3.5 h-3.5 inline mr-1" />These diagnoses were extracted from your uploaded document. HealthPilot AI does not diagnose medical conditions. Always consult your doctor.</p>
            </div>
            {(report.diagnoses?.length ?? 0) === 0 ? (
              <EmptyState title="No diagnoses recorded" description="No diagnoses were extracted from this document." />
            ) : (
              <div className="space-y-3">
                {report.diagnoses!.map((dx) => (
                  <div key={dx.id} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${dx.type === 'primary' ? 'bg-red-50 text-red-600' : dx.type === 'secondary' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-medium text-navy-800">{dx.text}</p>
                        {dx.icdCode && <Badge variant="slate">{dx.icdCode}</Badge>}
                        <Badge variant={dx.type === 'primary' ? 'red' : dx.type === 'secondary' ? 'amber' : 'blue'}>
                          {dx.type.charAt(0).toUpperCase() + dx.type.slice(1)}
                        </Badge>
                        {dx.userVerified && <Badge variant="teal" icon={<CheckCircle2 className="w-3 h-3" />}>Verified</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── Discharge Summary ─────────────────────────────────────────── */}
      {activeSection === 'discharge' && (
        <Card>
          <CardHeader title="Discharge Summary" subtitle="Key information from your hospital discharge" icon={<FileHeart className="w-5 h-5" />} />
          <CardBody>
            {!report.dischargeSummary ? (
              <EmptyState title="No discharge data" description="This document does not contain discharge summary information." />
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { label: 'Date of Admission', value: report.dischargeSummary.admissionDate ? formatDate(report.dischargeSummary.admissionDate) : undefined, icon: <Calendar className="w-4 h-4 text-blue-500" /> },
                    { label: 'Date of Discharge', value: report.dischargeSummary.dischargeDate ? formatDate(report.dischargeSummary.dischargeDate) : undefined, icon: <Calendar className="w-4 h-4 text-teal-500" /> },
                    { label: 'Attending Physician', value: report.dischargeSummary.attendingPhysician, icon: <User className="w-4 h-4 text-purple-500" /> },
                    { label: 'Ward / Department', value: report.dischargeSummary.ward, icon: <Building2 className="w-4 h-4 text-amber-500" /> },
                    { label: 'Follow-up Date', value: report.dischargeSummary.followUpDate ? formatDate(report.dischargeSummary.followUpDate) : undefined, icon: <Calendar className="w-4 h-4 text-rose-500" /> },
                  ].map(({ label, value, icon }) => value ? (
                    <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      {icon}
                      <div>
                        <p className="text-xs text-navy-400">{label}</p>
                        <p className="text-sm font-medium text-navy-700">{value}</p>
                      </div>
                    </div>
                  ) : null)}
                </div>

                {report.dischargeSummary.admittingDiagnosis && (
                  <div className="p-4 bg-amber-50 rounded-xl">
                    <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> Admitting Diagnosis</p>
                    <p className="text-sm text-navy-700">{report.dischargeSummary.admittingDiagnosis}</p>
                  </div>
                )}
                {report.dischargeSummary.dischargeDiagnosis && (
                  <div className="p-4 bg-red-50 rounded-xl">
                    <p className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1"><Stethoscope className="w-3.5 h-3.5" /> Discharge Diagnosis</p>
                    <p className="text-sm text-navy-700">{report.dischargeSummary.dischargeDiagnosis}</p>
                  </div>
                )}
                {(report.dischargeSummary.procedures?.length ?? 0) > 0 && (
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs font-medium text-navy-600 mb-2">Procedures Performed</p>
                    <ul className="space-y-1.5">
                      {report.dischargeSummary.procedures!.map((proc, i) => (
                        <li key={i} className="text-sm text-navy-700 flex items-start gap-2">
                          <ChevronRight className="w-3.5 h-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                          {proc}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {report.dischargeSummary.followUpInstructions && (
                  <div className="p-4 bg-teal-50 rounded-xl">
                    <p className="text-xs font-medium text-teal-700 mb-1 flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Follow-up Instructions</p>
                    <p className="text-sm text-navy-700 leading-relaxed">{report.dischargeSummary.followUpInstructions}</p>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* ── AI Summary ────────────────────────────────────────────────── */}
      {activeSection === 'ai' && report.aiSummary && (
        <Card className="bg-gradient-to-br from-teal-50 to-white border-teal-100">
          <CardHeader title="AI Report Summary" icon={<Brain className="w-5 h-5" />} />
          <CardBody className="space-y-4">
            <p className="text-sm text-navy-600 leading-relaxed whitespace-pre-line">{report.aiSummary}</p>
            {report.aiExplanation && (
              <div className="pt-3 border-t border-teal-100">
                <p className="text-xs font-medium text-blue-600 mb-1 flex items-center gap-1"><Info className="w-3 h-3" /> General Information</p>
                <p className="text-xs text-navy-500 leading-relaxed">{report.aiExplanation}</p>
              </div>
            )}
            {(report.doctorQuestions?.length ?? 0) > 0 && (
              <div className="pt-3 border-t border-teal-100">
                <p className="text-xs font-medium text-amber-600 mb-1.5 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Questions to Discuss With Your Doctor</p>
                <ul className="space-y-1">
                  {report.doctorQuestions!.map((q, i) => (
                    <li key={i} className="text-xs text-navy-600 flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="pt-3 border-t border-teal-100 flex flex-wrap gap-1.5">
              <Badge variant="teal">{report.title} — {formatDate(report.reportDate)}</Badge>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
