// src/app/utils/generate-matches.ts
import { Match } from '../models/match';

/**
 * Genera fixture Round-Robin. Si includeReturnLeg = true genera ida y vuelta.
 * - teamIds: array de ids numéricos (ej: [1,2,3,...])
 */
export function generateRoundRobinMatches(teamIds: number[], includeReturnLeg = false): Match[] {
  const teams = [...teamIds];

  // Si número impar, añadimos BYE (-1) para rotación
  if (teams.length % 2 !== 0) {
    teams.push(-1);
  }

  const n = teams.length;
  const totalRounds = n - 1; // rondas por vuelta
  const matchesPerRound = n / 2;
  const matches: Match[] = [];
  let idCounter = 1;

  // Primera vuelta (ida)
  const rotation = [...teams];
  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < matchesPerRound; i++) {
      const home = rotation[i];
      const away = rotation[n - 1 - i];
      if (home !== -1 && away !== -1) {
        matches.push({
          id: idCounter++,
          matchday: round,
          homeTeamId: home,
          awayTeamId: away,
          homeGoals: 0,
          awayGoals: 0,
          played: false,
          events: []
        });
      }
    }
    // rotación circular (fija el primer elemento)
    const removed = rotation.splice(1, 1)[0];
    rotation.push(removed);
  }

  // Si queremos vuelta, duplicamos las jornadas invirtiendo local/visitante
  if (includeReturnLeg) {
    const returnMatches = matches.map(m => ({
      id: idCounter++,
      matchday: m.matchday + totalRounds,
      homeTeamId: m.awayTeamId,
      awayTeamId: m.homeTeamId,
      homeGoals: 0,
      awayGoals: 0,
      played: false,
      events: []
    }));
    matches.push(...returnMatches);
  }

  // Opcional: ordenar por matchday por si hace falta
  matches.sort((a, b) => a.matchday - b.matchday || a.id - b.id);

  return matches;
}
