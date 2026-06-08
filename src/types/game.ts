import type { GroupLetter } from '@/data/tournament';

export type Position = 1 | 2 | 3 | 4;

export interface GroupPrediction {
  [teamCode: string]: Position | null;
}

export interface BracketPrediction {
  [matchId: number]: string | null;
}

export interface TopScorerPrediction {
  first: string | null;
  second: string | null;
  third: string | null;
}

export interface Predictions {
  groups: Record<GroupLetter, GroupPrediction>;
  bracket: BracketPrediction;
  topScorer: TopScorerPrediction;
}

export interface Player {
  name: string;
  groupCode: string;
  predictions: Predictions;
  score: ScoreBreakdown;
}

export interface ScoreBreakdown {
  groupPoints: number;
  bracketPoints: number;
  topScorerPoints: number;
  bonusPoints: number;
  total: number;
}

export interface GameState {
  playerName: string;
  groupCode: string;
  predictions: Predictions;
  currentPage: string;
}
