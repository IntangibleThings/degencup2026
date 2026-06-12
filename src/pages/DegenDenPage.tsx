import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import type { Wager, WagerComment } from '@/data/tournament';
import DegenDenTutorial from '@/components/DegenDenTutorial';
import DegenDenLeaderboard from '@/components/DegenDenLeaderboard';
import { Lock, Handshake, X, Check, ChevronDown, ChevronUp, AlertTriangle, Scale, MessageCircle, Send, Clock, HelpCircle, TrendingUp } from 'lucide-react';

const DEN_PASSWORD = 'Silviosucks123!';
const MUG_OPTIONS = [0.5, 1, 2, 3, 4, 5];

const C = {
  bg: '#0d0418', card: 'rgba(30, 10, 64, 0.95)', border: '#4a2080',
  borderHover: '#7c43bd', text: '#e8d5f5', muted: '#a080cc', dim: '#6a5090', accent: '#c880ff',
  gold: '#c9a227', green: '#2a9d8f', red: '#e76f51', inputBg: 'rgba(15, 5, 25, 0.95)',
};

const STATUS_CONFIG: Record<Wager['status'], { color: string; bg: string; label: string }> = {
  pending_acceptance: { color: '#c880ff', bg: 'rgba(200,128,255,0.2)', label: 'PENDING' },
  live: { color: '#00ff88', bg: 'rgba(0,255,136,0.15)', label: 'LIVE' },
  resolved: { color: '#e76f51', bg: 'rgba(231,111,81,0.2)', label: 'RESOLVED' },
  cancelled: { color: '#777', bg: 'rgba(100,100,100,0.2)', label: 'CANCELLED' },
  rejected: { color: '#e60012', bg: 'rgba(230,0,18,0.2)', label: 'REJECTED' },
};

/* 8-bit Pixel Art Beer Mug — SVG */
function BeerMugSVG({ size = 20, half = false }: { size?: number; half?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="3" width="8" height="12" fill={half ? '#3a2510' : '#d4a017'} />
      <rect x="10" y="5" width="3" height="7" fill="none" stroke="#d4a017" strokeWidth="2" />
      {!half && (
        <>
          <rect x="1" y="1" width="10" height="3" fill="#f5f5dc" />
          <rect x="2" y="0" width="3" height="2" fill="#f5f5dc" />
          <rect x="6" y="0" width="3" height="2" fill="#f5f5dc" />
        </>
      )}
      <rect x="3" y={half ? "8" : "5"} width="6" height={half ? "6" : "9"} fill={half ? '#b8860b' : '#daa520'} />
      <rect x="4" y={half ? "9" : "6"} width="1" height="3" fill="#f0e68c" opacity="0.6" />
      <rect x="2" y="3" width="8" height="12" fill="none" stroke="#8b6914" strokeWidth="1" />
    </svg>
  );
}

/* Display N mugs */
export function MugDisplay({ mugs, size = 28 }: { mugs: number; size?: number }) {
  const fullMugs = Math.floor(mugs);
  const hasHalf = mugs % 1 !== 0;
  return (
    <div className="flex items-center gap-1 flex-wrap" title={`${mugs} mug${mugs !== 1 ? 's' : ''}`}>
      {Array.from({ length: fullMugs }).map((_, i) => (
        <BeerMugSVG key={`full-${i}`} size={size} half={false} />
      ))}
      {hasHalf && <BeerMugSVG key="half" size={size} half={true} />}
    </div>
  );
}

/* 24h Countdown hook — MUST be called at top level only */
function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!deadline) { setTimeLeft(''); return; }
    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('EXPIRED'); return; }
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${h}h ${m}m`);
    };
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [deadline]);
  return timeLeft;
}

/* Inline comment preview */
function InlineComments({ comments, wagerId, currentManager, onAddComment, commentsLocked }: {
  comments: WagerComment[]; wagerId: string; currentManager?: { id: string; name: string };
  onAddComment: (id: string, text: string) => void; commentsLocked: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const preview = comments.slice(0, 3);
  const hasMore = comments.length > 3;

  return (
    <div className="mt-3">
      {commentsLocked && (
        <p className="font-pixel text-[7px] p-2 mb-2" style={{ color: C.gold, background: 'rgba(201,162,39,0.1)', border: '1px solid #c9a227' }}>
          <Lock className="w-3 h-3 inline mr-1" />COMMENTS LOCKED
        </p>
      )}
      {preview.map(c => (
        <div key={c.id} className="flex gap-2 mb-1">
          <span className="font-pixel text-[7px] shrink-0" style={{ color: C.accent }}>{c.managerName}:</span>
          <span className="font-pixel text-[7px]" style={{ color: C.muted }}>{c.message}</span>
        </div>
      ))}
      {hasMore && !expanded && (
        <button onClick={() => setExpanded(true)} className="font-pixel text-[7px] mt-1" style={{ color: C.accent }}>
          <MessageCircle className="w-3 h-3 inline mr-1" />+{comments.length - 3} MORE...
        </button>
      )}
      {expanded && comments.slice(3).map(c => (
        <div key={c.id} className="flex gap-2 mb-1">
          <span className="font-pixel text-[7px] shrink-0" style={{ color: C.accent }}>{c.managerName}:</span>
          <span className="font-pixel text-[7px]" style={{ color: C.muted }}>{c.message}</span>
        </div>
      ))}
      {currentManager && !commentsLocked && (
        <div className="flex gap-2 mt-2">
          <input value={text} onChange={e => setText(e.target.value)} placeholder="ADD YOUR TAKE..." className="den-input flex-1" style={{ fontSize: 8, padding: '6px 8px' }} />
          <button onClick={() => { if (text.trim()) { onAddComment(wagerId, text); setText(''); } }} className="pixel-btn purple small" style={{ fontSize: 8, padding: '4px 8px' }}><Send className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

/* Countdown wrapper component — calls hook at component top level */
function ExpiryCountdown({ deadline }: { deadline: string | null }) {
  const timeLeft = useCountdown(deadline);
  if (!timeLeft) return null;
  return (
    <p className="font-pixel text-[7px] mb-2" style={{ color: C.red }}>
      <Clock className="w-3 h-3 inline mr-1" />EXPIRES IN: {timeLeft}
    </p>
  );
}

/* Compact Card with countdown support */
function CompactCard({ wager, handNum, comments, currentManager, onAddComment }: {
  wager: Wager; handNum: number; comments: WagerComment[]; currentManager?: { id: string; name: string }; onAddComment: (id: string, text: string) => void;
}) {
  return (
    <div className="wager-card p-4" style={{ borderLeft: `4px solid ${STATUS_CONFIG[wager.status].color}` }}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <span className="font-pixel text-[10px] px-1.5 py-0.5" style={{ background: 'rgba(74,32,128,0.4)', color: '#c880ff' }}>#{String(handNum).padStart(3, '0')}</span>
          <StatusBadge status={wager.status} />
          <span className="font-pixel text-xs" style={{ color: C.text }}>{wager.proposerName} <span style={{ color: C.dim }}>VS</span> {wager.acceptorName}</span></div>
        <MugDisplay mugs={wager.proposerMugs} size={20} />
      </div>
      <p className="font-pixel text-[10px]" style={{ color: C.muted }}>{wager.description}</p>
      {wager.rejectedReason && <p className="font-pixel text-[7px] mt-1" style={{ color: C.red }}>REASON: {wager.rejectedReason}</p>}
      {wager.status === 'pending_acceptance' && <ExpiryCountdown deadline={wager.expiryDeadline} />}
      <InlineComments comments={comments} wagerId={wager.id} currentManager={currentManager} onAddComment={onAddComment} commentsLocked={wager.commentsLocked} />
    </div>
  );
}

/* Full Handshake Card */
function HandshakeCard({ wager, handNum, currentManager, expanded, onToggle, onCancel, comments, onAddComment }: {
  wager: Wager; handNum: number; currentManager: { id: string; name: string }; expanded: boolean; onToggle: () => void;
  onCancel: (id: string) => void;
  comments: WagerComment[]; onAddComment: (id: string, text: string) => void;
}) {
  const isProposer = wager.proposerId === currentManager.id;
  const [commentText, setCommentText] = useState('');

  return (
    <div className="wager-card" style={{ borderLeft: `4px solid ${STATUS_CONFIG[wager.status].color}` }}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-pixel text-[7px] px-1.5 py-0.5" style={{ background: 'rgba(74,32,128,0.4)', color: '#c880ff' }}>#{String(handNum).padStart(3, '0')}</span>
          <StatusBadge status={wager.status} />
          <span className="font-pixel text-[9px]" style={{ color: C.text }}>{wager.proposerName} <span style={{ color: C.dim }}>VS</span> {wager.acceptorName}</span></div>
        <div className="flex items-center gap-3">
          <MugDisplay mugs={wager.proposerMugs} size={16} />
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: C.dim }} /> : <ChevronDown className="w-4 h-4" style={{ color: C.dim }} />}
        </div>
      </div>

      {!expanded && comments.length > 0 && (
        <div className="px-4 pb-3">
          <InlineComments comments={comments} wagerId={wager.id} currentManager={currentManager} onAddComment={onAddComment} commentsLocked={wager.commentsLocked} />
        </div>
      )}
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: C.border }}>
          <p className="font-pixel text-[8px] py-3" style={{ color: '#c8a8e8' }}>{wager.description}</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3" style={{ background: 'rgba(106,27,154,0.2)', border: `1px solid ${C.border}` }}>
              <span className="font-pixel text-[7px] block mb-1" style={{ color: C.dim }}>{wager.proposerName} OWES</span>
              <MugDisplay mugs={wager.proposerMugs} size={22} />
            </div>
            <div className="p-3" style={{ background: 'rgba(42,157,143,0.1)', border: `1px solid #2a6d5a` }}>
              <span className="font-pixel text-[7px] block mb-1" style={{ color: C.dim }}>{wager.acceptorName} OWES</span>
              <MugDisplay mugs={wager.acceptorMugs} size={22} />
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <div className="flex-1 p-2 text-center" style={{ background: 'rgba(42,157,143,0.15)', border: `1px solid ${C.green}` }}>
              <span className="font-pixel text-[7px]" style={{ color: C.green }}><Check className="w-3 h-3 inline mr-1" />{wager.proposerName}</span>
            </div>
            <div className="flex-1 p-2 text-center" style={{ background: wager.acceptorConfirmed ? 'rgba(42,157,143,0.15)' : 'rgba(15,5,30,0.5)', border: wager.acceptorConfirmed ? `1px solid ${C.green}` : `1px solid ${C.border}` }}>
              <span className="font-pixel text-[7px]" style={{ color: wager.acceptorConfirmed ? C.green : C.dim }}>{wager.acceptorConfirmed ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}{wager.acceptorName}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            {wager.status === 'pending_acceptance' && isProposer && (
              <button onClick={() => onCancel(wager.id)} className="pixel-btn red small"><X className="w-3 h-3" />CANCEL</button>
            )}
          </div>

          {wager.status === 'resolved' && (
            <div className="p-3 text-center mb-3" style={{ background: 'rgba(42,157,143,0.12)', border: `1px solid ${C.green}` }}>
              <span className="font-pixel text-[8px]" style={{ color: C.green }}>
                {wager.winnerId
                  ? (wager.winnerId === wager.proposerId ? `${wager.proposerName} GETS THE BEERS` : `${wager.acceptorName} GETS THE BEERS`)
                  : 'EVEN SPLIT / NO BEERS'}
              </span>
            </div>
          )}

          <div className="mt-4 border-t pt-4" style={{ borderColor: C.border }}>
            <div className="flex items-center gap-2 mb-3"><MessageCircle className="w-4 h-4" style={{ color: C.accent }} />
              <span className="font-pixel text-[9px]" style={{ color: C.accent }}>WHAT THE STREETS ARE SAYING ({comments.length})</span></div>
            {wager.commentsLocked && <p className="font-pixel text-[7px] p-2 mb-2" style={{ color: C.gold, background: 'rgba(201,162,39,0.1)', border: '1px solid #c9a227' }}><Lock className="w-3 h-3 inline mr-1" />COMMENTS LOCKED</p>}
            {comments.length === 0 && !wager.commentsLocked && <p className="font-pixel text-[7px] mb-2" style={{ color: C.dim }}>NO COMMENTS YET. BE THE FIRST.</p>}
            {comments.map(c => (
              <div key={c.id} className="p-3 mb-2" style={{ background: 'rgba(15, 5, 30, 0.6)', border: `1px solid ${C.border}` }}>
                <div className="flex justify-between"><span className="font-pixel text-[7px]" style={{ color: C.accent }}>{c.managerName}</span>
                  <span className="font-pixel text-[6px]" style={{ color: C.dim }}>{new Date(c.postedAt).toLocaleString()}</span></div>
                <p className="font-pixel text-[8px]" style={{ color: C.text }}>{c.message}</p>
              </div>
            ))}
            {currentManager && !wager.commentsLocked && (
              <div className="flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="ADD YOUR TAKE..." className="den-input flex-1" />
                <button onClick={() => { if (commentText.trim()) { onAddComment(wager.id, commentText); setCommentText(''); } }} className="pixel-btn purple small"><Send className="w-3 h-3" /></button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Status Badge ──
function StatusBadge({ status }: { status: Wager['status'] }) {
  const c = STATUS_CONFIG[status];
  return <span className="font-pixel text-[7px] px-2 py-1" style={{ backgroundColor: c.bg, color: c.color }}>{c.label}</span>;
}

// ── Accept Card (for acceptor view with pincode entry) ──
function AcceptCard({ wager, onAccept, confirmingWager, confirmPin, setConfirmPin, setConfirmingWager }: {
  wager: Wager; onAccept: (id: string) => void;
  confirmingWager: string | null; confirmPin: string; setConfirmPin: (p: string) => void; setConfirmingWager: (p: string | null) => void;
}) {
  return (
    <div className="wager-card p-4" style={{ borderLeft: `4px solid ${C.accent}` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3"><StatusBadge status={wager.status} />
          <span className="font-pixel text-[9px]" style={{ color: C.text }}>{wager.proposerName} SENT YOU A FRIENDLY CHALLENGE</span></div>
        <MugDisplay mugs={wager.proposerMugs} size={18} />
      </div>
      <p className="font-pixel text-[8px] mb-1" style={{ color: '#c8a8e8' }}>{wager.description}</p>
      <ExpiryCountdown deadline={wager.expiryDeadline} />
      {confirmingWager === wager.id ? (
        <div className="flex gap-2">
          <input type="password" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} placeholder="YOUR PINCODE" maxLength={4} className="den-input flex-1 text-center" />
          <button onClick={() => onAccept(wager.id)} className="pixel-btn green small"><Check className="w-3 h-3" />ACCEPT</button>
          <button onClick={() => { setConfirmingWager(null); setConfirmPin(''); }} className="pixel-btn red small"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button onClick={() => setConfirmingWager(wager.id)} className="pixel-btn green small w-full"><Handshake className="w-3 h-3" />CHECK IT OUT & ACCEPT</button>
      )}
    </div>
  );
}

/* ── Big Mug Selection Button ── */
function MugSelectButton({ mugs, selected, onClick }: { mugs: number; selected: boolean; onClick: () => void }) {
  const label = mugs === 0.5 ? 'HALF A BEER' : mugs === 1 ? '1 BEER' : `${mugs} BEERS`;
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 p-3 min-w-[70px] transition-all"
      style={{
        backgroundColor: selected ? '#6a1b9a' : C.inputBg,
        color: selected ? '#f0e0ff' : C.dim,
        border: selected ? `2px solid ${C.accent}` : `2px solid ${C.border}`,
        boxShadow: selected ? '0 0 12px rgba(200,128,255,0.3)' : 'none',
      }}>
      <BeerMugSVG size={28} half={mugs % 1 !== 0} />
      <span className="font-pixel text-[7px] mt-1">{label}</span>
    </button>
  );
}

export default function DegenDenPage() {
  const { state, createWager, acceptWager, cancelWager, addComment, getCommentsForWager, loadSeedData } = useGame();
  const [entered, setEntered] = useState(false);
  const [password, setPassword] = useState('');
  const [shakeGate, setShakeGate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedWager, setExpandedWager] = useState<string | null>(null);

  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem('degen_den_tutorial_seen') !== 'true';
  });
  const closeTutorial = useCallback(() => {
    setShowTutorial(false);
    localStorage.setItem('degen_den_tutorial_seen', 'true');
  }, []);

  const [stakeType, setStakeType] = useState<'even' | 'custom'>('even');
  const [acceptorId, setAcceptorId] = useState('');
  const [description, setDescription] = useState('');
  const [evenMugs, setEvenMugs] = useState(1);
  const [proposerMugs, setProposerMugs] = useState(1);
  const [acceptorMugs, setAcceptorMugs] = useState(1);
  const [creatorPin, setCreatorPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [confirmingWager, setConfirmingWager] = useState<string | null>(null);

  useEffect(() => {
    const denAccess = localStorage.getItem('degen_den_access');
    if (denAccess === 'true') setEntered(true);
  }, []);

  const handlePassword = useCallback(() => {
    if (password === DEN_PASSWORD) { setEntered(true); localStorage.setItem('degen_den_access', 'true'); }
    else { setShakeGate(true); setTimeout(() => setShakeGate(false), 400); }
  }, [password]);

  const currentManager = state.managers.find(m => m.name === state.currentUser);

  const now = Date.now();
  const visibleWagers = state.wagers.filter(w => {
    if (w.status !== 'pending_acceptance') return true;
    if (!w.expiryDeadline) return true;
    return new Date(w.expiryDeadline).getTime() > now;
  });

  const handleCreateWager = useCallback(async () => {
    if (!currentManager || !acceptorId || !description || !creatorPin) return;
    if (creatorPin !== currentManager.pincode) { alert('Your pincode is incorrect'); return; }
    const acceptor = state.managers.find(m => m.id === acceptorId);
    if (!acceptor) return;
    const pMugs = stakeType === 'even' ? evenMugs : proposerMugs;
    const aMugs = stakeType === 'even' ? evenMugs : acceptorMugs;
    await createWager(currentManager.id, currentManager.name, acceptor.id, acceptor.name, description, stakeType, pMugs, aMugs);
    setAcceptorId(''); setDescription(''); setEvenMugs(1); setProposerMugs(1); setAcceptorMugs(1); setCreatorPin(''); setStakeType('even'); setShowForm(false);
  }, [currentManager, acceptorId, description, creatorPin, stakeType, evenMugs, proposerMugs, acceptorMugs, createWager, state.managers]);

  const handleAcceptWager = useCallback(async (wagerId: string) => {
    if (!confirmPin || !currentManager) return;
    const wager = state.wagers.find(w => w.id === wagerId);
    if (!wager || wager.acceptorId !== currentManager.id) { alert('Only the challenged party can accept'); return; }
    if (confirmPin !== currentManager.pincode) { alert('Pincode incorrect'); return; }
    await acceptWager(wagerId);
    setConfirmPin(''); setConfirmingWager(null);
  }, [confirmPin, currentManager, acceptWager, state.wagers]);

  const handleAddComment = useCallback(async (wagerId: string, text: string) => {
    if (!text.trim() || !currentManager) return;
    await addComment(wagerId, currentManager.id, currentManager.name, text.trim());
  }, [currentManager, addComment]);

  const myPending = visibleWagers.filter(w => currentManager && w.proposerId === currentManager.id && w.status === 'pending_acceptance');
  const needsMyAcceptance = visibleWagers.filter(w => currentManager && w.acceptorId === currentManager.id && w.status === 'pending_acceptance');
  const myLiveHands = visibleWagers.filter(w => currentManager && (w.proposerId === currentManager.id || w.acceptorId === currentManager.id) && w.status === 'live');
  const myResolved = visibleWagers.filter(w => currentManager && (w.proposerId === currentManager.id || w.acceptorId === currentManager.id) && (w.status === 'resolved' || w.status === 'cancelled' || w.status === 'rejected'));
  const publicHands = visibleWagers.filter(w => !currentManager || (w.proposerId !== currentManager.id && w.acceptorId !== currentManager.id));

  if (!entered) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className={`w-full max-w-md p-8 ${shakeGate ? 'gate-shake' : ''}`}
        style={{ background: C.card, border: `3px solid ${C.border}`, boxShadow: `0 8px 32px rgba(80,20,160,0.4)` }}>
        {showTutorial && <DegenDenTutorial onClose={closeTutorial} />}
        <div className="text-center mb-8">
          <Lock className="w-12 h-12 mx-auto mb-4" style={{ color: C.accent }} />
          <h1 className="font-pixel text-lg mb-2 den-glow">DEGEN DEN</h1>
          <p className="font-pixel text-[8px]" style={{ color: C.dim }}>AUTHORIZED PERSONNEL ONLY</p>
        </div>
        <div className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handlePassword()} placeholder="ENTER PASSWORD"
            className="den-input w-full text-center" style={{ textTransform: 'uppercase' }} />
          <button onClick={handlePassword} className="pixel-btn purple w-full"><Lock className="w-4 h-4" />ENTER</button>
        </div>
        <button onClick={() => setShowTutorial(true)} className="flex items-center gap-1 mx-auto mt-6 font-pixel text-[7px]" style={{ color: C.dim }}>
          <HelpCircle className="w-3 h-3" />HOW DOES THIS WORK?
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen degen-den-bg relative">
      {showTutorial && <DegenDenTutorial onClose={closeTutorial} />}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {[...Array(8)].map((_, i) => <div key={i} className="smoke-particle" />)}
      </div>
      <div className="relative" style={{ zIndex: 3 }}>
        <div className="text-center py-8 px-4">
          <h1 className="font-pixel text-xl md:text-2xl den-glow mb-2">THE DEGEN DEN</h1>
          <p className="font-pixel text-[8px]" style={{ color: C.muted }}>BETS FOR BEER</p>
          <button onClick={() => setShowTutorial(true)} className="flex items-center gap-1 mx-auto mt-3 font-pixel text-[7px]" style={{ color: C.dim }}>
            <HelpCircle className="w-3 h-3" />HOW DOES THIS WORK?
          </button>
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
          {visibleWagers.length === 0 && (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4"><BeerMugSVG size={48} /></div>
              <p className="font-pixel text-xs mb-2" style={{ color: C.muted }}>NO FRIENDLY CHALLENGES YET</p>
              <p className="font-pixel text-[8px] mb-4" style={{ color: C.dim }}>BE THE FIRST TO START ONE</p>
              <button onClick={() => setShowTutorial(true)} className="pixel-btn purple small mr-2"><HelpCircle className="w-3 h-3" />HOW IT WORKS</button>
              <button onClick={loadSeedData} className="pixel-btn small" style={{ backgroundColor: C.inputBg, color: C.muted, borderColor: C.border }}><TrendingUp className="w-3 h-3" />LOAD EXAMPLES</button>
            </div>
          )}

          {currentManager && (
            <div className="text-center">
              <button onClick={() => setShowForm(!showForm)} className="pixel-btn purple">
                {showForm ? <X className="w-4 h-4" /> : <BeerMugSVG size={16} />}{showForm ? 'CLOSE' : 'NEW CHALLENGE'}
              </button>
            </div>
          )}

          {showForm && currentManager && (
            <div className="p-6 felt-table scanlines-den relative" style={{ borderRadius: 0 }}>
              <h2 className="font-pixel text-sm mb-2" style={{ color: C.accent }}>START A BEER BET</h2>
              <p className="font-pixel text-[7px] mb-4" style={{ color: C.dim }}>YOUR FRIEND HAS 24 HOURS TO ACCEPT. YOU EXCHANGE BEERS DIRECTLY — NO MIDDLEMAN.</p>
              <div className="mb-5">
                <label className="font-pixel text-[8px] block mb-2" style={{ color: C.muted }}>MUG TYPE</label>
                <div className="flex gap-2">
                  {(['even', 'custom'] as const).map(t => (
                    <button key={t} onClick={() => setStakeType(t)} className="pixel-btn small flex-1"
                      style={{ backgroundColor: stakeType === t ? '#6a1b9a' : C.inputBg, color: stakeType === t ? '#f0e0ff' : C.dim, borderColor: stakeType === t ? C.accent : C.border }}>
                      {t === 'even' ? <><Scale className="w-3 h-3" />SAME MUGS</> : <><BeerMugSVG size={12} />DIFFERENT MUGS</>}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-pixel text-[8px] block mb-2" style={{ color: C.muted }}>YOU</label>
                  <div className="den-input w-full flex justify-between text-sm" style={{ color: C.text }}><span>{currentManager.name}</span><Check className="w-3 h-3" style={{ color: C.green }} /></div>
                </div>
                <div>
                  <label className="font-pixel text-[8px] block mb-2" style={{ color: C.muted }}>FRIEND</label>
                  <select value={acceptorId} onChange={e => setAcceptorId(e.target.value)} className="den-input w-full appearance-none cursor-pointer">
                    <option value="">PICK A FRIEND</option>
                    {state.managers.filter(m => m.id !== currentManager.id).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-4">
                <label className="font-pixel text-[8px] block mb-2" style={{ color: C.muted }}>THE FRIENDLY CHALLENGE</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="DESCRIBE YOUR BEER BET" className="den-input w-full resize-none" rows={3} style={{ textTransform: 'uppercase' }} />
              </div>
              {stakeType === 'even' ? (
                <div className="mb-4">
                  <label className="font-pixel text-[8px] block mb-3" style={{ color: C.muted }}>BOTH FRIENDS OWE</label>
                  <div className="flex flex-wrap gap-2">{MUG_OPTIONS.map(m => (
                    <MugSelectButton key={m} mugs={m} selected={evenMugs === m} onClick={() => setEvenMugs(m)} />
                  ))}</div>
                  <div className="mt-3 p-2" style={{ background: 'rgba(106,27,154,0.15)', border: `1px solid ${C.border}` }}>
                    <MugDisplay mugs={evenMugs} size={24} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="font-pixel text-[8px] block mb-3" style={{ color: '#d4a5ff' }}>IF YOU ARE RIGHT</label>
                    <div className="flex flex-wrap gap-2">{MUG_OPTIONS.map(m => (
                      <MugSelectButton key={m} mugs={m} selected={proposerMugs === m} onClick={() => setProposerMugs(m)} />
                    ))}</div>
                    <div className="mt-2 p-2" style={{ background: 'rgba(106,27,154,0.15)', border: `1px solid ${C.border}` }}>
                      <MugDisplay mugs={proposerMugs} size={20} />
                    </div>
                  </div>
                  <div>
                    <label className="font-pixel text-[8px] block mb-3" style={{ color: '#80d4c8' }}>IF THEY ARE RIGHT</label>
                    <div className="flex flex-wrap gap-2">{MUG_OPTIONS.map(m => (
                      <MugSelectButton key={m} mugs={m} selected={acceptorMugs === m} onClick={() => setAcceptorMugs(m)} />
                    ))}</div>
                    <div className="mt-2 p-2" style={{ background: 'rgba(42,157,143,0.1)', border: `1px solid #2a6d5a` }}>
                      <MugDisplay mugs={acceptorMugs} size={20} />
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-4">
                <label className="font-pixel text-[8px] block mb-2" style={{ color: C.muted }}>YOUR PINCODE</label>
                <input type="password" value={creatorPin} onChange={e => setCreatorPin(e.target.value)} placeholder="****" maxLength={4} className="den-input w-full text-center" />
              </div>
              <button onClick={handleCreateWager} disabled={!acceptorId || !description || !creatorPin} className="pixel-btn purple w-full md:w-auto"><Handshake className="w-4 h-4" />SHAKE ON IT</button>
            </div>
          )}

          {/* Waiting for my acceptance */}
          {currentManager && needsMyAcceptance.length > 0 && (
            <div className="p-4 border-2" style={{ background: 'rgba(200,128,255,0.08)', borderColor: C.accent }}>
              <h2 className="font-pixel text-xs mb-3 flex items-center gap-2" style={{ color: C.accent }}><AlertTriangle className="w-4 h-4" />FRIENDLY CHALLENGES FOR YOU ({needsMyAcceptance.length})</h2>
              <div className="space-y-3">{needsMyAcceptance.map(wager => (
                <AcceptCard key={wager.id} wager={wager}
                  onAccept={handleAcceptWager}
                  confirmingWager={confirmingWager} confirmPin={confirmPin}
                  setConfirmPin={setConfirmPin} setConfirmingWager={setConfirmingWager} />
              ))}</div>
            </div>
          )}

          {/* My pending (I proposed) */}
          {currentManager && myPending.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: C.gold }}>YOUR PENDING FRIENDLY CHALLENGES ({myPending.length})</h2>
              <div className="space-y-3">{myPending.map((wager) => (
                <CompactCard key={wager.id} wager={wager} handNum={visibleWagers.indexOf(wager) + 1}
                  comments={getCommentsForWager(wager.id)} currentManager={currentManager} onAddComment={handleAddComment} />
              ))}</div>
            </div>
          )}

          {/* My live */}
          {currentManager && myLiveHands.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: '#00ff88' }}>MY LIVE FRIENDLY CHALLENGES ({myLiveHands.length})</h2>
              <div className="space-y-3">{myLiveHands.map((wager) => (
                <HandshakeCard key={wager.id} wager={wager} handNum={visibleWagers.indexOf(wager) + 1} currentManager={currentManager}
                  expanded={expandedWager === wager.id}
                  onToggle={() => setExpandedWager(expandedWager === wager.id ? null : wager.id)}
                  onCancel={cancelWager} comments={getCommentsForWager(wager.id)} onAddComment={handleAddComment} />
              ))}</div>
            </div>
          )}

          {/* My resolved/cancelled/rejected */}
          {currentManager && myResolved.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: C.dim }}>PAST FRIENDLY CHALLENGES</h2>
              <div className="space-y-3">{myResolved.map((w) => (
                <CompactCard key={w.id} wager={w} handNum={visibleWagers.indexOf(w) + 1}
                  comments={getCommentsForWager(w.id)} currentManager={currentManager} onAddComment={handleAddComment} />
              ))}</div>
            </div>
          )}

          {/* Public board */}
          {publicHands.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: C.muted }}>THE FRIENDLY BOARD</h2>
              <div className="space-y-3">{publicHands.map((w) => (
                <CompactCard key={w.id} wager={w} handNum={visibleWagers.indexOf(w) + 1}
                  comments={getCommentsForWager(w.id)} currentManager={currentManager} onAddComment={handleAddComment} />
              ))}</div>
            </div>
          )}

          {/* Leaderboard */}
          <div className="border-t pt-8" style={{ borderColor: C.border }}>
            <DegenDenLeaderboard wagers={visibleWagers} managers={state.managers} />
          </div>
        </div>
      </div>
    </div>
  );
}
