import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { getAllTeams, TEAM_FLAGS, TEAM_NAMES, KNOWN_PLAYERS, DEFAULT_SETTINGS } from '@/data/tournament';
import type { Tier, Wager } from '@/data/tournament';
import { parseRawScores, mergeScrapedResults, mapTeamName, mapTeamName as mapTeamCode } from '@/data/firecrawl';
import { getStoredToken as getFDToken, storeToken as storeFDToken, fetchWorldCupMatches } from '@/data/footballdata';
import { generateResultsPreview } from '@/data/resultsEngine';
import type { TournamentResults } from '@/data/tournament';
import type { Match } from '@/data/fixtures';
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

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'managers' | 'tiers' | 'results' | 'sync' | 'settings' | 'degen-den'>('managers');
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
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
      const preview = generateResultsPreview(matches);
      setDerivedResults(preview.results);
      setDerivedPreview({
        groupSummaries: preview.groupSummaries,
        knockoutSummary: preview.knockoutSummary,
        teamsUpdated: preview.teamsUpdated,
      });
      setShowResultsPreview(true);
      // Auto-apply and save fetched results
      dispatch({ type: 'SET_RESULTS', payload: preview.results });
      await saveResults(preview.results);
      console.log('[ADMIN] Fetched results auto-applied:', preview.teamsUpdated, 'teams');
    }

    setFdResult({ matches: matches.length, errors, method });
    setIsFdFetching(false);
  };

  const handleApplyDerivedResults = async () => {
    if (!derivedResults) return;
    // Dispatch to React state (immediate standings update)
    dispatch({ type: 'SET_RESULTS', payload: derivedResults });
    // Explicitly persist to localStorage + Firebase (belt and suspenders)
    await saveResults(derivedResults);
    // Save timestamp for Standings page display
    localStorage.setItem('wc2026_derived_at', new Date().toISOString());
    console.log('[ADMIN] Results saved explicitly:', Object.keys(derivedResults).length, 'teams');
    setSyncStatus({ message: `APPLIED & SAVED RESULTS FOR ${derivedPreview?.teamsUpdated || 0} TEAMS`, type: 'success' });
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

  const handleApplyPastedScores = () => {
    if (!pastePreview || pastePreview.length === 0) return;

    // Convert ScrapedMatch[] (full names) → Match[] (3-letter codes) for the results engine
    // Deduplicate: keep only the LAST occurrence of each home+away pair (so re-pasting updates, not adds)
    const matchMap = new Map<string, Match>();
    for (const s of pastePreview) {
      const homeCode = mapTeamCode(s.homeTeam);
      const awayCode = mapTeamCode(s.awayTeam);
      if (homeCode && awayCode) {
        const key = `${homeCode}|${awayCode}`;
        matchMap.set(key, {
          id: Date.now() + Math.random(),
          date: new Date().toISOString(),
          homeTeam: homeCode,
          awayTeam: awayCode,
          homeGoals: s.homeGoals,
          awayGoals: s.awayGoals,
          status: 'FT',
          round: 'Group Stage',
          venue: 'TBD',
        });
      }
    }
    const convertedMatches = Array.from(matchMap.values());

    // Also merge into fixture cache for Training Ground display
    const cached = localStorage.getItem('wc2026_fixtures');
    if (cached) {
      try {
        const existing = JSON.parse(cached);
        const merged = mergeScrapedResults(existing, pastePreview);
        localStorage.setItem('wc2026_fixtures', JSON.stringify(merged));
        localStorage.setItem('wc2026_data_source', 'firecrawl');
        localStorage.setItem('wc2026_fixtures_last_fetch', Date.now().toString());
      } catch { /* ignore cache merge errors */ }
    }

    // Derive results from the converted matches and show preview
    if (convertedMatches.length > 0) {
      const preview = generateResultsPreview(convertedMatches);
      setDerivedResults(preview.results);
      setDerivedPreview({
        groupSummaries: preview.groupSummaries,
        knockoutSummary: preview.knockoutSummary,
        teamsUpdated: preview.teamsUpdated,
      });
      setShowResultsPreview(true);
    }

    setPastePreview(null);
    setPasteText('');
    setSyncStatus({ message: `PARSED ${convertedMatches.length}/${pastePreview.length} SCORES — REVIEW PREVIEW BELOW`, type: 'success' });
    setTimeout(() => setSyncStatus(null), 4000);
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

            {/* Info */}
            <div className="p-3" style={{ backgroundColor: 'rgba(45,49,146,0.1)', borderLeft: '4px solid #2D3192' }}>
              <p className="text-[10px]" style={{ color: '#8899AA' }}>
                <strong style={{ color: '#E8E8E8' }}>How it works:</strong> The Results Engine reads match scores,
                calculates group standings and knockout progress, then generates TournamentResults.
                Click APPLY TO SCORING SYSTEM to update all manager scores.
                FETCH requires a one-time proxy deploy. Paste Scores works immediately.
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
