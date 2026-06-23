import { useState, useEffect } from 'react';
import { getMatrix, getMatrixStats, type MatrixMatch } from '@/data/matchMatrix';
import { Calendar } from 'lucide-react';

export default function FixturesPage() {
  const [matrix, setMatrix] = useState<MatrixMatch[]>(getMatrix());
  const [stats, setStats] = useState(getMatrixStats());

  // Refresh every 2 seconds to catch updates from other tabs/admin
  useEffect(() => {
    const interval = setInterval(() => {
      setMatrix(getMatrix());
      setStats(getMatrixStats());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Group by round
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

        {/* Match Grid by Round */}
        <div className="space-y-4">
          {roundOrder.map(round => {
            const matches = groups[round];
            if (!matches || matches.length === 0) return null;
            const scoredCount = matches.filter(m => m.homeGoals !== null).length;

            return (
              <div key={round} className="retro-card p-3" style={{ borderColor: '#1A1A2E' }}>
                {/* Round Header */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-pixel text-[9px]" style={{ color: '#FFD700' }}>
                    {roundLabel(round)}
                  </span>
                  <span className="font-pixel text-[7px]" style={{ color: '#8899AA' }}>
                    {scoredCount}/{matches.length} PLAYED
                  </span>
                </div>

                {/* Match Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
                  {matches.map(m => {
                    const isScored = m.homeGoals !== null;
                    const home = m.homeTeam === 'None' ? 'TBD' : m.homeTeam;
                    const away = m.awayTeam === 'None' ? 'TBD' : m.awayTeam;
                    const homeName = m.homeTeamName === 'None' ? 'TBD' : m.homeTeamName;
                    const awayName = m.awayTeamName === 'None' ? 'TBD' : m.awayTeamName;

                    return (
                      <div key={m.id}
                        className="px-2 py-2 flex flex-col"
                        style={{
                          backgroundColor: isScored ? 'rgba(0,170,0,0.08)' : 'rgba(26,26,46,0.4)',
                          border: `1px solid ${isScored ? '#00AA00' : '#0F3460'}`,
                        }}>
                        {/* Teams */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-pixel text-[7px] truncate flex-1" style={{ color: isScored ? '#E8E8E8' : '#556677' }}
                            title={homeName}>
                            {home}
                          </span>
                          <span className="font-pixel text-[6px] mx-1" style={{ color: '#8899AA' }}>v</span>
                          <span className="font-pixel text-[7px] truncate flex-1 text-right" style={{ color: isScored ? '#E8E8E8' : '#556677' }}
                            title={awayName}>
                            {away}
                          </span>
                        </div>
                        {/* Score */}
                        <div className="text-center">
                          <span className="font-pixel text-[10px]" style={{ color: isScored ? '#00AA00' : '#556677' }}>
                            {isScored ? `${m.homeGoals} - ${m.awayGoals}` : '—'}
                          </span>
                        </div>
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
