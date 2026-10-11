/**
 * fhirService.ts
 *
 * Provides HL7 FHIR (Fast Healthcare Interoperability Resources) R4-compatible
 * data structures, conversion helpers, and bundle exporters for HealthPilot AI.
 *
 * Compliant with ABDM (Ayushman Bharat Digital Mission) FHIR resource guidelines:
 * - Patient: Demographics, identifier (ABHA ID / ABHA Address)
 * - Observation: Vitals & Lab test parameters with LOINC coding
 * - DiagnosticReport: Diagnostic investigations and panels
 * - MedicationRequest: Prescriptions and medication orders
 * - Condition: Diagnoses and clinical conditions
 * - DocumentReference: Clinical notes, discharge summaries, and medical documents
 * - Bundle: Collection bundle aggregating patient healthcare records
 */

import type {
  UserProfile,
  HealthMeasurement,
  MedicalReport,
  Medication,
  HealthRecord,
  AbhaConnection,
  AppState,
} from '@/types';

// ─── FHIR Resource Type Definitions ──────────────────────────────────────────

export interface FhirReference {
  reference?: string;
  display?: string;
  type?: string;
}

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  coding?: FhirCoding[];
  text?: string;
}

export interface FhirIdentifier {
  system?: string;
  value: string;
  type?: FhirCodeableConcept;
}

export interface FhirQuantity {
  value: number;
  unit?: string;
  system?: string;
  code?: string;
}

export interface FhirPatient {
  resourceType: 'Patient';
  id: string;
  meta?: {
    profile?: string[];
    lastUpdated?: string;
  };
  identifier?: FhirIdentifier[];
  active: boolean;
  name?: Array<{
    use?: string;
    text: string;
    family?: string;
    given?: string[];
  }>;
  telecom?: Array<{
    system: 'phone' | 'email';
    value: string;
    use?: string;
  }>;
  gender?: 'male' | 'female' | 'other' | 'unknown';
  birthDate?: string;
}

export interface FhirObservation {
  resourceType: 'Observation';
  id: string;
  meta?: {
    profile?: string[];
  };
  identifier?: FhirIdentifier[];
  status: 'registered' | 'preliminary' | 'final' | 'amended';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime: string;
  performer?: FhirReference[];
  valueQuantity?: FhirQuantity;
  valueString?: string;
  component?: Array<{
    code: FhirCodeableConcept;
    valueQuantity?: FhirQuantity;
  }>;
  referenceRange?: Array<{
    text?: string;
    low?: FhirQuantity;
    high?: FhirQuantity;
  }>;
  interpretation?: FhirCodeableConcept[];
  note?: Array<{ text: string }>;
}

export interface FhirDiagnosticReport {
  resourceType: 'DiagnosticReport';
  id: string;
  meta?: {
    profile?: string[];
  };
  identifier?: FhirIdentifier[];
  status: 'registered' | 'partial' | 'preliminary' | 'final';
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  effectiveDateTime: string;
  issued?: string;
  performer?: FhirReference[];
  result?: FhirReference[];
  conclusion?: string;
  presentedForm?: Array<{
    contentType?: string;
    title?: string;
  }>;
}

export interface FhirMedicationRequest {
  resourceType: 'MedicationRequest';
  id: string;
  meta?: {
    profile?: string[];
  };
  identifier?: FhirIdentifier[];
  status: 'active' | 'on-hold' | 'cancelled' | 'completed' | 'stopped' | 'draft';
  intent: 'order' | 'plan' | 'proposal';
  medicationCodeableConcept: FhirCodeableConcept;
  subject: FhirReference;
  authoredOn?: string;
  requester?: FhirReference;
  dosageInstruction?: Array<{
    text?: string;
    timing?: {
      code?: { text?: string };
    };
    patientInstruction?: string;
    route?: FhirCodeableConcept;
  }>;
  note?: Array<{ text: string }>;
}

export interface FhirCondition {
  resourceType: 'Condition';
  id: string;
  meta?: {
    profile?: string[];
  };
  identifier?: FhirIdentifier[];
  clinicalStatus?: FhirCodeableConcept;
  verificationStatus?: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  subject: FhirReference;
  recordedDate?: string;
  note?: Array<{ text: string }>;
}

export interface FhirDocumentReference {
  resourceType: 'DocumentReference';
  id: string;
  meta?: {
    profile?: string[];
  };
  identifier?: FhirIdentifier[];
  status: 'current' | 'superseded' | 'entered-in-error';
  docStatus?: 'preliminary' | 'final' | 'amended';
  type: FhirCodeableConcept;
  category?: FhirCodeableConcept[];
  subject: FhirReference;
  date?: string;
  author?: FhirReference[];
  description?: string;
  content: Array<{
    attachment: {
      contentType?: string;
      title?: string;
      creation?: string;
    };
  }>;
}

export type FhirAnyResource =
  | FhirPatient
  | FhirObservation
  | FhirDiagnosticReport
  | FhirMedicationRequest
  | FhirCondition
  | FhirDocumentReference;

export interface FhirBundleEntry {
  fullUrl: string;
  resource: FhirAnyResource;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  meta: {
    versionId?: string;
    lastUpdated: string;
    profile?: string[];
  };
  type: 'collection';
  timestamp: string;
  total: number;
  entry: FhirBundleEntry[];
}

// ─── LOINC Codes Map ─────────────────────────────────────────────────────────

const LOINC_MAP: Record<string, { code: string; display: string }> = {
  weight: { code: '29463-7', display: 'Body weight' },
  blood_pressure: { code: '85354-9', display: 'Blood pressure panel with all children optional' },
  heart_rate: { code: '8867-4', display: 'Heart rate' },
  sleep: { code: '93832-4', display: 'Sleep duration' },
  activity: { code: '41950-7', display: 'Number of steps' },
  glucose: { code: '2339-0', display: 'Glucose [Mass/volume] in Blood' },
  temperature: { code: '8310-5', display: 'Body temperature' },
  water: { code: '90520-8', display: 'Fluid intake' },
  // Common Lab Tests
  'fasting blood glucose': { code: '1558-6', display: 'Fasting glucose [Mass/volume] in Serum or Plasma' },
  'glycated hemoglobin (hba1c)': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  'hba1c': { code: '4548-4', display: 'Hemoglobin A1c/Hemoglobin.total in Blood' },
  'total cholesterol': { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma' },
  'hdl cholesterol': { code: '2085-9', display: 'Cholesterol in HDL [Mass/volume] in Serum or Plasma' },
  'triglycerides': { code: '2571-8', display: 'Triglyceride [Mass/volume] in Serum or Plasma' },
  'hemoglobin': { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood' },
  'white blood cells': { code: '6690-2', display: 'Leukocytes [#/volume] in Blood' },
  'platelets': { code: '777-3', display: 'Platelets [#/volume] in Blood' },
  'rbc count': { code: '789-8', display: 'Erythrocytes [#/volume] in Blood' },
  'hematocrit': { code: '4544-3', display: 'Hematocrit [Volume Fraction] of Blood' },
};

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
}

// ─── Resource Converters ─────────────────────────────────────────────────────

export function convertProfileToFhirPatient(
  profile: UserProfile | null,
  abha?: AbhaConnection
): FhirPatient {
  const patientId = profile?.id ? sanitizeId(`patient-${profile.id}`) : 'patient-hp-user';
  const identifiers: FhirIdentifier[] = [];

  if (abha?.abhaId) {
    identifiers.push({
      system: 'https://healthid.ndhm.gov.in',
      value: abha.abhaId,
      type: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'Medical Record Number' }],
        text: 'ABHA ID (Ayushman Bharat Health Account)',
      },
    });
  }

  if (abha?.abhaAddress) {
    identifiers.push({
      system: 'https://abdm.gov.in/abha-address',
      value: abha.abhaAddress,
      type: {
        text: 'ABHA Address (PHR Handle)',
      },
    });
  }

  const genderMap: Record<string, FhirPatient['gender']> = {
    male: 'male',
    female: 'female',
    other: 'other',
  };
  const gStr = (abha?.gender || profile?.gender || '').toLowerCase();
  const gender = genderMap[gStr] || 'unknown';

  const fullName = abha?.fullName || profile?.fullName || 'HealthPilot Patient';

  const telecoms: FhirPatient['telecom'] = [];
  if (profile?.email) {
    telecoms.push({ system: 'email', value: profile.email, use: 'home' });
  }
  if (abha?.mobile) {
    telecoms.push({ system: 'phone', value: abha.mobile, use: 'mobile' });
  }

  return {
    resourceType: 'Patient',
    id: patientId,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Patient'],
      lastUpdated: new Date().toISOString(),
    },
    active: true,
    identifier: identifiers.length > 0 ? identifiers : undefined,
    name: [{ use: 'official', text: fullName }],
    gender,
    birthDate: abha?.dateOfBirth || profile?.dateOfBirth,
    telecom: telecoms.length > 0 ? telecoms : undefined,
  };
}

export function convertMeasurementToFhirObservation(
  m: HealthMeasurement,
  patientRef: FhirReference
): FhirObservation {
  const id = sanitizeId(`obs-meas-${m.id}`);
  const loinc = LOINC_MAP[m.type.toLowerCase()];

  const isBP = m.type === 'blood_pressure';

  const obs: FhirObservation = {
    resourceType: 'Observation',
    id,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          },
        ],
      },
    ],
    code: {
      coding: loinc ? [{ system: 'http://loinc.org', code: loinc.code, display: loinc.display }] : undefined,
      text: m.type.replace('_', ' '),
    },
    subject: patientRef,
    effectiveDateTime: m.date,
    note: m.notes ? [{ text: m.notes }] : undefined,
  };

  if (isBP && m.secondaryValue !== undefined) {
    obs.component = [
      {
        code: {
          coding: [{ system: 'http://loinc.org', code: '8480-6', display: 'Systolic blood pressure' }],
          text: 'Systolic blood pressure',
        },
        valueQuantity: {
          value: m.value,
          unit: m.unit,
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
      {
        code: {
          coding: [{ system: 'http://loinc.org', code: '8462-4', display: 'Diastolic blood pressure' }],
          text: 'Diastolic blood pressure',
        },
        valueQuantity: {
          value: m.secondaryValue,
          unit: m.secondaryUnit || m.unit,
          system: 'http://unitsofmeasure.org',
          code: 'mm[Hg]',
        },
      },
    ];
  } else {
    obs.valueQuantity = {
      value: m.value,
      unit: m.unit,
      system: 'http://unitsofmeasure.org',
      code: m.unit,
    };
  }

  return obs;
}

export function convertReportResultToFhirObservation(
  result: MedicalReport['results'][0],
  report: MedicalReport,
  patientRef: FhirReference
): FhirObservation {
  const id = sanitizeId(`obs-res-${result.id}`);
  const loinc = LOINC_MAP[result.testName.toLowerCase().trim()];
  const numericVal = parseFloat(result.value);
  const isNumeric = !isNaN(numericVal);

  const obs: FhirObservation = {
    resourceType: 'Observation',
    id,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Observation'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      coding: loinc ? [{ system: 'http://loinc.org', code: loinc.code, display: loinc.display }] : undefined,
      text: result.testName,
    },
    subject: patientRef,
    effectiveDateTime: report.reportDate || report.date,
    performer: report.provider ? [{ display: report.provider }] : undefined,
  };

  if (isNumeric) {
    obs.valueQuantity = {
      value: numericVal,
      unit: result.unit,
      system: 'http://unitsofmeasure.org',
      code: result.unit,
    };
  } else {
    obs.valueString = result.value;
  }

  if (result.referenceRange) {
    obs.referenceRange = [{ text: result.referenceRange }];
  }

  if (result.status === 'outside_range') {
    obs.interpretation = [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'A',
            display: 'Abnormal',
          },
        ],
        text: 'Outside reference range',
      },
    ];
  } else if (result.status === 'within_range') {
    obs.interpretation = [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'N',
            display: 'Normal',
          },
        ],
        text: 'Normal',
      },
    ];
  }

  if (result.sourceText) {
    obs.note = [{ text: result.sourceText }];
  }

  return obs;
}

export function convertReportToFhirDiagnosticReport(
  report: MedicalReport,
  patientRef: FhirReference,
  observationRefs: FhirReference[]
): FhirDiagnosticReport {
  const id = sanitizeId(`diag-rpt-${report.id}`);

  return {
    resourceType: 'DiagnosticReport',
    id,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DiagnosticReportRecord'],
    },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB',
            display: 'Laboratory',
          },
        ],
      },
    ],
    code: {
      text: report.title,
    },
    subject: patientRef,
    effectiveDateTime: report.reportDate || report.date,
    issued: report.createdAt || new Date().toISOString(),
    performer: report.provider ? [{ display: report.provider }] : undefined,
    result: observationRefs,
    conclusion: report.aiSummary || report.notes || undefined,
    presentedForm: report.fileName
      ? [
          {
            contentType: report.fileType || 'application/pdf',
            title: report.fileName,
          },
        ]
      : undefined,
  };
}

export function convertMedicationToFhirMedicationRequest(
  med: Medication,
  patientRef: FhirReference
): FhirMedicationRequest {
  const id = sanitizeId(`med-req-${med.id}`);

  return {
    resourceType: 'MedicationRequest',
    id,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/MedicationRequest'],
    },
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      text: `${med.name}${med.dosage ? ` (${med.dosage})` : ''}`,
    },
    subject: patientRef,
    authoredOn: med.startDate,
    dosageInstruction: [
      {
        text: `${med.frequency}${med.time ? ` at ${med.time}` : ''}`,
        timing: {
          code: { text: med.frequency },
        },
        patientInstruction: med.notes || undefined,
      },
    ],
    note: med.notes ? [{ text: med.notes }] : undefined,
  };
}

export function convertConditionToFhirCondition(
  conditionName: string,
  index: number,
  patientRef: FhirReference,
  date?: string
): FhirCondition {
  const id = sanitizeId(`cond-${index}-${conditionName.substring(0, 15)}`);

  return {
    resourceType: 'Condition',
    id,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/Condition'],
    },
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        },
      ],
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        },
      ],
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis',
          },
        ],
      },
    ],
    code: {
      text: conditionName,
    },
    subject: patientRef,
    recordedDate: date || new Date().toISOString().split('T')[0],
  };
}

export function convertRecordToFhirDocumentReference(
  rec: HealthRecord,
  patientRef: FhirReference
): FhirDocumentReference {
  const id = sanitizeId(`doc-ref-${rec.id}`);

  const categoryLabelMap: Record<string, string> = {
    doctor_note: 'Doctor Consultation Note',
    prescription: 'Prescription Document',
    vaccination: 'Vaccination Certificate',
    medical_report: 'Medical Report',
    lab_result: 'Diagnostic Lab Summary',
    other: 'General Health Document',
  };

  return {
    resourceType: 'DocumentReference',
    id,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentReference'],
    },
    status: 'current',
    docStatus: 'final',
    type: {
      text: categoryLabelMap[rec.category] || rec.category,
    },
    subject: patientRef,
    date: rec.date,
    author: rec.provider ? [{ display: rec.provider }] : undefined,
    description: rec.notes || rec.title,
    content: [
      {
        attachment: {
          contentType: rec.fileType || 'text/plain',
          title: rec.fileName || rec.title,
          creation: rec.date,
        },
      },
    ],
  };
}

// ─── Bundle Assembler ────────────────────────────────────────────────────────

export interface FhirBundleSummary {
  bundle: FhirBundle;
  counts: {
    patients: number;
    observations: number;
    diagnosticReports: number;
    medicationRequests: number;
    conditions: number;
    documentReferences: number;
    total: number;
  };
}

export function generateFhirBundle(state: AppState): FhirBundleSummary {
  const entries: FhirBundleEntry[] = [];
  const counts = {
    patients: 0,
    observations: 0,
    diagnosticReports: 0,
    medicationRequests: 0,
    conditions: 0,
    documentReferences: 0,
    total: 0,
  };

  // 1. Patient
  const patientResource = convertProfileToFhirPatient(state.profile, state.abhaConnection);
  const patientRef: FhirReference = {
    reference: `urn:uuid:${patientResource.id}`,
    display: patientResource.name?.[0]?.text || 'Patient',
  };
  entries.push({
    fullUrl: `urn:uuid:${patientResource.id}`,
    resource: patientResource,
  });
  counts.patients += 1;

  // 2. Health Measurements -> Observations
  for (const m of state.measurements) {
    const obs = convertMeasurementToFhirObservation(m, patientRef);
    entries.push({
      fullUrl: `urn:uuid:${obs.id}`,
      resource: obs,
    });
    counts.observations += 1;
  }

  // 3. Medical Reports -> DiagnosticReports + Observations
  for (const rpt of state.reports) {
    const obsRefs: FhirReference[] = [];
    if (rpt.results && rpt.results.length > 0) {
      for (const res of rpt.results) {
        const obs = convertReportResultToFhirObservation(res, rpt, patientRef);
        entries.push({
          fullUrl: `urn:uuid:${obs.id}`,
          resource: obs,
        });
        obsRefs.push({
          reference: `urn:uuid:${obs.id}`,
          display: res.testName,
        });
        counts.observations += 1;
      }
    }

    const diagRpt = convertReportToFhirDiagnosticReport(rpt, patientRef, obsRefs);
    entries.push({
      fullUrl: `urn:uuid:${diagRpt.id}`,
      resource: diagRpt,
    });
    counts.diagnosticReports += 1;
  }

  // 4. Medications -> MedicationRequests
  for (const med of state.medications) {
    const medReq = convertMedicationToFhirMedicationRequest(med, patientRef);
    entries.push({
      fullUrl: `urn:uuid:${medReq.id}`,
      resource: medReq,
    });
    counts.medicationRequests += 1;
  }

  // 5. Conditions from User Profile & Diagnoses
  const recordedConditions = new Set<string>();
  if (state.profile?.conditions) {
    for (const c of state.profile.conditions) {
      if (c && !recordedConditions.has(c)) {
        recordedConditions.add(c);
      }
    }
  }

  let condIndex = 1;
  for (const condName of recordedConditions) {
    const cond = convertConditionToFhirCondition(condName, condIndex++, patientRef);
    entries.push({
      fullUrl: `urn:uuid:${cond.id}`,
      resource: cond,
    });
    counts.conditions += 1;
  }

  // 6. Health Records -> DocumentReferences
  for (const rec of state.records) {
    const docRef = convertRecordToFhirDocumentReference(rec, patientRef);
    entries.push({
      fullUrl: `urn:uuid:${docRef.id}`,
      resource: docRef,
    });
    counts.documentReferences += 1;
  }

  counts.total = entries.length;

  const bundle: FhirBundle = {
    resourceType: 'Bundle',
    id: `bundle-healthpilot-${Date.now()}`,
    meta: {
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/DocumentBundle'],
    },
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };

  return { bundle, counts };
}

/**
 * Downloads a given FHIR Bundle as a formatted JSON file.
 */
export function downloadFhirBundle(bundle: FhirBundle, customFilename?: string): void {
  const filename =
    customFilename || `healthpilot-fhir-bundle-${new Date().toISOString().split('T')[0]}.json`;
  const jsonStr = JSON.stringify(bundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/fhir+json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
