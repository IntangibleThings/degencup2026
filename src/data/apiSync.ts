// Deprecated — API syncing is now handled directly by:
//   - src/data/footballdata.ts  (football-data.org via proxy)
//   - src/data/firecrawl.ts     (paste scores fallback)
//   - src/data/resultsEngine.ts (derives standings from match results)
//
// This file is kept for backward compatibility with existing saved config only.

export interface ApiConfig {
  provider: 'api-football' | 'manual';
  apiKey: string;
  autoSync: boolean;
  syncIntervalHours: number;
  lastSync: string | null;
  season: number;
  leagueId: number;
}

export const DEFAULT_API_CONFIG: ApiConfig = {
  provider: 'manual',
  apiKey: '',
  autoSync: false,
  syncIntervalHours: 6,
  lastSync: null,
  season: 2026,
  leagueId: 1,
};

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
