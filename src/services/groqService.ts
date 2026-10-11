/**
 * groqService.ts  (Powered by Groq — drop-in replacement for Groq)
 *
 * All exported names are identical to the original groqService so no
 * other file needs to change.
 *
 * Call routing (in priority order):
 *  1. VITE_GROQ_API_KEY present → direct call to api.groq.com   (local dev / simple deploy)
 *  2. Only VITE_SUPABASE_URL    → Supabase edge function proxy   (production, key stays secret)
 *  3. Neither                   → throw "AI not configured"
 *
 * Model: openai/gpt-oss-20b  (llama-3.3-70b-versatile was retired Aug 2026)
 */

import type {
  UserProfile,
  HealthMeasurement,
  MedicalReport,
  Medication,
  Reminder,
  HealthGoal,
} from '@/types';
import { formatDate } from '@/utils/helpers';
import { langNameForPrompt } from '@/i18n/translations';
import type { LangCode } from '@/i18n/translations';

// ─── Config ────────────────────────────────────────────────────────────────────

const GROQ_MODEL    = 'openai/gpt-oss-20b';   // llama-3.3-70b-versatile retired Aug 2026
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** True when we have either a direct API key OR a Supabase URL to proxy through. */
export function isGroqAvailable(): boolean {
  const apiKey      = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  return !!(apiKey?.trim() || supabaseUrl?.trim());
}

/**
 * Determines the URL and headers for every Groq request.
 * Priority: direct API key → edge function → error.
 */
function buildFetchTarget(): { url: string; headers: Record<string, string> } {
  // 1. Direct API key (local dev or Vercel/Netlify with key as env var)
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined;
  if (apiKey?.trim()) {
    console.log('[Groq] Using direct API key → api.groq.com');
    return {
      url: GROQ_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
    };
  }

  // 2. Supabase edge function (production — key stored as Supabase secret)
  // NOTE: the deployed function is named "groq-ai" (legacy name kept for compatibility)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (supabaseUrl?.trim()) {
    console.log('[Groq] No direct API key found — using Supabase edge function proxy');
    return {
      url: `${supabaseUrl.trim()}/functions/v1/groq-ai`,
      headers: { 'Content-Type': 'application/json' },
    };
  }

  throw new Error(
    'AI not configured. Add VITE_GROQ_API_KEY to your .env file, ' +
    'or deploy the Supabase edge function with the GROQ_API_KEY secret.',
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroqContext {
  profile: UserProfile | null;
  measurements: HealthMeasurement[];
  reports: MedicalReport[];
  medications: Medication[];
  reminders: Reminder[];
  goals: HealthGoal[];
}

export interface GroqHistoryMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemInstruction(ctx: GroqContext): string {
  return `You are HealthPilot AI, a warm, compassionate, and easy-to-understand personal health copilot.

CORE COMMUNICATION PRINCIPLES (CRITICAL FOR USER UNDERSTANDING):
1. WRITE IN PLAIN, HUMAN LANGUAGE:
   - Speak directly to the person like a friendly, caring family physician or health educator.
   - Avoid cold, robotic, textbook-like clinical jargon.
   - Whenever you mention a medical term, test name, or medication (e.g. HbA1c, Creatinine, Bilirubin, Metformin), ALWAYS explain in simple everyday words what it is, why it matters, and what it does in their body.
2. MAKE RESPONSES EASY TO SCAN & READ:
   - Start with a direct, reassuring 1-2 sentence overview so the user immediately understands the bottom line.
   - Use short, digestible bullet points rather than long walls of text.
   - When appropriate, include a short "💡 What this means for you" section with practical lifestyle or daily-routine tips.
   - Offer 2-3 friendly "🩺 Questions you can ask your doctor" to empower them at their next visit.
3. GROUNDED IN THEIR HEALTH DATA:
   - Reference their actual records provided below with specific dates or report names when relevant (e.g., "In your latest Lipid Panel from October...").
   - Never invent or assume numbers that are not in their profile.
4. CALM & SUPPORTIVE TONE:
   - Medical numbers can cause anxiety. Present values calmly and constructively. Remind them that numbers can fluctuate naturally based on hydration, meals, stress, and sleep.
   - Clarify that your insights are educational guidance to help them understand their health, not a clinical diagnosis or prescription.

--- USER HEALTH DATA ---

${buildProfileSection(ctx.profile)}

${buildMeasurementsSection(ctx.measurements)}

${buildReportsSection(ctx.reports)}

${buildMedicationsSection(ctx.medications)}

${buildRemindersSection(ctx.reminders)}

${buildGoalsSection(ctx.goals)}

--- END OF DATA ---

Always respond with warmth, clarity, and empathy. Help the user feel informed, supported, and confident about their health.`;
}

function buildProfileSection(profile: UserProfile | null): string {
  if (!profile) return 'PROFILE: Not provided.';
  const lines = [`PROFILE:`, `  Name: ${profile.fullName}`];
  if (profile.age)              lines.push(`  Age: ${profile.age}`);
  if (profile.gender)           lines.push(`  Gender: ${profile.gender}`);
  if (profile.height)           lines.push(`  Height: ${profile.height} cm`);
  if (profile.weight)           lines.push(`  Weight: ${profile.weight} kg`);
  if (profile.bloodGroup)       lines.push(`  Blood group: ${profile.bloodGroup}`);
  if (profile.conditions.length) lines.push(`  Existing conditions: ${profile.conditions.join(', ')}`);
  if (profile.allergies.length)  lines.push(`  Allergies: ${profile.allergies.join(', ')}`);
  if (profile.familyHistory?.length) lines.push(`  Family history: ${profile.familyHistory.join(', ')}`);
  if (profile.sleepHours)       lines.push(`  Sleep: ${profile.sleepHours} hours/night`);
  if (profile.exerciseFrequency) lines.push(`  Exercise: ${profile.exerciseFrequency}`);
  if (profile.diet)             lines.push(`  Diet: ${profile.diet}`);
  return lines.join('\n');
}

function buildMeasurementsSection(measurements: HealthMeasurement[]): string {
  if (!measurements.length) return 'MEASUREMENTS: None recorded.';
  const lines = ['MEASUREMENTS (latest per type):'];
  const byType = new Map<string, HealthMeasurement[]>();
  for (const m of measurements) {
    if (!byType.has(m.type)) byType.set(m.type, []);
    byType.get(m.type)!.push(m);
  }
  for (const [type, items] of byType) {
    const latest = items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const val = latest.secondaryValue
      ? `${latest.value}/${latest.secondaryValue} ${latest.unit}`
      : `${latest.value} ${latest.unit}`;
    lines.push(`  ${type}: ${val} (${formatDate(latest.date)})`);
  }
  return lines.join('\n');
}

function buildReportsSection(reports: MedicalReport[]): string {
  if (!reports.length) return 'MEDICAL REPORTS: None uploaded.';
  const lines = ['MEDICAL REPORTS:'];
  for (const r of reports.slice(0, 10)) {
    lines.push(`  Report: "${r.title}" — ${formatDate(r.reportDate)}${r.provider ? ` (${r.provider})` : ''}`);
    for (const res of r.results) {
      lines.push(`    • ${res.testName}: ${res.value} ${res.unit} [ref: ${res.referenceRange ?? 'N/A'}] — ${res.status}`);
    }
    if ((r.medicines?.length ?? 0) > 0) {
      lines.push(`    Medicines: ${r.medicines!.map(m => `${m.name} ${m.dosage}`).join(', ')}`);
    }
    if ((r.diagnoses?.length ?? 0) > 0) {
      lines.push(`    Diagnoses: ${r.diagnoses!.map(d => d.text).join(', ')}`);
    }
  }
  return lines.join('\n');
}

function buildMedicationsSection(medications: Medication[]): string {
  if (!medications.length) return 'MEDICATIONS: None recorded.';
  const lines = ['MEDICATIONS:'];
  for (const m of medications) {
    lines.push(`  • ${m.name} ${m.dosage}, ${m.frequency} at ${m.time} (adherence: ${m.adherence}%)`);
  }
  return lines.join('\n');
}

function buildRemindersSection(reminders: Reminder[]): string {
  const pending = reminders.filter(r => !r.completed);
  if (!pending.length) return 'REMINDERS: No pending reminders.';
  const lines = ['PENDING REMINDERS:'];
  for (const r of pending.slice(0, 10)) {
    lines.push(`  • ${r.title} — ${formatDate(r.date)}${r.time ? ' at ' + r.time : ''}`);
  }
  return lines.join('\n');
}

function buildGoalsSection(goals: HealthGoal[]): string {
  if (!goals.length) return 'GOALS: None set.';
  const lines = ['HEALTH GOALS:'];
  for (const g of goals) {
    lines.push(`  • ${g.name}: ${g.currentValue}/${g.targetValue} ${g.unit} (${g.progress}% complete)`);
  }
  return lines.join('\n');
}

// ─── Error classification ─────────────────────────────────────────────────────

function classifyError(status: number, body: string): string {
  if (status === 429) {
    const m = body.match(/retry in ([\d\w\s]+)\./i);
    return `Groq AI rate limit reached.${m ? ` Please retry in ${m[1]}.` : ' Please wait a moment.'}`;
  }
  if (status === 401 || status === 403) return 'Groq API key is invalid or unauthorised.';
  if (status === 404) return 'Groq model not found (404). The model may have been renamed or removed. Check your VITE_GROQ_API_KEY and model name.';
  if (status >= 500) return `Groq server error (${status}). Please try again shortly.`;
  return `Groq API error ${status}.`;
}

// ─── Core non-streaming call ──────────────────────────────────────────────────

async function callGroq(
  messages: GroqMessage[],
  signal?: AbortSignal,
  jsonMode = false,
): Promise<string> {
  const { url, headers } = buildFetchTarget();

  const payload: Record<string, unknown> = {
    model:       GROQ_MODEL,
    messages,
    temperature: 0.4,
    max_tokens:  2048,
    top_p:       0.95,
    stream:      false,
    ...(jsonMode ? { response_format: { type: 'json_object' }, json_mode: true } : {}),
  };

  const res = await fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    // Edge function wraps errors as { error: string }
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error) throw new Error(String(parsed.error));
    } catch { /* not JSON */ }
    throw new Error(classifyError(res.status, errText));
  }

  const json = await res.json();
  const text: string = json?.choices?.[0]?.message?.content ?? '';
  if (!text) throw new Error('Groq returned an empty response.');
  return text;
}

// ─── Streaming call ───────────────────────────────────────────────────────────

export async function streamGroqChat(
  contents: GroqHistoryMessage[],
  systemInstruction: string,
  onChunk: (chunk: string) => void,
  onDone:  (full:  string) => void,
  onError: (err:   Error)  => void,
  signal?: AbortSignal,
): Promise<void> {
  const groqMsgs: GroqMessage[] = [
    { role: 'system', content: systemInstruction },
    ...contents.map((m) => ({
      role:    (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.parts.map((p) => p.text).join(''),
    })),
  ];

  const payload = {
    model:       GROQ_MODEL,
    messages:    groqMsgs,
    temperature: 0.4,
    max_tokens:  2048,
    top_p:       0.95,
    stream:      true,
  };

  try {
    const { url, headers } = buildFetchTarget();

    const res = await fetch(url, {
      method:  'POST',
      headers,
      body:    JSON.stringify(payload),
      signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error) throw new Error(String(parsed.error));
      } catch { /* not JSON */ }
      throw new Error(classifyError(res.status, errText));
    }

    if (!res.body) throw new Error('Groq response body is null.');

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let full   = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk: string = parsed?.choices?.[0]?.delta?.content ?? '';
          if (chunk) { full += chunk; onChunk(chunk); }
        } catch { /* ignore malformed SSE */ }
      }
    }
    onDone(full);
  } catch (err) {
    if ((err as { name?: string }).name === 'AbortError') return;
    onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function askGroqCopilot(
  question: string,
  history:  GroqHistoryMessage[],
  ctx:      GroqContext,
  signal?:  AbortSignal,
): Promise<string> {
  const systemInstruction = buildSystemInstruction(ctx);
  const msgs: GroqMessage[] = [
    { role: 'system', content: systemInstruction },
    ...history.map((m) => ({
      role:    (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.parts.map((p) => p.text).join(''),
    })),
    { role: 'user', content: question },
  ];
  return callGroq(msgs, signal);
}

export async function askGroqCopilotStream(
  question: string,
  history:  GroqHistoryMessage[],
  ctx:      GroqContext,
  onChunk:  (chunk: string) => void,
  onDone:   (full:  string) => void,
  onError:  (err:   Error)  => void,
  signal?:  AbortSignal,
): Promise<void> {
  const systemInstruction = buildSystemInstruction(ctx);
  const contents: GroqHistoryMessage[] = [
    ...history,
    { role: 'user', parts: [{ text: question }] },
  ];
  return streamGroqChat(contents, systemInstruction, onChunk, onDone, onError, signal);
}

export async function analyzeReportWithGroq(
  report:  MedicalReport,
  ctx:     GroqContext,
  signal?: AbortSignal,
  summaryLang: LangCode = 'en',
): Promise<{ summary: string; explanation: string; doctorQuestions: string[] }> {
  const targetLangName = langNameForPrompt(summaryLang);
  const langRule = summaryLang !== 'en'
    ? `\n- CRITICAL LANGUAGE RULE: You MUST write the "summary", "explanation", and each string in "doctorQuestions" in ${targetLangName}. Technical medical terms and numeric values may remain standard.`
    : '';

  const systemInstruction = `You are HealthPilot AI. Analyze the following medical document and respond with valid JSON only.
Rules:
- Do NOT invent values. Only use what is in the document data.
- Do NOT give a medical diagnosis.
- Always recommend the user consult their doctor.${langRule}
- Return ONLY a JSON object with keys: "summary" (string), "explanation" (string), "doctorQuestions" (string[]).`;

  const medicinesText = (report.medicines?.length ?? 0) > 0
    ? `\nMedicines Prescribed:\n${report.medicines!.map(m => `  • ${m.name} ${m.dosage} — ${m.frequency}${m.duration ? ` for ${m.duration}` : ''}`).join('\n')}`
    : '';

  const diagnosesText = (report.diagnoses?.length ?? 0) > 0
    ? `\nDiagnoses:\n${report.diagnoses!.map(d => `  • [${d.type}] ${d.text}${d.icdCode ? ` (${d.icdCode})` : ''}`).join('\n')}`
    : '';

  const ds = report.dischargeSummary;
  const dischargeText = ds
    ? `\nDischarge Summary:\n` +
      (ds.admissionDate      ? `  Admitted: ${formatDate(ds.admissionDate)}\n`               : '') +
      (ds.dischargeDate      ? `  Discharged: ${formatDate(ds.dischargeDate)}\n`             : '') +
      (ds.admittingDiagnosis ? `  Admitting diagnosis: ${ds.admittingDiagnosis}\n`           : '') +
      (ds.dischargeDiagnosis ? `  Discharge diagnosis: ${ds.dischargeDiagnosis}\n`           : '') +
      (ds.procedures?.length ? `  Procedures: ${ds.procedures.join(', ')}\n`                 : '') +
      (ds.followUpInstructions ? `  Follow-up: ${ds.followUpInstructions}\n`                 : '') +
      (ds.followUpDate       ? `  Follow-up date: ${formatDate(ds.followUpDate)}\n`          : '')
    : '';

  const userContent = `
Document Type: ${report.documentType ?? 'unknown'}
Report: "${report.title}"
Date: ${formatDate(report.reportDate)}
Provider: ${report.provider ?? 'Unknown'}
${report.results.length > 0
    ? `\nLab Results:\n${report.results.map(r => `  ${r.testName}: ${r.value} ${r.unit} [ref: ${r.referenceRange ?? 'N/A'}] — ${r.status}`).join('\n')}`
    : ''}${medicinesText}${diagnosesText}${dischargeText}

User profile context:
${buildProfileSection(ctx.profile)}
`;

  const msgs: GroqMessage[] = [
    { role: 'system', content: systemInstruction },
    { role: 'user',   content: userContent },
  ];

  const raw = await callGroq(msgs, signal, true);

  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, raw];
  const jsonStr   = (jsonMatch[1] ?? raw).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      summary:         parsed.summary         ?? '',
      explanation:     parsed.explanation     ?? '',
      doctorQuestions: Array.isArray(parsed.doctorQuestions) ? parsed.doctorQuestions : [],
    };
  } catch {
    return { summary: raw, explanation: '', doctorQuestions: [] };
  }
}

// ─── Plain-Language Health Record Summary ─────────────────────────────────────

export interface PlainLanguageSummary {
  /** One-sentence overview the patient can immediately understand */
  headline: string;
  /** What this record is, in simple terms */
  whatIsThis: string;
  /** Each finding explained without jargon */
  findings: Array<{
    name: string;
    value: string;
    plainExplanation: string;
    status: 'normal' | 'slightly_off' | 'needs_attention' | 'critical';
    tip?: string;
  }>;
  /** Overall plain-English summary paragraph */
  overallSummary: string;
  /** Actionable next steps */
  nextSteps: string[];
  /** Disclaimer */
  disclaimer: string;
}

/**
 * Generate a plain-language summary for any health record or medical report.
 * Returns a structured object the UI can render section-by-section.
 *
 * Works for both plain HealthRecord (title/category/notes only) and
 * full MedicalReport (with lab results, medicines, diagnoses, etc.)
 */
export async function generateHealthRecordSummary(
  record: import('@/types').HealthRecord | import('@/types').MedicalReport,
  profile: import('@/types').UserProfile | null,
  signal?: AbortSignal,
  summaryLang: LangCode = 'en',
): Promise<PlainLanguageSummary> {
  // Type-narrow to access MedicalReport fields if present
  const report = 'results' in record ? (record as import('@/types').MedicalReport) : null;

  const profileCtx = profile
    ? `Patient: ${profile.fullName}, Age: ${profile.age ?? 'unknown'}, Gender: ${profile.gender ?? 'unknown'}, Blood group: ${profile.bloodGroup ?? 'unknown'}.
Existing conditions: ${profile.conditions.join(', ') || 'none'}.
Allergies: ${profile.allergies.join(', ') || 'none'}.`
    : 'Patient profile: not provided.';

  const resultsText = report && report.results.length > 0
    ? `\nLab / Test Results:\n${report.results.map(r =>
        `  • ${r.testName}: ${r.value} ${r.unit} [reference: ${r.referenceRange ?? 'N/A'}] — ${r.status}`
      ).join('\n')}`
    : '';

  const medicinesText = report && (report.medicines?.length ?? 0) > 0
    ? `\nMedicines Prescribed:\n${report.medicines!.map(m =>
        `  • ${m.name} ${m.dosage} — ${m.frequency}${m.duration ? ` for ${m.duration}` : ''}`
      ).join('\n')}`
    : '';

  const diagnosesText = report && (report.diagnoses?.length ?? 0) > 0
    ? `\nDiagnoses:\n${report.diagnoses!.map(d =>
        `  • [${d.type}] ${d.text}${d.icdCode ? ` (ICD: ${d.icdCode})` : ''}`
      ).join('\n')}`
    : '';

  const dischargeText = (() => {
    const ds = report?.dischargeSummary;
    if (!ds) return '';
    const lines: string[] = ['\nDischarge Summary:'];
    if (ds.admissionDate)      lines.push(`  Admitted: ${formatDate(ds.admissionDate)}`);
    if (ds.dischargeDate)      lines.push(`  Discharged: ${formatDate(ds.dischargeDate)}`);
    if (ds.admittingDiagnosis) lines.push(`  Admitting diagnosis: ${ds.admittingDiagnosis}`);
    if (ds.dischargeDiagnosis) lines.push(`  Discharge diagnosis: ${ds.dischargeDiagnosis}`);
    if (ds.procedures?.length) lines.push(`  Procedures: ${ds.procedures.join(', ')}`);
    if (ds.followUpInstructions) lines.push(`  Follow-up: ${ds.followUpInstructions}`);
    if (ds.followUpDate)       lines.push(`  Follow-up date: ${formatDate(ds.followUpDate)}`);
    return lines.join('\n');
  })();

  const notesText = record.notes ? `\nNotes: ${record.notes}` : '';
  const providerText = record.provider ? `Provider: ${record.provider}` : '';

  const userContent = `
Record Title: "${record.title}"
Record Type: ${record.category.replace(/_/g, ' ')}
Date: ${formatDate(record.date)}
${providerText}
${profileCtx}
${resultsText}${medicinesText}${diagnosesText}${dischargeText}${notesText}

Please explain this health record to a patient who has no medical background. Use simple, everyday language — as if you are a caring friend who happens to be a doctor. Avoid all medical jargon; if you must use a term, explain it immediately in brackets.`;

  const targetLangName = langNameForPrompt(summaryLang);
  const langInstruction = summaryLang !== 'en'
    ? `\n\nCRITICAL LANGUAGE RULE: You MUST write ALL explanatory text in the JSON response in ${targetLangName}. This applies to: headline, whatIsThis, plainExplanation, tip, overallSummary, every string in nextSteps, and disclaimer. Medical test names and numeric values may stay in their standard form. Do NOT mix languages — every sentence must be in ${targetLangName}.`
    : '';

  const systemInstruction = `You are HealthPilot AI. Your job is to translate medical records into plain, friendly language that any patient can understand.

STRICT RULES:
1. Never invent values. Only use what is in the record data.
2. Never give a medical diagnosis.
3. Always recommend the user consult their healthcare professional.
4. Use simple everyday words — if a medical term is unavoidable, explain it in plain language immediately.
5. Be warm, reassuring, and empowering — not alarming.
6. For abnormal values, explain what the number means in real life.
7. Respond ONLY with a valid JSON object matching the schema below. No markdown fences, no extra text.${langInstruction}

JSON schema (respond with EXACTLY this structure):
{
  "headline": "string — one short sentence summary the patient understands at a glance",
  "whatIsThis": "string — what type of record this is in plain terms",
  "findings": [
    {
      "name": "string — test/parameter name",
      "value": "string — the measured value with unit",
      "plainExplanation": "string — what this means in everyday language",
      "status": "normal | slightly_off | needs_attention | critical",
      "tip": "string (optional) — one simple lifestyle or follow-up tip"
    }
  ],
  "overallSummary": "string — 2-4 sentence paragraph summarising the whole record",
  "nextSteps": ["string", "..."],
  "disclaimer": "string — one-sentence medical disclaimer"
}

If there are no structured findings (e.g., it is just a doctor note or prescription), set "findings" to an empty array and capture everything in "overallSummary".`;

  const msgs: GroqMessage[] = [
    { role: 'system', content: systemInstruction },
    { role: 'user',   content: userContent },
  ];

  const raw = await callGroq(msgs, signal, true);

  // Strip potential markdown fences
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = (fenceMatch ? fenceMatch[1] : raw).trim();

  try {
    const parsed = JSON.parse(jsonStr) as PlainLanguageSummary;
    return {
      headline:       parsed.headline       ?? 'Your health record has been summarised.',
      whatIsThis:     parsed.whatIsThis     ?? '',
      findings:       Array.isArray(parsed.findings) ? parsed.findings : [],
      overallSummary: parsed.overallSummary ?? '',
      nextSteps:      Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      disclaimer:     parsed.disclaimer     ?? 'This summary is not a substitute for professional medical advice.',
    };
  } catch {
    // Fallback: wrap the raw text as a simple summary
    return {
      headline:       'AI Summary',
      whatIsThis:     record.category.replace(/_/g, ' '),
      findings:       [],
      overallSummary: raw,
      nextSteps:      ['Please share this record with your healthcare provider.'],
      disclaimer:     'This summary is not a substitute for professional medical advice.',
    };
  }
}

export async function generateGroqInsights(
  ctx:     GroqContext,
  signal?: AbortSignal,
): Promise<string> {
  const systemInstruction = buildSystemInstruction(ctx);
  const prompt = `Based on all of my health data provided, give me 3-5 actionable, personalized health insights.
Focus on:
- Any lab values outside the reference range
- Medication adherence patterns
- Progress toward my health goals
- Any upcoming health reminders
Format as clear bullet points. Be supportive and constructive.`;

  const msgs: GroqMessage[] = [
    { role: 'system', content: systemInstruction },
    { role: 'user',   content: prompt },
  ];
  return callGroq(msgs, signal);
}
