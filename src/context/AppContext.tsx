import { createContext, useContext, useEffect, useState, useReducer, useRef, type ReactNode } from 'react';
import type {
  AppState,
  UserProfile,
  HealthMeasurement,
  HealthRecord,
  MedicalReport,
  Medication,
  Reminder,
  HealthGoal,
  TimelineEvent,
  ChatMessage,
  AIInsight,
  AbhaConnection,
} from '@/types';
import { loadState, saveState, createEmptyState, createDemoState, addTimelineEvent } from '@/services/dataService';
import { fetchUserCloudState, syncUserCloudState, syncUserCloudStateDebounced } from '@/services/supabaseStorageService';
import { generateHealthInsights } from '@/services/aiService';
import { uid } from '@/utils/helpers';
import { supabase } from '@/lib/supabase';

type Action =
  | { type: 'INIT'; state: AppState }
  | { type: 'LOGIN'; mode: 'demo' | 'real' }
  | { type: 'LOGOUT' }
  | { type: 'SET_ONBOARDED'; profile: UserProfile }
  | { type: 'UPDATE_PROFILE'; profile: UserProfile }
  | { type: 'ADD_MEASUREMENT'; measurement: HealthMeasurement }
  | { type: 'ADD_RECORD'; record: HealthRecord }
  | { type: 'DELETE_RECORD'; id: string }
  | { type: 'ADD_REPORT'; report: MedicalReport }
  | { type: 'UPDATE_REPORT'; report: MedicalReport }
  | { type: 'DELETE_REPORT'; id: string }
  | { type: 'ADD_MEDICATION'; medication: Medication }
  | { type: 'UPDATE_MEDICATION'; medication: Medication }
  | { type: 'DELETE_MEDICATION'; id: string }
  | { type: 'TOGGLE_MEDICATION_TAKEN'; id: string }
  | { type: 'ADD_REMINDER'; reminder: Reminder }
  | { type: 'UPDATE_REMINDER'; reminder: Reminder }
  | { type: 'DELETE_REMINDER'; id: string }
  | { type: 'TOGGLE_REMINDER'; id: string }
  | { type: 'ADD_GOAL'; goal: HealthGoal }
  | { type: 'UPDATE_GOAL'; goal: HealthGoal }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'ADD_TIMELINE'; event: TimelineEvent }
  | { type: 'ADD_CHAT_MESSAGE'; message: ChatMessage }
  | { type: 'CLEAR_CONVERSATIONS' }
  | { type: 'SET_INSIGHTS'; insights: AIInsight[] }
  | { type: 'CONNECT_ABHA'; connection: AbhaConnection }
  | { type: 'DISCONNECT_ABHA' }
  | { type: 'IMPORT_ABHA_RECORDS'; records: HealthRecord[]; reports: MedicalReport[]; medications: Medication[]; importedIds: string[]; timelineEvents: TimelineEvent[] }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: AppState };

/**
 * Calculate adherence % for a medication using only recorded history.
 * Returns a value in 0–100 rounded to the nearest integer.
 * Days with no history (e.g. before the medication was added) are never
 * invented — only actual entries in takenDates count.
 */
function calcAdherence(startDate: string, takenDates: string[]): number {
  if (!takenDates.length) return 0;
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return 0;
  // Total days from startDate up to and including today
  const today = new Date();
  const msPerDay = 86400000;
  const totalDays = Math.floor((today.getTime() - start.getTime()) / msPerDay) + 1;
  if (totalDays <= 0) return 0;
  const takenCount = takenDates.length;
  return Math.min(100, Math.round((takenCount / totalDays) * 100));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
    case 'HYDRATE':
      return action.state;
    case 'LOGIN':
      if (action.mode === 'demo') return createDemoState();
      return { ...state, isAuthenticated: true, mode: 'real' };
    case 'LOGOUT':
      return createEmptyState();
    case 'SET_ONBOARDED':
      return {
        ...state,
        isOnboarded: true,
        profile: action.profile,
        timeline: addTimelineEvent(state.timeline, 'measurement', 'Health profile created during onboarding', 'user'),
      };
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: { ...action.profile, updatedAt: new Date().toISOString() },
        timeline: addTimelineEvent(state.timeline, 'record', 'Health profile updated', 'user'),
      };
    case 'ADD_MEASUREMENT':
      return {
        ...state,
        measurements: [...state.measurements, action.measurement],
        timeline: addTimelineEvent(state.timeline, 'measurement', `${action.measurement.type.replace('_', ' ')} recorded: ${action.measurement.value} ${action.measurement.unit}`, action.measurement.source),
      };
    case 'ADD_RECORD':
      return {
        ...state,
        records: [action.record, ...state.records],
        timeline: addTimelineEvent(state.timeline, 'record', `Record added: ${action.record.title}`, action.record.source),
      };
    case 'DELETE_RECORD':
      return { ...state, records: state.records.filter((r) => r.id !== action.id) };
    case 'ADD_REPORT':
      return {
        ...state,
        reports: [action.report, ...state.reports],
        timeline: addTimelineEvent(state.timeline, 'report', `Report uploaded: ${action.report.title}`, action.report.source, action.report.id),
      };
    case 'UPDATE_REPORT':
      return {
        ...state,
        reports: state.reports.map((r) => (r.id === action.report.id ? action.report : r)),
      };
    case 'DELETE_REPORT':
      return { ...state, reports: state.reports.filter((r) => r.id !== action.id) };
    case 'ADD_MEDICATION':
      return {
        ...state,
        medications: [...state.medications, action.medication],
        timeline: addTimelineEvent(state.timeline, 'medication', `Medication added: ${action.medication.name} ${action.medication.dosage}`, action.medication.source),
      };
    case 'UPDATE_MEDICATION':
      return { ...state, medications: state.medications.map((m) => (m.id === action.medication.id ? action.medication : m)) };
    case 'DELETE_MEDICATION':
      return { ...state, medications: state.medications.filter((m) => m.id !== action.id) };
    case 'TOGGLE_MEDICATION_TAKEN': {
      const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      return {
        ...state,
        medications: state.medications.map((m) => {
          if (m.id !== action.id) return m;
          // Determine the *effective* current taken state (respecting day rollover)
          const effectiveTakenToday =
            m.takenToday && m.lastTakenDate === todayStr;
          const newTakenToday = !effectiveTakenToday;
          // Build the updated takenDates array
          const existingDates = m.takenDates ?? [];
          let newTakenDates: string[];
          if (newTakenToday) {
            // Mark taken: add today if not already present
            newTakenDates = existingDates.includes(todayStr)
              ? existingDates
              : [...existingDates, todayStr];
          } else {
            // Unmark taken: remove today from history
            newTakenDates = existingDates.filter((d) => d !== todayStr);
          }
          return {
            ...m,
            takenToday: newTakenToday,
            lastTakenDate: newTakenToday ? todayStr : m.lastTakenDate,
            takenDates: newTakenDates,
            adherence: calcAdherence(m.startDate, newTakenDates),
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    }
    case 'ADD_REMINDER':
      return {
        ...state,
        reminders: [...state.reminders, action.reminder],
        timeline: addTimelineEvent(state.timeline, 'appointment', `Reminder added: ${action.reminder.title}`, 'user'),
      };
    case 'UPDATE_REMINDER':
      return { ...state, reminders: state.reminders.map((r) => (r.id === action.reminder.id ? action.reminder : r)) };
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter((r) => r.id !== action.id) };
    case 'TOGGLE_REMINDER':
      return { ...state, reminders: state.reminders.map((r) => (r.id === action.id ? { ...r, completed: !r.completed } : r)) };
    case 'ADD_GOAL':
      return {
        ...state,
        goals: [...state.goals, action.goal],
        timeline: addTimelineEvent(state.timeline, 'goal', `Goal created: ${action.goal.name}`, action.goal.source),
      };
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map((g) => (g.id === action.goal.id ? action.goal : g)) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter((g) => g.id !== action.id) };
    case 'ADD_TIMELINE':
      return { ...state, timeline: [action.event, ...state.timeline] };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, conversations: [...state.conversations, action.message] };
    case 'CLEAR_CONVERSATIONS':
      return { ...state, conversations: [] };
    case 'SET_INSIGHTS':
      return { ...state, insights: action.insights };
    case 'CONNECT_ABHA':
      return {
        ...state,
        abhaConnection: action.connection,
        timeline: addTimelineEvent(state.timeline, 'record', `ABHA Demo Account connected (${action.connection.abhaId ?? 'Demo ID'})`, 'demo'),
      };
    case 'DISCONNECT_ABHA':
      return {
        ...state,
        abhaConnection: { isConnected: false, consentGiven: false },
        timeline: addTimelineEvent(state.timeline, 'record', 'ABHA Demo Account disconnected', 'demo'),
      };
    case 'IMPORT_ABHA_RECORDS':
      return {
        ...state,
        records: [...action.records, ...state.records],
        reports: [...action.reports, ...state.reports],
        medications: [...action.medications, ...state.medications],
        importedAbhaRecordIds: [...(state.importedAbhaRecordIds ?? []), ...action.importedIds],
        timeline: [...action.timelineEvents, ...state.timeline],
      };
    case 'RESET':
      return createEmptyState();
    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  isDemo: boolean;
  isLoading: boolean;
  currentUserId: string | null;
  hydrateUser: (userId: string) => Promise<boolean>;
  syncCloud: () => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('healthpilot_last_user_id');
  });
  const [state, dispatch] = useReducer(reducer, null, () => loadState(localStorage.getItem('healthpilot_last_user_id')));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const cloudHydratedRef = useRef<boolean>(false);

  // Persist state locally and sync to Supabase Cloud Database ONLY AFTER initial hydration is finished
  useEffect(() => {
    saveState(state, currentUserId);
    if (currentUserId && state.mode === 'real' && state.isAuthenticated && cloudHydratedRef.current) {
      syncUserCloudStateDebounced(currentUserId, state);
    }
  }, [state, currentUserId]);

  /**
   * Unified, race-condition-free user data hydration for both page load and login.
   * Ensures that when logging in from any device, data from Supabase Cloud
   * is pulled down and properly populated in state and local storage.
   */
  const hydrateUser = async (userId: string): Promise<boolean> => {
    setIsLoading(true);
    setCurrentUserId(userId);
    localStorage.setItem('healthpilot_last_user_id', userId);

    try {
      // 1. Check local cached state
      const localCached = loadState(userId);

      // 2. Fetch from Supabase Cloud Database
      const cloudState = await fetchUserCloudState(userId);

      const hasCloudData = Boolean(
        cloudState && (
          cloudState.isOnboarded ||
          cloudState.profile ||
          (cloudState.records && cloudState.records.length > 0) ||
          (cloudState.measurements && cloudState.measurements.length > 0) ||
          (cloudState.reports && cloudState.reports.length > 0) ||
          (cloudState.medications && cloudState.medications.length > 0)
        )
      );

      const hasLocalData = Boolean(
        localCached && (
          localCached.isOnboarded ||
          localCached.profile ||
          (localCached.records && localCached.records.length > 0) ||
          (localCached.measurements && localCached.measurements.length > 0) ||
          (localCached.reports && localCached.reports.length > 0) ||
          (localCached.medications && localCached.medications.length > 0)
        )
      );

      if (hasCloudData && cloudState) {
        // Cloud has data. Prioritize cloud data, but merge any unsynced local records
        const mergedState: AppState = {
          ...createEmptyState(),
          ...cloudState,
          isAuthenticated: true,
          mode: 'real',
        };

        if (hasLocalData && localCached) {
          const recIds = new Set(mergedState.records.map((r) => r.id));
          const extraRecs = (localCached.records || []).filter((r) => !recIds.has(r.id));
          if (extraRecs.length) mergedState.records = [...mergedState.records, ...extraRecs];

          const repIds = new Set(mergedState.reports.map((r) => r.id));
          const extraReps = (localCached.reports || []).filter((r) => !repIds.has(r.id));
          if (extraReps.length) mergedState.reports = [...mergedState.reports, ...extraReps];

          const medIds = new Set(mergedState.medications.map((m) => m.id));
          const extraMeds = (localCached.medications || []).filter((m) => !medIds.has(m.id));
          if (extraMeds.length) mergedState.medications = [...mergedState.medications, ...extraMeds];

          const measIds = new Set(mergedState.measurements.map((m) => m.id));
          const extraMeas = (localCached.measurements || []).filter((m) => !measIds.has(m.id));
          if (extraMeas.length) mergedState.measurements = [...mergedState.measurements, ...extraMeas];

          const remIds = new Set(mergedState.reminders.map((r) => r.id));
          const extraRems = (localCached.reminders || []).filter((r) => !remIds.has(r.id));
          if (extraRems.length) mergedState.reminders = [...mergedState.reminders, ...extraRems];

          const goalIds = new Set(mergedState.goals.map((g) => g.id));
          const extraGoals = (localCached.goals || []).filter((g) => !goalIds.has(g.id));
          if (extraGoals.length) mergedState.goals = [...mergedState.goals, ...extraGoals];

          if (extraRecs.length || extraReps.length || extraMeds.length || extraMeas.length || extraRems.length || extraGoals.length) {
            syncUserCloudState(userId, mergedState);
          }
        }

        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email && mergedState.profile && !mergedState.profile.email) {
            mergedState.profile.email = session.user.email;
          }
        }

        dispatch({ type: 'HYDRATE', state: mergedState });
        saveState(mergedState, userId);
        return true;
      } else if (hasLocalData && localCached) {
        // Local has data, but cloud is empty! (e.g. initial upload from first device)
        const stateToUpload: AppState = {
          ...localCached,
          isAuthenticated: true,
          mode: 'real',
        };
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email && stateToUpload.profile && !stateToUpload.profile.email) {
            stateToUpload.profile.email = session.user.email;
          }
        }
        dispatch({ type: 'HYDRATE', state: stateToUpload });
        saveState(stateToUpload, userId);
        await syncUserCloudState(userId, stateToUpload);
        return true;
      } else {
        // Brand new user on both devices: prefill profile with auth email/name if available
        let authEmail = '';
        let authFullName = '';
        if (supabase) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            authEmail = session.user.email || '';
            authFullName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          }
        }

        const initialNewUserState: AppState = {
          ...createEmptyState(),
          isAuthenticated: true,
          mode: 'real',
          profile: authEmail || authFullName ? {
            id: uid('prof-'),
            mode: 'real',
            fullName: authFullName,
            email: authEmail,
            conditions: [],
            allergies: [],
            medications: [],
            familyHistory: [],
            goals: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } : null,
        };
        dispatch({ type: 'HYDRATE', state: initialNewUserState });
        return false;
      }
    } catch (err) {
      console.error('[AppContext] Hydration error:', err);
      return false;
    } finally {
      cloudHydratedRef.current = true;
      setIsLoading(false);
    }
  };

  const syncCloud = async (): Promise<boolean> => {
    if (!currentUserId || state.mode !== 'real' || !state.isAuthenticated) return false;
    return syncUserCloudState(currentUserId, state);
  };

  // Auth listener and cloud database hydration
  useEffect(() => {
    if (!supabase) {
      cloudHydratedRef.current = true;
      setIsLoading(false);
      return;
    }

    // 1. Check initial active session on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id) {
        await hydrateUser(session.user.id);
      } else {
        cloudHydratedRef.current = true;
        setIsLoading(false);
      }
    });

    // 2. Listen to ongoing auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        cloudHydratedRef.current = false;
        setCurrentUserId(null);
        localStorage.removeItem('healthpilot_last_user_id');
        dispatch({ type: 'LOGOUT' });
        setIsLoading(false);
      } else if (event === 'SIGNED_IN' && session?.user?.id) {
        await hydrateUser(session.user.id);
      }
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (state.isAuthenticated && state.isOnboarded) {
      const insights = generateHealthInsights({
        profile: state.profile,
        measurements: state.measurements,
        reports: state.reports,
        medications: state.medications,
        reminders: state.reminders,
        goals: state.goals,
        isDemo: state.mode === 'demo',
      });
      dispatch({ type: 'SET_INSIGHTS', insights });
    }
  }, [state.isAuthenticated, state.isOnboarded, state.profile, state.measurements, state.reports, state.medications, state.reminders, state.goals, state.mode]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        isDemo: state.mode === 'demo',
        isLoading,
        currentUserId,
        hydrateUser,
        syncCloud,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
