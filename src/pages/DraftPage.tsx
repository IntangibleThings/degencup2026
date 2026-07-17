import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { getAllTeams, TEAM_FLAGS } from '@/data/tournament';
import type { Tier } from '@/data/tournament';
import { Crown, Star, CircleDot, X, Check, AlertTriangle, Lock, Info } from 'lucide-react';

const TIER_LIMITS: Record<Tier, number> = { favorite: 2, mid: 4, underdog: 6 };
const TIER_COLORS: Record<Tier, string> = { favorite: '#FFD700', mid: '#2D3192', underdog: '#8899AA' };
const TIER_ICONS = { favorite: Crown, mid: Star, underdog: CircleDot };

export default function DraftPage() {
  const navigate = useNavigate();
  const { state, submitTeams, submitTopScorer } = useGame();
  const [selected, setSelected] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [topScorerName, setTopScorerName] = useState('');
  const [topScorerCountry, setTopScorerCountry] = useState('');
  const [topScorerEditMode, setTopScorerEditMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Amendment deadline: 1 hour before kickoff = June 11, 2026 14:00 ET
  const AMEND_DEADLINE = new Date('2026-06-11T14:00:00-04:00').getTime();
  const canAmend = Date.now() < AMEND_DEADLINE;

  const allTeams = useMemo(() => getAllTeams(state.settings.tiers), [state.settings.tiers]);
  const usedTeams = useMemo(() => {
    if (!state.settings.draftMode) return [];
    const used: string[] = [];
    state.managers.forEach(m => { if (m.name !== state.currentUser) used.push(...m.teamCodes); });
    return used;
  }, [state.managers, state.settings.draftMode, state.currentUser]);

  const currentManager = state.managers.find(m => m.name === state.currentUser);
  const hasSubmitted = currentManager && currentManager.teamCodes.length > 0;
  const hasTopScorerGuess = currentManager && currentManager.topScorerGuess;

  const counts = { favorite: 0, mid: 0, underdog: 0 };
  selected.forEach(code => {
    const team = allTeams.find(t => t.code === code);
    if (team) counts[team.tier]++;
  });

  const isValid = counts.favorite === TIER_LIMITS.favorite &&
    counts.mid === TIER_LIMITS.mid &&
    counts.underdog === TIER_LIMITS.underdog &&
    selected.length === 12;

  const toggleTeam = (code: string) => {
    if (state.settings.draftLocked) return;
    if (usedTeams.includes(code)) return;
    const team = allTeams.find(t => t.code === code);
    if (!team) return;
    if (selected.includes(code)) {
      setSelected(selected.filter(c => c !== code));
    } else {
      if (selected.length >= 12) return;
      if (counts[team.tier] >= TIER_LIMITS[team.tier]) return;
      setSelected([...selected, code]);
    }
  };

  const isDraftLocked = state.settings.draftLocked;

  const handleSubmit = async () => {
    if (state.settings.draftLocked) return;
    if (!isValid || !currentManager) return;
    await submitTeams(currentManager.id, selected);
    setShowConfirm(false);
    setIsEditing(false);
  };

  const handleStartEdit = () => {
    if (state.settings.draftLocked) return;
    if (!canAmend || !currentManager) return;
    setSelected([...currentManager.teamCodes]);
    setIsEditing(true);
  };

  const handleSubmitTopScorer = async () => {
    if (!topScorerName.trim() || !topScorerCountry.trim()) return;
    const mgr = currentManager;
    if (mgr) await submitTopScorer(mgr.id, { name: topScorerName.trim(), country: topScorerCountry.trim() });
  };

  // NOT LOGGED IN
  if (!state.currentUser) {
    return (
      <div className="min-h-screen px-4 py-6 flex flex-col items-center justify-center">
        <h1 className="font-pixel text-lg mb-4" style={{ color: '#FFD700' }}>NOT LOGGED IN</h1>
        <p className="font-pixel text-[8px] mb-4 text-center" style={{ color: '#AABBCC' }}>
          CREATE AN ACCOUNT OR LOG IN TO ACCESS THE DRAFT
        </p>
        <button onClick={() => navigate('/')} className="pixel-btn gold">GO TO HOME PAGE &#8594;</button>
      </div>
    );
  }

  // DRAFT LOCKED — block all unsubmitted users entirely
  if (state.settings.draftLocked && !hasSubmitted) {
    return (
      <div className="min-h-screen px-4 py-6 flex flex-col items-center justify-center">
        <Lock className="w-12 h-12 mb-4" style={{ color: '#E60012' }} />
        <h1 className="font-pixel text-lg mb-4" style={{ color: '#E60012' }}>DRAFT LOCKED</h1>
        <p className="font-pixel text-[8px] mb-4 text-center" style={{ color: '#AABBCC' }}>
          THE ADMIN HAS LOCKED THE DRAFT. NO NEW ROSTERS CAN BE SUBMITTED.
        </p>
        <button onClick={() => navigate('/standings')} className="pixel-btn">VIEW STANDINGS</button>
      </div>
    );
  }

  // ALREADY SUBMITTED (but not editing)
  if (hasSubmitted && !isEditing) {
    const submittedTeams = currentManager!.teamCodes;
    return (
      <div className="min-h-screen px-4 py-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* DRAFT LOCKED BANNER */}
          {state.settings.draftLocked && (
            <div className="mb-4 p-3 flex items-center justify-center gap-2" style={{ background: 'rgba(230,0,18,0.15)', border: '2px solid #E60012' }}>
              <Lock className="w-4 h-4" style={{ color: '#E60012' }} />
              <span className="font-pixel text-[10px]" style={{ color: '#E60012' }}>DRAFT IS LOCKED — EDITING DISABLED</span>
            </div>
          )}
          <Check className="w-12 h-12 mx-auto mb-4" style={{ color: '#00AA00' }} />
          <h1 className="font-pixel text-lg mb-2" style={{ color: '#00AA00' }}>ROSTER SUBMITTED!</h1>
          {/* Submission Confirmation */}
          <div className="retro-card p-4 mb-4" style={{ borderColor: '#00AA00' }}>
            <p className="font-pixel text-[8px] mb-1" style={{ color: '#00AA00' }}>&#10003; ROSTER LOCKED IN</p>
            <p className="font-pixel text-[7px] mt-1" style={{ color: '#AABBCC' }}>
              Log in with your Team Name + 4-digit PIN to edit before kickoff.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
            {submittedTeams.map(code => {
              const team = allTeams.find(t => t.code === code);
              return (
                <div key={code} className="retro-card p-2 flex items-center gap-2" style={{ borderColor: TIER_COLORS[team?.tier || 'underdog'] }}>
                  <span className="text-lg">{TEAM_FLAGS[code]}</span>
                  <span className="font-pixel text-[8px]" style={{ color: '#E8E8E8' }}>{code}</span>
                </div>
              );
            })}
          </div>

          {/* Top Scorer Bonus */}
          <div className="retro-card p-5" style={{ borderColor: '#FFD700' }}>
            <h2 className="font-pixel text-xs mb-2 text-center" style={{ color: '#FFD700' }}>
              BONUS: GUESS THE TOP SCORER
            </h2>
            <p className="font-pixel text-[8px] mb-4 text-center" style={{ color: '#8899AA' }}>
              CORRECT GUESS = +{state.settings.scoring.topScorerBonus} BONUS POINTS<br />
              Based on the FIFA Golden Boot winner (most goals in the tournament)
            </p>
            {hasTopScorerGuess && !topScorerEditMode ? (
              <div className="text-center">
                <div className="font-pixel text-sm mb-1" style={{ color: '#00AA00' }}>✓ LOCKED IN</div>
                <div className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>{currentManager!.topScorerGuess!.name}</div>
                <div className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>({currentManager!.topScorerGuess!.country})</div>
                {canAmend && (
                  <button onClick={() => { setTopScorerEditMode(true); setTopScorerName(currentManager!.topScorerGuess!.name); setTopScorerCountry(currentManager!.topScorerGuess!.country); }}
                    className="font-pixel text-[8px] mt-3 px-3 py-1" style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>EDIT PICK</button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input type="text" value={topScorerName} onChange={e => setTopScorerName(e.target.value)}
                  placeholder="PLAYER NAME (e.g. Kylian Mbappe)" className="pixel-input w-full text-[10px] text-left" />
                <input type="text" value={topScorerCountry} onChange={e => setTopScorerCountry(e.target.value)}
                  placeholder="COUNTRY (e.g. France)" className="pixel-input w-full text-[10px] text-left" />
                <div className="flex gap-2">
                  <button onClick={handleSubmitTopScorer}
                    disabled={!topScorerName.trim() || !topScorerCountry.trim()}
                    className="pixel-btn gold flex-1">{hasTopScorerGuess ? 'UPDATE PICK' : 'SUBMIT TOP SCORER PICK'}</button>
                  {hasTopScorerGuess && (
                    <button onClick={() => setTopScorerEditMode(false)} className="pixel-btn red small">CANCEL</button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-3 mt-6">
            {state.settings.draftLocked ? (
              <p className="font-pixel text-[8px]" style={{ color: '#E60012' }}>
                DRAFT LOCKED BY ADMIN — NO EDITING
              </p>
            ) : canAmend ? (
              <>
                <button onClick={handleStartEdit} className="pixel-btn gold">EDIT ROSTER</button>
                <p className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                  EDITING CLOSES 1 HOUR BEFORE KICKOFF
                </p>
              </>
            ) : (
              <p className="font-pixel text-[8px]" style={{ color: '#E60012' }}>
                EDITING CLOSED — LESS THAN 1 HOUR TO KICKOFF
              </p>
            )}
            <button onClick={() => navigate('/standings')} className="pixel-btn small">VIEW STANDINGS</button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN DRAFT VIEW
  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* DRAFT LOCKED BANNER — full width, prominent */}
        {isDraftLocked && (
          <div className="mb-4 p-4 flex items-center justify-center gap-3" style={{ background: 'rgba(230,0,18,0.2)', border: '3px solid #E60012', boxShadow: '0 0 16px rgba(230,0,18,0.3)' }}>
            <Lock className="w-6 h-6" style={{ color: '#E60012' }} />
            <span className="font-pixel text-xs" style={{ color: '#E60012' }}>DRAFT LOCKED BY ADMIN — NO CHANGES ALLOWED</span>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {isDraftLocked && <Lock className="w-6 h-6" style={{ color: '#E60012' }} />}
            <div>
              <h1 className="font-pixel text-lg md:text-2xl" style={{ color: isDraftLocked ? '#E60012' : '#FFD700' }}>
                {isDraftLocked ? 'DRAFT LOCKED' : 'DRAFT YOUR TEAMS'}
              </h1>
              <p className="font-pixel text-[8px] mt-1" style={{ color: '#8899AA' }}>
                SELECT EXACTLY 12 TEAMS &middot; 2 FAV &middot; 4 MID &middot; 6 DOG
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(['favorite', 'mid', 'underdog'] as Tier[]).map(tier => {
              const Icon = TIER_ICONS[tier];
              const limit = TIER_LIMITS[tier];
              const count = counts[tier];
              return (
                <div key={tier} className="flex items-center gap-1">
                  <Icon className="w-3 h-3" style={{ color: TIER_COLORS[tier] }} />
                  <span className="font-pixel text-[10px]" style={{ color: count >= limit ? '#00AA00' : '#E8E8E8' }}>
                    {count}/{limit}
                  </span>
                </div>
              );
            })}
            <div className="font-pixel text-sm px-3 py-1" style={{ backgroundColor: '#16213E', border: '2px solid #FFD700', color: '#FFD700' }}>
              {selected.length}/12
            </div>
          </div>
        </div>

        {/* How Teams Are Classified */}
        <div className="retro-card p-4 mb-4" style={{ borderColor: '#2D3192' }}>
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#2D3192' }} />
            <div>
              <h2 className="font-pixel text-[10px] mb-1" style={{ color: '#FFD700' }}>HOW TEAMS ARE CLASSIFIED</h2>
              <p className="text-[11px] leading-relaxed mb-2" style={{ color: '#E8E8E8' }}>
                Teams are grouped into tiers based on their <strong style={{ color: '#FFD700' }}>pre-tournament betting odds</strong> to win the World Cup. 
                This is the most objective way to rank teams for a fantasy pool.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="p-2" style={{ backgroundColor: 'rgba(255,215,0,0.1)', borderLeft: '3px solid #FFD700' }}>
                  <div className="font-pixel text-[9px] mb-1" style={{ color: '#FFD700' }}>FAVORITES (6 teams)</div>
                  <div className="text-[10px]" style={{ color: '#8899AA' }}>Odds roughly 5:1 to 10:1. Genuine title contenders expected to reach at least the Quarter-Finals.</div>
                </div>
                <div className="p-2" style={{ backgroundColor: 'rgba(45,49,146,0.2)', borderLeft: '3px solid #2D3192' }}>
                  <div className="font-pixel text-[9px] mb-1" style={{ color: '#2D3192' }}>MID-TIER (11 teams)</div>
                  <div className="text-[10px]" style={{ color: '#8899AA' }}>Odds roughly 15:1 to 50:1. Strong knockout-bound teams, some surprise potential.</div>
                </div>
                <div className="p-2" style={{ backgroundColor: 'rgba(136,153,170,0.1)', borderLeft: '3px solid #8899AA' }}>
                  <div className="font-pixel text-[9px] mb-1" style={{ color: '#8899AA' }}>UNDERDOGS (31 teams)</div>
                  <div className="text-[10px]" style={{ color: '#8899AA' }}>Odds 60:1 to 1000:1+. Battling to qualify from groups. Huge upset potential if they progress.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 48h Payment Warning */}
        <div className="mb-4 p-3 flex items-start gap-2" style={{ backgroundColor: 'rgba(230,0,18,0.15)', borderLeft: '4px solid #E60012' }}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#E60012' }} />
          <span className="font-pixel text-[8px]" style={{ color: '#E60012' }}>
            YOU HAVE 48 HOURS TO PAY HKD 200 AFTER JOINING. FAIL TO PAY = BOOTED. NO EXCEPTIONS.
          </span>
        </div>

        {/* Validation */}
        {!isValid && selected.length > 0 && (
          <div className="mb-4 p-3 flex items-center gap-2" style={{ backgroundColor: 'rgba(230,0,18,0.15)', borderLeft: '4px solid #E60012' }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: '#E60012' }} />
            <span className="font-pixel text-[8px]" style={{ color: '#E60012' }}>
              {selected.length < 12 ? `PICK ${12 - selected.length} MORE TEAM${selected.length === 11 ? '' : 'S'}` : 'CHECK TIER COUNTS'}
            </span>
          </div>
        )}

        {/* Selected summary */}
        {selected.length > 0 && (
          <div className="retro-card p-3 mb-6" style={{ borderColor: isDraftLocked ? '#E60012' : '#FFD700', opacity: isDraftLocked ? 0.6 : 1 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-pixel text-[10px]" style={{ color: isDraftLocked ? '#E60012' : '#FFD700' }}>
                {isDraftLocked ? 'LOCKED — CANNOT MODIFY' : 'YOUR PICKS'}
              </span>
              {!isDraftLocked && (
                <button onClick={() => setSelected([])} className="font-pixel text-[8px]" style={{ color: '#E60012' }}>CLEAR ALL</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {selected.map(code => {
                const team = allTeams.find(t => t.code === code);
                return (
                  <button key={code} onClick={() => toggleTeam(code)}
                    disabled={isDraftLocked}
                    className="flex items-center gap-1 px-2 py-1 transition-colors"
                    style={{
                      backgroundColor: TIER_COLORS[team?.tier || 'underdog'],
                      border: 'none',
                      opacity: isDraftLocked ? 0.6 : 1,
                      cursor: isDraftLocked ? 'not-allowed' : 'pointer',
                    }}>
                    <span className="text-sm">{TEAM_FLAGS[code]}</span>
                    <span className="font-pixel text-[7px]" style={{ color: '#1A1A2E' }}>{code}</span>
                    {!isDraftLocked && <X className="w-2 h-2 ml-1" style={{ color: '#1A1A2E' }} />}
                  </button>
                );
              })}
            </div>
            {isValid && (
              <button onClick={() => setShowConfirm(true)} className="pixel-btn gold w-full mt-3">
                <Check className="w-3 h-3 inline mr-1" /> SUBMIT ROSTER
              </button>
            )}
          </div>
        )}

        {/* Teams by Tier */}
        {(['favorite', 'mid', 'underdog'] as Tier[]).map(tier => {
          const config = { favorite: { label: 'FAVORITES', icon: Crown }, mid: { label: 'MID-TIER', icon: Star }, underdog: { label: 'UNDERDOGS', icon: CircleDot } }[tier];
          const Icon = config.icon;
          const tierTeams = allTeams.filter(t => t.tier === tier).sort((a, b) => a.name.localeCompare(b.name));
          const limit = TIER_LIMITS[tier];
          const count = counts[tier];

          return (
            <div key={tier} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4" style={{ color: TIER_COLORS[tier] }} />
                <h2 className="font-pixel text-xs" style={{ color: TIER_COLORS[tier] }}>{config.label}</h2>
                <span className="font-pixel text-[8px]" style={{ color: count >= limit ? '#00AA00' : '#8899AA' }}>
                  ({count}/{limit} selected)
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {tierTeams.map(team => {
                  const isSelected = selected.includes(team.code);
                  const isUsed = usedTeams.includes(team.code);
                  const isDisabled = isDraftLocked || isUsed || (!isSelected && count >= limit);
                  return (
                    <button key={team.code} onClick={() => toggleTeam(team.code)}
                      disabled={isDisabled}
                      className="retro-card p-2 flex items-center gap-2 text-left transition-all"
                      style={{
                        borderColor: isSelected ? TIER_COLORS[tier] : '#0F3460',
                        borderWidth: isSelected ? '3px' : '2px',
                        opacity: isDisabled && !isSelected ? 0.25 : 1,
                        backgroundColor: isSelected ? 'rgba(255,215,0,0.1)' : '#16213E',
                        cursor: isDraftLocked ? 'not-allowed' : 'pointer',
                      }}>
                      <span className="text-lg">{team.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-pixel text-[8px] truncate" style={{ color: isSelected ? '#FFD700' : '#E8E8E8' }}>
                          {isSelected ? '✓ ' : ''}{team.code}
                        </div>
                        <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>GRP {team.group}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Bottom Sticky Submit Bar */}
        <div className="sticky bottom-0 left-0 right-0 z-30 py-3 px-4 -mx-4"
          style={{ backgroundColor: 'rgba(10,15,25,0.95)', borderTop: '4px solid #2D3192', backdropFilter: 'blur(4px)' }}>
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-pixel text-[10px]" style={{ color: selected.length === 12 ? '#00AA00' : '#E8E8E8' }}>
                {selected.length}/12
              </span>
              <span className="font-pixel text-[7px] hidden sm:inline" style={{ color: '#AABBCC' }}>
                <span style={{ color: '#FFD700' }}>{counts.favorite}F</span>
                {' '}<span style={{ color: '#2D3192' }}>{counts.mid}M</span>
                {' '}<span style={{ color: '#8899AA' }}>{counts.underdog}U</span>
              </span>
            </div>
            {isDraftLocked ? (
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4" style={{ color: '#E60012' }} />
                <span className="font-pixel text-[9px]" style={{ color: '#E60012' }}>LOCKED</span>
              </div>
            ) : isValid ? (
              <button onClick={() => setShowConfirm(true)} className="pixel-btn gold small">
                LOCK IN TEAM
              </button>
            ) : (
              <span className="font-pixel text-[7px]" style={{ color: '#AABBCC' }}>
                {selected.length < 12 ? `PICK ${12 - selected.length} MORE` : 'CHECK TIERS'}
              </span>
            )}
          </div>
        </div>

        {/* Confirm Modal */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="retro-card p-6 max-w-md w-full" style={{ borderColor: '#FFD700' }}>
              <h2 className="font-pixel text-sm mb-4 text-center" style={{ color: '#FFD700' }}>CONFIRM ROSTER</h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4 max-h-60 overflow-y-auto">
                {selected.map(code => (
                  <div key={code} className="flex items-center gap-1 p-1" style={{ backgroundColor: '#1A1A2E' }}>
                    <span className="text-sm">{TEAM_FLAGS[code]}</span>
                    <span className="font-pixel text-[7px]" style={{ color: '#E8E8E8' }}>{code}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mb-4 font-pixel text-[10px]" style={{ color: '#8899AA' }}>
                <span style={{ color: '#FFD700' }}>{counts.favorite} FAV</span> &middot;
                <span style={{ color: '#2D3192' }}>{counts.mid} MID</span> &middot;
                <span style={{ color: '#8899AA' }}>{counts.underdog} DOG</span>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="pixel-btn red flex-1 small">CANCEL</button>
                {isDraftLocked ? (
                  <button disabled className="pixel-btn flex-1" style={{ backgroundColor: '#333', color: '#666', borderColor: '#333', cursor: 'not-allowed' }}>
                    <Lock className="w-3 h-3 inline mr-1" />LOCKED
                  </button>
                ) : (
                  <button onClick={handleSubmit} className="pixel-btn gold flex-1">LOCK IN TEAM</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
