import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { DEFAULT_SCORING } from '@/data/tournament';
import { DollarSign, UserPlus, LogIn, KeyRound, Eye, EyeOff } from 'lucide-react';

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

  const sc = DEFAULT_SCORING;

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

        {/* Payment Card */}
        <div className="retro-card p-4 w-full max-w-lg mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FFD700' }}>
              <DollarSign className="w-4 h-4" style={{ color: '#1A1A2E' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-pixel text-[8px] mb-2" style={{ color: '#FFD700' }}>PAYMENT DEADLINE</p>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#E8E8E8' }}>
                <strong>HKD 200</strong> buy-in. 48 hours to pay after joining.
              </p>
              <p className="text-[10px] mb-1" style={{ color: '#E8E8E8' }}>
                Fail to pay = <strong style={{ color: '#E60012' }}>booted</strong>. No exceptions.
              </p>
              <p className="font-pixel text-[7px] mt-2" style={{ color: '#00AA00' }}>
                PAY VIA FPS: +852 6392 6163
              </p>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="w-full max-w-sm flex flex-col items-center gap-3 mb-6">

          {state.currentUser ? (
            <div className="flex flex-col items-center gap-3">
              <div className="font-pixel text-xs" style={{ color: '#FFD700' }}>WELCOME, {state.currentUser}!</div>
              <button onClick={() => navigate('/draft')} className="pixel-btn gold">GO TO DRAFT &#8594;</button>
              <button onClick={() => { setUser(null); }} className="font-pixel text-[7px]" style={{ color: '#AABBCC' }}>
                LOG OUT
              </button>
            </div>
          ) : view === 'register' ? (
            <>
              <p className="font-pixel text-[10px]" style={{ color: '#33FF33' }}>&#9660; CREATE YOUR ACCOUNT</p>

              <input type="text" value={teamName} onChange={e => setTeamName(e.target.value.toUpperCase())}
                placeholder="TEAM NAME (e.g. BEER FC)" maxLength={16} className="pixel-input w-full text-[10px] text-left" />

              <input type="text" value={realName} onChange={e => setRealName(e.target.value.toUpperCase())}
                placeholder="USERNAME" maxLength={12} className="pixel-input w-full text-[10px] text-left" />

              <div className="w-full flex items-center gap-2">
                <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD700' }} />
                <input type={showPin ? 'text' : 'password'} value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CREATE 4-DIGIT PIN" maxLength={4} className="pixel-input flex-1 text-[11px] text-center tracking-widest" />
                <button onClick={() => setShowPin(!showPin)} className="p-1">
                  {showPin ? <EyeOff className="w-3 h-3" style={{ color: '#AABBCC' }} /> : <Eye className="w-3 h-3" style={{ color: '#AABBCC' }} />}
                </button>
              </div>

              <div className="w-full flex items-center gap-2">
                <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD700' }} />
                <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="CONFIRM 4-DIGIT PIN" maxLength={4} className="pixel-input flex-1 text-[11px] text-center tracking-widest" />
              </div>
              <p className="font-pixel text-[6px] w-full text-left pl-5" style={{ color: '#AABBCC' }}>
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
              <p className="font-pixel text-[10px]" style={{ color: '#FFD700' }}>LOG IN TO YOUR TEAM</p>

              <input type="text" value={loginName} onChange={e => setLoginName(e.target.value.toUpperCase())}
                placeholder="TEAM NAME" maxLength={16} className="pixel-input w-full text-[10px] text-left" />

              <div className="w-full flex items-center gap-2">
                <KeyRound className="w-3 h-3 flex-shrink-0" style={{ color: '#FFD700' }} />
                <input type="password" value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="YOUR 4-DIGIT PIN" maxLength={4} className="pixel-input flex-1 text-[11px] text-center tracking-widest" />
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
              <p className="font-pixel text-[10px] animate-blink mb-2" style={{ color: '#33FF33' }}>&#9660; SELECT AN OPTION</p>

              <button onClick={() => setView('register')} className="pixel-btn gold w-full">
                <UserPlus className="w-3 h-3" /> NEW PLAYER
              </button>

              <button onClick={() => setView('login')} className="pixel-btn w-full" style={{ borderColor: '#2D3192', color: '#F0F0F0' }}>
                <LogIn className="w-3 h-3" /> RETURNING PLAYER
              </button>

              {state.managers.length > 0 && (
                <p className="font-pixel text-[7px] mt-2" style={{ color: '#AABBCC' }}>
                  {state.managers.length} MANAGER{state.managers.length !== 1 ? 'S' : ''} REGISTERED
                </p>
              )}
            </>
          )}
        </div>

        <div className="mt-2"><CountdownTimer /></div>

        {/* How It Works */}
        <div className="mt-10 w-full">
          <h2 className="font-pixel text-xs text-center mb-4" style={{ color: '#FFD700' }}>HOW IT WORKS</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: 'DRAFT 12 TEAMS', desc: 'Pick 2 favorites, 4 mid-tier, 6 underdogs. Every manager builds a roster before kickoff.', color: '#E60012' },
              { title: 'EARN POINTS', desc: 'Teams score for group placement and each knockout round reached. Cumulative scoring.', color: '#FFD700' },
              { title: 'WIN THE CUP', desc: 'Manager with the most points from their 12 teams wins. Standings update live!', color: '#00AA00' },
            ].map((step, i) => (
              <div key={i} className="retro-card p-4">
                <div className="w-6 h-6 mb-2" style={{ backgroundColor: step.color }} />
                <h3 className="font-pixel text-[10px] mb-1" style={{ color: step.color }}>{step.title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: '#AABBCC' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="mt-6 retro-card p-4 w-full">
          <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>SCORING SYSTEM</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[10px] font-mono-game">
            {[
              [`1st in group`, `+${sc.groupFirst}`], [`2nd in group`, `+${sc.groupSecond}`], [`3rd & qualify`, `+${sc.groupThirdQualify}`],
              [`4th in group`, `${sc.groupFourth}`], [`Reach R16`, `+${sc.roundOf16}`], [`Reach QF`, `+${sc.quarterFinal}`],
              [`Reach SF`, `+${sc.semiFinal}`], [`Reach Final`, `+${sc.reachFinal}`], [`Win World Cup`, `+${sc.winWorldCup}`],
              [`Win 3rd place`, `+${sc.winThirdPlace}`], [`Top Scorer Bonus`, `+${sc.topScorerBonus}`],
            ].map(([label, pts], i) => (
              <div key={i} className="flex justify-between px-2 py-1" style={{ backgroundColor: 'rgba(10,15,25,0.8)' }}>
                <span style={{ color: '#E8E8E8' }}>{label}</span>
                <span style={{ color: pts.startsWith('-') ? '#E60012' : '#FFD700' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Scorer Note */}
        <div className="mt-4 retro-card p-3 w-full" style={{ borderColor: '#00AA00' }}>
          <p className="font-pixel text-[7px]" style={{ color: '#00AA00' }}>
            &#127942; TOP SCORER BONUS: +{sc.topScorerBonus} points for guessing the Golden Boot winner
          </p>
        </div>
      </div>

      <div className="relative z-20 w-full mt-10 py-3 flex items-center justify-around" style={{ backgroundColor: 'rgba(12,18,30,0.95)', borderTop: '4px solid #2D3192' }}>
        {[{ label: '48 TEAMS', icon: '🌍' }, { label: '12 GROUPS', icon: '⚽' }, { label: 'JUN 11 - JUL 19', icon: '📅' }].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-sm">{item.icon}</span>
            <span className="font-pixel text-[8px] md:text-[10px]" style={{ color: '#F0F0F0' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
