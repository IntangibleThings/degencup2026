import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type { Tier, AppSettings, Manager, TournamentResults, TopScorerGuess, Wager, WagerComment } from '@/data/tournament';
import { SEED_WAGERS, SEED_COMMENTS } from '@/data/seedWagers';
import { DEFAULT_SETTINGS, getAllTeams } from '@/data/tournament';
import {
  isConfigured,
  saveManager,
  loadAllManagers,
  subscribeToManagers,
  deleteManager as deleteManagerCloud,
  loadSettingsAndResults,
  subscribeToSettingsAndResults,
  syncAllToCloud,
  saveWager,
  loadAllWagers,
  subscribeToWagers,
  loadAllComments,
  subscribeToComments,
} from '@/lib/firebase';

const USER_KEY = 'vibecup_current_user';

const KICKOFF_TIME = new Date('2026-06-11T15:00:00-04:00').getTime();
export function isTournamentStarted(): boolean {
  return Date.now() >= KICKOFF_TIME;
}

export interface AppState {
  currentUser: string | null;
  managers: Manager[];
  settings: AppSettings;
  results: TournamentResults;
  wagers: Wager[];
  comments: WagerComment[];
}

const initialState: AppState = {
  currentUser: null,
  managers: [],
  settings: { ...DEFAULT_SETTINGS },
  results: {},
  wagers: [],
  comments: [],
};

function migrateSettings(parsed: Record<string, unknown>): AppSettings {
  const s = parsed as unknown as AppSettings;
  return {
    ...s,
    // buyIn always comes from DEFAULT_SETTINGS so pushing a new version resets it
    payout: {
      ...DEFAULT_SETTINGS.payout,
      ...(s.payout || {}),
      buyIn: DEFAULT_SETTINGS.payout.buyIn, // always force default buyIn
    },
    topScorerActual: s.topScorerActual || null,
    scoring: s.scoring || DEFAULT_SETTINGS.scoring,
    hidePicksUntil: s.hidePicksUntil || DEFAULT_SETTINGS.hidePicksUntil,
    commentsLocked: s.commentsLocked ?? DEFAULT_SETTINGS.commentsLocked,
  };
}

function loadUserFromLocal(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}

function saveUserToLocal(name: string | null) {
  try { if (name) localStorage.setItem(USER_KEY, name); else localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
}

// ── LOCALSTORAGE PERSISTENCE (works without Firebase) ──
const LOCAL_STATE_KEY = 'vibecup_state_backup';

function saveStateToLocal(state: AppState) {
  try {
    const toSave = {
      managers: state.managers,
      settings: state.settings,
      results: state.results,
      wagers: state.wagers,
      comments: state.comments,
    };
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(toSave));
  } catch (err) {
    console.error('[LOCAL SAVE] Failed:', err);
  }
}

function loadStateFromLocal(): Partial<AppState> | null {
  try {
    const saved = localStorage.getItem(LOCAL_STATE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

type Action =
  | { type: 'SET_MANAGERS'; payload: Manager[] }
  | { type: 'SET_USER'; payload: string | null }
  | { type: 'ADD_MANAGER'; payload: Manager }
  | { type: 'REMOVE_MANAGER'; payload: string }
  | { type: 'SET_MANAGER_TEAMS'; payload: { id: string; teamCodes: string[] } }
  | { type: 'SET_MANAGER_TOP_SCORER'; payload: { id: string; guess: TopScorerGuess } }
  | { type: 'SET_MANAGER_PAID'; payload: { id: string; paid: boolean } }
  | { type: 'SET_MANAGER_ACTIVE'; payload: { id: string; active: boolean } }
  | { type: 'WARN_MANAGER'; payload: string }
  | { type: 'RESET_MANAGER_CODE'; payload: { id: string; code: string } }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'SET_RESULTS'; payload: TournamentResults }
  | { type: 'UPDATE_TIER'; payload: { teamCode: string; tier: Tier } }
  | { type: 'UPDATE_RESULT'; payload: { teamCode: string; result: Partial<TournamentResults[string]> } }
  | { type: 'LOCK_DRAFT' }
  | { type: 'UNLOCK_DRAFT' }
  | { type: 'TOGGLE_DRAFT_MODE' }
  | { type: 'RESET_ALL' }
  // Degen Den wager actions (beer mug flow)
  | { type: 'SET_WAGERS'; payload: Wager[] }
  | { type: 'ADD_WAGER'; payload: Wager }
  | { type: 'ACCEPT_WAGER'; payload: string }
  | { type: 'RESOLVE_WAGER'; payload: { wagerId: string; winnerId: string | null } }
  | { type: 'CANCEL_WAGER'; payload: string }
  | { type: 'EXPIRE_WAGER'; payload: string } // 24h expiry
  | { type: 'DELETE_WAGER'; payload: string }
  | { type: 'TOGGLE_WAGER_COMMENTS'; payload: string }
  // Degen Den comment actions
  | { type: 'SET_COMMENTS'; payload: WagerComment[] }
  | { type: 'ADD_COMMENT'; payload: WagerComment };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_MANAGERS':
      return { ...state, managers: action.payload };
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_MANAGER': {
      const exists = state.managers.find(m => m.name === action.payload.name);
      if (exists) return state;
      return { ...state, managers: [...state.managers, action.payload] };
    }
    case 'REMOVE_MANAGER':
      return { ...state, managers: state.managers.filter(m => m.id !== action.payload) };
    case 'SET_MANAGER_TEAMS':
      return { ...state, managers: state.managers.map(m => m.id === action.payload.id ? { ...m, teamCodes: action.payload.teamCodes, submittedAt: new Date().toISOString() } : m) };
    case 'SET_MANAGER_TOP_SCORER':
      return { ...state, managers: state.managers.map(m => m.id === action.payload.id ? { ...m, topScorerGuess: action.payload.guess } : m) };
    case 'SET_MANAGER_PAID':
      return { ...state, managers: state.managers.map(m => m.id === action.payload.id ? { ...m, paid: action.payload.paid } : m) };
    case 'SET_MANAGER_ACTIVE':
      return { ...state, managers: state.managers.map(m => m.id === action.payload.id ? { ...m, active: action.payload.active } : m) };
    case 'WARN_MANAGER':
      return { ...state, managers: state.managers.map(m => m.id === action.payload ? { ...m, warnings: (m.warnings || 0) + 1 } : m) };
    case 'RESET_MANAGER_CODE':
      return { ...state, managers: state.managers.map(m => m.id === action.payload.id ? { ...m, code: action.payload.code } : m) };
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'UPDATE_TIER': {
      const newTiers = { ...state.settings.tiers, [action.payload.teamCode]: action.payload.tier };
      return { ...state, settings: { ...state.settings, tiers: newTiers } };
    }
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'UPDATE_RESULT':
      return { ...state, results: { ...state.results, [action.payload.teamCode]: { ...state.results[action.payload.teamCode], ...action.payload.result } as TournamentResults[string] } };
    case 'LOCK_DRAFT':
      return { ...state, settings: { ...state.settings, draftLocked: true, submissionsOpen: false } };
    case 'UNLOCK_DRAFT':
      return { ...state, settings: { ...state.settings, draftLocked: false, submissionsOpen: true } };
    case 'TOGGLE_DRAFT_MODE':
      return { ...state, settings: { ...state.settings, draftMode: !state.settings.draftMode } };
    // Degen Den wager cases
    case 'SET_WAGERS':
      return { ...state, wagers: action.payload };
    case 'ADD_WAGER':
      return { ...state, wagers: [...state.wagers, action.payload] };
    case 'ACCEPT_WAGER': {
      const now = new Date();
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload
            ? { ...w, acceptorConfirmed: true, acceptedAt: now.toISOString(), status: 'live' as const }
            : w
        ),
      };
    }
    case 'RESOLVE_WAGER': {
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload.wagerId
            ? { ...w, winnerId: action.payload.winnerId, status: 'resolved' as const, resolvedAt: new Date().toISOString() }
            : w
        ),
      };
    }
    case 'CANCEL_WAGER': {
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload ? { ...w, status: 'cancelled' as const } : w
        ),
      };
    }
    case 'EXPIRE_WAGER': {
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload ? { ...w, status: 'cancelled' as const, rejectedReason: 'Expired — not accepted within 24h' } : w
        ),
      };
    }
    case 'DELETE_WAGER': {
      return { ...state, wagers: state.wagers.filter(w => w.id !== action.payload) };
    }
    case 'TOGGLE_WAGER_COMMENTS': {
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload ? { ...w, commentsLocked: !w.commentsLocked } : w
        ),
      };
    }
    // Degen Den comment cases
    case 'SET_COMMENTS':
      return { ...state, comments: action.payload };
    case 'ADD_COMMENT':
      return { ...state, comments: [...(state.comments || []), action.payload] };
    case 'RESET_ALL':
      return { ...initialState };
    default:
      return state;
  }
}

interface GameContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  firebaseEnabled: boolean;
  setUser: (name: string | null) => void;
  addManager: (name: string, teamName?: string, realName?: string, pincode?: string) => Promise<Manager>;
  removeManager: (id: string) => void;
  submitTeams: (managerId: string, teamCodes: string[]) => Promise<void>;
  submitTopScorer: (managerId: string, guess: TopScorerGuess) => Promise<void>;
  setManagerPaid: (managerId: string, paid: boolean) => void;
  setManagerActive: (managerId: string, active: boolean) => void;
  warnManager: (managerId: string) => void;
  resetManagerCode: (managerId: string) => string;
  updateTier: (teamCode: string, tier: Tier) => void;
  updateResult: (teamCode: string, result: Partial<TournamentResults[string]>) => void;
  lockDraft: () => void;
  unlockDraft: () => void;
  forceSync: () => Promise<void>;
  loadFromCloud: () => Promise<number>;
  saveSettings: (settings: AppSettings) => Promise<void>;
  saveResults: (results: TournamentResults) => Promise<void>;
  // Degen Den wager methods (beer mug flow — no admin approval, 24h expiry)
  createWager: (proposerId: string, proposerName: string, acceptorId: string, acceptorName: string, description: string, stakeType: 'even' | 'custom', proposerMugs: number, acceptorMugs: number) => Promise<Wager>;
  acceptWager: (wagerId: string) => Promise<void>;
  resolveWager: (wagerId: string, winnerId: string | null) => Promise<void>;
  cancelWager: (wagerId: string) => Promise<void>;
  deleteWager: (wagerId: string) => Promise<void>;
  toggleWagerComments: (wagerId: string) => Promise<void>;
  getWager: (wagerId: string) => Wager | undefined;
  // Degen Den comment methods
  addComment: (wagerId: string, managerId: string, managerName: string, message: string) => Promise<void>;
  getCommentsForWager: (wagerId: string) => WagerComment[];
  loadSeedData: () => void;
  toggleCommentsLock: () => Promise<void>;
  // Utility
  getManager: (name: string) => Manager | undefined;
  getManagerByNameAndPin: (name: string, pin: string) => Manager | undefined;
  getTeamsForManager: (managerId: string) => { code: string; name: string; flag: string; tier: Tier; points: number }[];
  getUsedTeams: () => string[];
  getScoreForManager: (managerId: string) => { total: number; teamsAlive: number; semiFinalists: number; finalists: number; hasChampion: boolean; topScorerCorrect: boolean };
  getPayouts: () => { totalPot: number; first: number; second: number; third: number; currency: string };
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const dispatchRef = useRef(dispatch);
  const stateRef = useRef(state);
  dispatchRef.current = dispatch;
  stateRef.current = state;

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ========================================================================
  // INITIAL LOAD + SUBSCRIPTION ONLY (NO POLLING - prevents quota exhaustion)
  // ========================================================================
  useEffect(() => {
    console.log('[GAME] === MOUNT ===');

    const savedUser = loadUserFromLocal();
    if (savedUser) {
      dispatch({ type: 'SET_USER', payload: savedUser });
    }

    // Load from localStorage first (works even without Firebase)
    const localState = loadStateFromLocal();
    if (localState) {
      console.log('[GAME] Loaded from localStorage:', localState.managers?.length || 0, 'managers');
      if (localState.managers && localState.managers.length > 0) {
        dispatch({ type: 'SET_MANAGERS', payload: localState.managers });
      }
      if (localState.settings) {
        dispatch({ type: 'SET_SETTINGS', payload: migrateSettings(localState.settings as unknown as Record<string, unknown>) });
      }
      if (localState.results) {
        dispatch({ type: 'SET_RESULTS', payload: localState.results as TournamentResults });
      }
      if (localState.wagers && localState.wagers.length > 0) {
        dispatch({ type: 'SET_WAGERS', payload: localState.wagers as Wager[] });
      }
      if (localState.comments && localState.comments.length > 0) {
        dispatch({ type: 'SET_COMMENTS', payload: localState.comments as WagerComment[] });
      }
    }

    if (!isConfigured()) {
      console.log('[GAME] Firebase NOT configured — using localStorage only');
      return;
    }

    setFirebaseEnabled(true);
    console.log('[GAME] Firebase configured');

    // ONE-TIME load
    loadAllManagers()
      .then((cloudManagers) => {
        const managers = cloudManagers as unknown as Manager[];
        console.log('[GAME] Initial load:', managers.length);
        if (managers.length > 0) dispatchRef.current({ type: 'SET_MANAGERS', payload: managers });
      })
      .catch((err: Error) => {
        console.error('[GAME] Load failed:', err.message);
      });

    loadSettingsAndResults()
      .then((data) => {
        if (data?.settings) dispatchRef.current({ type: 'SET_SETTINGS', payload: migrateSettings(data.settings as Record<string, unknown>) });
        if (data?.results) dispatchRef.current({ type: 'SET_RESULTS', payload: data.results as TournamentResults });
      })
      .catch(() => {});

    loadAllWagers()
      .then((cloudWagers) => {
        const wagers = cloudWagers as unknown as Wager[];
        console.log('[GAME] Initial wagers load:', wagers.length);
        if (wagers.length > 0) dispatchRef.current({ type: 'SET_WAGERS', payload: wagers });
      })
      .catch(() => {});

    loadAllComments()
      .then((cloudComments) => {
        const comments = cloudComments as unknown as WagerComment[];
        console.log('[GAME] Initial comments load:', comments.length);
        if (comments.length > 0) dispatchRef.current({ type: 'SET_COMMENTS', payload: comments });
      })
      .catch(() => {});

    // REAL-TIME subscription (no polling - prevents quota exhaustion)
    console.log('[GAME] Starting subscription');
    const unsub = subscribeToManagers((cloudManagers) => {
      const managers = cloudManagers as unknown as Manager[];
      console.log('[GAME] Subscription:', managers.length, 'managers');
      dispatchRef.current({ type: 'SET_MANAGERS', payload: managers });
    });

    const unsubSettings = subscribeToSettingsAndResults((data) => {
      if (data?.settings) dispatchRef.current({ type: 'SET_SETTINGS', payload: migrateSettings(data.settings as Record<string, unknown>) });
      if (data?.results) dispatchRef.current({ type: 'SET_RESULTS', payload: data.results as TournamentResults });
    });

    const unsubWagers = subscribeToWagers((cloudWagers) => {
      const wagers = cloudWagers as unknown as Wager[];
      console.log('[GAME] Wagers subscription:', wagers.length);
      dispatchRef.current({ type: 'SET_WAGERS', payload: wagers });
    });

    const unsubComments = subscribeToComments((cloudComments) => {
      const comments = cloudComments as unknown as WagerComment[];
      console.log('[GAME] Comments subscription:', comments.length);
      dispatchRef.current({ type: 'SET_COMMENTS', payload: comments });
    });

    // Reload from cloud when tab becomes visible (user switches back to this tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        console.log('[GAME] Tab visible, reloading from cloud');
        loadAllManagers()
          .then((cloudManagers) => {
            const managers = cloudManagers as unknown as Manager[];
            dispatchRef.current({ type: 'SET_MANAGERS', payload: managers });
          })
          .catch(() => {});
        loadAllWagers()
          .then((cloudWagers) => {
            const wagers = cloudWagers as unknown as Wager[];
            dispatchRef.current({ type: 'SET_WAGERS', payload: wagers });
          })
          .catch(() => {});
        loadAllComments()
          .then((cloudComments) => {
            const comments = cloudComments as unknown as WagerComment[];
            dispatchRef.current({ type: 'SET_COMMENTS', payload: comments });
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => { unsub(); unsubSettings(); unsubWagers(); unsubComments(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  useEffect(() => { saveUserToLocal(state.currentUser); }, [state.currentUser]);

  // Auto-save all state to localStorage whenever it changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveStateToLocal(state);
    }, 500); // debounce 500ms
    return () => clearTimeout(timeout);
  }, [state.managers, state.settings, state.results, state.wagers, state.comments]);

  // ========================================================================
  // ACTIONS
  // ========================================================================
  const setUser = useCallback((name: string | null) => { dispatch({ type: 'SET_USER', payload: name }); }, []);

  const addManager = useCallback(async (name: string, teamName?: string, realName?: string, pincode?: string): Promise<Manager> => {
    const id = 'mgr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const manager: Manager = { id, name, teamName: teamName || name, realName: realName || '', code: '', pincode: pincode || '', teamCodes: [], submittedAt: null, topScorerGuess: null, paid: false, active: true, warnings: 0 };
    dispatch({ type: 'ADD_MANAGER', payload: manager });
    if (isConfigured()) {
      try { await saveManager(manager as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Save failed:', err); }
    }
    return manager;
  }, []);

  const removeManager = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_MANAGER', payload: id });
    if (isConfigured()) deleteManagerCloud(id).catch(() => {});
  }, []);

  const submitTeams = useCallback(async (managerId: string, teamCodes: string[]) => {
    dispatch({ type: 'SET_MANAGER_TEAMS', payload: { id: managerId, teamCodes } });
    if (isConfigured()) {
      const mgr = state.managers.find(m => m.id === managerId);
      if (mgr) {
        try { await saveManager({ ...mgr, teamCodes, submittedAt: new Date().toISOString() } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Save failed:', err); }
      }
    }
  }, [state.managers]);

  const submitTopScorer = useCallback(async (managerId: string, guess: TopScorerGuess) => {
    dispatch({ type: 'SET_MANAGER_TOP_SCORER', payload: { id: managerId, guess } });
    if (isConfigured()) {
      const mgr = state.managers.find(m => m.id === managerId);
      if (mgr) {
        try { await saveManager({ ...mgr, topScorerGuess: guess } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Save failed:', err); }
      }
    }
  }, [state.managers]);

  const setManagerPaid = useCallback((managerId: string, paid: boolean) => {
    dispatch({ type: 'SET_MANAGER_PAID', payload: { id: managerId, paid } });
    if (isConfigured()) {
      const mgr = state.managers.find(m => m.id === managerId);
      if (mgr) saveManager({ ...mgr, paid } as unknown as Record<string, unknown>).catch(() => {});
    }
  }, [state.managers]);

  const setManagerActive = useCallback((managerId: string, active: boolean) => {
    dispatch({ type: 'SET_MANAGER_ACTIVE', payload: { id: managerId, active } });
    if (isConfigured()) {
      const mgr = state.managers.find(m => m.id === managerId);
      if (mgr) saveManager({ ...mgr, active } as unknown as Record<string, unknown>).catch(() => {});
    }
  }, [state.managers]);

  const warnManager = useCallback((managerId: string) => {
    dispatch({ type: 'WARN_MANAGER', payload: managerId });
    if (isConfigured()) {
      const mgr = state.managers.find(m => m.id === managerId);
      if (mgr) saveManager({ ...mgr, warnings: (mgr.warnings || 0) + 1 } as unknown as Record<string, unknown>).catch(() => {});
    }
  }, [state.managers]);

  const resetManagerCode = useCallback((managerId: string) => {
    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    dispatch({ type: 'RESET_MANAGER_CODE', payload: { id: managerId, code: newCode } });
    return newCode;
  }, []);

  const updateTier = useCallback((teamCode: string, tier: Tier) => { dispatch({ type: 'UPDATE_TIER', payload: { teamCode, tier } }); }, []);
  const updateResult = useCallback((teamCode: string, result: Partial<TournamentResults[string]>) => { dispatch({ type: 'UPDATE_RESULT', payload: { teamCode, result } }); }, []);
  const lockDraft = useCallback(() => {
    dispatch({ type: 'LOCK_DRAFT' });
    // Explicit save to ensure draftLocked is persisted
    const updated = { ...stateRef.current.settings, draftLocked: true, submissionsOpen: false };
    saveSettings(updated);
  }, []);

  const unlockDraft = useCallback(() => {
    dispatch({ type: 'UNLOCK_DRAFT' });
    const updated = { ...stateRef.current.settings, draftLocked: false, submissionsOpen: true };
    saveSettings(updated);
  }, []);

  const loadFromCloud = useCallback(async (): Promise<number> => {
    if (!isConfigured()) return 0;
    try {
      const cloudManagers = await loadAllManagers();
      const managers = cloudManagers as unknown as Manager[];
      dispatchRef.current({ type: 'SET_MANAGERS', payload: managers });
      const data = await loadSettingsAndResults();
      if (data?.settings) dispatchRef.current({ type: 'SET_SETTINGS', payload: migrateSettings(data.settings as Record<string, unknown>) });
      if (data?.results) dispatchRef.current({ type: 'SET_RESULTS', payload: data.results as TournamentResults });
      return managers.length;
    } catch (err) { console.error('[GAME] Load failed:', err); return 0; }
  }, []);

  const forceSync = useCallback(async () => {
    if (!isConfigured()) return;
    await syncAllToCloud(state.managers as unknown as Record<string, unknown>[], state.settings, state.results);
  }, [state.managers, state.settings, state.results]);

  const saveSettings = useCallback(async (settings: AppSettings) => {
    dispatch({ type: 'SET_SETTINGS', payload: settings });
    if (isConfigured()) {
      try {
        const { saveSettings: cloudSaveSettings } = await import('@/lib/firebase');
        await cloudSaveSettings(settings);
        console.log('[CLOUD] Settings saved');
      } catch (err) { console.error('[CLOUD] Settings save failed:', err); }
    }
  }, []);

  const saveResults = useCallback(async (results: TournamentResults) => {
    dispatch({ type: 'SET_RESULTS', payload: results });
    if (isConfigured()) {
      try {
        const { saveResults: cloudSaveResults } = await import('@/lib/firebase');
        await cloudSaveResults(results);
        console.log('[CLOUD] Results saved');
      } catch (err) { console.error('[CLOUD] Results save failed:', err); }
    }
  }, []);

  // Degen Den wager implementations — Beer Mug Wager Flow
  // Flow: pending_acceptance (24h expiry) → live → resolved/cancelled/rejected
  const createWager = useCallback(async (proposerId: string, proposerName: string, acceptorId: string, acceptorName: string, description: string, stakeType: 'even' | 'custom', proposerMugs: number, acceptorMugs: number): Promise<Wager> => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24h expiry
    const wager: Wager = {
      id: 'wager_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      proposerId, proposerName, acceptorId, acceptorName,
      description, stakeType, proposerMugs, acceptorMugs,
      status: 'pending_acceptance',
      proposerConfirmed: true, acceptorConfirmed: false,
      proposedAt: now.toISOString(), acceptedAt: null,
      expiryDeadline: expiry.toISOString(),
      winnerId: null, resolvedAt: null, rejectedReason: null,
      commentsLocked: false,
    };
    dispatch({ type: 'ADD_WAGER', payload: wager });
    if (isConfigured()) {
      try { await saveWager(wager as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager save failed:', err); }
    }
    console.log('[DEGEN] Created wager:', wager.id);
    return wager;
  }, []);

  const acceptWager = useCallback(async (wagerId: string) => {
    const now = new Date();
    dispatch({ type: 'ACCEPT_WAGER', payload: wagerId });
    if (isConfigured()) {
      const w = stateRef.current.wagers.find(x => x.id === wagerId);
      if (w) {
        try { await saveWager({ ...w, acceptorConfirmed: true, acceptedAt: now.toISOString(), status: 'live' } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager accept save failed:', err); }
      }
    }
    console.log('[DEGEN] Acceptor confirmed, wager is now live:', wagerId);
  }, []);

  const resolveWager = useCallback(async (wagerId: string, winnerId: string | null) => {
    dispatch({ type: 'RESOLVE_WAGER', payload: { wagerId, winnerId } });
    if (isConfigured()) {
      const w = stateRef.current.wagers.find(x => x.id === wagerId);
      if (w) {
        try { await saveWager({ ...w, winnerId, status: 'resolved', resolvedAt: new Date().toISOString() } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager resolve save failed:', err); }
      }
    }
    console.log('[DEGEN] Wager resolved:', wagerId, winnerId);
  }, []);

  const cancelWager = useCallback(async (wagerId: string) => {
    dispatch({ type: 'CANCEL_WAGER', payload: wagerId });
    if (isConfigured()) {
      const w = stateRef.current.wagers.find(x => x.id === wagerId);
      if (w) {
        try { await saveWager({ ...w, status: 'cancelled' as const } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager cancel save failed:', err); }
      }
    }
    console.log('[DEGEN] Wager cancelled:', wagerId);
  }, []);

  const deleteWager = useCallback(async (wagerId: string) => {
    dispatch({ type: 'DELETE_WAGER', payload: wagerId });
    if (isConfigured()) {
      try {
        const { deleteWager: cloudDelete } = await import('@/lib/firebase');
        await cloudDelete(wagerId);
      } catch (err) { console.error('[CLOUD] Wager delete failed:', err); }
    }
    console.log('[DEGEN] Wager deleted:', wagerId);
  }, []);

  const toggleWagerComments = useCallback(async (wagerId: string) => {
    dispatch({ type: 'TOGGLE_WAGER_COMMENTS', payload: wagerId });
    if (isConfigured()) {
      const w = stateRef.current.wagers.find(x => x.id === wagerId);
      if (w) {
        try { await saveWager({ ...w, commentsLocked: !w.commentsLocked } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Comments toggle save failed:', err); }
      }
    }
  }, []);

  // Degen Den comment implementations
  const addComment = useCallback(async (wagerId: string, managerId: string, managerName: string, message: string) => {
    const comment: WagerComment = {
      id: 'cmt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      wagerId, managerId, managerName, message,
      postedAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_COMMENT', payload: comment });
    if (isConfigured()) {
      try {
        const { saveComment } = await import('@/lib/firebase');
        await saveComment(comment as unknown as Record<string, unknown>);
      } catch (err) { console.error('[CLOUD] Comment save failed:', err); }
    }
    console.log('[DEGEN] Comment added:', comment.id);
  }, []);

  const getCommentsForWager = useCallback((wagerId: string) => {
    return (state.comments || []).filter(c => c.wagerId === wagerId);
  }, [state.comments]);

  const getWager = useCallback((wagerId: string) => state.wagers.find(w => w.id === wagerId), [state.wagers]);

  const loadSeedData = useCallback(() => {
    SEED_WAGERS.forEach(w => dispatchRef.current({ type: 'ADD_WAGER', payload: w }));
    SEED_COMMENTS.forEach(c => dispatchRef.current({ type: 'ADD_COMMENT', payload: c }));
    console.log('[DEGEN] Seed data loaded:', SEED_WAGERS.length, 'wagers,', SEED_COMMENTS.length, 'comments');
  }, []);

  const toggleCommentsLock = useCallback(async () => {
    const newVal = !state.settings.commentsLocked;
    const newSettings = { ...state.settings, commentsLocked: newVal };
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    if (isConfigured()) {
      try { await saveSettings(newSettings); } catch (err) { console.error('[CLOUD] Settings save failed:', err); }
    }
  }, [state.settings, dispatch]);

  const getManager = useCallback((name: string) => state.managers.find(m => m.name === name), [state.managers]);
  const getManagerByNameAndPin = useCallback((name: string, pin: string) => state.managers.find(m => m.name === name && m.pincode === pin), [state.managers]);

  const getTeamsForManager = useCallback((managerId: string) => {
    const manager = state.managers.find(m => m.id === managerId);
    if (!manager) return [];
    const allTeams = getAllTeams(state.settings.tiers);
    return manager.teamCodes.map(code => {
      const team = allTeams.find(t => t.code === code);
      const result = state.results[code];
      let points = 0;
      if (result) {
        const sc = state.settings.scoring;
        if (result.groupPosition === 1) points += sc.groupFirst;
        else if (result.groupPosition === 2) points += sc.groupSecond;
        else if (result.groupPosition === 3 && result.reachedKnockout) points += sc.groupThirdQualify;
        else if (result.groupPosition === 4) points += sc.groupFourth;
        if (result.reachedRoundOf16) points += sc.roundOf16;
        if (result.reachedQuarterFinal) points += sc.quarterFinal;
        if (result.reachedSemiFinal) points += sc.semiFinal;
        if (result.reachedFinal) points += sc.reachFinal;
        if (result.wonWorldCup) points += sc.winWorldCup;
        if (result.wonThirdPlace) points += sc.winThirdPlace;
      }
      return { code, name: team?.name || code, flag: team?.flag || code, tier: team?.tier || 'underdog', points };
    });
  }, [state.managers, state.results, state.settings]);

  const getUsedTeams = useCallback(() => {
    if (!state.settings.draftMode) return [];
    const used: string[] = [];
    state.managers.forEach(m => used.push(...m.teamCodes));
    return used;
  }, [state.managers, state.settings.draftMode]);

  const getScoreForManager = useCallback((managerId: string) => {
    const manager = state.managers.find(m => m.id === managerId);
    const teams = getTeamsForManager(managerId);
    let total = teams.reduce((sum, t) => sum + t.points, 0);
    const teamsAlive = teams.filter(t => { const r = state.results[t.code]; return r && !r.eliminated; }).length;
    const semiFinalists = teams.filter(t => { const r = state.results[t.code]; return r && r.reachedSemiFinal; }).length;
    const finalists = teams.filter(t => { const r = state.results[t.code]; return r && r.reachedFinal; }).length;
    const hasChampion = teams.some(t => { const r = state.results[t.code]; return r && r.wonWorldCup; });
    let topScorerCorrect = false;
    if (manager?.topScorerGuess && state.settings.topScorerActual) {
      if (manager.topScorerGuess.name.toLowerCase().trim() === state.settings.topScorerActual.name.toLowerCase().trim()) {
        total += state.settings.scoring.topScorerBonus; topScorerCorrect = true;
      }
    }
    return { total, teamsAlive, semiFinalists, finalists, hasChampion, topScorerCorrect };
  }, [state.managers, state.results, state.settings, getTeamsForManager]);

  const getPayouts = useCallback(() => {
    const paidManagers = state.managers.filter(m => m.paid);
    const totalPot = paidManagers.length * state.settings.payout.buyIn;
    const first = Math.round(totalPot * (state.settings.payout.firstPlacePercent / 100));
    const second = Math.round(totalPot * (state.settings.payout.secondPlacePercent / 100));
    const third = Math.round(totalPot * (state.settings.payout.thirdPlacePercent / 100));
    return { totalPot, first, second, third, currency: state.settings.payout.currency };
  }, [state.managers, state.settings.payout]);

  return (
    <GameContext.Provider value={{
      state, dispatch, firebaseEnabled, setUser, addManager, removeManager, submitTeams,
      submitTopScorer, setManagerPaid, setManagerActive, warnManager, resetManagerCode, updateTier, updateResult,
      lockDraft, unlockDraft, forceSync, loadFromCloud, saveSettings, saveResults,
      createWager, acceptWager, resolveWager, cancelWager, deleteWager, toggleWagerComments, getWager,
      addComment, getCommentsForWager, loadSeedData, toggleCommentsLock,
      getManager, getManagerByNameAndPin, getTeamsForManager,
      getUsedTeams, getScoreForManager, getPayouts,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
