import { Component, OnDestroy, effect, inject, signal } from '@angular/core';
import { GameStateService } from '../../game-state-service';
import { Teams } from '../../../models/teams';
import { MatchEvent } from '../../../models/match-event';
import { simulateFullMatch } from '../../../utils/simulation';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-simular-partido',
  templateUrl: './simular-partido.html',
  styleUrl: './simular-partido.css'
})
export class SimularPartido implements OnDestroy {
  // estados reactivos
  events = signal<MatchEvent[]>([]);
  score = signal({ home: 0, away: 0 });
  currentMinute = signal(0);

  protected readonly route = inject(ActivatedRoute);
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  isFinished = signal(false);

  match: any;
  homeTeam?: Teams;
  awayTeam?: Teams;

  private fullEvents: MatchEvent[] = []; // eventos completos para reproducir
  private intervalId: any;
  private initialized = false;

  constructor(private gameState: GameStateService) {
    // Si el usuario recarga con F5 o entra sin pasar por el botón de jugar,
    // redirigimos al menú de inicio para no simular otra fecha por accidente
    if (!this.gameState.consumeMatchSimulationAuthorization()) {
      this.router.navigate(['/inicio', this.teamId]);
      return;
    }

    effect(() => {
      const selectedTeamId = this.gameState.selectedTeamId();
      const fixture = this.gameState.fixture();

      if (this.initialized || !selectedTeamId || fixture.length === 0) return;
      this.initialized = true;

      // próximo partido del jugador
      this.match = this.getNextMatch(selectedTeamId);

      if (!this.match) {
        this.isFinished.set(true);
        return;
      }

      // simular la fecha completa
      this.simulateMatchday(this.match.matchday);

      // extraer los equipos
      this.homeTeam = this.gameState.getTeamById(this.match.homeTeamId);
      this.awayTeam = this.gameState.getTeamById(this.match.awayTeamId);

      // obtener resultado simulado offline
      const updatedMatch = this.gameState.fixture().find((m) => m.id === this.match.id);
      if (!updatedMatch) return;

      // guardar eventos completos
      this.fullEvents = [...updatedMatch.events];

      // iniciar animación del partido
      this.startRealTimeSimulation();
    });
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // simula minuto a minuto
  private startRealTimeSimulation() {
    let minute = 0;

    this.intervalId = setInterval(() => {
      minute++;
      this.currentMinute.set(minute);

      // agregar eventos que ocurren en este minuto
      const eventsNow = this.fullEvents.filter((e) => e.minute === minute);

      if (eventsNow.length > 0) {
        this.events.set([...this.events(), ...eventsNow]);

        // actualizar marcador
        for (const ev of eventsNow) {
          if (ev.type === 'goal') {
            if (Number(ev.teamId) === Number(this.homeTeam?.id)) {
              this.score.update((s) => ({ home: s.home + 1, away: s.away }));
            } else {
              this.score.update((s) => ({ home: s.home, away: s.away + 1 }));
            }
          }
        }
      }

      // Terminar en 90
      if (minute >= 90) {
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isFinished.set(true);
      }
    }, 300); // velocidad 
  }

  // simula toda la jornada
  private simulateMatchday(matchday: number) {
    const matches = this.gameState.fixture().filter((m) => m.matchday === matchday && !m.played);

    for (const match of matches) {
      const homeTeam = this.gameState.getTeamById(match.homeTeamId)!;
      const awayTeam = this.gameState.getTeamById(match.awayTeamId)!;

      const result = simulateFullMatch(match, homeTeam, awayTeam);

      this.gameState.updateMatchResult(match.id, result);
    }

    this.gameState.persistCurrentSave();
  }

  getTeamById(teamId: number): Teams | undefined {
    return this.gameState.getTeamById(teamId);
  }

  getPlayerName(team: Teams | undefined, playerId: number): string {
    return team?.squad.find((p) => Number(p.id) === Number(playerId))?.name ?? 'Desconocido';
  }

  private getNextMatch(teamId: number) {
    return this.gameState
      .fixture()
      .find(m => !m.played && (Number(m.homeTeamId) === Number(teamId) || Number(m.awayTeamId) === Number(teamId)))!;
  }
  navigateToMenuInicio(id : number) {
    this.router.navigateByUrl(`/inicio/${id}`);
  }
}
