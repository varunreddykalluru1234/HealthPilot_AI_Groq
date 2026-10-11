export function uid(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).substring(2, 8)}`;
}

export function formatDate(dateStr: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', opts ?? { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function relativeDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 0 && diff <= 7) return `In ${diff} days`;
  if (diff < 0 && diff >= -7) return `${Math.abs(diff)} days ago`;
  return formatDate(dateStr);
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function calculateAge(dob: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return undefined;
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

export function classifyResult(value: string, referenceRange: string): 'within_range' | 'outside_range' | 'review_recommended' {
  if (!referenceRange) return 'review_recommended';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return 'review_recommended';
  const rangeMatch = referenceRange.match(/([\d.]+)\s*[-–]\s*([\d.]+)/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1]);
    const high = parseFloat(rangeMatch[2]);
    if (numValue >= low && numValue <= high) return 'within_range';
    return 'outside_range';
  }
  const ltMatch = referenceRange.match(/<\s*([\d.]+)/);
  if (ltMatch) {
    return numValue < parseFloat(ltMatch[1]) ? 'within_range' : 'outside_range';
  }
  const gtMatch = referenceRange.match(/>\s*([\d.]+)/);
  if (gtMatch) {
    return numValue > parseFloat(gtMatch[1]) ? 'within_range' : 'outside_range';
  }
  return 'review_recommended';
}

export function downloadJSON(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function statusColor(status: string): { bg: string; text: string; label: string } {
  switch (status) {
    case 'within_range':
      return { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Within reference range' };
    case 'outside_range':
      return { bg: 'bg-red-50', text: 'text-red-700', label: 'Outside reference range' };
    case 'review_recommended':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Review recommended' };
    case 'uploaded':
      return { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Uploaded' };
    case 'analyzed':
      return { bg: 'bg-teal-50', text: 'text-teal-700', label: 'Analyzed' };
    case 'pending':
      return { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending' };
    case 'completed':
      return { bg: 'bg-navy-100', text: 'text-navy-600', label: 'Completed' };
    default:
      return { bg: 'bg-slate-100', text: 'text-slate-600', label: status };
  }
}

export function categoryLabel(cat: string): string {
  const labels: Record<string, string> = {
    medical_report: 'Medical Report',
    lab_result: 'Lab Result',
    prescription: 'Prescription',
    doctor_note: 'Doctor Note',
    vaccination: 'Vaccination',
    other: 'Other',
  };
  return labels[cat] ?? cat;
}

export function categoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    medical_report: 'FileText',
    lab_result: 'FlaskConical',
    prescription: 'Pill',
    doctor_note: 'Stethoscope',
    vaccination: 'Syringe',
    other: 'Folder',
  };
  return icons[cat] ?? 'Folder';
}
