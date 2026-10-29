import { PlayerStats } from "./player-stats";

export interface Player {
  id?: number;
  name: string;
  position?: 'GK' | 'DF' | 'MF' | 'FW';
  rating: number;
  shirtNumber: number;
  isStarter: boolean;
  stats: PlayerStats;
}
