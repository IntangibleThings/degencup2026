import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type { Tier, AppSettings, Manager, TournamentResults, TopScorerGuess, Wager } from '@/data/tournament';
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
}

const initialState: AppState = {
  currentUser: null,
  managers: [],
  settings: { ...DEFAULT_SETTINGS },
  results: {},
  wagers: [],
};

function migrateSettings(parsed: Record<string, unknown>): AppSettings {
  const s = parsed as unknown as AppSettings;
  return {
    ...s,
    payout: s.payout || DEFAULT_SETTINGS.payout,
    topScorerActual: s.topScorerActual || null,
    scoring: s.scoring || DEFAULT_SETTINGS.scoring,
    hidePicksUntil: s.hidePicksUntil || DEFAULT_SETTINGS.hidePicksUntil,
  };
}

function loadUserFromLocal(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}

function saveUserToLocal(name: string | null) {
  try { if (name) localStorage.setItem(USER_KEY, name); else localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
}

type Action =
  | { type: 'SET_MANAGERS'; payload: Manager[] }
  | { type: 'SET_USER'; payload: string | null }
  | { type: 'ADD_MANAGER'; payload: Manager }
  | { type: 'REMOVE_MANAGER'; payload: string }
  | { type: 'SET_MANAGER_TEAMS'; payload: { id: string; teamCodes: string[] } }
  | { type: 'SET_MANAGER_TOP_SCORER'; payload: { id: string; guess: TopScorerGuess } }
  | { type: 'SET_MANAGER_PAID'; payload: { id: string; paid: boolean } }
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
  // Degen Den wager actions
  | { type: 'ADD_WAGER'; payload: Wager }
  | { type: 'CONFIRM_WAGER'; payload: { wagerId: string; participant: 'proposer' | 'acceptor' } }
  | { type: 'RESOLVE_WAGER'; payload: { wagerId: string; winnerId: string | null } }
  | { type: 'CANCEL_WAGER'; payload: string }
  | { type: 'MARK_ESCROW'; payload: string };

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
    case 'ADD_WAGER':
      return { ...state, wagers: [...state.wagers, action.payload] };
    case 'CONFIRM_WAGER': {
      return {
        ...state,
        wagers: state.wagers.map(w => {
          if (w.id !== action.payload.wagerId) return w;
          // acceptor confirms with their pincode -> wager becomes accepted (proposer already confirmed)
          const updates: Partial<Wager> = { acceptorConfirmed: true, acceptedAt: new Date().toISOString(), status: 'accepted' as const };
          return { ...w, ...updates };
        }),
      };
    }
    case 'RESOLVE_WAGER': {
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload.wagerId
            ? { ...w, winnerId: action.payload.winnerId, status: 'resolved', resolvedAt: new Date().toISOString() }
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
    case 'MARK_ESCROW': {
      return {
        ...state,
        wagers: state.wagers.map(w =>
          w.id === action.payload ? { ...w, escrowPaid: true } : w
        ),
      };
    }
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
  // Degen Den wager methods
  createWager: (proposerId: string, proposerName: string, acceptorId: string, acceptorName: string, description: string, stakeType: 'even' | 'custom', proposerStake: number, acceptorStake: number) => Promise<Wager>;
  confirmWager: (wagerId: string) => Promise<void>;
  resolveWager: (wagerId: string, winnerId: string | null) => Promise<void>;
  cancelWager: (wagerId: string) => Promise<void>;
  markEscrowPaid: (wagerId: string) => Promise<void>;
  getWager: (wagerId: string) => Wager | undefined;
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

    if (!isConfigured()) {
      console.log('[GAME] Firebase NOT configured');
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
        if (wagers.length > 0) {
          dispatchRef.current({ type: 'SET_MANAGERS', payload: stateRef.current.managers });
          wagers.forEach(w => dispatchRef.current({ type: 'ADD_WAGER', payload: w }));
        }
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
      dispatchRef.current({ type: 'SET_MANAGERS', payload: stateRef.current.managers });
      wagers.forEach(w => dispatchRef.current({ type: 'ADD_WAGER', payload: w }));
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
            dispatchRef.current({ type: 'SET_MANAGERS', payload: stateRef.current.managers });
            wagers.forEach(w => dispatchRef.current({ type: 'ADD_WAGER', payload: w }));
          })
          .catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => { unsub(); unsubSettings(); unsubWagers(); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);

  useEffect(() => { saveUserToLocal(state.currentUser); }, [state.currentUser]);

  // ========================================================================
  // ACTIONS
  // ========================================================================
  const setUser = useCallback((name: string | null) => { dispatch({ type: 'SET_USER', payload: name }); }, []);

  const addManager = useCallback(async (name: string, teamName?: string, realName?: string, pincode?: string): Promise<Manager> => {
    const id = 'mgr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const manager: Manager = { id, name, teamName: teamName || name, realName: realName || '', code: '', pincode: pincode || '', teamCodes: [], submittedAt: null, topScorerGuess: null, paid: false, warnings: 0 };
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
  const lockDraft = useCallback(() => { dispatch({ type: 'LOCK_DRAFT' }); }, []);
  const unlockDraft = useCallback(() => { dispatch({ type: 'UNLOCK_DRAFT' }); }, []);

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

  // Degen Den wager implementations
  // NEW FLOW: Proposer creates freely (auto-confirmed). Acceptor logs in later and confirms with their own pincode.
  const createWager = useCallback(async (proposerId: string, proposerName: string, acceptorId: string, acceptorName: string, description: string, stakeType: 'even' | 'custom', proposerStake: number, acceptorStake: number): Promise<Wager> => {
    const wager: Wager = {
      id: 'wager_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      proposerId, proposerName, acceptorId, acceptorName,
      description, stakeType, proposerStake, acceptorStake, status: 'pending',
      proposerConfirmed: true, // creator implicitly confirms by creating
      acceptorConfirmed: false, // acceptor must log in and confirm with their pincode
      proposedAt: new Date().toISOString(), acceptedAt: null,
      winnerId: null, escrowPaid: false, resolvedAt: null,
    };
    dispatch({ type: 'ADD_WAGER', payload: wager });
    if (isConfigured()) {
      try { await saveWager(wager as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager save failed:', err); }
    }
    console.log('[DEGEN] Created wager (proposer auto-confirmed):', wager.id);
    return wager;
  }, []);

  const confirmWager = useCallback(async (wagerId: string) => {
    dispatch({ type: 'CONFIRM_WAGER', payload: { wagerId, participant: 'acceptor' } });
    if (isConfigured()) {
      const w = stateRef.current.wagers.find(x => x.id === wagerId);
      if (w) {
        const updates: Partial<Wager> = { acceptorConfirmed: true, acceptedAt: new Date().toISOString(), status: 'accepted' as const };
        try { await saveWager({ ...w, ...updates } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager confirm save failed:', err); }
      }
    }
    console.log('[DEGEN] Acceptor confirmed wager:', wagerId);
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

  const markEscrowPaid = useCallback(async (wagerId: string) => {
    dispatch({ type: 'MARK_ESCROW', payload: wagerId });
    if (isConfigured()) {
      const w = stateRef.current.wagers.find(x => x.id === wagerId);
      if (w) {
        try { await saveWager({ ...w, escrowPaid: true } as unknown as Record<string, unknown>); } catch (err) { console.error('[CLOUD] Wager escrow save failed:', err); }
      }
    }
    console.log('[DEGEN] Escrow marked:', wagerId);
  }, []);

  const getWager = useCallback((wagerId: string) => state.wagers.find(w => w.id === wagerId), [state.wagers]);

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
      submitTopScorer, setManagerPaid, warnManager, resetManagerCode, updateTier, updateResult,
      lockDraft, unlockDraft, forceSync, loadFromCloud, saveSettings, saveResults,
      createWager, confirmWager, resolveWager, cancelWager, markEscrowPaid, getWager,
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
