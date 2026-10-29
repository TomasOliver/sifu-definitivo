import { Match } from "../models/match";
import { Teams } from "../models/teams";
import { MatchEvent } from "../models/match-event";
import { Player } from "../models/player";

/** UTIL */
function randomChance(prob: number) {
  return Math.random() < prob;
}

/** Estado de tarjetas SOLO dentro del partido */
const cardState = new Map<number, { yellow: number; red: boolean }>();

/** Probabilidades por posición */
const GOAL_PROB_BY_POS = {
  GK: 0,
  DF: 0.015,
  MF: 0.035,
  FW: 0.07
};

const ASSIST_PROB_BY_POS = {
  GK: 0,
  DF: 0.02,
  MF: 0.06,
  FW: 0.08
};

const CARD_YELLOW_BY_POS = {
  GK: 0.001,
  DF: 0.01,
  MF: 0.008,
  FW: 0.005
};

const CARD_RED_BY_POS = {
  GK: 0.0001,
  DF: 0.001,
  MF: 0.0005,
  FW: 0.0003
};

const SECOND_YELLOW_BY_POS = {
  GK: 0.01,
  DF: 0.04,
  MF: 0.025,
  FW: 0.015,
};

/** ELEGIR JUGADOR */
function pickStarterByWeight(team: Teams, weightFunc: (p: Player) => number) {
  const starters = team.squad.filter(p => p.isStarter && !isPlayerOut(p.id!));

  if (starters.length === 0) return null; // Si todos están expulsados

  const arr: Player[] = [];

  starters.forEach(p => {
    const w = weightFunc(p);
    const weight = Math.max(Math.floor(w * 10), 1);
    for (let i = 0; i < weight; i++) arr.push(p);
  });

  return arr[Math.floor(Math.random() * arr.length)];
}

/** Probabilidad de gol del equipo basada en rating del plantel */
/** Probabilidad de gol del equipo basada en rating del plantel */
function getTeamStrength(team: Teams): number {
  const starters = team.squad.filter(p => p.isStarter);
  if (starters.length === 0) return 0.5;

  const avg = starters.reduce((a, b) => a + b.rating, 0) / starters.length;

  // Tomamos un rango "realista"
  const MIN = 60;  // plantel muy flojo
  const MAX = 90;  // plantel muy top

  const clamped = Math.max(MIN, Math.min(MAX, avg));
  const normalized = (clamped - MIN) / (MAX - MIN); // 0..1

  // Curva que hace que los buenos se destaquen más
  const curved = Math.pow(normalized, 1.4); // podés jugar con este exponente

  return curved; // 0..1
}




/** Gol según rating del equipo + posición del jugador */
function tryGenerateGoal(team: Teams, minute: number) {

  const player = pickStarterByWeight(
    team,
    p =>
      GOAL_PROB_BY_POS[p.position as keyof typeof GOAL_PROB_BY_POS] +
      p.rating / 200
  );

  // Nadie disponible
  if (!player) return null;

  // GK no puede
  if (player.position === "GK") return null;

  const baseProb = GOAL_PROB_BY_POS[player.position as keyof typeof GOAL_PROB_BY_POS];
  const ratingBoost = player.rating / 200;
  const minuteBoost = minute > 70 ? 0.005 : 0;
  const totalProb = baseProb + ratingBoost + minuteBoost;

  if (!randomChance(totalProb)) return null;

  // Asistencia
  let assistPlayer: Player | null = null;
  if (randomChance(0.45)) {
    assistPlayer = pickStarterByWeight(
      team,
      p => ASSIST_PROB_BY_POS[p.position as keyof typeof ASSIST_PROB_BY_POS] + p.rating / 250
    ) as Player | null;

    if (!assistPlayer || assistPlayer.id === player.id) assistPlayer = null;
  }

  return { scorer: player, assist: assistPlayer };
}

/** Tarjetas: genera quién podría recibir tarjeta en este minuto */
function tryGenerateCard(team: Teams, minute: number) {
  // Jugadores titulares que NO están expulsados
  const starters = team.squad.filter(p =>
    p.isStarter && !isPlayerOut(p.id!)
  );

  if (starters.length === 0) return null;

  const player = pickStarterByWeight(
    { ...team, squad: starters } as Teams,
    p =>
      (CARD_YELLOW_BY_POS[p.position as keyof typeof CARD_YELLOW_BY_POS] ?? 0) +
      (p.rating / 300)
  );

  if (!player) return null;

  const state = cardState.get(player.id!) ?? { yellow: 0, red: false };

  // Roja directa
  if (randomChance(CARD_RED_BY_POS[player.position as keyof typeof CARD_RED_BY_POS])) {
    return { player, type: "red" as const };
  }

  // Primera amarilla
  if (state.yellow === 0 && randomChance(CARD_YELLOW_BY_POS[player.position as keyof typeof CARD_YELLOW_BY_POS])) {
    return { player, type: "yellow" as const };
  }

  // Segunda amarilla (solo si ya tenía 1)
  if (state.yellow === 1 && randomChance(SECOND_YELLOW_BY_POS[player.position as keyof typeof SECOND_YELLOW_BY_POS])) {
    return { player, type: "yellow" as const };
  }

  return null;
}

/** Maneja el evento de tarjeta dentro del partido (cardState + eventos) */
function handleCardEvent(
  player: Player,
  cardType: "yellow" | "red",
  teamId: number,
  minute: number,
  events: MatchEvent[]
) {
  let state = cardState.get(player.id!) ?? { yellow: 0, red: false };

  if (state.red) return; // ya expulsado, ignorar

  if (cardType === "red") {
    // Roja directa
    state = { yellow: state.yellow, red: true };
    cardState.set(player.id!, state);

    events.push({
      minute,
      type: "red",
      playerId: player.id!,
      teamId
    });
    return;
  }

  if (state.yellow === 1) {
    // Segunda amarilla → roja en el partido
    state = { yellow: 2, red: true };
    cardState.set(player.id!, state);

    // Evento: segunda amarilla
    events.push({
      minute,
      type: "yellow",
      playerId: player.id!,
      teamId
    });

    // Evento: roja
    events.push({
      minute,
      type: "red",
      playerId: player.id!,
      teamId
    });

  } else {
    // Primera amarilla
    state = { yellow: 1, red: false };
    cardState.set(player.id!, state);

    events.push({
      minute,
      type: "yellow",
      playerId: player.id!,
      teamId
    });
  }
}


/** Jugador expulsado dentro del partido */
function isPlayerOut(playerId: number): boolean {
  const state = cardState.get(playerId);
  return state?.red ?? false;
}

/** Al final del partido, volcar cardState a player.stats según la regla */
function applyCardStateToPlayers(team: Teams) {
  team.squad.forEach(player => {
    const state = cardState.get(player.id!);
    if (!state) return;

    // Roja (por doble amarilla o roja directa)
    if (state.red) {
      player.stats.redCards++;
      // Si tenía 1 amarilla previa y luego recibió roja directa, también cuenta esa amarilla
      if (state.yellow === 1) {
        player.stats.yellowCards++;
      }
      return;
    }

    // Amarilla simple (una sola amarilla y sin roja)
    if (state.yellow === 1) {
      player.stats.yellowCards++;
    }
  });
}


/* ==========================================================
   🔵 SIMULACIÓN PROGRESIVA (MINUTO A MINUTO)
   ========================================================== */
export function simulateFullMatchRealTime(
  match: Match,
  homeTeam: Teams,
  awayTeam: Teams,
  onMinute: (evs: MatchEvent[], minute: number, score: { home: number; away: number }) => void,
  onFinish: (result: { homeGoals: number; awayGoals: number; events: MatchEvent[] }) => void
) {
  // limpiar estado de tarjetas para este partido
  cardState.clear();

  let minute = 1;
  const allEvents: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;

  const homeStrength = getTeamStrength(homeTeam);
  const awayStrength = getTeamStrength(awayTeam);

  // Ajustes globales de goles
  const BASE_GOAL_RATE = 0.005;   // prob base por minuto, aunque el equipo sea malo
  const STRENGTH_FACTOR = 0.035;  // cuánto influye la fuerza

  const timer = setInterval(() => {
    const events: MatchEvent[] = [];

    const homeGoalProb = BASE_GOAL_RATE + homeStrength * STRENGTH_FACTOR;
    const awayGoalProb = BASE_GOAL_RATE + awayStrength * STRENGTH_FACTOR;

    // Goles local
    if (randomChance(homeGoalProb)) {
      const g = tryGenerateGoal(homeTeam, minute);
      if (g) {
        homeGoals++;
        events.push({
          minute,
          type: "goal",
          playerId: g.scorer.id!,
          assistId: g.assist?.id,
          teamId: homeTeam.id
        });
      }
    }

    // Goles visitante
    if (randomChance(awayGoalProb)) {
      const g = tryGenerateGoal(awayTeam, minute);
      if (g) {
        awayGoals++;
        events.push({
          minute,
          type: "goal",
          playerId: g.scorer.id!,
          assistId: g.assist?.id,
          teamId: awayTeam.id
        });
      }
    }




    // Tarjetas
    const cardHome = tryGenerateCard(homeTeam, minute);
    if (cardHome) handleCardEvent(cardHome.player, cardHome.type, homeTeam.id, minute, events);

    const cardAway = tryGenerateCard(awayTeam, minute);
    if (cardAway) handleCardEvent(cardAway.player, cardAway.type, awayTeam.id, minute, events);

    // Emitir minuto
    onMinute(events, minute, { home: homeGoals, away: awayGoals });
    allEvents.push(...events);

    if (minute >= 90) {
      clearInterval(timer);

      // Aplicar estadísticas globales desde cardState
      applyCardStateToPlayers(homeTeam);
      applyCardStateToPlayers(awayTeam);

      onFinish({ homeGoals, awayGoals, events: allEvents });
    }

    minute++;
  }, 300);
}

/* ==========================================================
   🔵 SIMULACIÓN COMPLETA (INSTANTÁNEA)
   ========================================================== */
export function simulateFullMatch(
  match: Match,
  homeTeam: Teams,
  awayTeam: Teams
) {
  // limpiar estado de tarjetas para este partido
  cardState.clear();

  const events: MatchEvent[] = [];
  let homeGoals = 0;
  let awayGoals = 0;

  const homeStrength = getTeamStrength(homeTeam);
  const awayStrength = getTeamStrength(awayTeam);

  const BASE_GOAL_RATE = 0.005;
  const STRENGTH_FACTOR = 0.035;

  for (let minute = 1; minute <= 90; minute++) {

    const homeGoalProb = BASE_GOAL_RATE + homeStrength * STRENGTH_FACTOR;
    const awayGoalProb = BASE_GOAL_RATE + awayStrength * STRENGTH_FACTOR;

    // Goles local
    if (randomChance(homeGoalProb)) {
      const g = tryGenerateGoal(homeTeam, minute);
      if (g) {
        homeGoals++;
        events.push({
          minute,
          type: "goal",
          playerId: g.scorer.id!,
          assistId: g.assist?.id,
          teamId: homeTeam.id
        });
      }
    }

    // Goles visitante
    if (randomChance(awayGoalProb)) {
      const g = tryGenerateGoal(awayTeam, minute);
      if (g) {
        awayGoals++;
        events.push({
          minute,
          type: "goal",
          playerId: g.scorer.id!,
          assistId: g.assist?.id,
          teamId: awayTeam.id
        });
      }
    }

    // Tarjetas
    const cardHome = tryGenerateCard(homeTeam, minute);
    if (cardHome) handleCardEvent(cardHome.player, cardHome.type, homeTeam.id, minute, events);

    const cardAway = tryGenerateCard(awayTeam, minute);
    if (cardAway) handleCardEvent(cardAway.player, cardAway.type, awayTeam.id, minute, events);
  }

  // Aplicar estadísticas globales desde cardState
  applyCardStateToPlayers(homeTeam);
  applyCardStateToPlayers(awayTeam);

  return { homeGoals, awayGoals, events };
}

