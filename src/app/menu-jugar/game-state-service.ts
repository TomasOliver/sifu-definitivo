import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Teams } from '../models/teams';
import { Match } from '../models/match';
import { LeagueStanding } from '../models/league-standing';
import { MatchEvent } from '../models/match-event';
import { Player } from '../models/player';
import { SavesService } from '../lista-partidas-guardadas/saves-service';
import { Saves, TransferHistoryEntry } from '../models/saves';

@Injectable({
  providedIn: 'root'
})
export class GameStateService {

  private readonly savesService = inject(SavesService);

  readonly currentSave = signal<Saves | null>(null);
  readonly selectedTeamId = signal<number | null>(null);
  readonly teams = signal<Teams[]>([]);
  readonly fixture = signal<Match[]>([]);
  readonly standings = signal<LeagueStanding[]>([]);
  readonly transferAttemptsLeft = signal<number>(10);
  readonly transferHistory = signal<TransferHistoryEntry[]>([]);
  private simulationAuthorized = false;

  authorizeNextMatchSimulation() {
    this.simulationAuthorized = true;
  }

  consumeMatchSimulationAuthorization(): boolean {
    const allowed = this.simulationAuthorized;
    this.simulationAuthorized = false;
    return allowed;
  }

  hasActiveOrRestorableSave(): boolean {
    return !!this.currentSave() || !!localStorage.getItem('activeSaveId');
  }

  constructor() {
    const activeSaveId = localStorage.getItem('activeSaveId');
    if (activeSaveId) {
      // Hidratación instantánea desde backup local si existe (evita parpadeos al apretar F5)
      const instantBackup = this.savesService.getInstantLocalBackup(activeSaveId);
      if (instantBackup) {
        this.loadSave(instantBackup);
      }

      this.savesService.getSaveById(activeSaveId).subscribe({
        next: (save) => {
          if (!save) return;
          const current = this.currentSave();
          if (!current || String(current.id) === String(activeSaveId)) {
            const currentUpdated = new Date(current?.updatedAt ?? 0).getTime();
            const fetchedUpdated = new Date(save.updatedAt ?? 0).getTime();
            if (!current || fetchedUpdated > currentUpdated) {
              this.loadSave(save);
            }
          }
        },
        error: () => {
          if (!this.currentSave()) {
            localStorage.removeItem('activeSaveId');
          }
        }
      });
    }
  }

  // equipo seleccionado
  readonly selectedTeam = computed(() =>
    this.teams().find(t => Number(t.id) === Number(this.selectedTeamId()))
  );

  // CARGAR PARTIDA EXISTENTE O RECIÉN CREADA
  loadSave(save: Saves) {
    // Aseguramos copia profunda para evitar mutaciones compartidas en memoria
    const saveCopy: Saves = JSON.parse(JSON.stringify(save));
    this.currentSave.set(saveCopy);
    try {
      localStorage.setItem('activeSaveId', String(saveCopy.id));
    } catch {
      // Ignorar si el navegador restringe almacenamiento
    }
    this.savesService.saveLocalBackup(saveCopy);

    this.selectedTeamId.set(Number(saveCopy.teamId));
    this.teams.set(saveCopy.modifiedTeams);
    this.fixture.set(saveCopy.fixture);
    this.transferAttemptsLeft.set(saveCopy.transferAttemptsLeft ?? 10);
    this.transferHistory.set(saveCopy.transferHistory ?? []);

    if (saveCopy.standings && saveCopy.standings.length > 0) {
      this.standings.set(saveCopy.standings);
    } else {
      this.standings.set(this.createInitialStandings(saveCopy.modifiedTeams));
      this.recalculateStandings();
    }
  }

  // LIMPIAR ESTADO EN MEMORIA AL CERRAR SESIÓN
  clearActiveGame() {
    this.currentSave.set(null);
    this.selectedTeamId.set(null);
    this.teams.set([]);
    this.fixture.set([]);
    this.standings.set([]);
    this.transferAttemptsLeft.set(10);
    this.transferHistory.set([]);
    this.simulationAuthorized = false;
    try {
      localStorage.removeItem('activeSaveId');
    } catch {
      // Ignorar
    }
  }

  // NUEVA PARTIDA
  startNewGame(data: {
    selectedTeamId: number;
    teams: Teams[];
    fixture: Match[];
    save?: Saves;
  }) {
    if (data.save) {
      this.loadSave(data.save);
      return;
    }
    this.selectedTeamId.set(Number(data.selectedTeamId));
    this.teams.set(data.teams);
    this.fixture.set(data.fixture);
    this.standings.set(this.createInitialStandings(data.teams));
    this.transferAttemptsLeft.set(10);
    this.transferHistory.set([]);
  }

  // PERSISTIR EL PROGRESO SOLO EN LA PARTIDA GUARDADA DEL USUARIO (NUNCA EN TEAMS GLOBAL)
  persistCurrentSave(): Observable<Saves | null> {
    const current = this.currentSave();
    if (!current) return of(null);

    const unplayed = this.fixture()
      .filter(m => !m.played)
      .sort((a, b) => a.matchday - b.matchday);
    const maxMatchday = this.fixture().reduce((max, m) => Math.max(max, m.matchday), 1);
    const nextMatchday = unplayed.length > 0 ? unplayed[0].matchday : maxMatchday;

    const updatedSave: Saves = JSON.parse(JSON.stringify({
      ...current,
      currentMatchday: nextMatchday,
      standings: this.standings(),
      modifiedTeams: this.teams(),
      fixture: this.fixture(),
      transferAttemptsLeft: this.transferAttemptsLeft(),
      transferHistory: this.transferHistory(),
      updatedAt: new Date().toISOString()
    }));

    this.currentSave.set(updatedSave);
    this.savesService.saveLocalBackup(updatedSave);

    const save$ = this.savesService.updateSave(updatedSave);
    save$.subscribe({
      next: (saved) => {
        console.log('Partida actualizada en DB:', saved.id);
      },
      error: (err) => {
        console.error('Error al actualizar la partida en DB:', err);
      }
    });

    return save$;
  }

  // TABLA INICIAL
  createInitialStandings(teams: Teams[]): LeagueStanding[] {
    return teams.map(t => ({
      teamId: t.id,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));
  }

  updatePlayerStats(players: Player[], events: MatchEvent[]) {
    // Partidos jugados y titularidad
    players.forEach(player => {
      player.stats.matches++;
      if (player.isStarter) player.stats.starts++;
    });

    // Goles y asistencias segun eventos
    events.forEach(ev => {
      const player = players.find(p => Number(p.id) === Number(ev.playerId));
      if (!player) return;

      switch (ev.type) {
        case 'goal':
          player.stats.goals++;
          break;
      }

      if (ev.assistId) {
        const assistPlayer = players.find(p => Number(p.id) === Number(ev.assistId));
        if (assistPlayer) assistPlayer.stats.assists++;
      }
    });
  }

  // RESULTADOS
  updateMatchResult(
    matchId: number,
    result: { homeGoals: number; awayGoals: number; events: MatchEvent[] }
  ) {
    const updatedFixture = this.fixture().map(m => {
      if (m.id !== matchId) return m;

      return {
        ...m,
        homeGoals: result.homeGoals,
        awayGoals: result.awayGoals,
        events: result.events,
        played: true
      };
    });

    this.fixture.set(updatedFixture);
    this.recalculateStandings();

    // Actualizar estadisticas de los jugadores de ambos equipos
    const match = this.fixture().find(m => m.id === matchId);
    if (!match) return;

    const homeTeam = this.getTeamById(match.homeTeamId);
    const awayTeam = this.getTeamById(match.awayTeamId);

    if (homeTeam) this.updatePlayerStats(homeTeam.squad, result.events);
    if (awayTeam) this.updatePlayerStats(awayTeam.squad, result.events);

    // Emitir nueva referencia de teams para que los signals dependientes se enteren
    this.teams.set([...this.teams()]);
  }

  // RECONSTRUIR TABLA DESDE CERO
  private recalculateStandings() {
    const table = this.standings().map(row => ({
      ...row,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    }));

    const findRow = (teamId: number) =>
      table.find(r => Number(r.teamId) === Number(teamId))!;

    for (const match of this.fixture()) {
      if (!match.played) continue;

      const home = findRow(match.homeTeamId);
      const away = findRow(match.awayTeamId);
      if (!home || !away) continue;

      home.played++;
      away.played++;

      home.goalsFor += match.homeGoals;
      home.goalsAgainst += match.awayGoals;

      away.goalsFor += match.awayGoals;
      away.goalsAgainst += match.homeGoals;

      if (match.homeGoals > match.awayGoals) {
        home.wins++;
        home.points += 3;
        away.losses++;
      } else if (match.homeGoals < match.awayGoals) {
        away.wins++;
        away.points += 3;
        home.losses++;
      } else {
        home.draws++;
        away.draws++;
        home.points++;
        away.points++;
      }
    }

    this.standings.set(table);
  }

  // OBTENER ESTADO COMPLETO
  getState() {
    return {
      selectedTeamId: this.selectedTeamId(),
      teams: this.teams(),
      fixture: this.fixture(),
      standings: this.standings()
    };
  }

  getTeamById(teamId: number): Teams | undefined {
    return this.teams().find(t => Number(t.id) === Number(teamId));
  }

  updateTeam(updatedTeam: Teams) {
    const newTeams = this.teams().map(team => {
      if (Number(team.id) !== Number(updatedTeam.id)) return team;

      const newSquad = team.squad.map(originalPlayer => {
        const updatedPlayer = updatedTeam.squad.find(p => Number(p.id) === Number(originalPlayer.id));

        if (!updatedPlayer) return originalPlayer;

        return {
          ...originalPlayer,          // conserva stats acumulados
          isStarter: updatedPlayer.isStarter  // solo cambia el titular
        };
      });

      return { ...team, squad: newSquad };
    });

    this.teams.set(newTeams);
    this.persistCurrentSave();
  }

  // EJECUTAR INTENTO DE INTERCAMBIO DE JUGADORES (SOLO EN LA PARTIDA GUARDADA ACTUAL)
  executeTransferAttempt(params: {
    myTeamId: number;
    myPlayerId: number;
    targetTeamId: number;
    targetPlayerId: number;
    probability: number;
    accepted: boolean;
  }): Observable<Saves | null> {
    const remaining = Math.max(0, this.transferAttemptsLeft() - 1);
    this.transferAttemptsLeft.set(remaining);

    const myTeam = this.getTeamById(params.myTeamId);
    const targetTeam = this.getTeamById(params.targetTeamId);
    const myPlayer = myTeam?.squad.find(p => Number(p.id) === Number(params.myPlayerId));
    const targetPlayer = targetTeam?.squad.find(p => Number(p.id) === Number(params.targetPlayerId));

    if (myPlayer && targetPlayer && targetTeam) {
      const entry: TransferHistoryEntry = {
        myPlayerName: myPlayer.name,
        myPlayerRating: myPlayer.rating,
        myPlayerPosition: myPlayer.position ?? 'MF',
        targetPlayerName: targetPlayer.name,
        targetPlayerRating: targetPlayer.rating,
        targetPlayerPosition: targetPlayer.position ?? 'MF',
        targetTeamId: Number(targetTeam.id),
        targetTeamName: targetTeam.name,
        probability: params.probability,
        accepted: params.accepted,
        timestamp: new Date().toISOString()
      };
      this.transferHistory.set([entry, ...this.transferHistory()]);
    }

    if (params.accepted && myTeam && targetTeam && myPlayer && targetPlayer) {
      const myPlayerWasStarter = myPlayer.isStarter;
      const targetPlayerWasStarter = targetPlayer.isStarter;

      const incomingToMyTeam: Player = {
        ...targetPlayer,
        stats: { ...targetPlayer.stats },
        isStarter: myPlayerWasStarter
      };

      const outgoingToTargetTeam: Player = {
        ...myPlayer,
        stats: { ...myPlayer.stats },
        isStarter: targetPlayerWasStarter
      };

      const updatedTeams = this.teams().map(t => {
        if (Number(t.id) === Number(params.myTeamId)) {
          return {
            ...t,
            squad: t.squad.map(p => Number(p.id) === Number(params.myPlayerId) ? incomingToMyTeam : p)
          };
        }
        if (Number(t.id) === Number(params.targetTeamId)) {
          return {
            ...t,
            squad: t.squad.map(p => Number(p.id) === Number(params.targetPlayerId) ? outgoingToTargetTeam : p)
          };
        }
        return t;
      });

      this.teams.set(updatedTeams);
    }

    return this.persistCurrentSave();
  }

}
