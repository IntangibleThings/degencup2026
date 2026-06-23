import { useGame } from '@/context/GameContext';
import { GROUPS, TEAM_FLAGS, TEAM_NAMES, calculateTeamPoints } from '@/data/tournament';
import type { GroupLetter } from '@/data/tournament';

export default function TeamPointsPage() {
  const { state, getScoreForManager } = useGame();

  // Determine top 6 managers for highlighting
  const topSixIds = new Set(
    [...state.managers]
      .map(m => ({ id: m.id, total: getScoreForManager(m.id).total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map(m => m.id)
  );

  // Build a lookup: teamCode → managers who have this team
  const teamOwners: Record<string, { name: string; teamName: string; isTopSix: boolean }[]> = {};
  for (const mgr of state.managers) {
    for (const code of mgr.teamCodes) {
      if (!teamOwners[code]) teamOwners[code] = [];
      teamOwners[code].push({ name: mgr.name, teamName: mgr.teamName || mgr.name, isTopSix: topSixIds.has(mgr.id) });
    }
  }

  const groupLetters: GroupLetter[] = ['A','B','C','D','E','F','G','H','I','J','K','L'];

  return (
    <div className="min-h-screen px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <h1 className="font-pixel text-lg md:text-2xl mb-1" style={{ color: '#FFD700' }}>TEAM POINTS</h1>
        <p className="font-pixel text-[8px] mb-5" style={{ color: '#8899AA' }}>
          EVERY NATIONAL TEAM WITH FANTASY POINTS AND MANAGER OWNERSHIP
        </p>

        {groupLetters.map(letter => {
          const teams = GROUPS[letter];
          return (
            <div key={letter} className="mb-5">
              {/* Group Label */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 flex items-center justify-center font-pixel text-[10px]"
                  style={{ backgroundColor: '#2D3192', color: '#FFD700' }}>
                  {letter}
                </div>
                <span className="font-pixel text-[10px]" style={{ color: '#FFD700' }}>GROUP {letter}</span>
              </div>

              {/* Team Cards */}
              <div className="space-y-1">
                {teams.map(code => {
                  const { points, breakdown } = calculateTeamPoints(code, state.results, state.settings.scoring);
                  const result = state.results[code];
                  const owners = teamOwners[code] || [];
                  const flag = TEAM_FLAGS[code] || '';
                  const name = TEAM_NAMES[code] || code;
                  const pos = result?.groupPosition || 0;

                  // Status color
                  let statusColor = '#556677';
                  let statusLabel = 'NOT STARTED';
                  if (result?.wonWorldCup) { statusColor = '#FFD700'; statusLabel = 'WORLD CHAMP'; }
                  else if (result?.reachedFinal) { statusColor = '#FFD700'; statusLabel = 'IN FINAL'; }
                  else if (result?.reachedSemiFinal) { statusColor = '#e76f51'; statusLabel = 'SEMI FINAL'; }
                  else if (result?.reachedQuarterFinal) { statusColor = '#2D3192'; statusLabel = 'QUARTER FINAL'; }
                  else if (result?.reachedRoundOf16) { statusColor = '#2D3192'; statusLabel = 'ROUND OF 16'; }
                  else if (result?.reachedKnockout) { statusColor = '#00AA00'; statusLabel = 'ADVANCED'; }
                  else if (result?.eliminated) { statusColor = '#E60012'; statusLabel = 'ELIMINATED'; }
                  else if (pos > 0) { statusColor = '#00AA00'; statusLabel = `GROUP ${pos}${['st','nd','rd'][pos-1] || 'th'}`; }

                  return (
                    <div key={code} className="flex items-center gap-2 px-3 py-2"
                      style={{ backgroundColor: 'rgba(10,10,20,0.6)', border: '1px solid #1A1A2E' }}>
                      {/* Flag */}
                      <span className="text-xl flex-shrink-0 w-8 text-center">{flag}</span>
                      {/* Name + Status */}
                      <div className="min-w-0 flex-1">
                        <div className="font-pixel text-[8px] truncate" style={{ color: '#E8E8E8' }}>
                          {name}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-pixel text-[6px] px-1" style={{ backgroundColor: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}` }}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                      {/* Points */}
                      <div className="flex-shrink-0 text-right mr-2">
                        <div className="font-pixel text-sm" style={{ color: points > 0 ? '#FFD700' : '#556677' }}>
                          {points}
                        </div>
                        <div className="font-pixel text-[5px]" style={{ color: '#8899AA' }}>PTS</div>
                      </div>
                      {/* Breakdown tooltip on hover */}
                      {breakdown.length > 0 && (
                        <div className="hidden group-hover:block absolute z-10">
                          {breakdown.map((b, i) => (
                            <div key={i} className="font-pixel text-[6px]" style={{ color: '#8899AA' }}>{b}</div>
                          ))}
                        </div>
                      )}
                      {/* Owners */}
                      <div className="flex-shrink-0 flex flex-wrap gap-1 justify-end" style={{ minWidth: '80px' }}>
                        {owners.length === 0 && (
                          <span className="font-pixel text-[8px]" style={{ color: '#556677' }}>—</span>
                        )}
                        {owners.slice(0, 3).map(o => (
                          <span key={o.name}
                            className="font-pixel text-[8px] px-2 py-0.5 truncate max-w-[80px]"
                            style={{
                              backgroundColor: o.isTopSix ? 'rgba(0,170,0,0.15)' : 'rgba(45,49,146,0.3)',
                              color: o.isTopSix ? '#00AA00' : '#E8E8E8',
                              border: `1px solid ${o.isTopSix ? '#00AA00' : '#0F3460'}`,
                            }}
                            title={o.teamName}>
                            {o.teamName}
                          </span>
                        ))}
                        {owners.length > 3 && (
                          <span className="font-pixel text-[8px]" style={{ color: '#8899AA' }}>+{owners.length - 3}</span>
                        )}
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
  );
}
