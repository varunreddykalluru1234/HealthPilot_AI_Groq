import { useState, useRef, useCallback } from 'react';
import {
  FileText, Upload, Trash2, Eye, Sparkles, FileUp, CheckCircle2, AlertCircle,
  Loader2, ClipboardPaste, X, Zap, Pill, Stethoscope, FlaskConical,
  FileHeart, Syringe, Brain, Plus, Languages,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { formatDate, statusColor, uid, nowISO, classifyResult } from '@/utils/helpers';
import {
  extractFromFile,
  extractFromText,
  createReportFromExtraction,
  sampleReportText,
  samplePrescriptionText,
  sampleBilingualPrescriptionText,
  sampleDischargeSummaryText,
  type ExtractionResult,
} from '@/services/extractionService';
import { analyzeHealthReport } from '@/services/aiService';
import { analyzeReportWithGroq, isGroqAvailable } from '@/services/groqService';
import { useLanguage } from '@/context/LanguageContext';
import { LANGUAGES } from '@/i18n/translations';
import type { ReportResult, ExtractedMedicine, ExtractedDiagnosis, DocumentType } from '@/types';

// ─── Document type metadata ────────────────────────────────────────────────────

const DOC_TYPE_META: Record<DocumentType, { label: string; icon: React.ReactNode; color: string }> = {
  lab_report:        { label: 'Lab Report',        icon: <FlaskConical className="w-4 h-4" />, color: 'teal' },
  prescription:      { label: 'Prescription',       icon: <Pill className="w-4 h-4" />,         color: 'blue' },
  discharge_summary: { label: 'Discharge Summary',  icon: <FileHeart className="w-4 h-4" />,    color: 'purple' },
  doctor_note:       { label: 'Doctor\'s Note',     icon: <Stethoscope className="w-4 h-4" />,  color: 'amber' },
  radiology_report:  { label: 'Radiology Report',   icon: <Brain className="w-4 h-4" />,         color: 'indigo' },
  vaccination_record:{ label: 'Vaccination Record', icon: <Syringe className="w-4 h-4" />,      color: 'green' },
  unknown:           { label: 'Medical Document',   icon: <FileText className="w-4 h-4" />,     color: 'slate' },
};

export function ReportsPage() {
  const { state, dispatch, isDemo } = useApp();
  const { navigateWithParams } = useRouter();
  const { showToast } = useToast();
  const { ocrLang, ocrLangCode, setOcrLang, summaryLang } = useLanguage();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [processing, setProcessing] = useState(false);
  const [extraction, setExtraction] = useState<ExtractionResult | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [verifyResults, setVerifyResults] = useState<ReportResult[]>([]);
  const [verifyMedicines, setVerifyMedicines] = useState<ExtractedMedicine[]>([]);
  const [verifyDiagnoses, setVerifyDiagnoses] = useState<ExtractedDiagnosis[]>([]);
  const [verifyMeta, setVerifyMeta] = useState({ title: '', date: '', provider: '' });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'labs' | 'medicines' | 'diagnoses' | 'discharge'>('labs');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reports = [...state.reports].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());

  const applyExtractionResult = useCallback((result: ExtractionResult) => {
    setExtraction(result);
    setVerifyMeta({ title: result.reportTitle, date: result.reportDate, provider: result.provider });
    setVerifyResults(result.results.map((r) => ({ ...r, userVerified: false })));
    setVerifyMedicines(result.medicines.map((m) => ({ ...m, userVerified: false })));
    setVerifyDiagnoses(result.diagnoses.map((d) => ({ ...d, userVerified: false })));

    // Auto-select the most relevant tab
    if (result.documentType === 'prescription') setActiveTab('medicines');
    else if (result.documentType === 'discharge_summary') setActiveTab('discharge');
    else if (result.documentType === 'lab_report') setActiveTab('labs');
    else if (result.medicines.length > 0) setActiveTab('medicines');
    else if (result.diagnoses.length > 0) setActiveTab('diagnoses');
    else setActiveTab('labs');

    if (!result.success) {
      showToast('No data could be auto-extracted. Please fill in details manually.', 'warning');
    } else if (result.partialExtraction) {
      showToast('Partial extraction — please verify all fields before saving.', 'warning');
    } else {
      showToast(`${DOC_TYPE_META[result.documentType].label} processed. Please verify before saving.`, 'success');
    }
  }, [showToast]);

  const handleFile = useCallback(async (file: File) => {
    setUploadedFile(file);
    setProcessing(true);
    setUploadProgress(0);
    setProgressLabel('Starting…');

    try {
      const result = await extractFromFile(file, (pct, label) => {
        setUploadProgress(pct);
        setProgressLabel(label);
      }, ocrLangCode);
      applyExtractionResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      showToast(msg, 'error');
    } finally {
      setProcessing(false);
      setProgressLabel('');
    }
  }, [showToast, ocrLangCode, applyExtractionResult]);

  const handlePaste = async () => {
    if (!pasteText.trim()) { showToast('Please paste some text first.', 'error'); return; }
    setProcessing(true);
    setUploadProgress(50);
    const result = await extractFromText(pasteText);
    applyExtractionResult(result);
    setUploadProgress(100);
    setProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSaveVerified = async () => {
    if (!extraction) return;
    setSaving(true);
    const fileName = uploadedFile?.name ?? 'pasted_text.txt';
    const fileType = uploadedFile?.type ?? 'text/plain';
    const fileSize = uploadedFile?.size ?? pasteText.length;

    const report = createReportFromExtraction(extraction, fileName, fileType, fileSize);
    report.title = verifyMeta.title || report.title;
    report.reportDate = verifyMeta.date || report.reportDate;
    report.provider = verifyMeta.provider || report.provider;
    report.results = verifyResults.map((r) => ({
      ...r,
      userVerified: true,
      status: r.referenceRange ? classifyResult(r.value, r.referenceRange) : r.status,
    }));
    report.medicines = verifyMedicines.map((m) => ({ ...m, userVerified: true }));
    report.diagnoses = verifyDiagnoses.map((d) => ({ ...d, userVerified: true }));
    report.verified = true;
    report.status = 'analyzed';
    report.updatedAt = nowISO();

    const aiCtx = {
      profile: state.profile,
      measurements: state.measurements,
      reports: state.reports,
      medications: state.medications,
      reminders: state.reminders,
      goals: state.goals,
      isDemo,
    };

    if (isGroqAvailable()) {
      try {
        showToast('Analysing with Groq AI…', 'success');
        const groqResult = await analyzeReportWithGroq(report, aiCtx, undefined, summaryLang);
        report.aiSummary = groqResult.summary;
        report.aiExplanation = groqResult.explanation;
        report.doctorQuestions = groqResult.doctorQuestions;
      } catch {
        const aiResult = analyzeHealthReport(report, aiCtx);
        report.aiSummary = aiResult.content;
        report.aiExplanation = aiResult.generalInfo;
        report.doctorQuestions = aiResult.suggestedQuestions;
      }
    } else {
      const aiResult = analyzeHealthReport(report, aiCtx);
      report.aiSummary = aiResult.content;
      report.aiExplanation = aiResult.generalInfo;
      report.doctorQuestions = aiResult.suggestedQuestions;
    }

    dispatch({ type: 'ADD_REPORT', report });
    setSaving(false);
    setUploadOpen(false);
    resetUpload();
    showToast('Report saved and analysed successfully.', 'success');
    navigateWithParams('report-analysis', { reportId: report.id });
  };

  const resetUpload = () => {
    setExtraction(null);
    setUploadedFile(null);
    setUploadProgress(0);
    setProgressLabel('');
    setVerifyResults([]);
    setVerifyMedicines([]);
    setVerifyDiagnoses([]);
    setVerifyMeta({ title: '', date: '', provider: '' });
    setPasteMode(false);
    setPasteText('');
    setActiveTab('labs');
  };

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_REPORT', id });
    showToast('Report deleted.', 'success');
  };

  // ── Lab result helpers ──────────────────────────────────────────────────────

  const updateResult = (id: string, field: keyof ReportResult, value: string) => {
    setVerifyResults((prev) => prev.map((r) => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value } as ReportResult;
      if (field === 'value' || field === 'referenceRange') {
        updated.status = updated.referenceRange ? classifyResult(updated.value, updated.referenceRange) : 'review_recommended';
      }
      return updated;
    }));
  };
  const addManualResult = () => setVerifyResults((prev) => [...prev, { id: uid('res-'), testName: '', value: '', unit: '', referenceRange: '', status: 'review_recommended', userVerified: false }]);
  const removeResult = (id: string) => setVerifyResults((prev) => prev.filter((r) => r.id !== id));

  // ── Medicine helpers ────────────────────────────────────────────────────────

  const updateMedicine = (id: string, field: keyof ExtractedMedicine, value: string) => {
    setVerifyMedicines((prev) => prev.map((m) => m.id !== id ? m : { ...m, [field]: value }));
  };
  const addManualMedicine = () => setVerifyMedicines((prev) => [...prev, { id: uid('med-x-'), name: '', dosage: '', frequency: 'As directed', userVerified: false }]);
  const removeMedicine = (id: string) => setVerifyMedicines((prev) => prev.filter((m) => m.id !== id));

  // ── Diagnosis helpers ───────────────────────────────────────────────────────

  const updateDiagnosis = (id: string, field: keyof ExtractedDiagnosis, value: string) => {
    setVerifyDiagnoses((prev) => prev.map((d) => d.id !== id ? d : { ...d, [field]: value }));
  };
  const addManualDiagnosis = () => setVerifyDiagnoses((prev) => [...prev, { id: uid('dx-'), text: '', type: 'primary', userVerified: false }]);
  const removeDiagnosis = (id: string) => setVerifyDiagnoses((prev) => prev.filter((d) => d.id !== id));

  const loadSample = (type: 'lab' | 'rx' | 'rx_bilingual' | 'dc') => {
    const samples = {
      lab: sampleReportText,
      rx: samplePrescriptionText,
      rx_bilingual: sampleBilingualPrescriptionText,
      dc: sampleDischargeSummaryText,
    };
    setPasteText(samples[type]);
    setPasteMode(true);
  };

  const docMeta = extraction ? DOC_TYPE_META[extraction.documentType] : null;
  const tabCount = {
    labs: verifyResults.length,
    medicines: verifyMedicines.length,
    diagnoses: verifyDiagnoses.length,
    discharge: extraction?.dischargeSummary ? 1 : 0,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Medical Reports"
        subtitle="Upload, analyze, and understand your medical reports"
        icon={<FileText className="w-5 h-5" />}
        action={<Button size="sm" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>Upload Report</Button>}
      />

      {reports.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No medical reports yet"
            description="Upload lab reports, prescriptions, discharge summaries, or any medical document for AI-powered extraction and analysis."
            action={<Button size="sm" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>Upload Report</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => {
            const sc = statusColor(r.status);
            const docType = r.documentType ?? 'unknown';
            const dtMeta = DOC_TYPE_META[docType];
            const outsideCount = r.results.filter((res) => res.status === 'outside_range').length;
            return (
              <Card key={r.id} hover className="p-5" onClick={() => navigateWithParams('report-analysis', { reportId: r.id })}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    {dtMeta.icon}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={r.status === 'analyzed' ? 'teal' : 'blue'}>{sc.label}</Badge>
                    <span className="text-[10px] text-navy-400 font-medium">{dtMeta.label}</span>
                  </div>
                </div>
                <h3 className="font-semibold text-navy-800 mb-1 line-clamp-2">{r.title}</h3>
                <p className="text-xs text-navy-400 mb-2">{formatDate(r.reportDate)}</p>
                {r.provider && <p className="text-xs text-navy-500 mb-2">{r.provider}</p>}
                <div className="flex flex-wrap items-center gap-2 text-xs text-navy-400 mb-3">
                  {r.results.length > 0 && <span>{r.results.length} lab results</span>}
                  {(r.medicines?.length ?? 0) > 0 && <span>{r.medicines!.length} medicines</span>}
                  {(r.diagnoses?.length ?? 0) > 0 && <span>{r.diagnoses!.length} diagnoses</span>}
                  {outsideCount > 0 && <Badge variant="red">{outsideCount} outside range</Badge>}
                </div>
                {r.source === 'demo' && <div className="mb-2"><Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Data</Badge></div>}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  <button className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                    <Eye className="w-3.5 h-3.5" /> View Analysis
                  </button>
                  {r.source !== 'demo' && (
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Upload Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); resetUpload(); }}
        title="Upload Medical Document"
        subtitle="Supports lab reports, prescriptions, discharge summaries, and more — PDF, image, or pasted text"
        size="xl"
        footer={extraction ? (
          <>
            <Button variant="ghost" onClick={resetUpload} disabled={saving}>Start Over</Button>
            <Button
              onClick={handleSaveVerified}
              disabled={saving}
              leftIcon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isGroqAvailable() ? <Zap className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            >
              {saving ? 'Analysing…' : isGroqAvailable() ? 'Save & Analyse with Groq' : 'Save & Analyze'}
            </Button>
          </>
        ) : undefined}
      >
        {!extraction ? (
          <div className="space-y-4">
            {/* Mode toggle & OCR Language Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                <button onClick={() => setPasteMode(false)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!pasteMode ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400'}`}>
                  Upload File
                </button>
                <button onClick={() => setPasteMode(true)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${pasteMode ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400'}`}>
                  Paste Text
                </button>
              </div>

              {/* OCR language pill selector */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-navy-500 font-medium flex items-center gap-1 mr-1">
                  <Languages className="w-3.5 h-3.5 text-teal-600" /> OCR Language:
                </span>
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setOcrLang(l.code)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      ocrLang === l.code
                        ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-600'
                        : 'bg-white text-navy-600 border border-slate-200 hover:border-teal-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{l.flag}</span>
                    <span>{l.nativeName}</span>
                  </button>
                ))}
              </div>
            </div>

            {!pasteMode ? (
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-slate-300 hover:border-teal-300 hover:bg-slate-50'}`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto mb-4">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <p className="font-medium text-navy-700 mb-1">Drop your file here or click to browse</p>
                  <p className="text-sm text-navy-400">Supports PDF, JPG, JPEG, PNG — Lab reports, Prescriptions, Discharge summaries</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                  />
                </div>
                {processing && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-navy-600">
                      <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                      <span className="truncate">{progressLabel || `Processing ${uploadedFile?.name}…`}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                    </div>
                    <p className="text-xs text-navy-400">{uploadProgress}% complete</p>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-navy-500">Paste your document text below:</p>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => loadSample('lab')} className="text-xs text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1">
                      <ClipboardPaste className="w-3.5 h-3.5" /> Lab Report
                    </button>
                    <button onClick={() => loadSample('rx')} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                      <Pill className="w-3.5 h-3.5" /> Prescription
                    </button>
                    <button onClick={() => loadSample('rx_bilingual')} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5" /> Bilingual Prescription (हिन्दी/Eng)
                    </button>
                    <button onClick={() => loadSample('dc')} className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                      <FileHeart className="w-3.5 h-3.5" /> Discharge
                    </button>
                  </div>
                </div>
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste your lab report, prescription, or discharge summary text here..."
                  rows={10}
                  className="input-base font-mono text-sm"
                />
                <Button onClick={handlePaste} disabled={!pasteText.trim() || processing} leftIcon={processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}>
                  {processing ? 'Processing...' : 'Extract Data'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ── Verification UI ────────────────────────────────────────── */
          <div className="space-y-5">
            {/* Status banner */}
            <div className="flex items-start gap-3 p-4 bg-teal-50 rounded-xl">
              <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-teal-700">
                    Extraction complete{extraction?.ocrUsed ? ' (OCR)' : ''}
                  </p>
                  {docMeta && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white text-xs font-medium text-navy-600 border border-slate-200">
                      {docMeta.icon} {docMeta.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-teal-600">
                  {verifyResults.length} lab results · {verifyMedicines.length} medicines · {verifyDiagnoses.length} diagnoses extracted. Verify before saving.
                </p>
                {extraction?.ocrUsed && (
                  <p className="text-xs text-amber-600 mt-1 font-medium">⚠️ OCR was used — verify all values against your original document.</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Document Name</label>
                <input className="input-base" value={verifyMeta.title} onChange={(e) => setVerifyMeta({ ...verifyMeta, title: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Date</label>
                <input type="date" className="input-base" value={verifyMeta.date} onChange={(e) => setVerifyMeta({ ...verifyMeta, date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Provider / Doctor</label>
                <input className="input-base" value={verifyMeta.provider} onChange={(e) => setVerifyMeta({ ...verifyMeta, provider: e.target.value })} />
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {([
                { key: 'labs',      label: 'Lab Results',  count: tabCount.labs },
                { key: 'medicines', label: 'Medicines',    count: tabCount.medicines },
                { key: 'diagnoses', label: 'Diagnoses',    count: tabCount.diagnoses },
                { key: 'discharge', label: 'Discharge',    count: tabCount.discharge },
              ] as const).map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === key ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400'}`}
                >
                  {label}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${activeTab === key ? 'bg-teal-100 text-teal-700' : 'bg-slate-200 text-navy-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Lab Results tab ─────────────────────────────────────── */}
            {activeTab === 'labs' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-navy-800">Lab Test Results</h4>
                  <Button size="sm" variant="outline" onClick={addManualResult}><Plus className="w-3.5 h-3.5 mr-1" />Add Result</Button>
                </div>
                {verifyResults.length === 0 ? (
                  <div className="p-6 bg-amber-50 rounded-xl text-center">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm text-amber-700">No lab results extracted. Add manually or check another tab for medicines/diagnoses.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {verifyResults.map((r) => {
                      const sc = statusColor(r.status);
                      return (
                        <div key={r.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-xl">
                          <input className="col-span-3 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Test name" value={r.testName} onChange={(e) => updateResult(r.id, 'testName', e.target.value)} />
                          <input className="col-span-2 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Value" value={r.value} onChange={(e) => updateResult(r.id, 'value', e.target.value)} />
                          <input className="col-span-2 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Unit" value={r.unit} onChange={(e) => updateResult(r.id, 'unit', e.target.value)} />
                          <input className="col-span-3 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Reference range" value={r.referenceRange ?? ''} onChange={(e) => updateResult(r.id, 'referenceRange', e.target.value)} />
                          <div className="col-span-1 flex items-center justify-center">
                            <Badge variant={r.status === 'within_range' ? 'teal' : r.status === 'outside_range' ? 'red' : 'amber'}>
                              <span className="text-[10px]">{sc.label.split(' ')[0]}</span>
                            </Badge>
                          </div>
                          <div className="col-span-1 flex justify-center">
                            <button onClick={() => removeResult(r.id)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── Medicines tab ───────────────────────────────────────── */}
            {activeTab === 'medicines' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-navy-800">Medicines & Dosages</h4>
                  <Button size="sm" variant="outline" onClick={addManualMedicine}><Plus className="w-3.5 h-3.5 mr-1" />Add Medicine</Button>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl mb-3">
                  <p className="text-xs text-blue-700"><Pill className="w-3.5 h-3.5 inline mr-1" />These medicines were extracted from the document. Verify all details — HealthPilot never prescribes medication.</p>
                </div>
                {verifyMedicines.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl text-center">
                    <Pill className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-navy-500">No medicines detected. This may not be a prescription — try adding manually.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {verifyMedicines.map((m) => (
                      <div key={m.id} className="p-3 bg-slate-50 rounded-xl space-y-2">
                        <div className="grid grid-cols-12 gap-2 items-start">
                          <input className="col-span-4 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Medicine name" value={m.name} onChange={(e) => updateMedicine(m.id, 'name', e.target.value)} />
                          <input className="col-span-3 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Dosage (e.g. 500mg)" value={m.dosage} onChange={(e) => updateMedicine(m.id, 'dosage', e.target.value)} />
                          <input className="col-span-3 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Frequency" value={m.frequency} onChange={(e) => updateMedicine(m.id, 'frequency', e.target.value)} />
                          <input className="col-span-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Duration" value={m.duration ?? ''} onChange={(e) => updateMedicine(m.id, 'duration', e.target.value)} />
                          <div className="col-span-1 flex justify-center pt-1.5">
                            <button onClick={() => removeMedicine(m.id)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                        {m.instructions && (
                          <p className="text-xs text-navy-400 italic px-1">{m.instructions}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Diagnoses tab ───────────────────────────────────────── */}
            {activeTab === 'diagnoses' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-navy-800">Extracted Diagnoses</h4>
                  <Button size="sm" variant="outline" onClick={addManualDiagnosis}><Plus className="w-3.5 h-3.5 mr-1" />Add Diagnosis</Button>
                </div>
                {verifyDiagnoses.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl text-center">
                    <Stethoscope className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-navy-500">No diagnoses detected. Check the document type or add manually.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {verifyDiagnoses.map((d) => (
                      <div key={d.id} className="grid grid-cols-12 gap-2 items-center p-3 bg-slate-50 rounded-xl">
                        <input className="col-span-6 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="Diagnosis" value={d.text} onChange={(e) => updateDiagnosis(d.id, 'text', e.target.value)} />
                        <input className="col-span-2 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" placeholder="ICD Code" value={d.icdCode ?? ''} onChange={(e) => updateDiagnosis(d.id, 'icdCode', e.target.value)} />
                        <select className="col-span-3 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white" value={d.type} onChange={(e) => updateDiagnosis(d.id, 'type', e.target.value)}>
                          <option value="primary">Primary</option>
                          <option value="secondary">Secondary</option>
                          <option value="differential">Differential</option>
                        </select>
                        <div className="col-span-1 flex justify-center">
                          <button onClick={() => removeDiagnosis(d.id)} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Discharge Summary tab ───────────────────────────────── */}
            {activeTab === 'discharge' && (
              <div>
                <h4 className="font-semibold text-navy-800 mb-3">Discharge Summary Details</h4>
                {extraction?.dischargeSummary ? (
                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { label: 'Date of Admission', value: extraction.dischargeSummary.admissionDate },
                        { label: 'Date of Discharge', value: extraction.dischargeSummary.dischargeDate },
                        { label: 'Attending Physician', value: extraction.dischargeSummary.attendingPhysician },
                        { label: 'Ward / Department', value: extraction.dischargeSummary.ward },
                        { label: 'Follow-up Date', value: extraction.dischargeSummary.followUpDate },
                      ].map(({ label, value }) => (
                        <div key={label} className="p-3 bg-slate-50 rounded-xl">
                          <p className="text-xs text-navy-400 mb-0.5">{label}</p>
                          <p className="text-sm font-medium text-navy-700">{value || '—'}</p>
                        </div>
                      ))}
                    </div>
                    {extraction.dischargeSummary.admittingDiagnosis && (
                      <div className="p-3 bg-amber-50 rounded-xl">
                        <p className="text-xs text-amber-600 font-medium mb-1">Admitting Diagnosis</p>
                        <p className="text-sm text-navy-700">{extraction.dischargeSummary.admittingDiagnosis}</p>
                      </div>
                    )}
                    {extraction.dischargeSummary.dischargeDiagnosis && (
                      <div className="p-3 bg-red-50 rounded-xl">
                        <p className="text-xs text-red-600 font-medium mb-1">Discharge Diagnosis</p>
                        <p className="text-sm text-navy-700">{extraction.dischargeSummary.dischargeDiagnosis}</p>
                      </div>
                    )}
                    {(extraction.dischargeSummary.procedures?.length ?? 0) > 0 && (
                      <div className="p-3 bg-slate-50 rounded-xl">
                        <p className="text-xs text-navy-400 font-medium mb-1">Procedures</p>
                        <ul className="space-y-1">
                          {extraction.dischargeSummary.procedures!.map((proc, i) => (
                            <li key={i} className="text-sm text-navy-700 flex items-start gap-1.5">
                              <span className="text-teal-500 mt-0.5">•</span> {proc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {extraction.dischargeSummary.followUpInstructions && (
                      <div className="p-3 bg-teal-50 rounded-xl">
                        <p className="text-xs text-teal-600 font-medium mb-1">Follow-up Instructions</p>
                        <p className="text-sm text-navy-700">{extraction.dischargeSummary.followUpInstructions}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-slate-50 rounded-xl text-center">
                    <FileHeart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-navy-500">No discharge summary data extracted. This document may not be a discharge summary.</p>
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-navy-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Please verify all values match your original document before saving.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
