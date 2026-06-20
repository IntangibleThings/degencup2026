// football-data.org integration — FREE tier includes World Cup 2026
// Sign up free at https://www.football-data.org/client/register
//
// THREE WAYS TO GET DATA (tried in order):
// 1. DIRECT: Works on localhost only (football-data.org blocks deployed sites via CORS)
// 2. PROXY: Calls Firebase Cloud Function (you must deploy functions first — see info.md)
// 3. PASTE JSON: Foolproof fallback — open API URL in new tab, copy JSON, paste into admin

import type { Match } from './fixtures';

const API_BASE = 'https://api.football-data.org/v4';
const COMPETITION_ID = 'WC';
const TOKEN_STORAGE = 'vibecup_footballdata_token';
const CACHE_KEY = 'wc2026_fixtures';
const LAST_FETCH_KEY = 'wc2026_fixtures_last_fetch';

// Firebase project config — used to build the proxy function URL
const PROXY_URL = 'https://asia-southeast2-degen-cup-2026-b42ca.cloudfunctions.net/proxyFootballData';

// Map football-data.org team codes (TLA) to our codes
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

export function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_STORAGE); } catch { return null; }
}

export function storeToken(token: string) {
  try { localStorage.setItem(TOKEN_STORAGE, token); } catch { /* ignore */ }
}

function parseFDMatches(raw: unknown[]): Match[] {
  return raw.map((fm: unknown): Match => {
    const m = fm as Record<string, unknown>;
    const homeTeam = m.homeTeam as Record<string, string> | undefined;
    const awayTeam = m.awayTeam as Record<string, string> | undefined;
    const score = m.score as Record<string, unknown> | undefined;
    const fullTime = score?.fullTime as Record<string, number | null> | undefined;

    const homeCode = CODE_MAP[homeTeam?.tla || ''] || homeTeam?.tla || '?';
    const awayCode = CODE_MAP[awayTeam?.tla || ''] || awayTeam?.tla || '?';

    const statusMap: Record<string, Match['status']> = {
      'SCHEDULED': 'NS', 'LIVE': '1H', 'IN_PLAY': '1H', 'PAUSED': 'HT',
      'FINISHED': 'FT', 'POSTPONED': 'PST', 'SUSPENDED': 'SUSP',
      'CANCELLED': 'CANC', 'AWARDED': 'FT',
    };

    return {
      id: (m.id as number) || 0,
      date: (m.utcDate as string) || '',
      homeTeam: homeCode,
      awayTeam: awayCode,
      homeGoals: fullTime?.home ?? null,
      awayGoals: fullTime?.away ?? null,
      status: statusMap[(m.status as string) || ''] || 'NS',
      round: (m.group as string) || (m.stage as string) || 'Group Stage',
      venue: 'TBD',
    };
  });
}

/**
 * Method 1: Try direct fetch (only works on localhost)
 */
async function fetchDirect(token: string): Promise<Match[] | null> {
  try {
    const resp = await fetch(`${API_BASE}/competitions/${COMPETITION_ID}/matches`, {
      headers: { 'X-Auth-Token': token },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return parseFDMatches(data.matches || []);
  } catch {
    return null;
  }
}

/**
 * Method 2: Try Firebase Cloud Function proxy
 */
async function fetchViaProxy(token: string): Promise<Match[] | null> {
  try {
    const resp = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.success) return null;
    return parseFDMatches(data.matches || []);
  } catch {
    return null;
  }
}

/**
 * Main fetch function: tries direct → proxy, returns detailed result
 */
export async function fetchWorldCupMatches(token?: string): Promise<{
  matches: Match[];
  errors: string[];
  method: 'direct' | 'proxy' | 'none';
}> {
  const t = token || getStoredToken();
  if (!t) {
    return { matches: [], errors: ['No token provided.'], method: 'none' };
  }

  // Try 1: Direct (localhost only)
  const direct = await fetchDirect(t);
  if (direct) {
    cacheMatches(direct);
    return { matches: direct, errors: [], method: 'direct' };
  }

  // Try 2: Cloud Function proxy
  const proxied = await fetchViaProxy(t);
  if (proxied) {
    cacheMatches(proxied);
    return { matches: proxied, errors: [], method: 'proxy' };
  }

  // Both failed
  return {
    matches: [],
    errors: [
      'CORS blocked — football-data.org does not allow browser requests from deployed sites.',
      'Try the "Paste JSON Response" option below (works immediately, no setup).',
      'Or deploy the Firebase proxy function (see info.md for instructions).',
    ],
    method: 'none',
  };
}

/**
 * Method 3: Parse pasted JSON from football-data.org
 * This is the foolproof fallback — user opens API URL in new tab,
 * copies JSON response, pastes it here.
 */
export function parsePastedJson(jsonText: string): {
  matches: Match[];
  errors: string[];
} {
  try {
    const data = JSON.parse(jsonText);
    const rawMatches = data.matches;

    if (!rawMatches || !Array.isArray(rawMatches)) {
      return { matches: [], errors: ['Invalid JSON: no "matches" array found.'] };
    }

    const matches = parseFDMatches(rawMatches);
    cacheMatches(matches);

    return {
      matches,
      errors: matches.length > 0 ? [] : ['No matches parsed from JSON.'],
    };
  } catch {
    return { matches: [], errors: ['Invalid JSON. Copy the raw response from football-data.org.'] };
  }
}

function cacheMatches(matches: Match[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(matches));
    localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
    localStorage.setItem('wc2026_data_source', 'footballdata');
  } catch { /* ignore */ }
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

/**
 * Build the direct API URL for the user to open in a new tab.
 */
/**
 * Generate a data URI with a simple HTML page that fetches the API
 * with the user's token and displays formatted JSON.
 */
export function getDirectApiUrl(token?: string): string {
  const t = token || getStoredToken() || '';
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>WC 2026 Data</title>
<style>body{font-family:monospace;background:#0a0a0a;color:#0f0;padding:20px;white-space:pre-wrap;word-break:break-all;font-size:11px}
.loading{color:#888}button{background:#0f0;color:#000;border:none;padding:10px 20px;font-family:monospace;cursor:pointer;margin-bottom:20px}
button:hover{background:#0c0}.error{color:#f00}</style></head>
<body>
<button onclick="fetchData()">FETCH WORLD CUP 2026 DATA</button>
<div id="out" class="loading">Click the button above to load data...</div>
<script>
function fetchData(){
  document.getElementById('out').textContent='Loading...';
  fetch('${API_BASE}/competitions/${COMPETITION_ID}/matches',{headers:{'X-Auth-Token':'${t}'}})
    .then(r=>r.text())
    .then(t=>{document.getElementById('out').textContent=t;document.title='DONE - Select All & Copy'})
    .catch(e=>document.getElementById('out').innerHTML='<span class="error">Error: '+e.message+'</span>');
}
</script></body></html>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
}
