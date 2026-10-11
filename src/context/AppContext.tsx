import { createContext, useContext, useEffect, useState, useReducer, type ReactNode } from 'react';
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
import { fetchUserCloudState, syncUserCloudStateDebounced } from '@/services/supabaseStorageService';
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return localStorage.getItem('healthpilot_last_user_id');
  });
  const [state, dispatch] = useReducer(reducer, null, () => loadState(localStorage.getItem('healthpilot_last_user_id')));

  // Persist state locally and sync to Supabase Cloud Database
  useEffect(() => {
    saveState(state, currentUserId);
    if (currentUserId && state.mode === 'real' && state.isAuthenticated) {
      syncUserCloudStateDebounced(currentUserId, state);
    }
  }, [state, currentUserId]);

  // Auth listener and cloud database hydration
  useEffect(() => {
    if (!supabase) return;

    // 1. Check initial active session on page load
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user?.id) {
        const userId = session.user.id;
        setCurrentUserId(userId);
        
        // Hydrate from fast local cache first
        const localCached = loadState(userId);
        if (localCached.isAuthenticated) {
          dispatch({ type: 'HYDRATE', state: localCached });
        } else {
          dispatch({ type: 'LOGIN', mode: 'real' });
        }

        // Hydrate from Supabase Cloud Database
        const cloudState = await fetchUserCloudState(userId);
        if (cloudState && (cloudState.profile || cloudState.isOnboarded)) {
          dispatch({
            type: 'HYDRATE',
            state: {
              ...createEmptyState(),
              ...cloudState,
              isAuthenticated: true,
              mode: 'real',
            } as AppState,
          });
        }
      }
    });

    // 2. Listen to ongoing auth state events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT') {
          setCurrentUserId(null);
          dispatch({ type: 'LOGOUT' });
        } else if (event === 'SIGNED_IN' && session) {
          const userId = session.user.id;
          setCurrentUserId(userId);

          // Fast local cache hydration
          const localCached = loadState(userId);
          if (localCached.isAuthenticated && localCached.isOnboarded) {
            dispatch({ type: 'HYDRATE', state: localCached });
          } else {
            dispatch({ type: 'LOGIN', mode: 'real' });
          }

          // Supabase Cloud Database hydration
          const cloudState = await fetchUserCloudState(userId);
          if (cloudState && (cloudState.profile || cloudState.isOnboarded)) {
            dispatch({
              type: 'HYDRATE',
              state: {
                ...createEmptyState(),
                ...cloudState,
                isAuthenticated: true,
                mode: 'real',
              } as AppState,
            });
          }
        }
      })();
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

  return <AppContext.Provider value={{ state, dispatch, isDemo: state.mode === 'demo' }}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
