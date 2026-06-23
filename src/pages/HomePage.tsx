import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';

import { UserPlus, LogIn, KeyRound, Eye, EyeOff, Trophy } from 'lucide-react';

function SoccerPlayers() {
  const players = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    top: 12 + Math.random() * 76,
    duration: 10 + Math.random() * 6,
    delay: Math.random() * 8,
    direction: i % 2 === 0 ? 'normal' : 'reverse',
    scale: 1.2 + Math.random() * 0.8,
    jersey: ['#E60012', '#2D3192', '#FFD700', '#00AA00', '#FFFFFF'][i],
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {players.map(p => (
        <div key={p.id} className="absolute pixel-player"
          style={{
            top: `${p.top}%`,
            animation: `playerRun ${p.duration}s linear ${p.delay}s infinite ${p.direction}`,
            transform: `scale(${p.scale})`,
          }}>
          {/* Larger 8-bit pixel player */}
          <div className="relative" style={{ width: 32, height: 44 }}>
            {/* Head */}
            <div className="absolute" style={{ width: 12, height: 12, backgroundColor: '#FFCCAA', left: 10, top: 0 }} />
            {/* Hair */}
            <div className="absolute" style={{ width: 12, height: 4, backgroundColor: '#5C3A1E', left: 10, top: 0 }} />
            {/* Body/jersey */}
            <div className="absolute" style={{ width: 18, height: 16, backgroundColor: p.jersey, left: 7, top: 12 }} />
            {/* Jersey number */}
            <div className="absolute font-pixel text-[6px] text-center" style={{ width: 18, left: 7, top: 16, color: '#FFF' }}>
              {String(p.id + 1).padStart(2, '0')}
            </div>
            {/* Shorts */}
            <div className="absolute" style={{ width: 16, height: 8, backgroundColor: '#FFFFFF', left: 8, top: 28 }} />
            {/* Left leg */}
            <div className="absolute player-leg-left" style={{ width: 5, height: 8, backgroundColor: '#FFCCAA', left: 8, top: 36 }} />
            {/* Right leg */}
            <div className="absolute player-leg-right" style={{ width: 5, height: 8, backgroundColor: '#FFCCAA', left: 19, top: 36 }} />
            {/* Soccer ball - black and white panels - LEADS the player (ahead, not chasing) */}
            <div className="absolute" style={{
              width: 10, height: 10,
              left: p.direction === 'normal' ? 38 : -16,
              top: 34,
              background: 'repeating-conic-gradient(#FFFFFF 0deg 90deg #1A1A1A 90deg 180deg)',
              borderRadius: '50%',
              border: '2px solid #333',
            }} />
          </div>
        </div>
      ))}
      <style>{`
        @keyframes playerRun {
          0% { left: -8%; }
          100% { left: 108%; }
        }
        .pixel-player .player-leg-left {
          animation: legRunLeft 0.3s steps(2) infinite;
          transform-origin: top center;
        }
        .pixel-player .player-leg-right {
          animation: legRunRight 0.3s steps(2) infinite;
          transform-origin: top center;
        }
        @keyframes legRunLeft {
          0% { transform: rotate(-15deg) translateX(0); }
          50% { transform: rotate(15deg) translateX(3px); }
          100% { transform: rotate(-15deg) translateX(0); }
        }
        @keyframes legRunRight {
          0% { transform: rotate(15deg) translateX(0); }
          50% { transform: rotate(-15deg) translateX(-3px); }
          100% { transform: rotate(15deg) translateX(0); }
        }
      `}</style>
    </div>
  );
}

function MorphAnimation() {
  return (
    <div className="relative w-24 h-24 md:w-32 md:h-32 mx-auto mb-4">
      <img src="/morph-1.png" alt="" className="absolute inset-0 w-full h-full object-contain morph-frame" style={{ animationDelay: '0s' }} />
      <img src="/morph-4.png" alt="" className="absolute inset-0 w-full h-full object-contain morph-frame" style={{ animationDelay: '0.75s' }} />
      <img src="/morph-2.png" alt="" className="absolute inset-0 w-full h-full object-contain morph-frame" style={{ animationDelay: '1.5s' }} />
      <img src="/morph-3.png" alt="" className="absolute inset-0 w-full h-full object-contain morph-frame" style={{ animationDelay: '2.25s' }} />
    </div>
  );
}

function CountdownTimer() {
  const [time, setTime] = useState(() => {
    const kickoff = new Date('2026-06-11T15:00:00-04:00').getTime();
    const diff = kickoff - Date.now();
    return {
      days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60),
    };
  });
  const [isLive, setIsLive] = useState(() => Date.now() >= new Date('2026-06-11T15:00:00-04:00').getTime());

  useState(() => {
    if (isLive) return;
    const kickoff = new Date('2026-06-11T15:00:00-04:00').getTime();
    const interval = setInterval(() => {
      const diff = kickoff - Date.now();
      if (diff <= 0) { setIsLive(true); clearInterval(interval); return; }
      setTime({ days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60) });
    }, 1000);
    return () => clearInterval(interval);
  });

  if (isLive) return <div className="font-pixel text-sm md:text-lg animate-pulse" style={{ color: '#00AA00' }}>TOURNAMENT LIVE!</div>;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 font-pixel text-[10px] md:text-sm" style={{ color: '#FFD700' }}>
      <span>KICKOFF IN:</span>
      {(['days','hours','minutes','seconds'] as const).map((unit, i) => (
        <div key={unit} className="flex items-center gap-1">
          <div className="px-2 py-1 font-pixel text-xs md:text-base" style={{ backgroundColor: 'rgba(12,18,30,0.95)', border: '2px solid #FFD700' }}>
            {pad(time[unit])}
          </div>
          {i < 3 && <span className="text-xs">:</span>}
        </div>
      ))}
    </div>
  );
}

type ViewMode = 'home' | 'register' | 'login';

export default function HomePage() {
  const navigate = useNavigate();
  const { state, setUser, addManager, getManagerByNameAndPin } = useGame();
  const [view, setView] = useState<ViewMode>('home');

  // Register fields
  const [teamName, setTeamName] = useState('');
  const [realName, setRealName] = useState('');
  const [pincode, setPincode] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [regError, setRegError] = useState('');

  // Login fields
  const [loginName, setLoginName] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleRegister = async () => {
    setRegError('');
    const tn = teamName.trim().toUpperCase().slice(0, 16);
    const rn = realName.trim().toUpperCase().slice(0, 12);
    const pn = pincode.trim();
    const cp = confirmPin.trim();

    if (!tn) { setRegError('ENTER TEAM NAME'); return; }
    if (!rn) { setRegError('ENTER USERNAME'); return; }
    if (pn.length !== 4 || !/^\d{4}$/.test(pn)) { setRegError('PINCODE MUST BE 4 DIGITS'); return; }
    if (pn !== cp) { setRegError('PINCODES DO NOT MATCH'); return; }
    if (state.managers.some(m => m.name === tn)) { setRegError('TEAM NAME TAKEN'); return; }

    setUser(tn);
    await addManager(tn, tn, rn, pn);
    navigate('/draft');
  };

  const handleLogin = () => {
    setLoginError('');
    const name = loginName.trim().toUpperCase();
    const pin = loginPin.trim();

    if (!name) { setLoginError('ENTER TEAM NAME'); return; }
    if (pin.length !== 4) { setLoginError('ENTER 4-DIGIT PINCODE'); return; }

    const manager = getManagerByNameAndPin(name, pin);
    if (!manager) {
      setLoginError('INVALID NAME OR PINCODE');
      return;
    }
    setUser(manager.name);
    navigate('/draft');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden pixel-bg">
      <div className="absolute inset-0 scanlines z-[5]" />
      <SoccerPlayers />

      <div className="relative z-20 flex flex-col items-center max-w-2xl w-full py-8">
        <MorphAnimation />

        <h1 className="font-pixel text-xl md:text-3xl lg:text-4xl text-center glitch mb-2" data-text="DEGEN WORLD CUP 2026"
          style={{ color: '#FFD700', textShadow: '4px 4px 0px rgba(0,0,0,0.5), 0px 0px 20px rgba(255,215,0,0.3)' }}>
          DEGEN WORLD CUP 2026
        </h1>

        <p className="font-pixel text-[10px] md:text-sm mb-6 tracking-widest" style={{ color: '#AABBCC' }}>
          FANTASY WORLD CUP DRAFT
        </p>

        {/* Confirmation Banner */}
        <div className="retro-card p-4 w-full max-w-lg mb-6" style={{ borderColor: '#FFD700', borderLeftWidth: 6 }}>
          <p className="font-pixel text-[9px] text-center leading-relaxed" style={{ color: '#FFD700' }}>
            YOU HAVE 48 HOURS TO CONFIRM INTEREST IN PLAYING.
          </p>
          <p className="font-pixel text-[8px] text-center mt-2" style={{ color: '#E60012' }}>
            FAIL TO CONFIRM = <strong>BOOTED</strong>. NO EXCEPTIONS.
          </p>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="w-full max-w-sm flex flex-col items-center gap-3 mb-6">

          {state.currentUser ? (
            <div className="flex flex-col items-center gap-3">
              <div className="font-pixel text-sm" style={{ color: '#FFD700' }}>WELCOME, {state.currentUser}!</div>
              <button onClick={() => navigate('/draft')} className="pixel-btn gold">GO TO DRAFT &#8594;</button>
              <button onClick={() => { setUser(null); }} className="font-pixel text-[8px]" style={{ color: '#AABBCC' }}>
                LOG OUT
              </button>
            </div>
          ) : view === 'register' ? (
            <>
              <p className="font-pixel text-xs" style={{ color: '#33FF33' }}>&#9660; CREATE YOUR ACCOUNT</p>

              <input type="text" value={teamName} onChange={e => setTeamName(e.target.value.toUpperCase())}
                placeholder="TEAM NAME (e.g. BEER FC)" maxLength={16} className="pixel-input w-full text-[10px] text-left" />

              <input type="text" value={realName} onChange={e => setRealName(e.target.value.toUpperCase())}
                placeholder="USERNAME" maxLength={12} className="pixel-input w-full text-[10px] text-left" />

              <div className="w-full flex items-center gap-2">
                <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD700' }} />
                <input type={showPin ? 'text' : 'password'} value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CREATE 4-DIGIT PIN" maxLength={4} className="pixel-input flex-1 text-[10px] text-center tracking-widest" />
                <button onClick={() => setShowPin(!showPin)} className="p-1">
                  {showPin ? <EyeOff className="w-3 h-3" style={{ color: '#AABBCC' }} /> : <Eye className="w-3 h-3" style={{ color: '#AABBCC' }} />}
                </button>
              </div>

              <div className="w-full flex items-center gap-2">
                <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD700' }} />
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CONFIRM 4-DIGIT PIN" maxLength={4} className="pixel-input flex-1 text-[10px] text-center tracking-widest" />
              </div>
              <p className="font-pixel text-[7px] w-full text-left pl-5" style={{ color: '#AABBCC' }}>
                Your 4-digit PIN is your login credential. Don't forget it!
              </p>

              {regError && <p className="font-pixel text-[8px]" style={{ color: '#E60012' }}>{regError}</p>}

              <button onClick={handleRegister}
                disabled={!teamName.trim() || !realName.trim() || pincode.length !== 4 || confirmPin.length !== 4}
                className="pixel-btn gold w-full">
                <UserPlus className="w-3 h-3" /> CREATE ACCOUNT
              </button>
              <button onClick={() => setView('home')} className="font-pixel text-[8px]" style={{ color: '#AABBCC' }}>
                &#8592; BACK
              </button>
            </>
          ) : view === 'login' ? (
            <>
              <p className="font-pixel text-xs" style={{ color: '#FFD700' }}>LOG IN TO YOUR TEAM</p>

              <input type="text" value={loginName} onChange={e => setLoginName(e.target.value.toUpperCase())}
                placeholder="TEAM NAME" maxLength={16} className="pixel-input w-full text-[10px] text-left" />

              <div className="w-full flex items-center gap-2">
                <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD700' }} />
                <input type="password" value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="YOUR 4-DIGIT PIN" maxLength={4} className="pixel-input flex-1 text-[10px] text-center tracking-widest" />
              </div>

              {loginError && <p className="font-pixel text-[8px]" style={{ color: '#E60012' }}>{loginError}</p>}

              <button onClick={handleLogin}
                disabled={!loginName.trim() || loginPin.length !== 4}
                className="pixel-btn gold w-full">
                <LogIn className="w-3 h-3" /> LOG IN
              </button>
              <button onClick={() => setView('home')} className="font-pixel text-[8px]" style={{ color: '#AABBCC' }}>
                &#8592; BACK
              </button>
            </>
          ) : (
            <>
              <p className="font-pixel text-xs animate-blink mb-2" style={{ color: '#33FF33' }}>&#9660; SELECT AN OPTION</p>

              <button onClick={() => setView('register')} className="pixel-btn gold w-full">
                <UserPlus className="w-3 h-3" /> NEW PLAYER
              </button>

              <button onClick={() => setView('login')} className="pixel-btn w-full" style={{ borderColor: '#2D3192', color: '#F0F0F0' }}>
                <LogIn className="w-3 h-3" /> RETURNING PLAYER
              </button>

              {state.managers.length > 0 && (
                <p className="font-pixel text-[8px] mt-2" style={{ color: '#AABBCC' }}>
                  {state.managers.length} MANAGER{state.managers.length !== 1 ? 'S' : ''} REGISTERED
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-2"><CountdownTimer /></div>

        {/* Full Standings Table */}
        <div className="mt-8 w-full">
          <HomeStandingsTable />
        </div>
      </div>

      <div className="relative z-20 w-full mt-10 py-3 flex items-center justify-around" style={{ backgroundColor: 'rgba(12,18,30,0.95)', borderTop: '4px solid #2D3192' }}>
        {[{ label: '48 TEAMS', icon: '🌍' }, { label: '12 GROUPS', icon: '⚽' }, { label: 'JUN 11 - JUL 19', icon: '📅' }].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-base">{item.icon}</span>
            <span className="font-pixel text-[10px] md:text-xs" style={{ color: '#F0F0F0' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeStandingsTable() {
  const navigate = useNavigate();
  const { state, getTeamsForManager, getScoreForManager } = useGame();

  const managerScores = useMemo(() => {
    return state.managers.map(m => {
      const score = getScoreForManager(m.id);
      return { ...m, ...score };
    }).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.teamsAlive !== a.teamsAlive) return b.teamsAlive - a.teamsAlive;
      if (b.semiFinalists !== a.semiFinalists) return b.semiFinalists - a.semiFinalists;
      if (b.finalists !== a.finalists) return b.finalists - a.finalists;
      if (b.hasChampion !== a.hasChampion) return b.hasChampion ? 1 : -1;
      return 0;
    });
  }, [state.managers, state.results, state.settings, getScoreForManager]);

  const rankColor = (idx: number) => {
    if (idx === 0) return '#FFD700';
    if (idx === 1) return '#C0C0C0';
    if (idx === 2) return '#CD7F32';
    return '#8899AA';
  };

  if (managerScores.length === 0) return null;

  return (
    <div>
      {/* Header */}
      <h2 className="font-pixel text-sm mb-3 flex items-center gap-2" style={{ color: '#FFD700' }}>
        <Trophy className="w-4 h-4" style={{ color: '#FFD700' }} />
        LIVE STANDINGS
      </h2>

      <div className="space-y-1">
        {/* Desktop Header */}
        <div className="hidden md:grid md:grid-cols-12 md:gap-2 px-4 py-2 font-pixel text-[7px]" style={{ color: '#8899AA' }}>
          <div className="col-span-1">#</div>
          <div className="col-span-5">MANAGER</div>
          <div className="col-span-2 text-center">POINTS</div>
          <div className="col-span-1 text-center">ALIVE</div>
          <div className="col-span-1 text-center">SF</div>
          <div className="col-span-1 text-center">F</div>
          <div className="col-span-1 text-center">BEST</div>
        </div>

        {managerScores.map((mgr, idx) => {
          const teams = getTeamsForManager(mgr.id);
          const topTeam = teams.length > 0 ? teams.sort((a, b) => b.points - a.points)[0] : null;
          const isCurrent = mgr.name === state.currentUser;

          return (
            <div key={mgr.id}
              onClick={() => navigate(`/manager/${mgr.name}`)}
              className="cursor-pointer"
              style={{
                padding: '10px 12px',
                backgroundColor: isCurrent ? 'rgba(15,52,96,0.4)' : 'rgba(10,10,20,0.6)',
                border: isCurrent ? '1px solid #FFD700' : '1px solid #1A1A2E',
                borderLeftWidth: isCurrent ? '3px' : '1px',
                borderLeftColor: isCurrent ? '#FFD700' : '#1A1A2E',
              }}>
              {/* Mobile */}
              <div className="md:hidden">
                <div className="flex items-center gap-2">
                  <span className="font-pixel text-[10px] w-5 flex-shrink-0 text-center" style={{ color: rankColor(idx) }}>
                    {idx + 1}
                  </span>
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-pixel text-[9px]"
                    style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
                    {(mgr.teamName || mgr.name)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-pixel text-[11px] truncate" style={{ color: '#FFD700' }}>
                      {mgr.teamName || mgr.name}
                    </div>
                    {mgr.realName && (
                      <div className="font-pixel text-[8px] truncate" style={{ color: '#8899AA' }}>{mgr.realName}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="font-pixel text-lg" style={{ color: '#FFD700' }}>{mgr.total}</span>
                    {mgr.topScorerCorrect && (
                      <span className="font-pixel text-[6px] px-1" style={{ backgroundColor: '#FFD700', color: '#1A1A2E' }}>+5</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-1.5 ml-7">
                  <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    ALIVE <span style={{ color: mgr.teamsAlive > 0 ? '#00AA00' : '#E60012' }}>{mgr.teamsAlive}</span>
                  </span>
                  <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    SF <span style={{ color: '#E8E8E8' }}>{mgr.semiFinalists}</span>
                  </span>
                  <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    F <span style={{ color: mgr.finalists > 0 ? '#FFD700' : '#8899AA' }}>{mgr.finalists}</span>
                  </span>
                  {topTeam && (
                    <span className="font-pixel text-[7px] ml-auto" style={{ color: '#8899AA' }}>
                      BEST {topTeam.flag} <span style={{ color: '#FFD700' }}>+{topTeam.points}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden md:grid md:grid-cols-12 md:gap-2 md:items-center">
                <div className="col-span-1 font-pixel text-[10px]" style={{ color: rankColor(idx) }}>{idx + 1}</div>
                <div className="col-span-5 flex items-center gap-2">
                  <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-pixel text-[9px]"
                    style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
                    {(mgr.teamName || mgr.name)[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-pixel text-[11px] truncate" style={{ color: '#FFD700' }}>
                      {mgr.teamName || mgr.name}
                    </div>
                    {mgr.realName && (
                      <div className="font-pixel text-[8px] truncate" style={{ color: '#8899AA' }}>{mgr.realName}</div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="font-pixel text-sm" style={{ color: '#FFD700' }}>{mgr.total}</span>
                  {mgr.topScorerCorrect && (
                    <span className="font-pixel text-[6px] ml-1 px-1" style={{ backgroundColor: '#FFD700', color: '#1A1A2E' }}>+5</span>
                  )}
                </div>
                <div className="col-span-1 text-center font-pixel text-[9px]" style={{ color: mgr.teamsAlive > 0 ? '#00AA00' : '#E60012' }}>{mgr.teamsAlive}</div>
                <div className="col-span-1 text-center font-pixel text-[9px]" style={{ color: '#E8E8E8' }}>{mgr.semiFinalists}</div>
                <div className="col-span-1 text-center font-pixel text-[9px]" style={{ color: mgr.finalists > 0 ? '#FFD700' : '#8899AA' }}>{mgr.finalists}</div>
                <div className="col-span-1 text-center">
                  {topTeam && (
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-sm">{topTeam.flag}</span>
                      <span className="font-pixel text-[7px]" style={{ color: '#FFD700' }}>+{topTeam.points}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
