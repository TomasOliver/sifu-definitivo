import { LeagueStanding } from "./league-standing";
import { Match } from "./match";
import { Teams } from "./teams";

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
}
