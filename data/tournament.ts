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

// Known players database for autocomplete
export interface KnownPlayer {
  name: string;
  country: string;
  countryCode: string;
  position: string;
}

export const KNOWN_PLAYERS: KnownPlayer[] = [
  // Argentina
  { name: 'Lionel Messi', country: 'Argentina', countryCode: 'ARG', position: 'FW' },
  { name: 'Lautaro Martinez', country: 'Argentina', countryCode: 'ARG', position: 'FW' },
  { name: 'Julian Alvarez', country: 'Argentina', countryCode: 'ARG', position: 'FW' },
  { name: 'Enzo Fernandez', country: 'Argentina', countryCode: 'ARG', position: 'MF' },
  { name: 'Alexis Mac Allister', country: 'Argentina', countryCode: 'ARG', position: 'MF' },
  // Brazil
  { name: 'Vinicius Jr', country: 'Brazil', countryCode: 'BRA', position: 'FW' },
  { name: 'Rodrygo', country: 'Brazil', countryCode: 'BRA', position: 'FW' },
  { name: 'Endrick', country: 'Brazil', countryCode: 'BRA', position: 'FW' },
  { name: 'Raphinha', country: 'Brazil', countryCode: 'BRA', position: 'FW' },
  // France
  { name: 'Kylian Mbappe', country: 'France', countryCode: 'FRA', position: 'FW' },
  { name: 'Antoine Griezmann', country: 'France', countryCode: 'FRA', position: 'FW' },
  { name: 'Ousmane Dembele', country: 'France', countryCode: 'FRA', position: 'FW' },
  { name: 'Randal Kolo Muani', country: 'France', countryCode: 'FRA', position: 'FW' },
  // England
  { name: 'Harry Kane', country: 'England', countryCode: 'ENG', position: 'FW' },
  { name: 'Bukayo Saka', country: 'England', countryCode: 'ENG', position: 'FW' },
  { name: 'Jude Bellingham', country: 'England', countryCode: 'ENG', position: 'MF' },
  { name: 'Phil Foden', country: 'England', countryCode: 'ENG', position: 'FW' },
  { name: 'Cole Palmer', country: 'England', countryCode: 'ENG', position: 'FW' },
  // Portugal
  { name: 'Cristiano Ronaldo', country: 'Portugal', countryCode: 'POR', position: 'FW' },
  { name: 'Diogo Jota', country: 'Portugal', countryCode: 'POR', position: 'FW' },
  // Spain
  { name: 'Lamine Yamal', country: 'Spain', countryCode: 'ESP', position: 'FW' },
  { name: 'Alvaro Morata', country: 'Spain', countryCode: 'ESP', position: 'FW' },
  { name: 'Nico Williams', country: 'Spain', countryCode: 'ESP', position: 'FW' },
  // Germany
  { name: 'Jamal Musiala', country: 'Germany', countryCode: 'GER', position: 'MF' },
  { name: 'Florian Wirtz', country: 'Germany', countryCode: 'GER', position: 'MF' },
  { name: 'Kai Havertz', country: 'Germany', countryCode: 'GER', position: 'FW' },
  { name: 'Niclas Fullkrug', country: 'Germany', countryCode: 'GER', position: 'FW' },
  // Netherlands
  { name: 'Cody Gakpo', country: 'Netherlands', countryCode: 'NED', position: 'FW' },
  { name: 'Memphis Depay', country: 'Netherlands', countryCode: 'NED', position: 'FW' },
  { name: 'Xavi Simons', country: 'Netherlands', countryCode: 'NED', position: 'FW' },
  // Belgium
  { name: 'Romelu Lukaku', country: 'Belgium', countryCode: 'BEL', position: 'FW' },
  { name: 'Kevin De Bruyne', country: 'Belgium', countryCode: 'BEL', position: 'MF' },
  { name: 'Jeremy Doku', country: 'Belgium', countryCode: 'BEL', position: 'FW' },
  // Croatia
  { name: 'Luka Modric', country: 'Croatia', countryCode: 'CRO', position: 'MF' },
  { name: 'Andrej Kramaric', country: 'Croatia', countryCode: 'CRO', position: 'FW' },
  // Uruguay
  { name: 'Darwin Nunez', country: 'Uruguay', countryCode: 'URU', position: 'FW' },
  { name: 'Federico Valverde', country: 'Uruguay', countryCode: 'URU', position: 'MF' },
  // Colombia
  { name: 'Luis Diaz', country: 'Colombia', countryCode: 'COL', position: 'FW' },
  { name: 'James Rodriguez', country: 'Colombia', countryCode: 'COL', position: 'MF' },
  { name: 'Jhon Duran', country: 'Colombia', countryCode: 'COL', position: 'FW' },
  // Japan
  { name: 'Takefusa Kubo', country: 'Japan', countryCode: 'JPN', position: 'FW' },
  { name: 'Kaoru Mitoma', country: 'Japan', countryCode: 'JPN', position: 'FW' },
  // USA
  { name: 'Christian Pulisic', country: 'USA', countryCode: 'USA', position: 'FW' },
  { name: 'Folarin Balogun', country: 'USA', countryCode: 'USA', position: 'FW' },
  // Mexico
  { name: 'Santiago Gimenez', country: 'Mexico', countryCode: 'MEX', position: 'FW' },
  { name: 'Raul Jimenez', country: 'Mexico', countryCode: 'MEX', position: 'FW' },
  // Morocco
  { name: 'Achraf Hakimi', country: 'Morocco', countryCode: 'MAR', position: 'DF' },
  { name: 'Youssef En-Nesyri', country: 'Morocco', countryCode: 'MAR', position: 'FW' },
  // Other notable players
  { name: 'Son Heung-min', country: 'Korea Republic', countryCode: 'KOR', position: 'FW' },
  { name: 'Mohamed Salah', country: 'Egypt', countryCode: 'EGY', position: 'FW' },
  { name: 'Victor Osimhen', country: 'Nigeria', countryCode: 'NGA', position: 'FW' },
  { name: 'Erling Haaland', country: 'Norway', countryCode: 'NOR', position: 'FW' },
  { name: 'Martin Odegaard', country: 'Norway', countryCode: 'NOR', position: 'MF' },
  { name: 'Sardar Azmoun', country: 'IR Iran', countryCode: 'IRN', position: 'FW' },
  { name: 'Mehdi Taremi', country: 'IR Iran', countryCode: 'IRN', position: 'FW' },
  { name: 'Wataru Endo', country: 'Japan', countryCode: 'JPN', position: 'MF' },
  { name: 'Mikel Oyarzabal', country: 'Spain', countryCode: 'ESP', position: 'FW' },
  { name: 'Bruno Fernandes', country: 'Portugal', countryCode: 'POR', position: 'MF' },
  { name: 'Bernardo Silva', country: 'Portugal', countryCode: 'POR', position: 'MF' },
  { name: 'Joao Felix', country: 'Portugal', countryCode: 'POR', position: 'FW' },
  { name: 'Gianluca Scamacca', country: 'Italy', countryCode: 'ITA', position: 'FW' },
  { name: 'Patrik Schick', country: 'Czechia', countryCode: 'CZE', position: 'FW' },
  { name: 'Robert Lewandowski', country: 'Poland', countryCode: 'POL', position: 'FW' },
  { name: 'Zlatan Ibrahimovic', country: 'Sweden', countryCode: 'SWE', position: 'FW' },
  { name: 'Dejan Kulusevski', country: 'Sweden', countryCode: 'SWE', position: 'FW' },
  { name: 'Alphonso Davies', country: 'Canada', countryCode: 'CAN', position: 'DF' },
  { name: 'Jonathan David', country: 'Canada', countryCode: 'CAN', position: 'FW' },
  { name: 'Edinson Cavani', country: 'Uruguay', countryCode: 'URU', position: 'FW' },
  { name: 'Luis Suarez', country: 'Uruguay', countryCode: 'URU', position: 'FW' },
  { name: 'Enner Valencia', country: 'Ecuador', countryCode: 'ECU', position: 'FW' },
  { name: 'Khvicha Kvaratskhelia', country: 'Georgia', countryCode: 'GEO', position: 'FW' },
  { name: 'Dusan Vlahovic', country: 'Serbia', countryCode: 'SRB', position: 'FW' },
  { name: 'Aleksandar Mitrovic', country: 'Serbia', countryCode: 'SRB', position: 'FW' },
  { name: 'Granit Xhaka', country: 'Switzerland', countryCode: 'SUI', position: 'MF' },
  { name: 'Breel Embolo', country: 'Switzerland', countryCode: 'SUI', position: 'FW' },
  { name: 'Dominik Szoboszlai', country: 'Hungary', countryCode: 'HUN', position: 'MF' },
  { name: 'Rafael Leao', country: 'Portugal', countryCode: 'POR', position: 'FW' },
  { name: 'Kingsley Coman', country: 'France', countryCode: 'FRA', position: 'FW' },
  { name: 'Ollie Watkins', country: 'England', countryCode: 'ENG', position: 'FW' },
  { name: 'Declan Rice', country: 'England', countryCode: 'ENG', position: 'MF' },
  { name: 'Marcus Rashford', country: 'England', countryCode: 'ENG', position: 'FW' },
  { name: 'Jack Grealish', country: 'England', countryCode: 'ENG', position: 'FW' },
  { name: 'Eberechi Eze', country: 'England', countryCode: 'ENG', position: 'MF' },
  { name: 'Morgan Rogers', country: 'England', countryCode: 'ENG', position: 'MF' },
];

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
  code: string; // 6-digit entry code
  pincode: string; // 4-digit pincode to access team
  teamCodes: string[];
  submittedAt: string | null;
  topScorerGuess: TopScorerGuess | null;
  paid: boolean;
  warnings: number;
}

// Degen Den - Side wager between two managers
export interface Wager {
  id: string;
  proposerId: string;
  proposerName: string;
  acceptorId: string;
  acceptorName: string;
  description: string; // e.g. "Austria goes further than Canada"
  stakeType: 'even' | 'custom';
  proposerStake: number; // what proposer risks
  acceptorStake: number; // what acceptor risks
  status: 'pending' | 'accepted' | 'resolved' | 'cancelled';
  proposerConfirmed: boolean;
  acceptorConfirmed: boolean;
  proposedAt: string;
  acceptedAt: string | null;
  winnerId: string | null; // null = push/void
  escrowPaid: boolean;
  resolvedAt: string | null;
}

export interface PayoutConfig {
  buyIn: number;
  currency: string;
  firstPlacePercent: number;
  secondPlacePercent: number;
  thirdPlacePercent: number;
}

export const DEFAULT_PAYOUT: PayoutConfig = {
  buyIn: 200,
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
  hidePicksUntil: '2026-06-11T19:00:00.000Z', // June 12, 2026 3am HKT (default)
  scoring: DEFAULT_SCORING,
  tiers: { ...DEFAULT_TIERS },
  tournamentStart: '2026-06-11T15:00:00-04:00',
  topScorerActual: null,
  payout: DEFAULT_PAYOUT,
};
