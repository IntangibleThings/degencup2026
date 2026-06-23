import { useGame } from '@/context/GameContext';
import { GROUPS, TEAM_FLAGS, TEAM_NAMES, calculateTeamPoints } from '@/data/tournament';
import { deriveResultsFromMatrix } from '@/data/resultsEngine';
import type { GroupLetter } from '@/data/tournament';
import type { TournamentResults } from '@/data/tournament';
import { useMemo } from 'react';

export default function TeamPointsPage() {
  const { state, getScoreForManager } = useGame();

  // Derive results directly from the Match Matrix (single source of truth)
  // This ensures consistency with the Fixtures page
  const matrixResults: TournamentResults = useMemo(() => {
    try {
      return deriveResultsFromMatrix();
    } catch {
      return state.results;
    }
  }, [state.results]); // Re-derive when results change

  // Determine top 6 managers for highlighting
  const topSixIds = new Set(
    [...state.managers]
      .map(m => ({ id: m.id, total: getScoreForManager(m.id).total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6)
      .map(m => m.id)
  );

  // Build lookup: teamCode → managers who have this team
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
                  const { points } = calculateTeamPoints(code, matrixResults, state.settings.scoring);
                  const result = matrixResults[code];
                  const owners = teamOwners[code] || [];
                  const flag = TEAM_FLAGS[code] || '';
                  const name = TEAM_NAMES[code] || code;
                  const pos = result?.groupPosition || 0;

                  // Status: simplified to Advancing / Not Advancing
                  let statusColor = '#556677';
                  let statusLabel = 'NOT STARTED';
                  if (result?.wonWorldCup) { statusColor = '#FFD700'; statusLabel = 'WORLD CHAMP'; }
                  else if (result?.reachedFinal) { statusColor = '#FFD700'; statusLabel = 'FINALIST'; }
                  else if (result?.reachedSemiFinal) { statusColor = '#e76f51'; statusLabel = 'SEMI FINAL'; }
                  else if (result?.reachedQuarterFinal) { statusColor = '#2D3192'; statusLabel = 'QUARTER FINAL'; }
                  else if (result?.reachedRoundOf16) { statusColor = '#2D3192'; statusLabel = 'ROUND OF 16'; }
                  else if (result?.reachedKnockout) { statusColor = '#00AA00'; statusLabel = 'ADVANCED'; }
                  else if (result?.eliminated) { statusColor = '#E60012'; statusLabel = 'NOT ADVANCING'; }
                  else if (pos === 1 || pos === 2) { statusColor = '#00AA00'; statusLabel = 'ADVANCING'; }
                  else if (pos === 3 || pos === 4) { statusColor = '#E60012'; statusLabel = 'NOT ADVANCING'; }

                  return (
                    <div key={code} className="px-3 py-2"
                      style={{ backgroundColor: 'rgba(10,10,20,0.6)', border: '1px solid #1A1A2E' }}>

                      {/* Row 1: Flag | Name + Status | Points (far right) */}
                      <div className="flex items-center gap-2">
                        <span className="text-lg flex-shrink-0 w-8 text-center">{flag}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-pixel text-[10px] truncate" style={{ color: '#E8E8E8' }}>
                            {name}
                          </div>
                        </div>
                        <span className="font-pixel text-[7px] px-1.5 py-0.5 flex-shrink-0"
                          style={{ backgroundColor: statusColor + '22', color: statusColor, border: `1px solid ${statusColor}` }}>
                          {statusLabel}
                        </span>
                        <div className="flex-shrink-0 text-right" style={{ minWidth: '36px' }}>
                          <span className="font-pixel text-base" style={{ color: points > 0 ? '#FFD700' : '#556677' }}>
                            {points}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Manager owners (if any) */}
                      {owners.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 ml-10">
                          {owners.map(o => (
                            <span key={o.name}
                              className="font-pixel text-[7px] px-1.5 py-0.5"
                              style={{
                                backgroundColor: o.isTopSix ? 'rgba(0,170,0,0.15)' : 'rgba(45,49,146,0.3)',
                                color: o.isTopSix ? '#00AA00' : '#E8E8E8',
                                border: `1px solid ${o.isTopSix ? '#00AA00' : '#0F3460'}`,
                              }}>
                              {o.teamName}
                            </span>
                          ))}
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
  );
}
