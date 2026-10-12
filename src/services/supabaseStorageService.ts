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
    const fetchPromise = supabase
      .from('user_health_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
      setTimeout(() => resolve({ data: null, error: { message: 'Cloud fetch request timed out' } }), 1500)
    );

    const { data, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

    if (error) {
      console.warn('[Supabase Storage] Fetch error or timeout:', error.message);
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

  // Safety safeguard: Never overwrite populated cloud state with an empty un-onboarded state
  const hasNoData =
    !state.isOnboarded &&
    !state.profile &&
    (!state.records || state.records.length === 0) &&
    (!state.measurements || state.measurements.length === 0) &&
    (!state.reports || state.reports.length === 0);

  if (hasNoData) {
    return false;
  }

  try {
    const payload = {
      user_id: userId,
      is_onboarded: Boolean(state.isOnboarded),
      profile: state.profile ?? null,
      measurements: Array.isArray(state.measurements) ? state.measurements : [],
      records: Array.isArray(state.records) ? state.records : [],
      reports: Array.isArray(state.reports) ? state.reports : [],
      medications: Array.isArray(state.medications) ? state.medications : [],
      reminders: Array.isArray(state.reminders) ? state.reminders : [],
      goals: Array.isArray(state.goals) ? state.goals : [],
      timeline: Array.isArray(state.timeline) ? state.timeline : [],
      conversations: Array.isArray(state.conversations) ? state.conversations : [],
      abha_connection: state.abhaConnection ?? { isConnected: false, consentGiven: false },
      imported_abha_record_ids: Array.isArray(state.importedAbhaRecordIds) ? state.importedAbhaRecordIds : [],
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase
      .from('user_health_state')
      .upsert(payload, { onConflict: 'user_id' });

    // Fallback if upsert encounters RLS conflict or syntax differences: try select -> update or insert
    if (error) {
      console.warn('[Supabase Storage] Upsert warning, trying fallback update/insert:', error.message);
      const { data: existing } = await supabase
        .from('user_health_state')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const updateRes = await supabase
          .from('user_health_state')
          .update(payload)
          .eq('user_id', userId);
        error = updateRes.error;
      } else {
        const insertRes = await supabase
          .from('user_health_state')
          .insert(payload);
        error = insertRes.error;
      }
    }

    if (error) {
      console.error('[Supabase Storage] Cloud save error:', error.message, error);
      return false;
    }

    console.log('[Supabase Storage] Successfully synced health state to cloud for user:', userId);
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
