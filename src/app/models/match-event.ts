export interface MatchEvent {
  minute: number;
  type: 'goal' | 'assist' | 'yellow' | 'red';
  playerId: number;
  teamId: number;
  assistId?: number; // <-- OPCIONAL
}
