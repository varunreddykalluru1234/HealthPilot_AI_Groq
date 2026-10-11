/**
 * extractionService.ts
 *
 * Handles text extraction from:
 *  - Plain text / pasted text  (direct)
 *  - Text-based PDFs           (PDF.js embedded-text extraction)
 *  - Scanned PDFs              (PDF.js → canvas → Tesseract OCR per page)
 *  - Image files (JPG/PNG)     (Tesseract.js OCR)
 *
 * After extraction the text is passed through a pipeline that:
 *  1. Classifies the document type (lab_report, prescription, discharge_summary, …)
 *  2. Extracts lab test values        (existing)
 *  3. Extracts medicines & dosages    (NEW — prescriptions / discharge summaries)
 *  4. Extracts diagnoses              (NEW — all document types)
 *  5. Parses discharge summary fields (NEW)
 *  6. Extracts metadata (date, provider, title) with extended text-date support
 *
 * IMPORTANT: OCR results must be verified by the user against the original
 * document before saving. This service never invents medical values.
 */

import type {
  ReportResult,
  MedicalReport,
  ExtractedMedicine,
  ExtractedDiagnosis,
  DischargeSummaryData,
  DocumentType,
} from '@/types';
import { uid, classifyResult } from '@/utils/helpers';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface ExtractionResult {
  reportTitle: string;
  reportDate: string;
  provider: string;
  results: ReportResult[];
  rawText: string;
  success: boolean;
  partialExtraction: boolean;
  /** Populated when OCR was used — a reminder to verify */
  ocrUsed?: boolean;
  /** Detected document type */
  documentType: DocumentType;
  /** Extracted medicines (prescriptions / discharge summaries) */
  medicines: ExtractedMedicine[];
  /** Extracted diagnoses */
  diagnoses: ExtractedDiagnosis[];
  /** Structured discharge summary data */
  dischargeSummary?: DischargeSummaryData;
}

/** Called during extraction so the UI can display live progress (0–100). */
export type ProgressCallback = (pct: number, label: string) => void;

// ─── Document type classification ───────────────────────────────────────────────

/**
 * Classify the document type based on keyword density in the text.
 * Uses a scoring approach so the most-matching type wins.
 */
export function classifyDocumentType(text: string): DocumentType {
  const t = text.toLowerCase();

  const scores: Record<DocumentType, number> = {
    lab_report: 0,
    prescription: 0,
    discharge_summary: 0,
    doctor_note: 0,
    radiology_report: 0,
    vaccination_record: 0,
    unknown: 0,
  };

  // Lab report indicators
  if (/\b(reference\s*range|ref\.?\s*range|normal\s*range)\b/.test(t)) scores.lab_report += 4;
  if (/\b(hemoglobin|hematocrit|platelet|wbc|rbc|glucose|cholesterol|creatinine|alt|ast|tsh)\b/.test(t)) scores.lab_report += 3;
  if (/\b(lab(oratory)?|diagnostic|pathology|specimen|collected|reported)\b/.test(t)) scores.lab_report += 2;
  if (/\b(cbc|complete blood count|lipid panel|liver function|renal function|thyroid panel)\b/.test(t)) scores.lab_report += 3;

  // Prescription indicators
  if (/\b(rx\b|prescription|prescribe[d]?)\b/.test(t)) scores.prescription += 4;
  if (/\b(sig:|take\s+\d|tablet[s]?|capsule[s]?|mg\b|mcg\b|ml\b)\b/.test(t)) scores.prescription += 3;
  if (/\b(refill|dispense|pharmacy|pharmacist|qty\.|quantity)\b/.test(t)) scores.prescription += 3;
  if (/\b(once daily|twice daily|three times|bid\b|tid\b|qid\b|prn\b|po\b)\b/.test(t)) scores.prescription += 3;
  if (/\b(prescribed by|prescribing physician|dr\.?\s+\w+)\b/.test(t)) scores.prescription += 2;

  // Discharge summary indicators
  if (/\b(discharge\s*summary|discharge\s*note|date of discharge|discharged on)\b/.test(t)) scores.discharge_summary += 5;
  if (/\b(admission|admitted|date of admission|admitting diagnosis)\b/.test(t)) scores.discharge_summary += 3;
  if (/\b(discharge\s*diagnosis|principal\s*diagnosis|final\s*diagnosis)\b/.test(t)) scores.discharge_summary += 4;
  if (/\b(follow.?up|follow up in|follow up with|discharge instructions)\b/.test(t)) scores.discharge_summary += 2;
  if (/\b(ward|inpatient|hospital stay|length of stay|attending physician)\b/.test(t)) scores.discharge_summary += 2;
  if (/\b(procedure[s]?|surgery|operation|surgical)\b/.test(t)) scores.discharge_summary += 1;

  // Radiology report indicators
  if (/\b(x.?ray|mri|ct\s*scan|ultrasound|sonograph|radiolog|imaging|impression:)\b/.test(t)) scores.radiology_report += 4;
  if (/\b(findings:|technique:|clinical\s*indication)\b/.test(t)) scores.radiology_report += 3;

  // Doctor note indicators
  if (/\b(soap\s*note|progress\s*note|clinic\s*note|chief\s*complaint|history\s*of\s*present)\b/.test(t)) scores.doctor_note += 4;
  if (/\b(assessment\s*and\s*plan|subjective:|objective:|assessment:|plan:)\b/.test(t)) scores.doctor_note += 3;

  // Vaccination record indicators
  if (/\b(vaccin|immuniz|inocul|vaccine\s*name|dose\s*number|lot\s*number|vial)\b/.test(t)) scores.vaccination_record += 4;

  // Pick highest scorer
  let best: DocumentType = 'unknown';
  let bestScore = 0;
  for (const [type, score] of Object.entries(scores) as [DocumentType, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = type;
    }
  }
  return bestScore >= 2 ? best : 'unknown';
}

// ─── Known lab-test patterns ────────────────────────────────────────────────────

const knownTestPatterns: { name: string; patterns: RegExp[]; unit: string; refRange: string }[] = [
  { name: 'Hemoglobin',        patterns: [/h[ae]moglobin/i, /hb\b/i, /hgb\b/i],                   unit: 'g/dL',    refRange: '12.0–15.5' },
  { name: 'White Blood Cells', patterns: [/white\s*blood\s*cell/i, /wbc\b/i],                      unit: '10³/µL', refRange: '4.5–11.0' },
  { name: 'Platelets',         patterns: [/platelet/i, /plt\b/i],                                   unit: '10³/µL', refRange: '150–400' },
  { name: 'RBC Count',         patterns: [/rbc\b/i, /red\s*blood\s*cell/i],                        unit: '10⁶/µL', refRange: '4.0–5.2' },
  { name: 'Hematocrit',        patterns: [/hematocrit/i, /hct\b/i],                                unit: '%',      refRange: '37.0–48.0' },
  { name: 'Glucose',           patterns: [/glucose/i, /blood\s*sugar/i, /fbs\b/i],                 unit: 'mg/dL',  refRange: '70–100' },
  { name: 'Cholesterol',       patterns: [/total\s*cholesterol/i, /cholesterol\b/i],               unit: 'mg/dL',  refRange: '<200' },
  { name: 'LDL',               patterns: [/ldl\b/i, /low.?density/i],                              unit: 'mg/dL',  refRange: '<100' },
  { name: 'HDL',               patterns: [/hdl\b/i, /high.?density/i],                             unit: 'mg/dL',  refRange: '>40' },
  { name: 'Triglycerides',     patterns: [/triglyceride/i],                                         unit: 'mg/dL',  refRange: '<150' },
  { name: 'TSH',               patterns: [/tsh\b/i, /thyroid\s*stimulating/i],                     unit: 'mIU/L',  refRange: '0.4–4.0' },
  { name: 'Vitamin D',         patterns: [/vitamin\s*d/i, /25.?oh.?d/i],                          unit: 'ng/mL',  refRange: '30–100' },
  { name: 'Iron',              patterns: [/\biron\b/i],                                             unit: 'µg/dL',  refRange: '60–170' },
  { name: 'Creatinine',        patterns: [/creatinine/i],                                           unit: 'mg/dL',  refRange: '0.6–1.2' },
  { name: 'ALT',               patterns: [/\balt\b/i, /alanine/i],                                 unit: 'U/L',    refRange: '7–56' },
  { name: 'AST',               patterns: [/\bast\b/i, /aspartate/i],                               unit: 'U/L',    refRange: '10–40' },
  { name: 'Urea / BUN',        patterns: [/\burea\b/i, /\bbun\b/i, /blood\s*urea\s*nitrogen/i],   unit: 'mg/dL',  refRange: '7–20' },
  { name: 'Uric Acid',         patterns: [/uric\s*acid/i],                                          unit: 'mg/dL',  refRange: '3.4–7.0' },
  { name: 'Bilirubin (Total)', patterns: [/total\s*bilirubin/i, /t\.?\s*bili\b/i],                unit: 'mg/dL',  refRange: '0.2–1.2' },
  { name: 'Albumin',           patterns: [/\balbumin\b/i],                                          unit: 'g/dL',   refRange: '3.5–5.0' },
  { name: 'Calcium',           patterns: [/\bcalcium\b/i],                                          unit: 'mg/dL',  refRange: '8.5–10.5' },
  { name: 'Sodium',            patterns: [/\bsodium\b/i, /\bna\+?\b/i],                            unit: 'mEq/L',  refRange: '135–145' },
  { name: 'Potassium',         patterns: [/\bpotassium\b/i, /\bk\+?\b/i],                         unit: 'mEq/L',  refRange: '3.5–5.0' },
  { name: 'HbA1c',             patterns: [/hba1c/i, /glycated\s*hemoglobin/i, /a1c\b/i],          unit: '%',      refRange: '<5.7' },
  { name: 'eGFR',              patterns: [/egfr\b/i, /estimated\s*gfr/i],                          unit: 'mL/min', refRange: '>60' },
];

// ─── Lab value pattern helpers ───────────────────────────────────────────────────

function extractValueNearLabel(text: string, patterns: RegExp[]): { value: string; range: string | undefined } | null {
  for (const pattern of patterns) {
    const lines = text.split('\n');
    for (const line of lines) {
      if (pattern.test(line)) {
        const valueMatch = line.match(/(\d+\.?\d*)\s*(?:g\/dL|mg\/dL|µg\/dL|10[³⁶]\/µL|%|mIU\/L|ng\/mL|U\/L|mmol\/L|mEq\/L|mL\/min)?/i);
        if (valueMatch) {
          const rangeMatch = line.match(/(\d+\.?\d*\s*[-–]\s*\d+\.?\d*|<\s*\d+\.?\d*|>\s*\d+\.?\d*)/);
          return { value: valueMatch[1], range: rangeMatch ? rangeMatch[1].replace('–', '-') : undefined };
        }
        const nextLineIdx = lines.indexOf(line) + 1;
        if (nextLineIdx < lines.length) {
          const nextLine = lines[nextLineIdx];
          const nextValue = nextLine.match(/(\d+\.?\d*)/);
          if (nextValue) {
            const nextRange = nextLine.match(/(\d+\.?\d*\s*[-–]\s*\d+\.?\d*|<\s*\d+\.?\d*|>\s*\d+\.?\d*)/);
            return { value: nextValue[1], range: nextRange ? nextRange[1].replace('–', '-') : undefined };
          }
        }
      }
    }
  }
  return null;
}

// ─── Date extraction (extended) ─────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07',
  aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

function normalizeDate(raw: string): string | null {
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
}

export function extractDate(text: string): string | null {
  // 1. Numeric formats: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, YYYY/MM/DD
  const numericPatterns = [
    /(?:date[:\s]+)?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i,
    /(?:date[:\s]+)?(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i,
    /(?:collected|reported|discharged?|admitted?)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ];
  for (const p of numericPatterns) {
    const m = text.match(p);
    if (m) {
      const parts = (m[1] ?? '').includes('/') ? (m[1] ?? '').split('/') : (m[1] ?? '').split('-');
      const candidate = m[0].replace(/^[^0-9]+/, '').trim();
      const d = normalizeDate(candidate);
      if (d) return d;
    }
  }

  // 2. Text-date formats: "01 Jan 2026", "January 1, 2026", "1st October 2025"
  const textDatePattern = /(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{4})/i;
  const textDatePattern2 = /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i;

  let m = text.match(textDatePattern);
  if (m) {
    const month = MONTH_MAP[m[2].toLowerCase()];
    if (month) {
      const d = normalizeDate(`${m[3]}-${month}-${m[1].padStart(2, '0')}`);
      if (d) return d;
    }
  }
  m = text.match(textDatePattern2);
  if (m) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month) {
      const d = normalizeDate(`${m[3]}-${month}-${m[2].padStart(2, '0')}`);
      if (d) return d;
    }
  }

  return null;
}

function extractProvider(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines.slice(0, 10)) {
    if (/lab|diagnostic|hospital|clinic|medical|health|center|pharmacy|dispensary/i.test(line) && line.length < 80) {
      return line.trim();
    }
  }
  return '';
}

function extractTitle(text: string): string {
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines.slice(0, 15)) {
    if (/blood|panel|test|report|count|profile|urinalysis|lipid|thyroid|liver|kidney|cbc|prescription|discharge|summary|radiology|vaccination|x.?ray|mri|ct\s*scan/i.test(line) && line.length < 80) {
      return line.trim();
    }
  }
  if (lines.length) return lines[0].trim().substring(0, 60);
  return 'Medical Report';
}

// ─── Medicine / Prescription extraction ─────────────────────────────────────────

/**
 * Common dosage units regex fragment
 */
const DOSAGE_UNITS = /(?:mg|mcg|µg|g|ml|mL|IU|units?|tabs?|tablets?|capsules?|drops?|puffs?)/i;

/**
 * Frequency / SIG patterns
 */
const FREQUENCY_PATTERNS: { pattern: RegExp; label: string }[] = [
  { pattern: /\bonce\s+daily\b|\b1\s*(?:x|times?)\s*(?:a\s*)?day\b|\bOD\b|\bqd\b/i, label: 'Once daily' },
  { pattern: /\btwice\s+daily\b|\b2\s*(?:x|times?)\s*(?:a\s*)?day\b|\bBD\b|\bBID\b/i, label: 'Twice daily' },
  { pattern: /\bthrice\s+daily\b|\b3\s*(?:x|times?)\s*(?:a\s*)?day\b|\bTDS\b|\bTID\b/i, label: 'Three times daily' },
  { pattern: /\b4\s*(?:x|times?)\s*(?:a\s*)?day\b|\bQDS\b|\bQID\b/i, label: 'Four times daily' },
  { pattern: /\bevery\s+(\d+)\s*hours?\b|\bq(\d+)h\b/i, label: 'Every N hours' },
  { pattern: /\bat\s+bedtime\b|\bhs\b|\bbedtime\b/i, label: 'At bedtime' },
  { pattern: /\bweekly\b/i, label: 'Weekly' },
  { pattern: /\bas\s+needed\b|\bprn\b|\bwhen\s+required\b/i, label: 'As needed' },
];

function detectFrequency(text: string): string {
  for (const { pattern, label } of FREQUENCY_PATTERNS) {
    if (pattern.test(text)) return label;
  }
  return '';
}

/** Duration patterns: "for 5 days", "x 10 days", "7 days course" */
const DURATION_PATTERN = /(?:for|x|course\s+of)?\s*(\d+)\s*(?:day|week|month)s?/i;

/**
 * Extract medicines from prescription text.
 *
 * Strategy:
 *  - Look for "medicine name + dosage" pairs on the same line or adjacent lines.
 *  - Common prescription table structures: Sl.No | Medicine | Dosage | Frequency | Duration
 *  - Also handles Rx-list style: "1. Metformin 500mg - twice daily x 30 days"
 */
export function extractMedicines(text: string): ExtractedMedicine[] {
  const medicines: ExtractedMedicine[] = [];
  const lines = text.split('\n');
  const seen = new Set<string>();

  // Pattern 1: "DrugName dose unit frequency duration" on a single line
  // e.g. "Metformin 500 mg twice daily for 30 days"
  // e.g. "Tab. Amoxicillin 500mg BD x 7 days"
  const linePattern = new RegExp(
    /(?:tab(?:let)?s?\.?\s*|cap(?:sule)?s?\.?\s*|syp\.?\s*|inj\.?\s*|drop[s]?\.?\s*)?/.source +
    /([A-Z][a-zA-Z\s\-\/]+?)\s+/.source +       // drug name (starts with capital)
    /(\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|mL|IU|units?)\b)/.source, // dosage
    'g'
  );

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    let match;
    const re = new RegExp(linePattern.source, 'gi');
    while ((match = re.exec(trimmed)) !== null) {
      const rawName = match[1].trim().replace(/^(tab|cap|syp|inj|drop)\.?\s*/i, '').trim();
      // Filter out non-drug words
      if (/\b(date|name|patient|doctor|hospital|clinic|age|sex|address|phone|ref|report)\b/i.test(rawName)) continue;
      if (rawName.length < 3 || rawName.split(' ').length > 5) continue;

      const dosage = match[2].trim();
      const frequency = detectFrequency(trimmed);
      const durationMatch = trimmed.match(DURATION_PATTERN);
      const duration = durationMatch ? durationMatch[0].trim() : undefined;
      const instructions = trimmed.length < 200 ? trimmed : undefined;
      const key = `${rawName.toLowerCase()}|${dosage.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.add(key);
        medicines.push({
          id: uid('med-x-'),
          name: rawName,
          dosage,
          frequency: frequency || 'As directed',
          duration,
          instructions,
          userVerified: false,
        });
      }
    }
  }

  // Pattern 2: Numbered / bulleted list style without inline dosage found above
  // e.g. "1. Paracetamol 650mg" or "• Atorvastatin 10mg"
  if (medicines.length === 0) {
    const listPattern = /^[\d\.\-\•\*]\s*(?:tab\.?\s*|cap\.?\s*|syp\.?\s*)?([A-Z][a-zA-Z\s\-]{2,40}?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|µg|g|ml|mL|IU|units?)\b)/gim;
    let m2;
    while ((m2 = listPattern.exec(text)) !== null) {
      const rawName = m2[1].trim();
      if (/\b(date|name|patient|doctor|hospital|clinic|report)\b/i.test(rawName)) continue;
      const dosage = m2[2].trim();
      const lineText = text.split('\n').find(l => l.includes(m2![0])) ?? '';
      const frequency = detectFrequency(lineText);
      const durationMatch = lineText.match(DURATION_PATTERN);
      const key = `${rawName.toLowerCase()}|${dosage.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        medicines.push({
          id: uid('med-x-'),
          name: rawName,
          dosage,
          frequency: frequency || 'As directed',
          duration: durationMatch ? durationMatch[0].trim() : undefined,
          userVerified: false,
        });
      }
    }
  }

  return medicines;
}

// ─── Diagnosis extraction ────────────────────────────────────────────────────────

const DIAGNOSIS_TRIGGER_PATTERNS: { pattern: RegExp; type: ExtractedDiagnosis['type'] }[] = [
  { pattern: /(?:diagnosis|diagnosed\s+with|clinical\s+diagnosis)[:\s]+(.+)/i,             type: 'primary' },
  { pattern: /(?:primary\s+diagnosis|admitting\s+diagnosis|final\s+diagnosis)[:\s]+(.+)/i, type: 'primary' },
  { pattern: /(?:discharge\s+diagnosis|discharged\s+with)[:\s]+(.+)/i,                     type: 'primary' },
  { pattern: /(?:secondary\s+diagnosis|co-?morbid(?:ity)?)[:\s]+(.+)/i,                    type: 'secondary' },
  { pattern: /(?:differential\s+diagnosis|ddx)[:\s]+(.+)/i,                                 type: 'differential' },
  { pattern: /(?:impression|assessment)[:\s]+([A-Z][^.\n]{5,100})/,                         type: 'primary' },
  { pattern: /(?:plan)[:\s]+.*?(?:for|of)\s+([A-Z][a-z][^.\n]{5,80})/,                     type: 'primary' },
];

/** Common ICD-like shorthand patterns to look for near a diagnosis text */
const ICD_PATTERN = /\b([A-Z]\d{2}(?:\.\d{1,2})?)\b/;

export function extractDiagnoses(text: string): ExtractedDiagnosis[] {
  const diagnoses: ExtractedDiagnosis[] = [];
  const seen = new Set<string>();

  for (const { pattern, type } of DIAGNOSIS_TRIGGER_PATTERNS) {
    const m = text.match(pattern);
    if (!m) continue;

    const raw = m[1].trim().split('\n')[0].trim(); // first line only
    // Clean up trailing noise
    const clean = raw
      .replace(/\s*[,;:]\s*$/, '')
      .replace(/^\d+\.\s*/, '')
      .trim();

    if (clean.length < 4 || /^(the|a|an|is|was|has|have)\b/i.test(clean)) continue;
    const key = clean.toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) continue;
    seen.add(key);

    // Check for ICD code in the same line
    const icdMatch = clean.match(ICD_PATTERN) ?? raw.match(ICD_PATTERN);

    diagnoses.push({
      id: uid('dx-'),
      text: clean,
      icdCode: icdMatch ? icdMatch[1] : undefined,
      type,
      userVerified: false,
    });
  }

  // Also look for ICD codes that appear with their description in parentheses/brackets
  const icdWithDesc = /\b([A-Z]\d{2}(?:\.\d{1,2})?)\s*[-–:]\s*([A-Za-z][^.\n]{5,80})/g;
  let im;
  while ((im = icdWithDesc.exec(text)) !== null) {
    const code = im[1];
    const desc = im[2].trim();
    if (desc.length < 5) continue;
    const key = desc.toLowerCase().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.add(key);
      diagnoses.push({
        id: uid('dx-'),
        text: desc,
        icdCode: code,
        type: 'primary',
        userVerified: false,
      });
    }
  }

  return diagnoses;
}

// ─── Discharge summary extraction ────────────────────────────────────────────────

export function extractDischargeSummary(text: string): DischargeSummaryData {
  const summary: DischargeSummaryData = {};

  const field = (patterns: RegExp[]): string | undefined => {
    for (const p of patterns) {
      const m = text.match(p);
      if (m) {
        const val = (m[1] ?? '').trim().split('\n')[0].trim();
        if (val) return val;
      }
    }
    return undefined;
  };

  // Dates
  const admDate = field([
    /(?:date\s*of\s*admission|admitted\s*on|admission\s*date)[:\s]+([^\n]+)/i,
    /(?:admission)[:\s]+([^\n]+\d{4})/i,
  ]);
  if (admDate) summary.admissionDate = extractDate(admDate) ?? admDate;

  const discDate = field([
    /(?:date\s*of\s*discharge|discharged\s*on|discharge\s*date)[:\s]+([^\n]+)/i,
    /(?:discharge)[:\s]+([^\n]+\d{4})/i,
  ]);
  if (discDate) summary.dischargeDate = extractDate(discDate) ?? discDate;

  // Follow-up date
  const fuDate = field([
    /(?:follow.?up\s*(?:date|on|in))[:\s]+([^\n]+)/i,
    /(?:review|next\s*visit|next\s*appointment)[:\s]+([^\n]+)/i,
  ]);
  if (fuDate) summary.followUpDate = extractDate(fuDate) ?? fuDate;

  // Physician
  summary.attendingPhysician = field([
    /(?:attending\s*physician|treating\s*doctor|consultant|dr\.)[:\s]+([^\n]+)/i,
    /(?:signed\s*by|prepared\s*by)[:\s]+([^\n]+)/i,
  ]);

  // Ward
  summary.ward = field([
    /(?:ward|unit|department|dept\.?)[:\s]+([^\n]+)/i,
  ]);

  // Diagnoses
  summary.admittingDiagnosis = field([
    /(?:admitting\s*diagnosis|reason\s*for\s*admission)[:\s]+([^\n]+)/i,
  ]);
  summary.dischargeDiagnosis = field([
    /(?:discharge\s*diagnosis|final\s*diagnosis|principal\s*diagnosis)[:\s]+([^\n]+)/i,
  ]);

  // Procedures
  const procText = field([
    /(?:procedures?|surgeries|operations?|interventions?)[:\s]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
  ]);
  if (procText) {
    summary.procedures = procText
      .split(/[,;\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 2);
  }

  // Follow-up instructions
  summary.followUpInstructions = field([
    /(?:follow.?up\s*instructions?|discharge\s*instructions?|advice\s*on\s*discharge)[:\s]+([^\n]+(?:\n(?!\n)[^\n]+)*)/i,
    /(?:to\s*return\s*in)[:\s]+([^\n]+)/i,
  ]);

  return summary;
}

// ─── Helpers to decide if extracted text is meaningful ─────────────────────────

function isMeaningfulText(text: string): boolean {
  const stripped = text.replace(/\s/g, '');
  if (stripped.length < 50) return false;
  const alphaRatio = (stripped.match(/[A-Za-z0-9]/g)?.length ?? 0) / stripped.length;
  return alphaRatio > 0.4;
}

// ─── PDF extraction ─────────────────────────────────────────────────────────────

async function extractTextFromPDF(
  file: File,
  onProgress?: ProgressCallback,
  ocrLang?: string,
): Promise<{ text: string; ocrUsed: boolean }> {
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const numPages = pdf.numPages;
  let fullText = '';

  onProgress?.(10, `Reading PDF (${numPages} page${numPages > 1 ? 's' : ''})…`);

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    fullText += pageText + '\n';
    onProgress?.(10 + Math.round((pageNum / numPages) * 40), `Extracting page ${pageNum}/${numPages}…`);
  }

  if (isMeaningfulText(fullText)) {
    onProgress?.(55, 'Text extraction complete.');
    return { text: fullText.trim(), ocrUsed: false };
  }

  onProgress?.(55, 'No embedded text found — starting OCR…');

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(ocrLang ?? 'eng', 1, {
    logger: () => {},
  });

  let ocrText = '';

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress?.(
      55 + Math.round(((pageNum - 1) / numPages) * 40),
      `OCR page ${pageNum}/${numPages}…`,
    );

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    await page.render({ canvas, canvasContext: ctx, viewport }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    const { data } = await worker.recognize(dataUrl);
    ocrText += data.text + '\n';

    canvas.width = 0;
    canvas.height = 0;
  }

  await worker.terminate();
  onProgress?.(98, 'OCR complete.');

  return { text: ocrText.trim(), ocrUsed: true };
}

// ─── Image OCR ─────────────────────────────────────────────────────────────────

async function ocrImage(
  file: File,
  onProgress?: ProgressCallback,
  ocrLang?: string,
): Promise<string> {
  onProgress?.(10, 'Preparing image for OCR…');

  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker(ocrLang ?? 'eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') {
        onProgress?.(10 + Math.round(m.progress * 85), `OCR: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  const url = URL.createObjectURL(file);
  const { data } = await worker.recognize(url);
  await worker.terminate();
  URL.revokeObjectURL(url);

  onProgress?.(98, 'OCR complete.');
  return data.text;
}

// ─── Core text analysis ────────────────────────────────────────────────────────

export async function extractFromText(text: string): Promise<ExtractionResult> {
  await new Promise((r) => setTimeout(r, 600));

  // 1. Classify document type
  const documentType = classifyDocumentType(text);

  // 2. Extract lab results (always attempt, most useful for lab_report)
  const results: ReportResult[] = [];
  for (const testDef of knownTestPatterns) {
    const extracted = extractValueNearLabel(text, testDef.patterns);
    if (extracted) {
      const refRange = extracted.range || testDef.refRange;
      results.push({
        id: uid('res-'),
        testName: testDef.name,
        value: extracted.value,
        unit: testDef.unit,
        referenceRange: refRange,
        status: classifyResult(extracted.value, refRange),
        userVerified: false,
        sourceText: text.split('\n').find((l) => testDef.patterns.some((p) => p.test(l)))?.trim(),
      });
    }
  }

  // 3. Extract medicines (prescriptions + discharge summaries)
  const medicines =
    documentType === 'prescription' || documentType === 'discharge_summary' || documentType === 'unknown'
      ? extractMedicines(text)
      : [];

  // 4. Extract diagnoses (all document types except pure lab reports)
  const diagnoses = extractDiagnoses(text);

  // 5. Extract discharge summary fields
  const dischargeSummary =
    documentType === 'discharge_summary'
      ? extractDischargeSummary(text)
      : undefined;

  // 6. Metadata
  const date = extractDate(text) || new Date().toISOString().split('T')[0];
  const provider = extractProvider(text);
  const title = buildTitle(documentType, text);

  const foundAny = results.length > 0 || medicines.length > 0 || diagnoses.length > 0;

  return {
    reportTitle: title,
    reportDate: date,
    provider,
    results,
    rawText: text,
    success: foundAny,
    partialExtraction: foundAny && results.length < 3 && medicines.length === 0 && diagnoses.length === 0,
    documentType,
    medicines,
    diagnoses,
    dischargeSummary,
  };
}

/** Build a human-friendly title based on the detected document type */
function buildTitle(docType: DocumentType, text: string): string {
  const typeLabels: Partial<Record<DocumentType, string>> = {
    prescription: 'Prescription',
    discharge_summary: 'Discharge Summary',
    doctor_note: 'Doctor\'s Note',
    radiology_report: 'Radiology Report',
    vaccination_record: 'Vaccination Record',
    lab_report: 'Lab Report',
  };

  // Try keyword-based title extraction first
  const lines = text.split('\n').filter((l) => l.trim());
  for (const line of lines.slice(0, 15)) {
    if (/blood|panel|test|report|count|profile|urinalysis|lipid|thyroid|liver|kidney|cbc|prescription|discharge|summary|radiology|vaccination|x.?ray|mri|ct\s*scan/i.test(line) && line.length < 80) {
      return line.trim();
    }
  }

  // Fall back to document type label
  if (docType !== 'unknown') return typeLabels[docType] ?? 'Medical Document';

  if (lines.length) return lines[0].trim().substring(0, 60);
  return 'Medical Document';
}

// ─── Main entry point ───────────────────────────────────────────────────────────

/**
 * Extracts data from a File (PDF, image, or plain text).
 *
 * @param file        The file selected/dropped by the user.
 * @param onProgress  Optional callback for live progress updates (0–100, label).
 * @param ocrLang     Optional Tesseract language string (e.g. "eng+hin"). Defaults to "eng".
 */
export async function extractFromFile(
  file: File,
  onProgress?: ProgressCallback,
  ocrLang?: string,
): Promise<ExtractionResult> {
  const MAX_SIZE_MB = 20;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`File is too large. Maximum supported size is ${MAX_SIZE_MB} MB.`);
  }

  const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  const isImage = /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) ||
    /\.(jpg|jpeg|png|webp)$/i.test(file.name);

  let rawText = '';
  let ocrUsed = false;

  try {
    if (isPDF) {
      onProgress?.(5, 'Loading PDF…');
      const result = await extractTextFromPDF(file, onProgress, ocrLang);
      rawText = result.text;
      ocrUsed = result.ocrUsed;
    } else if (isImage) {
      onProgress?.(5, 'Loading image…');
      rawText = await ocrImage(file, onProgress, ocrLang);
      ocrUsed = true;
    } else {
      onProgress?.(10, 'Reading file…');
      rawText = await file.text();
      onProgress?.(80, 'File read complete.');
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error during file processing';
    throw new Error(`Could not process "${file.name}": ${message}`);
  }

  if (!rawText || rawText.trim().length < 10) {
    throw new Error(
      'No readable text could be extracted from this file. ' +
      'Please verify the file is not corrupt, or paste the report text manually.',
    );
  }

  onProgress?.(99, 'Analysing extracted text…');
  const extraction = await extractFromText(rawText);
  extraction.ocrUsed = ocrUsed;
  onProgress?.(100, 'Done.');

  return extraction;
}

// ─── Report factory ─────────────────────────────────────────────────────────────

export function createReportFromExtraction(
  extraction: ExtractionResult,
  fileName: string,
  fileType: string,
  fileSize: number,
): MedicalReport {
  // Map document type → category
  const categoryMap: Record<DocumentType, MedicalReport['category']> = {
    lab_report: 'lab_result',
    prescription: 'prescription',
    discharge_summary: 'medical_report',
    doctor_note: 'doctor_note',
    radiology_report: 'medical_report',
    vaccination_record: 'vaccination',
    unknown: 'other',
  };

  return {
    id: uid('rpt-'),
    title: extraction.reportTitle,
    category: categoryMap[extraction.documentType],
    date: extraction.reportDate,
    reportDate: extraction.reportDate,
    provider: extraction.provider,
    status: 'pending',
    fileName,
    fileType,
    fileSize,
    source: 'user',
    verified: false,
    results: extraction.results,
    documentType: extraction.documentType,
    medicines: extraction.medicines,
    diagnoses: extraction.diagnoses,
    dischargeSummary: extraction.dischargeSummary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Sample data ────────────────────────────────────────────────────────────────

export const sampleReportText = `COMPLETE BLOOD COUNT (CBC)
CityLab Diagnostics
Date: 10/01/2026

Test Name          Result    Unit      Reference Range
Hemoglobin         11.2      g/dL      12.0-15.5
White Blood Cells  7.1       10^3/uL   4.5-11.0
Platelets          252       10^3/uL   150-400
RBC Count          4.0       10^6/uL   4.0-5.2
Hematocrit         35.8      %         37.0-48.0`;

export const samplePrescriptionText = `PRESCRIPTION
Dr. Anjali Mehta, MD — General Physician
City Health Clinic, Mumbai
Date: 05 October 2026

Patient: Rahul Kumar    Age: 34

Rx:
1. Tab. Metformin 500mg — Twice daily after meals x 30 days
2. Tab. Atorvastatin 10mg — Once daily at bedtime x 90 days
3. Cap. Vitamin D3 60000 IU — Once weekly x 8 weeks
4. Tab. Pantoprazole 40mg — Once daily before breakfast x 14 days

Advice: Reduce sugar intake. Exercise 30 min daily.
Follow-up: 5 November 2026`;

export const sampleBilingualPrescriptionText = `PRESCRIPTION / नुस्खा
डॉ. राजेश शर्मा / Dr. Rajesh Sharma, MD (Medicine)
सिटी हेल्थ क्लिनिक / City Health Clinic, Delhi
दिनांक / Date: 10 October 2026

रोगी / Patient: अमित वर्मा (Amit Verma)    उम्र / Age: 42    लिंग / Gender: Male
बीपी / BP: 130/85 mmHg    नाड़ी / Pulse: 76 bpm

निदान / Clinical Diagnosis: Type 2 Diabetes Mellitus & Hypertension (मधुमेह और उच्च रक्तचाप)

Rx (दवाइयाँ):
1. Tab. Glycomet-GP 1 (Metformin 500mg) — Twice daily after meals x 30 days
2. Tab. Telma 40 (Telmisartan 40mg) — Once daily at bedtime x 30 days
3. Tab. Pan-D (Pantoprazole 40mg) — Once daily before breakfast x 14 days
4. Cap. Evion 400 (Vitamin E 400mg) — Once daily x 30 days

परामर्श / Advice: मीठा और तला हुआ खाना कम करें (Reduce sugar & oily food). रोज़ 30 मिनट टहलें (Walk 30 min daily).
पुनः जाँच / Next Visit: 10 November 2026`;

export const sampleDischargeSummaryText = `DISCHARGE SUMMARY
Apollo Hospitals, Hyderabad

Patient: Mrs. Sunita Sharma    Age: 58    Gender: Female
Ward: Cardiology ICU

Date of Admission: 28 September 2026
Date of Discharge: 03 October 2026

Admitting Diagnosis: Acute Myocardial Infarction (I21.0)

Discharge Diagnosis: ST-Elevation Myocardial Infarction (STEMI), anterior wall

Procedures:
Coronary Angiography, Primary PCI with stenting to LAD

Attending Physician: Dr. Ramesh Gupta, DM Cardiology

Medications on Discharge:
Tab. Aspirin 75mg — Once daily
Tab. Clopidogrel 75mg — Once daily x 12 months
Tab. Atorvastatin 40mg — Once daily at bedtime
Tab. Metoprolol 25mg — Twice daily
Tab. Ramipril 2.5mg — Once daily

Follow-up Instructions: Cardiac rehab program. Low-sodium, low-fat diet. Avoid strenuous activity for 6 weeks.
Follow-up Date: 17 October 2026`;
