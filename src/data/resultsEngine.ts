// Results Engine — Derives fantasy scoring data from match results
// Takes match scores → calculates group standings → determines knockout progress
// → generates TournamentResults for the scoring system
//
// HOW IT WORKS:
// 1. Match results come in (from football-data.org API or Paste Scores)
// 2. We calculate group standings (points, goal difference, goals for)
// 3. Top 2 from each group → reachedKnockout + reachedRoundOf32
// 4. Knockout match results → reachedRoundOf16 → QF → SF → Final → Winner
// 5. Semi-final losers → 3rd place match
// 6. All derived data is saved to GameContext as TournamentResults
// 7. The scoring system (getScoreForManager) reads TournamentResults to award points

import type { Match } from './fixtures';
import type { TournamentResults } from './tournament';
import { GROUPS as TOURNAMENT_GROUPS, TEAM_FLAGS } from './tournament';

// Build group name → teams map from canonical tournament data
const GROUPS: Record<string, string[]> = {};
for (const [letter, teams] of Object.entries(TOURNAMENT_GROUPS)) {
  GROUPS[`Group ${letter}`] = teams;
}

interface GroupStanding {
  team: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

/**
 * Calculate group standings from match results.
 */
function calculateGroupStandings(matches: Match[]): Map<string, GroupStanding[]> {
  const tables = new Map<string, Map<string, GroupStanding>>();

  // Initialize all groups
  for (const [groupName, teams] of Object.entries(GROUPS)) {
    const table = new Map<string, GroupStanding>();
    for (const team of teams) {
      table.set(team, { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 });
    }
    tables.set(groupName, table);
  }

  // Process finished matches
  for (const match of matches) {
    if (match.status !== 'FT' && match.status !== 'AET' && match.status !== 'PEN') continue;
    if (match.homeGoals === null || match.awayGoals === null) continue;

    // Find which group this match belongs to
    for (const [groupName, teams] of Object.entries(GROUPS)) {
      if (teams.includes(match.homeTeam) && teams.includes(match.awayTeam)) {
        const table = tables.get(groupName)!;
        const home = table.get(match.homeTeam)!;
        const away = table.get(match.awayTeam)!;

        home.played++; away.played++;
        home.gf += match.homeGoals; home.ga += match.awayGoals;
        away.gf += match.awayGoals; away.ga += match.homeGoals;

        if (match.homeGoals > match.awayGoals) {
          home.won++; home.points += 3; away.lost++;
        } else if (match.homeGoals < match.awayGoals) {
          away.won++; away.points += 3; home.lost++;
        } else {
          home.drawn++; away.drawn++; home.points++; away.points++;
        }
        break;
      }
    }
  }

  // Calculate GD and sort
  const result = new Map<string, GroupStanding[]>();
  for (const [groupName, table] of tables) {
    const standings = Array.from(table.values());
    for (const s of standings) s.gd = s.gf - s.ga;
    standings.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });
    result.set(groupName, standings);
  }

  return result;
}

/**
 * Determine the knockout round from football-data.org stage/round strings.
 * 48-team World Cup stages: GROUP_STAGE, LAST_32, LAST_16, QUARTER_FINALS, SEMI_FINALS, FINAL, THIRD_PLACE
 */
function getKnockoutRound(round: string): 'r32' | 'r16' | 'qf' | 'sf' | 'final' | '3rd' | null {
  const r = round.toUpperCase();
  if (r.includes('LAST_32') || r.includes('ROUND OF 32') || r.includes('R32')) return 'r32';
  if (r.includes('LAST_16') || r.includes('ROUND OF 16') || r.includes('R16')) return 'r16';
  if (r.includes('QUARTER') || r.includes('QF')) return 'qf';
  if (r.includes('SEMI')) return 'sf';
  if (r === 'FINAL' || (r.includes('FINAL') && !r.includes('3RD') && !r.includes('THIRD') && !r.includes('QUARTER'))) return 'final';
  if (r.includes('3RD') || r.includes('THIRD')) return '3rd';
  return null;
}

/**
 * Derive TournamentResults from match results.
 * This is what connects match scores to your fantasy scoring system.
 *
 * Scoring flow:
 *   Group position points → reachedRoundOf16 points → QF → SF → Final → Winner
 *   Plus: 3rd place playoff winner gets bonus
 */
export function deriveResultsFromMatches(matches: Match[]): TournamentResults {
  const results: TournamentResults = {};
  const standings = calculateGroupStandings(matches);

  // Initialize all 48 teams
  const allTeams = Object.values(GROUPS).flat();
  for (const team of allTeams) {
    results[team] = {
      groupPosition: 0,
      reachedKnockout: false,
      reachedRoundOf16: false,
      reachedQuarterFinal: false,
      reachedSemiFinal: false,
      reachedFinal: false,
      wonWorldCup: false,
      wonThirdPlace: false,
      eliminated: false,
    };
  }

  // ── GROUP STAGE ──
  // Set group positions. Top 2 in each group advance to knockout (Round of 32).
  for (const [, groupStandings] of standings) {
    for (let i = 0; i < groupStandings.length; i++) {
      const s = groupStandings[i];
      results[s.team].groupPosition = i + 1;

      if (i < 2) {
        // Top 2 qualify for knockout
        results[s.team].reachedKnockout = true;
      } else if (s.played > 0) {
        // 3rd/4th place with matches played = eliminated
        results[s.team].eliminated = true;
      }
    }
  }

  // ── KNOCKOUT STAGE ──
  // Process finished knockout matches to determine how far each team advanced.
  // 48-team path: R32 → R16 → QF → SF → Final
  // Scoring milestones: R16, QF, SF, Final, Winner, 3rd Place

  const finishedMatches = matches.filter(m =>
    m.status === 'FT' || m.status === 'AET' || m.status === 'PEN'
  );

  for (const match of finishedMatches) {
    if (match.homeGoals === null || match.awayGoals === null) continue;

    const round = getKnockoutRound(match.round || '');
    if (!round) continue; // Skip group stage matches here

    const homeTeam = match.homeTeam;
    const awayTeam = match.awayTeam;
    const homeWon = match.homeGoals > match.awayGoals;
    const isDraw = match.homeGoals === match.awayGoals;

    // Determine winner (for PEN matches, the score already reflects the winner)
    const winner = isDraw ? null : (homeWon ? homeTeam : awayTeam);
    const loser = isDraw ? null : (homeWon ? awayTeam : homeTeam);

    switch (round) {
      case 'r32': {
        // Round of 32 winners advance to Round of 16
        if (winner && results[winner]) {
          results[winner].reachedRoundOf16 = true;
        }
        if (loser && results[loser]) {
          results[loser].eliminated = true;
        }
        break;
      }
      case 'r16': {
        // Round of 16 winners advance to Quarter Finals
        if (winner && results[winner]) {
          results[winner].reachedQuarterFinal = true;
        }
        break;
      }
      case 'qf': {
        // Quarter Final winners advance to Semi Finals
        if (winner && results[winner]) {
          results[winner].reachedSemiFinal = true;
        }
        break;
      }
      case 'sf': {
        // Semi Final winners advance to Final
        if (winner && results[winner]) {
          results[winner].reachedFinal = true;
        }
        // Semi Final losers play for 3rd place (not eliminated yet)
        break;
      }
      case 'final': {
        // Final winner = World Cup champion
        if (winner && results[winner]) {
          results[winner].wonWorldCup = true;
        }
        // Final loser = runner-up (already has reachedFinal)
        break;
      }
      case '3rd': {
        // 3rd place playoff winner
        if (winner && results[winner]) {
          results[winner].wonThirdPlace = true;
        }
        break;
      }
    }
  }

  // Teams that reached a later stage automatically keep their earlier stage flags
  // (already handled by the scoring system reading individual booleans)

  return results;
}

/**
 * Generate a human-readable preview of what the results engine derived.
 * Shows group standings and knockout progress for admin review.
 */
export function generateResultsPreview(matches: Match[]): {
  results: TournamentResults;
  groupSummaries: { group: string; standings: { team: string; flag: string; pts: number; gd: number; pos: number }[] }[];
  knockoutSummary: { round: string; matches: string[] };
  teamsUpdated: number;
} {
  const results = deriveResultsFromMatches(matches);

  // Build group summaries
  const groupStandings = calculateGroupStandings(matches);
  const groupSummaries = [];
  for (const [groupName, standings] of groupStandings) {
    groupSummaries.push({
      group: groupName,
      standings: standings.map((s, i) => ({
        team: s.team,
        flag: TEAM_FLAGS[s.team] || '',
        pts: s.points,
        gd: s.gd,
        pos: i + 1,
      })),
    });
  }

  // Build knockout summary
  const finishedMatches = matches.filter(m => m.status === 'FT' || m.status === 'AET' || m.status === 'PEN');
  const koMatches = finishedMatches.filter(m => getKnockoutRound(m.round || '') !== null);
  const matchesByRound: Record<string, string[]> = {};
  for (const m of koMatches) {
    const round = getKnockoutRound(m.round || '');
    if (!round) continue;
    const roundLabel = round === 'r32' ? 'Round of 32' : round === 'r16' ? 'Round of 16' : round === 'qf' ? 'Quarter-Finals' : round === 'sf' ? 'Semi-Finals' : round === 'final' ? 'Final' : '3rd Place';
    if (!matchesByRound[roundLabel]) matchesByRound[roundLabel] = [];
    matchesByRound[roundLabel].push(`${TEAM_FLAGS[m.homeTeam] || ''}${m.homeTeam} ${m.homeGoals}-${m.awayGoals} ${m.awayTeam}${TEAM_FLAGS[m.awayTeam] || ''}`);
  }
  const latestRound = Object.keys(matchesByRound).pop() || 'None';
  const knockoutSummary = {
    round: latestRound,
    matches: matchesByRound[latestRound] || [],
  };

  // Count teams with meaningful data
  let teamsUpdated = 0;
  for (const r of Object.values(results)) {
    if (r.groupPosition > 0 || r.reachedKnockout || r.eliminated) {
      teamsUpdated++;
    }
  }

  return { results, groupSummaries, knockoutSummary, teamsUpdated };
}

/**
 * Apply derived results to the game state.
 * Call this after fetching match results from any source.
 * Returns the results for dispatching to GameContext via SET_RESULTS action.
 */
export function applyMatchResultsToGame(matches: Match[]): {
  results: TournamentResults;
  updatedTeams: number;
} {
  const preview = generateResultsPreview(matches);

  // Save to localStorage as backup
  try {
    localStorage.setItem('wc2026_derived_results', JSON.stringify(preview.results));
    localStorage.setItem('wc2026_derived_at', new Date().toISOString());
  } catch { /* ignore */ }

  return { results: preview.results, updatedTeams: preview.teamsUpdated };
}
