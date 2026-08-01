// Bracket Advancement — Maps group results to knockout slots for 48-team World Cup 2026
// All functions are PURE — accept matrix as parameter, do not mutate global state.

import type { MatrixMatch } from './matchMatrix';
import { assignKnockoutTeam, getMatrix } from './matchMatrix';

interface GroupResult {
  group: string;
  teams: { code: string; name: string; pts: number; gd: number; gf: number; position: number }[];
}

// ── GROUP STANDINGS CALCULATION ──

function calculateGroupResults(matrix: MatrixMatch[]): GroupResult[] {
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

export const R32_IDS = [537415,537416,537417,537418,537419,537420,537421,537422,537423,537424,537425,537426,537427,537428,537429,537430];
export const R16_IDS = [537375,537376,537377,537378,537379,537380,537381,537382];
export const QF_IDS  = [537383,537384,537385,537386];
export const SF_IDS  = [537387,537388];
export const THIRD_ID = 537389;
export const FINAL_ID = 537390;

const ADVANCEMENT_MAP: Record<number, { nextMatchId: number; side: 'home' | 'away' }> = {};

// R32 winners → R16
ADVANCEMENT_MAP[537415] = { nextMatchId: 537375, side: 'home' };
ADVANCEMENT_MAP[537416] = { nextMatchId: 537375, side: 'away' };
ADVANCEMENT_MAP[537417] = { nextMatchId: 537376, side: 'home' };
ADVANCEMENT_MAP[537418] = { nextMatchId: 537376, side: 'away' };
ADVANCEMENT_MAP[537419] = { nextMatchId: 537377, side: 'home' };
ADVANCEMENT_MAP[537420] = { nextMatchId: 537377, side: 'away' };
ADVANCEMENT_MAP[537421] = { nextMatchId: 537378, side: 'home' };
ADVANCEMENT_MAP[537422] = { nextMatchId: 537378, side: 'away' };
ADVANCEMENT_MAP[537423] = { nextMatchId: 537379, side: 'home' };
ADVANCEMENT_MAP[537424] = { nextMatchId: 537379, side: 'away' };
ADVANCEMENT_MAP[537425] = { nextMatchId: 537380, side: 'home' };
ADVANCEMENT_MAP[537426] = { nextMatchId: 537380, side: 'away' };
ADVANCEMENT_MAP[537427] = { nextMatchId: 537381, side: 'home' };
ADVANCEMENT_MAP[537428] = { nextMatchId: 537381, side: 'away' };
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

function buildR32Mapping(firsts: Record<string, string>, seconds: Record<string, string>, thirds: Record<string, string>) {
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

export function generateBracketSuggestionsPure(matrix: MatrixMatch[]): BracketSuggestion[] {
  const groupResults = calculateGroupResults(matrix);

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

/** Get group winners for the admin UI */
export function getGroupWinnersPure(matrix: MatrixMatch[]) {
  const groupResults = calculateGroupResults(matrix);
  return groupResults.map(g => ({
    group: g.group,
    first: g.teams[0] || null,
    second: g.teams[1] || null,
    third: g.teams[2] || null,
  }));
}

/** Auto-fill Ro32 from group results using FIFA 2026 bracket rules. Returns matchId mappings. */
export function seedKnockoutFromGroupResultsPure(matrix: MatrixMatch[]): { filled: number; errors: string[]; details: string[]; updates: { matchId: number; side: 'home' | 'away'; code: string; name: string }[] } {
  const errors: string[] = [];
  const details: string[] = [];
  const updates: { matchId: number; side: 'home' | 'away'; code: string; name: string }[] = [];

  const groupResults = calculateGroupResults(matrix);
  const nameMap: Record<string, string> = {};

  const firsts: Record<string, string> = {};
  const seconds: Record<string, string> = {};
  for (const g of groupResults) {
    if (g.teams[0]) { firsts[g.group] = g.teams[0].code; nameMap[g.teams[0].code] = g.teams[0].name; }
    if (g.teams[1]) { seconds[g.group] = g.teams[1].code; nameMap[g.teams[1].code] = g.teams[1].name; }
    if (g.teams[2]) { nameMap[g.teams[2].code] = g.teams[2].name; }
  }

  for (const letter of 'ABCDEFGHIJKL') {
    if (!firsts[letter]) {
      errors.push(`Group ${letter}: no 1st place team found`);
    }
  }
  if (errors.length > 0) {
    return { filled: 0, errors, details, updates };
  }

  const thirdsList = getBestThirdPlaced(groupResults);
  const thirds: Record<string, string> = {};
  thirdsList.forEach(t => { thirds[t.group] = t.code; nameMap[t.code] = t.name; });

  const r32Mappings = buildR32Mapping(firsts, seconds, thirds);

  for (const mapping of r32Mappings) {
    if (mapping.home === 'TBD' || mapping.away === 'TBD') continue;
    updates.push({ matchId: mapping.matchId, side: 'home', code: mapping.home, name: nameMap[mapping.home] || mapping.home });
    updates.push({ matchId: mapping.matchId, side: 'away', code: mapping.away, name: nameMap[mapping.away] || mapping.away });
    details.push(`R32: ${mapping.home} vs ${mapping.away} → [${mapping.matchId}]`);
  }

  return { filled: Math.floor(updates.length / 2), errors, details, updates };
}

/** Parse pasted bracket seeding text */
export function parseBracketSeed(text: string): { matchId: number; home: string; homeName: string; away: string; awayName: string }[] {
  const results: { matchId: number; home: string; homeName: string; away: string; awayName: string }[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
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

/**
 * Auto-advance knockout winners to next-round match slots.
 * Returns list of slot assignments to apply.
 */
/** Apply parsed bracket seeds to the matrix (backward-compatible — uses storage) */
export function applyBracketSeed(seeds: { matchId: number; home: string; homeName: string; away: string; awayName: string }[]): number {
  let filled = 0;
  for (const s of seeds) {
    const h = assignKnockoutTeam(s.matchId, 'home', s.home, s.homeName);
    const a = assignKnockoutTeam(s.matchId, 'away', s.away, s.awayName);
    if (h && a) filled++;
  }
  return filled;
}

export function autoAdvanceKnockoutWinnersPure(matrix: MatrixMatch[]): { advanced: number; details: string[]; updates: { matchId: number; side: 'home' | 'away'; code: string; name: string }[] } {
  const details: string[] = [];
  const updates: { matchId: number; side: 'home' | 'away'; code: string; name: string }[] = [];

  const finishedKo = matrix.filter(m => {
    if (m.round.startsWith('GROUP_')) return false;
    if (m.homeGoals === null || m.awayGoals === null) return false;
    return true;
  });

  for (const match of finishedKo) {
    const adv = ADVANCEMENT_MAP[match.id];
    if (!adv) continue;

    const winner = match.homeGoals! > match.awayGoals!
      ? { code: match.homeTeam, name: match.homeTeamName }
      : match.homeGoals! < match.awayGoals!
        ? { code: match.awayTeam, name: match.awayTeamName }
        : null;

    if (!winner || winner.code === 'None' || winner.code === null) continue;

    const nextMatch = matrix.find(m => m.id === adv.nextMatchId);
    if (!nextMatch) continue;

    const currentTeam = adv.side === 'home' ? nextMatch.homeTeam : nextMatch.awayTeam;
    if (currentTeam === winner.code) continue;

    updates.push({ matchId: adv.nextMatchId, side: adv.side, code: winner.code, name: winner.name || winner.code });

    const roundLabel = match.round.replace(/_/g, ' ');
    const nextRoundLabel = nextMatch.round.replace(/_/g, ' ');
    details.push(`${winner.code} advances: ${roundLabel} [${match.id}] → ${nextRoundLabel} [${adv.nextMatchId}] (${adv.side})`);
  }

  // SF losers → Third Place
  for (const match of finishedKo) {
    if (!match.round.includes('SEMI') || match.homeGoals === null || match.awayGoals === null) continue;

    const loser = match.homeGoals! > match.awayGoals!
      ? { code: match.awayTeam, name: match.awayTeamName }
      : match.homeGoals! < match.awayGoals!
        ? { code: match.homeTeam, name: match.homeTeamName }
        : null;

    if (!loser || loser.code === 'None' || loser.code === null) continue;

    const side: 'home' | 'away' = match.id === 537387 ? 'home' : 'away';
    const thirdMatch = matrix.find(m => m.id === THIRD_ID);
    if (!thirdMatch) continue;

    const currentTeam = side === 'home' ? thirdMatch.homeTeam : thirdMatch.awayTeam;
    if (currentTeam === loser.code) continue;

    updates.push({ matchId: THIRD_ID, side, code: loser.code, name: loser.name || loser.code });
    details.push(`${loser.code} to 3rd Place: SF [${match.id}] → THIRD_PLACE [${THIRD_ID}] (${side})`);
  }

  return { advanced: updates.length, details, updates };
}

// ── BACKWARD-COMPATIBLE WRAPPERS (no matrix param — read from storage) ──

export function generateBracketSuggestions(): ReturnType<typeof generateBracketSuggestionsPure> {
  return generateBracketSuggestionsPure(getMatrix());
}

export function getGroupWinners(): ReturnType<typeof getGroupWinnersPure> {
  return getGroupWinnersPure(getMatrix());
}

export function seedKnockoutFromGroupResults(): ReturnType<typeof seedKnockoutFromGroupResultsPure> {
  return seedKnockoutFromGroupResultsPure(getMatrix());
}

export function autoAdvanceKnockoutWinners(): ReturnType<typeof autoAdvanceKnockoutWinnersPure> {
  return autoAdvanceKnockoutWinnersPure(getMatrix());
}
