import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Trophy, Users, TrendingUp } from 'lucide-react';

export default function StandingsPage() {
  const navigate = useNavigate();
  const { state, getTeamsForManager, getScoreForManager } = useGame();
  // Calculate scores for all managers
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


  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-pixel text-lg md:text-2xl mb-2" style={{ color: '#FFD700' }}>LIVE STANDINGS</h1>
        <p className="font-pixel text-[8px] mb-6" style={{ color: '#8899AA' }}>
          MANAGERS RANKED BY TOTAL POINTS · UPDATES AFTER EACH MATCH
        </p>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="retro-card p-3 text-center" style={{ borderColor: '#FFD700' }}>
            <Users className="w-4 h-4 mx-auto mb-1" style={{ color: '#FFD700' }} />
            <div className="font-pixel text-lg" style={{ color: '#FFD700' }}>{state.managers.length}</div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>MANAGERS</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#2D3192' }}>
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: '#2D3192' }} />
            <div className="font-pixel text-lg" style={{ color: '#E8E8E8' }}>
              {managerScores[0]?.total || 0}
            </div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>LEADING</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#00AA00' }}>
            <Trophy className="w-4 h-4 mx-auto mb-1" style={{ color: '#00AA00' }} />
            <div className="font-pixel text-lg" style={{ color: '#00AA00' }}>
              {managerScores[0]?.name || '---'}
            </div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>TOP</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        {managerScores.length === 0 ? (
          <div className="retro-card p-8 text-center">
            <p className="font-pixel text-[10px]" style={{ color: '#8899AA' }}>NO MANAGERS YET</p>
            <button onClick={() => navigate('/draft')} className="pixel-btn gold mt-4">JOIN DRAFT</button>
          </div>
        ) : (
          <div className="retro-card p-0 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 px-3 py-2 font-pixel text-[7px]" style={{ backgroundColor: 'rgba(45,49,146,0.3)', color: '#8899AA' }}>
              <div className="col-span-1">#</div>
              <div className="col-span-3">MANAGER</div>
              <div className="col-span-2 text-center">POINTS</div>
              <div className="col-span-1 text-center">ALIVE</div>
              <div className="col-span-1 text-center">SF</div>
              <div className="col-span-1 text-center">F</div>
              <div className="col-span-3 text-center">TOP TEAM</div>
            </div>

            {managerScores.map((mgr, idx) => {
              const teams = getTeamsForManager(mgr.id);
              const topTeam = teams.length > 0 ? teams.sort((a, b) => b.points - a.points)[0] : null;
              const isCurrent = mgr.name === state.currentUser;

              return (
                <div key={mgr.id}
                  onClick={() => navigate(`/manager/${mgr.name}`)}
                  className="grid grid-cols-12 gap-1 px-3 py-2 items-center cursor-pointer transition-colors"
                  style={{
                    borderBottom: '1px solid #1A1A2E',
                    backgroundColor: isCurrent ? 'rgba(15,52,96,0.5)' : 'transparent',
                    borderLeft: isCurrent ? '4px solid #FFD700' : '4px solid transparent',
                  }}>
                  <div className="col-span-1 font-pixel text-[10px]" style={{ color: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#8899AA' }}>
                    {idx + 1}
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="w-6 h-6 flex items-center justify-center font-pixel text-[8px]" style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
                      {(mgr.teamName || mgr.name)[0]}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-pixel text-[8px] truncate" style={{ color: '#FFD700' }}>{mgr.teamName || mgr.name}</span>
                      {mgr.realName && <span className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>{mgr.realName}</span>}
                    </div>
                  </div>
                  <div className="col-span-2 text-center">
                    <span className="font-pixel text-sm" style={{ color: '#FFD700' }}>{mgr.total}</span>
                    {mgr.topScorerCorrect && (
                      <span className="font-pixel text-[6px] ml-1 px-1" style={{ backgroundColor: '#FFD700', color: '#1A1A2E' }}>+5</span>
                    )}
                  </div>
                  <div className="col-span-1 text-center font-pixel text-[9px]" style={{ color: mgr.teamsAlive > 0 ? '#00AA00' : '#E60012' }}>
                    {mgr.teamsAlive}
                  </div>
                  <div className="col-span-1 text-center font-pixel text-[9px]" style={{ color: '#E8E8E8' }}>
                    {mgr.semiFinalists}
                  </div>
                  <div className="col-span-1 text-center font-pixel text-[9px]" style={{ color: mgr.finalists > 0 ? '#FFD700' : '#8899AA' }}>
                    {mgr.finalists}
                  </div>
                  <div className="col-span-3 text-center">
                    {topTeam && (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{topTeam.flag}</span>
                        <span className="font-pixel text-[7px]" style={{ color: '#FFD700' }}>+{topTeam.points}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
