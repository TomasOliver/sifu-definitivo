import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../../menu-jugar/game-state-service';
import { CommonModule } from '@angular/common';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-tabla-component',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './tabla-component.html',
  styleUrls: ['./tabla-component.css']
})
export class TablaComponent {

  private readonly gameState = inject(GameStateService);
  private readonly location = inject(Location);
  private readonly route = inject(ActivatedRoute);
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));

  // Acceso a la tabla desde el estado global
  readonly standings = computed(() => this.gameState.standings());

  // Equipos (para mostrar el nombre/escudo)
  readonly teams = computed(() => this.gameState.teams());

  // Tabla ordenada con reglas reales
  readonly sortedStandings = computed(() => {
    return [...this.standings()].sort((a, b) => {
      // Puntos
      if (b.points !== a.points) return b.points - a.points;

      //  Diferencia de gol
      const dgA = a.goalsFor - a.goalsAgainst;
      const dgB = b.goalsFor - b.goalsAgainst;
      if (dgB !== dgA) return dgB - dgA;

      // Goles a favor
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

      // Nombre del equipo alfabéticamente
      const teamA = this.teams().find(t => Number(t.id) === Number(a.teamId))?.name ?? '';
      const teamB = this.teams().find(t => Number(t.id) === Number(b.teamId))?.name ?? '';

      return teamA.localeCompare(teamB);
    });
  });

  getTeamName(id: number): string {
    return this.teams().find(t => Number(t.id) === Number(id))?.name ?? 'Equipo';
  }

  getTeamShortName(id: number): string {
    return this.teams().find(t => Number(t.id) === Number(id))?.shortName ?? '';
  }

  getTeamLogo(teamId: number): string {
    return `/logos/${teamId}.png`;
  }
  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    // Si falla pone el escudo por defecto
    imgElement.src = '/logos/default.png';
  }

  goBack() {
    this.location.back();
  }
}
