import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/context/GameContext';
import type { Wager } from '@/data/tournament';
import { Lock, Coins, Handshake, X, Check, ChevronDown, ChevronUp, AlertTriangle, DollarSign, Scale } from 'lucide-react';

const DEN_PASSWORD = 'Silviosucks123!';

const DENOMINATIONS = [50, 100, 200, 300, 500];

export default function DegenDenPage() {
  const { state, createWager, confirmWager, resolveWager, cancelWager, markEscrowPaid } = useGame();
  const [entered, setEntered] = useState(false);
  const [password, setPassword] = useState('');
  const [shakeGate, setShakeGate] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedWager, setExpandedWager] = useState<string | null>(null);

  // Form state
  const [stakeType, setStakeType] = useState<'even' | 'custom'>('even');
  const [acceptorId, setAcceptorId] = useState('');
  const [description, setDescription] = useState('');
  const [evenAmount, setEvenAmount] = useState(100);
  const [proposerStake, setProposerStake] = useState(200);
  const [acceptorStake, setAcceptorStake] = useState(100);
  const [creatorPin, setCreatorPin] = useState('');

  // Confirmation state
  const [confirmPin, setConfirmPin] = useState('');
  const [confirmingWager, setConfirmingWager] = useState<string | null>(null);

  // Resolution state
  const [resolvingWager, setResolvingWager] = useState<string | null>(null);

  useEffect(() => {
    const denAccess = localStorage.getItem('degen_den_access');
    if (denAccess === 'true') setEntered(true);
  }, []);

  const handlePassword = useCallback(() => {
    if (password === DEN_PASSWORD) {
      setEntered(true);
      localStorage.setItem('degen_den_access', 'true');
    } else {
      setShakeGate(true);
      setTimeout(() => setShakeGate(false), 400);
    }
  }, [password]);

  const currentManager = state.managers.find(m => m.name === state.currentUser);

  const handleCreateWager = useCallback(async () => {
    if (!currentManager || !acceptorId || !description || !creatorPin) return;
    if (creatorPin !== currentManager.pincode) {
      alert('Your pincode is incorrect');
      return;
    }

    const acceptor = state.managers.find(m => m.id === acceptorId);
    if (!acceptor) return;

    const pStake = stakeType === 'even' ? evenAmount : proposerStake;
    const aStake = stakeType === 'even' ? evenAmount : acceptorStake;

    if (pStake > 500 || aStake > 500) {
      alert('Max individual stake is $500');
      return;
    }

    await createWager(
      currentManager.id,
      currentManager.name,
      acceptor.id,
      acceptor.name,
      description,
      stakeType,
      pStake,
      aStake
    );

    // Reset form
    setAcceptorId('');
    setDescription('');
    setEvenAmount(100);
    setProposerStake(200);
    setAcceptorStake(100);
    setCreatorPin('');
    setStakeType('even');
    setShowForm(false);
  }, [currentManager, acceptorId, description, creatorPin, stakeType, evenAmount, proposerStake, acceptorStake, createWager, state.managers]);

  const handleConfirmWager = useCallback(async (wagerId: string) => {
    if (!confirmPin || !currentManager) return;
    const wager = state.wagers.find(w => w.id === wagerId);
    if (!wager) return;
    if (wager.acceptorId !== currentManager.id) {
      alert('Only the challenged party can accept this wager');
      return;
    }
    if (confirmPin !== currentManager.pincode) {
      alert('Pincode incorrect');
      return;
    }
    await confirmWager(wagerId);
    setConfirmPin('');
    setConfirmingWager(null);
  }, [confirmPin, currentManager, confirmWager, state.wagers]);

  const handleResolveWager = useCallback(async (wagerId: string, winnerId: string | null) => {
    if (!currentManager) return;
    const wager = state.wagers.find(w => w.id === wagerId);
    if (!wager) return;
    if (wager.proposerId !== currentManager.id && wager.acceptorId !== currentManager.id) {
      alert('Only participants can resolve');
      return;
    }
    await resolveWager(wagerId, winnerId);
    setResolvingWager(null);
  }, [currentManager, resolveWager, state.wagers]);

  const handleCancelWager = useCallback(async (wagerId: string) => {
    if (!currentManager) return;
    const wager = state.wagers.find(w => w.id === wagerId);
    if (!wager) return;
    if (wager.proposerId !== currentManager.id) {
      alert('Only the proposer can cancel');
      return;
    }
    if (wager.status !== 'pending') {
      alert('Can only cancel pending wagers');
      return;
    }
    await cancelWager(wagerId);
  }, [currentManager, cancelWager, state.wagers]);

  // Wager groups
  const myPendingWagers = state.wagers.filter(w =>
    currentManager && w.acceptorId === currentManager.id && w.status === 'pending'
  );
  const myCreatedPending = state.wagers.filter(w =>
    currentManager && w.proposerId === currentManager.id && w.status === 'pending'
  );
  const myActiveWagers = state.wagers.filter(w =>
    currentManager && (w.proposerId === currentManager.id || w.acceptorId === currentManager.id) && w.status !== 'pending'
  );
  const otherWagers = state.wagers.filter(w =>
    !currentManager || (w.proposerId !== currentManager.id && w.acceptorId !== currentManager.id)
  );

  if (!entered) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div
          className={`w-full max-w-md p-8 ${shakeGate ? 'gate-shake' : ''}`}
          style={{
            background: 'rgba(20, 12, 8, 0.95)',
            border: '3px solid #5a3a1a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,168,83,0.1)',
          }}
        >
          <div className="text-center mb-8">
            <Lock className="w-12 h-12 mx-auto mb-4" style={{ color: '#d4a853' }} />
            <h1 className="font-pixel text-lg mb-2" style={{ color: '#d4a853' }}>DEGEN DEN</h1>
            <p className="font-pixel text-[8px] leading-relaxed" style={{ color: '#8a7a6a' }}>
              AUTHORIZED PERSONNEL ONLY
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePassword()}
              placeholder="ENTER PASSWORD"
              className="den-input w-full text-center"
              style={{ textTransform: 'uppercase' }}
            />
            <button onClick={handlePassword} className="pixel-btn amber w-full">
              <Lock className="w-4 h-4" />
              ENTER
            </button>
          </div>

          <p className="text-center mt-6 font-pixel text-[7px]" style={{ color: '#5a4a3a' }}>
            SIDE BETS BETWEEN MANAGERS
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen degen-den-bg relative">
      {/* Smoke particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="smoke-particle" />
        ))}
      </div>

      <div className="relative" style={{ zIndex: 3 }}>
        {/* Header */}
        <div className="text-center py-8 px-4">
          <h1 className="font-pixel text-xl md:text-2xl amber-glow mb-2">THE DEGEN DEN</h1>
          <p className="font-pixel text-[8px]" style={{ color: '#8a7a6a' }}>SIDE BETS & HANDSHAKES</p>
          {!currentManager && (
            <p className="font-pixel text-[8px] mt-4 animate-blink" style={{ color: '#c9a227' }}>
              LOG IN TO CREATE OR JOIN WAGERS
            </p>
          )}
        </div>

        <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">
          {/* Create Wager Button */}
          {currentManager && (
            <div className="text-center">
              <button onClick={() => setShowForm(!showForm)} className="pixel-btn amber">
                {showForm ? <X className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                {showForm ? 'CLOSE' : 'NEW WAGER'}
              </button>
            </div>
          )}

          {/* Wager Creation Form */}
          {showForm && currentManager && (
            <div className="p-6 felt-table scanlines-den relative" style={{ borderRadius: '0' }}>
              <h2 className="font-pixel text-sm mb-4" style={{ color: '#d4a853' }}>
                PROPOSE A WAGER
              </h2>

              {/* Stake Type Toggle */}
              <div className="mb-5">
                <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a7a6a' }}>
                  STAKE TYPE
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setStakeType('even')}
                    className="pixel-btn small flex-1"
                    style={{
                      backgroundColor: stakeType === 'even' ? '#d4a853' : '#2a1e14',
                      color: stakeType === 'even' ? '#1a0e08' : '#8a7a6a',
                      borderColor: stakeType === 'even' ? '#d4a853' : '#5a3a1a',
                    }}
                  >
                    <Scale className="w-3 h-3" />
                    EVEN MONEY
                  </button>
                  <button
                    onClick={() => setStakeType('custom')}
                    className="pixel-btn small flex-1"
                    style={{
                      backgroundColor: stakeType === 'custom' ? '#d4a853' : '#2a1e14',
                      color: stakeType === 'custom' ? '#1a0e08' : '#8a7a6a',
                      borderColor: stakeType === 'custom' ? '#d4a853' : '#5a3a1a',
                    }}
                  >
                    <Coins className="w-3 h-3" />
                    CUSTOM STAKES
                  </button>
                </div>
                <p className="font-pixel text-[7px] mt-2" style={{ color: '#6a5a4a' }}>
                  {stakeType === 'even'
                    ? 'BOTH SIDES RISK THE SAME AMOUNT. WINNER TAKES ALL.'
                    : 'EACH SIDE CAN RISK A DIFFERENT AMOUNT. SET YOUR OWN TERMS.'}
                </p>
              </div>

              {/* You vs Opponent */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a7a6a' }}>YOU (PROPOSER)</label>
                  <div className="den-input w-full flex items-center justify-between text-sm" style={{ color: '#d4c4a0' }}>
                    <span>{currentManager.name}</span>
                    <Check className="w-3 h-3" style={{ color: '#2a9d8f' }} />
                  </div>
                </div>
                <div>
                  <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a7a6a' }}>CHALLENGE (ACCEPTOR)</label>
                  <select
                    value={acceptorId}
                    onChange={(e) => setAcceptorId(e.target.value)}
                    className="den-input w-full appearance-none cursor-pointer"
                  >
                    <option value="">SELECT MANAGER</option>
                    {state.managers.filter(m => m.id !== currentManager.id).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bet description */}
              <div className="mb-4">
                <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a7a6a' }}>THE BET</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. AUSTRIA GOES FURTHER THAN CANADA IN THE TOURNAMENT"
                  className="den-input w-full resize-none"
                  rows={3}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              {/* Amount section */}
              {stakeType === 'even' ? (
                <div className="mb-4">
                  <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a7a6a' }}>
                    BOTH SIDES: ${evenAmount}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DENOMINATIONS.map(d => (
                      <button
                        key={d}
                        onClick={() => setEvenAmount(d)}
                        className="pixel-btn small"
                        style={{
                          backgroundColor: evenAmount === d ? '#d4a853' : '#2a1e14',
                          color: evenAmount === d ? '#1a0e08' : '#8a7a6a',
                          borderColor: evenAmount === d ? '#d4a853' : '#5a3a1a',
                        }}
                      >
                        <DollarSign className="w-3 h-3" />{d}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="font-pixel text-[8px] block mb-2" style={{ color: '#d4a853' }}>
                      IF YOU WIN, YOU COLLECT
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DENOMINATIONS.map(d => (
                        <button
                          key={d}
                          onClick={() => setProposerStake(d)}
                          className="pixel-btn small"
                          style={{
                            backgroundColor: proposerStake === d ? '#d4a853' : '#2a1e14',
                            color: proposerStake === d ? '#1a0e08' : '#8a7a6a',
                            borderColor: proposerStake === d ? '#d4a853' : '#5a3a1a',
                          }}
                        >
                          <DollarSign className="w-3 h-3" />{d}
                        </button>
                      ))}
                    </div>
                    <p className="font-pixel text-[7px] mt-2" style={{ color: '#6a5a4a' }}>
                      YOU RISK ${proposerStake}
                    </p>
                  </div>
                  <div>
                    <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a9d8f' }}>
                      IF THEY WIN, THEY COLLECT
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DENOMINATIONS.map(d => (
                        <button
                          key={d}
                          onClick={() => setAcceptorStake(d)}
                          className="pixel-btn small"
                          style={{
                            backgroundColor: acceptorStake === d ? '#2a9d8f' : '#2a1e14',
                            color: acceptorStake === d ? '#fff' : '#8a7a6a',
                            borderColor: acceptorStake === d ? '#2a9d8f' : '#5a3a1a',
                          }}
                        >
                          <DollarSign className="w-3 h-3" />{d}
                        </button>
                      ))}
                    </div>
                    <p className="font-pixel text-[7px] mt-2" style={{ color: '#6a5a4a' }}>
                      THEY RISK ${acceptorStake}
                    </p>
                  </div>
                </div>
              )}

              {/* Creator pincode */}
              <div className="mb-4">
                <label className="font-pixel text-[8px] block mb-2" style={{ color: '#8a7a6a' }}>
                  YOUR PINCODE (TO AUTHORIZE)
                </label>
                <input
                  type="password"
                  value={creatorPin}
                  onChange={(e) => setCreatorPin(e.target.value)}
                  placeholder="****"
                  maxLength={4}
                  className="den-input w-full text-center"
                />
              </div>

              <button
                onClick={handleCreateWager}
                disabled={!acceptorId || !description || !creatorPin}
                className="pixel-btn amber w-full md:w-auto"
              >
                <Handshake className="w-4 h-4" />
                PROPOSE WAGER
              </button>
            </div>
          )}

          {/* Wagers waiting for my acceptance */}
          {currentManager && myPendingWagers.length > 0 && (
            <div className="p-4 border-2" style={{ background: 'rgba(201,162,39,0.1)', borderColor: '#c9a227' }}>
              <h2 className="font-pixel text-xs mb-3 flex items-center gap-2" style={{ color: '#c9a227' }}>
                <AlertTriangle className="w-4 h-4" />
                WAITING FOR YOUR ACCEPTANCE ({myPendingWagers.length})
              </h2>
              <div className="space-y-3">
                {myPendingWagers.map(wager => (
                  <PendingAcceptCard
                    key={wager.id}
                    wager={wager}
                    confirmingWager={confirmingWager}
                    setConfirmingWager={setConfirmingWager}
                    confirmPin={confirmPin}
                    setConfirmPin={setConfirmPin}
                    onConfirm={handleConfirmWager}
                  />
                ))}
              </div>
            </div>
          )}

          {/* My created wagers waiting for opponent */}
          {currentManager && myCreatedPending.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: '#8a7a6a' }}>
                WAITING FOR OPPONENT ({myCreatedPending.length})
              </h2>
              <div className="space-y-3">
                {myCreatedPending.map(wager => (
                  <WagerCard
                    key={wager.id}
                    wager={wager}
                    currentManager={currentManager}
                    expanded={expandedWager === wager.id}
                    onToggle={() => setExpandedWager(expandedWager === wager.id ? null : wager.id)}
                    resolvingWager={resolvingWager}
                    setResolvingWager={setResolvingWager}
                    onResolve={handleResolveWager}
                    onCancel={handleCancelWager}
                    onMarkEscrow={markEscrowPaid}
                    managers={state.managers}
                  />
                ))}
              </div>
            </div>
          )}

          {/* My active wagers */}
          {currentManager && myActiveWagers.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: '#d4a853' }}>MY WAGERS</h2>
              <div className="space-y-3">
                {myActiveWagers.map(wager => (
                  <WagerCard
                    key={wager.id}
                    wager={wager}
                    currentManager={currentManager}
                    expanded={expandedWager === wager.id}
                    onToggle={() => setExpandedWager(expandedWager === wager.id ? null : wager.id)}
                    resolvingWager={resolvingWager}
                    setResolvingWager={setResolvingWager}
                    onResolve={handleResolveWager}
                    onCancel={handleCancelWager}
                    onMarkEscrow={markEscrowPaid}
                    managers={state.managers}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Public board */}
          {otherWagers.length > 0 && (
            <div>
              <h2 className="font-pixel text-sm mb-4" style={{ color: '#8a7a6a' }}>THE BOARD</h2>
              <div className="space-y-3">
                {otherWagers.map(wager => (
                  <div key={wager.id} className={`wager-card ${wager.status} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <WagerStatusBadge status={wager.status} />
                        <span className="font-pixel text-[10px]" style={{ color: '#d4c4a0' }}>
                          {wager.proposerName} <span style={{ color: '#5a4a3a' }}>VS</span> {wager.acceptorName}
                        </span>
                      </div>
                      <TotalPot wager={wager} />
                    </div>
                    <p className="font-pixel text-[8px] mt-2 leading-relaxed" style={{ color: '#8a7a6a' }}>
                      {wager.description}
                    </p>
                    {wager.stakeType === 'custom' && (
                      <p className="font-pixel text-[7px] mt-1" style={{ color: '#6a5a4a' }}>
                        CUSTOM STAKES: {wager.proposerName} ${wager.proposerStake} / {wager.acceptorName} ${wager.acceptorStake}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.wagers.length === 0 && (
            <div className="text-center py-16">
              <Coins className="w-16 h-16 mx-auto mb-4" style={{ color: '#5a4a3a' }} />
              <p className="font-pixel text-xs" style={{ color: '#6a5a4a' }}>NO WAGERS YET</p>
              <p className="font-pixel text-[8px] mt-2" style={{ color: '#5a4a3a' }}>BE THE FIRST TO MAKE A BET</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Total Pot Display ──
function TotalPot({ wager }: { wager: Wager }) {
  const total = wager.proposerStake + wager.acceptorStake;
  if (wager.stakeType === 'even') {
    return <span className="font-pixel text-xs" style={{ color: '#d4a853' }}>${wager.proposerStake} VS ${wager.acceptorStake}</span>;
  }
  return (
    <div className="text-right">
      <span className="font-pixel text-xs block" style={{ color: '#d4a853' }}>POT: ${total}</span>
      <span className="font-pixel text-[7px]" style={{ color: '#6a5a4a' }}>
        {wager.proposerStake} / {wager.acceptorStake}
      </span>
    </div>
  );
}

// ── Wager Status Badge ──
function WagerStatusBadge({ status }: { status: Wager['status'] }) {
  const config = {
    pending: { color: '#c9a227', bg: 'rgba(201,162,39,0.2)', label: 'PENDING' },
    accepted: { color: '#2a9d8f', bg: 'rgba(42,157,143,0.2)', label: 'ACCEPTED' },
    resolved: { color: '#e76f51', bg: 'rgba(231,111,81,0.2)', label: 'RESOLVED' },
    cancelled: { color: '#666', bg: 'rgba(100,100,100,0.2)', label: 'CANCELLED' },
  };
  const c = config[status];
  return (
    <span className="font-pixel text-[7px] px-2 py-1" style={{ backgroundColor: c.bg, color: c.color }}>
      {c.label}
    </span>
  );
}

// ── Pending Accept Card ──
function PendingAcceptCard({
  wager,
  confirmingWager,
  setConfirmingWager,
  confirmPin,
  setConfirmPin,
  onConfirm,
}: {
  wager: Wager;
  confirmingWager: string | null;
  setConfirmingWager: (id: string | null) => void;
  confirmPin: string;
  setConfirmPin: (pin: string) => void;
  onConfirm: (wagerId: string) => void;
}) {
  return (
    <div className="wager-card pending p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <WagerStatusBadge status="pending" />
          <span className="font-pixel text-[9px]" style={{ color: '#d4c4a0' }}>
            {wager.proposerName} CHALLENGES YOU
          </span>
        </div>
        <TotalPot wager={wager} />
      </div>

      <p className="font-pixel text-[8px] leading-relaxed mb-3" style={{ color: '#b4a490' }}>
        {wager.description}
      </p>

      {wager.stakeType === 'custom' && (
        <div className="p-2 mb-3" style={{ background: 'rgba(10,6,4,0.5)', border: '1px solid #3a2a1a' }}>
          <div className="flex justify-between">
            <span className="font-pixel text-[7px]" style={{ color: '#d4a853' }}>
              YOU COLLECT: ${wager.proposerStake}
            </span>
            <span className="font-pixel text-[7px]" style={{ color: '#2a9d8f' }}>
              YOU PAY: ${wager.acceptorStake}
            </span>
          </div>
        </div>
      )}

      {confirmingWager === wager.id ? (
        <div className="flex gap-2">
          <input
            type="password"
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value)}
            placeholder="YOUR PINCODE"
            maxLength={4}
            className="den-input flex-1 text-center"
          />
          <button onClick={() => onConfirm(wager.id)} className="pixel-btn green small">
            <Check className="w-3 h-3" />
            ACCEPT
          </button>
          <button onClick={() => { setConfirmingWager(null); setConfirmPin(''); }} className="pixel-btn red small">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmingWager(wager.id)} className="pixel-btn green small w-full">
          <Handshake className="w-3 h-3" />
          REVIEW & ACCEPT
        </button>
      )}
    </div>
  );
}

// ── Wager Card (full detail) ──
interface WagerCardProps {
  wager: Wager;
  currentManager: { id: string; name: string; pincode: string };
  expanded: boolean;
  onToggle: () => void;
  resolvingWager: string | null;
  setResolvingWager: (id: string | null) => void;
  onResolve: (wagerId: string, winnerId: string | null) => void;
  onCancel: (wagerId: string) => void;
  onMarkEscrow: (wagerId: string) => void;
  managers: { id: string; name: string }[];
}

function WagerCard({
  wager, currentManager, expanded, onToggle,
  resolvingWager, setResolvingWager,
  onResolve, onCancel, onMarkEscrow, managers,
}: WagerCardProps) {
  const isProposer = wager.proposerId === currentManager.id;

  return (
    <div className={`wager-card ${wager.status}`}>
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3 flex-wrap">
          <WagerStatusBadge status={wager.status} />
          <span className="font-pixel text-[9px]" style={{ color: '#d4c4a0' }}>
            {wager.proposerName} <span style={{ color: '#5a4a3a' }}>VS</span> {wager.acceptorName}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <TotalPot wager={wager} />
          {expanded ? <ChevronUp className="w-4 h-4" style={{ color: '#8a7a6a' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#8a7a6a' }} />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: '#3a2a1a' }}>
          <p className="font-pixel text-[8px] leading-relaxed py-3" style={{ color: '#b4a490' }}>
            {wager.description}
          </p>

          {/* Stakes breakdown */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-3" style={{ background: 'rgba(212,168,83,0.1)', border: '1px solid #5a3a1a' }}>
              <span className="font-pixel text-[7px] block mb-1" style={{ color: '#6a5a4a' }}>
                {wager.proposerName} RISKS
              </span>
              <span className="font-pixel text-sm" style={{ color: '#d4a853' }}>
                ${wager.proposerStake}
              </span>
              {wager.stakeType === 'custom' && (
                <span className="font-pixel text-[7px] block mt-1" style={{ color: '#8a7a6a' }}>
                  IF WINS, COLLECTS ${wager.acceptorStake}
                </span>
              )}
            </div>
            <div className="p-3" style={{ background: 'rgba(42,157,143,0.1)', border: '1px solid #2a6d5a' }}>
              <span className="font-pixel text-[7px] block mb-1" style={{ color: '#6a5a4a' }}>
                {wager.acceptorName} RISKS
              </span>
              <span className="font-pixel text-sm" style={{ color: '#2a9d8f' }}>
                ${wager.acceptorStake}
              </span>
              {wager.stakeType === 'custom' && (
                <span className="font-pixel text-[7px] block mt-1" style={{ color: '#8a7a6a' }}>
                  IF WINS, COLLECTS ${wager.proposerStake}
                </span>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="p-2" style={{ background: 'rgba(10,6,4,0.5)' }}>
              <span className="font-pixel text-[7px] block mb-1" style={{ color: '#6a5a4a' }}>PROPOSED</span>
              <span className="font-pixel text-[8px]" style={{ color: '#8a7a6a' }}>
                {new Date(wager.proposedAt).toLocaleDateString()}
              </span>
            </div>
            {wager.acceptedAt && (
              <div className="p-2" style={{ background: 'rgba(10,6,4,0.5)' }}>
                <span className="font-pixel text-[7px] block mb-1" style={{ color: '#6a5a4a' }}>ACCEPTED</span>
                <span className="font-pixel text-[8px]" style={{ color: '#8a7a6a' }}>
                  {new Date(wager.acceptedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {/* Confirmation status */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 p-2 text-center" style={{ background: 'rgba(42,157,143,0.2)', border: '1px solid #2a9d8f' }}>
              <span className="font-pixel text-[7px]" style={{ color: '#2a9d8f' }}>
                <Check className="w-3 h-3 inline mr-1" />
                {wager.proposerName}
              </span>
            </div>
            <div
              className="flex-1 p-2 text-center"
              style={{
                background: wager.acceptorConfirmed ? 'rgba(42,157,143,0.2)' : 'rgba(10,6,4,0.5)',
                border: wager.acceptorConfirmed ? '1px solid #2a9d8f' : '1px solid #3a2a1a',
              }}
            >
              <span className="font-pixel text-[7px]" style={{ color: wager.acceptorConfirmed ? '#2a9d8f' : '#5a4a3a' }}>
                {wager.acceptorConfirmed ? <Check className="w-3 h-3 inline mr-1" /> : <X className="w-3 h-3 inline mr-1" />}
                {wager.acceptorName}
                {!wager.acceptorConfirmed && ' (PENDING)'}
              </span>
            </div>
          </div>

          {/* Escrow */}
          {wager.status === 'accepted' && (
            <div className="mb-3 p-2 text-center" style={{ background: 'rgba(10,6,4,0.5)', border: '1px solid #3a2a1a' }}>
              <span className="font-pixel text-[7px] block mb-1" style={{ color: '#6a5a4a' }}>ESCROW</span>
              {wager.escrowPaid ? (
                <span className="font-pixel text-[8px]" style={{ color: '#2a9d8f' }}>
                  <Check className="w-3 h-3 inline mr-1" />
                  FUNDS IN ESCROW
                </span>
              ) : (
                <span className="font-pixel text-[8px]" style={{ color: '#c9a227' }}>
                  <AlertTriangle className="w-3 h-3 inline mr-1" />
                  SEND ${wager.proposerStake + wager.acceptorStake} TO EUGENE
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {wager.status === 'pending' && isProposer && (
              <button onClick={() => onCancel(wager.id)} className="pixel-btn red small">
                <X className="w-3 h-3" />CANCEL
              </button>
            )}
            {wager.status === 'accepted' && !wager.escrowPaid && isProposer && (
              <button onClick={() => onMarkEscrow(wager.id)} className="pixel-btn amber small">
                <Coins className="w-3 h-3" />MARK ESCROW PAID
              </button>
            )}
            {wager.status === 'accepted' && wager.escrowPaid && (
              <>
                {resolvingWager === wager.id ? (
                  <div className="flex flex-wrap gap-2 w-full">
                    <button onClick={() => onResolve(wager.id, wager.proposerId)}
                      className="pixel-btn small" style={{ backgroundColor: '#d4a853', color: '#1a0e08', borderColor: '#d4a853' }}>
                      {wager.proposerName} WINS (${wager.acceptorStake})
                    </button>
                    <button onClick={() => onResolve(wager.id, wager.acceptorId)}
                      className="pixel-btn small" style={{ backgroundColor: '#2a9d8f', color: '#fff', borderColor: '#2a9d8f' }}>
                      {wager.acceptorName} WINS (${wager.proposerStake})
                    </button>
                    <button onClick={() => onResolve(wager.id, null)}
                      className="pixel-btn small" style={{ backgroundColor: '#666', color: '#fff', borderColor: '#666' }}>
                      PUSH/VOID
                    </button>
                    <button onClick={() => setResolvingWager(null)} className="pixel-btn red small">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setResolvingWager(wager.id)}
                    className="pixel-btn small" style={{ backgroundColor: '#e76f51', color: '#fff', borderColor: '#e76f51' }}>
                    <Handshake className="w-3 h-3" />RESOLVE
                  </button>
                )}
              </>
            )}
          </div>

          {/* Winner display */}
          {wager.status === 'resolved' && (
            <div className="mt-3 p-3 text-center" style={{ background: 'rgba(42,157,143,0.15)', border: '1px solid #2a9d8f' }}>
              <span className="font-pixel text-[8px]" style={{ color: '#2a9d8f' }}>
                {wager.winnerId
                  ? `WINNER: ${managers.find(m => m.id === wager.winnerId)?.name || 'UNKNOWN'} COLLECTS $${wager.winnerId === wager.proposerId ? wager.acceptorStake : wager.proposerStake}`
                  : 'PUSH / VOID - FUNDS RETURNED'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
