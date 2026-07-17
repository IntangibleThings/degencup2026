// Firecrawl integration for scraping live World Cup 2026 scores
// Sign up free at firecrawl.dev — 500 credits/month on free tier
// Each scrape = 1 credit. Scoring after games end = ~5-10 credits/day max.

import type { Match } from './fixtures';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';
const STORAGE_KEY = 'vibecup_firecrawl_key';

// Target URLs to scrape (in order of preference)
const SCORE_URLS = [
  'https://www.espn.com/soccer/schedule/_/league/fifa.world',
  'https://www.flashscore.com/football/world/world-cup/',
  'https://www.bbc.com/sport/football/world-cup/scores-fixtures',
  'https://www.fifa.com/fifaplus/en/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures',
];

export interface ScrapedMatch {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  status: 'FT' | 'NS' | 'LIVE';
  date?: string;
}

export function getStoredKey(): string | null {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

export function storeKey(key: string) {
  try { localStorage.setItem(STORAGE_KEY, key); } catch { /* ignore */ }
}

/**
 * Scrape live scores from ESPN World Cup page using Firecrawl
 * Returns parsed match results.
 */
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

  for (const url of SCORE_URLS) {
    try {
      const result = await scrapeWithFirecrawl(key, url);
      if (result.matches.length > 0) {
        return result;
      }
    } catch (err) {
      errors.push(`${url}: ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  return { matches: [], source: '', errors };
}

async function scrapeWithFirecrawl(apiKey: string, url: string): Promise<{
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
    body: JSON.stringify({
      url,
      formats: ['markdown'],
      onlyMainContent: true,
    }),
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
  const matches = parseMatchesFromMarkdown(markdown);

  return { matches, source: url, errors: [] };
}

/**
 * Parse match data from scraped markdown content.
 * Handles ESPN, Flashscore, and BBC formats.
 */
function parseMatchesFromMarkdown(md: string): ScrapedMatch[] {
  const matches: ScrapedMatch[] = [];
  const lines = md.split('\n');

  // Pattern 1: ESPN format — "Team A 2 - 1 Team B FT" or "Team A v Team B 3:00 AM"
  // Pattern 2: "Team A 2-1 Team B" with FT/HT/live status
  // Pattern 3: "Team A v Team B" for upcoming

  const espnResultRegex = /^\*?\*?([^*\d-]+?)\*?\*?\s+(\d+)\s*-\s*(\d+)\s+\*?\*?([^*\d-]+?)\*?\*?\s+(FT|AET|PEN|HT|LIVE|FINISHED)/i;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 10) continue;

    // Try ESPN result format: "Mexico 2 - 0 South Africa FT"
    let m = espnResultRegex.exec(trimmed);
    if (m) {
      matches.push({
        homeTeam: cleanTeamName(m[1]),
        awayTeam: cleanTeamName(m[4]),
        homeGoals: parseInt(m[2]),
        awayGoals: parseInt(m[3]),
        status: 'FT',
      });
      continue;
    }

    // Try score format: "Brazil 1-0 Argentina" (without explicit FT)
    // Look for lines with two team-like names and a score
    const scoreMatch = trimmed.match(/([A-Za-z][A-Za-z\s\.]+?)\s+(\d+)\s*[-–]\s*(\d+)\s+([A-Za-z][A-Za-z\s\.]+)/);
    if (scoreMatch) {
      const home = cleanTeamName(scoreMatch[1]);
      const away = cleanTeamName(scoreMatch[4]);
      // Validate: both should look like team names (not random text)
      if (home.length > 2 && away.length > 2 && home !== away) {
        // Check if line has FT/AET/Finished indicator nearby
        const hasFt = /\b(FT|AET|FINISHED|Full Time)\b/i.test(trimmed);
        matches.push({
          homeTeam: home,
          awayTeam: away,
          homeGoals: parseInt(scoreMatch[2]),
          awayGoals: parseInt(scoreMatch[3]),
          status: hasFt ? 'FT' : 'LIVE',
        });
      }
      continue;
    }
  }

  return matches;
}

function cleanTeamName(name: string): string {
  return name
    .replace(/^\*+/, '')
    .replace(/\*+$/, '')
    .replace(/\s+$/, '')
    .replace(/^\s+/, '')
    .trim();
}

/**
 * Map scraped team names to our 3-letter team codes.
 */
export function mapTeamName(name: string): string | null {
  const normalized = name.toLowerCase().trim();

  const mapping: Record<string, string> = {
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
    'algeria': 'ALG', 'bosnia': 'BIH', 'bosnia-herzegovina': 'BIH',
    'bosnia and herzegovina': 'BIH', 'czech republic': 'CZE', 'czechia': 'CZE',
    'czech': 'CZE', 'egypt': 'EGY', 'austria': 'AUT', 'scotland': 'SCO',
  };

  return mapping[normalized] || null;
}

/**
 * Merge scraped results into existing match data.
 */
export function mergeScrapedResults(
  existing: Match[],
  scraped: ScrapedMatch[]
): Match[] {
  return existing.map(m => {
    const homeCode = m.homeTeam;
    const awayCode = m.awayTeam;

    // Find matching scraped result
    const scrapedMatch = scraped.find(s => {
      const sHome = mapTeamName(s.homeTeam);
      const sAway = mapTeamName(s.awayTeam);
      return (sHome === homeCode && sAway === awayCode) ||
             (sHome === awayCode && sAway === homeCode); // handle reversed
    });

    if (scrapedMatch && scrapedMatch.status === 'FT') {
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
