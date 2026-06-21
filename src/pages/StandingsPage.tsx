import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/context/GameContext';
import { Trophy, Users, TrendingUp, Clock } from 'lucide-react';

export default function StandingsPage() {
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

  // Get last updated timestamp in HKT
  const getLastUpdated = (): string => {
    try {
      const raw = localStorage.getItem('wc2026_derived_at') || localStorage.getItem('wc2026_fixtures_last_fetch');
      if (!raw || raw === 'null') return 'Not yet updated';
      // Handle both ISO strings and numeric timestamps
      const timestamp = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Not yet updated';
      return date.toLocaleString('en-HK', {
        timeZone: 'Asia/Hong_Kong',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' HKT';
    } catch {
      return 'Not yet updated';
    }
  };

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="font-pixel text-lg md:text-2xl mb-1" style={{ color: '#FFD700' }}>STANDINGS</h1>
        <p className="font-pixel text-[8px] mb-2" style={{ color: '#8899AA' }}>
          MANAGERS RANKED BY TOTAL POINTS
        </p>
        <div className="flex items-center gap-1 mb-5">
          <Clock className="w-3 h-3" style={{ color: '#00c8ff' }} />
          <span className="font-pixel text-[7px]" style={{ color: '#00c8ff' }}>
            LAST UPDATED: {getLastUpdated()}
          </span>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="retro-card p-3 text-center" style={{ borderColor: '#FFD700' }}>
            <Users className="w-4 h-4 mx-auto mb-1" style={{ color: '#FFD700' }} />
            <div className="font-pixel text-xl" style={{ color: '#FFD700' }}>{state.managers.length}</div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>MANAGERS</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#2D3192' }}>
            <TrendingUp className="w-4 h-4 mx-auto mb-1" style={{ color: '#2D3192' }} />
            <div className="font-pixel text-xl" style={{ color: '#E8E8E8' }}>
              {managerScores[0]?.total || 0}
            </div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>LEADING</div>
          </div>
          <div className="retro-card p-3 text-center" style={{ borderColor: '#00AA00' }}>
            <Trophy className="w-4 h-4 mx-auto mb-1" style={{ color: '#00AA00' }} />
            <div className="font-pixel text-[9px] truncate px-1" style={{ color: '#00AA00' }}>
              {managerScores[0]?.teamName || managerScores[0]?.name || '---'}
            </div>
            <div className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>TOP</div>
          </div>
        </div>

        {/* Leaderboard */}
        {managerScores.length === 0 ? (
          <div className="retro-card p-8 text-center">
            <p className="font-pixel text-[10px]" style={{ color: '#8899AA' }}>NO MANAGERS YET</p>
            <button onClick={() => navigate('/draft')} className="pixel-btn gold mt-4">JOIN DRAFT</button>
          </div>
        ) : (
          <div className="space-y-2">
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
                  className="cursor-pointer transition-colors"
                  style={{
                    padding: '12px',
                    backgroundColor: isCurrent ? 'rgba(15,52,96,0.4)' : 'rgba(10,10,20,0.6)',
                    border: isCurrent ? '1px solid #FFD700' : '1px solid #1A1A2E',
                    borderLeftWidth: isCurrent ? '4px' : '1px',
                    borderLeftColor: isCurrent ? '#FFD700' : '#1A1A2E',
                  }}>
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    {/* Top Row: Rank + Name + Points */}
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[10px] w-5 flex-shrink-0 text-center" style={{ color: rankColor(idx) }}>
                        {idx + 1}
                      </span>
                      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-pixel text-[9px]"
                        style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
                        {(mgr.teamName || mgr.name)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-pixel text-[9px] truncate" style={{ color: '#FFD700' }}>
                          {mgr.teamName || mgr.name}
                        </div>
                        {mgr.realName && (
                          <div className="font-pixel text-[6px] truncate" style={{ color: '#8899AA' }}>
                            {mgr.realName}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="font-pixel text-lg" style={{ color: '#FFD700' }}>{mgr.total}</span>
                        {mgr.topScorerCorrect && (
                          <span className="font-pixel text-[6px] px-1" style={{ backgroundColor: '#FFD700', color: '#1A1A2E' }}>+5</span>
                        )}
                      </div>
                    </div>
                    {/* Bottom Row: Stats */}
                    <div className="flex items-center gap-4 mt-2 ml-7">
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

                  {/* Desktop Layout */}
                  <div className="hidden md:grid md:grid-cols-12 md:gap-2 md:items-center">
                    <div className="col-span-1 font-pixel text-[10px]" style={{ color: rankColor(idx) }}>
                      {idx + 1}
                    </div>
                    <div className="col-span-5 flex items-center gap-2">
                      <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center font-pixel text-[9px]"
                        style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
                        {(mgr.teamName || mgr.name)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-pixel text-[9px] truncate" style={{ color: '#FFD700' }}>
                          {mgr.teamName || mgr.name}
                        </div>
                        {mgr.realName && (
                          <div className="font-pixel text-[6px] truncate" style={{ color: '#8899AA' }}>
                            {mgr.realName}
                          </div>
                        )}
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
        )}
      </div>
    </div>
  );
}
