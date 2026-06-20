// football-data.org integration — FREE tier includes World Cup 2026
// Sign up free at https://www.football-data.org/client/register
// Free tier: 12 competitions (incl. World Cup), delayed scores, 10 calls/min
//
// SETUP:
// 1. Go to https://www.football-data.org/client/register
// 2. Confirm email, copy your API token
// 3. Go to Admin → SYNC tab → Paste token → Click FETCH
//
// NOTE: Uses CORS proxy (corsproxy.io) because football-data.org blocks
// browser requests from deployed websites (only allows localhost).

import type { Match } from './fixtures';

const API_BASE = 'https://api.football-data.org/v4';
const CORS_PROXY = 'https://corsproxy.io/?';
const COMPETITION_ID = 'WC'; // FIFA World Cup
const TOKEN_STORAGE = 'vibecup_footballdata_token';
const CACHE_KEY = 'wc2026_fixtures';
const LAST_FETCH_KEY = 'wc2026_fixtures_last_fetch';

interface FDMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  homeTeam: { shortName: string; tla: string };
  awayTeam: { shortName: string; tla: string };
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  stage: string;
  group: string | null;
}

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_STORAGE); } catch { return null; }
}

export function storeToken(token: string) {
  try { localStorage.setItem(TOKEN_STORAGE, token); } catch { /* ignore */ }
}

// Map football-data.org team codes to our codes
const CODE_MAP: Record<string, string> = {
  'ARG': 'ARG', 'BRA': 'BRA', 'ENG': 'ENG', 'FRA': 'FRA',
  'GER': 'GER', 'ESP': 'ESP', 'POR': 'POR', 'NED': 'NED',
  'BEL': 'BEL', 'CRO': 'CRO', 'URU': 'URU', 'MEX': 'MEX',
  'USA': 'USA', 'MAR': 'MAR', 'JPN': 'JPN', 'SEN': 'SEN',
  'COL': 'COL', 'SUI': 'SUI', 'DEN': 'DEN', 'ECU': 'ECU',
  'SRB': 'SRB', 'POL': 'POL', 'CAN': 'CAN', 'CMR': 'CMR',
  'GHA': 'GHA', 'WAL': 'WAL', 'AUS': 'AUS', 'QAT': 'QAT',
  'KSA': 'KSA', 'TUN': 'TUN', 'IRN': 'IRN', 'KOR': 'KOR',
  'CRC': 'CRC', 'ITA': 'ITA', 'NOR': 'NOR', 'SWE': 'SWE',
  'TUR': 'TUR', 'UKR': 'UKR', 'NZL': 'NZL', 'PAN': 'PAN',
  'IRQ': 'IRQ', 'JOR': 'JOR', 'UZB': 'UZB', 'HAI': 'HAI',
  'CUW': 'CUW', 'CPV': 'CPV', 'RSA': 'RSA', 'PAR': 'PAR',
  'CIV': 'CIV', 'COD': 'COD', 'ALG': 'ALG', 'BIH': 'BIH',
  'CZE': 'CZE', 'EGY': 'EGY', 'AUT': 'AUT', 'SCO': 'SCO',
  'FIN': 'FIN', 'GRE': 'GRE', 'HUN': 'HUN', 'ROU': 'ROU',
  'SVK': 'SVK', 'SVN': 'SVN', 'IRL': 'IRL', 'NGA': 'NGA',
  'CHI': 'CHL', 'PER': 'PER', 'BOL': 'BOL', 'VEN': 'VEN',
};

export async function fetchWorldCupMatches(token?: string): Promise<{
  matches: Match[];
  errors: string[];
}> {
  const t = token || getStoredToken();
  if (!t) {
    return { matches: [], errors: ['No football-data.org token. Register free at football-data.org/client/register'] };
  }

  try {
    // Route through CORS proxy because football-data.org blocks browser requests
    const url = `${CORS_PROXY}${encodeURIComponent(`${API_BASE}/competitions/${COMPETITION_ID}/matches`)}`;
    const resp = await fetch(url, {
      headers: { 'X-Auth-Token': t },
    });

    if (resp.status === 403) {
      return { matches: [], errors: ['Token valid but World Cup not in your plan. Upgrade or use Paste Scores.'] };
    }
    if (resp.status === 429) {
      return { matches: [], errors: ['Rate limit hit (10 calls/min on free tier). Wait 60 seconds.'] };
    }
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      return { matches: [], errors: [`API error ${resp.status}: ${err.message || 'Unknown'}`] };
    }

    const data = await resp.json();
    const fdMatches: FDMatch[] = data.matches || [];

    const matches: Match[] = fdMatches.map((fm): Match => {
      const homeCode = CODE_MAP[fm.homeTeam.tla] || fm.homeTeam.tla;
      const awayCode = CODE_MAP[fm.awayTeam.tla] || fm.awayTeam.tla;
      const statusMap: Record<string, Match['status']> = {
        'SCHEDULED': 'NS', 'LIVE': '1H', 'IN_PLAY': '1H', 'PAUSED': 'HT',
        'FINISHED': 'FT', 'POSTPONED': 'PST', 'SUSPENDED': 'SUSP',
        'CANCELLED': 'CANC', 'AWARDED': 'FT',
      };

      return {
        id: fm.id,
        date: fm.utcDate,
        homeTeam: homeCode,
        awayTeam: awayCode,
        homeGoals: fm.score?.fullTime?.home ?? null,
        awayGoals: fm.score?.fullTime?.away ?? null,
        status: statusMap[fm.status] || 'NS',
        round: fm.group || fm.stage || 'Group Stage',
        venue: 'TBD',
      };
    });

    // Save to cache
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(matches));
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
      localStorage.setItem('wc2026_data_source', 'footballdata');
    } catch { /* ignore */ }

    return { matches, errors: [] };
  } catch (err) {
    return { matches: [], errors: [`Network error: ${err instanceof Error ? err.message : 'unknown'}`] };
  }
}

export function getDataSourceLabel(): string {
  try {
    const source = localStorage.getItem('wc2026_data_source');
    if (source === 'footballdata') return 'FOOTBALL-DATA';
    if (source === 'api') return 'LIVE API';
    if (source === 'firecrawl') return 'FIRECRAWL';
  } catch { /* ignore */ }
  return 'MOCK DATA';
}
