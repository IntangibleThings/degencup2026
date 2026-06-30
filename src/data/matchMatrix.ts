// Match Matrix — Master fixture list for World Cup 2026
// All 104 matches are pre-defined. Scores are filled in as they arrive.
// This is the single source of truth for all match results.

import rawSchedule from './wc2026_schedule.json';
import { mapTeamName } from './firecrawl';
import { GROUPS } from './tournament';

export interface MatrixMatch {
  id: number;
  matchday: number;
  round: string;
  date: string;
  homeTeam: string;      // 3-letter code
  homeTeamName: string;  // Full name
  awayTeam: string;      // 3-letter code
  awayTeamName: string;  // Full name
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
}

const STORAGE_KEY = 'wc2026_match_matrix';

// ── INITIALIZATION ──

let matrix: MatrixMatch[] = loadMatrix();

function loadMatrix(): MatrixMatch[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MatrixMatch[];
      // Validate: must have 104 matches
      if (parsed.length === 104) return parsed;
    }
  } catch { /* ignore */ }
  // Fresh load from the JSON schedule
  return (rawSchedule as MatrixMatch[]).map(m => ({
    ...m,
    homeGoals: m.homeGoals ?? null,
    awayGoals: m.awayGoals ?? null,
  }));
}

function persistMatrix() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(matrix));
  } catch { /* ignore */ }
}

// ── PUBLIC API ──

/** Get the full matrix (all 104 matches) */
export function getMatrix(): MatrixMatch[] {
  return matrix;
}

/** Get only matches that have scores */
export function getScoredMatches(): MatrixMatch[] {
  return matrix.filter(m => m.homeGoals !== null && m.awayGoals !== null);
}

/** Get matches by round */
export function getMatchesByRound(round: string): MatrixMatch[] {
  return matrix.filter(m => m.round === round);
}

/** Get a single match by ID */
export function getMatchById(id: number): MatrixMatch | undefined {
  return matrix.find(m => m.id === id);
}

/** Find a match by team codes (home/away) */
export function findMatch(home: string, away: string): MatrixMatch | undefined {
  return matrix.find(m =>
    (m.homeTeam === home && m.awayTeam === away) ||
    (m.homeTeam === away && m.awayTeam === home)  // Allow reversed
  );
}

/** Check if a match already has a score */
export function isMatchScored(id: number): boolean {
  const m = matrix.find(x => x.id === id);
  return m ? m.homeGoals !== null && m.awayGoals !== null : false;
}

/** Update a match score. Returns true if updated, false if not found. */
export function updateMatchScore(id: number, homeGoals: number, awayGoals: number): boolean {
  const idx = matrix.findIndex(m => m.id === id);
  if (idx === -1) return false;
  matrix[idx] = {
    ...matrix[idx],
    homeGoals,
    awayGoals,
    status: 'FT',
  };
  persistMatrix();
  return true;
}

/** Reset the entire matrix to the original schedule */
export function resetMatrix() {
  matrix = (rawSchedule as MatrixMatch[]).map(m => ({
    ...m,
    homeGoals: m.homeGoals ?? null,
    awayGoals: m.awayGoals ?? null,
  }));
  persistMatrix();
}

// ── PASTE PARSING ──

export interface PasteResult {
  matched: { matchId: number; homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }[];
  unmatched: string[];
  overwritten: number; // How many existing scores were replaced
}

/**
 * Parse pasted text and map scores to match IDs in the matrix.
 * Supports: "Mexico 2-0 South Africa", "Group A: MEX 2-0 RSA", etc.
 */
export function parsePastedScoresToMatrix(text: string): PasteResult {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: PasteResult = { matched: [], unmatched: [], overwritten: 0 };

  for (const line of lines) {
    const parsed = tryParseLine(line);
    if (!parsed) {
      result.unmatched.push(line);
      continue;
    }

    // Look up the match in the matrix
    const match = findMatchByParsed(parsed);
    if (!match) {
      result.unmatched.push(line);
      continue;
    }

    // Check if overwriting
    if (isMatchScored(match.id)) {
      result.overwritten++;
    }

    // Update the matrix
    updateMatchScore(match.id, parsed.homeGoals, parsed.awayGoals);
    result.matched.push({
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeGoals: parsed.homeGoals,
      awayGoals: parsed.awayGoals,
    });
  }

  return result;
}

// ── INTERNAL PARSING HELPERS ──

interface ParsedLine {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

// Set of all valid 3-letter team codes for quick lookup
const VALID_TEAM_CODES = new Set<string>(Object.values(GROUPS).flat());

function tryParseLine(line: string): ParsedLine | null {
  // Pattern: "Team A X-Y Team B" or "Team A X - Y Team B"
  // Supports all dash types: hyphen (-), en dash (–), em dash (—), minus sign (−), etc.
  const DASH = '[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]';
  const patterns = [
    // "France 3-1 Senegal" or "France 3 - 1 Senegal"
    new RegExp(`(.+?)\\s+(\\d+)\\s*${DASH}\\s*(\\d+)\\s+(.+)`),
    // "Group A: Mexico 2-0 South Africa"
    new RegExp(`(?:group\\s*[a-l]:\\s*)?(.+?)\\s+(\\d+)\\s*${DASH}\\s*(\\d+)\\s+(.+)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const [, rawHome, rawHomeGoals, rawAwayGoals, rawAway] = match;
      const homeTrimmed = rawHome.trim();
      const awayTrimmed = rawAway.trim();
      // Try full-name mapping first, then fallback to 3-letter codes
      const homeCode = mapTeamName(homeTrimmed) || (VALID_TEAM_CODES.has(homeTrimmed.toUpperCase()) ? homeTrimmed.toUpperCase() : null);
      const awayCode = mapTeamName(awayTrimmed) || (VALID_TEAM_CODES.has(awayTrimmed.toUpperCase()) ? awayTrimmed.toUpperCase() : null);
      if (homeCode && awayCode) {
        return {
          homeTeam: homeCode,
          awayTeam: awayCode,
          homeGoals: parseInt(rawHomeGoals, 10),
          awayGoals: parseInt(rawAwayGoals, 10),
        };
      }
    }
  }
  return null;
}

function findMatchByParsed(parsed: ParsedLine): MatrixMatch | undefined {
  // Try exact home/away first
  let match = matrix.find(m =>
    m.homeTeam === parsed.homeTeam && m.awayTeam === parsed.awayTeam
  );
  // Try reversed
  if (!match) {
    match = matrix.find(m =>
      m.homeTeam === parsed.awayTeam && m.awayTeam === parsed.homeTeam
    );
  }
  // Try with the score swapped for reversed
  if (!match) {
    // Try looking up by name (3-letter codes should be in the matrix)
    match = matrix.find(m =>
      (m.homeTeam === parsed.homeTeam || m.homeTeamName.toLowerCase().includes(parsed.homeTeam.toLowerCase())) &&
      (m.awayTeam === parsed.awayTeam || m.awayTeamName.toLowerCase().includes(parsed.awayTeam.toLowerCase()))
    );
  }
  return match;
}

// ── STATS ──

export function getMatrixStats() {
  const scored = getScoredMatches();
  const groupMatches = matrix.filter(m => m.round.startsWith('GROUP_'));
  const groupScored = groupMatches.filter(m => m.homeGoals !== null);
  return {
    totalMatches: matrix.length,
    scoredMatches: scored.length,
    remainingMatches: matrix.length - scored.length,
    groupTotal: groupMatches.length,
    groupScored: groupScored.length,
    knockoutScored: scored.length - groupScored.length,
  };
}
