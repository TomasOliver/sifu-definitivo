import { LeagueStanding } from "./league-standing";
import { Match } from "./match";
import { Teams } from "./teams";

export interface TransferHistoryEntry {
  myPlayerName: string;
  myPlayerRating: number;
  myPlayerPosition: string;
  targetPlayerName: string;
  targetPlayerRating: number;
  targetPlayerPosition: string;
  targetTeamId: number;
  targetTeamName: string;
  probability: number;
  accepted: boolean;
  timestamp: string;
}

export interface Saves {
  id: string | number;
  userId: string | number; 
  teamId: number;
  currentMatchday: number;
  standings: LeagueStanding[]; // tabla completa
  modifiedTeams: Teams[]; // planteles con stats actualizados 
  fixture: Match[]; // aca se guardan los partidos
  createdAt: string;
  updatedAt: string;
  nameSave: string;
  transferAttemptsLeft?: number;
  transferHistory?: TransferHistoryEntry[];
}
