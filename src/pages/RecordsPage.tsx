import { useState, useMemo, useRef } from 'react';
import { FolderOpen, Search, Upload, Trash2, Eye, FileText, FlaskConical, Pill, Stethoscope, Syringe, X, Sparkles, Edit2, Brain, FileHeart, Download } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { HealthSummaryModal } from '@/components/ui/HealthSummaryModal';
import { formatDate, statusColor, categoryLabel, uid, nowISO } from '@/utils/helpers';
import { generateHealthRecordSummary, isGroqAvailable } from '@/services/groqService';
import type { PlainLanguageSummary } from '@/services/groqService';
import type { HealthRecord, RecordCategory } from '@/types';
import { useLanguage } from '@/context/LanguageContext';
import { generateFhirBundle, downloadFhirBundle } from '@/services/fhirService';

const iconMap: Record<string, typeof FileText> = {
  medical_report: FileText,
  lab_result: FlaskConical,
  prescription: Pill,
  doctor_note: Stethoscope,
  vaccination: Syringe,
  other: FolderOpen,
};

export function RecordsPage() {
  const { state, dispatch, isDemo } = useApp();
  const { navigate, navigateWithParams } = useRouter();
  const { showToast } = useToast();
  const { summaryLang } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [newRecord, setNewRecord] = useState({ title: '', category: 'other' as RecordCategory, date: '', provider: '', notes: '' });

  // AI Summary state
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryRecord, setSummaryRecord] = useState<HealthRecord | null>(null);
  const [summary, setSummary] = useState<PlainLanguageSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const summaryAbort = useRef<AbortController | null>(null);

  const filteredRecords = useMemo(() => {
    let records = [...state.records, ...state.reports.map((r) => ({ ...r, status: r.status as 'uploaded' | 'analyzed' | 'pending' }))];
    if (search) records = records.filter((r) => r.title.toLowerCase().includes(search.toLowerCase()) || (r.provider ?? '').toLowerCase().includes(search.toLowerCase()));
    if (filterCategory !== 'all') records = records.filter((r) => r.category === filterCategory);
    records.sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'date-asc') return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });
    return records;
  }, [state.records, state.reports, search, filterCategory, sortBy]);

  const handleDelete = (id: string) => {
    dispatch({ type: 'DELETE_RECORD', id });
    showToast('Record deleted.', 'success');
    if (summaryRecord?.id === id) setSummaryOpen(false);
  };

  const openEdit = (record: HealthRecord) => {
    setEditingRecord(record);
    setNewRecord({
      title: record.title,
      category: record.category,
      date: record.date.split('T')[0],
      provider: record.provider ?? '',
      notes: record.notes ?? '',
    });
    setUploadOpen(true);
  };

  const handleSaveRecord = () => {
    if (!newRecord.title.trim()) {
      showToast('Please enter a title for the record.', 'error');
      return;
    }
    if (editingRecord) {
      const updated: HealthRecord = {
        ...editingRecord,
        title: newRecord.title,
        category: newRecord.category,
        date: newRecord.date || nowISO().split('T')[0],
        provider: newRecord.provider || undefined,
        notes: newRecord.notes || undefined,
        updatedAt: nowISO(),
      };
      dispatch({ type: 'ADD_RECORD', record: updated });
      dispatch({ type: 'DELETE_RECORD', id: editingRecord.id });
      showToast('Record updated successfully.', 'success');
    } else {
      const record: HealthRecord = {
        id: uid('rec-'),
        title: newRecord.title,
        category: newRecord.category,
        date: newRecord.date || nowISO().split('T')[0],
        provider: newRecord.provider || undefined,
        status: 'uploaded',
        source: isDemo ? 'demo' : 'user',
        notes: newRecord.notes || undefined,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      dispatch({ type: 'ADD_RECORD', record });
      showToast('Record added successfully.', 'success');
    }
    setNewRecord({ title: '', category: 'other', date: '', provider: '', notes: '' });
    setEditingRecord(null);
    setUploadOpen(false);
  };

  const isReport = (r: HealthRecord) => state.reports.some((rep) => rep.id === r.id);

  const handleOpenSummary = async (record: HealthRecord) => {
    if (!isGroqAvailable()) {
      showToast('AI is not configured. Add your Groq API key to .env.', 'error');
      return;
    }
    // Cancel any in-flight request
    summaryAbort.current?.abort();
    const ctrl = new AbortController();
    summaryAbort.current = ctrl;

    setSummaryRecord(record);
    setSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    setSummaryOpen(true);

    // If this record is a full MedicalReport, pass it directly
    const fullRecord = state.reports.find((r) => r.id === record.id) ?? record;

    try {
      const result = await generateHealthRecordSummary(fullRecord, state.profile, ctrl.signal, summaryLang);
      setSummary(result);
    } catch (err) {
      if ((err as { name?: string }).name === 'AbortError') return;
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Records"
        subtitle="Organize and manage all your health documents"
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<FileHeart className="w-4 h-4 text-teal-600" />}
              onClick={() => navigate('abha')}
            >
              ABHA & Records
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download className="w-4 h-4 text-navy-600" />}
              onClick={() => {
                const { bundle } = generateFhirBundle(state);
                downloadFhirBundle(bundle);
                showToast('FHIR JSON bundle downloaded!', 'success');
              }}
            >
              Export FHIR
            </Button>
            <Button size="sm" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>
              Add Record
            </Button>
          </div>
        }
      />

      {/* Filters */}
      <Card>
        <CardBody className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <Input placeholder="Search records..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
            <Select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              options={[
                { value: 'all', label: 'All categories' },
                { value: 'medical_report', label: 'Medical Reports' },
                { value: 'lab_result', label: 'Lab Results' },
                { value: 'prescription', label: 'Prescriptions' },
                { value: 'doctor_note', label: 'Doctor Notes' },
                { value: 'vaccination', label: 'Vaccination Records' },
                { value: 'other', label: 'Other' },
              ]} />
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
              options={[
                { value: 'date-desc', label: 'Newest first' },
                { value: 'date-asc', label: 'Oldest first' },
                { value: 'title', label: 'Title (A-Z)' },
              ]} />
          </div>
          {(search || filterCategory !== 'all') && (
            <button onClick={() => { setSearch(''); setFilterCategory('all'); }} className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-600">
              <X className="w-3 h-3" /> Clear filters
            </button>
          )}
        </CardBody>
      </Card>

      {/* Records list */}
      {filteredRecords.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FolderOpen className="w-8 h-8" />}
            title="No health records yet"
            description="Upload your first report to begin organizing your healthcare information."
            action={<Button size="sm" leftIcon={<Upload className="w-4 h-4" />} onClick={() => setUploadOpen(true)}>Add Record</Button>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((r) => {
            const Icon = iconMap[r.category] ?? FileText;
            const sc = statusColor(r.status);
            const report = isReport(r);
            return (
              <Card key={r.id} hover className="p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <Badge variant={r.status === 'analyzed' ? 'teal' : 'blue'}>{sc.label}</Badge>
                </div>
                <h3 className="font-semibold text-navy-800 mb-1 truncate">{r.title}</h3>
                <p className="text-xs text-navy-400 mb-3">{categoryLabel(r.category)} · {formatDate(r.date)}</p>
                {r.provider && <p className="text-xs text-navy-500 mb-3">{r.provider}</p>}
                {r.source === 'demo' && <div className="mb-3"><Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Data</Badge></div>}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-50">
                  {report ? (
                    <button onClick={() => navigateWithParams('report-analysis', { reportId: r.id })} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                      <Eye className="w-3.5 h-3.5" /> View Analysis
                    </button>
                  ) : (
                    <button onClick={() => showToast('Record viewer coming soon', 'info')} className="flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium">
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenSummary(r)}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                    title="Explain this record in plain language"
                  >
                    <Brain className="w-3.5 h-3.5" /> AI Summary
                  </button>
                  {!isReport(r) && (
                    <>
                      <button onClick={() => openEdit(r)} className="flex items-center gap-1 text-xs text-navy-500 hover:text-navy-700 font-medium">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-medium ml-auto">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Record Modal */}
      <Modal
        open={uploadOpen}
        onClose={() => { setUploadOpen(false); setEditingRecord(null); }}
        title={editingRecord ? 'Edit Health Record' : 'Add Health Record'}
        subtitle="Manually add or update a health document in your records"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setUploadOpen(false); setEditingRecord(null); }}>Cancel</Button>
            <Button onClick={handleSaveRecord}>{editingRecord ? 'Save Changes' : 'Add Record'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Title" placeholder="e.g., Annual Physical Exam" value={newRecord.title} onChange={(e) => setNewRecord({ ...newRecord, title: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Category" value={newRecord.category} onChange={(e) => setNewRecord({ ...newRecord, category: e.target.value as RecordCategory })}
              options={[
                { value: 'medical_report', label: 'Medical Report' },
                { value: 'lab_result', label: 'Lab Result' },
                { value: 'prescription', label: 'Prescription' },
                { value: 'doctor_note', label: 'Doctor Note' },
                { value: 'vaccination', label: 'Vaccination' },
                { value: 'other', label: 'Other' },
              ]} />
            <Input label="Date" type="date" value={newRecord.date} onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })} />
          </div>
          <Input label="Provider (optional)" placeholder="e.g., Dr. Sarah Chen" value={newRecord.provider} onChange={(e) => setNewRecord({ ...newRecord, provider: e.target.value })} />
          <Input label="Notes (optional)" placeholder="Any additional notes" value={newRecord.notes} onChange={(e) => setNewRecord({ ...newRecord, notes: e.target.value })} />
          <div className="p-3 bg-blue-50 rounded-xl flex items-start gap-2">
            <Upload className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">To upload and analyze a medical report with AI extraction, use the Medical Reports page.</p>
          </div>
        </div>
      </Modal>

      {/* AI Health Summary Modal */}
      <HealthSummaryModal
        open={summaryOpen}
        onClose={() => { setSummaryOpen(false); summaryAbort.current?.abort(); }}
        record={summaryRecord}
        summary={summary}
        loading={summaryLoading}
        error={summaryError}
      />
    </div>
  );
}
