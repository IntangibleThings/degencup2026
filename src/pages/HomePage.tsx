import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { DEFAULT_SCORING } from '@/data/tournament';
import { Clock } from 'lucide-react';

function FloatingPixels() {
  const pixels = Array.from({ length: 18 }, (_, i) => ({
    id: i, left: Math.random() * 100, size: 4 + Math.random() * 6,
    duration: 15 + Math.random() * 12, delay: Math.random() * 15,
    color: ['#FFD700', '#2D3192', '#E60012', '#00AA00'][Math.floor(Math.random() * 4)],
  }));
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {pixels.map(p => (
        <div key={p.id} className="absolute"
          style={{ left: `${p.left}%`, width: p.size, height: p.size, backgroundColor: p.color,
            animation: `pixelFloat ${p.duration}s linear ${p.delay}s infinite` }} />
      ))}
    </div>
  );
}

function MorphAnimation() {
  // 4-frame crossfade: beer mug -> hybrid -> cup-trophy -> world cup trophy
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
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLive, setIsLive] = useState(false);
  useEffect(() => {
    const kickoff = new Date('2026-06-11T15:00:00-04:00').getTime();
    const interval = setInterval(() => {
      const diff = kickoff - Date.now();
      if (diff <= 0) { setIsLive(true); clearInterval(interval); return; }
      setTime({ days: Math.floor(diff / 86400000), hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60), seconds: Math.floor((diff / 1000) % 60) });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  if (isLive) return <div className="font-pixel text-sm md:text-lg animate-pulse" style={{ color: '#00AA00' }}>TOURNAMENT LIVE!</div>;
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <div className="flex items-center gap-2 font-pixel text-[10px] md:text-sm" style={{ color: '#FFD700' }}>
      <span>KICKOFF IN:</span>
      {['days','hours','minutes','seconds'].map((unit, i) => (
        <div key={unit} className="flex items-center gap-1">
          <div className="px-2 py-1 font-pixel text-xs md:text-base" style={{ backgroundColor: '#16213E', border: '2px solid #FFD700' }}>
            {pad(time[unit as keyof typeof time])}
          </div>
          {i < 3 && <span className="text-xs">:</span>}
        </div>
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { state, setUser, addManager } = useGame();
  const [teamName, setTeamName] = useState('');
  const [realName, setRealName] = useState('');
  const sc = DEFAULT_SCORING;

  const handleEnter = () => {
    if (!teamName.trim() || !realName.trim()) return;
    const upperTeam = teamName.trim().toUpperCase().slice(0, 16);
    const upperReal = realName.trim().toUpperCase().slice(0, 12);
    setUser(upperTeam);
    const existing = state.managers.find(m => m.name === upperTeam);
    if (!existing) {
      addManager(upperTeam, upperTeam, upperReal);
    }
    navigate('/draft');
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden" style={{ backgroundColor: '#1A1A2E' }}>
      <div className="absolute inset-0 z-0">
        <img src="/hero-bg.jpg" alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(26,26,46,0.7), rgba(26,26,46,0.95))' }} />
      </div>
      <div className="absolute inset-0 scanlines z-[5]" />
      <FloatingPixels />

      <div className="relative z-20 flex flex-col items-center max-w-2xl w-full">
        {/* Morphing Title Animation */}
        <MorphAnimation />

        <h1 className="font-pixel text-xl md:text-3xl lg:text-4xl text-center glitch mb-2" data-text="DEGEN WORLD CUP 2026"
          style={{ color: '#FFD700', textShadow: '4px 4px 0px rgba(0,0,0,0.5), 0px 0px 20px rgba(255,215,0,0.3)' }}>
          DEGEN WORLD CUP 2026
        </h1>

        <p className="font-pixel text-[10px] md:text-sm mb-4 tracking-widest" style={{ color: '#8899AA' }}>
          FANTASY WORLD CUP DRAFT
        </p>

        {/* 48-Hour Payment Warning */}
        <div className="w-full max-w-lg mb-6 p-3 flex items-start gap-3"
          style={{ backgroundColor: 'rgba(255,215,0,0.1)', borderLeft: '4px solid #FFD700' }}>
          <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FFD700' }} />
          <div>
            <p className="font-pixel text-[8px] mb-1" style={{ color: '#FFD700' }}>PAYMENT DEADLINE</p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#E8E8E8' }}>
              You have <strong>48 hours</strong> to pay your HKD 250 buy-in after joining.
              Fail to pay = <strong>booted from the game</strong>. No exceptions.
            </p>
            <p className="font-pixel text-[8px] mt-2" style={{ color: '#00AA00' }}>
              PAY VIA FPS: +852 6392 6163
            </p>
          </div>
        </div>

        {/* Name Entry */}
        <div className="w-full max-w-sm flex flex-col items-center gap-3 mb-6">
          {state.currentUser ? (
            <div className="flex flex-col items-center gap-3">
              <div className="font-pixel text-xs" style={{ color: '#FFD700' }}>WELCOME, {state.currentUser}!</div>
              <button onClick={() => navigate('/draft')} className="pixel-btn gold">GO TO DRAFT &#8594;</button>
            </div>
          ) : (
            <>
              <p className="font-pixel text-[10px] animate-blink" style={{ color: '#33FF33' }}>&#9660; ENTER YOUR DETAILS</p>
              <input type="text" value={teamName} onChange={e => setTeamName(e.target.value.toUpperCase())}
                placeholder="TEAM NAME (e.g. BEER FC)" maxLength={16} className="pixel-input w-full text-[10px] text-left" />
              <input type="text" value={realName} onChange={e => setRealName(e.target.value.toUpperCase())}
                placeholder="YOUR REAL NAME" maxLength={12} className="pixel-input w-full text-[10px] text-left" />
              <button onClick={handleEnter} disabled={!teamName.trim() || !realName.trim()} className="pixel-btn gold w-full">ENTER DRAFT</button>
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
                <p className="text-[11px] leading-relaxed" style={{ color: '#8899AA' }}>{step.desc}</p>
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
              <div key={i} className="flex justify-between px-2 py-1" style={{ backgroundColor: '#1A1A2E' }}>
                <span style={{ color: '#E8E8E8' }}>{label}</span>
                <span style={{ color: pts.startsWith('-') ? '#E60012' : '#FFD700' }}>{pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Scorer Note */}
        <div className="mt-4 p-3 w-full" style={{ backgroundColor: 'rgba(0,170,0,0.1)', borderLeft: '4px solid #00AA00' }}>
          <p className="font-pixel text-[8px]" style={{ color: '#00AA00' }}>
            &#127942; TOP SCORER BONUS: +{sc.topScorerBonus} points if you correctly guess the FIFA Golden Boot winner 
            (the player who scores the most goals in the tournament). Tiebreaker: assists, then minutes played.
          </p>
        </div>
      </div>

      <div className="relative z-20 w-full mt-10 py-3 flex items-center justify-around" style={{ backgroundColor: '#2D3192' }}>
        {[{ label: '48 TEAMS', icon: '🌍' }, { label: '12 MANAGERS', icon: '⚽' }, { label: 'JUN 11 - JUL 19', icon: '📅' }].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="text-sm">{item.icon}</span>
            <span className="font-pixel text-[8px] md:text-[10px]" style={{ color: '#F0F0F0' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
