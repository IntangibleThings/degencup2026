import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { TEAM_FLAGS, TEAM_NAMES } from '@/data/tournament';
import { ArrowLeft, Crown, Star, CircleDot } from 'lucide-react';
import type { Tier } from '@/data/tournament';

const TIER_INFO: Record<Tier, { label: string; icon: typeof Crown; color: string }> = {
  favorite: { label: 'FAV', icon: Crown, color: '#FFD700' },
  mid: { label: 'MID', icon: Star, color: '#2D3192' },
  underdog: { label: 'DOG', icon: CircleDot, color: '#8899AA' },
};

function getTeamStatus(code: string, results: ReturnType<typeof useGame>['state']['results']) {
  const r = results[code];
  if (!r) return { label: 'NOT STARTED', color: '#8899AA', bg: '#16213E' };
  if (r.wonWorldCup) return { label: 'WORLD CHAMPION', color: '#FFD700', bg: 'rgba(255,215,0,0.15)' };
  if (r.reachedFinal) return { label: 'FINALIST', color: '#C0C0C0', bg: 'rgba(192,192,192,0.1)' };
  if (r.reachedSemiFinal) return { label: 'SEMIFINALIST', color: '#CD7F32', bg: 'rgba(205,127,50,0.1)' };
  if (r.reachedQuarterFinal) return { label: 'QUARTERFINALS', color: '#2D3192', bg: 'rgba(45,49,146,0.2)' };
  if (r.reachedRoundOf16) return { label: 'ROUND OF 16', color: '#E8E8E8', bg: '#16213E' };
  if (r.reachedKnockout && !r.reachedRoundOf16) return { label: 'R32', color: '#E8E8E8', bg: '#16213E' };
  if (r.eliminated) return { label: 'ELIMINATED', color: '#E60012', bg: 'rgba(230,0,18,0.1)' };
  return { label: 'IN GROUP', color: '#00AA00', bg: 'rgba(0,170,0,0.1)' };
}

export default function ManagerPage() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const { state, getTeamsForManager, getScoreForManager } = useGame();

  const manager = state.managers.find(m => m.name === name);
  if (!manager) {
    return (
      <div className="min-h-screen px-4 py-6 flex flex-col items-center justify-center">
        <p className="font-pixel text-sm mb-4" style={{ color: '#E60012' }}>MANAGER NOT FOUND</p>
        <button onClick={() => navigate('/standings')} className="pixel-btn">BACK TO STANDINGS</button>
      </div>
    );
  }

  const teams = getTeamsForManager(manager.id);
  const score = getScoreForManager(manager.id);

  // Sort by points desc
  const sortedTeams = [...teams].sort((a, b) => b.points - a.points);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => navigate('/standings')} className="flex items-center gap-2 mb-4 font-pixel text-[8px]" style={{ color: '#8899AA' }}>
          <ArrowLeft className="w-3 h-3" /> BACK TO STANDINGS
        </button>

        {/* Manager Header */}
        <div className="retro-card p-4 mb-6" style={{ borderColor: '#FFD700' }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 flex items-center justify-center font-pixel text-lg" style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
              {manager.name[0]}
            </div>
            <div>
              <h1 className="font-pixel text-sm" style={{ color: '#FFD700' }}>{manager.teamName || manager.name}</h1>
              {manager.realName && <p className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>{manager.realName}</p>}
              <p className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>
                {manager.teamCodes.length} TEAMS · {score.teamsAlive} ALIVE
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="p-2 text-center" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="font-pixel text-lg" style={{ color: '#FFD700' }}>{score.total}</div>
              <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>POINTS</div>
            </div>
            <div className="p-2 text-center" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="font-pixel text-lg" style={{ color: score.teamsAlive > 0 ? '#00AA00' : '#E60012' }}>{score.teamsAlive}</div>
              <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>ALIVE</div>
            </div>
            <div className="p-2 text-center" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="font-pixel text-lg" style={{ color: score.semiFinalists > 0 ? '#CD7F32' : '#8899AA' }}>{score.semiFinalists}</div>
              <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>SF</div>
            </div>
            <div className="p-2 text-center" style={{ backgroundColor: '#1A1A2E' }}>
              <div className="font-pixel text-lg" style={{ color: score.finalists > 0 ? '#FFD700' : '#8899AA' }}>{score.finalists}</div>
              <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>F</div>
            </div>
          </div>
        </div>

        {/* Top Scorer Guess */}
        {manager.topScorerGuess && (
          <div className="retro-card p-4 mb-6" style={{ borderColor: score.topScorerCorrect ? '#00AA00' : '#FFD700' }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-pixel text-[8px] mb-1" style={{ color: '#FFD700' }}>TOP SCORER PICK</h2>
                <div className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>
                  {manager.topScorerGuess.name}
                </div>
                <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                  {manager.topScorerGuess.country}
                </div>
              </div>
              {score.topScorerCorrect ? (
                <div className="text-right">
                  <div className="font-pixel text-sm" style={{ color: '#00AA00' }}>✓ +5</div>
                  <div className="font-pixel text-[7px]" style={{ color: '#00AA00' }}>CORRECT!</div>
                </div>
              ) : state.settings.topScorerActual ? (
                <div className="text-right">
                  <div className="font-pixel text-[8px]" style={{ color: '#E60012' }}>✗ WRONG</div>
                  <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    Actual: {state.settings.topScorerActual.name}
                  </div>
                </div>
              ) : (
                <div className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>PENDING</div>
              )}
            </div>
          </div>
        )}

        {/* Team Cards */}
        <h2 className="font-pixel text-[10px] mb-3" style={{ color: '#FFD700' }}>ROSTER BREAKDOWN</h2>
        <div className="space-y-2">
          {sortedTeams.map(team => {
            const status = getTeamStatus(team.code, state.results);
            const tierInfo = TIER_INFO[team.tier];
            const Icon = tierInfo.icon;
            const eliminated = state.results[team.code]?.eliminated;

            return (
              <div key={team.code} className="retro-card p-3 flex items-center gap-3"
                style={{ borderColor: eliminated ? '#E60012' : tierInfo.color, opacity: eliminated ? 0.6 : 1 }}>
                {/* Flag */}
                <span className="text-2xl">{TEAM_FLAGS[team.code]}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[10px]" style={{ color: '#E8E8E8' }}>{TEAM_NAMES[team.code] || team.code}</span>
                    <Icon className="w-3 h-3" style={{ color: tierInfo.color }} />
                    <span className="font-pixel text-[6px] px-1" style={{ backgroundColor: tierInfo.color, color: '#1A1A2E' }}>
                      {tierInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-pixel text-[7px] px-1.5 py-0.5" style={{ backgroundColor: status.bg, color: status.color }}>
                      {status.label}
                    </span>
                    <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>GROUP {team.code in state.results ? '' : ''}</span>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <div className="font-pixel text-sm" style={{ color: team.points > 0 ? '#FFD700' : '#8899AA' }}>
                    +{team.points}
                  </div>
                  <div className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>PTS</div>
                </div>
              </div>
            );
          })}

          {teams.length === 0 && (
            <div className="retro-card p-6 text-center">
              <p className="font-pixel text-[10px]" style={{ color: '#8899AA' }}>NO TEAMS DRAFTED YET</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
