import { Teams } from "./teams";
import { Match } from "./match";

export interface GameState {
  selectedTeamId: number | null;
  teams: Teams[];
  fixture: Match[];
}
