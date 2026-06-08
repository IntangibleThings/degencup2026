import React, { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { Tier, AppSettings, Manager, TournamentResults, TopScorerGuess } from '@/data/tournament';
import { DEFAULT_SETTINGS, getAllTeams } from '@/data/tournament';

const STORAGE_KEY = 'vibecup_draft_2026';

export interface AppState {
  currentUser: string | null;
  managers: Manager[];
  settings: AppSettings;
  results: TournamentResults;
}

const initialState: AppState = {
  currentUser: null,
  managers: [],
  settings: { ...DEFAULT_SETTINGS },
  results: {},
};

function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Ensure paid field exists on old data
      if (parsed.managers) {
        parsed.managers = parsed.managers.map((m: Manager) => ({
          ...m,
          paid: m.paid !== undefined ? m.paid : true,
          topScorerGuess: m.topScorerGuess || null,
        }));
      }
      // Ensure payout and topScorerActual exist
      if (parsed.settings) {
        parsed.settings.payout = parsed.settings.payout || DEFAULT_SETTINGS.payout;
        parsed.settings.topScorerActual = parsed.settings.topScorerActual || null;
        parsed.settings.scoring = parsed.settings.scoring || DEFAULT_SETTINGS.scoring;
        if (parsed.settings.scoring.topScorerBonus === undefined) {
          parsed.settings.scoring.topScorerBonus = 5;
        }
      }
      return { ...initialState, ...parsed };
    }
  } catch { /* ignore */ }
  return initialState;
}

function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

type Action =
  | { type: 'SET_USER'; payload: string | null }
  | { type: 'ADD_MANAGER'; payload: Manager }
  | { type: 'REMOVE_MANAGER'; payload: string }
  | { type: 'SET_MANAGER_TEAMS'; payload: { id: string; teamCodes: string[] } }
  | { type: 'SET_MANAGER_TOP_SCORER'; payload: { id: string; guess: TopScorerGuess } }
  | { type: 'SET_MANAGER_PAID'; payload: { id: string; paid: boolean } }
  | { type: 'WARN_MANAGER'; payload: string }
  | { type: 'SET_SETTINGS'; payload: AppSettings }
  | { type: 'UPDATE_TIER'; payload: { teamCode: string; tier: Tier } }
  | { type: 'SET_RESULTS'; payload: TournamentResults }
  | { type: 'UPDATE_RESULT'; payload: { teamCode: string; result: Partial<TournamentResults[string]> } }
  | { type: 'LOCK_DRAFT' }
  | { type: 'UNLOCK_DRAFT' }
  | { type: 'TOGGLE_DRAFT_MODE' }
  | { type: 'RESET_ALL' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.payload };
    case 'ADD_MANAGER': {
      const exists = state.managers.find(m => m.name === action.payload.name);
      if (exists) return state;
      return { ...state, managers: [...state.managers, action.payload] };
    }
    case 'REMOVE_MANAGER':
      return { ...state, managers: state.managers.filter(m => m.id !== action.payload) };
    case 'SET_MANAGER_TEAMS': {
      return {
        ...state,
        managers: state.managers.map(m =>
          m.id === action.payload.id ? { ...m, teamCodes: action.payload.teamCodes, submittedAt: new Date().toISOString() } : m
        ),
      };
    }
    case 'SET_MANAGER_TOP_SCORER': {
      return {
        ...state,
        managers: state.managers.map(m =>
          m.id === action.payload.id ? { ...m, topScorerGuess: action.payload.guess } : m
        ),
      };
    }
    case 'SET_MANAGER_PAID': {
      return {
        ...state,
        managers: state.managers.map(m =>
          m.id === action.payload.id ? { ...m, paid: action.payload.paid } : m
        ),
      };
    }
    case 'WARN_MANAGER': {
      return {
        ...state,
        managers: state.managers.map(m =>
          m.id === action.payload ? { ...m, warnings: (m.warnings || 0) + 1 } : m
        ),
      };
    }
    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };
    case 'UPDATE_TIER': {
      const newTiers = { ...state.settings.tiers, [action.payload.teamCode]: action.payload.tier };
      return { ...state, settings: { ...state.settings, tiers: newTiers } };
    }
    case 'SET_RESULTS':
      return { ...state, results: action.payload };
    case 'UPDATE_RESULT': {
      return {
        ...state,
        results: {
          ...state.results,
          [action.payload.teamCode]: { ...state.results[action.payload.teamCode], ...action.payload.result } as TournamentResults[string],
        },
      };
    }
    case 'LOCK_DRAFT':
      return { ...state, settings: { ...state.settings, draftLocked: true, submissionsOpen: false } };
    case 'UNLOCK_DRAFT':
      return { ...state, settings: { ...state.settings, draftLocked: false, submissionsOpen: true } };
    case 'TOGGLE_DRAFT_MODE':
      return { ...state, settings: { ...state.settings, draftMode: !state.settings.draftMode } };
    case 'RESET_ALL':
      return { ...initialState };
    default:
      return state;
  }
}

interface GameContextType {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  setUser: (name: string | null) => void;
  addManager: (name: string, teamName?: string, realName?: string) => void;
  removeManager: (id: string) => void;
  submitTeams: (managerId: string, teamCodes: string[]) => void;
  submitTopScorer: (managerId: string, guess: TopScorerGuess) => void;
  setManagerPaid: (managerId: string, paid: boolean) => void;
  warnManager: (managerId: string) => void;
  updateTier: (teamCode: string, tier: Tier) => void;
  updateResult: (teamCode: string, result: Partial<TournamentResults[string]>) => void;
  lockDraft: () => void;
  unlockDraft: () => void;
  getManager: (name: string) => Manager | undefined;
  getTeamsForManager: (managerId: string) => { code: string; name: string; flag: string; tier: Tier; points: number }[];
  getUsedTeams: () => string[];
  getScoreForManager: (managerId: string) => { total: number; teamsAlive: number; semiFinalists: number; finalists: number; hasChampion: boolean; topScorerCorrect: boolean };
  getPayouts: () => { totalPot: number; first: number; second: number; third: number; currency: string };
}

const GameContext = createContext<GameContextType | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const setUser = useCallback((name: string | null) => {
    dispatch({ type: 'SET_USER', payload: name });
  }, []);

  const addManager = useCallback((name: string, teamName?: string, realName?: string) => {
    const id = 'mgr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    dispatch({ type: 'ADD_MANAGER', payload: { id, name, teamName: teamName || name, realName: realName || '', teamCodes: [], submittedAt: null, topScorerGuess: null, paid: false, warnings: 0 } });
  }, []);

  const removeManager = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_MANAGER', payload: id });
  }, []);

  const submitTeams = useCallback((managerId: string, teamCodes: string[]) => {
    dispatch({ type: 'SET_MANAGER_TEAMS', payload: { id: managerId, teamCodes } });
  }, []);

  const submitTopScorer = useCallback((managerId: string, guess: TopScorerGuess) => {
    dispatch({ type: 'SET_MANAGER_TOP_SCORER', payload: { id: managerId, guess } });
  }, []);

  const setManagerPaid = useCallback((managerId: string, paid: boolean) => {
    dispatch({ type: 'SET_MANAGER_PAID', payload: { id: managerId, paid } });
  }, []);

  const warnManager = useCallback((managerId: string) => {
    dispatch({ type: 'WARN_MANAGER', payload: managerId });
  }, []);

  const updateTier = useCallback((teamCode: string, tier: Tier) => {
    dispatch({ type: 'UPDATE_TIER', payload: { teamCode, tier } });
  }, []);

  const updateResult = useCallback((teamCode: string, result: Partial<TournamentResults[string]>) => {
    dispatch({ type: 'UPDATE_RESULT', payload: { teamCode, result } });
  }, []);

  const lockDraft = useCallback(() => {
    dispatch({ type: 'LOCK_DRAFT' });
  }, []);

  const unlockDraft = useCallback(() => {
    dispatch({ type: 'UNLOCK_DRAFT' });
  }, []);

  const getManager = useCallback((name: string) => {
    return state.managers.find(m => m.name === name);
  }, [state.managers]);

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
  }, [state.managers, state.results, state.settings.tiers, state.settings.scoring]);

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
    const teamsAlive = teams.filter(t => {
      const r = state.results[t.code];
      return r && !r.eliminated;
    }).length;
    const semiFinalists = teams.filter(t => {
      const r = state.results[t.code];
      return r && r.reachedSemiFinal;
    }).length;
    const finalists = teams.filter(t => {
      const r = state.results[t.code];
      return r && r.reachedFinal;
    }).length;
    const hasChampion = teams.some(t => {
      const r = state.results[t.code];
      return r && r.wonWorldCup;
    });
    // Top scorer bonus
    let topScorerCorrect = false;
    if (manager && manager.topScorerGuess && state.settings.topScorerActual) {
      const guessName = manager.topScorerGuess.name.toLowerCase().trim();
      const actualName = state.settings.topScorerActual.name.toLowerCase().trim();
      if (guessName === actualName) {
        total += state.settings.scoring.topScorerBonus;
        topScorerCorrect = true;
      }
    }
    return { total, teamsAlive, semiFinalists, finalists, hasChampion, topScorerCorrect };
  }, [state.managers, state.results, state.settings, getTeamsForManager]);

  const getPayouts = useCallback(() => {
    const paidManagers = state.managers.filter(m => m.paid);
    const numPlayers = paidManagers.length;
    const totalPot = numPlayers * state.settings.payout.buyIn;
    const first = Math.round(totalPot * (state.settings.payout.firstPlacePercent / 100));
    const second = Math.round(totalPot * (state.settings.payout.secondPlacePercent / 100));
    const third = Math.round(totalPot * (state.settings.payout.thirdPlacePercent / 100));
    return { totalPot, first, second, third, currency: state.settings.payout.currency };
  }, [state.managers, state.settings.payout]);

  return (
    <GameContext.Provider value={{
      state, dispatch, setUser, addManager, removeManager, submitTeams,
      submitTopScorer, setManagerPaid, warnManager, updateTier, updateResult,
      lockDraft, unlockDraft, getManager, getTeamsForManager,
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
