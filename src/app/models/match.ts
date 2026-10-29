import { MatchEvent } from "./match-event";

export interface Match {
  id: number;
  matchday: number;

  homeTeamId: number;
  awayTeamId: number;

  homeGoals: number;
  awayGoals: number;

  played: boolean;
  events: MatchEvent[];
}
