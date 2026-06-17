import { Match, MatchEvent, Player } from './types';

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1',
    tournamentName: 'U15 Piger Liga 2',
    groupName: 'Pulje 873',
    homeTeam: { id: 't1', name: 'FC Nordsjælland', shortName: 'FCN', color: '#B91C1C' },
    awayTeam: { id: 't2', name: 'Brøndby IF', shortName: 'BIF', color: '#1D4ED8' },
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled',
    halfDuration: 20,
  },
  {
    id: 'm2',
    tournamentName: 'Herre Serie 1',
    groupName: 'Pulje 2',
    homeTeam: { id: 't3', name: 'Blovstrød IF', shortName: 'BIF', color: '#047857' },
    awayTeam: { id: 't4', name: 'Farum BK', shortName: 'FBK', color: '#EA580C' },
    homeScore: 2,
    awayScore: 1,
    status: 'half_time',
    halfDuration: 45,
  }
];

export const INITIAL_MATCH: Match = INITIAL_MATCHES[0];

export const MOCK_PLAYERS: Player[] = [
  { id: 'p1', teamId: 't1', name: 'Vilma Bruhn', number: 9 },
  { id: 'p2', teamId: 't1', name: 'Liva Bak Vad', number: 10 },
  { id: 'p3', teamId: 't1', name: 'Emma Jensen', number: 7 },
  { id: 'p4', teamId: 't2', name: 'Sofie Lund', number: 11 },
  { id: 'p5', teamId: 't2', name: 'Ida Nielsen', number: 8 },
];

export const MOCK_INITIAL_EVENTS: MatchEvent[] = [
  /* Empty initially, or maybe we show a mock finished game? 
     The prompt says: "Viser en færdigspillet kamp (0-10)" - 
     let's initialize with an empty one so we can use the menu to add goals,
     but maybe prepopulate some for the visual effect if needed. Let's make it interactive! */
];
