import type { MedicalReport, HealthRecord, Medication } from '@/types';

export interface SampleAbhaRecord {
  id: string;
  title: string;
  category: 'lab_result' | 'prescription' | 'doctor_note';
  recordTypeLabel: string;
  provider: string;
  date: string;
  description: string;
  badge: string;
  badgeColor: 'teal' | 'blue' | 'purple';
  fhirResourceType: 'DiagnosticReport' | 'MedicationRequest' | 'DocumentReference' | 'Condition';
  report?: MedicalReport;
  record?: HealthRecord;
  medications?: Medication[];
  conditions?: string[];
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export const SAMPLE_ABHA_RECORDS: SampleAbhaRecord[] = [
  {
    id: 'abha-rec-blood-test-01',
    title: 'Comprehensive Metabolic & Lipid Panel (Apollo Clinic)',
    category: 'lab_result',
    recordTypeLabel: 'Blood Test / Diagnostic Report',
    provider: 'Apollo Diagnostics — Bengaluru (HIP: IN-KA-HIP-0492)',
    date: daysAgoISO(14),
    description: 'Fasting Blood Glucose, HbA1c, Total Cholesterol, HDL, and Triglycerides with laboratory evaluation.',
    badge: '5 Lab Biomarkers',
    badgeColor: 'teal',
    fhirResourceType: 'DiagnosticReport',
    report: {
      id: 'abha-rpt-metabolic-01',
      title: 'Comprehensive Metabolic & Lipid Panel (Apollo Clinic)',
      category: 'lab_result',
      date: daysAgoISO(14),
      reportDate: daysAgoISO(14),
      provider: 'Apollo Diagnostics — Bengaluru (HIP: IN-KA-HIP-0492)',
      status: 'analyzed',
      fileName: 'apollo_metabolic_panel_demo.pdf',
      fileType: 'application/pdf',
      fileSize: 184320,
      source: 'demo',
      verified: true,
      documentType: 'lab_report',
      notes: 'Imported via ABDM Mock Gateway. Includes reference ranges & clinical status for glycemic and lipid parameters.',
      createdAt: daysAgoISO(14),
      updatedAt: daysAgoISO(14),
      results: [
        {
          id: 'res-glf-1',
          testName: 'Fasting Blood Glucose',
          value: '108',
          unit: 'mg/dL',
          referenceRange: '70–99',
          status: 'outside_range',
          userVerified: true,
          sourceText: 'Fasting Plasma Glucose (Hexokinase method): 108 mg/dL [Reference: 70-99 mg/dL]',
        },
        {
          id: 'res-hba1c-1',
          testName: 'Glycated Hemoglobin (HbA1c)',
          value: '6.1',
          unit: '%',
          referenceRange: '< 5.7',
          status: 'outside_range',
          userVerified: true,
          sourceText: 'HbA1c (HPLC method): 6.1% [Prediabetes range: 5.7 - 6.4%]',
        },
        {
          id: 'res-chol-1',
          testName: 'Total Cholesterol',
          value: '215',
          unit: 'mg/dL',
          referenceRange: '< 200',
          status: 'outside_range',
          userVerified: true,
          sourceText: 'Total Cholesterol: 215 mg/dL [Desirable: <200 mg/dL]',
        },
        {
          id: 'res-hdl-1',
          testName: 'HDL Cholesterol',
          value: '48',
          unit: 'mg/dL',
          referenceRange: '> 40',
          status: 'within_range',
          userVerified: true,
          sourceText: 'HDL Cholesterol: 48 mg/dL [Protective: >40 mg/dL]',
        },
        {
          id: 'res-trig-1',
          testName: 'Triglycerides',
          value: '168',
          unit: 'mg/dL',
          referenceRange: '< 150',
          status: 'outside_range',
          userVerified: true,
          sourceText: 'Serum Triglycerides: 168 mg/dL [Normal: <150 mg/dL]',
        },
      ],
      aiSummary: 'This metabolic and lipid panel demonstrates mildly elevated fasting blood glucose (108 mg/dL) and HbA1c (6.1%), consistent with pre-diabetic glycemic range. Total cholesterol (215 mg/dL) and triglycerides (168 mg/dL) are also moderately above desirable limits, while HDL cholesterol remains adequate at 48 mg/dL.',
      aiExplanation: 'Fasting glucose and HbA1c assess how effectively your body regulates blood sugar over recent months. Mild elevations point toward early insulin resistance. Triglycerides and cholesterol reflect lipid metabolism and cardiovascular balance.',
      doctorQuestions: [
        'Would dietary carbohydrate reduction and structured aerobic exercise be sufficient, or is low-dose pharmacotherapy indicated?',
        'When should I schedule repeat fasting glucose and lipid profile testing?',
        'Are there specific cardiovascular risk assessments recommended given these combined lipid and glucose levels?',
      ],
    },
    conditions: ['Prediabetes (Impaired Fasting Glucose)', 'Hyperlipidemia (Borderline High Cholesterol)'],
  },
  {
    id: 'abha-rec-prescription-02',
    title: 'Prescription: Metformin & Lipid Support (Fortis Hospital)',
    category: 'prescription',
    recordTypeLabel: 'Prescription / Medication',
    provider: 'Dr. Ramesh Gupta, MD — Fortis Hospital (Reg: MCI-48192)',
    date: daysAgoISO(12),
    description: 'Oral hypoglycemic & statin therapy with lifestyle and dietary guidance.',
    badge: '2 Active Prescriptions',
    badgeColor: 'blue',
    fhirResourceType: 'MedicationRequest',
    record: {
      id: 'abha-rec-rx-doc-02',
      title: 'Prescription: Metformin & Lipid Support (Fortis Hospital)',
      category: 'prescription',
      date: daysAgoISO(12),
      provider: 'Dr. Ramesh Gupta, MD — Fortis Hospital (Reg: MCI-48192)',
      status: 'analyzed',
      source: 'demo',
      notes: 'Prescribed following review of metabolic blood panel. Advised low glycemic diet and 30-minute daily walk.',
      createdAt: daysAgoISO(12),
      updatedAt: daysAgoISO(12),
    },
    medications: [
      {
        id: 'abha-med-metformin-01',
        name: 'Metformin Hydrochloride (ER)',
        dosage: '500mg',
        frequency: 'Once daily',
        time: '20:30',
        startDate: daysAgoISO(12).split('T')[0],
        notes: 'Take with evening meal to prevent gastrointestinal upset. Extended-release formulation.',
        source: 'demo',
        takenToday: false,
        adherence: 90,
        createdAt: daysAgoISO(12),
        updatedAt: daysAgoISO(12),
      },
      {
        id: 'abha-med-atorvastatin-02',
        name: 'Atorvastatin',
        dosage: '10mg',
        frequency: 'Once daily at bedtime',
        time: '22:00',
        startDate: daysAgoISO(12).split('T')[0],
        notes: 'Take at bedtime. Avoid grapefruit and excessive alcohol consumption.',
        source: 'demo',
        takenToday: false,
        adherence: 85,
        createdAt: daysAgoISO(12),
        updatedAt: daysAgoISO(12),
      },
    ],
  },
  {
    id: 'abha-rec-consult-03',
    title: 'Clinical Consultation Summary: Endocrinology Review',
    category: 'doctor_note',
    recordTypeLabel: 'Consultation Summary',
    provider: 'Dr. Ananya Sharma, DM Endo — Max Super Speciality',
    date: daysAgoISO(10),
    description: 'Comprehensive outpatient endocrinology evaluation, clinical impressions, and preventive care protocol.',
    badge: 'Consultation Note',
    badgeColor: 'purple',
    fhirResourceType: 'DocumentReference',
    record: {
      id: 'abha-rec-note-consult-03',
      title: 'Clinical Consultation Summary: Endocrinology Review',
      category: 'doctor_note',
      date: daysAgoISO(10),
      provider: 'Dr. Ananya Sharma, DM Endo — Max Super Speciality',
      status: 'analyzed',
      source: 'demo',
      notes: 'Reason for visit: Routine metabolic follow-up and lifestyle optimization.\n\nClinical Impressions:\n- Impaired Fasting Glycemia (Prediabetes - ICD-10: R73.01)\n- Mixed Dyslipidemia (ICD-10: E78.2)\n\nVitals Recorded: Blood Pressure 120/78 mmHg, Heart Rate 72 bpm, BMI 22.8 kg/m².\n\nManagement Plan:\n1. Adhere to prescribed low-dose Metformin 500mg ER with dinner.\n2. Maintain Atorvastatin 10mg at night.\n3. Daily hydration of 2.5–3 liters; limit refined carbohydrates & sweetened beverages.\n4. Re-check HbA1c and fasting lipid profile in 90 days.\n5. Follow-up consultation scheduled in 3 months.',
      createdAt: daysAgoISO(10),
      updatedAt: daysAgoISO(10),
    },
    conditions: ['Prediabetes (ICD-10: R73.01)', 'Mixed Dyslipidemia (ICD-10: E78.2)'],
  },
];
