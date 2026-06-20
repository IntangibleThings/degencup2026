// World Cup 2026 Fixture Service
// Fetches from API-Football with fallback to mock data
import { TEAM_FLAGS, TEAM_NAMES } from './tournament';

export interface Match {
  id: number;
  date: string; // ISO date string
  homeTeam: string; // team code
  awayTeam: string; // team code
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'NS' | '1H' | 'HT' | '2H' | 'ET' | 'P' | 'FT' | 'AET' | 'PEN' | 'SUSP' | 'INT' | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO';
  round: string;
  venue: string;
}

const API_KEY = 'dd99c54832c151667246c2e2cb180e01';
const API_BASE = 'https://v3.football.api-sports.io';

// Cache
const FIXTURES_CACHE_KEY = 'wc2026_fixtures';
const LAST_FETCH_KEY = 'wc2026_fixtures_last_fetch';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// World Cup 2026 Groups (48 teams, 12 groups of 4)
const WC2026_GROUPS: Record<string, string[]> = {
  'Group A': ['MEX', 'NED', 'AUS', 'JOR'],
  'Group B': ['USA', 'URU', 'CMR', 'NZL'],
  'Group C': ['ARG', 'CRO', 'ECU', 'IRQ'],
  'Group D': ['BRA', 'POR', 'TUN', 'HAI'],
  'Group E': ['FRA', 'SEN', 'CRC', 'UZB'],
  'Group F': ['ENG', 'ITA', 'GHA', 'BIH'],
  'Group G': ['ESP', 'GER', 'MAR', 'JPN'],
  'Group H': ['BEL', 'SUI', 'KOR', 'PAN'],
  'Group I': ['COL', 'DEN', 'NOR', 'CIV'],
  'Group J': ['POL', 'TUR', 'ALG', 'RSA'],
  'Group K': ['SWE', 'UKR', 'EGY', 'CUW'],
  'Group L': ['WAL', 'IRN', 'PAR', 'COD'],
};

// Generate realistic mock fixtures for World Cup 2026
// Group stage: June 11-24, 2026 (each team plays 3 matches)
// Round of 16: June 26-29
// Quarter-finals: July 2-3
// Semi-finals: July 6-7
// Final: July 11
// 3rd place: July 10

function generateMockFixtures(): Match[] {
  const matches: Match[] = [];
  let matchId = 1000;

  // Tournament start (for relative date calculation)
  const today = new Date();

  // Group stage matches (each group has 6 matches)
  const groupDates = [
    '2026-06-11T12:00:00Z', '2026-06-11T15:00:00Z', '2026-06-11T18:00:00Z', '2026-06-11T21:00:00Z',
    '2026-06-12T12:00:00Z', '2026-06-12T15:00:00Z', '2026-06-12T18:00:00Z', '2026-06-12T21:00:00Z',
    '2026-06-13T12:00:00Z', '2026-06-13T15:00:00Z', '2026-06-13T18:00:00Z', '2026-06-13T21:00:00Z',
    '2026-06-14T12:00:00Z', '2026-06-14T15:00:00Z', '2026-06-14T18:00:00Z', '2026-06-14T21:00:00Z',
    '2026-06-15T12:00:00Z', '2026-06-15T15:00:00Z', '2026-06-15T18:00:00Z', '2026-06-15T21:00:00Z',
    '2026-06-16T12:00:00Z', '2026-06-16T15:00:00Z', '2026-06-16T18:00:00Z', '2026-06-16T21:00:00Z',
  ];

  let dateIdx = 0;
  for (const [groupName, teams] of Object.entries(WC2026_GROUPS)) {
    // Each group: 6 matches (round-robin)
    const matchups = [[0,1], [2,3], [0,2], [1,3], [0,3], [1,2]];
    for (const [a, b] of matchups) {
      const matchDate = new Date(groupDates[dateIdx % groupDates.length]);
      // Adjust match date based on which group match this is (spread across tournament)
      matchDate.setDate(matchDate.getDate() + Math.floor(dateIdx / 24) * 5);

      const homeScore = matchDate < today ? generateScore() : null;
      const awayScore = matchDate < today ? generateScore() : null;

      matches.push({
        id: matchId++,
        date: matchDate.toISOString(),
        homeTeam: teams[a],
        awayTeam: teams[b],
        homeGoals: homeScore,
        awayGoals: awayScore,
        status: matchDate < today ? 'FT' : 'NS',
        round: groupName,
        venue: `${groupName} Venue`,
      });
      dateIdx++;
    }
  }

  // Sort by date
  matches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Update statuses for matches "in progress" (within last 2 hours)
  const twoHoursAgo = new Date(today.getTime() - 2 * 60 * 60 * 1000);
  for (const m of matches) {
    const matchDate = new Date(m.date);
    if (matchDate > twoHoursAgo && matchDate <= today && m.status === 'FT') {
      m.status = '2H'; // in progress
    }
  }

  return matches;
}

function generateScore(): number {
  // Weighted random: 0 is common, 1-2 most common, 3+ less common
  const r = Math.random();
  if (r < 0.22) return 0;
  if (r < 0.55) return 1;
  if (r < 0.80) return 2;
  if (r < 0.92) return 3;
  return 4;
}

export async function fetchFixtures(): Promise<Match[]> {
  // Check cache first
  try {
    const cached = localStorage.getItem(FIXTURES_CACHE_KEY);
    const lastFetch = localStorage.getItem(LAST_FETCH_KEY);
    if (cached && lastFetch) {
      const age = Date.now() - parseInt(lastFetch);
      if (age < CACHE_TTL_MS) {
        return JSON.parse(cached);
      }
    }
  } catch { /* ignore */ }

  // 1. Try API-Football first (best source, requires paid plan for 2026)
  try {
    const apiMatches = await fetchFromApi();
    if (apiMatches.length > 0) {
      localStorage.setItem(FIXTURES_CACHE_KEY, JSON.stringify(apiMatches));
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
      localStorage.setItem('wc2026_data_source', 'api');
      return apiMatches;
    }
  } catch (err) {
    console.log('[Fixtures] API-Football fetch failed:', err);
  }

  // 2. Try Firecrawl scraping (free tier at firecrawl.dev)
  try {
    const { scrapeScores } = await import('./firecrawl');
    const { matches: scraped, errors } = await scrapeScores();
    if (scraped.length > 0) {
      // Merge scraped scores into mock data
      const mockMatches = generateMockFixtures();
      const { mergeScrapedResults } = await import('./firecrawl');
      const merged = mergeScrapedResults(mockMatches, scraped);
      localStorage.setItem(FIXTURES_CACHE_KEY, JSON.stringify(merged));
      localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
      localStorage.setItem('wc2026_data_source', 'firecrawl');
      console.log(`[Fixtures] Firecrawl: merged ${scraped.length} results, errors: ${errors.length}`);
      return merged;
    }
  } catch (err) {
    console.log('[Fixtures] Firecrawl fetch failed:', err);
  }

  // 3. Fall back to mock data
  localStorage.setItem('wc2026_data_source', 'mock');
  const mockMatches = generateMockFixtures();
  localStorage.setItem(FIXTURES_CACHE_KEY, JSON.stringify(mockMatches));
  localStorage.setItem(LAST_FETCH_KEY, Date.now().toString());
  return mockMatches;
}

async function fetchFromApi(): Promise<Match[]> {
  const resp = await fetch(`${API_BASE}/fixtures?league=1&season=2026`, {
    headers: {
      'x-rapidapi-key': API_KEY,
      'x-rapidapi-host': 'v3.football.api-sports.io',
    },
  });

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const data = await resp.json();
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(JSON.stringify(data.errors));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data.response || []).map((f: any) => ({
    id: f.fixture?.id as number,
    date: f.fixture?.date as string,
    homeTeam: getTeamCode(f.teams?.home?.name),
    awayTeam: getTeamCode(f.teams?.away?.name),
    homeGoals: f.goals?.home as number | null,
    awayGoals: f.goals?.away as number | null,
    status: (f.fixture?.status?.short as Match['status']) || 'NS',
    round: (f.league?.round as string) || 'Group Stage',
    venue: (f.fixture?.venue?.name as string) || 'TBD',
  }));
}

function getTeamCode(apiName: string): string {
  const mapping: Record<string, string> = {
    'Argentina': 'ARG', 'Brazil': 'BRA', 'England': 'ENG', 'France': 'FRA',
    'Germany': 'GER', 'Spain': 'ESP', 'Portugal': 'POR', 'Netherlands': 'NED',
    'Belgium': 'BEL', 'Croatia': 'CRO', 'Uruguay': 'URU', 'Mexico': 'MEX',
    'USA': 'USA', 'Morocco': 'MAR', 'Japan': 'JPN', 'Senegal': 'SEN',
    'Colombia': 'COL', 'Switzerland': 'SUI', 'Denmark': 'DEN', 'Ecuador': 'ECU',
    'Serbia': 'SRB', 'Poland': 'POL', 'Canada': 'CAN', 'Cameroon': 'CMR',
    'Ghana': 'GHA', 'Wales': 'WAL', 'Australia': 'AUS', 'Qatar': 'QAT',
    'Saudi Arabia': 'KSA', 'Tunisia': 'TUN', 'Iran': 'IRN', 'South Korea': 'KOR',
    'Costa Rica': 'CRC', 'Italy': 'ITA', 'Norway': 'NOR', 'Sweden': 'SWE',
    'Turkey': 'TUR', 'Ukraine': 'UKR', 'New Zealand': 'NZL', 'Panama': 'PAN',
    'Iraq': 'IRQ', 'Jordan': 'JOR', 'Uzbekistan': 'UZB', 'Haiti': 'HAI',
    'Curacao': 'CUW', 'Cabo Verde': 'CPV', 'South Africa': 'RSA', 'Paraguay': 'PAR',
    'Ivory Coast': 'CIV', 'DR Congo': 'COD', 'Algeria': 'ALG', 'Bosnia': 'BIH',
    'Czech Republic': 'CZE', 'Egypt': 'EGY',
  };
  return mapping[apiName] || apiName?.slice(0, 3).toUpperCase() || 'TBD';
}

export function getNext5Days(matches: Match[]): Match[] {
  const now = new Date();
  const fiveDaysLater = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  return matches.filter(m => {
    const d = new Date(m.date);
    return d >= now && d <= fiveDaysLater;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function getPreviousGames(matches: Match[]): Match[] {
  const now = new Date();
  return matches.filter(m => {
    const d = new Date(m.date);
    return d < now;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function formatMatchTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'TODAY';
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (d.toDateString() === tomorrow.toDateString()) return 'TOMORROW';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function getGroupStandings(matches: Match[]): { team: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number }[] {
  const table: Record<string, { team: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; gd: number; points: number }> = {};

  for (const m of matches) {
    if (m.status !== 'FT' && m.status !== 'AET' && m.status !== 'PEN') continue;
    if (m.homeGoals === null || m.awayGoals === null) continue;

    for (const team of [m.homeTeam, m.awayTeam]) {
      if (!table[team]) table[team] = { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0 };
    }

    const home = table[m.homeTeam];
    const away = table[m.awayTeam];

    home.played++; away.played++;
    home.gf += m.homeGoals; home.ga += m.awayGoals;
    away.gf += m.awayGoals; away.ga += m.homeGoals;

    if (m.homeGoals > m.awayGoals) {
      home.won++; home.points += 3; away.lost++;
    } else if (m.homeGoals < m.awayGoals) {
      away.won++; away.points += 3; home.lost++;
    } else {
      home.drawn++; away.drawn++; home.points++; away.points++;
    }
  }

  for (const t of Object.values(table)) {
    t.gd = t.gf - t.ga;
  }

  return Object.values(table).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gd !== a.gd) return b.gd - a.gd;
    return b.gf - a.gf;
  });
}

export { TEAM_FLAGS, TEAM_NAMES, WC2026_GROUPS };
