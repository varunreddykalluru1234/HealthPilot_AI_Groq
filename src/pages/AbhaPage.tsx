import { useState, useMemo } from 'react';
import {
  FileHeart, Shield, CheckCircle2, AlertTriangle, ArrowRight, Download,
  ExternalLink, Sparkles, Building2, User, Phone, Calendar, Copy,
  Check, X, FileText, FlaskConical, Pill, Stethoscope, RefreshCw,
  Eye, Code2, Link2, Unlink, Layers, Activity
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useRouter } from '@/context/RouterContext';
import { useToast } from '@/components/Toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { SAMPLE_ABHA_RECORDS, type SampleAbhaRecord } from '@/data/abhaDemoRecords';
import {
  generateFhirBundle,
  downloadFhirBundle,
  convertReportToFhirDiagnosticReport,
  convertMedicationToFhirMedicationRequest,
  convertRecordToFhirDocumentReference,
  convertProfileToFhirPatient,
  type FhirBundle,
} from '@/services/fhirService';
import { formatDate, nowISO, uid } from '@/utils/helpers';
import type { AbhaConnection, HealthRecord, MedicalReport, Medication, TimelineEvent } from '@/types';

export function AbhaPage() {
  const { state, dispatch, isDemo } = useApp();
  const { navigate, navigateWithParams } = useRouter();
  const { showToast } = useToast();

  // Connection modal state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [disconnectModalOpen, setDisconnectModalOpen] = useState(false);
  const [connectForm, setConnectForm] = useState({
    abhaId: '91-8842-1049-5521',
    abhaAddress: (state.profile?.fullName ? state.profile.fullName.toLowerCase().replace(/\s+/g, '.') : 'jordan.avery') + '@abdm',
    fullName: state.profile?.fullName || 'Jordan Avery',
    gender: state.profile?.gender || 'Female',
    dateOfBirth: state.profile?.dateOfBirth || '1992-03-15',
    mobile: '9876543210',
    hipName: 'Apollo Hospitals & Diagnostics (Simulated HIP)',
    consentGiven: false,
  });

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);

  // FHIR preview modal state
  const [fhirPreviewOpen, setFhirPreviewOpen] = useState(false);
  const [copiedFhir, setCopiedFhir] = useState(false);

  // Record detail modal state
  const [viewRecordModal, setViewRecordModal] = useState<SampleAbhaRecord | null>(null);
  const [viewFhirModal, setViewFhirModal] = useState<{ title: string; json: string } | null>(null);

  // Filter state for imported records
  const [recordFilter, setRecordFilter] = useState<'all' | 'lab_result' | 'prescription' | 'doctor_note'>('all');

  const abha = state.abhaConnection;
  const isConnected = Boolean(abha?.isConnected);

  // Identify which demo records have been imported
  const importedIds = state.importedAbhaRecordIds || [];

  // Filter imported records currently in state
  const currentImportedRecords = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      category: 'lab_result' | 'prescription' | 'doctor_note' | 'other';
      provider: string;
      date: string;
      source: string;
      report?: MedicalReport;
      record?: HealthRecord;
      medication?: Medication;
    }> = [];

    // From reports
    for (const rpt of state.reports) {
      if (rpt.source === 'demo' && (rpt.id.startsWith('abha-') || importedIds.includes(rpt.id) || rpt.provider?.includes('HIP'))) {
        list.push({
          id: rpt.id,
          title: rpt.title,
          category: rpt.category as any,
          provider: rpt.provider || 'ABDM Healthcare Provider',
          date: rpt.reportDate || rpt.date,
          source: rpt.source,
          report: rpt,
        });
      }
    }

    // From records
    for (const rec of state.records) {
      if (rec.source === 'demo' && (rec.id.startsWith('abha-') || importedIds.includes(rec.id) || rec.provider?.includes('Hospital') || rec.provider?.includes('Max'))) {
        // avoid duplicating if also report
        if (!list.some((item) => item.id === rec.id)) {
          list.push({
            id: rec.id,
            title: rec.title,
            category: rec.category as any,
            provider: rec.provider || 'ABDM Healthcare Provider',
            date: rec.date,
            source: rec.source,
            record: rec,
          });
        }
      }
    }

    // Filter by category
    if (recordFilter === 'all') return list;
    return list.filter((r) => r.category === recordFilter);
  }, [state.reports, state.records, state.medications, importedIds, recordFilter]);

  // Generate FHIR bundle summary
  const fhirSummary = useMemo(() => {
    return generateFhirBundle(state);
  }, [state]);

  // Open Connect Modal with preset defaults
  const handleOpenConnect = () => {
    setConnectForm({
      abhaId: '91-8842-1049-5521',
      abhaAddress: (state.profile?.fullName ? state.profile.fullName.toLowerCase().replace(/\s+/g, '.') : 'jordan.avery') + '@abdm',
      fullName: state.profile?.fullName || 'Jordan Avery',
      gender: state.profile?.gender || 'Female',
      dateOfBirth: state.profile?.dateOfBirth || '1992-03-15',
      mobile: '9876543210',
      hipName: 'Apollo Hospitals & Diagnostics (Simulated HIP)',
      consentGiven: false,
    });
    setConnectModalOpen(true);
  };

  // Submit mock connection
  const handleConfirmConnect = () => {
    if (!connectForm.consentGiven) {
      showToast('Please confirm simulated consent before connecting.', 'error');
      return;
    }

    const connection: AbhaConnection = {
      isConnected: true,
      abhaId: connectForm.abhaId.trim(),
      abhaAddress: connectForm.abhaAddress.trim(),
      fullName: connectForm.fullName.trim(),
      gender: connectForm.gender,
      dateOfBirth: connectForm.dateOfBirth,
      mobile: connectForm.mobile ? `+91 ${connectForm.mobile.slice(0, 2)}******${connectForm.mobile.slice(-2)}` : '+91 98******10',
      hipName: connectForm.hipName,
      connectedAt: nowISO(),
      consentGiven: true,
    };

    dispatch({ type: 'CONNECT_ABHA', connection });
    setConnectModalOpen(false);
    showToast('Demo ABHA Account connected successfully!', 'success');
  };

  // Disconnect mock account
  const handleConfirmDisconnect = () => {
    dispatch({ type: 'DISCONNECT_ABHA' });
    setDisconnectModalOpen(false);
    showToast('Demo ABHA Account disconnected.', 'info');
  };

  // Open Import Modal and pre-select unimported items
  const handleOpenImport = () => {
    // Default selection: any records not yet imported
    const unimported = SAMPLE_ABHA_RECORDS
      .filter((rec) => !isRecordAlreadyImported(rec))
      .map((rec) => rec.id);
    setSelectedRecordIds(unimported);
    setImportModalOpen(true);
  };

  const isRecordAlreadyImported = (sample: SampleAbhaRecord) => {
    if (importedIds.includes(sample.id)) return true;
    if (sample.report && state.reports.some((r) => r.title === sample.report!.title)) return true;
    if (sample.record && state.records.some((r) => r.title === sample.record!.title)) return true;
    return false;
  };

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllRecords = () => {
    const available = SAMPLE_ABHA_RECORDS
      .filter((rec) => !isRecordAlreadyImported(rec))
      .map((r) => r.id);
    if (selectedRecordIds.length === available.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(available);
    }
  };

  // Perform demo record import
  const handleExecuteImport = () => {
    if (selectedRecordIds.length === 0) {
      showToast('No records selected for import.', 'error');
      return;
    }

    const recordsToAdd: HealthRecord[] = [];
    const reportsToAdd: MedicalReport[] = [];
    const medsToAdd: Medication[] = [];
    const timelineEvents: TimelineEvent[] = [];
    const newImportedIds: string[] = [];

    const selectedSamples = SAMPLE_ABHA_RECORDS.filter((s) => selectedRecordIds.includes(s.id));

    for (const sample of selectedSamples) {
      newImportedIds.push(sample.id);

      if (sample.report) {
        reportsToAdd.push(sample.report);
        timelineEvents.push({
          id: `tl-abha-${Date.now()}-${uid()}`,
          date: sample.report.reportDate || sample.report.date,
          category: 'report',
          description: `ABHA Record Imported: ${sample.report.title} (${sample.provider})`,
          source: 'demo',
          relatedId: sample.report.id,
          createdAt: nowISO(),
        });
      }

      if (sample.record) {
        recordsToAdd.push(sample.record);
        timelineEvents.push({
          id: `tl-abha-${Date.now()}-${uid()}`,
          date: sample.record.date,
          category: 'record',
          description: `ABHA Record Imported: ${sample.record.title} (${sample.provider})`,
          source: 'demo',
          relatedId: sample.record.id,
          createdAt: nowISO(),
        });
      }

      if (sample.medications) {
        for (const med of sample.medications) {
          medsToAdd.push(med);
          timelineEvents.push({
            id: `tl-abha-${Date.now()}-${uid()}`,
            date: med.startDate,
            category: 'medication',
            description: `ABHA Medication Linked: ${med.name} ${med.dosage} (${med.frequency})`,
            source: 'demo',
            relatedId: med.id,
            createdAt: nowISO(),
          });
        }
      }
    }

    dispatch({
      type: 'IMPORT_ABHA_RECORDS',
      records: recordsToAdd,
      reports: reportsToAdd,
      medications: medsToAdd,
      importedIds: newImportedIds,
      timelineEvents,
    });

    setImportConfirmOpen(false);
    setImportModalOpen(false);
    showToast(`Successfully imported ${selectedSamples.length} demo records into your profile and timeline!`, 'success');
  };

  // FHIR JSON Export
  const handleExportFhirJson = () => {
    try {
      const { bundle } = generateFhirBundle(state);
      downloadFhirBundle(bundle);
      showToast('FHIR R4 Bundle JSON exported successfully!', 'success');
    } catch (err) {
      console.error('FHIR export error:', err);
      showToast('Error exporting FHIR JSON.', 'error');
    }
  };

  const handleCopyFhirJson = () => {
    const jsonStr = JSON.stringify(fhirSummary.bundle, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedFhir(true);
    showToast('FHIR JSON copied to clipboard!', 'success');
    setTimeout(() => setCopiedFhir(false), 2000);
  };

  // View individual record FHIR representation
  const handleViewRecordFhir = (sample: SampleAbhaRecord) => {
    const patientRes = convertProfileToFhirPatient(state.profile, state.abhaConnection);
    const patientRef = { reference: `urn:uuid:${patientRes.id}`, display: patientRes.name?.[0]?.text };

    let resource: any;
    if (sample.report) {
      resource = convertReportToFhirDiagnosticReport(sample.report, patientRef, []);
    } else if (sample.medications && sample.medications[0]) {
      resource = convertMedicationToFhirMedicationRequest(sample.medications[0], patientRef);
    } else if (sample.record) {
      resource = convertRecordToFhirDocumentReference(sample.record, patientRef);
    }

    setViewFhirModal({
      title: `${sample.title} — FHIR R4 Resource`,
      json: JSON.stringify(resource, null, 2),
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="ABHA & Health Records"
        subtitle="Ayushman Bharat Digital Mission (ABDM) integration simulation and FHIR R4 health data exchange"
        icon={<FileHeart className="w-5 h-5 text-teal-600" />}
      />

      {/* Prominent Demo Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 shadow-sm flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-700">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-bold text-amber-900">DEMO ONLY — SIMULATED ABDM GATEWAY</h4>
            <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Environment</Badge>
          </div>
          <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
            This module simulates an Ayushman Bharat Health Account (ABHA) connection and FHIR R4 medical record synchronization.
            It does <strong>not</strong> connect to the National Health Authority (NHA) production gateway, does not authenticate real identity,
            and preserves client-side privacy.
          </p>
        </div>
      </div>

      {/* Top Action Bar: Connect, Import, Export */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`w-3.5 h-3.5 rounded-full ${isConnected ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-slate-300'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-navy-400 uppercase tracking-wider">Status:</span>
              <span className={`text-sm font-bold ${isConnected ? 'text-emerald-700' : 'text-navy-600'}`}>
                {isConnected ? 'Demo Connected' : 'Not Connected'}
              </span>
            </div>
            <p className="text-xs text-navy-400 mt-0.5">
              {isConnected
                ? `ABHA ID: ${abha?.abhaId || '91-8842-1049-5521'}`
                : 'Connect a fictional ABHA ID to test record exchange'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isConnected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDisconnectModalOpen(true)}
              leftIcon={<Unlink className="w-4 h-4 text-red-500" />}
              className="text-red-600 hover:border-red-300"
            >
              Disconnect (Demo)
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenConnect}
              leftIcon={<Link2 className="w-4 h-4" />}
            >
              Connect ABHA (Demo)
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenImport}
            leftIcon={<Download className="w-4 h-4 text-teal-600" />}
          >
            Import Demo Records
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportFhirJson}
            leftIcon={<FileText className="w-4 h-4" />}
          >
            Export FHIR JSON
          </Button>
        </div>
      </div>

      {/* 2-Column Overview: Explainer + Connection Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: ABHA in Simple Language */}
        <div className="lg:col-span-7 space-y-6">
          <Card>
            <CardHeader
              title="What is ABHA?"
              subtitle="Ayushman Bharat Health Account explained simply"
              icon={<Building2 className="w-5 h-5" />}
              action={<Badge variant="teal">ABDM Ready</Badge>}
            />
            <CardBody className="space-y-4">
              <p className="text-sm text-navy-600 leading-relaxed">
                An <strong>Ayushman Bharat Health Account (ABHA)</strong> is a unique 14-digit digital identifier created under India’s 
                <strong> Ayushman Bharat Digital Mission (ABDM)</strong>. It serves as your permanent digital address for all your health information.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-800">Unified Health History</h5>
                    <p className="text-[11px] text-navy-500 mt-0.5">Link prescriptions, diagnostics, and discharge summaries across different hospitals seamlessly.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-800">Consent-Driven Access</h5>
                    <p className="text-[11px] text-navy-500 mt-0.5">You grant and revoke digital consent before any doctor or hospital accesses your records.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-800">Standardized FHIR R4</h5>
                    <p className="text-[11px] text-navy-500 mt-0.5">Records follow international HL7 FHIR formats for seamless lab & vital observations.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</div>
                  <div>
                    <h5 className="text-xs font-bold text-navy-800">Paperless Consultations</h5>
                    <p className="text-[11px] text-navy-500 mt-0.5">Share medical records digitally with healthcare providers without carrying physical paper files.</p>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right: Mock Connection Card */}
        <div className="lg:col-span-5 space-y-6">
          <Card className={isConnected ? 'border-teal-200 bg-gradient-to-b from-white to-teal-50/20' : ''}>
            <CardHeader
              title="ABHA Connection"
              subtitle="Mock ABDM Gateway Link"
              icon={<Shield className="w-5 h-5" />}
              action={
                isConnected ? (
                  <Badge variant="teal" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>Demo Connected</Badge>
                ) : (
                  <Badge variant="slate">Not Connected</Badge>
                )
              }
            />

            <CardBody>
              {isConnected ? (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-100 space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-navy-400 font-medium">Demo ABHA ID</span>
                      <span className="font-mono font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded">
                        {abha?.abhaId}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-navy-400 font-medium">ABHA Address</span>
                      <span className="font-semibold text-navy-700">{abha?.abhaAddress}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-navy-400 font-medium">Patient Name</span>
                      <span className="font-semibold text-navy-700">{abha?.fullName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-navy-400 font-medium">Linked Mobile</span>
                      <span className="font-semibold text-navy-700">{abha?.mobile}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-navy-400 font-medium">Linked Facility</span>
                      <span className="font-semibold text-teal-700">{abha?.hipName || 'Apollo Diagnostics (HIP)'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-navy-400 pt-1">
                    <span>Connected on: {formatDate(abha?.connectedAt || nowISO())}</span>
                    <Badge variant="amber">Simulation Consent: Active</Badge>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={handleOpenImport}
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Import Records
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDisconnectModalOpen(true)}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-center py-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                    <Link2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy-800">No ABHA Account Linked</h4>
                    <p className="text-xs text-navy-500 mt-1 max-w-xs mx-auto">
                      Link a fictional demonstration ABHA ID to simulate health facility records discovery and FHIR payload generation.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleOpenConnect}
                    leftIcon={<Link2 className="w-4 h-4" />}
                  >
                    Connect ABHA (Demo)
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* FHIR R4 Bundle Metrics Section */}
      <Card className="bg-gradient-to-r from-navy-900 to-navy-800 text-white border-0">
        <CardBody className="p-6">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="teal" icon={<Code2 className="w-3 h-3" />}>HL7 FHIR R4 Ready</Badge>
                <span className="text-xs text-slate-300">NRCS / ABDM Profile Compliant</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-2">FHIR Standard Record Architecture</h3>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                All HealthPilot records convert automatically into standard FHIR resources: Patient, Observation, DiagnosticReport, MedicationRequest, Condition, and DocumentReference.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full lg:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFhirPreviewOpen(true)}
                leftIcon={<Eye className="w-4 h-4 text-teal-600" />}
                className="bg-white text-navy-800 border-white hover:bg-slate-50"
              >
                Preview FHIR Bundle
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportFhirJson}
                leftIcon={<Download className="w-4 h-4" />}
                className="bg-teal-500 hover:bg-teal-600"
              >
                Export FHIR JSON
              </Button>
            </div>
          </div>

          {/* Counts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-navy-700/60">
            <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
              <div className="text-xs text-slate-400 font-medium">Patient</div>
              <div className="text-xl font-bold text-white mt-1">{fhirSummary.counts.patients}</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Demographics</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
              <div className="text-xs text-slate-400 font-medium">Observations</div>
              <div className="text-xl font-bold text-white mt-1">{fhirSummary.counts.observations}</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Vitals & Labs</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
              <div className="text-xs text-slate-400 font-medium">DiagnosticReports</div>
              <div className="text-xl font-bold text-white mt-1">{fhirSummary.counts.diagnosticReports}</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Panels & Tests</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
              <div className="text-xs text-slate-400 font-medium">MedicationRequests</div>
              <div className="text-xl font-bold text-white mt-1">{fhirSummary.counts.medicationRequests}</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Prescriptions</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
              <div className="text-xs text-slate-400 font-medium">Conditions</div>
              <div className="text-xl font-bold text-white mt-1">{fhirSummary.counts.conditions}</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Diagnoses</div>
            </div>

            <div className="p-3 rounded-xl bg-navy-800/80 border border-navy-700">
              <div className="text-xs text-slate-400 font-medium">DocumentRefs</div>
              <div className="text-xl font-bold text-white mt-1">{fhirSummary.counts.documentReferences}</div>
              <div className="text-[10px] text-teal-400 mt-0.5">Clinical Notes</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Imported Health Records Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-navy-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-600" />
              Imported ABHA Health Records
            </h3>
            <p className="text-xs text-navy-400 mt-0.5">
              Simulated clinical records linked to your ABHA profile across hospitals and labs
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setRecordFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                recordFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-navy-600 hover:bg-slate-50'
              }`}
            >
              All Records ({currentImportedRecords.length})
            </button>
            <button
              onClick={() => setRecordFilter('lab_result')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                recordFilter === 'lab_result'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-navy-600 hover:bg-slate-50'
              }`}
            >
              Lab Results
            </button>
            <button
              onClick={() => setRecordFilter('prescription')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                recordFilter === 'prescription'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-navy-600 hover:bg-slate-50'
              }`}
            >
              Prescriptions
            </button>
            <button
              onClick={() => setRecordFilter('doctor_note')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                recordFilter === 'doctor_note'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-navy-600 hover:bg-slate-50'
              }`}
            >
              Doctor Notes
            </button>
          </div>
        </div>

        {/* Records Listing */}
        {currentImportedRecords.length === 0 ? (
          <Card>
            <EmptyState
              icon={<FileHeart className="w-8 h-8 text-teal-600" />}
              title="No ABDM demo records imported yet"
              description="Click 'Import Demo Records' to test importing sample blood tests, prescriptions, and consultation summaries into your profile."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenImport}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Import Demo Records
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentImportedRecords.map((item) => {
              const matchedSample = SAMPLE_ABHA_RECORDS.find((s) => s.id === item.id || (s.report && s.report.id === item.id) || (s.record && s.record.id === item.id));

              return (
                <Card key={item.id} className="hover:shadow-card-md transition-all duration-200 flex flex-col">
                  <CardBody className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center flex-shrink-0">
                          {item.category === 'lab_result' ? (
                            <FlaskConical className="w-5 h-5" />
                          ) : item.category === 'prescription' ? (
                            <Pill className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Stethoscope className="w-5 h-5 text-purple-600" />
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>Demo Data</Badge>
                          <Badge variant="teal">{item.category.replace('_', ' ')}</Badge>
                        </div>
                      </div>

                      <h4 className="font-bold text-navy-800 text-sm mt-3 line-clamp-2">{item.title}</h4>
                      <p className="text-xs text-navy-400 mt-1 flex items-center gap-1 truncate">
                        <Building2 className="w-3.5 h-3.5 text-navy-300" />
                        {item.provider}
                      </p>

                      <div className="text-[11px] text-navy-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-navy-300" />
                        Recorded on: {formatDate(item.date)}
                      </div>

                      {/* Snippet */}
                      {item.report && (
                        <div className="mt-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-navy-600">
                          <div className="font-semibold text-navy-700 mb-1">Results Preview:</div>
                          <div className="flex flex-wrap gap-1">
                            {item.report.results.slice(0, 3).map((r) => (
                              <span key={r.id} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-navy-700">
                                {r.testName}: {r.value} {r.unit}
                              </span>
                            ))}
                            {item.report.results.length > 3 && (
                              <span className="text-[10px] text-navy-400 self-center">
                                +{item.report.results.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {item.record?.notes && (
                        <p className="mt-3 text-xs text-navy-600 line-clamp-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          {item.record.notes}
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (matchedSample) {
                            setViewRecordModal(matchedSample);
                          } else if (item.report) {
                            navigateWithParams('report-analysis', { reportId: item.report.id });
                          }
                        }}
                        className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Details
                      </button>

                      {matchedSample && (
                        <button
                          onClick={() => handleViewRecordFhir(matchedSample)}
                          className="text-xs text-navy-500 hover:text-navy-700 font-mono flex items-center gap-1 bg-slate-100 px-2 py-1 rounded"
                        >
                          <Code2 className="w-3 h-3" /> FHIR JSON
                        </button>
                      )}

                      {item.report && (
                        <button
                          onClick={() => navigateWithParams('report-analysis', { reportId: item.report!.id })}
                          className="text-xs font-semibold text-navy-600 hover:text-teal-600 flex items-center gap-1"
                        >
                          AI Analysis <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Integration Shortcuts */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-navy-800">Connected to Unified Health Overview</h4>
          <p className="text-xs text-navy-500 mt-0.5">
            Imported ABHA records appear automatically on your Health Timeline, Medical Reports, and Dashboard.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('timeline')}
            leftIcon={<Activity className="w-3.5 h-3.5 text-teal-600" />}
          >
            Open Health Timeline
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('records')}
            leftIcon={<FileText className="w-3.5 h-3.5 text-blue-600" />}
          >
            All Health Records
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('profile')}
            leftIcon={<User className="w-3.5 h-3.5 text-purple-600" />}
          >
            View Profile
          </Button>
        </div>
      </div>

      {/* ─── MODAL 1: Connect ABHA (Demo) ─── */}
      <Modal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title="Connect ABHA Account (Demo Only)"
        subtitle="Simulate linking your Ayushman Bharat Health Account with HealthPilot AI"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConnectModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmConnect}
              disabled={!connectForm.consentGiven}
              leftIcon={<Link2 className="w-4 h-4" />}
            >
              Confirm & Connect (Demo)
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
            <strong>Demonstration Simulation:</strong> You are entering a mock identifier for development testing.
            This will NOT verify against the Government of India ABDM production server.
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              Demo ABHA ID (14 digits)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={connectForm.abhaId}
                onChange={(e) => setConnectForm({ ...connectForm, abhaId: e.target.value })}
                placeholder="91-8842-1049-5521"
                className="input-base flex-1 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setConnectForm({
                  ...connectForm,
                  abhaId: `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
                })}
                className="px-2.5 py-1.5 text-xs bg-slate-100 text-navy-600 rounded-lg hover:bg-slate-200 transition-colors"
                title="Generate new demo ID"
              >
                Randomize
              </button>
            </div>
            <p className="text-[11px] text-navy-400 mt-1">Format: 91-XXXX-XXXX-XXXX (Fictional test ID)</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-navy-700 mb-1">
              ABHA Address (PHR Handle)
            </label>
            <input
              type="text"
              value={connectForm.abhaAddress}
              onChange={(e) => setConnectForm({ ...connectForm, abhaAddress: e.target.value })}
              placeholder="username@abdm"
              className="input-base text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Full Name</label>
              <input
                type="text"
                value={connectForm.fullName}
                onChange={(e) => setConnectForm({ ...connectForm, fullName: e.target.value })}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Gender</label>
              <select
                value={connectForm.gender}
                onChange={(e) => setConnectForm({ ...connectForm, gender: e.target.value })}
                className="input-base text-sm"
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Date of Birth</label>
              <input
                type="date"
                value={connectForm.dateOfBirth}
                onChange={(e) => setConnectForm({ ...connectForm, dateOfBirth: e.target.value })}
                className="input-base text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy-700 mb-1">Linked Mobile (Mock)</label>
              <input
                type="text"
                value={connectForm.mobile}
                onChange={(e) => setConnectForm({ ...connectForm, mobile: e.target.value })}
                placeholder="9876543210"
                className="input-base text-sm"
              />
            </div>
          </div>

          {/* Mandatory Consent Checkbox */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mt-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={connectForm.consentGiven}
                onChange={(e) => setConnectForm({ ...connectForm, consentGiven: e.target.checked })}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-xs text-navy-700 leading-relaxed select-none">
                <strong>Simulated ABDM Consent:</strong> I understand that this is a simulated demonstration. No real government credentials or patient data are transmitted, and I consent to linking this demo profile for testing.
              </span>
            </label>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 2: Disconnect ABHA ─── */}
      <Modal
        open={disconnectModalOpen}
        onClose={() => setDisconnectModalOpen(false)}
        title="Disconnect Demo ABHA Account"
        subtitle="Remove simulation credentials from current session"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDisconnectModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleConfirmDisconnect}>
              Disconnect Account
            </Button>
          </>
        }
      >
        <p className="text-sm text-navy-600">
          Are you sure you want to disconnect this demo ABHA account?
          Your existing imported health records will remain preserved in your profile.
        </p>
      </Modal>

      {/* ─── MODAL 3: Import Demo Records Selection ─── */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Demo ABDM Health Records"
        subtitle="Select certified sample medical records to import into HealthPilot"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-navy-500">
              {selectedRecordIds.length} of {SAMPLE_ABHA_RECORDS.length} records selected
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setImportConfirmOpen(true)}
                disabled={selectedRecordIds.length === 0}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Continue ({selectedRecordIds.length})
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <p className="text-xs text-navy-500">
              Select records to add to your health profile and timeline.
            </p>
            <button
              onClick={handleSelectAllRecords}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800"
            >
              Toggle Select All
            </button>
          </div>

          <div className="space-y-3">
            {SAMPLE_ABHA_RECORDS.map((sample) => {
              const alreadyImported = isRecordAlreadyImported(sample);
              const isSelected = selectedRecordIds.includes(sample.id);

              return (
                <div
                  key={sample.id}
                  onClick={() => !alreadyImported && handleToggleSelectRecord(sample.id)}
                  className={`p-4 rounded-xl border transition-all ${
                    alreadyImported
                      ? 'bg-slate-50/70 border-slate-200 opacity-75 cursor-not-allowed'
                      : isSelected
                      ? 'bg-teal-50/40 border-teal-300 ring-1 ring-teal-300 cursor-pointer'
                      : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected || alreadyImported}
                      disabled={alreadyImported}
                      onChange={() => !alreadyImported && handleToggleSelectRecord(sample.id)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-navy-800 truncate">{sample.title}</h4>
                          <Badge variant={sample.badgeColor}>{sample.badge}</Badge>
                        </div>
                        {alreadyImported && (
                          <Badge variant="slate" icon={<Check className="w-3 h-3 text-emerald-600" />}>Already Imported</Badge>
                        )}
                      </div>

                      <p className="text-xs text-navy-500 mt-1">{sample.description}</p>

                      <div className="flex items-center gap-4 mt-2 text-[11px] text-navy-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {sample.provider}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatDate(sample.date)}
                        </span>
                        <span className="font-mono bg-slate-100 text-navy-600 px-1.5 py-0.5 rounded">
                          FHIR: {sample.fhirResourceType}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-navy-500">
            <strong>Duplicate Prevention:</strong> If a record has already been imported, it is automatically marked to prevent duplicate entries in your health profile and timeline.
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 4: Import Confirmation ─── */}
      <Modal
        open={importConfirmOpen}
        onClose={() => setImportConfirmOpen(false)}
        title="Confirm Health Record Import"
        subtitle="Confirm adding records to your HealthPilot profile"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setImportConfirmOpen(false)}>
              Back
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExecuteImport}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Import
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-navy-700">
            You are about to import <strong>{selectedRecordIds.length}</strong> record(s) into your unified health profile.
          </p>

          <div className="p-3 rounded-xl bg-teal-50 border border-teal-100 space-y-2 text-xs text-teal-900">
            <div className="font-bold">What will happen:</div>
            <ul className="list-disc pl-4 space-y-1 text-teal-800">
              <li>Records will be labeled with <strong>Demo Data</strong> to distinguish them from your personal uploads.</li>
              <li>New chronological entries will be added to your <strong>Health Timeline</strong>.</li>
              <li>Medications and lab panels will be available to the <strong>AI Copilot & Insights</strong> engine.</li>
              <li>Your existing personal records will remain completely untouched.</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 5: FHIR Preview Modal ─── */}
      <Modal
        open={fhirPreviewOpen}
        onClose={() => setFhirPreviewOpen(false)}
        title="HL7 FHIR R4 Collection Bundle Preview"
        subtitle="Standardized JSON representation of your authorized healthcare records"
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-xs text-navy-500">
              <span>Total Resources: {fhirSummary.counts.total}</span>
              <span>•</span>
              <span>Bundle ID: {fhirSummary.bundle.id}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyFhirJson}
                leftIcon={copiedFhir ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              >
                {copiedFhir ? 'Copied!' : 'Copy JSON'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportFhirJson}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download .json
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-navy-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span><strong>Profile:</strong> nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle</span>
            <span><strong>Format:</strong> application/fhir+json</span>
          </div>

          <div className="relative max-h-[60vh] overflow-y-auto rounded-xl bg-navy-950 p-4 border border-navy-800 font-mono text-xs text-emerald-400">
            <pre className="whitespace-pre-wrap">{JSON.stringify(fhirSummary.bundle, null, 2)}</pre>
          </div>
        </div>
      </Modal>

      {/* ─── MODAL 6: Single Record FHIR View ─── */}
      {viewFhirModal && (
        <Modal
          open={Boolean(viewFhirModal)}
          onClose={() => setViewFhirModal(null)}
          title={viewFhirModal.title}
          subtitle="Direct HL7 FHIR R4 Resource Mapping"
          size="lg"
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(viewFhirModal.json);
                  showToast('Resource JSON copied!', 'success');
                }}
                leftIcon={<Copy className="w-4 h-4" />}
              >
                Copy Resource
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewFhirModal(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="max-h-[60vh] overflow-y-auto rounded-xl bg-navy-950 p-4 border border-navy-800 font-mono text-xs text-teal-300">
            <pre className="whitespace-pre-wrap">{viewFhirModal.json}</pre>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 7: Record Details Modal ─── */}
      {viewRecordModal && (
        <Modal
          open={Boolean(viewRecordModal)}
          onClose={() => setViewRecordModal(null)}
          title={viewRecordModal.title}
          subtitle={`${viewRecordModal.recordTypeLabel} • ${viewRecordModal.provider}`}
          size="lg"
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleViewRecordFhir(viewRecordModal)}
                leftIcon={<Code2 className="w-4 h-4" />}
              >
                View FHIR Resource
              </Button>
              <Button variant="primary" size="sm" onClick={() => setViewRecordModal(null)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="amber" icon={<Sparkles className="w-3 h-3" />}>ABDM Demo Record</Badge>
              <Badge variant="teal">{viewRecordModal.category}</Badge>
              <span className="text-xs text-navy-400 ml-auto">Date: {formatDate(viewRecordModal.date)}</span>
            </div>

            {viewRecordModal.report && (
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-navy-700 uppercase tracking-wider">Test Results</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-navy-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Biomarker</th>
                        <th className="p-2.5">Result</th>
                        <th className="p-2.5">Reference Range</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewRecordModal.report.results.map((res) => (
                        <tr key={res.id}>
                          <td className="p-2.5 font-medium text-navy-800">{res.testName}</td>
                          <td className="p-2.5 font-bold text-navy-900">{res.value} {res.unit}</td>
                          <td className="p-2.5 text-navy-500">{res.referenceRange || 'N/A'}</td>
                          <td className="p-2.5">
                            <Badge variant={res.status === 'outside_range' ? 'amber' : 'teal'}>
                              {res.status === 'outside_range' ? 'Outside Range' : 'Normal'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {viewRecordModal.report.aiSummary && (
                  <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-100 text-xs text-navy-700">
                    <div className="font-bold text-teal-800 mb-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      Summary & Clinical Explanation
                    </div>
                    {viewRecordModal.report.aiSummary}
                  </div>
                )}
              </div>
            )}

            {viewRecordModal.medications && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-navy-700 uppercase tracking-wider">Prescribed Medications</h5>
                <div className="space-y-2">
                  {viewRecordModal.medications.map((m) => (
                    <div key={m.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div className="flex justify-between items-center font-bold text-navy-800">
                        <span>{m.name} {m.dosage}</span>
                        <Badge variant="blue">{m.frequency}</Badge>
                      </div>
                      {m.notes && <p className="text-navy-500 mt-1">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {viewRecordModal.record?.notes && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-navy-700 uppercase tracking-wider">Consultation Notes</h5>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-navy-700 whitespace-pre-line">
                  {viewRecordModal.record.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
