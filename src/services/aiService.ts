import type {
  UserProfile,
  HealthMeasurement,
  MedicalReport,
  Medication,
  Reminder,
  HealthGoal,
  AIInsight,
  ChatMessage,
  ReportResult,
} from '@/types';
import { uid, formatDate } from '@/utils/helpers';

/**
 * Returns true if the medication was marked taken on the current calendar day.
 * Compares `lastTakenDate` (YYYY-MM-DD) to today's date so that stale
 * `takenToday: true` values from a previous day are treated as not taken.
 * Falls back to the raw `takenToday` flag for demo data which has no
 * `lastTakenDate`.
 */
function isTakenToday(med: Medication): boolean {
  if (med.lastTakenDate !== undefined) {
    const todayStr = new Date().toISOString().split('T')[0];
    return med.takenToday && med.lastTakenDate === todayStr;
  }
  // Legacy / demo data: no lastTakenDate field — trust the stored flag
  return med.takenToday;
}

export interface AIContext {
  profile: UserProfile | null;
  measurements: HealthMeasurement[];
  reports: MedicalReport[];
  medications: Medication[];
  reminders: Reminder[];
  goals: HealthGoal[];
  isDemo: boolean;
}

export interface AIResponse {
  content: string;
  basedOnData: string[];
  generalInfo?: string;
  suggestedQuestions?: string[];
}

function latestMeasurements(measurements: HealthMeasurement[], type: string): HealthMeasurement[] {
  return measurements
    .filter((m) => m.type === type)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function buildProfileSummary(profile: UserProfile | null): string {
  if (!profile) return 'No profile information available.';
  const parts: string[] = [`Name: ${profile.fullName}`];
  if (profile.age) parts.push(`Age: ${profile.age}`);
  if (profile.gender) parts.push(`Gender: ${profile.gender}`);
  if (profile.height) parts.push(`Height: ${profile.height} cm`);
  if (profile.weight) parts.push(`Weight: ${profile.weight} kg`);
  if (profile.bloodGroup) parts.push(`Blood group: ${profile.bloodGroup}`);
  if (profile.conditions.length) parts.push(`Conditions: ${profile.conditions.join(', ')}`);
  if (profile.allergies.length) parts.push(`Allergies: ${profile.allergies.join(', ')}`);
  if (profile.medications.length) parts.push(`Medications: ${profile.medications.join(', ')}`);
  if (profile.sleepHours) parts.push(`Sleep: ${profile.sleepHours} hours`);
  if (profile.exerciseFrequency) parts.push(`Exercise: ${profile.exerciseFrequency}`);
  return parts.join('\n');
}

function buildMeasurementsSummary(measurements: HealthMeasurement[]): string {
  if (!measurements.length) return 'No measurements available.';
  const types = ['weight', 'blood_pressure', 'heart_rate', 'sleep', 'activity'];
  const parts: string[] = [];
  for (const type of types) {
    const items = latestMeasurements(measurements, type);
    if (items.length) {
      const latest = items[0];
      if (latest.secondaryValue) {
        parts.push(`${type}: ${latest.value}/${latest.secondaryValue} ${latest.unit} (${formatDate(latest.date)})`);
      } else {
        parts.push(`${type}: ${latest.value} ${latest.unit} (${formatDate(latest.date)})`);
      }
    }
  }
  return parts.join('\n') || 'No measurements available.';
}

function buildReportsSummary(reports: MedicalReport[]): string {
  if (!reports.length) return 'No reports available.';
  return reports
    .map((r) => {
      const resultsText = r.results
        .map((res) => `  - ${res.testName}: ${res.value} ${res.unit} (ref: ${res.referenceRange || 'N/A'}, status: ${res.status})`)
        .join('\n');
      return `Report: ${r.title} (${formatDate(r.reportDate)}, ${r.provider || 'Unknown provider'})\n${resultsText}`;
    })
    .join('\n\n');
}

function buildMedicationsSummary(medications: Medication[]): string {
  if (!medications.length) return 'No medications recorded.';
  return medications
    .map((m) => `${m.name} ${m.dosage}, ${m.frequency} at ${m.time} (adherence: ${m.adherence}%, taken today: ${isTakenToday(m) ? 'yes' : 'no'})`)
    .join('\n');
}

function buildRemindersSummary(reminders: Reminder[]): string {
  if (!reminders.length) return 'No reminders.';
  return reminders
    .map((r) => `${r.title} (${r.type}, ${formatDate(r.date)}${r.time ? ' ' + r.time : ''}, ${r.completed ? 'completed' : 'pending'})`)
    .join('\n');
}

function buildGoalsSummary(goals: HealthGoal[]): string {
  if (!goals.length) return 'No goals set.';
  return goals
    .map((g) => `${g.name}: ${g.currentValue}/${g.targetValue} ${g.unit} (${g.progress}% progress)`)
    .join('\n');
}

export function askHealthCopilot(question: string, context: AIContext): AIResponse {
  const q = question.toLowerCase();
  const sources: string[] = [];
  let content = '';
  let generalInfo: string | undefined;
  let suggestedQuestions: string[] | undefined;

  const profileSummary = buildProfileSummary(context.profile);
  const measurementsSummary = buildMeasurementsSummary(context.measurements);
  const reportsSummary = buildReportsSummary(context.reports);
  const medicationsSummary = buildMedicationsSummary(context.medications);
  const remindersSummary = buildRemindersSummary(context.reminders);
  const goalsSummary = buildGoalsSummary(context.goals);

  if (q.includes('report') && (q.includes('explain') || q.includes('latest') || q.includes('understand'))) {
    if (!context.reports.length) {
      content = "You haven't uploaded any reports yet. Once you upload a medical report, I can help explain the results in plain language.";
      sources.push('No reports available');
    } else {
      const latest = context.reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())[0];
      sources.push(`${latest.title} — ${formatDate(latest.reportDate)}`);
      const outsideRange = latest.results.filter((r) => r.status === 'outside_range');
      const withinRange = latest.results.filter((r) => r.status === 'within_range');
      content = `Based on the information you've provided, your latest report is "${latest.title}" from ${formatDate(latest.reportDate)}${latest.provider ? ` at ${latest.provider}` : ''}.\n\n`;
      if (withinRange.length) {
        content += `Results within reference range:\n${withinRange.map((r) => `• ${r.testName}: ${r.value} ${r.unit} (reference: ${r.referenceRange})`).join('\n')}\n\n`;
      }
      if (outsideRange.length) {
        content += `Results outside reference range:\n${outsideRange.map((r) => `• ${r.testName}: ${r.value} ${r.unit} (reference: ${r.referenceRange})`).join('\n')}\n\n`;
        content += `These results are outside the reference range shown on your report. You may want to discuss these with a qualified healthcare professional.\n\n`;
      }
      if (latest.aiExplanation) {
        generalInfo = latest.aiExplanation;
      }
      suggestedQuestions = latest.doctorQuestions || [
        'What could be causing the out-of-range results?',
        'Are there follow-up tests I should consider?',
      ];
    }
  } else if (q.includes('changed') || q.includes('previous') || q.includes('compare')) {
    if (context.reports.length < 2) {
      content = "You need at least two uploaded reports to compare changes. Currently you have fewer than two reports.";
      sources.push('Report count: ' + context.reports.length);
    } else {
      const sorted = context.reports.sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
      const prev = sorted[sorted.length - 2];
      const curr = sorted[sorted.length - 1];
      sources.push(`${prev.title} — ${formatDate(prev.reportDate)}`, `${curr.title} — ${formatDate(curr.reportDate)}`);
      content = `Comparing your two most recent reports:\n\nPrevious: ${prev.title} (${formatDate(prev.reportDate)})\nCurrent: ${curr.title} (${formatDate(curr.reportDate)})\n\n`;
      const changes: string[] = [];
      for (const currResult of curr.results) {
        const prevResult = prev.results.find((r) => r.testName === currResult.testName);
        if (prevResult) {
          const diff = parseFloat(currResult.value) - parseFloat(prevResult.value);
          const sign = diff > 0 ? '+' : '';
          changes.push(`• ${currResult.testName}: ${prevResult.value} → ${currResult.value} ${currResult.unit} (${sign}${diff.toFixed(1)} ${currResult.unit})`);
        } else {
          changes.push(`• ${currResult.testName}: Not available in previous report`);
        }
      }
      content += `Changes:\n${changes.join('\n')}\n\nYou may want to discuss these changes with a qualified healthcare professional.`;
      suggestedQuestions = ['What do these changes indicate?', 'Should I adjust my current treatment?'];
    }
  } else if (q.includes('summar') && q.includes('record')) {
    if (!context.reports.length) {
      content = "You don't have any health records yet. Upload your first report to begin organizing your healthcare information.";
      sources.push('No records available');
    } else {
      sources.push(`${context.reports.length} report(s)`);
      content = `You have ${context.reports.length} report(s) on file:\n\n`;
      content += context.reports.map((r) => `• ${r.title} — ${formatDate(r.reportDate)}${r.provider ? `, ${r.provider}` : ''} (${r.results.length} results, ${r.results.filter((x) => x.status === 'outside_range').length} outside range)`).join('\n');
    }
  } else if (q.includes('information') && q.includes('added') || q.includes('what') && q.includes('have')) {
    sources.push('Health Profile', 'Measurements', 'Reports', 'Medications', 'Goals');
    content = `Here's a summary of the information you've added to HealthPilot:\n\n`;
    content += `Profile: ${context.profile ? context.profile.fullName : 'Not set up'}\n`;
    content += `Measurements: ${context.measurements.length} entries\n`;
    content += `Reports: ${context.reports.length} reports\n`;
    content += `Medications: ${context.medications.length} medications\n`;
    content += `Goals: ${context.goals.length} goals\n`;
    content += `Reminders: ${context.reminders.length} reminders\n`;
  } else if (q.includes('doctor') || q.includes('discuss')) {
    sources.push(...context.reports.map((r) => `${r.title} — ${formatDate(r.reportDate)}`));
    const allQuestions: string[] = [];
    for (const r of context.reports) {
      if (r.doctorQuestions) allQuestions.push(...r.doctorQuestions);
    }
    const outsideResults = context.reports.flatMap((r) => r.results.filter((res) => res.status === 'outside_range').map((res) => ({ ...res, reportTitle: r.title })));
    content = `Based on the information you've provided, here are questions you may want to discuss with a qualified healthcare professional:\n\n`;
    if (allQuestions.length) {
      content += allQuestions.map((q) => `• ${q}`).join('\n');
    } else if (outsideResults.length) {
      content += outsideResults.map((r) => `• My ${r.testName} was ${r.value} ${r.unit} in the ${r.reportTitle} — what does this mean?`).join('\n');
    } else {
      content += "No specific questions could be generated from your current data. As you add more health information, I can suggest relevant questions for your doctor.";
    }
    suggestedQuestions = ['What follow-up tests should I schedule?', 'Are my current medications appropriate?'];
  } else if (q.includes('reminder')) {
    sources.push('Reminders');
    const pending = context.reminders.filter((r) => !r.completed);
    const completed = context.reminders.filter((r) => r.completed);
    content = `You have ${pending.length} pending reminder(s) and ${completed.length} completed reminder(s).\n\n`;
    if (pending.length) {
      content += `Pending:\n${pending.map((r) => `• ${r.title} — ${formatDate(r.date)}${r.time ? ' at ' + r.time : ''}`).join('\n')}\n\n`;
    }
    if (completed.length) {
      content += `Completed:\n${completed.map((r) => `• ${r.title} — ${formatDate(r.date)}`).join('\n')}`;
    }
  } else if (q.includes('journey') || q.includes('recent')) {
    sources.push('Health Profile', 'Measurements', 'Reports', 'Medications', 'Goals');
    content = `Here's a summary of your recent health journey:\n\n`;
    if (context.measurements.length) {
      const wts = latestMeasurements(context.measurements, 'weight');
      if (wts.length) content += `Latest weight: ${wts[0].value} ${wts[0].unit} (${formatDate(wts[0].date)})\n`;
    }
    if (context.reports.length) {
      const latestRpt = context.reports.sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())[0];
      content += `Latest report: ${latestRpt.title} (${formatDate(latestRpt.reportDate)})\n`;
    }
    if (context.medications.length) {
      content += `Current medications: ${context.medications.length} active\n`;
    }
    if (context.goals.length) {
      content += `Goals: ${context.goals.length} in progress (avg ${Math.round(context.goals.reduce((s, g) => s + g.progress, 0) / context.goals.length)}% complete)\n`;
    }
    content += `\nYou may want to discuss your overall progress with a qualified healthcare professional.`;
  } else {
    sources.push('Health Profile', 'Measurements', 'Reports');
    content = `I'm your Health Copilot. I can help you understand your health information based on what you've provided.\n\nHere's what I can see:\n${profileSummary}\n\nMeasurements:\n${measurementsSummary}\n\nReports:\n${reportsSummary}\n\nAsk me about your reports, measurements, medications, reminders, or what to discuss with your doctor.`;
    suggestedQuestions = [
      'Explain my latest report.',
      'What changed from my previous report?',
      'What should I discuss with my doctor?',
      'What reminders do I have?',
      'Summarize my recent health journey.',
    ];
  }

  return { content, basedOnData: sources, generalInfo, suggestedQuestions };
}

export function analyzeHealthReport(report: MedicalReport, context: AIContext): AIResponse {
  const sources = [`${report.title} — ${formatDate(report.reportDate)}`];
  const outsideRange = report.results.filter((r) => r.status === 'outside_range');
  const withinRange = report.results.filter((r) => r.status === 'within_range');
  const reviewRecommended = report.results.filter((r) => r.status === 'review_recommended');

  let content = `Based on the information in your uploaded report "${report.title}" from ${formatDate(report.reportDate)}${report.provider ? ` at ${report.provider}` : ''}:\n\n`;
  content += `Total results: ${report.results.length}\n`;
  content += `Within reference range: ${withinRange.length}\n`;
  content += `Outside reference range: ${outsideRange.length}\n`;
  if (reviewRecommended.length) content += `Review recommended: ${reviewRecommended.length}\n`;

  if (outsideRange.length) {
    content += `\nResults outside reference range:\n`;
    content += outsideRange.map((r) => `• ${r.testName}: ${r.value} ${r.unit} (reference: ${r.referenceRange})`).join('\n');
    content += `\n\nThese values are outside the reference range shown on your report. You may want to discuss these with a qualified healthcare professional.`;
  }

  const generalInfo = `This report contains ${report.results.length} test results. ${withinRange.length} are within the reference range provided on the report. Reference ranges are guidelines used by laboratories and may vary slightly between labs. Results outside the reference range do not necessarily indicate a health problem — your doctor can interpret them in the context of your overall health.`;

  const doctorQuestions = generateDoctorQuestions(report, context);

  return { content, basedOnData: sources, generalInfo, suggestedQuestions: doctorQuestions };
}

export function compareHealthReports(prev: MedicalReport, curr: MedicalReport): AIResponse {
  const sources = [
    `${prev.title} — ${formatDate(prev.reportDate)}`,
    `${curr.title} — ${formatDate(curr.reportDate)}`,
  ];

  let content = `Comparing two reports:\n\nPrevious: ${prev.title} (${formatDate(prev.reportDate)})\nCurrent: ${curr.title} (${formatDate(curr.reportDate)})\n\n`;

  const changes: string[] = [];
  const onlyInCurrent: string[] = [];
  const onlyInPrevious: string[] = [];

  for (const currResult of curr.results) {
    const prevResult = prev.results.find((r) => r.testName === currResult.testName);
    if (prevResult) {
      const diff = parseFloat(currResult.value) - parseFloat(prevResult.value);
      const sign = diff > 0 ? '+' : '';
      const statusChange = prevResult.status !== currResult.status;
      changes.push(`• ${currResult.testName}: ${prevResult.value} → ${currResult.value} ${currResult.unit} (${sign}${diff.toFixed(2)} ${currResult.unit})${statusChange ? ` — status changed from ${prevResult.status} to ${currResult.status}` : ''}`);
    } else {
      onlyInCurrent.push(`• ${currResult.testName}: ${currResult.value} ${currResult.unit} (not in previous report)`);
    }
  }

  for (const prevResult of prev.results) {
    if (!curr.results.find((r) => r.testName === prevResult.testName)) {
      onlyInPrevious.push(`• ${prevResult.testName}: ${prevResult.value} ${prevResult.unit} (not in current report)`);
    }
  }

  if (changes.length) {
    content += `Matching measurements:\n${changes.join('\n')}\n\n`;
  }
  if (onlyInCurrent.length) {
    content += `Only in current report:\n${onlyInCurrent.join('\n')}\n\n`;
  }
  if (onlyInPrevious.length) {
    content += `Only in previous report:\n${onlyInPrevious.join('\n')}\n\n`;
  }

  content += `You may want to discuss these changes with a qualified healthcare professional.`;

  const suggestedQuestions = [
    'What do these changes mean for my health?',
    'Should I adjust my treatment based on these results?',
    'When should I take my next test?',
  ];

  return { content, basedOnData: sources, suggestedQuestions };
}

export function generateHealthSummary(context: AIContext): AIResponse {
  const sources: string[] = [];
  const parts: string[] = [];

  sources.push('Health Profile');
  if (context.profile) {
    parts.push(`Based on the information you've provided, ${context.profile.fullName}'s health overview:`);
    if (context.profile.conditions.length) {
      parts.push(`Existing conditions: ${context.profile.conditions.join(', ')}`);
    }
  }

  if (context.measurements.length) {
    sources.push('Measurements');
    const wts = latestMeasurements(context.measurements, 'weight');
    if (wts.length) parts.push(`Latest weight: ${wts[0].value} ${wts[0].unit} (${formatDate(wts[0].date)})`);
    const bps = latestMeasurements(context.measurements, 'blood_pressure');
    if (bps.length) parts.push(`Latest blood pressure: ${bps[0].value}/${bps[0].secondaryValue} ${bps[0].unit} (${formatDate(bps[0].date)})`);
  }

  if (context.reports.length) {
    sources.push(...context.reports.map((r) => `${r.title} — ${formatDate(r.reportDate)}`));
    const allOutside = context.reports.flatMap((r) => r.results.filter((res) => res.status === 'outside_range'));
    if (allOutside.length) {
      parts.push(`You have ${allOutside.length} results outside the reference range across your reports. Consider discussing these with your doctor.`);
    }
  }

  if (context.medications.length) {
    sources.push('Medications');
    const notTaken = context.medications.filter((m) => !isTakenToday(m));
    if (notTaken.length) {
      parts.push(`Medication reminder: ${notTaken.map((m) => m.name).join(', ')} not yet taken today.`);
    }
  }

  const pendingReminders = context.reminders.filter((r) => !r.completed);
  if (pendingReminders.length) {
    sources.push('Reminders');
    parts.push(`Upcoming: ${pendingReminders.length} pending reminder(s)`);
  }

  if (!parts.length) parts.push('No health data available yet. Add your health information to receive a personalized summary.');

  return { content: parts.join('\n\n'), basedOnData: sources };
}

export function generateHealthInsights(context: AIContext): AIInsight[] {
  const insights: AIInsight[] = [];
  const now = new Date().toISOString();

  if (context.reports.length >= 1) {
    for (const report of context.reports) {
      const outside = report.results.filter((r) => r.status === 'outside_range');
      if (outside.length) {
        insights.push({
          id: uid('ins-'),
          title: `${outside.length} result(s) outside reference range in ${report.title}`,
          explanation: `Your "${report.title}" from ${formatDate(report.reportDate)} contains ${outside.length} result(s) outside the reference range: ${outside.map((r) => `${r.testName} (${r.value} ${r.unit}, ref: ${r.referenceRange})`).join(', ')}. You may want to discuss these with a qualified healthcare professional.`,
          category: 'trend',
          priority: 'high',
          sourceData: [`${report.title} — ${formatDate(report.reportDate)}`],
          date: now,
          relatedRecordId: report.id,
        });
      }
    }
  }

  if (context.reports.length >= 2) {
    const sorted = [...context.reports].sort((a, b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
    const prev = sorted[sorted.length - 2];
    const curr = sorted[sorted.length - 1];
    for (const currResult of curr.results) {
      const prevResult = prev.results.find((r) => r.testName === currResult.testName);
      if (prevResult && prevResult.status !== currResult.status) {
        insights.push({
          id: uid('ins-'),
          title: `${currResult.testName} status changed between reports`,
          explanation: `Your ${currResult.testName} changed from ${prevResult.value} ${prevResult.unit} (${prevResult.status}) to ${currResult.value} ${currResult.unit} (${currResult.status}) between ${formatDate(prev.reportDate)} and ${formatDate(curr.reportDate)}.`,
          category: 'trend',
          priority: 'medium',
          sourceData: [`${prev.title} — ${formatDate(prev.reportDate)}`, `${curr.title} — ${formatDate(curr.reportDate)}`],
          date: now,
          relatedRecordId: curr.id,
        });
      }
    }
  }

  const notTakenMeds = context.medications.filter((m) => !isTakenToday(m));
  for (const med of notTakenMeds) {
    insights.push({
      id: uid('ins-'),
      title: `${med.name} not taken today`,
      explanation: `Your medication tracking shows ${med.name} (${med.dosage}) has not been marked as taken today. Current adherence: ${med.adherence}%.`,
      category: 'reminder',
      priority: 'medium',
      sourceData: [`Medication: ${med.name}`],
      date: now,
    });
  }

  const pendingReminders = context.reminders.filter((r) => !r.completed);
  for (const rem of pendingReminders.slice(0, 3)) {
    insights.push({
      id: uid('ins-'),
      title: `Upcoming: ${rem.title}`,
      explanation: `You have a pending reminder: ${rem.title} on ${formatDate(rem.date)}${rem.time ? ' at ' + rem.time : ''}.`,
      category: 'reminder',
      priority: 'low',
      sourceData: ['Reminders'],
      date: now,
    });
  }

  if (context.goals.length) {
    for (const goal of context.goals) {
      if (goal.progress >= 100) {
        insights.push({
          id: uid('ins-'),
          title: `Goal achieved: ${goal.name}`,
          explanation: `Congratulations! You've reached your goal of ${goal.name} (${goal.currentValue}/${goal.targetValue} ${goal.unit}).`,
          category: 'goal',
          priority: 'low',
          sourceData: [`Goal: ${goal.name}`],
          date: now,
        });
      }
    }
  }

  if (context.profile && !context.profile.familyHistory.length) {
    insights.push({
      id: uid('ins-'),
      title: 'Consider adding family history',
      explanation: 'Your profile does not include family history information. Family history can be relevant to preventive care. Consider adding it to your profile.',
      category: 'missing_info',
      priority: 'low',
      sourceData: ['Health Profile'],
      date: now,
    });
  }

  return insights;
}

export function generateDoctorQuestions(report: MedicalReport, _context: AIContext): string[] {
  const questions: string[] = [];
  const outside = report.results.filter((r) => r.status === 'outside_range');
  for (const result of outside) {
    questions.push(`My ${result.testName} was ${result.value} ${result.unit} — what could be causing this?`);
  }
  if (outside.length) {
    questions.push('Are there follow-up tests you would recommend?');
    questions.push('Should I make any lifestyle changes based on these results?');
  }
  if (!questions.length) {
    questions.push('All my results were within the reference range — is there anything else I should monitor?');
    questions.push('When should I schedule my next checkup?');
  }
  return questions;
}

export function explainResult(result: ReportResult): { simple: string; whatThisCouldMean: string } {
  const explanations: Record<string, { simple: string; whatThisCouldMean: string }> = {
    Hemoglobin: {
      simple: 'Hemoglobin is a protein in red blood cells that carries oxygen throughout your body.',
      whatThisCouldMean: 'A value below the reference range may indicate anemia. A value above the range may indicate other conditions. Only your doctor can interpret this in context.',
    },
    'White Blood Cells': {
      simple: 'White blood cells are part of your immune system and help fight infections.',
      whatThisCouldMean: 'A high count may indicate infection or inflammation. A low count may indicate a weakened immune system. Discuss with your doctor.',
    },
    Platelets: {
      simple: 'Platelets help your blood clot, stopping bleeding when you get injured.',
      whatThisCouldMean: 'Abnormal levels may affect blood clotting. Your doctor can interpret this in context of your overall health.',
    },
    'RBC Count': {
      simple: 'Red blood cells carry oxygen from your lungs to the rest of your body.',
      whatThisCouldMean: 'A low count may indicate anemia. A high count may indicate other conditions. Your doctor can provide proper interpretation.',
    },
    Hematocrit: {
      simple: 'Hematocrit measures the proportion of your blood made up of red blood cells.',
      whatThisCouldMean: 'A low value may indicate anemia. A high value may indicate dehydration or other conditions. Discuss with your doctor.',
    },
  };

  return explanations[result.testName] || {
    simple: `${result.testName} is a health measurement with a value of ${result.value} ${result.unit}.`,
    whatThisCouldMean: `This result is ${result.status === 'within_range' ? 'within' : 'outside'} the reference range provided on your report. Discuss this result with a qualified healthcare professional for proper interpretation.`,
  };
}
