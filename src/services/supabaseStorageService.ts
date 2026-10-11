import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AppState } from '@/types';

export interface CloudHealthStateRow {
  user_id: string;
  is_onboarded: boolean;
  profile: any;
  measurements: any;
  records: any;
  reports: any;
  medications: any;
  reminders: any;
  goals: any;
  timeline: any;
  conversations: any;
  abha_connection: any;
  imported_abha_record_ids: any;
  updated_at: string;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Loads the user's complete health state from Supabase Cloud Database.
 * Returns null if no record exists or if the query fails.
 */
export async function fetchUserCloudState(userId: string): Promise<Partial<AppState> | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const { data, error } = await supabase
      .from('user_health_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Storage] Fetch error:', error.message);
      return null;
    }

    if (!data) return null;

    const row = data as CloudHealthStateRow;
    return {
      isAuthenticated: true,
      isOnboarded: Boolean(row.is_onboarded),
      mode: 'real',
      profile: row.profile || null,
      measurements: Array.isArray(row.measurements) ? row.measurements : [],
      records: Array.isArray(row.records) ? row.records : [],
      reports: Array.isArray(row.reports) ? row.reports : [],
      medications: Array.isArray(row.medications) ? row.medications : [],
      reminders: Array.isArray(row.reminders) ? row.reminders : [],
      goals: Array.isArray(row.goals) ? row.goals : [],
      timeline: Array.isArray(row.timeline) ? row.timeline : [],
      conversations: Array.isArray(row.conversations) ? row.conversations : [],
      abhaConnection: row.abha_connection || { isConnected: false, consentGiven: false },
      importedAbhaRecordIds: Array.isArray(row.imported_abha_record_ids) ? row.imported_abha_record_ids : [],
    };
  } catch (err) {
    console.warn('[Supabase Storage] Unexpected fetch exception:', err);
    return null;
  }
}

/**
 * Saves or updates the user's health state in Supabase Cloud Database.
 */
export async function syncUserCloudState(userId: string, state: AppState): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  if (!userId || state.mode !== 'real') return false;

  try {
    const payload = {
      user_id: userId,
      is_onboarded: state.isOnboarded,
      profile: state.profile,
      measurements: state.measurements,
      records: state.records,
      reports: state.reports,
      medications: state.medications,
      reminders: state.reminders,
      goals: state.goals,
      timeline: state.timeline,
      conversations: state.conversations,
      abha_connection: state.abhaConnection,
      imported_abha_record_ids: state.importedAbhaRecordIds,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('user_health_state')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
      console.warn('[Supabase Storage] Cloud save error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('[Supabase Storage] Unexpected save exception:', err);
    return false;
  }
}

/**
 * Debounced cloud synchronization to avoid excessive requests during rapid input.
 */
export function syncUserCloudStateDebounced(userId: string, state: AppState, delay = 800) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    syncUserCloudState(userId, state);
  }, delay);
}
