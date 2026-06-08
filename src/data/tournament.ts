// World Cup 2026 Tournament Data

export type GroupLetter = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L';
export type Tier = 'favorite' | 'mid' | 'underdog';
export type Stage = 'group' | 'r32' | 'r16' | 'qf' | 'sf' | 'final' | 'champion' | 'third' | 'eliminated';

export interface Team {
  code: string;
  name: string;
  flag: string;
  group: GroupLetter;
  tier: Tier;
}

export const TEAM_NAMES: Record<string, string> = {
  MEX: 'Mexico', RSA: 'South Africa', KOR: 'Korea Republic', CZE: 'Czechia',
  CAN: 'Canada', BIH: 'Bosnia & Herz.', QAT: 'Qatar', SUI: 'Switzerland',
  BRA: 'Brazil', MAR: 'Morocco', HAI: 'Haiti', SCO: 'Scotland',
  USA: 'United States', PAR: 'Paraguay', AUS: 'Australia', TUR: 'Turkiye',
  GER: 'Germany', CUW: 'Curacao', CIV: "Cote d'Ivoire", ECU: 'Ecuador',
  NED: 'Netherlands', JPN: 'Japan', SWE: 'Sweden', TUN: 'Tunisia',
  BEL: 'Belgium', EGY: 'Egypt', IRN: 'IR Iran', NZL: 'New Zealand',
  ESP: 'Spain', CPV: 'Cabo Verde', KSA: 'Saudi Arabia', URU: 'Uruguay',
  FRA: 'France', SEN: 'Senegal', IRQ: 'Iraq', NOR: 'Norway',
  ARG: 'Argentina', ALG: 'Algeria', AUT: 'Austria', JOR: 'Jordan',
  POR: 'Portugal', COD: 'Congo DR', UZB: 'Uzbekistan', COL: 'Colombia',
  ENG: 'England', CRO: 'Croatia', GHA: 'Ghana', PAN: 'Panama',
};

export const TEAM_FLAGS: Record<string, string> = {
  MEX: '🇲🇽', RSA: '🇿🇦', KOR: '🇰🇷', CZE: '🇨🇿',
  CAN: '🇨🇦', BIH: '🇧🇦', QAT: '🇶🇦', SUI: '🇨🇭',
  BRA: '🇧🇷', MAR: '🇲🇦', HAI: '🇭🇹', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸', PAR: '🇵🇾', AUS: '🇦🇺', TUR: '🇹🇷',
  GER: '🇩🇪', CUW: '🇨🇼', CIV: '🇨🇮', ECU: '🇪🇨',
  NED: '🇳🇱', JPN: '🇯🇵', SWE: '🇸🇪', TUN: '🇹🇳',
  BEL: '🇧🇪', EGY: '🇪🇬', IRN: '🇮🇷', NZL: '🇳🇿',
  ESP: '🇪🇸', CPV: '🇨🇻', KSA: '🇸🇦', URU: '🇺🇾',
  FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶', NOR: '🇳🇴',
  ARG: '🇦🇷', ALG: '🇩🇿', AUT: '🇦🇹', JOR: '🇯🇴',
  POR: '🇵🇹', COD: '🇨🇩', UZB: '🇺🇿', COL: '🇨🇴',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', GHA: '🇬🇭', PAN: '🇵🇦',
};

// Default tier assignments
export const DEFAULT_TIERS: Record<string, Tier> = {
  ESP: 'favorite', FRA: 'favorite', ENG: 'favorite', ARG: 'favorite', BRA: 'favorite', POR: 'favorite',
  NED: 'mid', GER: 'mid', MAR: 'mid', BEL: 'mid', CRO: 'mid', URU: 'mid', COL: 'mid', JPN: 'mid', MEX: 'mid', USA: 'mid', SEN: 'mid',
  SUI: 'underdog', ECU: 'underdog', KOR: 'underdog', AUS: 'underdog', CZE: 'underdog', CAN: 'underdog',
  IRN: 'underdog', TUN: 'underdog', SWE: 'underdog', ALG: 'underdog', AUT: 'underdog', JOR: 'underdog',
  RSA: 'underdog', BIH: 'underdog', HAI: 'underdog', SCO: 'underdog', PAR: 'underdog', TUR: 'underdog',
  CUW: 'underdog', CIV: 'underdog', EGY: 'underdog', CPV: 'underdog', COD: 'underdog', UZB: 'underdog',
  PAN: 'underdog', NOR: 'underdog', NZL: 'underdog', IRQ: 'underdog', GHA: 'underdog', QAT: 'underdog',
  KSA: 'underdog',
};

export const GROUPS: Record<GroupLetter, string[]> = {
  A: ['MEX', 'RSA', 'KOR', 'CZE'],
  B: ['CAN', 'BIH', 'QAT', 'SUI'],
  C: ['BRA', 'MAR', 'HAI', 'SCO'],
  D: ['USA', 'PAR', 'AUS', 'TUR'],
  E: ['GER', 'CUW', 'CIV', 'ECU'],
  F: ['NED', 'JPN', 'SWE', 'TUN'],
  G: ['BEL', 'EGY', 'IRN', 'NZL'],
  H: ['ESP', 'CPV', 'KSA', 'URU'],
  I: ['FRA', 'SEN', 'IRQ', 'NOR'],
  J: ['ARG', 'ALG', 'AUT', 'JOR'],
  K: ['POR', 'COD', 'UZB', 'COL'],
  L: ['ENG', 'CRO', 'GHA', 'PAN'],
};

export function getAllTeams(customTiers?: Record<string, Tier>): Team[] {
  const tiers = customTiers || DEFAULT_TIERS;
  const teams: Team[] = [];
  (Object.keys(TEAM_FLAGS) as string[]).forEach(code => {
    let group: GroupLetter = 'A';
    (Object.entries(GROUPS) as unknown as [GroupLetter, string[]][]).forEach(([g, members]) => {
      if (members.includes(code)) group = g;
    });
    teams.push({ code, name: TEAM_NAMES[code] || code, flag: TEAM_FLAGS[code], group, tier: tiers[code] || 'underdog' });
  });
  return teams;
}

export function getTeamsByTier(tier: Tier, customTiers?: Record<string, Tier>): Team[] {
  return getAllTeams(customTiers).filter(t => t.tier === tier);
}

// Scoring configuration
export interface ScoringConfig {
  groupFirst: number;
  groupSecond: number;
  groupThirdQualify: number;
  groupFourth: number;
  roundOf16: number;
  quarterFinal: number;
  semiFinal: number;
  reachFinal: number;
  winWorldCup: number;
  winThirdPlace: number;
  topScorerBonus: number;
  lateEntryPenaltyPerDay: number;
}

export const DEFAULT_SCORING: ScoringConfig = {
  groupFirst: 6, groupSecond: 4, groupThirdQualify: 3, groupFourth: -2,
  roundOf16: 3, quarterFinal: 5, semiFinal: 7, reachFinal: 10,
  winWorldCup: 15, winThirdPlace: 3,
  topScorerBonus: 5,
  lateEntryPenaltyPerDay: 2,
};

export function calculateTeamPoints(
  teamCode: string,
  results: TournamentResults,
  scoring: ScoringConfig = DEFAULT_SCORING
): { points: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let points = 0;
  const result = results[teamCode];
  if (!result) return { points: 0, breakdown };

  if (result.groupPosition === 1) { points += scoring.groupFirst; breakdown.push(`1st in group: +${scoring.groupFirst}`); }
  else if (result.groupPosition === 2) { points += scoring.groupSecond; breakdown.push(`2nd in group: +${scoring.groupSecond}`); }
  else if (result.groupPosition === 3 && result.reachedKnockout) { points += scoring.groupThirdQualify; breakdown.push(`3rd & qualified: +${scoring.groupThirdQualify}`); }
  else if (result.groupPosition === 4) { points += scoring.groupFourth; breakdown.push(`4th in group: ${scoring.groupFourth}`); }

  if (result.reachedRoundOf16) { points += scoring.roundOf16; breakdown.push(`Reached R16: +${scoring.roundOf16}`); }
  if (result.reachedQuarterFinal) { points += scoring.quarterFinal; breakdown.push(`Reached QF: +${scoring.quarterFinal}`); }
  if (result.reachedSemiFinal) { points += scoring.semiFinal; breakdown.push(`Reached SF: +${scoring.semiFinal}`); }
  if (result.reachedFinal) { points += scoring.reachFinal; breakdown.push(`Reached Final: +${scoring.reachFinal}`); }
  if (result.wonWorldCup) { points += scoring.winWorldCup; breakdown.push(`Won World Cup: +${scoring.winWorldCup}`); }
  if (result.wonThirdPlace) { points += scoring.winThirdPlace; breakdown.push(`Won 3rd place: +${scoring.winThirdPlace}`); }

  return { points, breakdown };
}

export interface TopScorerGuess {
  name: string;
  country: string;
}

export interface TournamentResults {
  [teamCode: string]: {
    groupPosition: number;
    reachedKnockout: boolean;
    reachedRoundOf16: boolean;
    reachedQuarterFinal: boolean;
    reachedSemiFinal: boolean;
    reachedFinal: boolean;
    wonWorldCup: boolean;
    wonThirdPlace: boolean;
    eliminated: boolean;
  };
}

export interface Manager {
  id: string;
  name: string;
  teamName: string;
  realName: string;
  teamCodes: string[];
  submittedAt: string | null;
  topScorerGuess: TopScorerGuess | null;
  paid: boolean;
  warnings: number;
}

export interface PayoutConfig {
  buyIn: number;
  currency: string;
  firstPlacePercent: number;
  secondPlacePercent: number;
  thirdPlacePercent: number;
}

export const DEFAULT_PAYOUT: PayoutConfig = {
  buyIn: 250,
  currency: 'HKD',
  firstPlacePercent: 50,
  secondPlacePercent: 30,
  thirdPlacePercent: 20,
};

export interface AppSettings {
  draftLocked: boolean;
  submissionsOpen: boolean;
  draftMode: boolean;
  hidePicksUntil: string | null;
  scoring: ScoringConfig;
  tiers: Record<string, Tier>;
  tournamentStart: string;
  topScorerActual: TopScorerGuess | null;
  payout: PayoutConfig;
}

export const DEFAULT_SETTINGS: AppSettings = {
  draftLocked: false,
  submissionsOpen: true,
  draftMode: false,
  hidePicksUntil: null,
  scoring: DEFAULT_SCORING,
  tiers: { ...DEFAULT_TIERS },
  tournamentStart: '2026-06-11T15:00:00-04:00',
  topScorerActual: null,
  payout: DEFAULT_PAYOUT,
};
