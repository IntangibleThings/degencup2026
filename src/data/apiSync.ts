// Auto-sync service for fetching live World Cup 2026 results
// Integrates with sports APIs to automatically update tournament results

import type { TournamentResults } from './tournament';

export interface ApiConfig {
  provider: 'api-football' | 'manual';
  apiKey: string;
  autoSync: boolean;
  syncIntervalHours: number; // 1, 6, 12, or 24
  lastSync: string | null;
  season: number;
  leagueId: number; // World Cup league ID
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  provider: 'manual',
  apiKey: '',
  autoSync: false,
  syncIntervalHours: 6,
  lastSync: null,
  season: 2026,
  leagueId: 1, // FIFA World Cup
};

// Mapping from API team names to our team codes
const TEAM_NAME_MAPPING: Record<string, string> = {
  'Argentina': 'ARG', 'Brazil': 'BRA', 'England': 'ENG', 'France': 'FRA',
  'Germany': 'GER', 'Spain': 'ESP', 'Portugal': 'POR', 'Netherlands': 'NED',
  'Belgium': 'BEL', 'Croatia': 'CRO', 'Uruguay': 'URU', 'Mexico': 'MEX',
  'USA': 'USA', 'Morocco': 'MAR', 'Japan': 'JPN', 'Senegal': 'SEN',
  'Colombia': 'COL', 'Switzerland': 'SUI', 'Denmark': 'DEN', 'Ecuador': 'ECU',
  'Serbia': 'SRB', 'Poland': 'POL', 'Canada': 'CAN', 'Cameroon': 'CMR',
  'Ghana': 'GHA', 'Wales': 'WAL', 'Australia': 'AUS', 'Qatar': 'QAT',
  'Saudi Arabia': 'KSA', 'Tunisia': 'TUN', 'Iran': 'IRN', 'South Korea': 'KOR',
  'Costa Rica': 'CRC', 'Algeria': 'ALG', 'Austria': 'AUT', 'Bosnia': 'BIH',
  'Czech Republic': 'CZE', 'Czechia': 'CZE', 'Egypt': 'EGY', 'Norway': 'NOR',
  'Sweden': 'SWE', 'Turkey': 'TUR', 'Turkiye': 'TUR', 'Ukraine': 'UKR',
  'New Zealand': 'NZL', 'Panama': 'PAN', 'Iraq': 'IRQ', 'Jordan': 'JOR',
  'Uzbekistan': 'UZB', 'Haiti': 'HAI', 'Curacao': 'CUW', 'Cabo Verde': 'CPV',
  'South Africa': 'RSA', 'Paraguay': 'PAR', 'Ivory Coast': 'CIV',
  "Cote d'Ivoire": 'CIV', 'Congo DR': 'COD', 'DR Congo': 'COD',
};

// API-Football integration
// Docs: https://www.api-football.com/documentation-v3
export async function syncFromApiFootball(apiKey: string): Promise<{
  results: TournamentResults;
  updated: number;
  errors: string[];
}> {
  const results: TournamentResults = {};
  const errors: string[] = [];
  let updated = 0;

  try {
    // Fetch fixtures for World Cup 2026
    // League ID 1 = FIFA World Cup
    const response = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=1&season=2026`,
      {
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': 'v3.football.api-sports.io',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.response || data.response.length === 0) {
      throw new Error('No fixtures found. The tournament may not have started yet.');
    }

    // Process each fixture
    for (const fixture of data.response) {
      const homeTeam = TEAM_NAME_MAPPING[fixture.teams.home.name];
      const awayTeam = TEAM_NAME_MAPPING[fixture.teams.away.name];

      if (!homeTeam || !awayTeam) continue;

      // Only process finished matches
      if (fixture.fixture.status.short !== 'FT' &&
          fixture.fixture.status.short !== 'AET' &&
          fixture.fixture.status.short !== 'PEN') {
        continue;
      }

      const homeGoals = fixture.goals.home || 0;
      const awayGoals = fixture.goals.away || 0;
      const isKnockout = fixture.league.round !== 'Group Stage' &&
                         fixture.league.round !== 'Regular Season';

      // Update home team result
      if (homeTeam) {
        const homeResult = results[homeTeam] || createEmptyResult();
        updated++;

        if (!isKnockout) {
          // Group stage - update position based on points
          // (This is simplified - actual group position requires full group data)
        } else {
          // Knockout - determine advancement
          const homeWon = homeGoals > awayGoals ||
            (fixture.fixture.status.short === 'PEN' && fixture.scores.penalty.home > fixture.scores.penalty.away);

          if (homeWon) {
            homeResult.reachedKnockout = true;
            updateKnockoutProgress(homeResult, fixture.league.round);
          } else {
            homeResult.eliminated = true;
          }
        }
        results[homeTeam] = homeResult;
      }

      // Update away team result
      if (awayTeam) {
        const awayResult = results[awayTeam] || createEmptyResult();
        updated++;

        if (isKnockout) {
          const awayWon = awayGoals > homeGoals ||
            (fixture.fixture.status.short === 'PEN' && fixture.scores.penalty.away > fixture.scores.penalty.home);

          if (awayWon) {
            awayResult.reachedKnockout = true;
            updateKnockoutProgress(awayResult, fixture.league.round);
          } else {
            awayResult.eliminated = true;
          }
        }
        results[awayTeam] = awayResult;
      }
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Unknown error');
  }

  return { results, updated, errors };
}

function createEmptyResult(): TournamentResults[string] {
  return {
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

function updateKnockoutProgress(result: TournamentResults[string], round: string) {
  result.reachedKnockout = true;

  const roundMap: Record<string, keyof TournamentResults[string]> = {
    'Round of 16': 'reachedRoundOf16',
    'Quarter-finals': 'reachedQuarterFinal',
    'Quarterfinals': 'reachedQuarterFinal',
    'Semi-finals': 'reachedSemiFinal',
    'Semifinals': 'reachedSemiFinal',
    'Final': 'reachedFinal',
    'Third Place': 'wonThirdPlace',
    '3rd Place': 'wonThirdPlace',
  };

  const key = roundMap[round];
  if (key) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (result as any)[key] = true;
  }

  // If they reached the final and won, mark as champion
  // (This would need actual match result to determine)
}

// Manual sync placeholder for pre-tournament period
export async function syncFromManual(): Promise<{
  results: TournamentResults;
  updated: number;
  errors: string[];
}> {
  return {
    results: {},
    updated: 0,
    errors: ['Manual mode: No API configured. Set up API-Football integration to enable auto-sync.'],
  };
}

// Main sync function
export async function syncResults(config: ApiConfig): Promise<{
  results: TournamentResults;
  updated: number;
  errors: string[];
}> {
  if (config.provider === 'api-football' && config.apiKey) {
    return syncFromApiFootball(config.apiKey);
  }
  return syncFromManual();
}

// Schedule next sync
export function scheduleNextSync(config: ApiConfig): number | null {
  if (!config.autoSync) return null;
  return config.syncIntervalHours * 60 * 60 * 1000; // Convert hours to ms
}

// STORAGE KEY for API config
export const API_CONFIG_KEY = 'vibecup_api_config';

export function loadApiConfig(): ApiConfig {
  try {
    const saved = localStorage.getItem(API_CONFIG_KEY);
    if (saved) return { ...DEFAULT_API_CONFIG, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return { ...DEFAULT_API_CONFIG };
}

export function saveApiConfig(config: ApiConfig) {
  try {
    localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config));
  } catch { /* ignore */ }
}
