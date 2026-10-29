import { Component, computed, inject } from '@angular/core';
import { GameStateService } from '../game-state-service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-estadisticas-mi-equipo',
  imports: [RouterLink],
  templateUrl: './estadisticas-equipo.html',
  styleUrls: ['./estadisticas-equipo.css']
})
export class EstadisticasEquipo {

  private readonly route = inject(ActivatedRoute);
  protected readonly teamId = Number(this.route.snapshot.paramMap.get('id'));
  private readonly location = inject(Location);
  private readonly gameState = inject(GameStateService);

  goBack() {
    this.location.back();
  }

  team = computed(() => {
    const id = this.gameState.selectedTeamId() ?? this.teamId;
    if (!id) return null;
    return this.gameState.getTeamById(id) ?? null;
  });
}
