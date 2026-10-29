import { Player } from "./player";

export interface Teams {
  id: number;
  name: string;
  shortName: string;
  logo: string;
  squad: Player[];
}
