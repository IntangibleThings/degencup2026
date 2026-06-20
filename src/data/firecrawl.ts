// Firecrawl integration for scraping live World Cup 2026 scores
// Sign up free at firecrawl.dev — 500 credits/month on free tier
//
// SETUP:
// 1. Go to https://firecrawl.dev → Sign up (free, no credit card)
// 2. Copy your API key (starts with fc_...)
// 3. Go to Admin → SYNC tab → Paste key → Click SCRAPE
//
// FALLBACK: If scraping fails, use the "Paste Scores" feature in admin
// to paste raw score text directly.

import type { Match } from './fixtures';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';
const KEY_STORAGE = 'vibecup_firecrawl_key';
const LAST_SCRAPE_KEY = 'vibecup_last_scrape';
const SCRAPE_HISTORY_KEY = 'vibecup_scrape_history';

export interface ScrapedMatch {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  status: 'FT' | 'NS' | 'LIVE';
  date?: string;
}

export interface ScrapeHistoryEntry {
  timestamp: string;
  source: string;
  matchesFound: number;
  errors: string[];
}

export function getStoredKey(): string | null {
  try { return localStorage.getItem(KEY_STORAGE); } catch { return null; }
}

export function storeKey(key: string) {
  try { localStorage.setItem(KEY_STORAGE, key); } catch { /* ignore */ }
}

export function getLastScrape(): string | null {
  try { return localStorage.getItem(LAST_SCRAPE_KEY); } catch { return null; }
}

export function setLastScrape(timestamp: string) {
  try { localStorage.setItem(LAST_SCRAPE_KEY, timestamp); } catch { /* ignore */ }
}

export function getScrapeHistory(): ScrapeHistoryEntry[] {
  try {
    const saved = localStorage.getItem(SCRAPE_HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function addScrapeHistory(entry: ScrapeHistoryEntry) {
  try {
    const history = getScrapeHistory();
    history.unshift(entry);
    if (history.length > 20) history.length = 20;
    localStorage.setItem(SCRAPE_HISTORY_KEY, JSON.stringify(history));
  } catch { /* ignore */ }
}

// ── TEAM NAME MAPPING ──
const TEAM_MAP: Record<string, string> = {
  'argentina': 'ARG', 'brazil': 'BRA', 'england': 'ENG', 'france': 'FRA',
  'germany': 'GER', 'spain': 'ESP', 'portugal': 'POR', 'netherlands': 'NED',
  'belgium': 'BEL', 'croatia': 'CRO', 'uruguay': 'URU', 'mexico': 'MEX',
  'usa': 'USA', 'united states': 'USA', 'morocco': 'MAR', 'japan': 'JPN',
  'senegal': 'SEN', 'colombia': 'COL', 'switzerland': 'SUI', 'denmark': 'DEN',
  'ecuador': 'ECU', 'serbia': 'SRB', 'poland': 'POL', 'canada': 'CAN',
  'cameroon': 'CMR', 'ghana': 'GHA', 'wales': 'WAL', 'australia': 'AUS',
  'qatar': 'QAT', 'saudi arabia': 'KSA', 'tunisia': 'TUN', 'iran': 'IRN',
  'south korea': 'KOR', 'korea republic': 'KOR', 'costa rica': 'CRC',
  'italy': 'ITA', 'norway': 'NOR', 'sweden': 'SWE', 'turkey': 'TUR',
  'turkiye': 'TUR', 'ukraine': 'UKR', 'new zealand': 'NZL', 'panama': 'PAN',
  'iraq': 'IRQ', 'jordan': 'JOR', 'uzbekistan': 'UZB', 'haiti': 'HAI',
  'curacao': 'CUW', 'cabo verde': 'CPV', 'cape verde': 'CPV',
  'south africa': 'RSA', 'paraguay': 'PAR', 'ivory coast': 'CIV',
  "cote d'ivoire": 'CIV', 'dr congo': 'COD', 'congo dr': 'COD',
  'algeria': 'ALG', 'bosnia': 'BIH', 'bosnia and herzegovina': 'BIH',
  'czech republic': 'CZE', 'czechia': 'CZE', 'egypt': 'EGY',
  'austria': 'AUT', 'scotland': 'SCO', 'bosnia-herzegovina': 'BIH',
};

export function mapTeamName(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  return TEAM_MAP[normalized] || null;
}

// ── PARSERS ──

function cleanTeamName(name: string): string {
  return name.replace(/^\*+/, '').replace(/\*+$/, '').replace(/^\s+|\s+$/g, '').trim();
}

/**
 * Parse ESPN format: "Group A: Mexico 2-0 South Africa (Mexico City)"
 * Also handles: "Group I: France 3-1 Senegal (East Rutherford, N.J.)"
 */
function parseESPNFormat(md: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];
  const seen = new Set<string>();

  // ESPN format: "Group X: Team N-N Team (Venue)" or just "Team N-N Team"
  const regex = /Group\s+[A-L]:\s*([A-Za-z][A-Za-z\s'\.\-]+?)\s+(\d+)\s*[-–:]\s*(\d+)\s+([A-Za-z][A-Za-z\s'\.\-]+?)(?:\s*\(|\s*$|\n)/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    const home = cleanTeamName(m[1]);
    const away = cleanTeamName(m[4]);
    const key = `${home}|${away}`;
    const homeGoals = parseInt(m[2]);
    const awayGoals = parseInt(m[3]);

    if (!seen.has(key) && home.length > 2 && away.length > 2 && home !== away) {
      // Validate scores are reasonable
      if (homeGoals >= 0 && awayGoals >= 0 && homeGoals + awayGoals < 30) {
        seen.add(key);
        matches.push({ homeTeam: home, awayTeam: away, homeGoals, awayGoals, status: 'FT' });
      }
    }
  }

  return matches;
}

/**
 * Parse bold markdown format: "**Mexico** **2** - **0** **South Africa**"
 */
function parseBoldFormat(md: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];
  const seen = new Set<string>();

  const regex = /\*\*([A-Za-z][A-Za-z\s'\.\-]+?)\*\*\s+\*\*(\d+)\*\*\s*[-–]\s+\*\*(\d+)\*\*\s+\*\*([A-Za-z][A-Za-z\s'\.\-]+?)\*\*/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    const home = cleanTeamName(m[1]);
    const away = cleanTeamName(m[4]);
    const key = `${home}|${away}`;
    const homeGoals = parseInt(m[2]);
    const awayGoals = parseInt(m[3]);

    if (!seen.has(key) && home.length > 2 && away.length > 2 && home !== away) {
      if (homeGoals >= 0 && awayGoals >= 0 && homeGoals + awayGoals < 30) {
        seen.add(key);
        matches.push({ homeTeam: home, awayTeam: away, homeGoals, awayGoals, status: 'FT' });
      }
    }
  }

  return matches;
}

/**
 * Parse plain format: "Mexico 2 - 0 South Africa FT"
 */
function parsePlainFormat(md: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];
  const seen = new Set<string>();

  const regex = /([A-Za-z][A-Za-z\s'\.\-]+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Za-z][A-Za-z\s'\.\-]+?)\s+(?:FT|AET|PEN|FINISHED|Full Time)/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    const home = cleanTeamName(m[1]);
    const away = cleanTeamName(m[4]);
    const key = `${home}|${away}`;

    if (!seen.has(key) && home.length > 2 && away.length > 2 && home !== away) {
      const hg = parseInt(m[2]);
      const ag = parseInt(m[3]);
      if (hg >= 0 && ag >= 0 && hg + ag < 30) {
        seen.add(key);
        matches.push({ homeTeam: home, awayTeam: away, homeGoals: hg, awayGoals: ag, status: 'FT' });
      }
    }
  }

  return matches;
}

/**
 * Parse Wikipedia table format: "|France|3–1|Senegal|"
 */
function parseWikiTableFormat(md: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];
  const seen = new Set<string>();

  // Wikipedia: "|France|3–1|Senegal|" with optional dash type
  const regex = /\|\s*([A-Za-z][A-Za-z\s'\.\-]+?)\s*\|\s*(\d+)\s*[–\-]\s*(\d+)\s*\|\s*([A-Za-z][A-Za-z\s'\.\-]+?)\s*\|/gi;

  let m: RegExpExecArray | null;
  while ((m = regex.exec(md)) !== null) {
    const home = cleanTeamName(m[1]);
    const away = cleanTeamName(m[4]);
    const key = `${home}|${away}`;

    // Skip table header rows and short matches
    if (home.length <= 2 || away.length <= 2 || home === away) continue;
    if (['team', 'home', 'away', 'pos', 'pld'].includes(home.toLowerCase())) continue;

    const hg = parseInt(m[2]);
    const ag = parseInt(m[3]);
    if (hg >= 0 && ag >= 0 && hg + ag < 30 && !seen.has(key)) {
      seen.add(key);
      matches.push({ homeTeam: home, awayTeam: away, homeGoals: hg, awayGoals: ag, status: 'FT' });
    }
  }

  return matches;
}

/**
 * Parse from raw text (for manual paste feature).
 * Handles any of the above formats mixed together.
 */
export function parseRawScores(text: string): ScrapedMatch[] {
  const all: ScrapedMatch[] = [];
  const seen = new Set<string>();

  // Run all parsers and deduplicate
  const parsers = [parseESPNFormat, parseBoldFormat, parsePlainFormat, parseWikiTableFormat];
  for (const parser of parsers) {
    const found = parser(text);
    for (const match of found) {
      const key = `${match.homeTeam}|${match.awayTeam}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(match);
      }
    }
  }

  return all;
}

// ── SCRAPING ──

const SCORE_URLS = [
  { url: 'https://www.espn.com/soccer/story/_/id/48939282/2026-fifa-world-cup-fixtures-results-match-schedule-group-stage-knockout-rounds-bracket', name: 'ESPN Results' },
  { url: 'https://en.wikipedia.org/wiki/2026_FIFA_World_Cup', name: 'Wikipedia Main' },
  { url: 'https://www.flashscore.com/football/world/world-cup/results/', name: 'Flashscore Results' },
  { url: 'https://www.bbc.com/sport/football/world-cup/scores-fixtures', name: 'BBC Sport' },
];

export async function scrapeScores(apiKey?: string): Promise<{
  matches: ScrapedMatch[];
  source: string;
  errors: string[];
}> {
  const key = apiKey || getStoredKey();
  if (!key) {
    return { matches: [], source: '', errors: ['No Firecrawl API key. Get one free at firecrawl.dev'] };
  }

  const errors: string[] = [];

  for (const { url, name } of SCORE_URLS) {
    try {
      const result = await scrapeWithFirecrawl(key, url, name);
      if (result.matches.length > 0) {
        setLastScrape(new Date().toISOString());
        addScrapeHistory({ timestamp: new Date().toISOString(), source: name, matchesFound: result.matches.length, errors: [] });
        return result;
      } else {
        errors.push(`${name}: page loaded but no scores found (format may not match)`);
      }
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  addScrapeHistory({ timestamp: new Date().toISOString(), source: 'All sources tried', matchesFound: 0, errors });
  return { matches: [], source: '', errors };
}

async function scrapeWithFirecrawl(apiKey: string, url: string, name: string): Promise<{
  matches: ScrapedMatch[];
  source: string;
  errors: string[];
}> {
  const resp = await fetch(FIRECRAWL_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true, timeout: 30000 }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  if (!data.success) {
    throw new Error(data.error || 'Scrape failed');
  }

  const markdown: string = data.data?.markdown || '';
  // Store last raw markdown for debugging
  try { localStorage.setItem('vibecup_last_raw_markdown', markdown.slice(0, 5000)); } catch { /* ignore */ }

  const matches = parseRawScores(markdown);
  return { matches, source: name, errors: [] };
}

/**
 * Merge scraped results into existing match data.
 */
export function mergeScrapedResults(existing: Match[], scraped: ScrapedMatch[]): Match[] {
  return existing.map(m => {
    const homeCode = m.homeTeam;
    const awayCode = m.awayTeam;

    const scrapedMatch = scraped.find(s => {
      const sHome = mapTeamName(s.homeTeam);
      const sAway = mapTeamName(s.awayTeam);
      return (sHome === homeCode && sAway === awayCode) || (sHome === awayCode && sAway === homeCode);
    });

    if (scrapedMatch && scrapedMatch.homeGoals !== null && scrapedMatch.awayGoals !== null) {
      const sHome = mapTeamName(scrapedMatch.homeTeam);
      const isReversed = sHome !== homeCode;
      return {
        ...m,
        homeGoals: isReversed ? scrapedMatch.awayGoals : scrapedMatch.homeGoals,
        awayGoals: isReversed ? scrapedMatch.homeGoals : scrapedMatch.awayGoals,
        status: 'FT',
      };
    }

    return m;
  });
}

/**
 * Force a scrape + merge into cached fixtures.
 */
export async function refreshScoresFromScrape(apiKey?: string): Promise<{
  updated: number;
  matches: ScrapedMatch[];
  errors: string[];
}> {
  const { matches, errors } = await scrapeScores(apiKey);

  if (matches.length === 0) {
    return { updated: 0, matches: [], errors };
  }

  try {
    const cached = localStorage.getItem('wc2026_fixtures');
    if (cached) {
      const existing: Match[] = JSON.parse(cached);
      const merged = mergeScrapedResults(existing, matches);
      localStorage.setItem('wc2026_fixtures', JSON.stringify(merged));
      localStorage.setItem('wc2026_data_source', 'firecrawl');
      localStorage.setItem('wc2026_fixtures_last_fetch', Date.now().toString());

      let updated = 0;
      for (let i = 0; i < existing.length; i++) {
        if (existing[i].homeGoals !== merged[i].homeGoals || existing[i].awayGoals !== merged[i].awayGoals) {
          updated++;
        }
      }
      return { updated, matches, errors };
    }
  } catch { /* ignore */ }

  return { updated: 0, matches, errors };
}

/**
 * Get the current data source label for display.
 */
export function getDataSourceLabel(): string {
  try {
    const source = localStorage.getItem('wc2026_data_source');
    if (source === 'api') return 'LIVE API';
    if (source === 'firecrawl') return 'FIRECRAWL';
  } catch { /* ignore */ }
  return 'MOCK DATA';
}
