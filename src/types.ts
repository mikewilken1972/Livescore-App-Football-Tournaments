export type Team = {
  id: string;
  name: string;
  shortName?: string;
  color?: string;
};

export type Player = {
  id: string;
  teamId: string;
  name: string;
  number?: number;
};

export type MatchStatus = 'scheduled' | 'first_half' | 'half_time' | 'second_half' | 'penalties' | 'finished';

export type EventType = 
  | 'match_start' 
  | 'half_time' 
  | 'second_half_start' 
  | 'match_end' 
  | 'goal' 
  | 'penalty_goal'
  | 'own_goal'
  | 'yellow_card' 
  | 'red_card'
  | 'substitution'
  | 'free_kick'
  | 'penalty'
  | 'corner_kick'
  | 'shot_on_target'
  | 'offside'
  | 'comment'
  | 'image'
  | 'coach_yellow_card';

export type MatchEvent = {
  id: string;
  matchId: string;
  type: EventType;
  minute: number;
  timestamp: number;
  teamId?: string;
  playerId?: string;
  assistPlayerId?: string;
  description?: string;
  imageUrl?: string;
};

export type Match = {
  id: string;
  tournamentName: string;
  groupName: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  isPaused?: boolean;
  startTime?: number;
  halfDuration: number;
  elapsedSeconds?: number;
  statusUpdatedAt?: number;
  homeSquad?: string[];
  awaySquad?: string[];
  maxSquadSize?: number;
};
