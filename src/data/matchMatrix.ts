// Match Matrix — Master fixture list for World Cup 2026
// All 104 matches are pre-defined. Scores are filled in as they arrive.
// This module has PURE functions (accept matrix param) + backward-compatible
// wrappers (no param — read from storage). GameContext uses pure versions
// for React integration. AdminPage uses backward-compatible wrappers.

import rawSchedule from './wc2026_schedule.json';
import { mapTeamName } from './firecrawl';
import { GROUPS } from './tournament';

export interface MatrixMatch {
  id: number;
  matchday: number;
  round: string;
  date: string;
  homeTeam: string;
  homeTeamName: string;
  awayTeam: string;
  awayTeamName: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
}

const STORAGE_KEY = 'wc2026_match_matrix';
const SESSION_KEY = 'wc2026_match_matrix_backup';

// ── STORAGE UTILITIES ──

export function loadFromSchedule(): MatrixMatch[] {
  return (rawSchedule as MatrixMatch[]).map(m => ({
    ...m,
    homeGoals: m.homeGoals ?? null,
    awayGoals: m.awayGoals ?? null,
  }));
}

export function loadFromStorage(): MatrixMatch[] | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MatrixMatch[];
      if (parsed.length === 104) return parsed;
    }
  } catch (e) {
    console.warn('[MATRIX] localStorage read failed:', e);
  }
  try {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as MatrixMatch[];
      if (parsed.length === 104) return parsed;
    }
  } catch (e) {
    console.warn('[MATRIX] sessionStorage read failed:', e);
  }
  return null;
}

export function persistMatrix(data: MatrixMatch[]) {
  let saved = false;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    saved = true;
  } catch (e) {
    console.warn('[MATRIX] localStorage write failed:', e);
  }
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    saved = true;
  } catch (e) {
    console.warn('[MATRIX] sessionStorage write failed:', e);
  }
  if (!saved) {
    console.error('[MATRIX] CRITICAL: Could not persist to any storage');
  }
}

export function createFreshMatrix(): MatrixMatch[] {
  return loadFromSchedule();
}

export function initMatrix(): MatrixMatch[] {
  return loadFromStorage() || loadFromSchedule();
}

// ── BACKWARD-COMPATIBLE: read matrix from storage ──

export function getMatrix(): MatrixMatch[] {
  return loadFromStorage() || loadFromSchedule();
}

export function getMatrixRef(): MatrixMatch[] {
  return getMatrix();
}

export function syncMatrix(): void {
  const data = getMatrix();
  persistMatrix(data);
}

// ── PURE FUNCTIONS (accept matrix param) ──

export function updateMatchScorePure(matrix: MatrixMatch[], id: number, homeGoals: number, awayGoals: number): MatrixMatch[] {
  const idx = matrix.findIndex(m => m.id === id);
  if (idx === -1) return matrix;
  const next = [...matrix];
  next[idx] = { ...next[idx], homeGoals, awayGoals, status: 'FT' };
  return next;
}

export function assignKnockoutTeamPure(matrix: MatrixMatch[], matchId: number, side: 'home' | 'away', teamCode: string, teamName: string): MatrixMatch[] {
  const idx = matrix.findIndex(m => m.id === matchId);
  if (idx === -1) return matrix;
  const next = [...matrix];
  if (side === 'home') {
    next[idx] = { ...next[idx], homeTeam: teamCode, homeTeamName: teamName };
  } else {
    next[idx] = { ...next[idx], awayTeam: teamCode, awayTeamName: teamName };
  }
  return next;
}

// ── BACKWARD-COMPATIBLE MUTATORS (read from storage, mutate, persist) ──

export function updateMatchScore(id: number, homeGoals: number, awayGoals: number): boolean {
  const matrix = getMatrix();
  const idx = matrix.findIndex(m => m.id === id);
  if (idx === -1) return false;
  matrix[idx] = { ...matrix[idx], homeGoals, awayGoals, status: 'FT' };
  persistMatrix(matrix);
  return true;
}

export function assignKnockoutTeam(matchId: number, side: 'home' | 'away', teamCode: string, teamName: string): boolean {
  const matrix = getMatrix();
  const idx = matrix.findIndex(m => m.id === matchId);
  if (idx === -1) return false;
  if (side === 'home') {
    matrix[idx] = { ...matrix[idx], homeTeam: teamCode, homeTeamName: teamName };
  } else {
    matrix[idx] = { ...matrix[idx], awayTeam: teamCode, awayTeamName: teamName };
  }
  persistMatrix(matrix);
  return true;
}

export function resetMatrix(): MatrixMatch[] {
  const fresh = loadFromSchedule();
  persistMatrix(fresh);
  return fresh;
}

// ── PURE QUERY FUNCTIONS (accept matrix param) ──

export function getScoredMatches(matrix: MatrixMatch[]): MatrixMatch[] {
  return matrix.filter(m => m.homeGoals !== null && m.awayGoals !== null);
}

export function getMatchesByRound(matrix: MatrixMatch[], round: string): MatrixMatch[] {
  return matrix.filter(m => m.round === round);
}

export function getMatchById(matrix: MatrixMatch[], id: number): MatrixMatch | undefined {
  return matrix.find(m => m.id === id);
}

export function findMatch(matrix: MatrixMatch[], home: string, away: string): MatrixMatch | undefined {
  return matrix.find(m =>
    (m.homeTeam === home && m.awayTeam === away) ||
    (m.homeTeam === away && m.awayTeam === home)
  );
}

export function isMatchScored(matrix: MatrixMatch[], id: number): boolean {
  const m = matrix.find(x => x.id === id);
  return m ? m.homeGoals !== null && m.awayGoals !== null : false;
}

// ── BACKWARD-COMPATIBLE QUERY (no matrix param) ──

export function isMatchScoredLegacy(id: number): boolean {
  const m = getMatrix().find(x => x.id === id);
  return m ? m.homeGoals !== null && m.awayGoals !== null : false;
}

// ── PASTE PARSING ──

export interface PasteResult {
  matched: { matchId: number; homeTeam: string; awayTeam: string; homeGoals: number; awayGoals: number }[];
  unmatched: string[];
  overwritten: number;
}

/** Parse pasted text. PURE version — accepts matrix. */
export function parsePastedScoresToMatrix(text: string, matrix: MatrixMatch[]): PasteResult {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: PasteResult = { matched: [], unmatched: [], overwritten: 0 };

  for (const line of lines) {
    const parsed = tryParseLine(line);
    if (!parsed) {
      result.unmatched.push(line);
      continue;
    }

    const match = findMatchByParsed(parsed, matrix);
    if (!match) {
      result.unmatched.push(line);
      continue;
    }

    if (isMatchScored(matrix, match.id)) {
      result.overwritten++;
    }

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

/** Backward-compatible wrapper — reads matrix from storage. */
export function parsePastedScores(text: string): PasteResult {
  return parsePastedScoresToMatrix(text, getMatrix());
}

// ── INTERNAL PARSING HELPERS ──

interface ParsedLine {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
}

const VALID_TEAM_CODES = new Set<string>(Object.values(GROUPS).flat());

function tryParseLine(line: string): ParsedLine | null {
  const DASH = '[-\u2010\u2011\u2012\u2013\u2014\u2015\u2212\uFE58\uFE63\uFF0D]';
  const patterns = [
    new RegExp(`(.+?)\\s+(\\d+)\\s*${DASH}\\s*(\\d+)\\s+(.+)`),
    new RegExp(`(?:group\\s*[a-l]:\\s*)?(.+?)\\s+(\\d+)\\s*${DASH}\\s*(\\d+)\\s+(.+)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const [, rawHome, rawHomeGoals, rawAwayGoals, rawAway] = match;
      const homeTrimmed = rawHome.trim();
      const awayTrimmed = rawAway.trim();
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

function findMatchByParsed(parsed: ParsedLine, matrix: MatrixMatch[]): MatrixMatch | undefined {
  let match = matrix.find(x =>
    x.homeTeam === parsed.homeTeam && x.awayTeam === parsed.awayTeam
  );
  if (!match) {
    match = matrix.find(x =>
      x.homeTeam === parsed.awayTeam && x.awayTeam === parsed.homeTeam
    );
  }
  if (!match) {
    match = matrix.find(x =>
      (x.homeTeam === parsed.homeTeam || x.homeTeamName.toLowerCase().includes(parsed.homeTeam.toLowerCase())) &&
      (x.awayTeam === parsed.awayTeam || x.awayTeamName.toLowerCase().includes(parsed.awayTeam.toLowerCase()))
    );
  }
  return match;
}

// ── STATS ──

export function getMatrixStats(matrix: MatrixMatch[]) {
  const scored = matrix.filter(x => x.homeGoals !== null && x.awayGoals !== null);
  const groupMatches = matrix.filter(x => x.round.startsWith('GROUP_'));
  const groupScored = groupMatches.filter(x => x.homeGoals !== null);
  return {
    totalMatches: matrix.length,
    scoredMatches: scored.length,
    remainingMatches: matrix.length - scored.length,
    groupTotal: groupMatches.length,
    groupScored: groupScored.length,
    knockoutScored: scored.length - groupScored.length,
  };
}
