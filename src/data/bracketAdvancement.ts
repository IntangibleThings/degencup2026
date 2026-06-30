// Bracket Advancement — Maps group results to knockout slots for 48-team World Cup 2026
// After group stage completes, top 2 from each group + 8 best 3rd-place teams advance.

import { getMatrix } from './matchMatrix';

interface GroupResult {
  group: string;
  teams: { code: string; name: string; pts: number; gd: number; gf: number; position: number }[];
}

// ── GROUP STANDINGS CALCULATION ──

function calculateGroupResults(): GroupResult[] {
  const matrix = getMatrix();
  const groupLetters = 'ABCDEFGHIJKL';
  const results: GroupResult[] = [];

  for (const letter of groupLetters) {
    const roundName = `GROUP_${letter}`;
    const matches = matrix.filter(m => m.round === roundName && m.homeGoals !== null);

    const teamStats: Record<string, { code: string; name: string; pts: number; gd: number; gf: number; ga: number; played: number }> = {};

    for (const m of matches) {
      if (!teamStats[m.homeTeam]) teamStats[m.homeTeam] = { code: m.homeTeam, name: m.homeTeamName, pts: 0, gd: 0, gf: 0, ga: 0, played: 0 };
      if (!teamStats[m.awayTeam]) teamStats[m.awayTeam] = { code: m.awayTeam, name: m.awayTeamName, pts: 0, gd: 0, gf: 0, ga: 0, played: 0 };

      const hg = m.homeGoals || 0;
      const ag = m.awayGoals || 0;
      teamStats[m.homeTeam].played++;
      teamStats[m.awayTeam].played++;
      teamStats[m.homeTeam].gf += hg;
      teamStats[m.homeTeam].ga += ag;
      teamStats[m.awayTeam].gf += ag;
      teamStats[m.awayTeam].ga += hg;

      if (hg > ag) { teamStats[m.homeTeam].pts += 3; }
      else if (hg < ag) { teamStats[m.awayTeam].pts += 3; }
      else { teamStats[m.homeTeam].pts += 1; teamStats[m.awayTeam].pts += 1; }
    }

    for (const t of Object.values(teamStats)) {
      t.gd = t.gf - t.ga;
    }

    const sorted = Object.values(teamStats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    }).map((t, i) => ({ code: t.code, name: t.name, pts: t.pts, gd: t.gd, gf: t.gf, position: i + 1 }));

    results.push({ group: letter, teams: sorted });
  }

  return results;
}

function getBestThirdPlaced(groupResults: GroupResult[]): { group: string; code: string; name: string; pts: number; gd: number }[] {
  return groupResults
    .filter(g => g.teams.length >= 3)
    .map(g => ({
      group: g.group,
      code: g.teams[2].code,
      name: g.teams[2].name,
      pts: g.teams[2].pts,
      gd: g.teams[2].gd,
    }))
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      return b.gd - a.gd;
    })
    .slice(0, 8);
}

// ── KNOCKOUT MATCH ID MAPPING ──
// FIFA 2026 bracket match IDs from the schedule JSON
export const R32_IDS = [537415,537416,537417,537418,537419,537420,537421,537422,537423,537424,537425,537426,537427,537428,537429,537430];
const THIRD_ID = 537389;
// R16=537375-82, QF=537383-86, SF=537387-88, Final=537390 — referenced via ADVANCEMENT_MAP below

// ── WINNER ADVANCEMENT MAP ──
// Defines which match winners advance to which next-round match slots.
// Format: winnerMatchId → { nextMatchId, side }
const ADVANCEMENT_MAP: Record<number, { nextMatchId: number; side: 'home' | 'away' }> = {};

// R32 winners → R16
// R32-1 winner vs R32-2 winner → R16-1
ADVANCEMENT_MAP[537415] = { nextMatchId: 537375, side: 'home' };
ADVANCEMENT_MAP[537416] = { nextMatchId: 537375, side: 'away' };
// R32-3 winner vs R32-4 winner → R16-2
ADVANCEMENT_MAP[537417] = { nextMatchId: 537376, side: 'home' };
ADVANCEMENT_MAP[537418] = { nextMatchId: 537376, side: 'away' };
// R32-5 winner vs R32-6 winner → R16-3
ADVANCEMENT_MAP[537419] = { nextMatchId: 537377, side: 'home' };
ADVANCEMENT_MAP[537420] = { nextMatchId: 537377, side: 'away' };
// R32-7 winner vs R32-8 winner → R16-4
ADVANCEMENT_MAP[537421] = { nextMatchId: 537378, side: 'home' };
ADVANCEMENT_MAP[537422] = { nextMatchId: 537378, side: 'away' };
// R32-9 winner vs R32-10 winner → R16-5
ADVANCEMENT_MAP[537423] = { nextMatchId: 537379, side: 'home' };
ADVANCEMENT_MAP[537424] = { nextMatchId: 537379, side: 'away' };
// R32-11 winner vs R32-12 winner → R16-6
ADVANCEMENT_MAP[537425] = { nextMatchId: 537380, side: 'home' };
ADVANCEMENT_MAP[537426] = { nextMatchId: 537380, side: 'away' };
// R32-13 winner vs R32-14 winner → R16-7
ADVANCEMENT_MAP[537427] = { nextMatchId: 537381, side: 'home' };
ADVANCEMENT_MAP[537428] = { nextMatchId: 537381, side: 'away' };
// R32-15 winner vs R32-16 winner → R16-8
ADVANCEMENT_MAP[537429] = { nextMatchId: 537382, side: 'home' };
ADVANCEMENT_MAP[537430] = { nextMatchId: 537382, side: 'away' };

// R16 winners → QF
ADVANCEMENT_MAP[537375] = { nextMatchId: 537383, side: 'home' };
ADVANCEMENT_MAP[537376] = { nextMatchId: 537383, side: 'away' };
ADVANCEMENT_MAP[537377] = { nextMatchId: 537384, side: 'home' };
ADVANCEMENT_MAP[537378] = { nextMatchId: 537384, side: 'away' };
ADVANCEMENT_MAP[537379] = { nextMatchId: 537385, side: 'home' };
ADVANCEMENT_MAP[537380] = { nextMatchId: 537385, side: 'away' };
ADVANCEMENT_MAP[537381] = { nextMatchId: 537386, side: 'home' };
ADVANCEMENT_MAP[537382] = { nextMatchId: 537386, side: 'away' };

// QF winners → SF
ADVANCEMENT_MAP[537383] = { nextMatchId: 537387, side: 'home' };
ADVANCEMENT_MAP[537384] = { nextMatchId: 537387, side: 'away' };
ADVANCEMENT_MAP[537385] = { nextMatchId: 537388, side: 'home' };
ADVANCEMENT_MAP[537386] = { nextMatchId: 537388, side: 'away' };

// ── FIFA 2026 BRACKET RULES ──
// Round of 32 pairings based on FIFA's 12-group bracket
function buildR32Mapping(
  firsts: Record<string, string>,
  seconds: Record<string, string>,
  thirds: Record<string, string>
): { matchId: number; home: string; away: string }[] {
  // FIFA 2026 Ro32 bracket (simplified standard mapping)
  // Maps group positions to specific Ro32 match slots
  const pairings: { home: string; away: string }[] = [
    { home: firsts['A'],  away: thirds['C'] || thirds['D'] || thirds['E'] },
    { home: firsts['B'],  away: thirds['A'] || thirds['B'] || thirds['F'] },
    { home: seconds['A'], away: seconds['B'] },
    { home: firsts['C'],  away: thirds['D'] || thirds['E'] || thirds['I'] },
    { home: firsts['D'],  away: thirds['F'] || thirds['G'] || thirds['H'] },
    { home: seconds['C'], away: seconds['D'] },
    { home: firsts['E'],  away: thirds['G'] || thirds['H'] || thirds['I'] },
    { home: firsts['F'],  away: thirds['H'] || thirds['I'] || thirds['J'] },
    { home: seconds['E'], away: seconds['F'] },
    { home: firsts['G'],  away: thirds['I'] || thirds['J'] || thirds['K'] },
    { home: firsts['H'],  away: thirds['J'] || thirds['K'] || thirds['L'] },
    { home: seconds['G'], away: seconds['H'] },
    { home: firsts['I'],  away: thirds['A'] || thirds['B'] || thirds['C'] },
    { home: firsts['J'],  away: thirds['D'] || thirds['E'] || thirds['F'] },
    { home: seconds['I'], away: seconds['J'] },
    { home: firsts['K'],  away: thirds['G'] || thirds['H'] || thirds['J'] },
  ];

  return pairings.map((p, i) => ({
    matchId: R32_IDS[i],
    home: p.home || 'TBD',
    away: p.away || 'TBD',
  })).filter(p => p.home !== 'TBD' || p.away !== 'TBD');
}

// ── PUBLIC API ──

export interface BracketSuggestion {
  matchId: number;
  round: string;
  slot: string;
  homeTeam: { code: string; name: string; confidence: 'certain' | 'depends' };
  awayTeam: { code: string; name: string; confidence: 'certain' | 'depends' };
  isFilled: boolean;
}

export function generateBracketSuggestions(): BracketSuggestion[] {
  const groupResults = calculateGroupResults();
  const matrix = getMatrix();

  const firsts: Record<string, string> = {};
  const seconds: Record<string, string> = {};
  const nameMap: Record<string, string> = {};
  for (const g of groupResults) {
    if (g.teams[0]) { firsts[g.group] = g.teams[0].code; nameMap[g.teams[0].code] = g.teams[0].name; }
    if (g.teams[1]) { seconds[g.group] = g.teams[1].code; nameMap[g.teams[1].code] = g.teams[1].name; }
    if (g.teams[2]) { nameMap[g.teams[2].code] = g.teams[2].name; }
  }

  const knockouts = matrix.filter(m => !m.round.startsWith('GROUP_')).sort((a, b) => a.id - b.id);
  const suggestions: BracketSuggestion[] = [];

  for (const match of knockouts) {
    const homeCode = match.homeTeam || 'None';
    const awayCode = match.awayTeam || 'None';
    const isFilled = homeCode !== 'None' && homeCode !== 'TBD' && homeCode !== null && awayCode !== 'None' && awayCode !== 'TBD' && awayCode !== null;

    suggestions.push({
      matchId: match.id,
      round: match.round,
      slot: `${match.homeTeamName || 'TBD'} vs ${match.awayTeamName || 'TBD'}`,
      homeTeam: {
        code: (match.homeTeam === 'None' || match.homeTeam === null || match.homeTeam === undefined) ? 'TBD' : match.homeTeam,
        name: (match.homeTeamName === 'None' || match.homeTeamName === null) ? 'TBD' : match.homeTeamName,
        confidence: (match.homeTeam === 'None' || match.homeTeam === null) ? 'depends' : 'certain',
      },
      awayTeam: {
        code: (match.awayTeam === 'None' || match.awayTeam === null || match.awayTeam === undefined) ? 'TBD' : match.awayTeam,
        name: (match.awayTeamName === 'None' || match.awayTeamName === null) ? 'TBD' : match.awayTeamName,
        confidence: (match.awayTeam === 'None' || match.awayTeam === null) ? 'depends' : 'certain',
      },
      isFilled,
    });
  }

  return suggestions;
}

/** Apply manual team assignment to a knockout match slot */
export function assignKnockoutTeam(matchId: number, side: 'home' | 'away', teamCode: string, teamName: string): boolean {
  const matrix = getMatrix();
  const idx = matrix.findIndex(m => m.id === matchId);
  if (idx === -1) return false;

  if (side === 'home') {
    matrix[idx] = { ...matrix[idx], homeTeam: teamCode, homeTeamName: teamName };
  } else {
    matrix[idx] = { ...matrix[idx], awayTeam: teamCode, awayTeamName: teamName };
  }

  try {
    localStorage.setItem('wc2026_match_matrix', JSON.stringify(matrix));
  } catch { /* ignore */ }

  return true;
}

/** Get group winners for the admin UI */
export function getGroupWinners() {
  const groupResults = calculateGroupResults();
  return groupResults.map(g => ({
    group: g.group,
    first: g.teams[0] || null,
    second: g.teams[1] || null,
    third: g.teams[2] || null,
  }));
}

/** Auto-fill Ro32 from group results using FIFA 2026 bracket rules */
export function seedKnockoutFromGroupResults(): { filled: number; errors: string[]; details: string[] } {
  const errors: string[] = [];
  const details: string[] = [];
  let filled = 0;

  const groupResults = calculateGroupResults();
  const nameMap: Record<string, string> = {};

  // Build lookups
  const firsts: Record<string, string> = {};
  const seconds: Record<string, string> = {};
  for (const g of groupResults) {
    if (g.teams[0]) { firsts[g.group] = g.teams[0].code; nameMap[g.teams[0].code] = g.teams[0].name; }
    if (g.teams[1]) { seconds[g.group] = g.teams[1].code; nameMap[g.teams[1].code] = g.teams[1].name; }
    if (g.teams[2]) { nameMap[g.teams[2].code] = g.teams[2].name; }
  }

  // Check all groups have results
  for (const letter of 'ABCDEFGHIJKL') {
    if (!firsts[letter]) {
      errors.push(`Group ${letter}: no 1st place team found (group may not be complete)`);
    }
  }
  if (errors.length > 0) {
    return { filled: 0, errors, details };
  }

  // Get best 3rd placed teams
  const thirdsList = getBestThirdPlaced(groupResults);
  const thirds: Record<string, string> = {};
  thirdsList.forEach(t => { thirds[t.group] = t.code; nameMap[t.code] = t.name; });

  // Build Ro32 pairings using FIFA 2026 bracket rules
  const r32Mappings = buildR32Mapping(firsts, seconds, thirds);

  // Apply to matrix
  for (const mapping of r32Mappings) {
    if (mapping.home === 'TBD' || mapping.away === 'TBD') continue;
    const success = assignKnockoutTeam(mapping.matchId, 'home', mapping.home, nameMap[mapping.home] || mapping.home);
    if (success) {
      assignKnockoutTeam(mapping.matchId, 'away', mapping.away, nameMap[mapping.away] || mapping.away);
      details.push(`R32: ${mapping.home} vs ${mapping.away} → [${mapping.matchId}]`);
      filled++;
    }
  }

  return { filled, errors, details };
}

/** Parse pasted bracket seeding text */
export function parseBracketSeed(text: string): { matchId: number; home: string; homeName: string; away: string; awayName: string }[] {
  const results: { matchId: number; home: string; homeName: string; away: string; awayName: string }[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    // Format: "R32-1: MEX vs NED" or "537415: MEX vs NED"
    const match = line.match(/^(?:R32-(\d+)|(\d+))\s*:\s*(.+?)\s+vs\s+(.+)/i);
    if (match) {
      let matchId: number;
      if (match[2]) {
        matchId = parseInt(match[2], 10);
      } else {
        const slot = parseInt(match[1], 10);
        if (slot >= 1 && slot <= 16) {
          matchId = R32_IDS[slot - 1];
        } else continue;
      }
      const home = match[3].trim();
      const away = match[4].trim();
      results.push({ matchId, home, homeName: home, away, awayName: away });
    }
  }

  return results;
}

export function applyBracketSeed(seeds: { matchId: number; home: string; homeName: string; away: string; awayName: string }[]): number {
  let filled = 0;
  for (const s of seeds) {
    const h = assignKnockoutTeam(s.matchId, 'home', s.home, s.homeName);
    const a = assignKnockoutTeam(s.matchId, 'away', s.away, s.awayName);
    if (h && a) filled++;
  }
  return filled;
}

/**
 * Auto-advance knockout winners to next-round match slots.
 * Call this after pasting scores for a knockout round.
 * Reads all finished knockout matches, determines winners, and fills their next-round slots.
 */
export function autoAdvanceKnockoutWinners(): { advanced: number; details: string[] } {
  const matrix = getMatrix();
  const details: string[] = [];
  let advanced = 0;

  // Find all finished knockout matches
  const finishedKo = matrix.filter(m => {
    if (m.round.startsWith('GROUP_')) return false;
    if (m.homeGoals === null || m.awayGoals === null) return false;
    return true;
  });

  for (const match of finishedKo) {
    const adv = ADVANCEMENT_MAP[match.id];
    if (!adv) continue;

    // Determine winner
    const winner = match.homeGoals! > match.awayGoals!
      ? { code: match.homeTeam, name: match.homeTeamName }
      : match.homeGoals! < match.awayGoals!
        ? { code: match.awayTeam, name: match.awayTeamName }
        : null;

    if (!winner || winner.code === 'None' || winner.code === null) continue;

    // Advance winner to next round
    const nextMatch = matrix.find(m => m.id === adv.nextMatchId);
    if (!nextMatch) continue;

    // Check if slot is already filled with the same team
    const currentTeam = adv.side === 'home' ? nextMatch.homeTeam : nextMatch.awayTeam;
    if (currentTeam === winner.code) {
      // Already correctly filled — count as done but don't duplicate
      continue;
    }

    assignKnockoutTeam(adv.nextMatchId, adv.side, winner.code, winner.name || winner.code);

    const roundLabel = match.round.replace(/_/g, ' ');
    const nextRoundLabel = nextMatch.round.replace(/_/g, ' ');
    details.push(`${winner.code} advances: ${roundLabel} [${match.id}] → ${nextRoundLabel} [${adv.nextMatchId}] (${adv.side})`);
    advanced++;
  }

  // Handle SF losers → Third Place match
  for (const match of finishedKo) {
    if (!match.round.includes('SEMI') || match.homeGoals === null || match.awayGoals === null) continue;

    const loser = match.homeGoals! > match.awayGoals!
      ? { code: match.awayTeam, name: match.awayTeamName }
      : match.homeGoals! < match.awayGoals!
        ? { code: match.homeTeam, name: match.homeTeamName }
        : null;

    if (!loser || loser.code === 'None' || loser.code === null) continue;

    // Determine which side of the third place match
    // SF-1 (537387) loser → Third Place home
    // SF-2 (537388) loser → Third Place away
    const side: 'home' | 'away' = match.id === 537387 ? 'home' : 'away';

    const thirdMatch = matrix.find(m => m.id === THIRD_ID);
    if (!thirdMatch) continue;

    const currentTeam = side === 'home' ? thirdMatch.homeTeam : thirdMatch.awayTeam;
    if (currentTeam === loser.code) continue;

    assignKnockoutTeam(THIRD_ID, side, loser.code, loser.name || loser.code);
    details.push(`${loser.code} to 3rd Place: SF [${match.id}] → THIRD_PLACE [${THIRD_ID}] (${side})`);
    advanced++;
  }

  return { advanced, details };
}
