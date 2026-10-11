import type {
  UserProfile,
  HealthMeasurement,
  MedicalReport,
  Medication,
  Reminder,
  HealthGoal,
  TimelineEvent,
  AIInsight,
  HealthRecord,
} from '@/types';

const now = new Date().toISOString();

export const demoProfile: UserProfile = {
  id: 'demo-profile',
  mode: 'demo',
  fullName: 'Jordan Avery',
  email: 'demo@healthpilot.ai',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
  age: 34,
  dateOfBirth: '1992-03-15',
  gender: 'Female',
  height: 168,
  weight: 64.5,
  bloodGroup: 'O+',
  bloodPressureSystolic: 118,
  bloodPressureDiastolic: 76,
  heartRate: 72,
  conditions: ['Hypothyroidism'],
  allergies: ['Penicillin', 'Peanuts'],
  medications: ['Levothyroxine 50mcg'],
  familyHistory: ['Father: Type 2 Diabetes', 'Mother: Hypertension'],
  sleepHours: 7,
  exerciseFrequency: '3x per week',
  diet: 'Balanced',
  waterIntake: 6,
  goals: ['Improve sleep', 'Track blood pressure', 'Stay consistent with medication'],
  createdAt: now,
  updatedAt: now,
};

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function daysAhead(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

export const demoMeasurements: HealthMeasurement[] = [
  { id: 'dm-w1', type: 'weight', value: 66.2, unit: 'kg', date: daysAgo(90), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(90) },
  { id: 'dm-w2', type: 'weight', value: 65.8, unit: 'kg', date: daysAgo(60), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(60) },
  { id: 'dm-w3', type: 'weight', value: 65.1, unit: 'kg', date: daysAgo(30), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(30) },
  { id: 'dm-w4', type: 'weight', value: 64.5, unit: 'kg', date: daysAgo(7), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(7) },
  { id: 'dm-bp1', type: 'blood_pressure', value: 122, secondaryValue: 80, unit: 'mmHg', secondaryUnit: 'mmHg', date: daysAgo(60), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(60) },
  { id: 'dm-bp2', type: 'blood_pressure', value: 120, secondaryValue: 78, unit: 'mmHg', secondaryUnit: 'mmHg', date: daysAgo(30), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(30) },
  { id: 'dm-bp3', type: 'blood_pressure', value: 118, secondaryValue: 76, unit: 'mmHg', secondaryUnit: 'mmHg', date: daysAgo(7), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(7) },
  { id: 'dm-hr1', type: 'heart_rate', value: 75, unit: 'bpm', date: daysAgo(60), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(60) },
  { id: 'dm-hr2', type: 'heart_rate', value: 73, unit: 'bpm', date: daysAgo(30), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(30) },
  { id: 'dm-hr3', type: 'heart_rate', value: 72, unit: 'bpm', date: daysAgo(7), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(7) },
  { id: 'dm-s1', type: 'sleep', value: 6.2, unit: 'hours', date: daysAgo(60), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(60) },
  { id: 'dm-s2', type: 'sleep', value: 6.8, unit: 'hours', date: daysAgo(30), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(30) },
  { id: 'dm-s3', type: 'sleep', value: 7.0, unit: 'hours', date: daysAgo(7), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(7) },
  { id: 'dm-a1', type: 'activity', value: 5400, unit: 'steps', date: daysAgo(60), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(60) },
  { id: 'dm-a2', type: 'activity', value: 6800, unit: 'steps', date: daysAgo(30), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(30) },
  { id: 'dm-a3', type: 'activity', value: 8200, unit: 'steps', date: daysAgo(7), source: 'demo', sourceLabel: 'Demo Profile', createdAt: daysAgo(7) },
];

export const demoReports: MedicalReport[] = [
  {
    id: 'demo-rpt-1',
    title: 'Complete Blood Count (CBC)',
    category: 'lab_result',
    date: daysAgo(60),
    reportDate: daysAgo(60),
    provider: 'CityLab Diagnostics',
    status: 'analyzed',
    fileName: 'cbc_report_previous.pdf',
    fileType: 'application/pdf',
    source: 'demo',
    verified: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
    results: [
      { id: 'dr1-1', testName: 'Hemoglobin', value: '11.5', unit: 'g/dL', referenceRange: '12.0–15.5', status: 'outside_range', userVerified: true },
      { id: 'dr1-2', testName: 'White Blood Cells', value: '6.8', unit: '10³/µL', referenceRange: '4.5–11.0', status: 'within_range', userVerified: true },
      { id: 'dr1-3', testName: 'Platelets', value: '245', unit: '10³/µL', referenceRange: '150–400', status: 'within_range', userVerified: true },
      { id: 'dr1-4', testName: 'RBC Count', value: '4.1', unit: '10⁶/µL', referenceRange: '4.0–5.2', status: 'within_range', userVerified: true },
      { id: 'dr1-5', testName: 'Hematocrit', value: '36.2', unit: '%', referenceRange: '37.0–48.0', status: 'outside_range', userVerified: true },
    ],
    aiSummary: 'This Complete Blood Count report from 60 days ago shows hemoglobin at 11.5 g/dL, which is below the reference range of 12.0–15.5 g/dL. Hematocrit at 36.2% is also slightly below the reference range. White blood cells, platelets, and RBC count are within normal ranges.',
    aiExplanation: 'Hemoglobin is a protein in red blood cells that carries oxygen. A value below the reference range may indicate anemia. Hematocrit measures the proportion of blood made up of red blood cells.',
    doctorQuestions: [
      'What could be causing my hemoglobin to be below the reference range?',
      'Should I consider dietary changes or iron supplementation?',
      'Are there follow-up tests you would recommend?',
    ],
  },
  {
    id: 'demo-rpt-2',
    title: 'Complete Blood Count (CBC) — Follow-up',
    category: 'lab_result',
    date: daysAgo(7),
    reportDate: daysAgo(7),
    provider: 'CityLab Diagnostics',
    status: 'analyzed',
    fileName: 'cbc_report_latest.pdf',
    fileType: 'application/pdf',
    source: 'demo',
    verified: true,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(7),
    results: [
      { id: 'dr2-1', testName: 'Hemoglobin', value: '11.2', unit: 'g/dL', referenceRange: '12.0–15.5', status: 'outside_range', userVerified: true },
      { id: 'dr2-2', testName: 'White Blood Cells', value: '7.1', unit: '10³/µL', referenceRange: '4.5–11.0', status: 'within_range', userVerified: true },
      { id: 'dr2-3', testName: 'Platelets', value: '252', unit: '10³/µL', referenceRange: '150–400', status: 'within_range', userVerified: true },
      { id: 'dr2-4', testName: 'RBC Count', value: '4.0', unit: '10⁶/µL', referenceRange: '4.0–5.2', status: 'within_range', userVerified: true },
      { id: 'dr2-5', testName: 'Hematocrit', value: '35.8', unit: '%', referenceRange: '37.0–48.0', status: 'outside_range', userVerified: true },
    ],
    aiSummary: 'This follow-up CBC report from 7 days ago shows hemoglobin at 11.2 g/dL, still below the reference range. Compared to the previous report, hemoglobin decreased slightly from 11.5 to 11.2 g/dL. Hematocrit also decreased slightly from 36.2% to 35.8%.',
    aiExplanation: 'Hemoglobin is a protein in red blood cells that carries oxygen. A value below the reference range may indicate anemia. The slight decrease from the previous report is worth discussing with your doctor.',
    doctorQuestions: [
      'My hemoglobin decreased from 11.5 to 11.2 g/dL — should I be concerned?',
      'What follow-up tests or treatments would you recommend?',
      'Could my hypothyroidism be related to these results?',
    ],
  },
];

export const demoRecords: HealthRecord[] = [
  { id: 'demo-rec-1', title: 'Thyroid Panel', category: 'lab_result', date: daysAgo(45), provider: 'CityLab Diagnostics', status: 'analyzed', source: 'demo', createdAt: daysAgo(45), updatedAt: daysAgo(45) },
  { id: 'demo-rec-2', title: 'Annual Physical Exam', category: 'doctor_note', date: daysAgo(30), provider: 'Dr. Sarah Chen', status: 'uploaded', source: 'demo', createdAt: daysAgo(30), updatedAt: daysAgo(30) },
  { id: 'demo-rec-3', title: 'Levothyroxine Prescription', category: 'prescription', date: daysAgo(30), provider: 'Dr. Sarah Chen', status: 'uploaded', source: 'demo', createdAt: daysAgo(30), updatedAt: daysAgo(30) },
  { id: 'demo-rec-4', title: 'Influenza Vaccine', category: 'vaccination', date: daysAgo(75), provider: 'City Health Clinic', status: 'uploaded', source: 'demo', createdAt: daysAgo(75), updatedAt: daysAgo(75) },
];

export const demoMedications: Medication[] = [
  { id: 'demo-med-1', name: 'Levothyroxine', dosage: '50mcg', frequency: 'Once daily', time: '08:00', startDate: daysAgo(120), source: 'demo', takenToday: true, adherence: 92, notes: 'Take on empty stomach, 30 min before breakfast', createdAt: daysAgo(120), updatedAt: now },
  { id: 'demo-med-2', name: 'Vitamin D3', dosage: '1000 IU', frequency: 'Once daily', time: '12:00', startDate: daysAgo(60), source: 'demo', takenToday: false, adherence: 85, createdAt: daysAgo(60), updatedAt: now },
];

export const demoReminders: Reminder[] = [
  { id: 'demo-rem-1', title: 'Take Levothyroxine', type: 'medication', date: daysAhead(0), time: '08:00', completed: true, createdAt: now },
  { id: 'demo-rem-2', title: 'Take Vitamin D3', type: 'medication', date: daysAhead(0), time: '12:00', completed: false, createdAt: now },
  { id: 'demo-rem-3', title: 'Follow-up with Dr. Sarah Chen', type: 'appointment', date: daysAhead(3), time: '10:30', completed: false, createdAt: now },
  { id: 'demo-rem-4', title: 'Quarterly Blood Test', type: 'test', date: daysAhead(14), completed: false, createdAt: now },
  { id: 'demo-rem-5', title: 'Annual Physical Exam', type: 'checkup', date: daysAhead(45), completed: false, createdAt: now },
];

export const demoGoals: HealthGoal[] = [
  { id: 'demo-goal-1', name: 'Improve Sleep', targetValue: 8, currentValue: 7, unit: 'hours', progress: 75, category: 'sleep', source: 'demo', deadline: daysAhead(60), createdAt: daysAgo(30), updatedAt: now },
  { id: 'demo-goal-2', name: 'Track Blood Pressure', targetValue: 30, currentValue: 18, unit: 'days logged', progress: 60, category: 'blood_pressure', source: 'demo', deadline: daysAhead(45), createdAt: daysAgo(30), updatedAt: now },
  { id: 'demo-goal-3', name: 'Increase Activity', targetValue: 10000, currentValue: 8200, unit: 'steps/day', progress: 82, category: 'activity', source: 'demo', deadline: daysAhead(30), createdAt: daysAgo(30), updatedAt: now },
  { id: 'demo-goal-4', name: 'Stay Consistent with Medication', targetValue: 95, currentValue: 92, unit: '%', progress: 97, category: 'medication', source: 'demo', deadline: daysAhead(90), createdAt: daysAgo(30), updatedAt: now },
];

export const demoTimeline: TimelineEvent[] = [
  { id: 'dt-1', date: daysAgo(75), category: 'record', description: 'Influenza vaccination recorded', source: 'demo', createdAt: daysAgo(75) },
  { id: 'dt-2', date: daysAgo(60), category: 'report', description: 'Uploaded Complete Blood Count (CBC) report', source: 'demo', relatedId: 'demo-rpt-1', createdAt: daysAgo(60) },
  { id: 'dt-3', date: daysAgo(60), category: 'measurement', description: 'Weight recorded: 65.8 kg', source: 'demo', createdAt: daysAgo(60) },
  { id: 'dt-4', date: daysAgo(45), category: 'record', description: 'Thyroid Panel results uploaded', source: 'demo', createdAt: daysAgo(45) },
  { id: 'dt-5', date: daysAgo(30), category: 'appointment', description: 'Annual physical exam with Dr. Sarah Chen', source: 'demo', createdAt: daysAgo(30) },
  { id: 'dt-6', date: daysAgo(30), category: 'measurement', description: 'Blood pressure recorded: 120/78 mmHg', source: 'demo', createdAt: daysAgo(30) },
  { id: 'dt-7', date: daysAgo(30), category: 'goal', description: 'Created goal: Improve Sleep', source: 'demo', createdAt: daysAgo(30) },
  { id: 'dt-8', date: daysAgo(7), category: 'report', description: 'Uploaded follow-up CBC report', source: 'demo', relatedId: 'demo-rpt-2', createdAt: daysAgo(7) },
  { id: 'dt-9', date: daysAgo(7), category: 'measurement', description: 'Weight recorded: 64.5 kg', source: 'demo', createdAt: daysAgo(7) },
];

export const demoInsights: AIInsight[] = [
  {
    id: 'di-1',
    title: 'Hemoglobin below reference range in two reports',
    explanation: 'Your uploaded CBC reports from 60 days ago and 7 days ago both show hemoglobin below the reference range (12.0–15.5 g/dL). The value decreased slightly from 11.5 to 11.2 g/dL between the two reports.',
    category: 'trend',
    priority: 'high',
    sourceData: ['CBC — 60 days ago', 'CBC Follow-up — 7 days ago'],
    date: now,
    relatedRecordId: 'demo-rpt-2',
  },
  {
    id: 'di-2',
    title: 'Blood pressure trending downward',
    explanation: 'Your blood pressure measurements show a decreasing trend: 122/80 → 120/78 → 118/76 mmHg over the past 60 days. All readings are within a typical range.',
    category: 'trend',
    priority: 'low',
    sourceData: ['Blood Pressure — 60 days ago', 'Blood Pressure — 30 days ago', 'Blood Pressure — 7 days ago'],
    date: now,
  },
  {
    id: 'di-3',
    title: 'Questions for your upcoming appointment',
    explanation: 'You have a follow-up appointment with Dr. Sarah Chen in 3 days. Based on your report data, consider discussing your hemoglobin levels and whether follow-up tests are needed.',
    category: 'doctor_question',
    priority: 'medium',
    sourceData: ['Appointment reminder', 'CBC Follow-up — 7 days ago'],
    date: now,
  },
  {
    id: 'di-4',
    title: 'Vitamin D3 not taken today',
    explanation: 'Your medication tracking shows Vitamin D3 has not been marked as taken today. Your adherence rate is 85%.',
    category: 'reminder',
    priority: 'medium',
    sourceData: ['Medication: Vitamin D3'],
    date: now,
  },
  {
    id: 'di-5',
    title: 'Missing family history detail',
    explanation: 'Your profile includes family history of Type 2 Diabetes and Hypertension. Consider discussing screening schedules with your doctor, as family history can be relevant to preventive care.',
    category: 'missing_info',
    priority: 'low',
    sourceData: ['Health Profile'],
    date: now,
  },
];
