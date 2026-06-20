import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Lock, CalendarDays, Trophy, ChevronDown, ChevronUp, ChevronLeft, X, Clock, Swords, Activity, TrendingUp, User, RefreshCw, Globe } from 'lucide-react';
import type { Match } from '@/data/fixtures';
import {
  fetchFixtures, getNext5Days, getPreviousGames,
  formatMatchTime, formatMatchDate, getGroupStandings,
  TEAM_FLAGS, TEAM_NAMES, WC2026_GROUPS,
} from '@/data/fixtures';
import { refreshScoresFromScrape, getDataSourceLabel, getLastScrape } from '@/data/firecrawl';

const TG_PASSWORD = 'Dansucks123!';
const C = {
  bg: '#0d0418', card: 'rgba(30, 10, 64, 0.95)', border: '#4a2080',
  borderHover: '#7c43bd', text: '#e8d5f5', muted: '#a080cc', dim: '#6a5090',
  accent: '#c880ff', gold: '#c9a227', green: '#2a9d8f', red: '#e76f51',
  inputBg: 'rgba(15, 5, 25, 0.95)',
};

/* ── Match Row Component ── */
function MatchRow({ match }: { match: Match }) {
  const isLive = match.status === '1H' || match.status === '2H' || match.status === 'HT' || match.status === 'ET';
  const isNS = match.status === 'NS';

  return (
    <div className="flex items-center gap-2 py-2 px-3" style={{ borderBottom: '1px solid rgba(74,32,128,0.2)' }}>
      <div className="w-16 shrink-0">
        <span className="font-pixel text-[7px]" style={{ color: isLive ? '#00ff88' : C.dim }}>
          {isLive ? <><Activity className="w-3 h-3 inline animate-pulse" /> LIVE</>
            : isNS ? formatMatchDate(match.date)
            : 'FT'}
        </span>
        <span className="font-pixel text-[6px] block" style={{ color: C.dim }}>
          {formatMatchTime(match.date)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{TEAM_FLAGS[match.homeTeam] || '🏳️'}</span>
            <span className="font-pixel text-[9px] truncate" style={{ color: C.text }}>{TEAM_NAMES[match.homeTeam] || match.homeTeam}</span>
          </div>
          <span className="font-pixel text-xs w-6 text-right" style={{ color: isLive ? '#00ff88' : C.text }}>
            {match.homeGoals !== null ? match.homeGoals : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base">{TEAM_FLAGS[match.awayTeam] || '🏳️'}</span>
            <span className="font-pixel text-[9px] truncate" style={{ color: C.muted }}>{TEAM_NAMES[match.awayTeam] || match.awayTeam}</span>
          </div>
          <span className="font-pixel text-xs w-6 text-right" style={{ color: isLive ? '#00ff88' : C.text }}>
            {match.awayGoals !== null ? match.awayGoals : '-'}
          </span>
        </div>
      </div>
      <div className="w-20 shrink-0 text-right">
        <span className="font-pixel text-[6px]" style={{ color: C.dim }}>{match.round}</span>
      </div>
    </div>
  );
}

/* ── Fixtures Modal ── */
function FixturesModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'previous'>('upcoming');
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFixtures().then(data => {
      setMatches(data);
      setLoading(false);
    });
  }, []);

  const upcoming = getNext5Days(matches);
  const previous = getPreviousGames(matches);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(10, 4, 24, 0.92)' }} onClick={onClose}>
      <div className="w-full max-w-lg relative" style={{ background: C.card, border: `3px solid ${C.border}`, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0" style={{ borderBottom: `2px solid ${C.border}` }}>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" style={{ color: C.accent }} />
            <h2 className="font-pixel text-sm" style={{ color: C.accent }}>MATCH CENTER</h2>
          </div>
          <button onClick={onClose} className="p-1" style={{ color: C.dim }}><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0" style={{ borderBottom: `1px solid ${C.border}` }}>
          {(['upcoming', 'previous'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 font-pixel text-[9px]"
              style={{
                backgroundColor: activeTab === tab ? 'rgba(106,27,154,0.3)' : 'transparent',
                color: activeTab === tab ? C.accent : C.dim,
                borderBottom: activeTab === tab ? `3px solid ${C.accent}` : '3px solid transparent',
              }}>
              {tab === 'upcoming' ? <><Clock className="w-3 h-3 inline mr-1" />NEXT 5 DAYS ({upcoming.length})</>
                : <><ChevronLeft className="w-3 h-3 inline mr-1" />PREVIOUS ({previous.length})</>}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="w-6 h-6 mx-auto mb-2 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
              <p className="font-pixel text-[8px]" style={{ color: C.dim }}>LOADING FIXTURES...</p>
            </div>
          ) : activeTab === 'upcoming' ? (
            upcoming.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-pixel text-[8px]" style={{ color: C.dim }}>NO UPCOMING MATCHES IN THE NEXT 5 DAYS</p>
              </div>
            ) : (
              <div>{upcoming.map(m => <MatchRow key={m.id} match={m} />)}</div>
            )
          ) : (
            previous.length === 0 ? (
              <div className="text-center py-8">
                <p className="font-pixel text-[8px]" style={{ color: C.dim }}>NO PREVIOUS MATCHES YET</p>
              </div>
            ) : (
              <div>{previous.map(m => <MatchRow key={m.id} match={m} />)}</div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Standings Mini View ── */
function MiniStandings({ matches, currentManagerTeam }: { matches: Match[]; currentManagerTeam?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const standings = getGroupStandings(matches);
  const displayCount = expanded ? standings.length : Math.min(10, standings.length);

  return (
    <div className="retro-card p-0 overflow-hidden">
      <div className="p-4" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between">
          <h2 className="font-pixel text-sm flex items-center gap-2" style={{ color: C.gold }}>
            <Trophy className="w-4 h-4" /> STANDINGS
          </h2>
          <span className="font-pixel text-[7px]" style={{ color: C.dim }}>{standings.length} TEAMS</span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 gap-1 px-3 py-2 font-pixel text-[6px]" style={{ backgroundColor: 'rgba(45,49,146,0.2)', color: C.dim }}>
        <div className="col-span-1">#</div>
        <div className="col-span-4">TEAM</div>
        <div className="col-span-1 text-center">P</div>
        <div className="col-span-1 text-center">W</div>
        <div className="col-span-1 text-center">D</div>
        <div className="col-span-1 text-center">L</div>
        <div className="col-span-1 text-center">GD</div>
        <div className="col-span-2 text-center">PTS</div>
      </div>

      {/* Table rows */}
      {standings.slice(0, displayCount).map((s, i) => {
        const isPlayerTeam = currentManagerTeam?.includes(s.team);
        return (
          <div key={s.team}
            className="grid grid-cols-12 gap-1 px-3 py-2 items-center"
            style={{
              backgroundColor: isPlayerTeam ? 'rgba(255,215,0,0.08)' : i % 2 === 0 ? 'rgba(10,4,24,0.3)' : 'transparent',
              borderLeft: isPlayerTeam ? '3px solid #FFD700' : '3px solid transparent',
              borderBottom: '1px solid rgba(74,32,128,0.15)',
            }}>
            <div className="col-span-1 font-pixel text-[8px]" style={{ color: i < 3 ? '#FFD700' : C.dim }}>{i + 1}</div>
            <div className="col-span-4 flex items-center gap-1.5">
              <span className="text-sm">{TEAM_FLAGS[s.team] || '🏳️'}</span>
              <span className="font-pixel text-[8px] truncate" style={{ color: isPlayerTeam ? '#FFD700' : C.text }}>
                {TEAM_NAMES[s.team] || s.team}
                {isPlayerTeam && <User className="w-3 h-3 inline ml-1" style={{ color: '#FFD700' }} />}
              </span>
            </div>
            <div className="col-span-1 font-pixel text-[8px] text-center" style={{ color: C.muted }}>{s.played}</div>
            <div className="col-span-1 font-pixel text-[8px] text-center" style={{ color: C.green }}>{s.won}</div>
            <div className="col-span-1 font-pixel text-[8px] text-center" style={{ color: C.gold }}>{s.drawn}</div>
            <div className="col-span-1 font-pixel text-[8px] text-center" style={{ color: C.red }}>{s.lost}</div>
            <div className="col-span-1 font-pixel text-[8px] text-center" style={{ color: s.gd >= 0 ? C.green : C.red }}>{s.gd > 0 ? '+' : ''}{s.gd}</div>
            <div className="col-span-2 font-pixel text-[10px] text-center" style={{ color: C.gold }}>{s.points}</div>
          </div>
        );
      })}

      {/* Expand button */}
      {standings.length > 10 && (
        <button onClick={() => setExpanded(!expanded)}
          className="w-full py-3 flex items-center justify-center gap-2 font-pixel text-[8px]"
          style={{ color: C.accent, borderTop: `1px solid ${C.border}` }}>
          {expanded ? <><ChevronUp className="w-3 h-3" />SHOW TOP 10</>
            : <><ChevronDown className="w-3 h-3" />SHOW ALL {standings.length} TEAMS</>}
        </button>
      )}
    </div>
  );
}

/* ── Group Stage Overview ── */
function GroupOverview({ matches }: { matches: Match[] }) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  return (
    <div>
      <h2 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: C.accent }}>
        <Swords className="w-4 h-4" /> GROUPS
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {Object.entries(WC2026_GROUPS).map(([group, teams]) => {
          const groupMatches = matches.filter(m => m.round === group);
          const played = groupMatches.filter(m => m.status === 'FT' || m.status === 'AET').length;
          const isSelected = selectedGroup === group;

          return (
            <div key={group}
              className="p-2 cursor-pointer transition-all"
              style={{
                background: isSelected ? 'rgba(106,27,154,0.3)' : 'rgba(30,10,64,0.6)',
                border: isSelected ? `2px solid ${C.accent}` : `1px solid ${C.border}`,
              }}
              onClick={() => setSelectedGroup(isSelected ? null : group)}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-pixel text-[8px]" style={{ color: C.accent }}>{group}</span>
                <span className="font-pixel text-[6px]" style={{ color: C.dim }}>{played}/{groupMatches.length}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {teams.map(t => (
                  <span key={t} className="text-base" title={TEAM_NAMES[t]}>{TEAM_FLAGS[t]}</span>
                ))}
              </div>
              {isSelected && groupMatches.length > 0 && (
                <div className="mt-2 space-y-1" style={{ borderTop: `1px solid ${C.border}`, paddingTop: 4 }}>
                  {groupMatches.map(m => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="font-pixel text-[6px]" style={{ color: C.muted }}>
                        {TEAM_FLAGS[m.homeTeam]} {m.homeGoals !== null ? m.homeGoals : '-'} - {m.awayGoals !== null ? m.awayGoals : '-'} {TEAM_FLAGS[m.awayTeam]}
                      </span>
                      <span className="font-pixel text-[5px]" style={{ color: m.status === 'FT' ? C.green : C.dim }}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Main Page ── */
export default function TrainingGroundPage() {
  const { state } = useGame();
  const navigate = useNavigate();
  const [entered, setEntered] = useState(false);
  const [password, setPassword] = useState('');
  const [shakeGate, setShakeGate] = useState(false);
  const [showFixtures, setShowFixtures] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsIndex, setNewsIndex] = useState(0);
  const [dataSource, setDataSource] = useState(getDataSourceLabel());
  const [lastScraped, setLastScraped] = useState(getLastScrape());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  // News ticker items (simulated)
  const newsItems = [
    'WORLD CUP 2026 IS LIVE!',
    '48 TEAMS COMPETING ACROSS 12 GROUPS',
    'MEXICO, USA, CANADA HOSTING',
    'CHECK OUT THE FIXTURES BELOW',
  ];

  useEffect(() => {
    const saved = localStorage.getItem('tg_access');
    if (saved === 'true') setEntered(true);
  }, []);

  useEffect(() => {
    if (!entered) return;
    setLoading(true);
    fetchFixtures().then(data => {
      setMatches(data);
      setDataSource(getDataSourceLabel());
      setLastScraped(getLastScrape());
      setLoading(false);
    });
  }, [entered]);

  // News ticker rotation
  useEffect(() => {
    const iv = setInterval(() => setNewsIndex(i => (i + 1) % newsItems.length), 4000);
    return () => clearInterval(iv);
  }, [newsItems.length]);

  const handleRefreshScores = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshMsg('');
    const result = await refreshScoresFromScrape();
    setIsRefreshing(false);
    if (result.updated > 0) {
      setRefreshMsg(`${result.updated} scores updated`);
      setDataSource(getDataSourceLabel());
      setLastScraped(getLastScrape());
      // Reload fixtures
      const fresh = await fetchFixtures();
      setMatches(fresh);
    } else if (result.errors.length > 0) {
      setRefreshMsg('No new scores found');
    } else {
      setRefreshMsg('Already up to date');
    }
    setTimeout(() => setRefreshMsg(''), 3000);
  }, []);

  const handlePassword = useCallback(() => {
    if (password === TG_PASSWORD) {
      setEntered(true);
      localStorage.setItem('tg_access', 'true');
    } else {
      setShakeGate(true);
      setTimeout(() => setShakeGate(false), 400);
    }
  }, [password]);

  const currentManager = state.managers.find(m => m.name === state.currentUser);
  const managerTeamCodes = currentManager?.teamCodes || [];

  // Quick stats
  const allMatches = matches.length;
  const playedMatches = matches.filter(m => m.status === 'FT' || m.status === 'AET').length;
  const liveMatches = matches.filter(m => m.status === '1H' || m.status === '2H' || m.status === 'HT').length;
  const upcomingMatches = matches.filter(m => m.status === 'NS').length;

  if (!entered) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className={`w-full max-w-md p-8 ${shakeGate ? 'gate-shake' : ''}`}
          style={{ background: C.card, border: `3px solid ${C.border}`, boxShadow: `0 8px 32px rgba(80,20,160,0.4)` }}>
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 mx-auto mb-4" style={{ color: C.accent }} />
            <h1 className="font-pixel text-lg mb-2 den-glow">TRAINING GROUND</h1>
            <p className="font-pixel text-[8px]" style={{ color: C.dim }}>AUTHORIZED ACCESS ONLY</p>
          </div>
          <div className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePassword()} placeholder="ENTER PASSWORD"
              className="den-input w-full text-center" style={{ textTransform: 'uppercase' }} />
            <button onClick={handlePassword} className="pixel-btn purple w-full"><Lock className="w-4 h-4" />ENTER</button>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-1 mx-auto mt-6 font-pixel text-[7px]" style={{ color: C.dim }}>
            <ChevronLeft className="w-3 h-3" />BACK TO HOME
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen degen-den-bg relative">
      {showFixtures && <FixturesModal onClose={() => setShowFixtures(false)} />}

      {/* News ticker */}
      <div className="w-full py-2 px-4 text-center" style={{ backgroundColor: 'rgba(106,27,154,0.2)', borderBottom: `1px solid ${C.border}` }}>
        <p className="font-pixel text-[8px] animate-pulse" style={{ color: C.accent }}>
          <TrendingUp className="w-3 h-3 inline mr-1" />{newsItems[newsIndex]}
        </p>
      </div>

      <div className="relative" style={{ zIndex: 3 }}>
        {/* Hero */}
        <div className="text-center py-8 px-4">
          <h1 className="font-pixel text-xl md:text-2xl den-glow mb-2">TRAINING GROUND</h1>
          <p className="font-pixel text-[8px]" style={{ color: C.muted }}>WORLD CUP 2026 COMMAND CENTER</p>

          {currentManager && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1" style={{ background: 'rgba(255,215,0,0.1)', border: '1px solid #FFD700' }}>
              <User className="w-3 h-3" style={{ color: '#FFD700' }} />
              <span className="font-pixel text-[8px]" style={{ color: '#FFD700' }}>LOGGED IN: {currentManager.name}</span>
            </div>
          )}
          {/* Data source + refresh */}
          <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
            <span className="font-pixel text-[7px] px-2 py-1 flex items-center gap-1" style={{
              background: dataSource === 'LIVE API' ? 'rgba(0,255,136,0.1)' : dataSource === 'FIRECRAWL' ? 'rgba(255,107,53,0.1)' : 'rgba(100,100,100,0.15)',
              color: dataSource === 'LIVE API' ? '#00ff88' : dataSource === 'FIRECRAWL' ? '#FF6B35' : '#777',
              border: `1px solid ${dataSource === 'LIVE API' ? '#00ff88' : dataSource === 'FIRECRAWL' ? '#FF6B35' : '#444'}`,
            }}>
              <Globe className="w-3 h-3" />
              SOURCE: {dataSource}
            </span>
            {lastScraped && (
              <span className="font-pixel text-[6px]" style={{ color: C.dim }}>
                LAST UPDATE: {new Date(lastScraped).toLocaleString()}
              </span>
            )}
            <button onClick={handleRefreshScores} disabled={isRefreshing}
              className="font-pixel text-[7px] px-2 py-1 flex items-center gap-1 transition-all"
              style={{
                background: isRefreshing ? '#333' : 'rgba(255,107,53,0.15)',
                color: isRefreshing ? '#666' : '#FF6B35',
                border: `1px solid ${isRefreshing ? '#444' : '#FF6B35'}`,
                cursor: isRefreshing ? 'wait' : 'pointer',
              }}>
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'SCRAPING...' : 'REFRESH SCORES'}
            </button>
            {refreshMsg && (
              <span className="font-pixel text-[7px] px-2 py-0.5" style={{ background: 'rgba(0,170,0,0.15)', color: '#00AA00' }}>
                {refreshMsg}
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        {!loading && (
          <div className="max-w-4xl mx-auto px-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: 'MATCHES', value: allMatches, color: C.accent, icon: <CalendarDays className="w-4 h-4" /> },
                { label: 'PLAYED', value: playedMatches, color: C.green, icon: <ChevronLeft className="w-4 h-4" /> },
                { label: 'LIVE', value: liveMatches, color: '#00ff88', icon: <Activity className="w-4 h-4" /> },
                { label: 'UPCOMING', value: upcomingMatches, color: C.gold, icon: <Clock className="w-4 h-4" /> },
              ].map(s => (
                <button key={s.label} onClick={() => setShowFixtures(true)}
                  className="retro-card p-3 text-center hover:opacity-80 transition-opacity">
                  <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
                  <div className="font-pixel text-lg" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-pixel text-[6px]" style={{ color: C.dim }}>{s.label}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
          {/* Fixtures button */}
          <div className="text-center">
            <button onClick={() => setShowFixtures(true)} className="pixel-btn purple px-8">
              <CalendarDays className="w-5 h-5" />OPEN FIXTURES & SCORES
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 mx-auto mb-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.accent, borderTopColor: 'transparent' }} />
              <p className="font-pixel text-[8px]" style={{ color: C.dim }}>LOADING TOURNAMENT DATA...</p>
            </div>
          ) : (
            <>
              {/* Mini standings */}
              <MiniStandings matches={matches} currentManagerTeam={managerTeamCodes} />

              {/* Group overview */}
              <GroupOverview matches={matches} />

              {/* Live / upcoming preview */}
              {liveMatches > 0 && (
                <div className="p-4" style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid #00ff88' }}>
                  <h2 className="font-pixel text-xs mb-3 flex items-center gap-2" style={{ color: '#00ff88' }}>
                    <Activity className="w-4 h-4 animate-pulse" />LIVE NOW
                  </h2>
                  <div className="space-y-2">
                    {matches.filter(m => m.status === '1H' || m.status === '2H' || m.status === 'HT').map(m => (
                      <MatchRow key={m.id} match={m} />
                    ))}
                  </div>
                </div>
              )}

              {/* Next matches */}
              {getNext5Days(matches).slice(0, 5).length > 0 && (
                <div>
                  <h2 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: C.gold }}>
                    <Clock className="w-4 h-4" />COMING UP
                  </h2>
                  <div className="retro-card p-0 overflow-hidden">
                    {getNext5Days(matches).slice(0, 5).map(m => <MatchRow key={m.id} match={m} />)}
                  </div>
                </div>
              )}

              {/* Recent results */}
              {getPreviousGames(matches).slice(0, 5).length > 0 && (
                <div>
                  <h2 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: C.green }}>
                    <ChevronLeft className="w-4 h-4" />RECENT RESULTS
                  </h2>
                  <div className="retro-card p-0 overflow-hidden">
                    {getPreviousGames(matches).slice(0, 5).map(m => <MatchRow key={m.id} match={m} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
