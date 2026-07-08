import { useState, useEffect } from 'react';
import { getMatrix, getMatrixStats, type MatrixMatch } from '@/data/matchMatrix';
import { TEAM_FLAGS } from '@/data/tournament';
import { Calendar } from 'lucide-react';

export default function FixturesPage() {
  const [matrix, setMatrix] = useState<MatrixMatch[]>(getMatrix());
  const [stats, setStats] = useState(getMatrixStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setMatrix(getMatrix());
      setStats(getMatrixStats());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const groups: Record<string, MatrixMatch[]> = {};
  for (const m of matrix) {
    if (!groups[m.round]) groups[m.round] = [];
    groups[m.round].push(m);
  }

  const roundOrder = [
    'GROUP_A', 'GROUP_B', 'GROUP_C', 'GROUP_D',
    'GROUP_E', 'GROUP_F', 'GROUP_G', 'GROUP_H',
    'GROUP_I', 'GROUP_J', 'GROUP_K', 'GROUP_L',
    'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
  ];

  const roundLabel = (r: string) => {
    if (r.startsWith('GROUP_')) return 'GROUP ' + r.replace('GROUP_', '');
    if (r === 'LAST_32') return 'ROUND OF 32';
    if (r === 'LAST_16') return 'ROUND OF 16';
    if (r === 'QUARTER_FINALS') return 'QUARTER FINALS';
    if (r === 'SEMI_FINALS') return 'SEMI FINALS';
    if (r === 'THIRD_PLACE') return '3RD PLACE PLAYOFF';
    return r;
  };

  const getFlag = (code: string) => TEAM_FLAGS[code] || '';

  const pct = Math.round((stats.scoredMatches / stats.totalMatches) * 100);

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="font-pixel text-lg md:text-2xl mb-1" style={{ color: '#FFD700' }}>FIXTURES & RESULTS</h1>
        <p className="font-pixel text-[8px] mb-4" style={{ color: '#8899AA' }}>
          ALL 104 WORLD CUP 2026 MATCHES · GREEN = SCORED
        </p>

        {/* Progress Bar */}
        <div className="retro-card p-3 mb-4" style={{ borderColor: '#2D3192' }}>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#2D3192' }} />
            <div className="flex-1 h-3" style={{ backgroundColor: '#1A1A2E', border: '1px solid #0F3460' }}>
              <div className="h-full transition-all duration-500" style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? '#00AA00' : pct > 50 ? '#FFD700' : '#2D3192',
              }} />
            </div>
            <span className="font-pixel text-[8px] flex-shrink-0" style={{ color: '#8899AA' }}>
              {stats.scoredMatches}/{stats.totalMatches}
            </span>
            <span className="font-pixel text-[8px] flex-shrink-0" style={{ color: pct > 0 ? '#00AA00' : '#8899AA' }}>
              {pct}%
            </span>
          </div>
        </div>

        {/* Match Grid */}
        <div className="space-y-4">
          {roundOrder.map(round => {
            const matches = groups[round];
            if (!matches || matches.length === 0) return null;
            const scoredCount = matches.filter(m => m.homeGoals !== null).length;

            return (
              <div key={round} className="retro-card p-3" style={{ borderColor: '#1A1A2E' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[9px]" style={{ color: '#FFD700' }}>
                    {roundLabel(round)}
                  </span>
                  <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    {scoredCount}/{matches.length} PLAYED
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {matches.map(m => {
                    const isScored = m.homeGoals !== null;
                    const homeCode = m.homeTeam === 'None' ? 'TBD' : m.homeTeam;
                    const awayCode = m.awayTeam === 'None' ? 'TBD' : m.awayTeam;
                    const homeName = m.homeTeamName === 'None' ? 'TBD' : m.homeTeamName;
                    const awayName = m.awayTeamName === 'None' ? 'TBD' : m.awayTeamName;

                    // Determine winner for highlighting
                    let homeWon = false, awayWon = false, isDraw = false;
                    if (isScored && m.homeGoals !== null && m.awayGoals !== null) {
                      if (m.homeGoals > m.awayGoals) homeWon = true;
                      else if (m.awayGoals > m.homeGoals) awayWon = true;
                      else isDraw = true;
                    }

                    return (
                      <div key={m.id}
                        className="px-3 py-3"
                        style={{
                          backgroundColor: isScored ? 'rgba(0,170,0,0.08)' : 'rgba(26,26,46,0.4)',
                          border: `1px solid ${isScored ? '#00AA00' : '#0F3460'}`,
                        }}>
                        {/* Home Team */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-base flex-shrink-0">{getFlag(homeCode)}</span>
                          <span className={`font-pixel text-[9px] truncate flex-1 ${homeWon ? 'font-bold' : ''}`}
                            style={{ color: homeWon ? '#00AA00' : isScored ? '#E8E8E8' : '#556677' }}>
                            {homeName}
                          </span>
                          {isScored && (
                            <span className={`font-pixel text-sm flex-shrink-0 ${homeWon ? 'font-bold' : ''}`}
                              style={{ color: homeWon ? '#00AA00' : isDraw ? '#FFD700' : '#E8E8E8' }}>
                              {m.homeGoals}
                            </span>
                          )}
                        </div>

                        {/* Away Team */}
                        <div className="flex items-center gap-2">
                          <span className="text-base flex-shrink-0">{getFlag(awayCode)}</span>
                          <span className={`font-pixel text-[9px] truncate flex-1 ${awayWon ? 'font-bold' : ''}`}
                            style={{ color: awayWon ? '#00AA00' : isScored ? '#E8E8E8' : '#556677' }}>
                            {awayName}
                          </span>
                          {isScored && (
                            <span className={`font-pixel text-sm flex-shrink-0 ${awayWon ? 'font-bold' : ''}`}
                              style={{ color: awayWon ? '#00AA00' : isDraw ? '#FFD700' : '#E8E8E8' }}>
                              {m.awayGoals}
                            </span>
                          )}
                        </div>

                        {/* Score line centered when both visible */}
                        {!isScored && (
                          <div className="text-center mt-1">
                            <span className="font-pixel text-[8px]" style={{ color: '#556677' }}>—</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
