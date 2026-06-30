import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { getAllTeams, TEAM_FLAGS, TEAM_NAMES, KNOWN_PLAYERS, DEFAULT_SETTINGS } from '@/data/tournament';
import type { Tier, Wager } from '@/data/tournament';
import { parseRawScores, mapTeamName } from '@/data/firecrawl';
import { getStoredToken as getFDToken, storeToken as storeFDToken, fetchWorldCupMatches } from '@/data/footballdata';
import { generateResultsPreviewFromMatrix, deriveResultsFromMatrix } from '@/data/resultsEngine';
import { parsePastedScoresToMatrix, getMatrix, getMatrixStats, isMatchScored, type MatrixMatch } from '@/data/matchMatrix';
import { generateBracketSuggestions, assignKnockoutTeam, seedKnockoutFromGroupResults, parseBracketSeed, applyBracketSeed, autoAdvanceKnockoutWinners, R32_IDS } from '@/data/bracketAdvancement';
import type { TournamentResults } from '@/data/tournament';
import type { ScrapedMatch } from '@/data/firecrawl';
import { Lock, Unlock, Trash2, Users, Settings, Trophy, AlertTriangle, UserX, MessageSquareWarning, RefreshCw, Wifi, WifiOff, Key, Check, X, Beer, Globe } from 'lucide-react';

const ADMIN_PASSWORD = 'Dansucks123!';
const ADMIN_AUTH_KEY = 'vibecup_admin_auth';

const STATUS_BG: Record<Wager['status'], string> = {
  pending_acceptance: 'rgba(200,128,255,0.2)',
  live: 'rgba(0,255,136,0.15)', resolved: 'rgba(231,111,81,0.2)',
  cancelled: 'rgba(100,100,100,0.2)', rejected: 'rgba(230,0,18,0.2)',
};
const STATUS_COLORS: Record<Wager['status'], string> = {
  pending_acceptance: '#c880ff', live: '#00ff88', resolved: '#e76f51',
  cancelled: '#777', rejected: '#e60012',
};

// Top Scorer Admin Component with Autocomplete
function TopScorerAdmin({ current, onSet, bonus }: {
  current: { name: string; country: string } | null;
  onSet: (name: string, country: string) => void;
  bonus: number;
}) {
  const [searchName, setSearchName] = useState('');
  const [searchCountry, setSearchCountry] = useState('');
  const [suggestions, setSuggestions] = useState<typeof KNOWN_PLAYERS>([]);

  const handleNameChange = (val: string) => {
    setSearchName(val);
    if (val.length >= 2) {
      const matches = KNOWN_PLAYERS.filter(p =>
        p.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 8);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  };

  const selectPlayer = (player: typeof KNOWN_PLAYERS[0]) => {
    setSearchName(player.name);
    setSearchCountry(player.country);
    setSuggestions([]);
  };

  return (
    <div className="retro-card p-4">
      <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#FFD700' }}>TOP SCORER (ACTUAL)</h3>
      <p className="font-pixel text-[7px] mb-2" style={{ color: '#8899AA' }}>
        Set the actual Golden Boot winner. Players who guessed correctly get +{bonus} bonus points.
      </p>
      {current && (
        <div className="mb-2 p-2" style={{ backgroundColor: 'rgba(0,170,0,0.1)' }}>
          <span className="font-pixel text-[8px]" style={{ color: '#00AA00' }}>
            CURRENT: {current.name} ({current.country})
          </span>
        </div>
      )}
      <div className="flex gap-2 relative">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchName}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="TYPE PLAYER NAME..."
            className="pixel-input w-full text-[10px] py-1 px-2"
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto"
              style={{ backgroundColor: 'rgba(12,18,30,0.98)', border: '2px solid #FFD700' }}>
              {suggestions.map((p, i) => (
                <button key={i} onClick={() => selectPlayer(p)}
                  className="w-full text-left px-2 py-1.5 flex items-center gap-2 hover:opacity-80"
                  style={{ borderBottom: '1px solid #2D3192' }}>
                  <span className="text-[10px]" style={{ color: '#E8E8E8' }}>{p.name}</span>
                  <span className="text-[8px]" style={{ color: '#FFD700' }}>{p.country}</span>
                  <span className="font-pixel text-[6px] px-1" style={{ backgroundColor: '#2D3192', color: '#AABBCC' }}>{p.position}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input type="text" value={searchCountry}
          onChange={e => setSearchCountry(e.target.value)}
          placeholder="COUNTRY"
          className="pixel-input w-32 text-[10px] py-1 px-2" />
        <button onClick={() => { if (searchName && searchCountry) onSet(searchName, searchCountry); }}
          className="pixel-btn gold small">SET</button>
      </div>
      <p className="font-pixel text-[6px] mt-1" style={{ color: '#AABBCC' }}>
        Start typing a player name for suggestions ({KNOWN_PLAYERS.length} players in database)
      </p>
    </div>
  );
}

const TIER_OPTIONS: { value: Tier; label: string; color: string }[] = [
  { value: 'favorite', label: 'FAV', color: '#FFD700' },
  { value: 'mid', label: 'MID', color: '#2D3192' },
  { value: 'underdog', label: 'DOG', color: '#8899AA' },
];

export default function AdminPage() {
  const { state, dispatch, lockDraft, unlockDraft, warnManager, setManagerActive, resetManagerCode, forceSync, addManager, loadFromCloud, firebaseEnabled, removeManager, saveSettings, saveResults, resolveWager, loadSeedData, deleteWager, toggleWagerComments } = useGame();

  // Auto-load from cloud on mount + check admin persistence
  useEffect(() => {
    // Check if admin was previously authenticated
    try {
      const saved = localStorage.getItem(ADMIN_AUTH_KEY);
      if (saved === '1') setAuthenticated(true);
    } catch { /* ignore */ }

    loadFromCloud().then(count => {
      if (count > 0) console.log('[ADMIN] Auto-loaded', count, 'managers from cloud');
    });
  }, []);

  // Listen for derive-and-apply events from KnockoutBracketManager
  useEffect(() => {
    const handler = (e: Event) => {
      const results = (e as CustomEvent).detail;
      if (results) {
        dispatch({ type: 'SET_RESULTS', payload: results });
        saveResults(results);
        localStorage.setItem('wc2026_derived_at', new Date().toISOString());
        setSyncStatus({ message: 'STANDINGS UPDATED FROM KNOCKOUT BRACKET', type: 'success' });
        setTimeout(() => setSyncStatus(null), 4000);
      }
    };
    window.addEventListener('deriveAndApplyResults', handler);
    return () => window.removeEventListener('deriveAndApplyResults', handler);
  }, [dispatch, saveResults]);

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'managers' | 'tiers' | 'results' | 'sync' | 'settings' | 'degen-den'>('managers');
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [showMatrixGrid, setShowMatrixGrid] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [message, setMessage] = useState('');
  const [editingWager, setEditingWager] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: '', proposerMugs: 1, acceptorMugs: 1 });
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [pastePreview, setPastePreview] = useState<ScrapedMatch[] | null>(null);
  const [fdToken, setFdToken] = useState(getFDToken() || '');
  const [fdResult, setFdResult] = useState<{ matches: number; errors: string[]; method?: string } | null>(null);
  const [isFdFetching, setIsFdFetching] = useState(false);

  // Results engine preview state
  const [derivedResults, setDerivedResults] = useState<TournamentResults | null>(null);
  const [derivedPreview, setDerivedPreview] = useState<{
    groupSummaries: { group: string; standings: { team: string; flag: string; pts: number; gd: number; pos: number }[] }[];
    knockoutSummary: { round: string; matches: string[] };
    teamsUpdated: number;
  } | null>(null);
  const [showResultsPreview, setShowResultsPreview] = useState(false);

  // Results form state
  const [resultForm, setResultForm] = useState<Record<string, {
    groupPosition: number; reachedKnockout: boolean; reachedRoundOf16: boolean;
    reachedQuarterFinal: boolean; reachedSemiFinal: boolean; reachedFinal: boolean;
    wonWorldCup: boolean; wonThirdPlace: boolean; eliminated: boolean;
  }>>({});

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      try { localStorage.setItem(ADMIN_AUTH_KEY, '1'); } catch { /* ignore */ }
      // Initialize resultForm from existing results
      const allTeams = getAllTeams(state.settings.tiers);
      const init: typeof resultForm = {};
      allTeams.forEach(t => {
        init[t.code] = state.results[t.code] || {
          groupPosition: 0, reachedKnockout: false, reachedRoundOf16: false,
          reachedQuarterFinal: false, reachedSemiFinal: false, reachedFinal: false,
          wonWorldCup: false, wonThirdPlace: false, eliminated: false,
        };
      });
      setResultForm(init);
    } else {
      setMessage('WRONG PASSWORD');
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const handleAddManager = async () => {
    if (!newManagerName.trim()) return;
    const nm = newManagerName.trim().toUpperCase();
    const newPin = Math.floor(1000 + Math.random() * 9000).toString();
    await addManager(nm, nm, '', newPin);
    setNewManagerName('');
    setMessage('MANAGER ADDED');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleRemoveManager = async (id: string) => {
    await removeManager(id); // Deletes from Firebase cloud + local state
    setMessage('MANAGER REMOVED');
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSetActive = (id: string, active: boolean) => {
    setManagerActive(id, active);
    setMessage(active ? 'MARKED ACTIVE' : 'MARKED INACTIVE');
    setTimeout(() => setMessage(''), 1500);
  };

  const handleWarnManager = (id: string) => {
    warnManager(id);
    setMessage('WARNING ISSUED');
    setTimeout(() => setMessage(''), 1500);
  };

  const handleFetchFootballData = async () => {
    setIsFdFetching(true);
    setFdResult(null);
    setDerivedResults(null);
    setDerivedPreview(null);
    setShowResultsPreview(false);

    const { matches, errors, method } = await fetchWorldCupMatches(fdToken || undefined);

    if (matches.length > 0) {
      // Fill fetched scores into the match matrix
      const { updateMatchScore } = await import('@/data/matchMatrix');
      let filled = 0;
      for (const m of matches) {
        if (m.homeGoals !== null && m.awayGoals !== null) {
          // Find match in matrix by team codes
          const matrix = getMatrix();
          const match = matrix.find(
            x => (x.homeTeam === m.homeTeam && x.awayTeam === m.awayTeam) ||
                 (x.homeTeam === m.awayTeam && x.awayTeam === m.homeTeam)
          );
          if (match && !isMatchScored(match.id)) {
            updateMatchScore(match.id, m.homeGoals, m.awayGoals);
            filled++;
          }
        }
      }

      // Derive results from the full matrix (cumulative)
      const preview = generateResultsPreviewFromMatrix();
      setDerivedResults(preview.results);
      setDerivedPreview({
        groupSummaries: preview.groupSummaries,
        knockoutSummary: preview.knockoutSummary,
        teamsUpdated: preview.teamsUpdated,
      });
      setShowResultsPreview(true);
      dispatch({ type: 'SET_RESULTS', payload: preview.results });
      await saveResults(preview.results);
      localStorage.setItem('wc2026_derived_at', new Date().toISOString());
      console.log(`[ADMIN] Fetched ${matches.length} matches, filled ${filled} new into matrix`);
    }

    setFdResult({ matches: matches.length, errors, method });
    setIsFdFetching(false);
  };

  const handleApplyDerivedResults = async () => {
    // Derive final results from the full matrix (belt and suspenders)
    const finalResults = deriveResultsFromMatrix();
    // Dispatch to React state (immediate standings update)
    dispatch({ type: 'SET_RESULTS', payload: finalResults });
    // Explicitly persist to localStorage + Firebase
    await saveResults(finalResults);
    // Save timestamp for Standings page display
    localStorage.setItem('wc2026_derived_at', new Date().toISOString());
    const stats = getMatrixStats();
    console.log('[ADMIN] Applied from matrix:', stats.scoredMatches, 'matches scored');
    setSyncStatus({ message: `APPLIED FROM ${stats.scoredMatches} MATRIX MATCHES`, type: 'success' });
    setShowResultsPreview(false);
    setDerivedResults(null);
    setDerivedPreview(null);
    setTimeout(() => setSyncStatus(null), 4000);
  };

  const handleDiscardDerivedResults = () => {
    setShowResultsPreview(false);
    setDerivedResults(null);
    setDerivedPreview(null);
  };

  const handleParsePastedScores = () => {
    const parsed = parseRawScores(pasteText);
    setPastePreview(parsed);
  };

  // ── MATCH MATRIX PASTE ──
  // New architecture: all 104 matches are pre-defined. Pasting fills in slots.
  // The matrix is cumulative — old scores persist, new scores fill empty slots.

  const handleApplyPastedScores = () => {
    if (!pasteText.trim()) return;

    // Parse pasted text and fill scores into the match matrix
    const result = parsePastedScoresToMatrix(pasteText);

    // Derive results from the ENTIRE matrix (all scored matches ever)
    const preview = generateResultsPreviewFromMatrix();
    setDerivedResults(preview.results);
    setDerivedPreview({
      groupSummaries: preview.groupSummaries,
      knockoutSummary: preview.knockoutSummary,
      teamsUpdated: preview.teamsUpdated,
    });
    setShowResultsPreview(true);

    setPastePreview([]); // Clear the legacy preview
    setPasteText('');

    const stats = getMatrixStats();
    const statusMsg = result.overwritten > 0
      ? `ADDED ${result.matched.length - result.overwritten} NEW + UPDATED ${result.overwritten} | ${stats.scoredMatches}/${stats.totalMatches} TOTAL FILLED`
      : `ADDED ${result.matched.length} NEW SCORES | ${stats.scoredMatches}/${stats.totalMatches} TOTAL FILLED`;
    setSyncStatus({ message: statusMsg, type: 'success' });
    setTimeout(() => setSyncStatus(null), 5000);
  };

  const handleSetTopScorerActual = async (name: string, country: string) => {
    const newSettings = { ...state.settings, topScorerActual: { name, country } };
    await saveSettings(newSettings);
    setSyncStatus({ message: 'TOP SCORER SAVED', type: 'success' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  // Degen Den inline editing
  const startEdit = (w: Wager) => {
    setEditingWager(w.id);
    setEditForm({ description: w.description, proposerMugs: w.proposerMugs, acceptorMugs: w.acceptorMugs });
  };

  const saveEdit = async (wagerId: string) => {
    const w = state.wagers.find(x => x.id === wagerId);
    if (w) {
      const updated = { ...w, description: editForm.description, proposerMugs: editForm.proposerMugs, acceptorMugs: editForm.acceptorMugs };
      dispatch({ type: 'SET_WAGERS', payload: state.wagers.map(x => x.id === wagerId ? updated : x) });
      const { saveWager } = await import('@/lib/firebase');
      await saveWager(updated as unknown as Record<string, unknown>);
    }
    setSavedFlash(wagerId);
    setTimeout(() => setSavedFlash(null), 2000);
    setEditingWager(null);
  };

  const cancelEdit = () => { setEditingWager(null); };

  const handleAdminResolve = async (wagerId: string) => {
    const w = state.wagers.find(x => x.id === wagerId);
    if (!w) return;
    const winner = prompt(`RESOLVE: Who won?\n1 = ${w.proposerName}\n2 = ${w.acceptorName}\n0 = Push/Void`);
    if (winner === '1') { await resolveWager(wagerId, w.proposerId); triggerSaveFlash(wagerId); }
    else if (winner === '2') { await resolveWager(wagerId, w.acceptorId); triggerSaveFlash(wagerId); }
    else if (winner === '0') { await resolveWager(wagerId, null); triggerSaveFlash(wagerId); }
  };

  const triggerSaveFlash = (wagerId: string) => {
    setSavedFlash(wagerId);
    setTimeout(() => setSavedFlash(null), 2000);
  };

  const handleUpdateResult = (code: string) => {
    const result = resultForm[code];
    if (!result) return;
    dispatch({ type: 'UPDATE_RESULT', payload: { teamCode: code, result } });
    setMessage(`UPDATED ${code}`);
    setTimeout(() => setMessage(''), 1500);
  };

  const handleUpdateTier = (code: string, tier: Tier) => {
    dispatch({ type: 'UPDATE_TIER', payload: { teamCode: code, tier } });
    setMessage(`${code} → ${tier.toUpperCase()}`);
    setTimeout(() => setMessage(''), 1500);
  };

  const handleUpdateScoring = async (key: string, value: number) => {
    const newScoring = { ...state.settings.scoring, [key]: value };
    const newSettings = { ...state.settings, scoring: newScoring };
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    await saveSettings(newSettings);
    setSyncStatus({ message: 'SCORING SAVED', type: 'success' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  const handleToggleDraftMode = async () => {
    const newSettings = { ...state.settings, draftMode: !state.settings.draftMode };
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    await saveSettings(newSettings);
    setSyncStatus({ message: 'DRAFT MODE SAVED', type: 'success' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  const handleSetHideUntil = async (date: string) => {
    const newSettings = { ...state.settings, hidePicksUntil: date || null };
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    await saveSettings(newSettings);
    setSyncStatus({ message: 'HIDE DATE SAVED', type: 'success' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen px-4 py-6 flex flex-col items-center justify-center">
        <Lock className="w-12 h-12 mb-4" style={{ color: '#FFD700' }} />
        <h1 className="font-pixel text-lg mb-4" style={{ color: '#FFD700' }}>ADMIN LOGIN</h1>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          placeholder="ENTER PASSWORD" className="pixel-input max-w-sm mb-4" />
        <button onClick={handleLogin} className="pixel-btn gold">LOGIN</button>
        {message && <p className="font-pixel text-[8px] mt-3" style={{ color: '#E60012' }}>{message}</p>}
      </div>
    );
  }

  const allTeams = getAllTeams(state.settings.tiers);
  const sc = state.settings.scoring;

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="font-pixel text-lg" style={{ color: '#FFD700' }}>ADMIN PANEL</h1>
            <div className="flex items-center gap-2">
              {firebaseEnabled ? (
                <span className="flex items-center gap-1 font-pixel text-[7px]" style={{ color: '#00AA00' }}>
                  <Wifi className="w-3 h-3" /> CLOUD CONNECTED
                </span>
              ) : (
                <span className="flex items-center gap-1 font-pixel text-[7px]" style={{ color: '#E60012' }}>
                  <WifiOff className="w-3 h-3" /> LOCAL ONLY
                </span>
              )}
              <span className="font-pixel text-[7px]" style={{ color: '#AABBCC' }}>
                {state.managers.length} MGR / {state.managers.filter(m => m.active).length} ACTIVE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {message && (
              <span className="font-pixel text-[8px] px-2 py-1" style={{ backgroundColor: '#00AA00', color: '#F0F0F0' }}>{message}</span>
            )}
            <button onClick={() => { setAuthenticated(false); try { localStorage.removeItem(ADMIN_AUTH_KEY); } catch { /* ignore */ } }} className="pixel-btn red small">LOGOUT</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {[
            { key: 'managers' as const, label: 'MANAGERS', icon: Users },
            { key: 'degen-den' as const, label: 'THE DEN', icon: Beer },
            { key: 'tiers' as const, label: 'TIERS', icon: Trophy },
            { key: 'results' as const, label: 'RESULTS', icon: Settings },
            { key: 'sync' as const, label: 'AUTO-SYNC', icon: RefreshCw },
            { key: 'settings' as const, label: 'SETTINGS', icon: Settings },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="font-pixel text-[8px] px-3 py-2 flex items-center gap-1"
              style={{
                backgroundColor: activeTab === tab.key ? '#2D3192' : '#16213E',
                color: activeTab === tab.key ? '#FFD700' : '#8899AA',
                border: activeTab === tab.key ? '2px solid #FFD700' : '2px solid #0F3460',
              }}>
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Managers Tab */}
        {activeTab === 'managers' && (
          <div>
            {/* Draft Lock Control */}
            <div className="retro-card p-4 mb-4 flex items-center justify-between"
              style={{ borderColor: state.settings.draftLocked ? '#E60012' : '#00AA00' }}>
              <div className="flex items-center gap-2">
                {state.settings.draftLocked ? <Lock className="w-4 h-4" style={{ color: '#E60012' }} /> : <Unlock className="w-4 h-4" style={{ color: '#00AA00' }} />}
                <span className="font-pixel text-[10px]" style={{ color: state.settings.draftLocked ? '#E60012' : '#00AA00' }}>
                  DRAFT IS {state.settings.draftLocked ? 'LOCKED' : 'OPEN'}
                </span>
              </div>
              <button onClick={state.settings.draftLocked ? unlockDraft : lockDraft}
                className={`pixel-btn ${state.settings.draftLocked ? 'green' : 'red'} small`}>
                {state.settings.draftLocked ? 'UNLOCK' : 'LOCK'}
              </button>
            </div>

            {/* Cloud Sync Controls */}
            <div className="retro-card p-4 mb-4" style={{ borderColor: '#2D3192' }}>
              <p className="font-pixel text-[8px] mb-3" style={{ color: '#FFD700' }}>
                CLOUD SYNC &#8597; FIREBASE
              </p>
              <div className="flex gap-3 mb-3">
                <button onClick={async () => {
                  setCloudMsg('PULLING...');
                  const count = await loadFromCloud();
                  setCloudMsg(count > 0 ? 'PULLED ' + count + ' MANAGERS FROM CLOUD' : 'CLOUD IS EMPTY');
                  setTimeout(() => setCloudMsg(''), 4000);
                }} className="pixel-btn gold small flex-1">
                  &#8595; PULL FROM CLOUD
                </button>
                <button onClick={async () => {
                  setCloudMsg('PUSHING ' + state.managers.length + ' MANAGERS...');
                  try {
                    await forceSync();
                    setCloudMsg('PUSHED ' + state.managers.length + ' MANAGERS TO CLOUD');
                  } catch (e: unknown) {
                    setCloudMsg('PUSH FAILED - CHECK CONSOLE');
                  }
                  setTimeout(() => setCloudMsg(''), 4000);
                }} className="pixel-btn small flex-1" style={{ borderColor: '#00AA00', color: '#00AA00' }}>
                  &#8593; PUSH TO CLOUD
                </button>
              </div>
              {cloudMsg && (
                <div className="font-pixel text-[8px] px-2 py-1 text-center" style={{
                  backgroundColor: cloudMsg.includes('FAILED') ? 'rgba(230,0,18,0.2)' : 'rgba(0,170,0,0.2)',
                  color: cloudMsg.includes('FAILED') ? '#E60012' : '#00AA00',
                  border: '2px solid ' + (cloudMsg.includes('FAILED') ? '#E60012' : '#00AA00'),
                }}>
                  {cloudMsg}
                </div>
              )}
            </div>

            {/* Add Manager */}
            <div className="retro-card p-4 mb-4 flex gap-2">
              <input type="text" value={newManagerName} onChange={e => setNewManagerName(e.target.value.toUpperCase())}
                placeholder="NEW MANAGER NAME" maxLength={12} className="pixel-input flex-1 text-[10px]" />
              <button onClick={handleAddManager} disabled={!newManagerName.trim()} className="pixel-btn green small">ADD</button>
            </div>

            {/* Manager List */}
            <div className="retro-card p-0 overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-2 py-2 font-pixel text-[7px]" style={{ backgroundColor: 'rgba(45,49,146,0.3)', color: '#8899AA' }}>
                <div className="col-span-2">TEAM</div>
                <div className="col-span-2">REAL NAME</div>
                <div className="col-span-1">TEAMS</div>
                <div className="col-span-1">SUB</div>
                <div className="col-span-1">CODE</div>
                <div className="col-span-1">TS</div>
                <div className="col-span-1">WARN</div>
                <div className="col-span-1">ACT</div>
                <div className="col-span-2"></div>
              </div>
              {state.managers.map(m => (
                <div key={m.id} className="grid grid-cols-12 gap-1 px-2 py-2 items-center" style={{ borderBottom: '1px solid #1A1A2E' }}>
                  <div className="col-span-2 font-pixel text-[8px] truncate" style={{ color: '#FFD700' }}>{m.teamName || m.name}</div>
                  <div className="col-span-2 font-pixel text-[7px] truncate" style={{ color: '#E8E8E8' }}>{m.realName || '—'}</div>
                  <div className="col-span-1 font-pixel text-[8px]" style={{ color: '#FFD700' }}>{m.teamCodes.length}/12</div>
                  <div className="col-span-1 font-pixel text-[7px]" style={{ color: m.submittedAt ? '#00AA00' : '#8899AA' }}>
                    {m.submittedAt ? 'Y' : 'N'}
                  </div>
                  <div className="col-span-1 font-pixel text-[7px]" style={{ color: '#00AA00' }}>{m.code}</div>
                  <div className="col-span-1 font-pixel text-[7px]" style={{ color: m.topScorerGuess ? '#FFD700' : '#8899AA' }}>
                    {m.topScorerGuess ? '✓' : '—'}
                  </div>
                  <div className="col-span-1">
                    {(m.warnings || 0) > 0 && (
                      <span className="font-pixel text-[7px] px-1 py-0.5" style={{ backgroundColor: '#FFD700', color: '#1A1A2E' }}>
                        {m.warnings}
                      </span>
                    )}
                  </div>
                  <div className="col-span-1">
                    <button onClick={() => handleSetActive(m.id, !m.active)}
                      className="font-pixel text-[7px] px-1 py-0.5"
                      style={{ backgroundColor: m.active ? '#00AA00' : '#E60012', color: '#F0F0F0' }}>
                      {m.active ? 'YES' : 'NO'}
                    </button>
                  </div>
                  <div className="col-span-2 text-right flex items-center justify-end gap-1">
                    <button onClick={() => { const newCode = resetManagerCode(m.id); setMessage(`RESET ${m.teamName || m.name} → ${newCode}`); setTimeout(() => setMessage(''), 3000); }}
                      className="p-1" style={{ color: '#2D3192' }} title="Reset code">
                      <Key className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleWarnManager(m.id)} className="p-1" style={{ color: '#FFD700' }} title="Send warning">
                      <MessageSquareWarning className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleRemoveManager(m.id)} className="p-1" style={{ color: '#E60012' }} title="Remove player">
                      <UserX className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleRemoveManager(m.id)} className="p-1" style={{ color: '#8899AA' }} title="Delete player">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
              {state.managers.length === 0 && (
                <div className="p-4 text-center font-pixel text-[8px]" style={{ color: '#8899AA' }}>NO MANAGERS</div>
              )}
            </div>
          </div>
        )}

        {/* Tiers Tab */}
        {activeTab === 'tiers' && (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3" style={{ backgroundColor: 'rgba(255,215,0,0.1)', borderLeft: '4px solid #FFD700' }}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#FFD700' }} />
              <span className="font-pixel text-[8px]" style={{ color: '#FFD700' }}>
                CLICK A TEAM'S TIER TO CHANGE IT. FAVORITES=2 PICKS, MID=4, UNDERDOG=6
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {allTeams.sort((a, b) => a.name.localeCompare(b.name)).map(team => (
                <div key={team.code} className="retro-card p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-base">{TEAM_FLAGS[team.code]}</span>
                    <span className="font-pixel text-[7px]" style={{ color: '#E8E8E8' }}>{team.code}</span>
                  </div>
                  <div className="flex gap-0.5">
                    {TIER_OPTIONS.map(opt => (
                      <button key={opt.value}
                        onClick={() => handleUpdateTier(team.code, opt.value)}
                        className="flex-1 font-pixel text-[6px] py-1"
                        style={{
                          backgroundColor: team.tier === opt.value ? opt.color : '#1A1A2E',
                          color: team.tier === opt.value ? '#1A1A2E' : '#8899AA',
                          border: team.tier === opt.value ? `1px solid ${opt.color}` : '1px solid #0F3460',
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div>
            <div className="flex items-center gap-2 mb-4 p-3" style={{ backgroundColor: 'rgba(0,170,0,0.1)', borderLeft: '4px solid #00AA00' }}>
              <span className="font-pixel text-[8px]" style={{ color: '#00AA00' }}>
                ENTER TOURNAMENT RESULTS FOR EACH TEAM. STANDINGS AUTO-UPDATE.
              </span>
            </div>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
              {allTeams.sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name)).map(team => {
                const rf = resultForm[team.code] || { groupPosition: 0, reachedKnockout: false, reachedRoundOf16: false, reachedQuarterFinal: false, reachedSemiFinal: false, reachedFinal: false, wonWorldCup: false, wonThirdPlace: false, eliminated: false };
                return (
                  <div key={team.code} className="retro-card p-3" style={{ borderColor: '#0F3460' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{TEAM_FLAGS[team.code]}</span>
                      <span className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>{TEAM_NAMES[team.code]}</span>
                      <span className="font-pixel text-[7px] px-1" style={{ backgroundColor: '#2D3192', color: '#8899AA' }}>GRP {team.group}</span>
                      <button onClick={() => handleUpdateResult(team.code)} className="pixel-btn green small ml-auto">SAVE</button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                      {/* Group Position */}
                      <div>
                        <label className="font-pixel text-[6px] block mb-1" style={{ color: '#8899AA' }}>GRP POS</label>
                        <select value={rf.groupPosition} onChange={e => setResultForm({ ...resultForm, [team.code]: { ...rf, groupPosition: parseInt(e.target.value) } })}
                          className="pixel-input w-full text-[8px] py-1 px-1">
                          <option value={0}>--</option>
                          <option value={1}>1st</option>
                          <option value={2}>2nd</option>
                          <option value={3}>3rd</option>
                          <option value={4}>4th</option>
                        </select>
                      </div>
                      {/* Checkboxes */}
                      {[
                        ['reachedKnockout', 'QUALIFIED'],
                        ['reachedRoundOf16', 'R16'],
                        ['reachedQuarterFinal', 'QF'],
                        ['reachedSemiFinal', 'SF'],
                        ['reachedFinal', 'FINAL'],
                        ['wonWorldCup', 'CHAMP'],
                        ['wonThirdPlace', '3RD'],
                        ['eliminated', 'OUT'],
                      ].map(([key, label]) => (
                        <label key={key} className="flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" checked={rf[key as keyof typeof rf] as boolean}
                            onChange={e => setResultForm({ ...resultForm, [team.code]: { ...rf, [key]: e.target.checked } })}
                            className="w-3 h-3 accent-yellow-400" />
                          <span className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sync Tab */}
        {activeTab === 'sync' && (
          <div className="space-y-4">
            {/* football-data.org — PRIMARY method */}
            <div className="retro-card p-4" style={{ borderColor: '#00AA00' }}>
              <h3 className="font-pixel text-[10px] mb-2 flex items-center gap-2" style={{ color: '#00AA00' }}>
                <Globe className="w-3 h-3" /> football-data.org
              </h3>
              <p className="text-[10px] mb-3" style={{ color: '#8899AA' }}>
                <strong style={{ color: '#E8E8E8' }}>FREE tier includes World Cup 2026.</strong> Register at{' '}
                <a href="https://www.football-data.org/client/register" target="_blank" rel="noreferrer" style={{ color: '#00AA00' }}>football-data.org/client/register</a>,
                {' '}copy your API token. FETCH works automatically after you deploy the proxy function once.
              </p>
              <div className="flex gap-2 mb-3">
                <input type="password" value={fdToken}
                  onChange={e => { setFdToken(e.target.value); storeFDToken(e.target.value); }}
                  placeholder="YOUR football-data.org API TOKEN"
                  className="pixel-input flex-1 text-[10px] py-2 px-3" />
                <button onClick={handleFetchFootballData} disabled={isFdFetching || !fdToken}
                  className="pixel-btn green small">
                  <RefreshCw className={`w-3 h-3 ${isFdFetching ? 'animate-spin' : ''}`} />
                  {isFdFetching ? '...' : 'FETCH'}
                </button>
              </div>
              {fdResult && (
                <div className="mt-2">
                  {fdResult.errors.length > 0 && (
                    <div className="space-y-1">
                      {fdResult.errors.map((err, i) => (
                        <p key={i} className="font-pixel text-[7px] p-2 mb-1" style={{ background: 'rgba(230,0,18,0.1)', color: '#E60012', border: '1px solid #E60012' }}>
                          {err}
                        </p>
                      ))}
                      <div className="p-2 mt-2" style={{ backgroundColor: 'rgba(0,200,255,0.05)', border: '1px solid #00c8ff' }}>
                        <p className="font-pixel text-[7px] mb-1" style={{ color: '#00c8ff' }}>TO ENABLE FETCH: DEPLOY THE PROXY</p>
                        <ol className="font-pixel text-[6px] space-y-0.5 ml-3" style={{ color: '#E8E8E8' }}>
                          <li>1. cd functions</li>
                          <li>2. npm install</li>
                          <li>3. firebase deploy --only functions</li>
                          <li>4. Click FETCH again</li>
                        </ol>
                      </div>
                    </div>
                  )}
                  {fdResult.matches > 0 && (
                    <p className="font-pixel text-[7px] p-2" style={{ background: 'rgba(0,170,0,0.15)', color: '#00AA00', border: '1px solid #00AA00' }}>
                      LOADED {fdResult.matches} MATCHES ({fdResult.method === 'proxy' ? 'VIA PROXY' : 'DIRECT'})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Derived Results Preview */}
            {showResultsPreview && derivedPreview && (
              <div className="retro-card p-4" style={{ borderColor: '#00c8ff', backgroundColor: 'rgba(0,200,255,0.05)' }}>
                <h3 className="font-pixel text-[10px] mb-3 flex items-center gap-2" style={{ color: '#00c8ff' }}>
                  <Trophy className="w-3 h-3" /> DERIVED RESULTS PREVIEW
                </h3>
                <p className="font-pixel text-[8px] mb-3" style={{ color: '#E8E8E8' }}>
                  Results engine analyzed {fdResult?.matches || 0} matches. Review before applying.
                </p>
                {derivedPreview.groupSummaries.length > 0 && (
                  <div className="mb-3">
                    <p className="font-pixel text-[7px] mb-2" style={{ color: '#FFD700' }}>GROUP STANDINGS</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {derivedPreview.groupSummaries.map(g => (
                        <div key={g.group} className="p-2" style={{ backgroundColor: 'rgba(12,18,30,0.6)', border: '1px solid #0F3460' }}>
                          <p className="font-pixel text-[6px] mb-1" style={{ color: '#8899AA' }}>{g.group}</p>
                          {g.standings.map(s => (
                            <div key={s.team} className="flex items-center justify-between py-0.5">
                              <span className="font-pixel text-[7px]" style={{ color: s.pos <= 2 ? '#00ff88' : s.pos === 3 ? '#FFD700' : '#E60012' }}>
                                {s.pos}. {s.flag} {s.team}
                              </span>
                              <span className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>
                                {s.pts}pts {s.gd > 0 ? '+' : ''}{s.gd}
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {derivedResults && (
                  <div className="mb-3 p-2" style={{ backgroundColor: 'rgba(255,215,0,0.05)', border: '1px solid #FFD700' }}>
                    <p className="font-pixel text-[7px] mb-1" style={{ color: '#FFD700' }}>FANTASY IMPACT</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {[
                        { label: 'ADVANCED TO KNOCKOUT', count: Object.values(derivedResults).filter(r => r.reachedKnockout).length, color: '#00ff88' },
                        { label: 'REACHED R16', count: Object.values(derivedResults).filter(r => r.reachedRoundOf16).length, color: '#2D3192' },
                        { label: 'REACHED QF', count: Object.values(derivedResults).filter(r => r.reachedQuarterFinal).length, color: '#2D3192' },
                        { label: 'REACHED SF', count: Object.values(derivedResults).filter(r => r.reachedSemiFinal).length, color: '#2D3192' },
                        { label: 'IN FINAL', count: Object.values(derivedResults).filter(r => r.reachedFinal).length, color: '#FFD700' },
                        { label: 'WORLD CHAMP', count: Object.values(derivedResults).filter(r => r.wonWorldCup).length, color: '#FFD700' },
                        { label: '3RD PLACE', count: Object.values(derivedResults).filter(r => r.wonThirdPlace).length, color: '#e76f51' },
                        { label: 'ELIMINATED', count: Object.values(derivedResults).filter(r => r.eliminated).length, color: '#E60012' },
                      ].map(item => (
                        <div key={item.label} className="text-center p-1">
                          <div className="font-pixel text-lg" style={{ color: item.color }}>{item.count}</div>
                          <div className="font-pixel text-[5px]" style={{ color: '#8899AA' }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={handleApplyDerivedResults}
                    className="pixel-btn green flex-1 flex items-center justify-center gap-2">
                    <Check className="w-3 h-3" /> APPLY TO SCORING SYSTEM
                  </button>
                  <button onClick={handleDiscardDerivedResults}
                    className="pixel-btn red small">
                    <X className="w-3 h-3" /> DISCARD
                  </button>
                </div>
              </div>
            )}

            {/* Paste Scores */}
            <div className="retro-card p-4" style={{ borderColor: '#FFD700' }}>
              <h3 className="font-pixel text-[10px] mb-2 flex items-center gap-2" style={{ color: '#FFD700' }}>
                <Globe className="w-3 h-3" /> PASTE SCORES
              </h3>
              <p className="text-[10px] mb-3" style={{ color: '#8899AA' }}>
                Copy scores from any source. Paste raw text. Works with: &quot;France 3-1 Senegal&quot;, &quot;Group A: Mexico 2-0 South Africa&quot;.
              </p>
              <textarea
                value={pasteText}
                onChange={e => { setPasteText(e.target.value); setPastePreview(null); }}
                placeholder={`Paste scores here:
Group A: Mexico 2-0 South Africa
Group B: USA 4-1 Paraguay
France 3-1 Senegal`}
                className="pixel-input w-full text-[10px] resize-none"
                rows={6}
              />
              <div className="flex gap-2 mt-2">
                <button onClick={handleParsePastedScores} disabled={!pasteText.trim()}
                  className="pixel-btn gold small">PARSE</button>
                {pastePreview && pastePreview.length > 0 && (
                  <button onClick={handleApplyPastedScores}
                    className="pixel-btn green small">APPLY {pastePreview.length} SCORES</button>
                )}
              </div>
              {pastePreview && (
                <div className="mt-2">
                  {pastePreview.length === 0 ? (
                    <p className="font-pixel text-[7px] p-2" style={{ background: 'rgba(230,0,18,0.1)', color: '#E60012', border: '1px solid #E60012' }}>
                      No scores found. Try: &quot;France 3-1 Senegal&quot;
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      <p className="font-pixel text-[7px] mb-1" style={{ color: '#00AA00' }}>
                        FOUND {pastePreview.length} SCORES
                      </p>
                      {pastePreview.map((m, i) => (
                        <div key={i} className="flex items-center justify-between px-2 py-1" style={{ background: 'rgba(0,170,0,0.05)' }}>
                          <span className="font-pixel text-[7px]" style={{ color: '#e8d5f5' }}>
                            {m.homeTeam} {m.homeGoals}-{m.awayGoals} {m.awayTeam}
                          </span>
                          <span className="font-pixel text-[6px]" style={{ color: mapTeamName(m.homeTeam) && mapTeamName(m.awayTeam) ? '#00AA00' : '#E60012' }}>
                            {mapTeamName(m.homeTeam) && mapTeamName(m.awayTeam) ? 'OK' : 'UNMAPPED'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Knockout Bracket Manager */}
            <KnockoutBracketManager />

            {/* Ro32 Bracket Editor — Manual override for Round of 32 matchups */}
            <R32BracketEditor />

            {/* Match Matrix Grid */}
            <div className="retro-card p-4" style={{ borderColor: '#2D3192' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-pixel text-[10px] flex items-center gap-2" style={{ color: '#2D3192' }}>
                  <Globe className="w-3 h-3" /> MATCH MATRIX
                </h3>
                <button onClick={() => setShowMatrixGrid(!showMatrixGrid)}
                  className="pixel-btn small" style={{ backgroundColor: '#2D3192', borderColor: '#2D3192', color: '#FFD700' }}>
                  {showMatrixGrid ? 'HIDE' : 'SHOW'} GRID
                </button>
              </div>

              {/* Stats */}
              <MatrixStatsBar />

              {/* Grid */}
              {showMatrixGrid && <MatchMatrixGrid />}
            </div>

            {/* Info */}
            <div className="p-3" style={{ backgroundColor: 'rgba(45,49,146,0.1)', borderLeft: '4px solid #2D3192' }}>
              <p className="text-[10px]" style={{ color: '#8899AA' }}>
                <strong style={{ color: '#E8E8E8' }}>How it works:</strong> All 104 World Cup 2026 matches are pre-loaded into the Match Matrix. When you paste scores, they fill in the matching slots. The matrix remembers every score you have ever entered. The Results Engine always reads from the full matrix, so standings are cumulative. Re-pasting the same score is a no-op.
              </p>
            </div>
          </div>
        )}

        {/* Degen Den Tab */}
        {activeTab === 'degen-den' && (
          <div className="space-y-4">
            {/* Header stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'TOTAL', value: state.wagers.length, color: '#c880ff' },
                { label: 'PENDING', value: state.wagers.filter(w => w.status === 'pending_acceptance').length, color: '#c880ff' },
                { label: 'LIVE', value: state.wagers.filter(w => w.status === 'live').length, color: '#00ff88' },
                { label: 'RESOLVED', value: state.wagers.filter(w => w.status === 'resolved').length, color: '#e76f51' },
              ].map(s => (
                <div key={s.label} className="retro-card p-3 text-center">
                  <div className="font-pixel text-lg" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {state.wagers.length === 0 && (
              <div className="retro-card p-4 text-center">
                <p className="font-pixel text-[8px] mb-3" style={{ color: '#8899AA' }}>NO FRIENDLY CHALLENGES YET. LOAD SAMPLE DATA?</p>
                <button onClick={loadSeedData} className="pixel-btn purple small">LOAD SAMPLES</button>
              </div>
            )}

            {/* All Wagers Table */}
            {state.wagers.length > 0 && (
              <>
              {savedFlash && (
                <div className="saved-toast flex items-center justify-center gap-2 py-2 px-4 mb-2"
                  style={{ background: 'rgba(0,255,136,0.15)', border: '2px solid #00ff88' }}>
                  <span style={{ color: '#00ff88', fontSize: 14 }}>&#10003;</span>
                  <span className="font-pixel text-[9px]" style={{ color: '#00ff88' }}>SAVED!</span>
                </div>
              )}

              <div className="retro-card p-0 overflow-hidden">
                <div className="grid grid-cols-12 gap-1 px-2 py-2 font-pixel text-[7px]" style={{ backgroundColor: 'rgba(74, 32, 128, 0.3)', color: '#a080cc' }}>
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">BET</div>
                  <div className="col-span-2">PLAYERS</div>
                  <div className="col-span-2">STATUS</div>
                  <div className="col-span-2">MUGS</div>
                  <div className="col-span-2">ACTIONS</div>
                </div>
                {state.wagers.map((w, i) => (
                  <div key={w.id} className={`${savedFlash === w.id ? 'save-flash' : ''}`}>
                    {editingWager === w.id ? (
                      <div className="col-span-12 p-3" style={{ background: 'rgba(0, 200, 255, 0.08)', border: '2px solid #00c8ff' }}>
                        <div className="font-pixel text-[8px] mb-3" style={{ color: '#00c8ff' }}>EDIT FRIENDLY CHALLENGE #{String(i + 1).padStart(3, '0')}</div>
                        <div className="space-y-2">
                          <div>
                            <label className="font-pixel text-[6px] block mb-1" style={{ color: '#a080cc' }}>DESCRIPTION</label>
                            <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="pixel-input w-full" style={{ fontSize: 8 }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="font-pixel text-[6px] block mb-1" style={{ color: '#a080cc' }}>{w.proposerName} MUGS</label>
                              <input type="number" step="0.5" min="0.5" max="5" value={editForm.proposerMugs} onChange={e => setEditForm(f => ({ ...f, proposerMugs: Number(e.target.value) }))} className="pixel-input w-full" style={{ fontSize: 8 }} />
                            </div>
                            <div>
                              <label className="font-pixel text-[6px] block mb-1" style={{ color: '#a080cc' }}>{w.acceptorName} MUGS</label>
                              <input type="number" step="0.5" min="0.5" max="5" value={editForm.acceptorMugs} onChange={e => setEditForm(f => ({ ...f, acceptorMugs: Number(e.target.value) }))} className="pixel-input w-full" style={{ fontSize: 8 }} />
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => saveEdit(w.id)} className="pixel-btn green small" style={{ fontSize: 7, padding: '4px 8px' }}><Check className="w-3 h-3" />SAVE</button>
                            <button onClick={cancelEdit} className="pixel-btn red small" style={{ fontSize: 7, padding: '4px 8px' }}><X className="w-3 h-3" />CANCEL</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-12 gap-1 px-2 py-2 items-center" style={{ borderBottom: '1px solid #1A1A2E' }}>
                        <div className="col-span-1 font-pixel text-[7px]" style={{ color: '#c880ff' }}>#{String(i + 1).padStart(3, '0')}</div>
                        <div className="col-span-3 font-pixel text-[6px] truncate" style={{ color: '#e8d5f5' }}>{w.description}</div>
                        <div className="col-span-2 font-pixel text-[6px]" style={{ color: '#8899AA' }}>{w.proposerName} vs {w.acceptorName}</div>
                        <div className="col-span-2">
                          <span className="font-pixel text-[5px] px-1 py-0.5" style={{ backgroundColor: STATUS_BG[w.status], color: STATUS_COLORS[w.status] }}>{w.status.replace('_', ' ').toUpperCase()}</span>
                        </div>
                        <div className="col-span-2 font-pixel text-[6px]" style={{ color: '#c880ff' }}>{w.proposerMugs}M / {w.acceptorMugs}M</div>
                        <div className="col-span-2 flex gap-1 flex-wrap">
                          {w.status === 'live' && <button onClick={() => handleAdminResolve(w.id)} className="font-pixel text-[5px] px-1 py-0.5" style={{ backgroundColor: '#e76f51', color: '#fff' }}>SETTLE</button>}
                          <button onClick={() => toggleWagerComments(w.id)} className="font-pixel text-[5px] px-1 py-0.5" style={{ backgroundColor: w.commentsLocked ? '#E60012' : '#00AA00', color: '#fff' }}>{w.commentsLocked ? 'UNLOCK' : 'LOCK'}</button>
                          <button onClick={() => startEdit(w)} className="font-pixel text-[5px] px-1 py-0.5" style={{ backgroundColor: '#00c8ff', color: '#0d0418' }}>EDIT</button>
                          <button onClick={() => { if (confirm('DELETE FRIENDLY CHALLENGE #' + String(i + 1).padStart(3, '0') + '?')) { deleteWager(w.id); triggerSaveFlash(w.id); } }} className="font-pixel text-[5px] px-1 py-0.5" style={{ backgroundColor: '#E60012', color: '#fff' }}>DEL</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* Save Status Banner */}
            {syncStatus && (
              <div className="flex items-center justify-center gap-2 py-2 px-3"
                style={{
                  backgroundColor: syncStatus.type === 'success' ? 'rgba(0,170,0,0.2)' : syncStatus.type === 'error' ? 'rgba(230,0,18,0.2)' : 'rgba(45,49,146,0.2)',
                  border: '2px solid ' + (syncStatus.type === 'success' ? '#00AA00' : syncStatus.type === 'error' ? '#E60012' : '#2D3192'),
                }}>
                <span style={{ color: syncStatus.type === 'success' ? '#00AA00' : syncStatus.type === 'error' ? '#E60012' : '#FFD700', fontSize: 14 }}>&#10003;</span>
                <span className="font-pixel text-[9px]" style={{ color: syncStatus.type === 'success' ? '#00AA00' : syncStatus.type === 'error' ? '#E60012' : '#FFD700' }}>
                  {syncStatus.message}
                </span>
              </div>
            )}

            {/* Draft Mode Toggle */}
            <div className="retro-card p-4 flex items-center justify-between">
              <div>
                <h3 className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>DRAFT MODE</h3>
                <p className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                  {state.settings.draftMode ? 'No duplicate teams allowed' : 'Open pick - duplicates allowed'}
                </p>
              </div>
              <button onClick={handleToggleDraftMode}
                className={`pixel-btn ${state.settings.draftMode ? 'gold' : ''} small`}>
                {state.settings.draftMode ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Hide Picks Until */}
            <div className="retro-card p-4">
              <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#E8E8E8' }}>HIDE PICKS UNTIL</h3>
              <p className="font-pixel text-[7px] mb-2" style={{ color: '#8899AA' }}>
                Hide all rosters until this date (for competitive drafts)
              </p>
              {state.settings.hidePicksUntil && (
                <p className="font-pixel text-[8px] mb-2" style={{ color: '#00AA00' }}>
                  HIDING UNTIL: {new Date(state.settings.hidePicksUntil).toLocaleString('en-HK', { timeZone: 'Asia/Hong_Kong', dateStyle: 'medium', timeStyle: 'short' })} HKT
                </p>
              )}
              <input type="datetime-local"
                value={new Date(state.settings.hidePicksUntil || DEFAULT_SETTINGS.hidePicksUntil!).toISOString().slice(0, 16)}
                onChange={e => handleSetHideUntil(e.target.value)}
                className="pixel-input text-[10px] py-2" />
              {state.settings.hidePicksUntil && (
                <button onClick={() => handleSetHideUntil('')} className="font-pixel text-[7px] ml-2" style={{ color: '#E60012' }}>CLEAR</button>
              )}
            </div>

            {/* Scoring Settings */}
            <div className="retro-card p-4">
              <h3 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>SCORING VALUES</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  ['groupFirst', '1st in group', sc.groupFirst],
                  ['groupSecond', '2nd in group', sc.groupSecond],
                  ['groupThirdQualify', '3rd & qualify', sc.groupThirdQualify],
                  ['groupFourth', '4th in group', sc.groupFourth],
                  ['roundOf16', 'Reach R16', sc.roundOf16],
                  ['quarterFinal', 'Reach QF', sc.quarterFinal],
                  ['semiFinal', 'Reach SF', sc.semiFinal],
                  ['reachFinal', 'Reach Final', sc.reachFinal],
                  ['winWorldCup', 'Win Cup', sc.winWorldCup],
                  ['winThirdPlace', 'Win 3rd', sc.winThirdPlace],
                ].map(([k, label, value]) => (
                  <div key={String(k)}>
                    <label className="font-pixel text-[7px] block mb-1" style={{ color: '#8899AA' }}>{label}</label>
                    <input type="number" value={value}
                      onChange={e => handleUpdateScoring(String(k), parseInt(e.target.value) || 0)}
                      className="pixel-input w-full text-[10px] py-1 px-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Top Scorer Actual with Autocomplete */}
            <TopScorerAdmin
              current={state.settings.topScorerActual}
              onSet={handleSetTopScorerActual}
              bonus={sc.topScorerBonus}
            />

            {/* Danger Zone */}
            <div className="retro-card p-4" style={{ borderColor: '#E60012' }}>
              <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#E60012' }}>DANGER ZONE</h3>
              <button onClick={() => { if (confirm('CLEAR ALL DATA?')) dispatch({ type: 'RESET_ALL' }); }}
                className="pixel-btn red small">
                RESET ALL DATA
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
   );
}


// ============================================================================
// MATCH MATRIX GRID COMPONENTS
// ============================================================================

function MatrixStatsBar() {
  const [stats, setStats] = useState(getMatrixStats());
  useEffect(() => {
    const interval = setInterval(() => setStats(getMatrixStats()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pct = Math.round((stats.scoredMatches / stats.totalMatches) * 100);

  return (
    <div className="flex items-center gap-3 mb-2">
      <div className="flex-1 h-2" style={{ backgroundColor: '#1A1A2E', border: '1px solid #0F3460' }}>
        <div className="h-full transition-all" style={{
          width: `${pct}%`,
          backgroundColor: pct === 100 ? '#00AA00' : pct > 50 ? '#FFD700' : '#2D3192',
        }} />
      </div>
      <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
        {stats.scoredMatches}/{stats.totalMatches} ({pct}%)
      </span>
    </div>
  );
}

function MatchMatrixGrid() {
  const [matrix, setMatrix] = useState<MatrixMatch[]>(getMatrix());

  useEffect(() => {
    const interval = setInterval(() => setMatrix(getMatrix()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Group by round
  const groups: Record<string, MatrixMatch[]> = {};
  for (const m of matrix) {
    if (!groups[m.round]) groups[m.round] = [];
    groups[m.round].push(m);
  }

  const roundOrder = [
    'GROUP_A', 'GROUP_B', 'GROUP_C', 'GROUP_D',
    'GROUP_E', 'GROUP_F', 'GROUP_G', 'GROUP_H',
    'GROUP_I', 'GROUP_J', 'GROUP_K', 'GROUP_L',
    'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
  ];

  const roundLabel = (r: string) => {
    if (r.startsWith('GROUP_')) return 'GROUP ' + r.replace('GROUP_', '');
    if (r === 'LAST_32') return 'ROUND OF 32';
    if (r === 'LAST_16') return 'ROUND OF 16';
    if (r === 'QUARTER_FINALS') return 'QUARTER FINALS';
    if (r === 'SEMI_FINALS') return 'SEMI FINALS';
    if (r === 'THIRD_PLACE') return '3RD PLACE';
    return r;
  };

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto mt-3">
      {roundOrder.map(round => {
        const matches = groups[round];
        if (!matches || matches.length === 0) return null;
        const scoredCount = matches.filter(m => m.homeGoals !== null).length;

        return (
          <div key={round}>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-pixel text-[7px]" style={{ color: '#FFD700' }}>{roundLabel(round)}</span>
              <span className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>
                {scoredCount}/{matches.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {matches.map(m => {
                const isScored = m.homeGoals !== null;
                const home = m.homeTeam === 'None' ? 'TBD' : m.homeTeam;
                const away = m.awayTeam === 'None' ? 'TBD' : m.awayTeam;

                return (
                  <div key={m.id}
                    className="px-2 py-1 flex items-center justify-between"
                    style={{
                      backgroundColor: isScored ? 'rgba(0,170,0,0.1)' : 'rgba(26,26,46,0.6)',
                      border: `1px solid ${isScored ? '#00AA00' : '#0F3460'}`,
                    }}>
                    <span className="font-pixel text-[6px] truncate" style={{ color: isScored ? '#E8E8E8' : '#556677' }}>
                      {home} vs {away}
                    </span>
                    <span className="font-pixel text-[7px] flex-shrink-0" style={{ color: isScored ? '#00AA00' : '#556677' }}>
                      {isScored ? `${m.homeGoals}-${m.awayGoals}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ============================================================================
// STREAMLINED KNOCKOUT MANAGER — Three-step workflow
// ============================================================================

function KnockoutBracketManager() {
  const [bracketData, setBracketData] = useState(() => generateBracketSuggestions());

  // Step 1: Auto-seed state
  const [seedResult, setSeedResult] = useState<{ filled: number; errors: string[]; details: string[] } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Step 2: Auto-advance state
  const [advanceResult, setAdvanceResult] = useState<{ advanced: number; details: string[] } | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // Step 3: Derive & Apply
  const [, setLocalSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Advanced: Paste bracket
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [bracketPasteText, setBracketPasteText] = useState('');
  const [parsedSeeds, setParsedSeeds] = useState<{ matchId: number; home: string; homeName: string; away: string; awayName: string }[] | null>(null);

  // Advanced: Manual assign
  const [manualMatchId, setManualMatchId] = useState('');
  const [manualSide, setManualSide] = useState<'home' | 'away'>('home');
  const [manualTeam, setManualTeam] = useState('');
  const [manualTeamName, setManualTeamName] = useState('');

  const refresh = () => {
    setBracketData(generateBracketSuggestions());
    setSeedResult(null);
    setAdvanceResult(null);
  };

  const handleAutoSeed = () => {
    setIsSeeding(true);
    setSeedResult(null);
    setTimeout(() => {
      const result = seedKnockoutFromGroupResults();
      setSeedResult(result);
      refresh();
      setIsSeeding(false);
    }, 100);
  };

  const handleAutoAdvance = () => {
    setIsAdvancing(true);
    setAdvanceResult(null);
    setTimeout(() => {
      const result = autoAdvanceKnockoutWinners();
      setAdvanceResult(result);
      refresh();
      setIsAdvancing(false);
    }, 100);
  };

  const handleDeriveAndApply = () => {
    const finalResults = deriveResultsFromMatrix();
    window.dispatchEvent(new CustomEvent('deriveAndApplyResults', { detail: finalResults }));
    setLocalSyncStatus({ message: 'DERIVED & APPLIED', type: 'success' });
    setTimeout(() => setLocalSyncStatus(null), 3000);
  };

  const handleParseBracketPaste = () => {
    const seeds = parseBracketSeed(bracketPasteText);
    setParsedSeeds(seeds);
  };

  const handleApplyBracketPaste = () => {
    if (!parsedSeeds || parsedSeeds.length === 0) return;
    applyBracketSeed(parsedSeeds);
    setBracketPasteText('');
    setParsedSeeds(null);
    refresh();
  };

  const handleManualAssign = () => {
    const id = parseInt(manualMatchId, 10);
    if (!id || !manualTeam) return;
    assignKnockoutTeam(id, manualSide, manualTeam, manualTeamName || manualTeam);
    setManualMatchId('');
    setManualTeam('');
    setManualTeamName('');
    refresh();
  };

  // Count stats
  const r32Filled = bracketData.filter(b => b.round === 'LAST_32' && b.isFilled).length;
  const r16Filled = bracketData.filter(b => b.round === 'LAST_16' && b.isFilled).length;
  const qfFilled = bracketData.filter(b => b.round === 'QUARTER_FINALS' && b.isFilled).length;
  const sfFilled = bracketData.filter(b => b.round === 'SEMI_FINALS' && b.isFilled).length;
  const finalFilled = bracketData.filter(b => b.round === 'FINAL' && b.isFilled).length;
  const thirdFilled = bracketData.filter(b => b.round === 'THIRD_PLACE' && b.isFilled).length;

  const totalFilled = r32Filled + r16Filled + qfFilled + sfFilled + finalFilled + thirdFilled;
  const totalSlots = 16 + 8 + 4 + 2 + 1 + 1;

  const matrix = getMatrix();
  const scoredKo = matrix.filter(m => !m.round.startsWith('GROUP_') && m.homeGoals !== null);

  return (
    <div className="retro-card p-4" style={{ borderColor: '#FFD700' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-[10px] flex items-center gap-2" style={{ color: '#FFD700' }}>
          <Trophy className="w-3 h-3" /> KNOCKOUT BRACKET
        </h3>
        <div className="flex gap-2">
          <span className="font-pixel text-[7px] px-2 py-1" style={{ backgroundColor: 'rgba(45,49,146,0.2)', color: '#8899AA' }}>
            {totalFilled}/{totalSlots} FILLED
          </span>
          <button onClick={refresh} className="pixel-btn gold small">REFRESH</button>
        </div>
      </div>

      {/* Bracket Progress */}
      <div className="mb-4 p-2" style={{ backgroundColor: 'rgba(12,18,30,0.5)', border: '1px solid #0F3460' }}>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
          {[
            { label: 'R32', filled: r32Filled, total: 16 },
            { label: 'R16', filled: r16Filled, total: 8 },
            { label: 'QF', filled: qfFilled, total: 4 },
            { label: 'SF', filled: sfFilled, total: 2 },
            { label: 'FINAL', filled: finalFilled, total: 1 },
            { label: '3RD', filled: thirdFilled, total: 1 },
          ].map(r => (
            <div key={r.label} className="p-1" style={{
              backgroundColor: r.filled === r.total ? 'rgba(0,170,0,0.15)' : r.filled > 0 ? 'rgba(255,215,0,0.1)' : 'rgba(26,26,46,0.4)',
              border: `1px solid ${r.filled === r.total ? '#00AA00' : r.filled > 0 ? '#FFD700' : '#0F3460'}`,
            }}>
              <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>{r.label}</div>
              <div className="font-pixel text-[10px]" style={{ color: r.filled === r.total ? '#00AA00' : r.filled > 0 ? '#FFD700' : '#556677' }}>
                {r.filled}/{r.total}
              </div>
            </div>
          ))}
        </div>
        {scoredKo.length > 0 && (
          <p className="font-pixel text-[6px] mt-1 text-center" style={{ color: '#00AA00' }}>
            {scoredKo.length} KNOCKOUT MATCHES SCORED
          </p>
        )}
      </div>

      {/* ── STEP 1: AUTO-SEED RO32 ── */}
      <div className="mb-3 p-3" style={{ backgroundColor: 'rgba(0,170,0,0.08)', border: '1px solid #00AA00' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-pixel text-[8px] px-1.5 py-0.5" style={{ backgroundColor: '#00AA00', color: '#F0F0F0' }}>STEP 1</span>
          <span className="font-pixel text-[8px]" style={{ color: '#00AA00' }}>SEED ROUND OF 32</span>
        </div>
        <p className="font-pixel text-[7px] mb-2" style={{ color: '#8899AA' }}>
          Fill all 16 Ro32 slots using group standings. Run this ONCE after group stage is complete.
        </p>
        <button onClick={handleAutoSeed} disabled={isSeeding || r32Filled === 16}
          className="pixel-btn green small" style={{ opacity: r32Filled === 16 ? 0.5 : 1 }}>
          {isSeeding ? 'WORKING...' : r32Filled === 16 ? 'RO32 ALREADY FILLED' : 'AUTO-SEED RO32'}
        </button>

        {seedResult && (
          <div className="mt-2">
            {seedResult.errors.length > 0 && (
              <div className="p-2 mb-1" style={{ backgroundColor: 'rgba(230,0,18,0.1)', border: '1px solid #E60012' }}>
                {seedResult.errors.map((e, i) => (
                  <p key={i} className="font-pixel text-[6px]" style={{ color: '#E60012' }}>{e}</p>
                ))}
              </div>
            )}
            {seedResult.filled > 0 && (
              <p className="font-pixel text-[7px] p-1" style={{ color: '#00AA00' }}>
                FILLED {seedResult.filled} Ro32 SLOTS
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 2: AUTO-ADVANCE WINNERS ── */}
      <div className="mb-3 p-3" style={{ backgroundColor: 'rgba(0,200,255,0.05)', border: '1px solid #00c8ff' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-pixel text-[8px] px-1.5 py-0.5" style={{ backgroundColor: '#00c8ff', color: '#0d0418' }}>STEP 2</span>
          <span className="font-pixel text-[8px]" style={{ color: '#00c8ff' }}>ADVANCE WINNERS</span>
        </div>
        <p className="font-pixel text-[7px] mb-2" style={{ color: '#8899AA' }}>
          Reads finished knockout matches and advances winners to next-round slots. Run AFTER pasting scores for each round.
        </p>
        <button onClick={handleAutoAdvance} disabled={isAdvancing || scoredKo.length === 0}
          className="pixel-btn small" style={{ borderColor: '#00c8ff', color: '#00c8ff', opacity: scoredKo.length === 0 ? 0.5 : 1 }}>
          {isAdvancing ? 'WORKING...' : scoredKo.length === 0 ? 'NO KNOCKOUT SCORES YET' : 'AUTO-ADVANCE WINNERS'}
        </button>

        {advanceResult && (
          <div className="mt-2">
            {advanceResult.advanced > 0 ? (
              <div className="p-2" style={{ backgroundColor: 'rgba(0,200,255,0.08)', border: '1px solid #00c8ff' }}>
                <p className="font-pixel text-[7px] mb-1" style={{ color: '#00c8ff' }}>
                  ADVANCED {advanceResult.advanced} TEAMS
                </p>
                <div className="max-h-32 overflow-y-auto">
                  {advanceResult.details.map((d, i) => (
                    <p key={i} className="font-pixel text-[6px]" style={{ color: '#E8E8E8' }}>{d}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="font-pixel text-[7px] mt-1" style={{ color: '#8899AA' }}>
                No new advancements. Winners may already be in their next-round slots.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── STEP 3: DERIVE & APPLY ── */}
      <div className="mb-3 p-3" style={{ backgroundColor: 'rgba(255,215,0,0.08)', border: '1px solid #FFD700' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-pixel text-[8px] px-1.5 py-0.5" style={{ backgroundColor: '#FFD700', color: '#1A1A2E' }}>STEP 3</span>
          <span className="font-pixel text-[8px]" style={{ color: '#FFD700' }}>UPDATE STANDINGS</span>
        </div>
        <p className="font-pixel text-[7px] mb-2" style={{ color: '#8899AA' }}>
          Runs the Results Engine on all scored matches and updates fantasy standings. Run this after any score changes.
        </p>
        <button onClick={handleDeriveAndApply}
          className="pixel-btn gold small flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> DERIVE & UPDATE STANDINGS
        </button>
      </div>

      {/* ── Current Bracket View (read-only) ── */}
      <div className="mb-3">
        <p className="font-pixel text-[7px] mb-2" style={{ color: '#FFD700' }}>CURRENT BRACKET</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {bracketData.filter(b => b.isFilled).map(slot => (
            <div key={slot.matchId} className="flex items-center gap-2 px-2 py-1" style={{ backgroundColor: 'rgba(26,26,46,0.4)', border: '1px solid #0F3460' }}>
              <span className="font-pixel text-[6px] flex-shrink-0" style={{ color: '#8899AA' }}>
                {slot.round.replace('_', ' ')}
              </span>
              <span className="font-pixel text-[7px]" style={{ color: '#E8E8E8' }}>{slot.homeTeam.code}</span>
              <span className="font-pixel text-[6px]" style={{ color: '#556677' }}>vs</span>
              <span className="font-pixel text-[7px]" style={{ color: '#E8E8E8' }}>{slot.awayTeam.code}</span>
            </div>
          ))}
          {bracketData.filter(b => b.isFilled).length === 0 && (
            <p className="font-pixel text-[7px] text-center p-2" style={{ color: '#556677' }}>NO SLOTS FILLED YET</p>
          )}
        </div>
      </div>

      {/* ── ADVANCED OPTIONS (collapsible) ── */}
      <div className="mb-2">
        <button onClick={() => setShowAdvanced(!showAdvanced)}
          className="font-pixel text-[7px] flex items-center gap-1" style={{ color: '#AABBCC' }}>
          {showAdvanced ? '▼' : '▶'} ADVANCED OPTIONS
        </button>
      </div>

      {showAdvanced && (
        <div className="space-y-3 p-3" style={{ backgroundColor: 'rgba(26,26,46,0.3)', border: '1px solid #1A1A2E' }}>
          {/* Paste Bracket */}
          <div>
            <p className="font-pixel text-[7px] mb-1" style={{ color: '#00c8ff' }}>PASTE BRACKET (manual seeding)</p>
            <p className="font-pixel text-[6px] mb-1" style={{ color: '#8899AA' }}>
              Format: &quot;R32-1: MEX vs NED&quot; or &quot;537415: MEX vs NED&quot;
            </p>
            <textarea value={bracketPasteText}
              onChange={e => { setBracketPasteText(e.target.value); setParsedSeeds(null); }}
              placeholder={`R32-1: MEX vs NED\nR32-2: ARG vs DEN`}
              className="pixel-input w-full text-[10px] resize-none" rows={3} />
            <div className="flex gap-2 mt-1">
              <button onClick={handleParseBracketPaste} disabled={!bracketPasteText.trim()}
                className="pixel-btn small" style={{ borderColor: '#00c8ff', color: '#00c8ff' }}>PARSE</button>
              {parsedSeeds && parsedSeeds.length > 0 && (
                <button onClick={handleApplyBracketPaste} className="pixel-btn green small">APPLY {parsedSeeds.length}</button>
              )}
            </div>
          </div>

          {/* Manual Assign */}
          <div>
            <p className="font-pixel text-[7px] mb-1" style={{ color: '#FFD700' }}>MANUAL ASSIGN (emergency)</p>
            <p className="font-pixel text-[6px] mb-1" style={{ color: '#8899AA' }}>
              Directly assign a team to any match slot by ID.
            </p>
            <div className="grid grid-cols-4 gap-1">
              <input type="number" value={manualMatchId} onChange={e => setManualMatchId(e.target.value)}
                placeholder="MATCH ID" className="pixel-input text-[8px] py-1 px-1" />
              <select value={manualSide} onChange={e => setManualSide(e.target.value as 'home' | 'away')}
                className="pixel-input text-[8px] py-1 px-1">
                <option value="home">HOME</option>
                <option value="away">AWAY</option>
              </select>
              <input type="text" value={manualTeam} onChange={e => setManualTeam(e.target.value.toUpperCase())}
                placeholder="TEAM CODE" className="pixel-input text-[8px] py-1 px-1" maxLength={3} />
              <button onClick={handleManualAssign} disabled={!manualMatchId || !manualTeam}
                className="pixel-btn gold small text-[6px]">ASSIGN</button>
            </div>
            <input type="text" value={manualTeamName} onChange={e => setManualTeamName(e.target.value)}
              placeholder="Team full name (optional)" className="pixel-input w-full text-[8px] py-1 px-1 mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// R32 BRACKET EDITOR — Direct manual control of all 16 Round of 32 matchups
// ============================================================================

function R32BracketEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const [matchSlots, setMatchSlots] = useState<{ matchId: number; homeCode: string; homeName: string; awayCode: string; awayName: string }[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  // Refresh from current matrix state
  const refresh = () => {
    const matrix = getMatrix();
    const slots = R32_IDS.map(id => {
      const m = matrix.find(x => x.id === id);
      return {
        matchId: id,
        homeCode: m?.homeTeam && m.homeTeam !== 'None' ? m.homeTeam : '',
        homeName: m?.homeTeamName && m.homeTeamName !== 'None' ? m.homeTeamName : '',
        awayCode: m?.awayTeam && m.awayTeam !== 'None' ? m.awayTeam : '',
        awayName: m?.awayTeamName && m.awayTeamName !== 'None' ? m.awayTeamName : '',
      };
    });
    setMatchSlots(slots);
  };

  // Open/close toggles refresh
  const toggleOpen = () => {
    if (!isOpen) refresh();
    setIsOpen(!isOpen);
  };

  // Update a single slot field
  const updateSlot = (matchId: number, field: 'homeCode' | 'homeName' | 'awayCode' | 'awayName', value: string) => {
    setMatchSlots(prev => prev.map(s => s.matchId === matchId ? { ...s, [field]: value } : s));
  };

  // Apply all slots to the matrix
  const handleApply = () => {
    let filled = 0;
    for (const slot of matchSlots) {
      if (slot.homeCode && slot.homeCode !== 'None') {
        assignKnockoutTeam(slot.matchId, 'home', slot.homeCode.toUpperCase(), slot.homeName || slot.homeCode);
        filled++;
      }
      if (slot.awayCode && slot.awayCode !== 'None') {
        assignKnockoutTeam(slot.matchId, 'away', slot.awayCode.toUpperCase(), slot.awayName || slot.awayCode);
        filled++;
      }
    }
    setSavedMsg(`SAVED ${filled} SLOT ASSIGNMENTS`);
    setTimeout(() => setSavedMsg(''), 3000);
  };

  // Quick-fill with group stage results
  const handleQuickFill = () => {
    const suggestions = generateBracketSuggestions();
    const newSlots = matchSlots.map(slot => {
      const sug = suggestions.find((s: { matchId: number }) => s.matchId === slot.matchId);
      if (sug) {
        return {
          ...slot,
          homeCode: sug.homeTeam.code === 'TBD' ? '' : sug.homeTeam.code,
          homeName: sug.homeTeam.name === 'TBD' ? '' : sug.homeTeam.name,
          awayCode: sug.awayTeam.code === 'TBD' ? '' : sug.awayTeam.code,
          awayName: sug.awayTeam.name === 'TBD' ? '' : sug.awayTeam.name,
        };
      }
      return slot;
    });
    setMatchSlots(newSlots);
  };

  // Parse bulk text input (format: "MEX vs NED" one per line)
  const handleParseBulk = () => {
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const newSlots = [...matchSlots];
    lines.forEach((line, idx) => {
      if (idx >= 16) return;
      const patterns = [
        /^(.+?)\s+(?:\d+[-–]\d+\s+)?vs\s+(.+)$/i,
        /^(.+?)\s+\d+[-–]\d+\s+(.+)$/,
      ];
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) {
          const home = match[1].trim();
          const away = match[2].trim();
          const homeCode = mapTeamName(home) || home.toUpperCase();
          const awayCode = mapTeamName(away) || away.toUpperCase();
          newSlots[idx] = {
            ...newSlots[idx],
            homeCode,
            homeName: homeCode,
            awayCode,
            awayName: awayCode,
          };
          break;
        }
      }
    });
    setMatchSlots(newSlots);
    setBulkText('');
  };

  // Clear all R32 slots
  const handleClear = () => {
    if (!confirm('CLEAR ALL R32 SLOT ASSIGNMENTS?')) return;
    const matrix = getMatrix();
    for (const id of R32_IDS) {
      const idx = matrix.findIndex(m => m.id === id);
      if (idx !== -1) {
        matrix[idx] = { ...matrix[idx], homeTeam: 'None', homeTeamName: 'None', awayTeam: 'None', awayTeamName: 'None' };
      }
    }
    try { localStorage.setItem('wc2026_match_matrix', JSON.stringify(matrix)); } catch { /* ignore */ }
    refresh();
    setSavedMsg('CLEARED ALL R32 SLOTS');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  const filledCount = matchSlots.filter(s => s.homeCode && s.awayCode).length;

  return (
    <div className="retro-card p-4" style={{ borderColor: '#E60012' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-pixel text-[10px] flex items-center gap-2" style={{ color: '#E60012' }}>
          <Trophy className="w-3 h-3" /> ROUND OF 32 EDITOR
        </h3>
        <div className="flex gap-2">
          {filledCount > 0 && (
            <span className="font-pixel text-[7px] px-2 py-1" style={{ backgroundColor: 'rgba(230,0,18,0.2)', color: '#E60012' }}>
              {filledCount}/16 FILLED
            </span>
          )}
          <button onClick={toggleOpen}
            className="pixel-btn small" style={{ borderColor: '#E60012', color: '#E60012' }}>
            {isOpen ? 'HIDE' : 'EDIT'}
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="mb-3 p-2 text-center" style={{ backgroundColor: 'rgba(0,170,0,0.15)', border: '1px solid #00AA00' }}>
          <span className="font-pixel text-[8px]" style={{ color: '#00AA00' }}>{savedMsg}</span>
        </div>
      )}

      {!isOpen && (
        <p className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
          Manually set all 16 Round of 32 matchups. Use this if the auto-seed produced wrong pairings.
        </p>
      )}

      {isOpen && (
        <div className="space-y-3">
          {/* Bulk paste */}
          <div className="p-2" style={{ backgroundColor: 'rgba(45,49,146,0.1)', border: '1px solid #0F3460' }}>
            <p className="font-pixel text-[7px] mb-1" style={{ color: '#00c8ff' }}>BULK PASTE (16 lines, one match per line)</p>
            <p className="font-pixel text-[6px] mb-1" style={{ color: '#8899AA' }}>
              Format: &quot;MEX vs NED&quot; (line 1 = R32-1, line 2 = R32-2, etc.)
            </p>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={`MEX vs NED\nARG vs DEN\nBRA vs CRO`}
              className="pixel-input w-full text-[10px] resize-none" rows={4} />
            <div className="flex gap-2 mt-1">
              <button onClick={handleParseBulk} disabled={!bulkText.trim()}
                className="pixel-btn small" style={{ borderColor: '#00c8ff', color: '#00c8ff' }}>PARSE & FILL</button>
              <button onClick={handleQuickFill}
                className="pixel-btn small" style={{ borderColor: '#FFD700', color: '#FFD700' }}>QUICK-FILL FROM GROUPS</button>
              <button onClick={handleClear}
                className="pixel-btn red small text-[6px]">CLEAR ALL</button>
            </div>
          </div>

          {/* Individual match editors */}
          <div className="space-y-1 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-12 gap-1 px-1 font-pixel text-[6px]" style={{ color: '#8899AA' }}>
              <div className="col-span-1">#</div>
              <div className="col-span-2">HOME CODE</div>
              <div className="col-span-3">HOME NAME</div>
              <div className="col-span-2">AWAY CODE</div>
              <div className="col-span-3">AWAY NAME</div>
              <div className="col-span-1">ID</div>
            </div>
            {matchSlots.map((slot, i) => (
              <div key={slot.matchId} className="grid grid-cols-12 gap-1 px-1 py-1 items-center"
                style={{ backgroundColor: slot.homeCode && slot.awayCode ? 'rgba(0,170,0,0.05)' : 'rgba(230,0,18,0.05)', border: '1px solid #0F3460' }}>
                <div className="col-span-1 font-pixel text-[7px]" style={{ color: '#FFD700' }}>{i + 1}</div>
                <input type="text" value={slot.homeCode}
                  onChange={e => updateSlot(slot.matchId, 'homeCode', e.target.value.toUpperCase())}
                  placeholder="MEX" maxLength={3}
                  className="col-span-2 pixel-input text-[8px] py-1 px-1" />
                <input type="text" value={slot.homeName}
                  onChange={e => updateSlot(slot.matchId, 'homeName', e.target.value)}
                  placeholder="Mexico"
                  className="col-span-3 pixel-input text-[8px] py-1 px-1" />
                <input type="text" value={slot.awayCode}
                  onChange={e => updateSlot(slot.matchId, 'awayCode', e.target.value.toUpperCase())}
                  placeholder="NED" maxLength={3}
                  className="col-span-2 pixel-input text-[8px] py-1 px-1" />
                <input type="text" value={slot.awayName}
                  onChange={e => updateSlot(slot.matchId, 'awayName', e.target.value)}
                  placeholder="Netherlands"
                  className="col-span-3 pixel-input text-[8px] py-1 px-1" />
                <div className="col-span-1 font-pixel text-[5px]" style={{ color: '#556677' }}>{slot.matchId}</div>
              </div>
            ))}
          </div>

          {/* Apply button */}
          <button onClick={handleApply}
            className="pixel-btn green w-full flex items-center justify-center gap-2">
            <Check className="w-3 h-3" /> SAVE ALL R32 MATCHUPS TO MATRIX
          </button>
        </div>
      )}
    </div>
  );
}
