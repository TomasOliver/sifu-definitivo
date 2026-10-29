import { Match } from "../models/match";
import { Teams } from "../models/teams";

export function generateFixture(teams: Teams[]) {
  const totalTeams = teams.length;

  if (totalTeams % 2 !== 0) {
    throw new Error("La cantidad de equipos debe ser PAR");
  }

  const rounds = totalTeams - 1;
  const matchesPerRound = totalTeams / 2;

  // Copiamos los equipos y dejamos fijo al primero
  const rotating = teams.slice(1);
  const fixed = teams[0];

  const fixture: Match[] = [];
  let matchId = 1;

  // ------------ IDA ------------
  for (let round = 0; round < rounds; round++) {
    const roundMatches: Match[] = [];

    const left = [fixed, ...rotating.slice(0, matchesPerRound - 1)];
    const right = rotating.slice(matchesPerRound - 1);

    right.reverse();

    for (let i = 0; i < matchesPerRound; i++) {
      const home = left[i];
      const away = right[i];

      roundMatches.push({
        id: matchId++,
        matchday: round + 1,
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeGoals: 0,
        awayGoals: 0,
        played: false,
        events: []
      });
    }

    fixture.push(...roundMatches);

    // Rotación (round robin)
    const last = rotating.pop()!;
    rotating.unshift(last);
  }

  // --- BALANCEAR LOCAL/VISITANTE EN IDA (alternancia) ---
  for (const match of fixture) {
    if (match.matchday % 2 === 0) {
      // Invertir local/visitante en fechas pares
      const temp = match.homeTeamId;
      match.homeTeamId = match.awayTeamId;
      match.awayTeamId = temp;
    }
  }

  // ------------ VUELTA ------------
  const fixtureReturn = fixture.map(m => ({
    ...m,
    id: matchId++,
    matchday: m.matchday + rounds,
    homeTeamId: m.awayTeamId,
    awayTeamId: m.homeTeamId,
  }));

  return [...fixture, ...fixtureReturn];
}



