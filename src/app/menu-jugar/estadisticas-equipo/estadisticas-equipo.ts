import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../game-state-service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-estadisticas-mi-equipo',
  imports: [RouterLink],
  templateUrl: './estadisticas-equipo.html',
  styleUrls: ['./estadisticas-equipo.css']
})
export class EstadisticasEquipo {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly routeTeamId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly gameState = inject(GameStateService);

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

  team = computed(() => {
    const id = Number(this.gameState.selectedTeamId() ?? this.routeTeamId);
    if (!id) return null;
    return this.gameState.getTeamById(id) ?? null;
  });
}
