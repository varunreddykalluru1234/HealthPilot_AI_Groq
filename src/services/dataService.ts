import type { AppState, UserProfile, HealthMeasurement, HealthRecord, MedicalReport, Medication, Reminder, HealthGoal, TimelineEvent } from '@/types';
import {
  demoProfile,
  demoMeasurements,
  demoReports,
  demoRecords,
  demoMedications,
  demoReminders,
  demoGoals,
  demoTimeline,
} from '@/data/demoData';

const STORAGE_KEY = 'healthpilot_state_v1';
const LAST_USER_KEY = 'healthpilot_last_user_id';

export function getStorageKey(userId?: string | null): string {
  if (userId) return `healthpilot_user_${userId}`;
  return STORAGE_KEY;
}

export function createEmptyState(): AppState {
  return {
    isAuthenticated: false,
    isOnboarded: false,
    mode: 'real',
    profile: null,
    measurements: [],
    records: [],
    reports: [],
    medications: [],
    reminders: [],
    goals: [],
    timeline: [],
    insights: [],
    conversations: [],
    abhaConnection: { isConnected: false, consentGiven: false },
    importedAbhaRecordIds: [],
  };
}

export function createDemoState(): AppState {
  return {
    isAuthenticated: true,
    isOnboarded: true,
    mode: 'demo',
    profile: demoProfile,
    measurements: demoMeasurements,
    records: demoRecords,
    reports: demoReports,
    medications: demoMedications,
    reminders: demoReminders,
    goals: demoGoals,
    timeline: demoTimeline,
    insights: [],
    conversations: [],
    abhaConnection: {
      isConnected: true,
      abhaId: '91-8842-1049-5521',
      abhaAddress: 'jordan.avery@abdm',
      fullName: 'Jordan Avery',
      gender: 'Female',
      dateOfBirth: '1992-03-15',
      mobile: '98******21',
      connectedAt: new Date().toISOString(),
      consentGiven: true,
      hipName: 'Apollo Hospitals & Diagnostics (Simulated HIP)',
    },
    importedAbhaRecordIds: [],
  };
}

export function loadState(userId?: string | null): AppState {
  try {
    const effectiveUserId = userId || localStorage.getItem(LAST_USER_KEY);
    const key = getStorageKey(effectiveUserId);
    const raw = localStorage.getItem(key) || (key !== STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) : null);
    if (!raw) return createEmptyState();
    const parsed = JSON.parse(raw) as AppState;
    // Demo mode is an exploration session — do not persist as an active login on new visits
    if (parsed.mode === 'demo') {
      return createEmptyState();
    }
    return { ...createEmptyState(), ...parsed };
  } catch {
    return createEmptyState();
  }
}

export function saveState(state: AppState, userId?: string | null): void {
  try {
    // If exploring demo mode, do not overwrite real user data
    if (state.mode === 'demo') {
      return;
    }
    // If state is logged out and no user is provided, don't wipe stored user state
    if (!state.isAuthenticated && !userId) {
      return;
    }
    const effectiveUserId = userId || localStorage.getItem(LAST_USER_KEY);
    if (effectiveUserId) {
      localStorage.setItem(LAST_USER_KEY, effectiveUserId);
    }
    const key = getStorageKey(effectiveUserId);
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // storage full or unavailable — non-critical
  }
}

export function clearState(userId?: string | null): void {
  const effectiveUserId = userId || localStorage.getItem(LAST_USER_KEY);
  if (effectiveUserId) {
    localStorage.removeItem(getStorageKey(effectiveUserId));
    localStorage.removeItem(LAST_USER_KEY);
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function addTimelineEvent(
  timeline: TimelineEvent[],
  category: TimelineEvent['category'],
  description: string,
  source: TimelineEvent['source'],
  relatedId?: string
): TimelineEvent[] {
  const event: TimelineEvent = {
    id: `tl-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    date: new Date().toISOString(),
    category,
    description,
    source,
    relatedId,
    createdAt: new Date().toISOString(),
  };
  return [event, ...timeline];
}
