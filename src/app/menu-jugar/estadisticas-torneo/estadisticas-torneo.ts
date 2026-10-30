import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../game-state-service';
import { Player } from '../../models/player';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

export interface PlayerWithTeam extends Player {
  teamId: number;
  teamName: string;
  teamShortName: string;
}

@Component({
  selector: 'app-estadisticas-torneo',
  imports: [RouterLink],
  templateUrl: './estadisticas-torneo.html',
  styleUrl: './estadisticas-torneo.css'
})
export class EstadisticasTorneo {

  private readonly gameState = inject(GameStateService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeTeamId = Number(this.route.snapshot.paramMap.get('id'));

  protected get teamId(): number {
    return Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
  }

  constructor() {
    if (!this.gameState.hasActiveOrRestorableSave()) {
      this.router.navigate(['/menu']);
      return;
    }
  }

  goBack() {
    this.router.navigate(['/inicio', this.teamId]);
  }

  getTeamLogo(teamId: number | string): string {
    return `/logos/${teamId}.png`;
  }

  handleMissingImage(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    imgElement.onerror = null;
    imgElement.src = '/logos/default.png';
  }

  private readonly allPlayers = computed<PlayerWithTeam[]>(() =>
    this.gameState.teams().flatMap(t =>
      (t.squad ?? []).map(p => ({
        ...p,
        teamId: Number(t.id),
        teamName: t.name,
        teamShortName: t.shortName,
      }))
    )
  );

  topGoals = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 10)
  );

  topAssists = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.assists - a.stats.assists).slice(0, 10)
  );

  topYellows = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.yellowCards - a.stats.yellowCards).slice(0, 10)
  );

  topReds = computed(() =>
    [...this.allPlayers()].sort((a, b) => b.stats.redCards - a.stats.redCards).slice(0, 10)
  );
}
