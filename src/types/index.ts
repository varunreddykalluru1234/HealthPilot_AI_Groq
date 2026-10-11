export type UUID = string;

export type DataSource = 'user' | 'demo' | 'extraction';

export type UserMode = 'demo' | 'real';

export interface UserProfile {
  id: UUID;
  mode: UserMode;
  fullName: string;
  email: string;
  avatarUrl?: string;
  age?: number;
  dateOfBirth?: string;
  gender?: string;
  height?: number; // cm
  weight?: number; // kg
  bloodGroup?: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  conditions: string[];
  allergies: string[];
  medications: string[];
  familyHistory: string[];
  sleepHours?: number;
  exerciseFrequency?: string;
  diet?: string;
  waterIntake?: number; // glasses per day
  goals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HealthMeasurement {
  id: UUID;
  type: MeasurementType;
  value: number;
  unit: string;
  secondaryValue?: number;
  secondaryUnit?: string;
  date: string;
  source: DataSource;
  sourceLabel: string;
  notes?: string;
  createdAt: string;
}

export type MeasurementType =
  | 'weight'
  | 'blood_pressure'
  | 'heart_rate'
  | 'sleep'
  | 'activity'
  | 'water'
  | 'glucose'
  | 'temperature';

export type RecordCategory =
  | 'medical_report'
  | 'lab_result'
  | 'prescription'
  | 'doctor_note'
  | 'vaccination'
  | 'other';

export type RecordStatus = 'uploaded' | 'analyzed' | 'pending';

export interface HealthRecord {
  id: UUID;
  title: string;
  category: RecordCategory;
  date: string;
  provider?: string;
  status: RecordStatus;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  source: DataSource;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportResult {
  id: UUID;
  testName: string;
  value: string;
  unit: string;
  referenceRange?: string;
  status: ResultStatus;
  userVerified: boolean;
  sourceText?: string;
  page?: number;
}

export type ResultStatus = 'within_range' | 'outside_range' | 'review_recommended';

/** A medicine extracted from a prescription or discharge summary */
export interface ExtractedMedicine {
  id: UUID;
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  userVerified: boolean;
}

/** A diagnosis extracted from a medical document */
export interface ExtractedDiagnosis {
  id: UUID;
  text: string;          // e.g., "Type 2 Diabetes Mellitus"
  icdCode?: string;      // e.g., "E11"
  type: 'primary' | 'secondary' | 'differential';
  userVerified: boolean;
}

/** Structured data extracted from a discharge summary */
export interface DischargeSummaryData {
  admissionDate?: string;
  dischargeDate?: string;
  admittingDiagnosis?: string;
  dischargeDiagnosis?: string;
  procedures?: string[];
  followUpInstructions?: string;
  followUpDate?: string;
  attendingPhysician?: string;
  ward?: string;
}

/** High-level document type classification */
export type DocumentType =
  | 'lab_report'
  | 'prescription'
  | 'discharge_summary'
  | 'doctor_note'
  | 'radiology_report'
  | 'vaccination_record'
  | 'unknown';

export interface MedicalReport extends HealthRecord {
  reportDate: string;
  provider?: string;
  results: ReportResult[];
  aiSummary?: string;
  aiExplanation?: string;
  doctorQuestions?: string[];
  verified: boolean;
  /** Detected document type */
  documentType?: DocumentType;
  /** Medicines extracted from prescription / discharge */
  medicines?: ExtractedMedicine[];
  /** Diagnoses extracted from any document */
  diagnoses?: ExtractedDiagnosis[];
  /** Structured discharge summary data */
  dischargeSummary?: DischargeSummaryData;
}

export interface Medication {
  id: UUID;
  name: string;
  dosage: string;
  frequency: string;
  time: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  source: DataSource;
  takenToday: boolean;
  /** ISO date string (YYYY-MM-DD) of the last day this was marked taken.
   * Used to detect day rollover without a background timer: if this value
   * differs from today's date the medication has not yet been taken today. */
  lastTakenDate?: string;
  /** Every ISO date (YYYY-MM-DD) on which this medication was marked taken.
   * Used to calculate real adherence from recorded history only. */
  takenDates?: string[];
  adherence: number; // percentage 0-100
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: UUID;
  title: string;
  type: ReminderType;
  date: string;
  time?: string;
  completed: boolean;
  notes?: string;
  createdAt: string;
}

export type ReminderType = 'medication' | 'appointment' | 'checkup' | 'test' | 'goal';

export interface HealthGoal {
  id: UUID;
  name: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number; // 0-100
  deadline?: string;
  category: string;
  source: DataSource;
  createdAt: string;
  updatedAt: string;
}

export type TimelineCategory =
  | 'report'
  | 'medication'
  | 'appointment'
  | 'measurement'
  | 'goal'
  | 'record';

export interface TimelineEvent {
  id: UUID;
  date: string;
  category: TimelineCategory;
  description: string;
  source: DataSource;
  relatedId?: UUID;
  createdAt: string;
}

export type InsightCategory =
  | 'trend'
  | 'record'
  | 'goal'
  | 'reminder'
  | 'doctor_question'
  | 'missing_info';

export type InsightPriority = 'high' | 'medium' | 'low';

export interface AIInsight {
  id: UUID;
  title: string;
  explanation: string;
  category: InsightCategory;
  priority: InsightPriority;
  sourceData: string[];
  date: string;
  relatedRecordId?: UUID;
}

export interface ChatMessage {
  id: UUID;
  role: 'user' | 'assistant';
  content: string;
  basedOnData?: string[];
  generalInfo?: string;
  suggestedQuestions?: string[];
  timestamp: string;
}

export interface Conversation {
  id: UUID;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AbhaConnection {
  isConnected: boolean;
  abhaId?: string;
  abhaAddress?: string;
  fullName?: string;
  gender?: string;
  dateOfBirth?: string;
  mobile?: string;
  connectedAt?: string;
  consentGiven: boolean;
  hipName?: string;
}

export interface AppState {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  mode: UserMode;
  profile: UserProfile | null;
  measurements: HealthMeasurement[];
  records: HealthRecord[];
  reports: MedicalReport[];
  medications: Medication[];
  reminders: Reminder[];
  goals: HealthGoal[];
  timeline: TimelineEvent[];
  insights: AIInsight[];
  conversations: ChatMessage[];
  abhaConnection?: AbhaConnection;
  importedAbhaRecordIds?: string[];
}

