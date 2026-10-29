import { Component, effect, inject, signal } from '@angular/core';
import { GameStateService } from '../../game-state-service';
import { Teams } from '../../../models/teams';
import { MatchEvent } from '../../../models/match-event';
import { simulateFullMatch } from '../../../utils/simulation';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-simular-partido-rapido',
  imports: [],
  templateUrl: './simular-partido-rapido.html',
  styleUrl: './simular-partido-rapido.css'
})
export class SimularPartidoRapido {
  events = signal<MatchEvent[]>([]);
  score = signal({ home: 0, away: 0 });
  protected readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id') ?? 0);
  private readonly location = inject(Location);
  match: any;
  homeTeam?: Teams;
  awayTeam?: Teams;
  private initialized = false;

  constructor(private gameState: GameStateService) {
    // Si el usuario recarga con F5 o entra sin pasar por el botón de simular,
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

      // obtenemos el partido del usuario
      this.match = this.getNextMatch(selectedTeamId);

      if (!this.match) {
        console.warn('No hay próximo partido para este equipo.');
        return;
      }

      // simular toda la fecha 
      this.simulateMatchday(this.match.matchday);
      // obtener los equipos solo de tu partido
      this.homeTeam = this.gameState.getTeamById(this.match.homeTeamId);
      this.awayTeam = this.gameState.getTeamById(this.match.awayTeamId);

      // obtener el resultado que ya fue simulado en el paso anterior
      const updatedMatch = this.gameState.fixture().find((m) => m.id === this.match.id);
      if (!updatedMatch) return;

      this.events.set(updatedMatch.events);
      this.score.set({
        home: updatedMatch.homeGoals,
        away: updatedMatch.awayGoals,
      });
    });
  }

  

  // simular todos los partidos de una jornada
  private simulateMatchday(matchday: number) {
    const matches = this.gameState.fixture().filter((m) => m.matchday === matchday && !m.played);

    console.log('Simulando fecha:', matchday, matches);

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
      .find((m) => !m.played && (Number(m.homeTeamId) === Number(teamId) || Number(m.awayTeamId) === Number(teamId)))!;
  }
  goBack() {
    this.location.back();
  }
  navigateToMenuInicio(id : number) {
    this.router.navigateByUrl(`/inicio/${id}`);
  }
}
