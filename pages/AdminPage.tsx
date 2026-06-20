import { useState, useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import { getAllTeams, TEAM_FLAGS, TEAM_NAMES, KNOWN_PLAYERS, DEFAULT_SETTINGS } from '@/data/tournament';
import type { Tier } from '@/data/tournament';
import { syncResults, loadApiConfig, saveApiConfig } from '@/data/apiSync';
import { Lock, Unlock, Trash2, Users, Settings, Trophy, AlertTriangle, DollarSign, UserX, CreditCard, MessageSquareWarning, RefreshCw, Wifi, WifiOff, Clock, Key } from 'lucide-react';
import type { ApiConfig } from '@/data/apiSync';

const ADMIN_PASSWORD = 'Dansucks123!';

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
  const { state, dispatch, lockDraft, unlockDraft, setManagerPaid, warnManager, resetManagerCode, forceSync, addManager, loadFromCloud, firebaseEnabled, removeManager, saveSettings } = useGame();

  // Auto-load from cloud on mount
  useEffect(() => {
    loadFromCloud().then(count => {
      if (count > 0) console.log('[ADMIN] Auto-loaded', count, 'managers from cloud');
    });
  }, []);

  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [cloudMsg, setCloudMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'managers' | 'tiers' | 'results' | 'sync' | 'settings'>('managers');
  const [apiConfig, setApiConfig] = useState<ApiConfig>(loadApiConfig);
  const [syncStatus, setSyncStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newManagerName, setNewManagerName] = useState('');
  const [message, setMessage] = useState('');
  const [apiStatus, setApiStatus] = useState('');

  // Results form state
  const [resultForm, setResultForm] = useState<Record<string, {
    groupPosition: number; reachedKnockout: boolean; reachedRoundOf16: boolean;
    reachedQuarterFinal: boolean; reachedSemiFinal: boolean; reachedFinal: boolean;
    wonWorldCup: boolean; wonThirdPlace: boolean; eliminated: boolean;
  }>>({});

  const handleSyncFromApi = async () => {
    setApiStatus('SYNCING...');
    const config = loadApiConfig();
    const result = await syncResults(config);
    if (result.errors.length > 0 && result.updated === 0) {
      setApiStatus('SYNC FAILED: ' + result.errors[0]);
    } else if (result.updated > 0) {
      setApiStatus('SYNCED ' + result.updated + ' TEAMS');
    } else {
      setApiStatus('NO FINISHED MATCHES YET');
    }
    setTimeout(() => setApiStatus(''), 4000);
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
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

  const handleWarnManager = (id: string) => {
    warnManager(id);
    setMessage('WARNING ISSUED');
    setTimeout(() => setMessage(''), 1500);
  };

  const handleSetPaid = (id: string, paid: boolean) => {
    setManagerPaid(id, paid);
    setMessage(paid ? 'MARKED PAID' : 'MARKED UNPAID');
    setTimeout(() => setMessage(''), 1500);
  };

  const handleKickUnpaid = async () => {
    const unpaid = state.managers.filter(m => !m.paid);
    if (unpaid.length === 0) { setMessage('NO UNPAID PLAYERS'); setTimeout(() => setMessage(''), 2000); return; }
    if (!confirm(`KICK ${unpaid.length} UNPAID PLAYER${unpaid.length > 1 ? 'S' : ''}?`)) return;
    for (const m of unpaid) { await removeManager(m.id); } // Delete from Firebase cloud
    setMessage(`KICKED ${unpaid.length} PLAYER${unpaid.length > 1 ? 'S' : ''}`);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleSetTopScorerActual = async (name: string, country: string) => {
    const newSettings = { ...state.settings, topScorerActual: { name, country } };
    await saveSettings(newSettings);
    setSyncStatus({ message: 'TOP SCORER SAVED', type: 'success' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  const handleUpdatePayout = async (updates: Partial<typeof state.settings.payout>) => {
    const newSettings = { ...state.settings, payout: { ...state.settings.payout, ...updates } };
    dispatch({ type: 'SET_SETTINGS', payload: newSettings });
    await saveSettings(newSettings);
    setSyncStatus({ message: 'PAYOUT SAVED', type: 'success' });
    setTimeout(() => setSyncStatus(null), 2000);
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setSyncStatus({ message: 'SYNCING...', type: 'info' });

    const { results, updated, errors } = await syncResults(apiConfig);

    if (errors.length > 0 && updated === 0) {
      setSyncStatus({ message: errors[0], type: 'error' });
    } else {
      // Apply the synced results
      Object.entries(results).forEach(([teamCode, result]) => {
        dispatch({ type: 'UPDATE_RESULT', payload: { teamCode, result } });
      });

      const newConfig = { ...apiConfig, lastSync: new Date().toISOString() };
      setApiConfig(newConfig);
      saveApiConfig(newConfig);

      if (errors.length > 0) {
        setSyncStatus({ message: `UPDATED ${updated} TEAMS. NOTE: ${errors[0]}`, type: 'info' });
      } else {
        setSyncStatus({ message: `SUCCESS! UPDATED ${updated} TEAMS.`, type: 'success' });
      }
    }

    setIsSyncing(false);
  };

  const handleUpdateApiConfig = (updates: Partial<ApiConfig>) => {
    const newConfig = { ...apiConfig, ...updates };
    setApiConfig(newConfig);
    saveApiConfig(newConfig);
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
                {state.managers.length} MANAGERS
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {message && (
              <span className="font-pixel text-[8px] px-2 py-1" style={{ backgroundColor: '#00AA00', color: '#F0F0F0' }}>{message}</span>
            )}
            <button onClick={() => setAuthenticated(false)} className="pixel-btn red small">LOGOUT</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {[
            { key: 'managers' as const, label: 'MANAGERS', icon: Users },
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

            {/* Payment Summary */}
            <div className="retro-card p-4 mb-4 flex items-center justify-between" style={{ borderColor: '#FFD700' }}>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" style={{ color: '#FFD700' }} />
                <span className="font-pixel text-[10px]" style={{ color: '#FFD700' }}>
                  {state.managers.filter(m => m.paid).length} / {state.managers.length} PAID
                </span>
              </div>
              <div className="flex gap-2">
                <span className="font-pixel text-[8px] px-2 py-1" style={{ backgroundColor: 'rgba(255,215,0,0.2)', color: '#FFD700' }}>
                  {state.managers.filter(m => (m.warnings || 0) > 0).length} WARNED
                </span>
                <button onClick={handleKickUnpaid} className="pixel-btn red small">
                  <UserX className="w-3 h-3 inline mr-1" /> KICK UNPAID
                </button>
              </div>
            </div>

            {/* Manager List */}
            <div className="retro-card p-0 overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-2 py-2 font-pixel text-[7px]" style={{ backgroundColor: 'rgba(45,49,146,0.3)', color: '#8899AA' }}>
                <div className="col-span-2">TEAM</div>
                <div className="col-span-2">REAL NAME</div>
                <div className="col-span-1">TEAMS</div>
                <div className="col-span-1">SUB</div>
                <div className="col-span-1">PAID</div>
                <div className="col-span-1">CODE</div>
                <div className="col-span-1">TS</div>
                <div className="col-span-1">WARN</div>
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
                  <div className="col-span-1">
                    <button onClick={() => handleSetPaid(m.id, !m.paid)}
                      className="font-pixel text-[7px] px-1 py-0.5"
                      style={{ backgroundColor: m.paid ? '#00AA00' : '#E60012', color: '#F0F0F0' }}>
                      {m.paid ? 'PAID' : 'NO'}
                    </button>
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
                  <div className="col-span-2 text-right flex items-center justify-end gap-1">
                    <button onClick={() => { const newCode = resetManagerCode(m.id); setMessage(`RESET ${m.teamName || m.name} → ${newCode}`); setTimeout(() => setMessage(''), 3000); }}
                      className="p-1" style={{ color: '#2D3192' }} title="Reset code">
                      <Key className="w-3 h-3" />
                    </button>
                    {!m.paid && (
                      <button onClick={() => handleWarnManager(m.id)} className="p-1" style={{ color: '#FFD700' }} title="Send warning">
                        <MessageSquareWarning className="w-3 h-3" />
                      </button>
                    )}
                    {!m.paid && (
                      <button onClick={() => handleRemoveManager(m.id)} className="p-1" style={{ color: '#E60012' }} title="Kick player">
                        <UserX className="w-3 h-3" />
                      </button>
                    )}
                    <button onClick={() => handleRemoveManager(m.id)} className="p-1" style={{ color: '#8899AA' }} title="Remove player">
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
            {/* Sync Status */}
            <div className="retro-card p-4 flex items-center justify-between" style={{ borderColor: apiConfig.autoSync ? '#00AA00' : '#8899AA' }}>
              <div className="flex items-center gap-2">
                {apiConfig.autoSync ? <Wifi className="w-4 h-4" style={{ color: '#00AA00' }} /> : <WifiOff className="w-4 h-4" style={{ color: '#8899AA' }} />}
                <span className="font-pixel text-[10px]" style={{ color: apiConfig.autoSync ? '#00AA00' : '#8899AA' }}>
                  AUTO-SYNC IS {apiConfig.autoSync ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {apiConfig.lastSync && (
                  <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    LAST SYNC: {new Date(apiConfig.lastSync).toLocaleString()}
                  </span>
                )}
              </div>
            </div>

            {/* Provider Selection */}
            <div className="retro-card p-4">
              <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#FFD700' }}>DATA PROVIDER</h3>
              <div className="flex gap-2 mb-3">
                <button onClick={() => handleUpdateApiConfig({ provider: 'manual' })}
                  className="font-pixel text-[8px] px-3 py-2"
                  style={{ backgroundColor: apiConfig.provider === 'manual' ? '#2D3192' : '#1A1A2E', color: apiConfig.provider === 'manual' ? '#FFD700' : '#8899AA', border: '2px solid ' + (apiConfig.provider === 'manual' ? '#FFD700' : '#0F3460') }}>
                  MANUAL
                </button>
                <button onClick={() => handleUpdateApiConfig({ provider: 'api-football' })}
                  className="font-pixel text-[8px] px-3 py-2"
                  style={{ backgroundColor: apiConfig.provider === 'api-football' ? '#2D3192' : '#1A1A2E', color: apiConfig.provider === 'api-football' ? '#FFD700' : '#8899AA', border: '2px solid ' + (apiConfig.provider === 'api-football' ? '#FFD700' : '#0F3460') }}>
                  API-FOOTBALL
                </button>
              </div>

              {apiConfig.provider === 'api-football' && (
                <div className="space-y-2">
                  <label className="font-pixel text-[7px] block" style={{ color: '#8899AA' }}>API KEY (from api-football.com)</label>
                  <input type="password" value={apiConfig.apiKey}
                    onChange={e => handleUpdateApiConfig({ apiKey: e.target.value })}
                    placeholder="YOUR API-FOOTBALL KEY" className="pixel-input w-full text-[10px] py-2 px-3" />
                  <p className="text-[10px]" style={{ color: '#8899AA' }}>
                    Get a free API key at <a href="https://www.api-football.com/" target="_blank" rel="noreferrer" style={{ color: '#2D3192' }}>api-football.com</a>. 100 free calls/day.
                  </p>
                </div>
              )}
            </div>

            {/* Auto-Sync Settings */}
            <div className="retro-card p-4">
              <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#FFD700' }}>
                <Clock className="w-3 h-3 inline mr-1" /> AUTO-SYNC SCHEDULE
              </h3>
              <div className="flex items-center gap-4 mb-3">
                <button onClick={() => handleUpdateApiConfig({ autoSync: !apiConfig.autoSync })}
                  className={`pixel-btn ${apiConfig.autoSync ? 'green' : ''} small`}>
                  {apiConfig.autoSync ? 'ENABLED' : 'DISABLED'}
                </button>
                {apiConfig.autoSync && (
                  <span className="font-pixel text-[8px] animate-blink" style={{ color: '#00AA00' }}>
                    &#9679; WILL AUTO-SYNC EVERY {apiConfig.syncIntervalHours} HOURS
                  </span>
                )}
              </div>

              {apiConfig.autoSync && (
                <div className="flex gap-2">
                  {[1, 6, 12, 24].map(hours => (
                    <button key={hours} onClick={() => handleUpdateApiConfig({ syncIntervalHours: hours })}
                      className="font-pixel text-[7px] px-2 py-1"
                      style={{
                        backgroundColor: apiConfig.syncIntervalHours === hours ? '#2D3192' : '#1A1A2E',
                        color: apiConfig.syncIntervalHours === hours ? '#FFD700' : '#8899AA',
                        border: '2px solid ' + (apiConfig.syncIntervalHours === hours ? '#FFD700' : '#0F3460'),
                      }}>
                      EVERY {hours}H
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Sync */}
            <div className="retro-card p-4" style={{ borderColor: '#FFD700' }}>
              <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#FFD700' }}>MANUAL SYNC</h3>
              <p className="text-[10px] mb-3" style={{ color: '#8899AA' }}>
                Click to fetch the latest match results and update all manager scores immediately.
              </p>
              <button onClick={handleSyncNow} disabled={isSyncing}
                className="pixel-btn gold w-full flex items-center justify-center gap-2">
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'SYNCING...' : 'SYNC NOW'}
              </button>

              {syncStatus && (
                <div className={`mt-3 p-2 font-pixel text-[8px]`}
                  style={{
                    backgroundColor: syncStatus.type === 'success' ? 'rgba(0,170,0,0.15)' : syncStatus.type === 'error' ? 'rgba(230,0,18,0.15)' : 'rgba(45,49,146,0.15)',
                    borderLeft: '4px solid ' + (syncStatus.type === 'success' ? '#00AA00' : syncStatus.type === 'error' ? '#E60012' : '#2D3192'),
                    color: syncStatus.type === 'success' ? '#00AA00' : syncStatus.type === 'error' ? '#E60012' : '#8899AA',
                  }}>
                  {syncStatus.message}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-3" style={{ backgroundColor: 'rgba(45,49,146,0.1)', borderLeft: '4px solid #2D3192' }}>
              <p className="text-[10px]" style={{ color: '#8899AA' }}>
                <strong style={{ color: '#E8E8E8' }}>How it works:</strong> The auto-sync feature connects to a live sports API 
                (API-Football) to fetch finished World Cup 2026 matches. It then automatically updates each team's tournament 
                progress and recalculates all manager scores. Enable auto-sync and set your preferred interval — the system 
                will check for new results automatically.
              </p>
            </div>
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

            {/* API Football Sync */}
            <div className="retro-card p-4" style={{ borderColor: '#00AA00' }}>
              <h3 className="font-pixel text-[10px] mb-2" style={{ color: '#00AA00' }}>&#9917; API-FOOTBALL SYNC</h3>
              <p className="font-pixel text-[7px] mb-3" style={{ color: '#AABBCC' }}>
                Fetch finished match results from API-Football. Free tier: 100 calls/day. Each sync uses ~1-2 calls.
              </p>
              <div className="flex gap-2 items-center">
                <button onClick={handleSyncFromApi} className="pixel-btn gold small">
                  &#8635; SYNC NOW
                </button>
                {apiStatus && (
                  <span className="font-pixel text-[8px]" style={{ color: apiStatus.includes('FAILED') ? '#E60012' : '#00AA00' }}>
                    {apiStatus}
                  </span>
                )}
              </div>
            </div>

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

            {/* Payout Settings */}
            <div className="retro-card p-4">
              <h3 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>
                <DollarSign className="w-3 h-3 inline" /> PAYOUT SETTINGS
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="font-pixel text-[7px] block mb-1" style={{ color: '#8899AA' }}>BUY-IN ({state.settings.payout.currency})</label>
                  <input type="number" value={state.settings.payout.buyIn}
                    onChange={e => handleUpdatePayout({ buyIn: parseInt(e.target.value) || 0 })}
                    className="pixel-input w-full text-[10px] py-1 px-2" />
                </div>
                <div>
                  <label className="font-pixel text-[7px] block mb-1" style={{ color: '#FFD700' }}>1ST %</label>
                  <input type="number" value={state.settings.payout.firstPlacePercent} min={0} max={100}
                    onChange={e => handleUpdatePayout({ firstPlacePercent: parseInt(e.target.value) || 0 })}
                    className="pixel-input w-full text-[10px] py-1 px-2" />
                </div>
                <div>
                  <label className="font-pixel text-[7px] block mb-1" style={{ color: '#C0C0C0' }}>2ND %</label>
                  <input type="number" value={state.settings.payout.secondPlacePercent} min={0} max={100}
                    onChange={e => handleUpdatePayout({ secondPlacePercent: parseInt(e.target.value) || 0 })}
                    className="pixel-input w-full text-[10px] py-1 px-2" />
                </div>
                <div>
                  <label className="font-pixel text-[7px] block mb-1" style={{ color: '#CD7F32' }}>3RD %</label>
                  <input type="number" value={state.settings.payout.thirdPlacePercent} min={0} max={100}
                    onChange={e => handleUpdatePayout({ thirdPlacePercent: parseInt(e.target.value) || 0 })}
                    className="pixel-input w-full text-[10px] py-1 px-2" />
                </div>
              </div>
              <div className="mt-2 font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                TOTAL: {state.settings.payout.firstPlacePercent + state.settings.payout.secondPlacePercent + state.settings.payout.thirdPlacePercent}%
                {state.settings.payout.firstPlacePercent + state.settings.payout.secondPlacePercent + state.settings.payout.thirdPlacePercent !== 100 && (
                  <span style={{ color: '#E60012' }}> (SHOULD BE 100%)</span>
                )}
              </div>
            </div>

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
